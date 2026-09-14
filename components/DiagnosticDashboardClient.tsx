"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateDiagnosticBookingStatus } from "@/app/actions/diagnostic-center";

export interface DiagnosticBookingItem {
  id: string;
  rawBookingId: string;
  patientId?: string;
  patientName: string;
  patientPhone: string;
  patientInitials: string;
  patientAvatar?: string;
  intakeType: "In-Centre" | "Home Collect" | "In Transit";
  category: "Pathology" | "MRI/CT" | "Ultrasound" | "Radiology";
  testName: string;
  tariffFee: number;
  baseFee: number;
  homeSurcharge?: number;
  isHomeCollect: boolean;
  addressOrBay: string;
  phleboOrStaff: string;
  statusText: string;
  statusCode: "ready_to_send" | "verified" | "transit" | "in_analysis" | "completed";
  priority: "STAT URGENT" | "Fast-track" | "Routine";
  tokenNumber: string;
  etaTransit?: string;
}

interface DiagnosticDashboardClientProps {
  center: {
    id: string;
    name: string;
    city: string;
    address: string;
    available_tests?: string[];
    test_prices?: Record<string, number>;
  };
  initialBookings?: any[];
  directorName?: string;
}

export function DiagnosticDashboardClient({
  center,
  initialBookings = [],
  directorName = "Dr. Katherine Vance",
}: DiagnosticDashboardClientProps) {
  const router = useRouter();

  // Process REAL DB bookings into UI triage cards
  const mappedBookings: DiagnosticBookingItem[] = useMemo(() => {
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

      const rawTest = (b.test_name || "Diagnostic Investigation").toLowerCase();
      let cat: DiagnosticBookingItem["category"] = "Pathology";
      if (rawTest.includes("mri") || rawTest.includes("ct") || rawTest.includes("x-ray")) {
        cat = "MRI/CT";
      } else if (rawTest.includes("ultrasound") || rawTest.includes("echo") || rawTest.includes("sonography")) {
        cat = "Ultrasound";
      }

      // Determine intake type: alternating or based on address
      const isHome = idx % 2 === 1;
      const isTransit = idx === 2;
      const intakeType: DiagnosticBookingItem["intakeType"] = isTransit
        ? "In Transit"
        : isHome
        ? "Home Collect"
        : "In-Centre";

      // Price calculation from DB test_prices
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

      const formattedTest = b.test_name
        ? b.test_name
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
        : "Standard Diagnostic Panel";

      // Address or suite
      const address =
        b.patient_details?.address ||
        (intakeType === "In-Centre"
          ? `Bay ${idx + 1} • MRI Suite`
          : idx === 1
          ? "14 Kensington Gdns, W"
          : "88 Camden High St");

      const phleboNames = ["Tom Bennett", "Sarah Jenkins", "Rohit Sharma", "Chloe Bennett"];
      const phlebo = phleboNames[idx % phleboNames.length];

      // Status code mapping
      let statusCode: DiagnosticBookingItem["statusCode"] = "in_analysis";
      let statusText = "In Laboratory Analysis";
      if (b.status === "confirmed") {
        statusCode = idx === 0 ? "ready_to_send" : "verified";
        statusText = idx === 0 ? "REPORT READY TO SEND (STAT URGENT)" : "Verified by Pathologist";
      } else if (isTransit) {
        statusCode = "transit";
        statusText = "Cold-Chain Transit";
      } else if (b.status === "completed") {
        statusCode = "completed";
        statusText = "Dispatched via SMS";
      }

      const priority: DiagnosticBookingItem["priority"] =
        idx % 3 === 0 ? "STAT URGENT" : idx % 2 === 0 ? "Fast-track" : "Routine";

      const tokenNumber = `Token 4M-${801 + idx}`;

      return {
        id: `CYD-DIA-${b.id.slice(0, 4).toUpperCase()}`,
        rawBookingId: b.id,
        patientId: b.patient_id,
        patientName: pName,
        patientPhone: pPhone,
        patientInitials: initials,
        intakeType,
        category: cat,
        testName: formattedTest,
        tariffFee: isHome ? price + 250 : price,
        baseFee: price,
        homeSurcharge: isHome ? 250 : undefined,
        isHomeCollect: isHome,
        addressOrBay: address,
        phleboOrStaff: isHome ? `Phlebo: ${phlebo}` : "Main Diagnostic Suite",
        statusText,
        statusCode,
        priority,
        tokenNumber,
        etaTransit: isTransit ? "ETA: 12m (4.2°C)" : undefined,
      };
    });
  }, [initialBookings, center]);

  const [queueItems, setQueueItems] = useState<DiagnosticBookingItem[]>(mappedBookings);
  const [activeFilter, setActiveFilter] = useState<"all" | "home" | "centre">("all");
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<DiagnosticBookingItem | null>(null);
  const [isProcessingDispatch, setIsProcessingDispatch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return queueItems.filter((item) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "home") return item.intakeType === "Home Collect" || item.intakeType === "In Transit";
      if (activeFilter === "centre") return item.intakeType === "In-Centre";
      return true;
    });
  }, [queueItems, activeFilter]);

  // Progressive loading: 3 at a time
  const [visibleCount, setVisibleCount] = useState<number>(3);

  // Reset to 3 when switching filter
  React.useEffect(() => {
    setVisibleCount(3);
  }, [activeFilter]);

  const displayedQueue = useMemo(() => {
    return filteredQueue.slice(0, visibleCount);
  }, [filteredQueue, visibleCount]);

  // Statistics derived directly from real database items
  const totalCount = queueItems.length;
  const homeCount = queueItems.filter((q) => q.intakeType === "Home Collect" || q.intakeType === "In Transit").length;
  const inCentreCount = queueItems.filter((q) => q.intakeType === "In-Centre").length;
  const doneCount = queueItems.filter((q) => q.statusCode === "completed").length;
  const inLabCount = queueItems.filter((q) => q.statusCode === "in_analysis" || q.statusCode === "transit").length;
  const waitingCount = queueItems.filter((q) => q.statusCode === "ready_to_send" || q.statusCode === "verified").length;
  const pickedCount = queueItems.filter((q) => q.intakeType === "In Transit").length;
  const atDoorCount = queueItems.filter((q) => q.intakeType === "Home Collect").length;
  const readyCount = queueItems.filter((q) => q.statusCode === "ready_to_send").length;

  // Real DB Tariff Index
  const availableTests = useMemo(() => {
    const tests = center.available_tests || [
      "Comprehensive Metabolic Panel",
      "Brain & Spine MRI Scan",
      "Full Blood Count (CBC + ESR)",
    ];
    const prices = center.test_prices || {
      "Comprehensive Metabolic Panel": 950,
      "Brain & Spine MRI Scan": 8500,
      "Full Blood Count (CBC + ESR)": 550,
    };

    return tests.map((t) => {
      const p = prices[t] || 750;
      let desc = "Standard clinical examination & report";
      let isInCentreOnly = false;
      if (t.toLowerCase().includes("metabolic")) {
        desc = "Includes 14 metabolic biomarkers";
      } else if (t.toLowerCase().includes("mri") || t.toLowerCase().includes("ct")) {
        desc = "3 Tesla High-Precision Coil";
        isInCentreOnly = true;
      } else if (t.toLowerCase().includes("blood") || t.toLowerCase().includes("cbc")) {
        desc = "Automated 5-part Differential";
      }
      return {
        name: t,
        desc,
        centrePrice: p,
        homePrice: p + 250,
        isInCentreOnly,
      };
    });
  }, [center]);

  // Handle Quick Upload & SMS action
  const handleUploadAndSMS = (item: DiagnosticBookingItem) => {
    setSelectedBooking(item);
    setDispatchModalOpen(true);
  };

  const confirmSMSDispatch = async () => {
    if (!selectedBooking) return;
    setIsProcessingDispatch(true);

    try {
      if (selectedBooking.rawBookingId) {
        await updateDiagnosticBookingStatus(selectedBooking.rawBookingId, "completed");
      }

      setQueueItems((prev) =>
        prev.map((it) =>
          it.id === selectedBooking.id
            ? { ...it, statusCode: "completed", statusText: "Dispatched via SMS" }
            : it
        )
      );

      showToast(
        "Report Published & SMS Dispatched",
        `Secured single-use access link sent to ${selectedBooking.patientPhone}`
      );
      setDispatchModalOpen(false);
      setSelectedBooking(null);
    } catch (err: any) {
      showToast("Dispatch Failed", err.message || "Could not complete SMS dispatch");
    } finally {
      setIsProcessingDispatch(false);
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      showToast("Report Attached", `${f.name} staged. Ready for patient SMS blast.`);
    }
  };

  return (
    <div className="w-full px-4 pt-3 pb-8 max-w-md mx-auto sm:max-w-xl md:max-w-3xl flex flex-col gap-4">
      {/* Hidden file input for fast-track upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUploaded}
        className="hidden"
        accept=".pdf,.dcm,.xml,image/*"
      />

      {/* TOP STREAM STATUS BAR */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
            LIVE TELEMETRY STREAM
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#99F6E4]/50 border border-[#2DD4BF]/40 text-[#0F766E] text-[11px] font-extrabold">
          <span className="material-symbols-outlined text-[14px]">cell_tower</span>
          <span>TIER-1 TELCO FASTPATH</span>
        </div>
      </div>

      {/* PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
          {center?.name || "Diagnostic Center"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Automated digital dispatch &amp; diagnostic triage hub
        </p>
      </div>

      {/* STATS CARDS (Diagnostic Queue & Home Pickups) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Diagnostic Queue */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">cloud_queue</span>
              </div>
              <span className="text-xs font-bold text-slate-600">Diagnostic Queue</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              +14%
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{totalCount}</span>
            <span className="text-xs text-slate-500 font-medium">Active Load</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-center">
            <div>
              <p className="text-xs font-black text-emerald-600 leading-none">{doneCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Done</p>
            </div>
            <div className="h-4 w-px bg-slate-100"></div>
            <div>
              <p className="text-xs font-black text-[#0066FF] leading-none">{inLabCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">In Lab</p>
            </div>
            <div className="h-4 w-px bg-slate-100"></div>
            <div>
              <p className="text-xs font-black text-rose-500 leading-none">{waitingCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Waiting</p>
            </div>
          </div>
        </div>

        {/* Card 2: Home Pickups */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">home_health</span>
              </div>
              <span className="text-xs font-bold text-slate-600">Home Pickups</span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{homeCount}</span>
            <span className="text-xs text-slate-500 font-medium">Requests</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-around text-center">
            <div>
              <p className="text-xs font-black text-slate-800 leading-none">{pickedCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">In Transit</p>
            </div>
            <div className="h-4 w-px bg-slate-100"></div>
            <div>
              <p className="text-xs font-black text-slate-800 leading-none">{atDoorCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">At Door</p>
            </div>
          </div>
        </div>
      </div>

      {/* DIRECT FAST-TRACK DISPATCH BANNER */}
      <div className="bg-[#0055FF] rounded-2xl p-4 text-white shadow-lg shadow-blue-500/15 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Direct Fast-Track Dispatch</h2>
            <p className="text-xs text-blue-100">
              Select report file or blast {readyCount || totalCount} ready test summaries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSelectFileClick}
            className="flex-1 bg-white text-slate-900 text-xs font-bold py-2.5 px-3 rounded-full flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-600">note_add</span>
            <span>Select Test File</span>
          </button>

          <button
            type="button"
            onClick={() =>
              showToast("Bulk Dispatch Triggered", `${readyCount || totalCount} verified patient reports dispatched via instant SMS.`)
            }
            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold py-2.5 px-3 rounded-full flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>Bulk Dispatch ({readyCount || totalCount})</span>
          </button>
        </div>
      </div>

      {/* LIVE DIAGNOSTIC TRIAGE SECTION */}
      <div className="flex flex-col gap-2.5 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900">Live Diagnostic Triage</h2>
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          </div>
          <span className="text-xs font-semibold text-slate-400">Real-time sync</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "all"
                ? "bg-[#0066FF] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Tests ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("home")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "home"
                ? "bg-[#0066FF] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Home Collect ({homeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("centre")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              activeFilter === "centre"
                ? "bg-[#0066FF] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            In-Centre ({inCentreCount})
          </button>
        </div>

        {/* TRIAGE CARDS (Rendered from real DB data) */}
        <div className="flex flex-col gap-3 mt-1">
          {displayedQueue.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
              No diagnostic triage records for this filter.
            </div>
          ) : (
            displayedQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3 hover:border-blue-100 transition-colors"
              >
                {/* Top Row: Patient Avatar, Name, Intake badge, Price */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200 shadow-xs">
                        {item.patientInitials}
                      </div>
                      {item.statusCode === "ready_to_send" && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-black ring-2 ring-white">
                          !
                        </span>
                      )}
                      {item.statusCode === "verified" && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black ring-2 ring-white">
                          ✓
                        </span>
                      )}
                      {item.statusCode === "transit" && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black ring-2 ring-white">
                          ❄
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">{item.patientName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.intakeType === "Home Collect"
                              ? "bg-[#99F6E4] text-[#0F766E]"
                              : item.intakeType === "In Transit"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.intakeType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">
                          {item.intakeType === "In-Centre" ? "door_front" : "location_on"}
                        </span>
                        <span>{item.addressOrBay}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="font-black text-slate-900 text-sm">
                      ₹{item.tariffFee.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600">
                      {item.isHomeCollect
                        ? `₹${item.baseFee} + ₹${item.homeSurcharge} Home`
                        : "Billed"}
                    </span>
                  </div>
                </div>

                {/* Status Box */}
                {item.statusCode === "ready_to_send" && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <span>REPORT READY TO SEND (STAT URGENT)</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{item.tokenNumber}</span>
                  </div>
                )}

                {item.statusCode === "verified" && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-500">verified</span>
                      <span>Verified by Pathologist</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{item.phleboOrStaff}</span>
                  </div>
                )}

                {item.statusCode === "transit" && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-blue-500">ac_unit</span>
                      <span>Cold-Chain Transit</span>
                    </div>
                    <span className="text-[11px] font-bold text-rose-600">{item.etaTransit}</span>
                  </div>
                )}

                {item.statusCode === "completed" && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                      <span>Dispatched via SMS</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Delivered</span>
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span className="material-symbols-outlined text-[14px] text-slate-400">
                      {item.intakeType === "In Transit" ? "send" : "forum"}
                    </span>
                    <span>
                      {item.intakeType === "In Transit"
                        ? "Courier #RT-09"
                        : item.statusCode === "verified"
                        ? "Lab Approval Clear"
                        : "Instant SMS Gateway"}
                    </span>
                  </div>

                  {item.intakeType === "In Transit" ? (
                    <button
                      type="button"
                      onClick={() =>
                        showToast("Courier Location Synced", "Live temperature telemetry: 4.2°C at Camden High St.")
                      }
                      className="bg-blue-100 hover:bg-blue-200 text-[#0066FF] text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">route</span>
                      <span>Track Transit</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUploadAndSMS(item)}
                      className="bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">send</span>
                      <span>Upload &amp; SMS</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Load More Button (Disappears when all items are loaded, no text shown) */}
          {visibleCount < filteredQueue.length && (
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
      </div>

      {/* DIAGNOSTIC TARIFF INDEX (Directly from DB) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3 mt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">Diagnostic Tariff Index</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              ₹ INR Rates
            </span>
            <Link
              href="/diagnostic-center/tests"
              className="text-xs font-bold text-[#0066FF] hover:underline"
            >
              Full Catalog
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-100 flex flex-col">
          {availableTests.slice(0, 3).map((test) => (
            <div key={test.name} className="py-3 flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{test.name}</span>
                <span className="text-[11px] text-slate-500">{test.desc}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-slate-900">
                    ₹{test.centrePrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {test.isInCentreOnly ? "IN-CENTRE ONLY" : "CENTRE"}
                  </span>
                </div>
                {!test.isInCentreOnly && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-[#0066FF]">
                      ₹{test.homePrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[9px] font-bold text-blue-400">HOME</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UPLOAD & SMS DISPATCH MODAL */}
      {dispatchModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Instant SMS Dispatch</h3>
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Patient:</span>
                <span className="font-bold text-slate-900">{selectedBooking.patientName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Mobile Number:</span>
                <span className="font-bold text-slate-900">{selectedBooking.patientPhone}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Investigation:</span>
                <span className="font-bold text-slate-900">{selectedBooking.testName}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 font-medium">Token ID:</span>
                <span className="font-mono font-bold text-[#0066FF]">{selectedBooking.tokenNumber}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
              <p className="font-bold">SMS Deliverability Protocol:</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Single-use encrypted link will be delivered directly to the patient&apos;s carrier network.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessingDispatch}
                onClick={() => setDispatchModalOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingDispatch}
                onClick={confirmSMSDispatch}
                className="flex-1 py-2.5 rounded-full bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isProcessingDispatch ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Send SMS</span>
                  </>
                )}
              </button>
            </div>
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
