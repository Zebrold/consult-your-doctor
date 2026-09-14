"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientDock } from "@/components/PatientDock";
import { PatientNavHeader } from "@/components/PatientNavHeader";

export interface DiagnosticCenterData {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  image_url?: string | null;
  available_tests?: string[] | null;
  test_prices?: Record<string, number> | null;
}

export interface InitialPatientData {
  full_name?: string;
  age?: number | string;
  gender?: string;
  phone?: string;
  email?: string;
}

interface DiagnosticBookingClientProps {
  center: DiagnosticCenterData;
  initialPatient: InitialPatientData;
  isUserLoggedIn: boolean;
  createBookingAction?: (formData: FormData) => Promise<{
    success?: boolean;
    error?: string;
    url?: string;
    bookingId?: string;
    isPreview?: boolean;
  }>;
  payuKey?: string;
}

interface TestItem {
  id: string;
  name: string;
  subtitle: string;
  price: number;
}

const DEFAULT_TEST_METADATA: Record<string, { subtitle: string; defaultPrice: number }> = {
  "Complete Blood Count (CBC)": {
    subtitle: "Includes 24 essential parameters & Hemogram",
    defaultPrice: 25,
  },
  "Lipid Profile & Liver Function [LFT]": {
    subtitle: "Cholesterol, Triglycerides, SGOT, SGPT",
    defaultPrice: 55,
  },
  "Thyroid Profile (Total T3, T4, TSH)": {
    subtitle: "Ultrasensitive CLIA method testing",
    defaultPrice: 35,
  },
  "HbA1c & Fasting Blood Glucose": {
    subtitle: "Average 3-month glycation monitoring",
    defaultPrice: 20,
  },
};

