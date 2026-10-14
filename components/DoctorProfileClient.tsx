"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PatientDock } from "@/components/PatientDock";
import { PhoneBar, barActionClass } from "@/components/patient/PhoneHeader";
import {
  LogOut,
  BadgeCheck,
  ShieldCheck,
  Award,
  Calendar,
  CalendarCheck,
  ArrowRight,
  Hospital,
  Phone,
  GraduationCap,
  Building,
  MessageSquare,
  CreditCard,
  UserCog,
  Activity,
  Shield,
  ExternalLink,
  Edit3
} from "lucide-react";
import type { EducationEntry } from "@/lib/education";
import type { Review, ReviewSummary } from "@/lib/reviews";
import { Stars } from "@/components/Stars";
import { CONSULTATION_PLATFORM_FEE } from "@/lib/pricing";


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
  registration_number?: string | null;
  registration_council?: string | null;
  education?: EducationEntry[];
  insurance_accepted?: string[] | null;
  /** Patients' reviews of this doctor (loaded on the server). */
  reviews?: { summary: ReviewSummary; reviews: Review[] };
}

export interface DoctorProfileClientProps {
  doctor: ProfileDoctorData;
  isLoggedIn?: boolean;
  /** The signed-in patient, for the phone header's menu. Null for a doctor looking at a profile. */
  viewer?: { name: string | null; email: string | null } | null;
  showPatientDock?: boolean;
  isDoctorView?: boolean;
  onEditProfile?: () => void;
  onManageSchedule?: () => void;
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

function getSlotDateString(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
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

export function DoctorProfileClient({
  doctor,
  isLoggedIn = false,
  viewer = null,
  showPatientDock = true,
  isDoctorView = false,
  onEditProfile,
  onManageSchedule
}: DoctorProfileClientProps) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // No time is picked until the patient taps one.
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const doctorName = doctor.profiles?.full_name || "Doctor";
  const rawName = doctorName.replace(/^Dr\.\s*/i, "");
  const specialty = doctor.departments?.name || doctor.specialty || "Specialist";
  // Shown only when the doctor has filled them in; never replaced with a made-up value.
  const experienceYears = doctor.experience_years || null;
  const fee = doctor.consultation_fee || null;
  const hospital = doctor.hospitals;
  const qualifications = doctor.qualifications?.trim() || null;
  const education = doctor.education ?? [];
  const insurance = doctor.insurance_accepted ?? [];
  const reviewSummary = doctor.reviews?.summary ?? null;
  const reviewList = doctor.reviews?.reviews ?? [];
  const reviewCount = reviewSummary?.count ?? 0;
  const reviewAverage = reviewSummary?.average ?? null;

  // Dynamic schedules grouped and split by Morning & Afternoon from DB
  const scheduleData = useMemo(() => {
    const schedules = doctor.schedules || [];
    if (schedules.length === 0) {
      return {
        morningRange: "No morning schedule",
        morningSlots: [] as string[],
        afternoonRange: "No afternoon schedule",
        afternoonSlots: [] as string[],
        hasSchedules: false,
        activeDate: null as string | null,
      };
    }

    const byDate: Record<string, typeof schedules> = {};
    for (const s of schedules) {
      const dateKey = getSlotDateString(s.start_time);
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(s);
    }

    const nowIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const sortedDates = Object.keys(byDate).sort();
    // Pick today if available, or first upcoming date with slots, or latest available date
    const activeDateKey = sortedDates.find((d) => d >= nowIST) || sortedDates[sortedDates.length - 1];
    const daySlots = byDate[activeDateKey] || [];

    // Separate into Morning (before 13:00) and Afternoon (13:00 or 14:00 onwards)
    const morningList = daySlots.filter((s) => getSlotHour(s.start_time) < 13);
    let afternoonList = daySlots.filter((s) => getSlotHour(s.start_time) >= 14);
    if (afternoonList.length === 0) {
      afternoonList = daySlots.filter((s) => getSlotHour(s.start_time) >= 13);
    }

    // Determine morning range and display slots
    let morningRange = "No morning schedule";
    let morningSlots: string[] = [];
    if (morningList.length > 0) {
      const mStart = getSlotTimeString(morningList[0].start_time);
      const mEnd = getSlotTimeString(morningList[morningList.length - 1].end_time);
      morningRange = `${mStart} - ${mEnd}`;
      const uniqueMorning = Array.from(new Set(morningList.map((s) => getSlotTimeString(s.start_time))));
      morningSlots = uniqueMorning.slice(0, 4);
    }

    // Determine afternoon range and display slots
    let afternoonRange = "No afternoon schedule";
    let afternoonSlots: string[] = [];
    if (afternoonList.length > 0) {
      const aStart = getSlotTimeString(afternoonList[0].start_time);
      const aEnd = getSlotTimeString(afternoonList[afternoonList.length - 1].end_time);
      afternoonRange = `${aStart} - ${aEnd}`;
      const uniqueAfternoon = Array.from(new Set(afternoonList.map((s) => getSlotTimeString(s.start_time))));
      afternoonSlots = uniqueAfternoon.slice(0, 4);
    }

    // Format active date label
    let activeDateLabel = "";
    if (activeDateKey) {
      const [y, m, d] = activeDateKey.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      activeDateLabel = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    return {
      morningRange,
      morningSlots,
      afternoonRange,
      afternoonSlots,
      hasSchedules: true,
      activeDate: activeDateLabel,
    };
  }, [doctor.schedules]);

  // Conditions and procedures the doctor lists themselves; nothing is assumed from the specialty.
  const procedures = doctor.symptoms ?? [];

  const targetUrl = `/book/${doctor.id}${isPreview
      ? `?preview=patient${selectedSlot ? `&time=${selectedSlot}` : ""}`
      : `${selectedSlot ? `?time=${selectedSlot}` : ""}`
    }`;
  
  const bookUrl = isLoggedIn ? targetUrl : `/login?next=${encodeURIComponent(targetUrl)}`;
  const findUrl = `/find${isPreview ? "?preview=patient" : ""}`;

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen">
      {/* Phones: the blue bar, with Book in reach while scrolling */}
      {!isDoctorView && (
        <PhoneBar
          title={`Dr. ${rawName}`}
          subtitle={specialty}
          backHref={findUrl}
          backLabel="Back to Doctor Directory"
          isSignedIn={isLoggedIn}
          name={viewer?.name}
          email={viewer?.email}
          menu={!isLoggedIn || !!viewer}
          action={
            <Link href={bookUrl} className={barActionClass}>
              <Calendar className="w-3.5 h-3.5" /> Book
            </Link>
          }
        />
      )}
      <main className="w-full bg-background pb-dock">
        <div className="flex flex-col w-full">
          <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop py-stack-lg flex flex-col gap-stack-lg max-w-[1440px] mx-auto">
            {/* Top Navigation / Status Header */}
            {isDoctorView ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-700">Public Profile Preview</span>
                </div>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </form>
              </div>
            ) : (
              <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-sm text-slate-500 font-medium pb-2">
                <Link href="/" className="hover:text-vibrant-blue transition-colors">Home</Link>
                <span>/</span>
                <Link href={findUrl} className="hover:text-vibrant-blue transition-colors">Doctors</Link>
                <span>/</span>
                <span className="text-slate-800 font-semibold truncate">Dr. {rawName}</span>
              </nav>
            )}

            {/* Clinician Hero Profile Section */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden border border-slate-200/80">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 relative z-10">
                {/* Left Column: Doctor Portrait */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-center sm:items-start">
                  <div className="relative w-full aspect-square sm:aspect-[4/5] max-w-[280px] sm:max-w-none rounded-2xl overflow-hidden shadow-xs bg-gradient-to-br from-blue-50 to-indigo-50 border border-slate-200/80">
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
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-24 h-24 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center justify-center text-vibrant-blue font-extrabold text-3xl">
                          {getDoctorInitials(doctorName)}
                        </div>
                        <span className="text-xs font-bold text-slate-600 mt-3 tracking-wide">
                          {specialty}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-slate-800 text-xs font-bold shadow-xs border border-slate-200/60">
                      <BadgeCheck className="w-4 h-4 text-vibrant-blue inline" />
                      <span>Verified Doctor</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Info, Metrics & Actions */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          {specialty}
                        </span>
                      </div>
                      {doctor.registration_number && (
                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                          <ShieldCheck className="w-4 h-4 inline" />
                          <span>
                            Reg. No. {doctor.registration_number}
                            {doctor.registration_council ? `, ${doctor.registration_council}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight font-extrabold mb-1">
                      Dr. {rawName}{qualifications ? (
                        <span className="text-slate-500 text-lg sm:text-xl font-semibold ml-2">
                          {qualifications}
                        </span>
                      ) : null}
                    </h1>

                    <p className="text-base text-slate-600 mb-3 font-semibold">
                      {specialty}{hospital?.name ? ` · ${hospital.name}` : ""}
                    </p>

                    {doctor.bio && (
                      <p className="text-sm md:text-base text-slate-600 max-w-3xl leading-relaxed">{doctor.bio}</p>
                    )}

                    {/* Patient-facing facts */}
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                      {[
                        { label: "Experience", value: experienceYears ? `${experienceYears} years` : "Not listed" },
                        { label: "Consultation fee", value: fee ? `₹${fee.toLocaleString("en-IN")}` : "Not set yet" },
                        { label: "Hospital", value: hospital?.name || "Not listed", note: hospital?.city || undefined },
                        {
                          label: "Patient rating",
                          value: reviewAverage != null ? `${reviewAverage.toFixed(1)} / 5` : "No reviews yet",
                          note: reviewCount ? `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}` : undefined,
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl p-3.5 border border-slate-200 bg-slate-50/60 min-w-0">
                          <dt className="text-xs text-slate-500 font-medium">{item.label}</dt>
                          <dd className="mt-1 text-base font-semibold text-slate-900 truncate">{item.value}</dd>
                          {item.note && <dd className="text-xs text-slate-500 truncate">{item.note}</dd>}
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Hero Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-stack-sm pt-stack-sm border-t border-surface-container">
                    {isDoctorView ? (
                      <div className="flex flex-wrap items-center justify-between w-full gap-stack-sm">
                        <div className="flex flex-wrap items-center gap-stack-sm">
                          <button
                            type="button"
                            onClick={() => onEditProfile ? onEditProfile() : setToastMessage('Profile edit drawer ready')}
                            className="flex items-center gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm px-6 py-2.5 rounded-full font-bold shadow-[0_2px_12px_rgba(15,23,42,0.1)] transition-all cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4 inline" />
                            <span>Edit Public Profile</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onManageSchedule ? onManageSchedule() : setToastMessage('Opening schedule manager')}
                            className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm px-5 py-2.5 rounded-full font-semibold transition-colors cursor-pointer"
                          >
                            <Calendar className="w-4 h-4 inline" />
                            <span>Manage Booking Availability</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <Link
                            href={`/doctors/${doctor.id}?preview=patient`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-primary hover:text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold group cursor-pointer"
                          >
                            <span>View Patient-Facing Profile</span>
                            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform inline" />
                          </Link>

                          <form action="/auth/signout" method="post">
                            <button
                              type="submit"
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
                              title="Logout completely from account"
                            >
                              <LogOut className="w-4 h-4 inline" />
                              <span>Log Out</span>
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-stack-sm">
                          <Link
                            href={bookUrl}
                            className="flex items-center gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-title-md text-body-md px-6 py-3 rounded-full transition-transform active:scale-95 shadow-[0_2px_12px_rgba(15,23,42,0.1)] font-bold cursor-pointer"
                          >
                            <Calendar className="w-5 h-5 inline" />
                            <span>{fee ? `Book consultation · ₹${fee.toLocaleString("en-IN")}` : "Book consultation"}</span>
                          </Link>

                          <a
                            href="#appointment-hours"
                            className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm px-5 py-3 rounded-full transition-colors font-semibold"
                          >
                            <CalendarCheck className="w-4 h-4 inline" />
                            <span>See open times</span>
                          </a>
                        </div>

                        <Link
                          className="inline-flex items-center gap-1.5 text-primary hover:text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold group"
                          href={findUrl}
                        >
                          <span>Back to Doctor Directory</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform inline" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Asymmetric Two-Column Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-stack-md">
              {/* Left Column: Affiliations, Academic acumen, Patient Reviews (8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-stack-lg">
                {/* 1. Where the doctor practises */}
                {hospital && (
                  <section className="bg-surface-container-lowest rounded-xl p-stack-md border border-slate-200/80">
                    <h2 className="text-xl font-bold text-on-surface">Where Dr. {rawName} sees patients</h2>
                    <div className="mt-4 rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                          <Hospital className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <Link href={`/hospitals/${hospital.id}`} className="font-semibold text-on-surface hover:text-vibrant-blue">
                            {hospital.name}
                          </Link>
                          {(hospital.address || hospital.city) && (
                            <p className="text-sm text-slate-600">
                              {[hospital.address, hospital.city].filter(Boolean).join(", ")}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
                            <Building className="w-4 h-4" /> In-person consultations
                          </p>
                        </div>
                      </div>
                      {isDoctorView ? (
                        <button
                          type="button"
                          onClick={() => onManageSchedule?.()}
                          className="text-sm font-semibold text-primary hover:underline shrink-0"
                        >
                          Edit times
                        </button>
                      ) : (
                        <Link href={bookUrl} className="text-sm font-semibold text-primary hover:underline shrink-0">
                          Book a time &rarr;
                        </Link>
                      )}
                    </div>
                  </section>
                )}

                {/* 2. Academic & Clinical Acumen */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-surface-container">
                  <div className="flex items-center justify-between mb-stack-md">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">Qualifications and training</h2>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 gap-stack-md ${procedures.length > 0 ? "md:grid-cols-2" : ""}`}>
                    {procedures.length > 0 && (
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2 font-bold">
                        <Activity className="w-5 h-5 text-primary inline" />{" "}
                        Conditions and procedures
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {procedures.map((proc, i) => (
                          <div
                            key={i}
                            className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-sm text-label-sm flex items-center gap-2 border border-surface-container"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${i % 2 === 0 ? "bg-fresh-teal" : "bg-vibrant-blue"
                                }`}
                            ></span>
                            {proc}
                          </div>
                        ))}
                      </div>

                    </div>
                    )}

                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2 font-bold">
                        <GraduationCap className="w-5 h-5 text-primary inline" />{" "}
                        Medical Education &amp; Training
                      </h3>
                      {/* The doctor's own entries (Profile → Education & Training); otherwise their listed qualifications. */}
                      <div className="flex flex-col gap-3">
                        {education.length > 0 ? (
                          education.map((e, i) => {
                            const Icon = e.kind === "Fellowship" || e.kind === "Certification" ? Award : e.kind === "Residency" || e.kind === "Training" || e.kind === "Teaching" ? Building : GraduationCap;
                            return (
                              <div key={`${e.title}-${i}`} className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 border border-surface-container">
                                <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                                  <Icon className="w-5 h-5 inline" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-label-sm text-[11px] text-secondary font-semibold uppercase">
                                    {e.kind}
                                    {e.year ? ` • ${e.year}` : ""}
                                  </span>
                                  <h4 className="font-title-md text-label-sm font-bold text-on-surface">{e.title}</h4>
                                  {e.institution && <p className="font-body-md text-[13px] text-on-surface-variant">{e.institution}</p>}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 border border-surface-container">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                              <GraduationCap className="w-5 h-5 inline" />
                            </div>
                            <div>
                              <span className="font-label-sm text-[11px] text-secondary font-semibold uppercase">Qualifications</span>
                              <h4 className="font-title-md text-label-sm font-bold text-on-surface">{qualifications || "Not listed yet"}</h4>
                              <p className="font-body-md text-[13px] text-on-surface-variant">{specialty}</p>
                            </div>
                          </div>
                        )}
                        {doctor.registration_number && (
                          <p className="px-1 text-[12px] text-on-surface-variant flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-secondary" /> Reg. No. {doctor.registration_number}
                            {doctor.registration_council ? `, ${doctor.registration_council}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Patient Reviews: written by patients after their visits */}
                <section id="reviews" className="scroll-mt-24 bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-surface-container">
                  <div className="flex flex-wrap items-center justify-between gap-stack-sm mb-stack-md">
                    <div>
                      <div className="flex items-center gap-2 text-fresh-teal">
                        <MessageSquare className="w-5 h-5 inline" />
                        <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                          Verified Visits
                        </span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
                        Patient Reviews
                      </h2>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Written by patients after their consultation
                    </span>
                  </div>

                  {reviewCount === 0 || !reviewSummary ? (
                    <div className="p-5 rounded-xl bg-surface-container-low border border-surface-container text-center">
                      <p className="font-title-md text-[16px] font-bold text-on-surface">No reviews yet</p>
                      <p className="font-body-md text-label-sm text-on-surface-variant mt-1">
                        Patients can rate Dr. {rawName} from their Appointments page after a consultation.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-sm mb-stack-md">
                        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col items-center justify-center text-center border border-surface-container">
                          <div className="font-headline-lg text-[40px] leading-none font-extrabold text-on-surface">{reviewAverage?.toFixed(1)}</div>
                          <Stars value={reviewAverage ?? 0} className="w-5 h-5" />
                          <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                            {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                          </span>
                        </div>
                        <div className="md:col-span-2 p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-1.5 justify-center">
                          {([5, 4, 3, 2, 1] as const).map((n) => {
                            const count = reviewSummary.distribution[n];
                            const pct = reviewCount ? Math.round((count / reviewCount) * 100) : 0;
                            return (
                              <div key={n} className="flex items-center gap-2 text-[12px]">
                                <span className="w-8 shrink-0 font-semibold text-on-surface">{n} ★</span>
                                <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-8 shrink-0 text-right text-on-surface-variant">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-stack-sm">
                        {reviewList.map((r) => (
                          <div key={r.id} className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-title-md text-label-sm font-bold text-on-surface">{r.patientName}</span>
                                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                                  Verified Visit
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Stars value={r.rating} />
                                <span className="font-label-sm text-[12px] text-on-surface-variant">
                                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </div>
                            </div>
                            {r.comment && <p className="font-body-md text-label-sm text-on-surface-variant leading-relaxed">{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>

              {/* Right Column: Fee Structure, Hours, Insurances & Dispatch (4 cols) */}
              <div className="xl:col-span-4 flex flex-col gap-stack-lg">
                {/* 1. Fee */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md border border-slate-200/80">
                  <div className="flex items-center justify-between mb-stack-sm">
                    <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" /> What you pay
                    </h2>
                    {isDoctorView && onEditProfile && (
                      <button type="button" onClick={onEditProfile} className="text-sm font-semibold text-primary hover:underline">
                        Edit fee
                      </button>
                    )}
                  </div>
                  {fee ? (
                    <dl className="text-[15px] divide-y divide-slate-100">
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-slate-600">Consultation fee</dt>
                        <dd className="font-semibold text-slate-900">₹{fee.toLocaleString("en-IN")}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-slate-600">Booking fee</dt>
                        <dd className="font-semibold text-slate-900">₹{CONSULTATION_PLATFORM_FEE}</dd>
                      </div>
                      <div className="flex items-center justify-between pt-3">
                        <dt className="font-semibold text-slate-900">Total, paid online</dt>
                        <dd className="text-lg font-bold text-primary">₹{(fee + CONSULTATION_PLATFORM_FEE).toLocaleString("en-IN")}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-slate-600">This doctor hasn&apos;t set a consultation fee yet, so online booking isn&apos;t open.</p>
                  )}
                </section>

                {/* 2. Appointment Hours */}
                <section
                  id="appointment-hours"
                  className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-surface-container scroll-mt-24"
                >
                  <div className="flex items-center justify-between mb-stack-sm">
                    <div className="flex items-center gap-2 text-vibrant-blue">
                      <Calendar className="w-5 h-5 inline" />
                      <h2 className="font-title-md text-title-md text-on-surface font-bold">
                        Appointment Hours
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-title-md text-label-sm font-bold text-on-surface">
                          Morning
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                          {scheduleData.morningRange}
                        </span>
                      </div>
                      <span className="font-body-md text-[12px] text-on-surface-variant block">
                        {scheduleData.activeDate ? `Open times on ${scheduleData.activeDate}` : "No open times right now"}
                      </span>
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        {scheduleData.morningSlots.map((slotTime, i) => {
                          const isSelected = selectedSlot === slotTime;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setSelectedSlot(slotTime);
                                setToastMessage(`Selected ${slotTime} consultation slot`);
                                setTimeout(() => setToastMessage(null), 2500);
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${isSelected
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "bg-surface-container-highest text-primary hover:bg-surface-container-high"
                                }`}
                            >
                              {slotTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-title-md text-label-sm font-bold text-on-surface">
                          Afternoon
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">
                          {scheduleData.afternoonRange}
                        </span>
                      </div>
                      <span className="font-body-md text-[12px] text-on-surface-variant block">
                        {scheduleData.activeDate ? `Open times on ${scheduleData.activeDate}` : "No open times right now"}
                      </span>
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        {scheduleData.afternoonSlots.map((slotTime, i) => {
                          const isSelected = selectedSlot === slotTime;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setSelectedSlot(slotTime);
                                setToastMessage(`Selected ${slotTime} consultation slot`);
                                setTimeout(() => setToastMessage(null), 2500);
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${isSelected
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "bg-surface-container-highest text-primary hover:bg-surface-container-high"
                                }`}
                            >
                              {slotTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Accepted Insurances: what the doctor lists on their profile */}
                <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-surface-container">
                  <div className="flex items-center justify-between mb-stack-sm">
                    <div className="flex items-center gap-2 text-fresh-teal">
                      <Shield className="w-5 h-5 inline" />
                      <h2 className="font-title-md text-title-md text-on-surface font-bold">
                        Insurance Accepted
                      </h2>
                    </div>
                    {insurance.length > 0 && (
                      <span className="font-label-sm text-[12px] text-secondary font-semibold">
                        {insurance.length} {insurance.length === 1 ? "Insurer" : "Insurers"}
                      </span>
                    )}
                  </div>
                  {insurance.length > 0 ? (
                    <>
                      <p className="font-body-md text-label-sm text-on-surface-variant mb-4">
                        Cashless or reimbursement claims through {hospital?.name || "the hospital desk"}. Check your policy covers the visit.
                      </p>
                      <div className="flex flex-col gap-2">
                        {insurance.map((name) => (
                          <div key={name} className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-surface-container">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] shrink-0">
                                {name[0]?.toUpperCase()}
                              </div>
                              <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">{name}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold uppercase shrink-0">
                              Accepted
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="font-body-md text-label-sm text-on-surface-variant">
                      This doctor hasn’t listed insurers yet. Ask {hospital?.name || "the hospital desk"} about cashless or reimbursement options.
                    </p>
                  )}
                </section>

                {/* 4. Help */}
                <section className="rounded-xl p-stack-md border border-slate-200/80 bg-slate-50">
                  <h3 className="text-base font-bold text-on-surface">Questions before you book?</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    Our assistant can help with booking, payments and finding the right specialist, and our support team is a
                    message away.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                    <Link href="/ai" className="text-primary hover:underline">Ask the assistant</Link>
                    <Link href="/contact" className="text-primary hover:underline">Contact support</Link>
                    {hospital && (
                      <Link href={`/hospitals/${hospital.id}`} className="text-primary hover:underline">About {hospital.name}</Link>
                    )}
                  </div>
                </section>

                {/* 5. Account Session Management (Only in Doctor View) */}
                {isDoctorView && (
                  <section className="bg-surface-container-lowest rounded-xl p-stack-md border border-surface-container shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-gray-900 font-bold text-sm">
                        <UserCog className="w-5 h-5 text-rose-600 inline" />
                        <span>Practitioner Session</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-indigo-gray-600 leading-relaxed">
                      Signed in as <strong>{doctor.profiles?.email || 'Authenticated Doctor'}</strong>. Sign out to terminate your session across all portals.
                    </p>
                    <form action="/auth/signout" method="post" className="w-full mt-1">
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 inline" />
                        <span>Log Out Completely</span>
                      </button>
                    </form>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>



      {/* FLOATING BOTTOM DOCK: Only shown for patient view */}
      {showPatientDock && <PatientDock activeTab="find" />}
    </div>
  );
}
