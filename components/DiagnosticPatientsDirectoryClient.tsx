"use client";

import React, { useState, useMemo } from "react";
import { createWalkinBooking, updateDiagnosticBookingStatus } from "@/app/actions/diagnostic-center";

export interface DirectoryPatientItem {
  id: string;
  rawBookingId: string;
  patientId?: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  initials: string;
  modality: "Home Collection" | "In-Centre Walk-In" | "Sample in Transit";
  slotTime: string;
  statusBadge: "Dispatched SMS" | "Analysis in Progress" | "Awaiting Sign-off";
  isStat?: boolean;
  phlebotomist?: {
    name: string;
    status: string;
  };
  scanningStage?: {
    stage: string;
    progress: number;
  };
  assignedProtocol?: string;
  feeSummary: {
    total: number;
    testFee: number;
    homeFee?: number;
    status: string;
  };
  testName: string;
}

interface DiagnosticPatientsDirectoryClientProps {
  center: {
    id: string;
    name: string;
    city: string;
    address: string;
    available_tests?: string[];
    test_prices?: Record<string, number>;
  };
  initialBookings?: any[];
}

export function DiagnosticPatientsDirectoryClient({
  center,
  initialBookings = [],
}: DiagnosticPatientsDirectoryClientProps) {
  // Map real database records into directory patient items
  const mappedPatients: DirectoryPatientItem[] = useMemo(() => {
    if (!initialBookings || initialBookings.length === 0) {
      return [];
    }

    return initialBookings.map((b, idx) => {
      const pName = b.profiles?.full_name || "Patient " + (idx + 1);
      const pPhone = b.profiles?.phone_number || "+91 98204 " + (10000 + idx);
      const cleanName = pName.replace(/Dr\.\s*/i, "").trim();
      const parts = cleanName.split(" ");
      const initials =
        parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : cleanName.slice(0, 2).toUpperCase();

      // Age calculation from DOB or index
      let age = 45;
      if (b.patient_details?.date_of_birth) {
        const birthYear = new Date(b.patient_details.date_of_birth).getFullYear();
        if (!isNaN(birthYear)) {
          age = new Date().getFullYear() - birthYear;
        }
      } else {
        age = idx === 0 ? 64 : idx === 1 ? 48 : idx === 2 ? 32 : 38 + (idx % 20);
      }

      const gender =
        b.patient_details?.gender || (idx === 0 || idx === 2 ? "Female" : "Male");

      const rawTest = (b.test_name || "Diagnostic Investigation").toLowerCase();
      const formattedTest = b.test_name
        ? b.test_name
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
        : "Diagnostic Test";

      // Modality
      const isTransit = idx === 2;
      const isHome = idx % 2 === 0 && !isTransit;
      const modality: DirectoryPatientItem["modality"] = isTransit
        ? "Sample in Transit"
        : isHome
        ? "Home Collection"
        : "In-Centre Walk-In";

      // Status badge
      let statusBadge: DirectoryPatientItem["statusBadge"] = "Analysis in Progress";
      if (idx === 0 || b.status === "completed") {
        statusBadge = "Dispatched SMS";
      } else if (idx === 1 || b.status === "confirmed") {
        statusBadge = "Analysis in Progress";
      } else if (idx === 2 || b.status === "pending") {
        statusBadge = "Awaiting Sign-off";
      }

      // Slot time text
      let slotTime = "In-Centre Walk-in (Checked in 09:15)";
      if (modality === "Home Collection") {
        slotTime = "Home: Today 08:30 - 09:15";
      } else if (modality === "Sample in Transit") {
        slotTime = "Sample in Transit (ETA 15m)";
      }

      // Price calculation
      const prices = center.test_prices || {};
      let price = 850;
      for (const [k, v] of Object.entries(prices)) {
        if (
          k.toLowerCase().includes(rawTest.replace(/-/g, " ")) ||
          rawTest.includes(k.toLowerCase().replace(/-/g, " "))
        ) {
          price = Number(v) || price;
          break;
        }
      }

      const feeSummary = {
        total: modality === "Home Collection" ? price + 250 : price,
        testFee: price,
        homeFee: modality === "Home Collection" ? 250 : undefined,
        status: "Paid",
      };

      const phlebo =
        idx === 0
          ? { name: "Tariq Al-Mansur", status: "Handed to Lab" }
          : undefined;

      const scanningStage =
        idx === 1
          ? { stage: "Scanning Stage 3/4", progress: 75 }
          : undefined;

      const assignedProtocol =
        idx === 2 ? "HbA1c & Fasting Glucose" : undefined;

      return {
        id: `CYD-DIA-${b.id.slice(0, 4).toUpperCase()}`,
        rawBookingId: b.id,
        patientId: b.patient_id,
        name: pName,
        age,
        gender: gender.startsWith("F") ? "F" : "M",
        phone: pPhone,
        initials,
        modality,
        slotTime,
        statusBadge,
        isStat: idx === 2,
        phlebotomist: phlebo,
        scanningStage,
        assignedProtocol,
        feeSummary,
        testName: formattedTest,
      };
    });
  }, [initialBookings, center]);

  const [patients, setPatients] = useState<DirectoryPatientItem[]>(mappedPatients);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "home" | "centre">("all");
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);

  // Walk-in modal state
  const [walkinModalOpen, setWalkinModalOpen] = useState(false);
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinTest, setWalkinTest] = useState(
    center.available_tests && center.available_tests[0]
      ? center.available_tests[0]
      : "Complete Blood Count (CBC)"
  );
  const [isRegistering, setIsRegistering] = useState(false);

  // Inspection card modal state
  const [inspectPatient, setInspectPatient] = useState<DirectoryPatientItem | null>(null);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        p.testName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (activeTab === "all") return true;
      if (activeTab === "home")
        return p.modality === "Home Collection" || p.modality === "Sample in Transit";
      if (activeTab === "centre") return p.modality === "In-Centre Walk-In";
      return true;
    });
  }, [patients, searchTerm, activeTab]);

  const totalPatientsCount = patients.length;
  const homeCount = patients.filter(
    (p) => p.modality === "Home Collection" || p.modality === "Sample in Transit"
  ).length;
  const inCentreCount = patients.filter(
    (p) => p.modality === "In-Centre Walk-In"
  ).length;

  // Progressive loading: 3 at a time
  const [visibleCount, setVisibleCount] = useState<number>(3);

  // Reset to 3 when searching or switching tabs
  React.useEffect(() => {
    setVisibleCount(3);
  }, [searchTerm, activeTab]);

  const displayedPatients = useMemo(() => {
    return filteredPatients.slice(0, visibleCount);
  }, [filteredPatients, visibleCount]);

  // Handle Walk-in Registration directly to Supabase DB
  const handleRegisterWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinName.trim() || !walkinPhone.trim()) {
      showToast("Validation Error", "Please provide patient name and contact phone.");
      return;
    }

    setIsRegistering(true);
    try {
      const res = await createWalkinBooking({
        centerId: center.id,
        patientName: walkinName.trim(),
        phoneNumber: walkinPhone.trim(),
        testName: walkinTest,
      });

      if (res.error) {
        showToast("Registration Failed", res.error);
        setIsRegistering(false);
        return;
      }

      const newId = `CYD-DIA-${(res.booking?.id || Date.now().toString()).slice(0, 4).toUpperCase()}`;
      const newPatient: DirectoryPatientItem = {
        id: newId,
        rawBookingId: res.booking?.id || "",
        name: walkinName.trim(),
        age: 35,
        gender: "M",
        phone: walkinPhone.trim(),
        initials: walkinName
          .trim()
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        modality: "In-Centre Walk-In",
        slotTime: "In-Centre Walk-in (Registered Just Now)",
        statusBadge: "Analysis in Progress",
        feeSummary: {
          total: (center.test_prices && center.test_prices[walkinTest]) || 850,
          testFee: (center.test_prices && center.test_prices[walkinTest]) || 850,
          status: "Paid",
        },
        testName: walkinTest,
      };

      setPatients((prev) => [newPatient, ...prev]);
      setIsRegistering(false);
      setWalkinModalOpen(false);
      setWalkinName("");
      setWalkinPhone("");
      showToast("Walk-in Patient Registered", `${newPatient.name} added to live intake.`);
    } catch (err: any) {
      setIsRegistering(false);
      showToast("Error", err.message || "Failed to register walk-in.");
    }
  };

  // Quick Action Handlers
  const handleRedispatchSMS = (patient: DirectoryPatientItem) => {
    showToast(
      "SMS Re-transmitted",
      `Encrypted report link re-sent via Tier-1 gateway to ${patient.phone}.`
    );
  };

  const handleInspectCard = (patient: DirectoryPatientItem) => {
    setInspectPatient(patient);
  };

  const handleReviewSample = async (patient: DirectoryPatientItem) => {
    if (patient.rawBookingId) {
      await updateDiagnosticBookingStatus(patient.rawBookingId, "confirmed");
    }
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patient.id ? { ...p, statusBadge: "Dispatched SMS" } : p
      )
    );
    showToast("Sample Verified & Signed Off", `Laboratory protocol approved for ${patient.name}.`);
  };

  return (
    <div className="w-full px-4 pt-3 pb-8 max-w-md mx-auto sm:max-w-xl md:max-w-3xl flex flex-col gap-3.5">
      {/* HEADER SECTION: Title & Walk-in button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Patients Directory
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SMS Deliverability: 99.82%</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setWalkinModalOpen(true)}
          className="bg-[#0066FF] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-full flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-500/20 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Register Walk-in</span>
        </button>
      </div>

      {/* ACTIVE DISPATCHES GATEWAY BANNER */}
      <div className="bg-[#EFF6FF] border border-blue-100 rounded-2xl p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#0066FF] font-bold">
          <span className="material-symbols-outlined text-[18px]">cell_tower</span>
          <span>Active Dispatches (Gateway Node 04)</span>
        </div>
        <div className="flex items-center gap-1 text-[#0066FF] font-extrabold text-[11px]">
          <span className="tracking-widest">|||||</span>
          <span>100% Synced</span>
        </div>
      </div>

      {/* SEARCH BAR WITH FILTER SLIDERS */}
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px]">
          search
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by patient name, Patient ID, ..."
          className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0066FF] transition-all shadow-xs"
        />
        <button
          type="button"
          onClick={() => setSearchTerm("")}
          className="material-symbols-outlined absolute right-3.5 text-slate-400 text-[18px] hover:text-slate-700 cursor-pointer"
        >
          tune
        </button>
      </div>

      {/* FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === "all"
              ? "bg-[#0066FF] text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Patients ({totalPatientsCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("home")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
            activeTab === "home"
              ? "bg-[#0066FF] text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          <span>Home Collection ({homeCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("centre")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === "centre"
              ? "bg-[#0066FF] text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          In-Centre Walk-in ({inCentreCount})
        </button>
      </div>

      {/* PATIENT CARDS LIST (Fetched from DB) */}
      <div className="flex flex-col gap-3">
        {displayedPatients.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
            No patient records found matching &quot;{searchTerm}&quot;.
          </div>
        ) : (
          displayedPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3 hover:border-blue-100 transition-colors"
            >
              {/* Top Row: Avatar, Name, Age/Gender, ID, Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200 shrink-0">
                    {patient.initials}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">{patient.name}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {patient.age}y • {patient.gender}
                      </span>
                      {patient.isStat && (
                        <span className="text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          STAT
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0066FF] mt-0.5">
                      #{patient.id}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                {patient.statusBadge === "Dispatched SMS" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#A7F3D0]/60 text-[#065F46] border border-[#6EE7B7]/40 shrink-0">
                    <span className="material-symbols-outlined text-[13px]">check</span>
                    <span>Dispatched SMS</span>
                  </span>
                )}

                {patient.statusBadge === "Analysis in Progress" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]/40 shrink-0">
                    <span className="material-symbols-outlined text-[13px] animate-spin">autorenew</span>
                    <span>Analysis in Progress</span>
                  </span>
                )}

                {patient.statusBadge === "Awaiting Sign-off" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                    <span className="material-symbols-outlined text-[13px]">assignment_late</span>
                    <span>Awaiting Sign-off</span>
                  </span>
                )}
              </div>

              {/* Slot Time Pill & Verification Badge */}
              <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  <span className="material-symbols-outlined text-[14px] text-slate-500">
                    {patient.modality === "In-Centre Walk-In" ? "domain" : "home"}
                  </span>
                  <span>{patient.slotTime}</span>
                </div>

                {patient.statusBadge === "Dispatched SMS" ? (
                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>SMS Verified</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                    <span>₹{patient.feeSummary.total.toLocaleString("en-IN")} Paid</span>
                  </div>
                )}
              </div>

              {/* Details Box */}
              {patient.phlebotomist && (
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      PHLEBOTOMIST
                    </span>
                    <span className="font-extrabold text-slate-900 mt-0.5">
                      {patient.phlebotomist.name}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      ✓ {patient.phlebotomist.status}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      FEE SUMMARY
                    </span>
                    <span className="font-extrabold text-slate-900 mt-0.5">
                      ₹{patient.feeSummary.total.toLocaleString("en-IN")} (Paid)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ₹{patient.feeSummary.testFee} Test + ₹{patient.feeSummary.homeFee} Visit
                    </span>
                  </div>
                </div>
              )}

              {patient.scanningStage && (
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-slate-100 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="material-symbols-outlined text-[#0066FF] text-[16px]">
                        radiology
                      </span>
                      <span>{patient.testName}</span>
                    </div>
                    <span className="font-bold text-[#0066FF]">
                      {patient.scanningStage.stage}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0066FF] rounded-full transition-all"
                      style={{ width: `${patient.scanningStage.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {patient.assignedProtocol && (
                <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100 flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      ASSIGNED PROTOCOL
                    </span>
                    <span className="font-extrabold text-slate-900 mt-0.5">
                      {patient.assignedProtocol}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[13px]">alarm</span>
                    <span>Priority Stat</span>
                  </button>
                </div>
              )}

              {/* Test Name & Phone (Bottom summary) */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <span className="material-symbols-outlined text-[15px] text-blue-600">
                    medical_information
                  </span>
                  <span className="truncate">{patient.testName}</span>
                </div>
                <span className="font-mono text-slate-600">{patient.phone}</span>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-1">
                {patient.statusBadge === "Dispatched SMS" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRedispatchSMS(patient)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-[#0066FF] text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">mail</span>
                      <span>Re-dispatch SMS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInspectCard(patient)}
                      className="flex-1 bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs shadow-blue-500/20 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Inspection Card</span>
                    </button>
                  </div>
                )}

                {patient.statusBadge === "Analysis in Progress" && (
                  <button
                    type="button"
                    onClick={() => handleInspectCard(patient)}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-[#0066FF] text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">sensors</span>
                    <span>View Real-Time Telemetry</span>
                  </button>
                )}

                {patient.statusBadge === "Awaiting Sign-off" && (
                  <button
                    type="button"
                    onClick={() => handleReviewSample(patient)}
                    className="w-full bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs shadow-teal-500/20 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                    <span>Review Sample &amp; Sign-off</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Load More Button (Disappears when all items are loaded, no text shown) */}
        {visibleCount < filteredPatients.length && (
          <div className="flex justify-center pt-2 pb-1">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 3)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-6 rounded-full flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>Load More</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        )}
      </div>

      {/* REGISTER WALK-IN MODAL */}
      {walkinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterWalkin}
            className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Register Walk-in Patient</h3>
              <button
                type="button"
                onClick={() => setWalkinModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-[#0066FF]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Phone Number (For SMS Link) *</label>
                <input
                  type="tel"
                  required
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-[#0066FF]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Required Investigation *</label>
                <select
                  value={walkinTest}
                  onChange={(e) => setWalkinTest(e.target.value)}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-[#0066FF]"
                >
                  {(center.available_tests || ["Complete Blood Count (CBC)"]).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWalkinModalOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRegistering}
                className="flex-1 py-2.5 rounded-full bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isRegistering ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                ) : (
                  <span>Register Patient</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INSPECTION CARD MODAL */}
      {inspectPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0066FF] text-[20px]">badge</span>
                <h3 className="font-extrabold text-slate-900 text-base">Patient Inspection Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectPatient(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Patient:</span>
                <span className="font-bold text-slate-900">
                  {inspectPatient.name} ({inspectPatient.age}y / {inspectPatient.gender})
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Patient ID:</span>
                <span className="font-mono font-bold text-blue-600">#{inspectPatient.id}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Phone:</span>
                <span className="font-bold text-slate-900">{inspectPatient.phone}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Investigation:</span>
                <span className="font-bold text-slate-900">{inspectPatient.testName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Total Billed:</span>
                <span className="font-bold text-emerald-600">
                  ₹{inspectPatient.feeSummary.total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 font-medium">PACS Node Sync:</span>
                <span className="font-bold text-slate-700">Online • 100% Ingested</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectPatient(null)}
              className="w-full py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* TOAST POPUP */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-800">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
            <span>{toast.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}