export function DiagnosticBookingClient({
  center,
  initialPatient,
  isUserLoggedIn,
  createBookingAction,
  payuKey = "99eKD4",
}: DiagnosticBookingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";

  // Modality: Lab Centre Visit vs Home Sample Visit
  const [modality, setModality] = useState<"centre" | "home">("centre");

  // Tests list built from DB center.available_tests and center.test_prices
  const testsList: TestItem[] = useMemo(() => {
    const rawTests = center.available_tests && center.available_tests.length > 0
      ? center.available_tests
      : Object.keys(DEFAULT_TEST_METADATA);

    return rawTests.map((tName, idx) => {
      const meta = DEFAULT_TEST_METADATA[tName] || {
        subtitle: "Diagnostic pathology & laboratory profile",
        defaultPrice: 30 + (idx * 15),
      };

      // Check price from DB test_prices if available
      let price = meta.defaultPrice;
      if (center.test_prices && center.test_prices[tName] !== undefined) {
        price = Number(center.test_prices[tName]);
      }

      return {
        id: `test-${idx}-${tName.toLowerCase().replace(/\s+/g, "-")}`,
        name: tName,
        subtitle: meta.subtitle,
        price,
      };
    });
  }, [center]);

  // Selected tests (defaults to first test Complete Blood Count selected)
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>(() => {
    return testsList[0] ? [testsList[0].id] : [];
  });

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((t) => t !== id) : prev) : [...prev, id]
    );
  };

  // Generate 5 Days starting from today
  const daysList = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" });
      const dayNum = parseInt(
        d.toLocaleDateString("en-US", { day: "numeric", timeZone: "Asia/Kolkata" }),
        10
      );
      return {
        dateStr,
        dayName,
        dayNum,
      };
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState(daysList[1]?.dateStr || daysList[0]?.dateStr);

  // Time Slots
  const morningSlots = [
    { id: "m1", time: "07:30 AM", label: "Fasting ideal" },
    { id: "m2", time: "08:30 AM", label: "Selected" },
    { id: "m3", time: "09:30 AM", label: "Available" },
  ];

  const afternoonSlots = [
    { id: "a1", time: "11:00 AM" },
    { id: "a2", time: "01:30 PM" },
    { id: "a3", time: "04:00 PM" },
  ];

  const [selectedSlotTime, setSelectedSlotTime] = useState("08:30 AM");

  // Patient Info
  const [patientName, setPatientName] = useState(initialPatient.full_name || "Alex Morgan");
  const [patientAge, setPatientAge] = useState(initialPatient.age || "28");
  const [patientGender, setPatientGender] = useState(initialPatient.gender || "Male");
  const [clinicalNotes, setClinicalNotes] = useState(
    "Fasting 10 hours overnight. Routine health screening."
  );

  // Fees calculation
  const testFee = useMemo(() => {
    return testsList
      .filter((t) => selectedTestIds.includes(t.id))
      .reduce((sum, t) => sum + t.price, 0);
  }, [testsList, selectedTestIds]);

  const sampleHandlingFee = 10;
  const totalPayable = testFee + sampleHandlingFee;

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleConfirmAndBook = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (!patientName.trim()) {
        setErrorMessage("Please enter patient full name.");
        setIsSubmitting(false);
        return;
      }

      const selectedTestsNames = testsList
        .filter((t) => selectedTestIds.includes(t.id))
        .map((t) => t.name)
        .join(", ");

      if (createBookingAction) {
        const formData = new FormData();
        formData.append("center_id", center.id);
        formData.append("test_name", selectedTestsNames);
        formData.append("preferred_date", selectedDate);

        const res = await createBookingAction(formData);
        if (res?.error) {
          setErrorMessage(res.error);
          setIsSubmitting(false);
          return;
        }

        if (res?.url) {
          router.push(res.url);
          return;
        }
      }

      // Demo or direct completion
      setBookingSuccess(true);
      setTimeout(() => {
        router.push(isPreview ? "/patient/appointments?preview=patient" : "/patient/appointments");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const centerName = center.name || "Apex Diagnostics & Imaging";
  const centerAddress = center.address || center.city || "Pathology & Radiology Hub";
  const centerImg = center.image_url || null;

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      {/* ============================================================ */}
      {/* DEDICATED MOBILE VIEW (block md:hidden) - EXACT SCREENSHOT 4 */}
      {/* ============================================================ */}
      <div className="block md:hidden w-full bg-slate-50/60 min-h-screen pb-24">
        {/* Top Header */}
        <PatientNavHeader title="Book Consultation" />

        {/* Facility Card */}
        <div className="mx-4 mt-3.5 p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 flex items-center justify-center">
              {centerImg ? (
                <img
                  src={centerImg}
                  alt={centerName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex flex-col items-center justify-center text-teal-700 ${
                  centerImg ? "hidden" : "flex"
                }`}
              >
                <span className="material-symbols-outlined text-[28px] text-teal-600">biotech</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                NABL &amp; ICMR ACCREDITED
              </span>
              <h2 className="text-sm font-bold text-slate-900 truncate leading-snug">
                {centerName}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">{centerAddress}</p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 mt-0.5">
                <span className="text-amber-500">★</span>
                <span>4.8</span>
                <span className="text-slate-400 font-normal">(2,410 reviews)</span>
              </div>
            </div>
          </div>

          {/* 3 Stats in Row */}
          <div className="grid grid-cols-3 gap-1 pt-2.5 border-t border-slate-100 text-center">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400">Experience</span>
              <span className="text-xs font-bold text-slate-800">18 Years</span>
            </div>
            <div className="flex flex-col border-x border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400">Tests Run</span>
              <span className="text-xs font-bold text-primary">50,000+</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400">Starting At</span>
              <span className="text-xs font-bold text-emerald-600">$45</span>
            </div>
          </div>
        </div>

        {/* Modality Switcher */}
        <div className="px-4 mt-3">
          <div className="p-1 bg-white rounded-full border border-slate-200/80 shadow-2xs flex items-center gap-1">
            <button
              type="button"
              onClick={() => setModality("centre")}
              className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                modality === "centre"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span>Lab Centre Visit</span>
            </button>
            <button
              type="button"
              onClick={() => setModality("home")}
              className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                modality === "home"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>Home Sample Visit</span>
            </button>
          </div>
        </div>

        {/* Select Diagnostic Tests */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <h3 className="text-xs font-bold text-slate-900">Select Diagnostic Tests</h3>
            </div>
            <span className="text-[11px] font-semibold text-primary">
              View All ({testsList.length})
            </span>
          </div>

          <div className="space-y-2">
            {testsList.map((test) => {
              const isChecked = selectedTestIds.includes(test.id);

              return (
                <div
                  key={test.id}
                  onClick={() => toggleTest(test.id)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-2.5 border shadow-2xs ${
                    isChecked
                      ? "bg-white border-primary ring-1 ring-primary/30"
                      : "bg-white border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isChecked ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isChecked ? "check" : "add"}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900 leading-snug truncate">
                        {test.name}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">{test.subtitle}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 shrink-0">${test.price}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Select Appointment Date */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <h3 className="text-xs font-bold text-slate-900">Select Appointment Date</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">
              {new Date(selectedDate || Date.now()).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {daysList.map((d) => {
              const isSelected = selectedDate === d.dateStr;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(d.dateStr)}
                  className={`flex-1 min-w-[54px] py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-xs font-bold"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold">{d.dayName}</span>
                  <span className="text-base font-bold leading-none my-0.5">{d.dayNum}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Available Time Slots */}
        <div className="px-4 mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <h3 className="text-xs font-bold text-slate-900">Available Time Slots</h3>
          </div>

          {/* Morning Slots */}
          <div className="mb-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-[14px]">eco</span>
              <span>MORNING SLOT (RECOMMENDED FOR FASTING)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {morningSlots.map((slot) => {
                const isSelected = selectedSlotTime === slot.time;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotTime(slot.time)}
                    className={`py-2 px-1 rounded-xl text-center transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-xs font-bold"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-bold leading-tight">{slot.time}</span>
                    <span
                      className={`block text-[9px] mt-0.5 ${
                        isSelected ? "text-blue-100" : "text-teal-600"
                      }`}
                    >
                      {slot.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Afternoon Slots */}
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1.5">
              <span className="material-symbols-outlined text-amber-500 text-[14px]">wb_sunny</span>
              <span>AFTERNOON / EVENING</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {afternoonSlots.map((slot) => {
                const isSelected = selectedSlotTime === slot.time;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotTime(slot.time)}
                    className={`py-2 px-1 rounded-xl text-center transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-xs font-bold"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-bold leading-tight">{slot.time}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="px-4 mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <h3 className="text-xs font-bold text-slate-900">Patient Information</h3>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary pr-8"
                />
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 text-[18px]">
                  check_circle
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Age</label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="28"
                  className="w-full mt-1 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Fasting Status &amp; Clinical Notes
              </label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Fasting 10 hours overnight. Routine health screening."
                className="w-full mt-1 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>

        {/* Billing Breakdown */}
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-bold text-slate-900">Billing Breakdown</h4>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                Instant Verified
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Diagnostic Test Fee</span>
              <span className="font-semibold text-slate-900">${testFee}.00</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Sample Handling &amp; Digital Report</span>
              <span className="font-semibold text-slate-900">${sampleHandlingFee}.00</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>ICMR Verification Levy</span>
              <span className="font-bold text-emerald-600">FREE</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100 font-bold text-slate-900">
              <span>Total Payable</span>
              <span className="text-base text-primary">${totalPayable}.00</span>
            </div>

            {/* Payment Pill */}
            <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">credit_card</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-800">Apple Pay / Visa •••• 4892</span>
                  <span className="text-[9px] text-slate-500">Pre-authorized guarantee</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
            </div>
          </div>
        </div>

        {/* CTA Confirm & Book button */}
        <div className="px-4 mt-4 pb-8 space-y-2">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {bookingSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Diagnostic Test Booked Successfully! Redirecting...</span>
            </div>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmAndBook}
            className="w-full py-3.5 px-4 rounded-full bg-primary text-white text-sm font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span>
              {isSubmitting
                ? "Processing..."
                : `Confirm & Book Diagnostic Test $${totalPayable}.00`}
            </span>
          </button>

          <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-teal-600">verified_user</span>
            <span>Encrypted booking with 100% HIPAA and NABL compliance</span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP VIEW (hidden md:block) */}
      {/* ============================================================ */}
      <main className="hidden md:block max-w-[1280px] mx-auto px-6 py-12">
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/diagnostics" className="hover:text-primary">Diagnostics</Link>
            <span>/</span>
            <span className="text-primary font-semibold">Book Test</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Book Diagnostic Consultation</h1>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left 8 Cols */}
          <div className="col-span-8 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                {centerImg ? (
                  <img
                    src={centerImg}
                    alt={centerName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex flex-col items-center justify-center text-teal-700 ${
                    centerImg ? "hidden" : "flex"
                  }`}
                >
                  <span className="material-symbols-outlined text-[36px] text-teal-600">biotech</span>
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full mb-1">
                  NABL &amp; ICMR ACCREDITED
                </span>
                <h2 className="text-xl font-bold text-slate-900">{centerName}</h2>
                <p className="text-sm text-slate-500">{centerAddress}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                  <span>★ 4.8 (2,410 reviews)</span>
                  <span>•</span>
                  <span>18 Years Experience</span>
                  <span>•</span>
                  <span>50,000+ Tests</span>
                </div>
              </div>
            </div>

            {/* Test Selection */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">Select Diagnostic Tests</h3>
              <div className="grid grid-cols-2 gap-3">
                {testsList.map((test) => {
                  const isChecked = selectedTestIds.includes(test.id);
                  return (
                    <div
                      key={test.id}
                      onClick={() => toggleTest(test.id)}
                      className={`p-4 rounded-xl cursor-pointer border transition-all flex items-center justify-between ${
                        isChecked ? "border-primary bg-blue-50/40 ring-1 ring-primary" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{test.name}</h4>
                        <p className="text-[11px] text-slate-500">{test.subtitle}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">${test.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">Select Date &amp; Time</h3>
              <div className="grid grid-cols-5 gap-3 mb-6">
                {daysList.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`py-3 rounded-xl flex flex-col items-center border ${
                      selectedDate === d.dateStr ? "bg-primary text-white border-primary" : "border-slate-200"
                    }`}
                  >
                    <span className="text-xs font-semibold">{d.dayName}</span>
                    <span className="text-lg font-bold">{d.dayNum}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {morningSlots.concat(afternoonSlots as any).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlotTime(s.time)}
                    className={`py-2.5 rounded-xl border text-xs font-bold ${
                      selectedSlotTime === s.time ? "bg-primary text-white border-primary" : "border-slate-200"
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Summary */}
          <div className="col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Billing Summary</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Test Fees</span>
                <span className="font-semibold text-slate-900">${testFee}.00</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Handling</span>
                <span className="font-semibold text-slate-900">${sampleHandlingFee}.00</span>
              </div>
              <div className="flex justify-between pt-3 border-t font-bold text-slate-900 text-base">
                <span>Total Payable</span>
                <span className="text-primary">${totalPayable}.00</span>
              </div>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmAndBook}
              className="w-full py-3.5 rounded-full bg-primary text-white text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
            >
              {isSubmitting ? "Processing..." : `Confirm & Book $${totalPayable}.00`}
            </button>
          </div>
        </div>
      </main>

      {/* FLOATING BOTTOM DOCK WITH BOOK TAB ACTIVE */}
      <PatientDock activeTab="book" />
    </div>
  );
}
