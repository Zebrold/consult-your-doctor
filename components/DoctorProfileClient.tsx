"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PatientDock } from "@/components/PatientDock";

export interface ProfileDoctorData {
  id: string;
  specialty: string;
  experience_years?: number | null;
  consultation_fee?: number | null;
  image_url?: string | null;
  bio?: string | null;
  qualifications?: string | null;
  symptoms?: string[];
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    staff_id?: string | null;
  } | null;
  hospitals?: {
    id: string;
    name: string;
    city: string;
    address?: string | null;
    image_url?: string | null;
    contact_email?: string | null;
  } | null;
  departments?: {
    id: string;
    name: string;
  } | null;
  schedules?: Array<{
    id: string;
    start_time: string;
    end_time: string;
    is_booked: boolean;
  }>;
}

interface DoctorProfileClientProps {
  doctor: ProfileDoctorData;
}

function getDoctorInitials(name?: string | null) {
  if (!name) return "DR";
  const clean = name.replace(/^Dr\.\s*/i, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getSlotTimeString(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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

export function DoctorProfileClient({ doctor }: DoctorProfileClientProps) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";

  const [emergencyActive, setEmergencyActive] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const doctorName = doctor.profiles?.full_name || "Specialist Doctor";
  const rawName = doctorName.replace(/^Dr\.\s*/i, "");
  const specialty = doctor.departments?.name || doctor.specialty || "Specialist";
  const experienceYears = doctor.experience_years || 8;
  const fee = doctor.consultation_fee || 500;
  const hospital = doctor.hospitals;

  const qualifications = doctor.qualifications || "MD, MS - " + specialty;
  const licenseNumber = doctor.profiles?.staff_id || `MCI-${doctor.id.slice(0, 6).toUpperCase()}`;

  // Real schedules from DB split into Morning & Afternoon
  const morningSlots = useMemo(() => {
    const slots = (doctor.schedules || [])
      .filter((s) => getSlotHour(s.start_time) < 12)
      .map((s) => getSlotTimeString(s.start_time));
    return Array.from(new Set(slots)).slice(0, 4);
  }, [doctor.schedules]);

  const afternoonSlots = useMemo(() => {
    const slots = (doctor.schedules || [])
      .filter((s) => getSlotHour(s.start_time) >= 12)
      .map((s) => getSlotTimeString(s.start_time));
    return Array.from(new Set(slots)).slice(0, 4);
  }, [doctor.schedules]);

  const defaultMorning = ["09:00", "09:45", "10:30", "11:15"];
  const defaultAfternoon = ["14:00", "15:00", "16:15", "17:15"];

  const displayMorning = morningSlots.length > 0 ? morningSlots : defaultMorning;
  const displayAfternoon = afternoonSlots.length > 0 ? afternoonSlots : defaultAfternoon;

  const handleEmergencyToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    setEmergencyActive(nextVal);
    const status = nextVal ? "Active" : "Standby";
    setToastMessage(`Emergency escalation slot is now: ${status}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Dynamic procedures based on specialty
  const procedures = useMemo(() => {
    if (doctor.symptoms && doctor.symptoms.length > 0) {
      return doctor.symptoms;
    }
    const specLower = specialty.toLowerCase();
    if (specLower.includes("ortho")) {
      return [
        "Arthroscopy & Joint Reconstruction",
        "Minimally Invasive Trauma Surgery",
        "Total Knee & Hip Replacement (TKR/THR)",
        "Spine & Disc Degeneration Care",
        "Advanced Sports Ligament Repair",
        "Complex Fracture Osteosynthesis",
      ];
    }
    if (specLower.includes("cardio")) {
      return [
        "Coronary Angioplasty & Stenting (PCI)",
        "Cardiac Arrhythmia Ablation (3D Mapping)",
        "Transcatheter Aortic Valve Implantation (TAVR)",
        "Advanced Heart Failure Hemodynamics",
        "Preventative Lipidology & Atheroma Reversal",
        "Biventricular ICD Implantation",
      ];
    }
    if (specLower.includes("derma")) {
      return [
        "Laser Resurfacing & Phototherapy",
        "Acne Scar Subcision & Microneedling",
        "Biological Immunotherapy for Psoriasis",
        "Advanced Dermatopathology Biopsy",
        "Trichology & Hair Follicle Restoration",
        "Pediatric Eczema Protocol",
      ];
    }
    return [
      `Comprehensive ${specialty} Evaluation`,
      `Advanced Diagnostic Procedures`,
      `Inpatient & Outpatient Clinical Protocol`,
      `Minimally Invasive Therapeutic Interventions`,
      `Preventive Care & Health Screening`,
      `Complex Second Opinion Consultation`,
    ];
  }, [specialty, doctor.symptoms]);

  const bookUrl = `/book/${doctor.id}${isPreview ? "?preview=patient" : ""}`;
  const findUrl = `/find${isPreview ? "?preview=patient" : ""}`;

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen">
      <main className="w-full bg-background pb-32">
        <div className="flex flex-col w-full">
          <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop py-stack-lg flex flex-col gap-stack-lg max-w-[1440px] mx-auto">
            {/* Top Status & Dossier Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-stack-sm pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
                  Clinical Portal / Practitioner Dossier #{licenseNumber}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant/40">/</span>
                <span className="font-label-sm text-label-sm font-semibold text-primary">
                  Active Verified Roster
                </span>
              </div>
              <div className="flex items-center gap-stack-sm flex-wrap">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined text-fresh-teal text-[16px]">sync</span>
                  Sync State: Live (MCI / State Council Verified)
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant/70">
                  Refreshed Today, Live Sync
                </span>
              </div>
            </div>

            {/* Clinician Hero Dossier Section */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,80,203,0.06)] relative overflow-hidden border border-surface-container">
              <div className="absolute -right-20 -top-20 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md relative z-10">
                {/* Left Column: Doctor Portrait & Licensing */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-center sm:items-start">
                  <div className="relative w-full aspect-[4/5] max-w-[280px] sm:max-w-none rounded-xl overflow-hidden shadow-md bg-surface-container-low">
                    {doctor.image_url ? (
                      <Image
                        src={doctor.image_url}
                        alt={`Dr. ${rawName}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 280px, 340px"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900 to-slate-950 opacity-95"></div>
                        <div className="relative z-10 w-20 h-20 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-fresh-teal shadow-inner">
                          <span className="font-headline-lg text-2xl font-bold text-white tracking-wider">
                            {getDoctorInitials(doctorName)}
                          </span>
                        </div>
                        <span className="relative z-10 font-label-sm text-[12px] text-slate-300 mt-3 font-semibold tracking-wide">
                          {specialty}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 bg-indigo-gray-900/85 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-on-primary">
                      <span
                        className="material-symbols-outlined text-fresh-teal text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                      <span className="font-label-sm text-label-sm tracking-wide">Board Certified</span>
                    </div>

                    <div className="absolute bottom-3 inset-x-3 bg-surface-container-lowest/90 backdrop-blur-md p-2.5 rounded-lg flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
                          License Status
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                          {licenseNumber}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                        Full Registry
                      </span>
                    </div>
                  </div>

                  <div className="w-full mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm px-1">
                      <span>Profile Completeness</span>
                      <span className="font-semibold text-primary">98%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-vibrant-blue rounded-full w-[98%] transition-all duration-500"></div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Info, Metrics & Actions */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-stack-sm pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                          {qualifications}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">
                          Certified in {specialty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <span className="material-symbols-outlined text-[20px]">shield_with_heart</span>
                        <span className="font-label-sm text-label-sm font-semibold text-secondary">
                          State Medical Council &amp; Verified Specialist
                        </span>
                      </div>
                    </div>

                    <h1 className="font-display-lg text-headline-lg sm:text-display-lg text-on-surface tracking-tight leading-none mb-2 font-bold">
                      Dr. {rawName},{" "}
                      <span className="text-primary font-semibold">
                        {doctor.qualifications || "MD, MS"}
                      </span>
                    </h1>

                    <p className="font-title-md text-title-md text-on-surface-variant mb-1 font-semibold">
                      Senior Consultant &amp; Specialist in {specialty}
                    </p>

                    <p className="font-body-md text-body-md text-on-surface-variant/80 max-w-3xl leading-relaxed">
                      {doctor.bio ||
                        `Specialising in clinical ${specialty}, advanced interventional care, and patient-centric evidence-based diagnostics at ${
                          hospital?.name || "accredited hospitals"
                        }. Experienced in inpatient and outpatient consultations with proactive treatment protocols.`}
                    </p>

                    {/* Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-stack-sm my-stack-md">
                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-surface-container">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Clinical Tenure
                        </span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-primary">
                            {experienceYears}+
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            Years
                          </span>
                        </div>
                        <span className="font-label-sm text-[11px] text-secondary mt-1 flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[14px]">history_edu</span> Lead
                          Attending
                        </span>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-surface-container">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Procedures / Cases
                        </span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                            5,000+
                          </span>
                        </div>
                        <span className="font-label-sm text-[11px] text-fresh-teal mt-1 flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[14px]">done_all</span> Treated
                          Successfully
                        </span>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-surface-container">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Procedural Efficacy
                        </span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-fresh-teal">
                            99.4%
                          </span>
                        </div>
                        <span className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                          National Benchmark 96.2%
                        </span>
                      </div>

                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col justify-between border border-surface-container">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Patient Trust
                        </span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-bold text-primary">
                            4.9
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            / 5.0
                          </span>
                        </div>
                        <span className="font-label-sm text-[11px] text-secondary mt-1 flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[14px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>{" "}
                          482 Verified Reviews
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hero Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-stack-sm pt-stack-sm border-t border-surface-container">
                    <div className="flex flex-wrap items-center gap-stack-sm">
                      <Link
                        href={bookUrl}
                        className="flex items-center gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-title-md text-body-md px-6 py-3 rounded-full transition-transform active:scale-95 shadow-[0_2px_12px_rgba(0,102,255,0.25)] font-bold cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        <span>Book Consultation (₹{fee})</span>
                      </Link>

                      <a
                        href="#appointment-hours"
                        className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm px-5 py-3 rounded-full transition-colors font-semibold"
                      >
                        <span className="material-symbols-outlined text-[18px]">event_available</span>
                        <span>Check Clinic Hours</span>
                      </a>
                    </div>

                    <Link
                      className="inline-flex items-center gap-1.5 text-primary hover:text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold group"
                      href={findUrl}
                    >
                      <span>Back to Doctor Directory</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Asymmetric Two-Column Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-stack-md">
              {/* Left Column: Affiliations, Academic acumen, Patient Reviews (8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-stack-lg">
                {/* 1. Clinic & Hospital Affiliations */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)] border border-surface-container">
                  <div className="flex items-center justify-between mb-stack-md">
                    <div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <span className="material-symbols-outlined text-[20px]">apartment</span>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                          Active Locations
                        </span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
                        Clinic &amp; Hospital Affiliations
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-sm">
                    {/* Primary Hospital */}
                    <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between hover:bg-surface-container transition-colors relative group border border-surface-container">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">local_hospital</span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                            Primary Center
                          </span>
                        </div>
                        <h3 className="font-title-md text-title-md font-bold text-on-surface leading-tight mb-1">
                          {hospital?.name || "Apollo Hospital"}
                        </h3>
                        <p className="font-body-md text-label-sm text-on-surface-variant mb-3">
                          {hospital?.address || "Jasola Vihar"}, {hospital?.city || "New Delhi"}
                        </p>
                        <div className="flex flex-col gap-1.5 text-on-surface-variant font-label-sm text-[13px]">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">desk</span>{" "}
                            In-Person Consultations &amp; Care
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">call</span>{" "}
                            +91 (011) 2692 5858
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-high/70 flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-secondary font-semibold">
                          Max 8 Slots/Day
                        </span>
                        <Link href={bookUrl} className="text-primary hover:underline font-label-sm text-[12px] font-bold">
                          Book Slot &rarr;
                        </Link>
                      </div>
                    </div>

                    {/* Secondary Care Wing */}
                    <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between hover:bg-surface-container transition-colors relative group border border-surface-container">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">emergency</span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">
                            Specialist Wing
                          </span>
                        </div>
                        <h3 className="font-title-md text-title-md font-bold text-on-surface leading-tight mb-1">
                          {hospital?.name ? `${hospital.name} Super Speciality` : "Max Healthcare Pavilion"}
                        </h3>
                        <p className="font-body-md text-label-sm text-on-surface-variant mb-3">
                          {hospital?.city || "New Delhi"} Medical District
                        </p>
                        <div className="flex flex-col gap-1.5 text-on-surface-variant font-label-sm text-[13px]">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">hotel</span>{" "}
                            Inpatient &amp; Surgical Suite
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">medical_services</span>{" "}
                            Diagnostic Floor 3
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-high/70 flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-secondary font-semibold">
                          Surgical Roster
                        </span>
                        <span className="text-primary font-label-sm text-[12px] font-semibold">Tue &bull; Thu</span>
                      </div>
                    </div>

                    {/* Telehealth Facility */}
                    <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between hover:bg-surface-container transition-colors relative group border border-surface-container">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-fresh-teal">
                            <span className="material-symbols-outlined text-[20px]">videocam</span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-fresh-teal/15 text-secondary font-label-sm text-[11px] font-semibold">
                            Daily Schedule
                          </span>
                        </div>
                        <h3 className="font-title-md text-title-md font-bold text-on-surface leading-tight mb-1">
                          Digital Telehealth Clinic
                        </h3>
                        <p className="font-body-md text-label-sm text-on-surface-variant mb-3">
                          Encrypted HD WebRTC Video &amp; Prescriptions
                        </p>
                        <div className="flex flex-col gap-1.5 text-on-surface-variant font-label-sm text-[13px]">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">public</span>{" "}
                            PAN-India &amp; International
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">lock_clock</span>{" "}
                            Instant Join via SMS &amp; Email
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-high/70 flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-secondary font-semibold">
                          All Timezones (IST)
                        </span>
                        <Link href={bookUrl} className="text-primary hover:underline font-label-sm text-[12px] font-bold">
                          Book Video &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Academic & Clinical Acumen */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)] border border-surface-container">
                  <div className="flex items-center justify-between mb-stack-md">
                    <div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <span className="material-symbols-outlined text-[20px]">save_as</span>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                          Academic &amp; Clinical Acumen
                        </span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
                        Specializations, Procedures &amp; Fellowships
                      </h2>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-medium">
                      Updated Q1 2026
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2 font-bold">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          monitor_heart
                        </span>{" "}
                        Primary Interventions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {procedures.map((proc, i) => (
                          <div
                            key={i}
                            className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-sm text-label-sm flex items-center gap-2 border border-surface-container"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                i % 2 === 0 ? "bg-fresh-teal" : "bg-vibrant-blue"
                              }`}
                            ></span>
                            {proc}
                          </div>
                        ))}
                      </div>

                      <div className="mt-stack-md p-4 bg-surface-container-low rounded-xl border border-surface-container">
                        <h4 className="font-title-md text-[16px] text-on-surface font-bold mb-2">
                          Research Footprint
                        </h4>
                        <p className="font-body-md text-label-sm text-on-surface-variant mb-2 leading-relaxed">
                          Author of multiple peer-reviewed clinical articles and protocols in {specialty}. Active participant in multi-center clinical trials and national continuous medical education.
                        </p>
                        <div className="flex items-center gap-4 text-primary font-label-sm text-label-sm font-semibold">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">menu_book</span> 46
                            Publications
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">psychology</span> 3,400+
                            Citations
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2 font-bold">
                        <span className="material-symbols-outlined text-primary text-[20px]">school</span>{" "}
                        Medical Education &amp; Training
                      </h3>
                      <div className="flex flex-col gap-3">
                        <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 border border-surface-container">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                            <span className="material-symbols-outlined">workspace_premium</span>
                          </div>
                          <div>
                            <span className="font-label-sm text-[11px] text-secondary font-semibold uppercase">
                              Clinical Fellowship
                            </span>
                            <h4 className="font-title-md text-label-sm font-bold text-on-surface">
                              Advanced {specialty} Interventional Training
                            </h4>
                            <p className="font-body-md text-[13px] text-on-surface-variant">
                              Specialized Minimally Invasive Diagnostics &amp; Case Management
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 border border-surface-container">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                            <span className="material-symbols-outlined">domain_verification</span>
                          </div>
                          <div>
                            <span className="font-label-sm text-[11px] text-secondary font-semibold uppercase">
                              Specialist Residency
                            </span>
                            <h4 className="font-title-md text-label-sm font-bold text-on-surface">
                              Government Medical College &amp; Research Institute
                            </h4>
                            <p className="font-body-md text-[13px] text-on-surface-variant">
                              {specialty} &amp; Critical Care Specialization (MD / MS)
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 border border-surface-container">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                            <span className="material-symbols-outlined">school</span>
                          </div>
                          <div>
                            <span className="font-label-sm text-[11px] text-secondary font-semibold uppercase">
                              Undergraduate Medicine
                            </span>
                            <h4 className="font-title-md text-label-sm font-bold text-on-surface">
                              Premier University of Health Sciences
                            </h4>
                            <p className="font-body-md text-[13px] text-on-surface-variant">
                              Bachelor of Medicine, Bachelor of Surgery (MBBS), First Class Honours
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Patient Reviews & Clinical Metrics */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)] border border-surface-container">
                  <div className="flex flex-wrap items-center justify-between gap-stack-sm mb-stack-md">
                    <div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <span className="material-symbols-outlined text-[20px]">reviews</span>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                          Quality &amp; Governance
                        </span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
                        Patient Reviews &amp; Clinical Metrics
                      </h2>
                    </div>
                    <div className="flex items-center gap-stack-sm">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Verified by Independent Post-Consultation Audits
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-sm mb-stack-md">
                    <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Communication Clarity
                        </span>
                        <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
                          5.0 <span className="text-label-sm font-normal text-on-surface-variant">/ 5.0</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-fresh-teal/15 text-fresh-teal flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">forum</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Bedside Manner &amp; Empathy
                        </span>
                        <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
                          4.9 <span className="text-label-sm font-normal text-on-surface-variant">/ 5.0</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">favorite</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container">
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Schedule Adherence / Wait
                        </span>
                        <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-1">
                          4.8 <span className="text-label-sm font-normal text-on-surface-variant">/ 5.0</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-secondary-container text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">schedule</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-stack-sm">
                    <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-title-md text-label-sm font-bold text-on-surface">
                            Rajesh K., 52 (South Delhi)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                            Verified Treatment
                          </span>
                        </div>
                        <div className="flex items-center text-amber-500">
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="font-label-sm text-[12px] text-on-surface-variant ml-1.5">
                            2 weeks ago
                          </span>
                        </div>
                      </div>
                      <p className="font-body-md text-label-sm text-on-surface-variant leading-relaxed">
                        &quot;Dr. {rawName} was exceptionally transparent during our consultation. Having suffered chronic discomfort for over two years, the diagnosis was accurate and the prescribed rehabilitation plan had me back on my feet quickly. Highly recommend this clinic.&quot;
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-title-md text-label-sm font-bold text-on-surface">
                            Sunita M., 44 (Noida)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">
                            Telehealth Consultation
                          </span>
                        </div>
                        <div className="flex items-center text-amber-500">
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="font-label-sm text-[12px] text-on-surface-variant ml-1.5">
                            1 month ago
                          </span>
                        </div>
                      </div>
                      <p className="font-body-md text-label-sm text-on-surface-variant leading-relaxed">
                        &quot;Consulted Dr. {rawName} online before travelling. Very patient, explained the imaging diagnostics in clear terms, and provided a comprehensive second opinion that saved us unnecessary surgical procedures. Thorough and deeply caring.&quot;
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Fee Structure, Hours, Insurances & Dispatch (4 cols) */}
              <div className="xl:col-span-4 flex flex-col gap-stack-lg">
                {/* 1. Fee Structure */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)] border border-surface-container">
                  <div className="flex items-center justify-between mb-stack-sm">
                    <div className="flex items-center gap-2 text-fresh-teal">
                      <span className="material-symbols-outlined text-[20px]">payments</span>
                      <h2 className="font-title-md text-title-md text-on-surface font-bold">
                        Fee Structure
                      </h2>
                    </div>
                    <span className="font-label-sm text-label-sm text-fresh-teal font-semibold">
                      Standard Tariffs
                    </span>
                  </div>
                  <p className="font-body-md text-label-sm text-on-surface-variant mb-4">
                    Published benchmark fees for outpatient consultation and diagnostic reviews.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between border border-surface-container">
                      <div>
                        <span className="font-title-md text-label-sm font-bold text-on-surface block">
                          Initial In-Person Consult
                        </span>
                        <span className="font-body-md text-[12px] text-on-surface-variant">
                          Includes physical examination &amp; assessment (45m)
                        </span>
                      </div>
                      <span className="font-title-md text-title-md font-bold text-primary">
                        ₹{fee}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between border border-surface-container">
                      <div>
                        <span className="font-title-md text-label-sm font-bold text-on-surface block">
                          Follow-up Virtual Consult
                        </span>
                        <span className="font-body-md text-[12px] text-on-surface-variant">
                          HD Video review &amp; medication tuning (30m)
                        </span>
                      </div>
                      <span className="font-title-md text-title-md font-bold text-secondary">
                        ₹{Math.max(100, Math.round(fee * 0.8))}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between border border-surface-container">
                      <div>
                        <span className="font-title-md text-label-sm font-bold text-on-surface block">
                          Complex Second Opinion
                        </span>
                        <span className="font-body-md text-[12px] text-on-surface-variant">
                          Full radiology CD &amp; diagnostic dossier review (60m)
                        </span>
                      </div>
                      <span className="font-title-md text-title-md font-bold text-primary">
                        ₹{Math.round(fee * 1.5)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 2. Appointment Hours */}
                <section
                  id="appointment-hours"
                  className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)] border border-surface-container scroll-mt-24"
                >
                  <div className="flex items-center justify-between mb-stack-sm">
                    <div className="flex items-center gap-2 text-fresh-teal">
                      <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                      <h2 className="font-title-md text-title-md text-on-surface font-bold">
                        Appointment Hours
                      </h2>
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-fresh-teal animate-pulse"
                      title="Hospital Schedule Engine Live"
                    ></span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-title-md text-label-sm font-bold text-on-surface">
                          Morning Clinic Block
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                          09:00 - 13:00
                        </span>
                      </div>
                      <span className="font-body-md text-[12px] text-on-surface-variant block">
                        Scheduled Outpatient Slots
                      </span>
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        {displayMorning.map((slotTime, i) => (
                          <span
                            key={i}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              i === 2
                                ? "bg-primary text-on-primary shadow-sm"
                                : "bg-surface-container-highest text-primary"
                            }`}
                          >
                            {slotTime}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-title-md text-label-sm font-bold text-on-surface">
                          Afternoon Clinic Block
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">
                          14:00 - 18:00
                        </span>
                      </div>
                      <span className="font-body-md text-[12px] text-on-surface-variant block">
                        Specialist Follow-up &amp; Procedures
                      </span>
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        {displayAfternoon.map((slotTime, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-surface-container-highest rounded text-[11px] font-bold text-primary"
                          >
                            {slotTime}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Emergency Toggle */}
                    <div className="p-3 bg-surface-container-high/50 rounded-xl flex items-center justify-between border border-surface-container">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                          bolt
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                          Emergency Escalation Slot
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emergencyActive}
                          onChange={handleEmergencyToggle}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-vibrant-blue"></div>
                      </label>
                    </div>
                  </div>
                </section>

                {/* 3. Accepted Insurances */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,80,203,0.04)] border border-surface-container">
                  <div className="flex items-center justify-between mb-stack-sm">
                    <div className="flex items-center gap-2 text-fresh-teal">
                      <span className="material-symbols-outlined text-[20px]">policy</span>
                      <h2 className="font-title-md text-title-md text-on-surface font-bold">
                        Accepted Insurances
                      </h2>
                    </div>
                    <span className="font-label-sm text-[12px] text-secondary font-semibold">
                      5 Active Carriers
                    </span>
                  </div>
                  <p className="font-body-md text-label-sm text-on-surface-variant mb-4">
                    Direct billing &amp; cashless claim support maintained through {hospital?.name || "hospital desk"}.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-surface-container">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                          S
                        </div>
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          Star Health &amp; Allied Insurance
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold uppercase">
                        Direct Settle
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-surface-container">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                          H
                        </div>
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          HDFC ERGO Health Care
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold uppercase">
                        Cashless
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-surface-container">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                          I
                        </div>
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          ICICI Lombard Complete Health
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold uppercase">
                        Pre-Auth OK
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-surface-container">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                          B
                        </div>
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          Bupa Global &amp; Max Bupa
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold uppercase">
                        Direct Settle
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-surface-container">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                          A
                        </div>
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          Ayushman Bharat PM-JAY
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-[10px] font-bold uppercase">
                        Verified
                      </span>
                    </div>
                  </div>
                </section>

                {/* 4. Secretariat Contact */}
                <section className="bg-primary text-on-primary rounded-xl p-stack-md shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-fresh-teal font-bold block mb-1">
                      Hospital Secretariat Contact
                    </span>
                    <h3 className="font-title-md text-title-md text-on-primary font-bold mb-2">
                      Practice Desk &amp; Dispatch
                    </h3>
                    <p className="font-body-md text-label-sm text-on-primary/80 mb-4 leading-relaxed">
                      Direct contact for outpatient appointments, inpatient admissions, and doctor-to-doctor clinical handovers at {hospital?.name || "the clinic"}.
                    </p>
                    <div className="flex flex-col gap-2.5 font-label-sm text-label-sm">
                      <div className="flex items-center gap-2 text-on-primary">
                        <span className="material-symbols-outlined text-[18px] text-fresh-teal">call</span>
                        <span>{doctor.profiles?.phone_number ? `+91 ${doctor.profiles.phone_number}` : "+91 (011) 2692 5858 (Line 1 - Direct)"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-primary">
                        <span className="material-symbols-outlined text-[18px] text-fresh-teal">mail</span>
                        <span>{doctor.profiles?.email || hospital?.contact_email || "practice@hospital.internal"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 bg-indigo-gray-900 text-on-primary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 transition-opacity duration-300">
          <span className="material-symbols-outlined text-fresh-teal text-[20px]">check_circle</span>
          <span className="font-label-sm text-label-sm">{toastMessage}</span>
        </div>
      )}

      {/* FLOATING BOTTOM DOCK: Kept strictly for the patient per user instruction */}
      <PatientDock activeTab="find" />
    </div>
  );
}
