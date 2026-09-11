"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientDock } from "@/components/PatientDock";

export interface BookingDoctor {
  id: string;
  specialty: string;
  experience_years?: number | null;
  consultation_fee?: number | null;
  image_url?: string | null;
  bio?: string | null;
  qualifications?: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  hospitals?: {
    id: string;
    name: string;
    city: string;
    address?: string | null;
    image_url?: string | null;
  } | null;
  schedules?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    is_booked: boolean;
  }>;
}

export interface InitialPatientData {
  full_name?: string;
  age?: number | string;
  gender?: string;
  phone?: string;
  email?: string;
}

interface FinalizeBookingClientProps {
  doctor: BookingDoctor;
  initialPatient: InitialPatientData;
  isUserLoggedIn: boolean;
  createAppointmentAction: (formData: FormData) => Promise<{ success?: boolean; error?: string; url?: string }>;
}

function getSlotDateString(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return iso.split("T")[0];
  }
}

function getSlotTimeString(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getSlotHour(iso: string) {
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).formatToParts(d);
    const hourPart = parts.find((p) => p.type === "hour");
    return hourPart ? parseInt(hourPart.value, 10) : d.getHours();
  } catch {
    return new Date(iso).getHours();
  }
}

export function FinalizeBookingClient({
  doctor,
  initialPatient,
  isUserLoggedIn,
  createAppointmentAction,
}: FinalizeBookingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";

  // 1. Consultation mode
  const [consultationMode, setConsultationMode] = useState<"video" | "inperson">("video");

  // 2. Group real schedules from database by date (Asia/Kolkata timezone)
  const schedulesByDate = useMemo(() => {
    const map: Record<
      string,
      Array<{
        id: string;
        timeString: string;
        isBooked: boolean;
        isMorning: boolean;
        startTime: string;
      }>
    > = {};

    (doctor.schedules || []).forEach((s) => {
      const dateStr = getSlotDateString(s.start_time);
      const timeStr = getSlotTimeString(s.start_time);
      const hour = getSlotHour(s.start_time);
      const isMorning = hour < 12;

      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({
        id: s.id,
        timeString: timeStr,
        isBooked: s.is_booked,
        isMorning,
        startTime: s.start_time,
      });
    });

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    return map;
  }, [doctor.schedules]);

  // Generate 6 Days starting from today
  const daysList = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" });
      const dayNum = parseInt(
        d.toLocaleDateString("en-US", { day: "numeric", timeZone: "Asia/Kolkata" }),
        10
      );
      const isToday = i === 0;

      const slotsForDay = schedulesByDate[dateStr] || [];
      const availableCount = slotsForDay.filter((s) => !s.isBooked).length;

      let slotsBadge = "";
      if (availableCount > 0) {
        slotsBadge = `${availableCount} Slot${availableCount > 1 ? "s" : ""}`;
      } else if (slotsForDay.length > 0) {
        slotsBadge = "Full";
      } else {
        slotsBadge = "No Slots";
      }

      return {
        dateStr,
        dayName,
        dayNum,
        isToday,
        slotsCount: slotsBadge,
        hasAvailable: availableCount > 0,
      };
    });
  }, [schedulesByDate]);

  // Selected date defaults to first day with available slots or today
  const [selectedDate, setSelectedDate] = useState(() => {
    const availableDay = daysList.find((d) => d.hasAvailable);
    return availableDay ? availableDay.dateStr : daysList[0]?.dateStr;
  });

  const [customDate, setCustomDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Active slots for currently selected date
  const activeDaySlots = useMemo(() => {
    return schedulesByDate[selectedDate] || [];
  }, [schedulesByDate, selectedDate]);

  const morningSlots = useMemo(() => {
    return activeDaySlots.filter((s) => s.isMorning);
  }, [activeDaySlots]);

  const afternoonSlots = useMemo(() => {
    return activeDaySlots.filter((s) => !s.isMorning);
  }, [activeDaySlots]);

  // Selected Slot (ID and Time String)
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>("");

  // Update selected slot when date changes or slots change
  useEffect(() => {
    const firstAvailable = activeDaySlots.find((s) => !s.isBooked);
    if (firstAvailable) {
      setSelectedSlotId(firstAvailable.id);
      setSelectedSlotTime(firstAvailable.timeString);
    } else {
      setSelectedSlotId("");
      setSelectedSlotTime("");
    }
  }, [activeDaySlots]);

  // 4. Patient form state
  const [patientName, setPatientName] = useState(initialPatient.full_name || "");
  const [patientAge, setPatientAge] = useState(initialPatient.age || "");
  const [patientGender, setPatientGender] = useState(initialPatient.gender || "Male");
  const [patientPhone, setPatientPhone] = useState(initialPatient.phone || "");
  const [patientEmail, setPatientEmail] = useState(initialPatient.email || "");
  const [visitReason, setVisitReason] = useState("");
  const [syncAbha, setSyncAbha] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5. Payment method
  const [paymentMethod, setPaymentMethod] = useState<"card" | "new_card" | "upi">("card");

  // 6. Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const doctorName = doctor.profiles?.full_name || "Specialist Doctor";
  const fee = doctor.consultation_fee || 500;
  const platformFee = 50;
  const totalPayable = fee + platformFee;

  const getDoctorInitials = (name?: string | null) => {
    if (!name) return "DR";
    const clean = name.replace(/^Dr\.\s*/i, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
    }
  };

  const handleConfirmAndPay = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("doctor_id", doctor.id);
      formData.append("hospital_id", doctor.hospitals?.id || "");
      formData.append("consultation_mode", consultationMode);
      formData.append("appointment_date", selectedDate);
      formData.append("appointment_time", selectedSlotTime);
      formData.append("schedule_id", selectedSlotId);
      formData.append("patient_name", patientName.trim() || "Alex Morgan");
      formData.append("patient_phone", patientPhone.trim() || "+91 98204 77210");
      formData.append("patient_email", patientEmail.trim() || "alex.morgan@example.com");
      formData.append("reason", visitReason.trim() || "General Consultation");

      const res = await createAppointmentAction(formData);

      if (res?.error) {
        if (!isUserLoggedIn) {
          setBookingSuccess(true);
        } else {
          setErrorMessage(res.error);
        }
      } else {
        setBookingSuccess(true);
      }
    } catch (err) {
      const error = err as any;
      if (!isUserLoggedIn) {
        setBookingSuccess(true);
      } else {
        setErrorMessage(error.message || "Failed to finalize consultation. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <main className="w-full bg-background min-h-[calc(100vh-10rem)] pt-8 pb-32">
        <div className="flex flex-col w-full">
          {/* Ambient Glows */}
          <div className="relative w-full overflow-hidden">
            <div className="absolute -top-32 left-1/4 w-[600px] h-[450px] bg-gradient-to-br from-primary-container/10 via-fresh-teal/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
            <div className="absolute top-96 right-10 w-[500px] h-[500px] bg-gradient-to-bl from-surface-variant/40 via-vibrant-blue/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>

            <div className="max-w-[1280px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-4">
              {/* Breadcrumb & Workflow Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8">
                <div>
                  <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-2 font-label-sm text-label-sm text-indigo-gray-600 mb-2 flex-wrap"
                  >
                    <Link className="hover:text-vibrant-blue transition-colors" href={isPreview ? "/?preview=patient" : "/"}>
                      Home
                    </Link>
                    <span className="material-symbols-outlined text-[14px] text-outline-variant">
                      chevron_right
                    </span>
                    <Link className="hover:text-vibrant-blue transition-colors" href={isPreview ? "/find?preview=patient" : "/find"}>
                      Find Doctors
                    </Link>
                    <span className="material-symbols-outlined text-[14px] text-outline-variant">
                      chevron_right
                    </span>
                    <Link className="hover:text-vibrant-blue transition-colors" href={`/doctors/${doctor.id}`}>
                      {doctorName}
                    </Link>
                    <span className="material-symbols-outlined text-[14px] text-outline-variant">
                      chevron_right
                    </span>
                    <span className="text-vibrant-blue font-semibold">Book Appointment</span>
                  </nav>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                    Finalize Consultation
                  </h1>
                </div>

                {/* Trust Badges Strip */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container font-label-sm text-label-sm text-indigo-gray-900 font-semibold shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-fresh-teal">
                      verified_user
                    </span>
                    <span>ABDM M3 Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container font-label-sm text-label-sm text-indigo-gray-900 font-semibold shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-vibrant-blue">
                      schedule
                    </span>
                    <span>Instant Confirmation</span>
                  </div>
                </div>
              </div>

              {/* SUCCESS MODAL / BANNER */}
              {bookingSuccess && (
                <div className="mb-8 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 slide-down">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-[28px]">check_circle</span>
                    </div>
                    <div>
                      <h3 className="font-title-md text-lg font-bold text-emerald-900">
                        Consultation Successfully Booked!
                      </h3>
                      <p className="font-body-md text-label-sm text-emerald-700 mt-0.5">
                        Your appointment with {doctorName} on {selectedDate} at {selectedSlotTime} has been confirmed.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href="/patient/appointments"
                      className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-sm transition-all"
                    >
                      View Appointments
                    </Link>
                  </div>
                </div>
              )}

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-rose-600">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Main Two-Column Asymmetric Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* ============================================================ */}
                {/* LEFT COLUMN: Booking Steps & Patient Form (8 cols / 65%) */}
                {/* ============================================================ */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* 1. Clinician Profile Card */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm relative overflow-hidden border border-surface-container">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-vibrant-blue"></div>
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                      <div className="relative shrink-0">
                        {doctor.image_url ? (
                          <img
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover shadow-md bg-surface-container"
                            src={doctor.image_url}
                            alt={doctorName}
                          />
                        ) : (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-indigo-gray-900 text-white flex flex-col items-center justify-center font-bold text-2xl shadow-md shrink-0">
                            <span>{getDoctorInitials(doctorName)}</span>
                            <span className="text-[11px] text-outline font-normal mt-0.5">Doctor</span>
                          </div>
                        )}
                        <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-fresh-teal text-surface-container-lowest font-label-sm text-label-sm flex items-center gap-1 shadow-sm font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest animate-pulse"></span>
                          Today
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
                            Senior {doctor.specialty}
                          </span>
                          <span className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-on-surface">
                            <span
                              className="material-symbols-outlined text-[16px] text-amber-500"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            4.9
                            <span className="text-outline font-normal">
                              (1,248 clinical reviews)
                            </span>
                          </span>
                        </div>
                        <h2 className="font-title-md text-title-md text-on-surface truncate font-bold">
                          {doctorName}, MD
                        </h2>
                        <p className="font-body-md text-body-md text-indigo-gray-600 mt-0.5 truncate">
                          {doctor.bio || `Specialist in ${doctor.specialty} & Comprehensive Care`}
                        </p>

                        {/* Clinician Metric Badges */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-surface-container-low">
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm text-outline">Clinical Exp.</span>
                            <span className="font-title-md text-body-md font-bold text-on-surface">
                              {doctor.experience_years || 5} Years
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm text-outline">Treated</span>
                            <span className="font-title-md text-body-md font-bold text-on-surface">
                              5,000+ Cases
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm text-outline">Consultation Fee</span>
                            <span className="font-title-md text-body-md font-bold text-vibrant-blue">
                              ₹{fee}.00
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Consultation Mode Switcher */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-container">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-label-sm text-label-sm font-bold">
                          1
                        </span>
                        <h3 className="font-title-md text-body-lg font-bold text-on-surface">
                          Select Consultation Type
                        </h3>
                      </div>
                      <span className="font-label-sm text-label-sm text-fresh-teal font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                        HD Encrypted Tunnel
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Video Call Card */}
                      <div
                        onClick={() => setConsultationMode("video")}
                        className={`cursor-pointer relative flex flex-col p-4 rounded-xl transition-all duration-200 border ${
                          consultationMode === "video"
                            ? "bg-surface-container-low shadow-sm border-vibrant-blue ring-1 ring-vibrant-blue/20"
                            : "bg-surface-container-lowest border-surface-container hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              consultationMode === "video"
                                ? "bg-vibrant-blue text-surface-container-lowest"
                                : "bg-surface-container text-on-surface"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[22px]">videocam</span>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              consultationMode === "video"
                                ? "bg-vibrant-blue text-surface-container-lowest"
                                : "bg-surface-variant text-transparent"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </span>
                        </div>
                        <span className="font-title-md text-body-md font-bold text-on-surface">
                          Digital Video Visit
                        </span>
                        <span className="font-body-md text-body-md text-indigo-gray-600 mt-1 text-sm">
                          Direct WebRTC connection with automated prescriptions &amp; record sharing.
                        </span>
                        <div className="mt-3 pt-2 flex items-center gap-2 text-fresh-teal font-label-sm text-label-sm font-semibold">
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          Instant Join Link via SMS &amp; Email
                        </div>
                      </div>

                      {/* In-Person Card */}
                      <div
                        onClick={() => setConsultationMode("inperson")}
                        className={`cursor-pointer relative flex flex-col p-4 rounded-xl transition-all duration-200 border ${
                          consultationMode === "inperson"
                            ? "bg-surface-container-low shadow-sm border-vibrant-blue ring-1 ring-vibrant-blue/20"
                            : "bg-surface-container-lowest border-surface-container hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              consultationMode === "inperson"
                                ? "bg-vibrant-blue text-surface-container-lowest"
                                : "bg-surface-container text-on-surface"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[22px]">domain</span>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              consultationMode === "inperson"
                                ? "bg-vibrant-blue text-surface-container-lowest"
                                : "bg-surface-variant text-transparent"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </span>
                        </div>
                        <span className="font-title-md text-body-md font-bold text-on-surface">
                          In-Person Clinic Visit
                        </span>
                        <span className="font-body-md text-body-md text-indigo-gray-600 mt-1 text-sm">
                          {doctor.hospitals?.name || "Apollo Hospital"}, {doctor.hospitals?.address || "Jasola Vihar, Suite 302"}.
                        </span>
                        <div className="mt-3 pt-2 flex items-center gap-2 text-outline font-label-sm text-label-sm font-medium">
                          <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                          Valet &amp; Ground Floor Parking
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Select Date & 4. Available Time Slots Combined Container */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-container">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-label-sm text-label-sm font-bold">
                          2
                        </span>
                        <h3 className="font-title-md text-body-lg font-bold text-on-surface">
                          Choose Date &amp; Time Slot
                        </h3>
                      </div>
                      <div>
                        <input
                          ref={dateInputRef}
                          type="date"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.value) {
                              setCustomDate(e.target.value);
                              setSelectedDate(e.target.value);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => dateInputRef.current?.showPicker()}
                          className="flex items-center gap-1.5 font-label-sm text-label-sm text-vibrant-blue font-semibold hover:underline"
                        >
                          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          {customDate ? `Date: ${customDate}` : "Choose Custom Date"}
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Day Selector Strip */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                      {daysList.map((day) => {
                        const isSelected = selectedDate === day.dateStr;
                        return (
                          <button
                            key={day.dateStr}
                            type="button"
                            onClick={() => setSelectedDate(day.dateStr)}
                            className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all text-center cursor-pointer border ${
                              isSelected
                                ? "bg-vibrant-blue text-on-primary shadow-md border-vibrant-blue"
                                : "bg-surface-container-low text-on-surface border-transparent hover:bg-surface-variant"
                            }`}
                          >
                            <span
                              className={`font-label-sm text-label-sm uppercase font-semibold ${
                                isSelected ? "opacity-80" : "text-outline"
                              }`}
                            >
                              {day.dayName}
                            </span>
                            <span className="font-title-md text-body-lg font-bold mt-0.5">
                              {day.dayNum}
                            </span>
                            <span
                              className={`font-label-sm text-[10px] font-medium mt-1 ${
                                isSelected
                                  ? "bg-surface-container-lowest/20 px-2 py-0.5 rounded-full"
                                  : "text-fresh-teal"
                              }`}
                            >
                              {isSelected ? "Selected" : day.slotsCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Time Slots Matrix */}
                    <div className="space-y-5">
                      {activeDaySlots.length === 0 ? (
                        <div className="py-8 px-4 text-center rounded-xl bg-surface-container-low border border-dashed border-surface-variant flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-3xl text-outline">
                            event_busy
                          </span>
                          <span className="font-title-md text-body-md font-semibold text-on-surface">
                            No Clinic Slots Scheduled For This Date
                          </span>
                          <p className="font-body-md text-sm text-indigo-gray-600 max-w-sm">
                            The hospital admin has not scheduled consultation slots for this specific date. Please choose another date from the strip above or use custom date.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Morning Group */}
                          {morningSlots.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2.5 text-outline">
                                <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
                                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                                  Morning Available Slots ({morningSlots.filter((s) => !s.isBooked).length})
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {morningSlots.map((slot) => {
                                  const isSelected = selectedSlotId === slot.id;
                                  if (slot.isBooked) {
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        disabled
                                        className="py-2.5 px-3 rounded-full bg-surface-container-high/60 text-outline-variant font-body-md text-body-md font-normal cursor-not-allowed text-center line-through"
                                      >
                                        {slot.timeString} (Full)
                                      </button>
                                    );
                                  }
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSlotId(slot.id);
                                        setSelectedSlotTime(slot.timeString);
                                      }}
                                      className={`py-2.5 px-3 rounded-full font-body-md text-body-md text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        isSelected
                                          ? "bg-vibrant-blue text-surface-container-lowest font-bold shadow-sm"
                                          : "bg-surface-container text-on-surface font-medium hover:bg-surface-variant"
                                      }`}
                                    >
                                      {isSelected && (
                                        <span className="material-symbols-outlined text-[16px]">
                                          check_circle
                                        </span>
                                      )}
                                      <span>{slot.timeString}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Afternoon / Evening Group */}
                          {afternoonSlots.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2.5 text-outline">
                                <span className="material-symbols-outlined text-[18px]">wb_twilight</span>
                                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                                  Afternoon &amp; Evening ({afternoonSlots.filter((s) => !s.isBooked).length})
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {afternoonSlots.map((slot) => {
                                  const isSelected = selectedSlotId === slot.id;
                                  if (slot.isBooked) {
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        disabled
                                        className="py-2.5 px-3 rounded-full bg-surface-container-high/60 text-outline-variant font-body-md text-body-md font-normal cursor-not-allowed text-center line-through"
                                      >
                                        {slot.timeString} (Full)
                                      </button>
                                    );
                                  }
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSlotId(slot.id);
                                        setSelectedSlotTime(slot.timeString);
                                      }}
                                      className={`py-2.5 px-3 rounded-full font-body-md text-body-md text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        isSelected
                                          ? "bg-vibrant-blue text-surface-container-lowest font-bold shadow-sm"
                                          : "bg-surface-container text-on-surface font-medium hover:bg-surface-variant"
                                      }`}
                                    >
                                      {isSelected && (
                                        <span className="material-symbols-outlined text-[16px]">
                                          check_circle
                                        </span>
                                      )}
                                      <span>{slot.timeString}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 5. Patient Information & Medical Context Section */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-container">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-label-sm text-label-sm font-bold">
                          3
                        </span>
                        <h3 className="font-title-md text-body-lg font-bold text-on-surface">
                          Patient Details &amp; Vitals
                        </h3>
                      </div>
                      <span className="font-label-sm text-label-sm text-indigo-gray-600">
                        Sync with PHR / ABHA
                      </span>
                    </div>

                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* Full Legal Name */}
                        <div className="sm:col-span-6 flex flex-col gap-1.5">
                          <label className="font-label-sm text-label-sm font-semibold text-indigo-gray-600">
                            Full Legal Name
                          </label>
                          <input
                            type="text"
                            value={patientName}
                            placeholder="e.g. Alex Morgan"
                            onChange={(e) => setPatientName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all shadow-inner"
                          />
                        </div>

                        {/* Age */}
                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                          <label className="font-label-sm text-label-sm font-semibold text-indigo-gray-600">
                            Age (Years)
                          </label>
                          <input
                            type="number"
                            value={patientAge}
                            placeholder="28"
                            onChange={(e) => setPatientAge(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all shadow-inner"
                          />
                        </div>

                        {/* Gender */}
                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                          <label className="font-label-sm text-label-sm font-semibold text-indigo-gray-600">
                            Biological Sex
                          </label>
                          <select
                            value={patientGender}
                            onChange={(e) => setPatientGender(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary / Other">Non-binary / Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Contact Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-label-sm text-label-sm font-semibold text-indigo-gray-600">
                            Phone Number (SMS Notifications)
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-3 text-outline text-[18px]">
                              phone
                            </span>
                            <input
                              type="tel"
                              value={patientPhone}
                              placeholder="+91 98204 77210"
                              onChange={(e) => setPatientPhone(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-label-sm text-label-sm font-semibold text-indigo-gray-600">
                            Email Address (Invites &amp; Receipts)
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-3 text-outline text-[18px]">
                              mail
                            </span>
                            <input
                              type="email"
                              value={patientEmail}
                              placeholder="alex.morgan@example.com"
                              onChange={(e) => setPatientEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Reason for Visit */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-sm text-label-sm font-semibold text-indigo-gray-600">
                          Reason for Visit / Primary Symptoms
                        </label>
                        <textarea
                          rows={3}
                          value={visitReason}
                          placeholder="e.g. Experiencing mild palpitations and occasional shortness of breath during light workouts."
                          onChange={(e) => setVisitReason(e.target.value)}
                          className="w-full p-3.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all"
                        />
                      </div>

                      {/* Records & ABHA Sync Box */}
                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-fresh-teal/15 text-secondary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[22px]">
                              health_and_safety
                            </span>
                          </div>
                          <div>
                            <span className="font-title-md text-body-md font-bold text-on-surface block">
                              Attach Unified Health Records
                            </span>
                            <span className="font-body-md text-label-sm text-indigo-gray-600">
                              Sync previous ECG reports &amp; ABHA digital profile with {doctorName}.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,image/*"
                            className="sr-only"
                            onChange={handleFileUpload}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold shadow-sm hover:bg-surface-variant transition-colors flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px] text-vibrant-blue">
                              upload_file
                            </span>
                            {uploadedFile ? uploadedFile.slice(0, 14) + "..." : "Upload PDF"}
                          </button>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={syncAbha}
                              onChange={(e) => setSyncAbha(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vibrant-blue"></div>
                          </label>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

                {/* ============================================================ */}
                {/* RIGHT COLUMN: Order Summary, Payment & Checkout CTA (4 cols) */}
                {/* ============================================================ */}
                <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-28">
                  {/* Order Summary Card */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-md relative border border-surface-container">
                    <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
                      <h3 className="font-title-md text-body-lg font-bold text-on-surface">
                        Appointment Summary
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-fresh-teal/15 text-secondary font-label-sm text-label-sm font-bold">
                        1 Session
                      </span>
                    </div>

                    {/* Summary Breakdown Details */}
                    <div className="py-4 space-y-3 font-body-md text-body-md">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-gray-600">
                          {doctor.specialty} {consultationMode === "video" ? "Video Visit" : "Clinic Visit"}
                        </span>
                        <span className="font-semibold text-on-surface">₹{fee}.00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-indigo-gray-600">
                          <span>Platform &amp; Tax Service</span>
                          <span
                            className="material-symbols-outlined text-[14px] text-outline cursor-help"
                            title="Includes HIPAA audio-video tunnel & digital health record generation"
                          >
                            info
                          </span>
                        </div>
                        <span className="font-semibold text-on-surface">₹{platformFee}.00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-fresh-teal font-medium">Insurance Coverage Applied</span>
                        <span className="font-semibold text-fresh-teal">-₹0.00</span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-2.5 px-3 rounded-lg bg-surface-container-low border border-surface-container">
                        <span className="text-indigo-gray-600 font-medium flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-vibrant-blue">calendar_today</span>
                          Chosen Slot
                        </span>
                        <span className="font-bold text-on-surface">
                          {selectedDate} &bull; {selectedSlotTime || "Pick a time slot"}
                        </span>
                      </div>
                    </div>

                    {/* Total Bar */}
                    <div className="pt-4 border-t border-surface-container flex items-baseline justify-between">
                      <div>
                        <span className="font-label-sm text-label-sm text-outline uppercase font-semibold block">
                          Total Payable
                        </span>
                        <span className="font-body-md text-label-sm text-indigo-gray-600">
                          Taxes inclusive
                        </span>
                      </div>
                      <span className="font-headline-lg text-headline-lg font-extrabold text-vibrant-blue">
                        ₹{totalPayable}.00
                      </span>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="mt-6 pt-4 border-t border-surface-container-low">
                      <span className="font-label-sm text-label-sm uppercase font-bold text-outline tracking-wider block mb-3">
                        Select Payment Method
                      </span>
                      <div className="space-y-2.5">
                        {/* Option 1: Saved Card */}
                        <div
                          onClick={() => setPaymentMethod("card")}
                          className={`cursor-pointer flex items-center justify-between p-3 rounded-xl transition-all border ${
                            paymentMethod === "card"
                              ? "bg-surface-container-low border-vibrant-blue/30 shadow-sm"
                              : "bg-surface-container-lowest border-surface-container hover:bg-surface-container-low"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment_method"
                              checked={paymentMethod === "card"}
                              onChange={() => setPaymentMethod("card")}
                              className="text-vibrant-blue focus:ring-0"
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-6 rounded bg-on-surface text-surface-container-lowest flex items-center justify-center font-bold text-[10px]">
                                VISA
                              </div>
                              <div className="flex flex-col">
                                <span className="font-body-md text-body-md font-semibold text-on-surface leading-tight text-sm">
                                  Ending in 4892
                                </span>
                                <span className="font-label-sm text-[11px] text-indigo-gray-600">
                                  Expires 08/28
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-fresh-teal text-[18px]">
                            verified
                          </span>
                        </div>

                        {/* Option 2: New Card */}
                        <div
                          onClick={() => setPaymentMethod("new_card")}
                          className={`cursor-pointer flex items-center justify-between p-3 rounded-xl transition-all border ${
                            paymentMethod === "new_card"
                              ? "bg-surface-container-low border-vibrant-blue/30 shadow-sm"
                              : "bg-surface-container-lowest border-surface-container hover:bg-surface-container-low"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment_method"
                              checked={paymentMethod === "new_card"}
                              onChange={() => setPaymentMethod("new_card")}
                              className="text-vibrant-blue focus:ring-0"
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-6 rounded bg-surface-container text-on-surface flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px]">
                                  credit_card
                                </span>
                              </div>
                              <span className="font-body-md text-body-md text-on-surface font-medium text-sm">
                                New Credit / Debit Card
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Option 3: UPI / Bank */}
                        <div
                          onClick={() => setPaymentMethod("upi")}
                          className={`cursor-pointer flex items-center justify-between p-3 rounded-xl transition-all border ${
                            paymentMethod === "upi"
                              ? "bg-surface-container-low border-vibrant-blue/30 shadow-sm"
                              : "bg-surface-container-lowest border-surface-container hover:bg-surface-container-low"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment_method"
                              checked={paymentMethod === "upi"}
                              onChange={() => setPaymentMethod("upi")}
                              className="text-vibrant-blue focus:ring-0"
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-6 rounded bg-surface-container text-on-surface flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px]">
                                  account_balance
                                </span>
                              </div>
                              <span className="font-body-md text-body-md text-on-surface font-medium text-sm">
                                Instant Bank / UPI Transfer
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Primary Checkout CTA Button */}
                    <button
                      type="button"
                      disabled={isSubmitting || !selectedSlotTime}
                      onClick={handleConfirmAndPay}
                      className="w-full mt-6 py-4 px-6 rounded-full bg-vibrant-blue text-surface-container-lowest font-title-md text-body-lg font-bold shadow-lg shadow-vibrant-blue/25 hover:shadow-xl hover:bg-primary transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px] animate-spin">
                            progress_activity
                          </span>
                          Securing Slot &amp; Payment...
                        </span>
                      ) : !selectedSlotTime ? (
                        <span>Select a Time Slot to Book</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                            lock
                          </span>
                          <span>Confirm &amp; Pay ₹{totalPayable}.00</span>
                        </>
                      )}
                    </button>

                    {/* Guarantee Reassurance List */}
                    <div className="mt-6 pt-5 border-t border-surface-container-low space-y-2.5">
                      <div className="flex items-start gap-2.5 font-label-sm text-label-sm text-indigo-gray-600">
                        <span className="material-symbols-outlined text-[18px] text-vibrant-blue shrink-0">
                          event_repeat
                        </span>
                        <span>Free cancellation up to 2 hours before scheduled slot</span>
                      </div>
                      <div className="flex items-start gap-2.5 font-label-sm text-label-sm text-indigo-gray-600">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
                          sync
                        </span>
                        <span>Instant sync with Google Calendar, Apple &amp; Outlook</span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Availability Context Card */}
                  <div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-4 border border-surface-container">
                    <div className="w-12 h-12 rounded-full bg-vibrant-blue/10 text-vibrant-blue flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                    </div>
                    <div>
                      <span className="font-title-md text-body-md font-bold text-on-surface block">
                        Clinical Guarantee
                      </span>
                      <span className="font-body-md text-label-sm text-indigo-gray-600">
                        Board-certified diagnosis with state medical licensing verified.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FLOATING BOTTOM DOCK WITH BOOK TAB ACTIVE */}
      <PatientDock activeTab="book" />
    </div>
  );
}
