"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  Building,
  Building2,
  CalendarDays,
  GraduationCap,
  MessageCircleQuestion,
  Navigation,
  ShieldCheck,
  Star,
  Sun,
  Sunset,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { EducationEntry } from "@/lib/education";
import type { Review, ReviewSummary } from "@/lib/reviews";
import { Stars } from "@/components/Stars";
import { VerifiedBadge } from "@/components/home/ui";
import { BlueHeader, PhoneHeader } from "@/components/patient/PhoneHeader";
import { DayStrip } from "@/components/patient/booking-ui";
import { Dots, InfoRow, btnPrimary, card } from "@/components/patient/app-ui";
import { directionsHref, doctorName as fullName, formatINR, formatSlot, formatTime, initials, isMorning, istDateKey, upcomingDays } from "@/components/patient/format";
import { RemoteImage } from "@/components/RemoteImage";

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
  /** The doctor booking fee: all the patient pays online (lib/booking-fees.ts). */
  bookingFee: number;
  now: number;
  /** The patient or visitor, for the header's menu. Null when a doctor looks at a profile from their portal. */
  account: { isSignedIn: boolean; name: string | null; email: string | null } | null;
}

type Slot = { id: string; start: string };

const sectionCard = `p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`;

/**
 * A doctor's public profile: who they are, where they see patients, what a visit costs, their open times and what
 * patients wrote after a visit. Picking a time continues to the booking page with that time chosen.
 */
export function DoctorProfileClient({ doctor, bookingFee, now, account }: DoctorProfileClientProps) {
  const name = fullName(doctor.profiles?.full_name);
  const specialty = doctor.departments?.name || doctor.specialty || "Specialist";
  // Shown only when the doctor has filled them in; never replaced with a made-up value.
  const experience = doctor.experience_years || null;
  // The consultation fee the hospital set. This page is the only place a patient sees it: it is paid at the hospital
  // counter, never online, so booking screens, checkout, slips and messages show only the booking fee.
  const fee = Number(doctor.consultation_fee) || null;
  const bookable = !!fee;
  const hospital = doctor.hospitals ?? null;
  const qualifications = doctor.qualifications?.trim() || null;
  const education = doctor.education ?? [];
  const insurance = doctor.insurance_accepted ?? [];
  // Conditions and procedures the doctor lists themselves; nothing is assumed from the specialty.
  const procedures = doctor.symptoms ?? [];
  const summary = doctor.reviews?.summary ?? null;
  const reviews = doctor.reviews?.reviews ?? [];
  const reviewCount = summary?.count ?? 0;
  const rating = reviewCount ? summary?.average ?? null : null;
  const registration = doctor.registration_number
    ? `Reg. No. ${doctor.registration_number}${doctor.registration_council ? `, ${doctor.registration_council}` : ""}`
    : null;
  const directions = hospital ? directionsHref(hospital.name, hospital.address, hospital.city) : null;
  const where = [hospital?.address, hospital?.city].filter(Boolean).join(", ");

  // Open times by day (India time). The page sends only future, unbooked times.
  const slots: Slot[] = useMemo(() => (doctor.schedules ?? []).filter((s) => !s.is_booked).map((s) => ({ id: s.id, start: s.start_time })), [doctor.schedules]);
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = istDateKey(s.start);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [slots]);
  const days = useMemo(() => upcomingDays(now, 6), [now]);
  const today = days[0].key;
  const [date, setDate] = useState(() => days.find((d) => byDay.has(d.key))?.key ?? today);
  const [slotId, setSlotId] = useState<string | null>(null);
  const daySlots = byDay.get(date) ?? [];
  const selected = slots.find((s) => s.id === slotId) ?? null;
  const nextAfter = slots.find((s) => istDateKey(s.start) > date) ?? null;
  const openToday = byDay.get(today)?.length ?? 0;

  const pickDay = (key: string) => {
    setDate(key);
    setSlotId(null);
  };

  const bookHref = `/book/${doctor.id}${selected ? `?slot=${selected.id}` : ""}`;
  const otherDoctors = hospital ? `/hospitals/${hospital.id}` : "/doctors";
  const support = account?.isSignedIn ? "/patient/support" : "/contact";

  const photo = (className: string, text: string) =>
    doctor.image_url ? (
      <RemoteImage src={doctor.image_url} alt={`Portrait of ${name}`} width={120} height={132} load="first" className={`shrink-0 object-cover object-top bg-[#EEF1F5] ${className}`} />
    ) : (
      <span className={`shrink-0 bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center font-extrabold ${className} ${text}`}>
        {initials(doctor.profiles?.full_name) || <UserRound className="w-7 h-7" />}
      </span>
    );

  // Phones: the doctor in the blue header, with three quick facts under them.
  const hero = (
    <>
      <div className="flex items-center gap-3.5">
        {photo("w-[76px] h-[84px] md:w-24 md:h-[104px] rounded-[16px] ring-2 ring-white/35", "text-[24px]")}
        <div className="min-w-0">
          <p className="text-[12.5px] md:text-[14px] font-bold text-[#CFDCFF] truncate">{specialty}</p>
          <h1 className="flex items-center gap-1.5 mt-0.5 text-[22px] md:text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em]">
            <span className="min-w-0 break-words">{name}</span>
            <span className="shrink-0 rounded-full bg-white p-px">
              <VerifiedBadge className="w-[18px] h-[18px]" />
            </span>
          </h1>
          {qualifications && <p className="mt-0.5 text-[13px] md:text-[14.5px] text-[#DCE6FF] line-clamp-2">{qualifications}</p>}
          {hospital && <p className="text-[13px] md:text-[14.5px] text-[#DCE6FF] truncate">{[hospital.name, hospital.city].filter(Boolean).join(", ")}</p>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 rounded-[16px] bg-white/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]">
        <HeroFact label="Experience" value={experience ? `${experience} yrs` : "—"} />
        <HeroFact label="Rating" value={rating != null ? `${rating.toFixed(1)} ★` : "New"} note={reviewCount ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : undefined} border />
        <HeroFact label="Open today" value={bookable ? (openToday ? `${openToday} slot${openToday === 1 ? "" : "s"}` : "None") : "—"} border />
      </div>
    </>
  );

  const booking = (
    <section id="appointment-hours" aria-labelledby="times-title" className={`scroll-mt-24 ${sectionCard}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <span>
          <h2 id="times-title" className="text-[16px] font-extrabold">Book a visit</h2>
          <p className="mt-0.5 text-[12.5px] text-[#5B667A]">In person{hospital ? ` at ${hospital.name}` : ""}. Pick a time to continue.</p>
        </span>
        {bookable && (
          <Link href={`/book/${doctor.id}`} className="shrink-0 flex items-center gap-1.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
            <CalendarDays className="w-4 h-4" /> All dates
          </Link>
        )}
      </div>
      {!bookable ? (
        <p className="py-3 border-t border-[#EEF2F7] text-[13px] text-[#5B667A]">
          Online booking for {name} isn&apos;t open yet.{" "}
          <Link href={otherDoctors} className="font-extrabold text-[#2A4DD0] hover:underline">
            {hospital ? `See other doctors at ${hospital.name}` : "See other doctors"}
          </Link>
        </p>
      ) : slots.length === 0 ? (
        <div className="py-6 px-4 text-center rounded-[14px] bg-[#F6F8FC] flex flex-col items-center gap-1.5">
          <CalendarDays className="w-7 h-7 text-[#9AA4B5]" />
          <p className="text-[14px] font-extrabold">No open times right now</p>
          <p className="text-[12.5px] text-[#5B667A] max-w-sm">New times are added by the hospital. Check back soon, or book another doctor.</p>
          <Link href={otherDoctors} className="mt-1 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
            {hospital ? `Doctors at ${hospital.name}` : "Find another doctor"}
          </Link>
        </div>
      ) : (
        <>
          <DayStrip
            days={days}
            selected={date}
            onSelect={pickDay}
            badge={(key) => {
              const open = byDay.get(key)?.length ?? 0;
              return open ? { text: `${open} Slot${open === 1 ? "" : "s"}`, tone: "open" } : { text: "No slots", tone: "none" };
            }}
          />
          <div className="mt-4 flex flex-col gap-4">
            {daySlots.length === 0 ? (
              <div className="py-6 px-4 text-center rounded-[14px] bg-[#F6F8FC] flex flex-col items-center gap-2">
                <p className="text-[14px] font-extrabold">No times on this day</p>
                {nextAfter && (
                  <button
                    type="button"
                    onClick={() => {
                      setDate(istDateKey(nextAfter.start));
                      setSlotId(nextAfter.id);
                    }}
                    className={btnPrimary}
                  >
                    Next open time: {formatSlot(nextAfter.start, now)}
                  </button>
                )}
              </div>
            ) : (
              <>
                <Times title="Morning" icon={Sun} slots={daySlots.filter((s) => isMorning(s.start))} selectedId={slotId} onPick={setSlotId} />
                <Times title="Afternoon & evening" icon={Sunset} slots={daySlots.filter((s) => !isMorning(s.start))} selectedId={slotId} onPick={setSlotId} />
              </>
            )}
          </div>
        </>
      )}
    </section>
  );

  const fees = (
    <Card id="fees" title="What you pay">
      <div className="flex justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
        <span>
          <span className="block text-[14px] font-bold">Booking fee</span>
          <span className="block text-[12px] text-[#5B667A]">Paid online when you book</span>
        </span>
        <span className="text-[15px] font-extrabold text-[#2A4DD0]">{formatINR(bookingFee)}</span>
      </div>
      <div className="flex justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
        <span>
          <span className="block text-[14px] font-bold">Consultation fee</span>
          <span className="block text-[12px] text-[#5B667A]">Set by the hospital, paid at the counter when you visit</span>
        </span>
        <span className="shrink-0 text-[15px] font-extrabold">{fee ? formatINR(fee) : "Not set"}</span>
      </div>
      <p className="mt-1 text-[11.5px] leading-normal text-[#5B667A]">The consultation fee isn&apos;t collected online and is never added to your booking total.</p>
    </Card>
  );

  const details = (
    <>
      {hospital && (
        <Card id="where" title={`Where ${name} sees patients`}>
          <div className="flex items-start gap-3 p-3 rounded-[14px] border-[1.5px] border-[#E1E7F0]">
            <span className="shrink-0 w-10 h-10 rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <Link href={`/hospitals/${hospital.id}`} className="block text-[14px] font-extrabold hover:text-[#2A4DD0]">
                {hospital.name}
              </Link>
              {where && <span className="block text-[12.5px] text-[#5B667A]">{where}</span>}
              <span className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#4A5878]">
                <Building className="w-3.5 h-3.5" /> In-person consultations
              </span>
            </span>
            {directions && (
              <a href={directions} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                <Navigation className="w-3.5 h-3.5" /> Directions
              </a>
            )}
          </div>
        </Card>
      )}

      {doctor.bio && (
        <Card id="about" title={`About ${name}`}>
          <p className="text-[14px] leading-relaxed text-[#4A5878] whitespace-pre-line">{doctor.bio}</p>
        </Card>
      )}

      <Card id="training" title="Qualifications & training">
        <div className="flex flex-col gap-2.5">
          {education.length > 0 ? (
            education.map((e, i) => {
              const Icon = e.kind === "Fellowship" || e.kind === "Certification" ? Award : e.kind === "Residency" || e.kind === "Training" || e.kind === "Teaching" ? Building : GraduationCap;
              return (
                <div key={`${e.title}-${i}`} className="flex items-start gap-3 p-3 rounded-[14px] bg-[#F6F8FC]">
                  <span className="shrink-0 w-9 h-9 rounded-[10px] bg-white text-[#2A4DD0] flex items-center justify-center shadow-[0_0_0_1px_#E6EBF3]">
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#067647]">
                      {e.kind}
                      {e.year ? ` · ${e.year}` : ""}
                    </span>
                    <span className="block text-[14px] font-extrabold">{e.title}</span>
                    {e.institution && <span className="block text-[12.5px] text-[#5B667A]">{e.institution}</span>}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-[14px] bg-[#F6F8FC]">
              <span className="shrink-0 w-9 h-9 rounded-[10px] bg-white text-[#2A4DD0] flex items-center justify-center shadow-[0_0_0_1px_#E6EBF3]">
                <GraduationCap className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#067647]">Qualifications</span>
                <span className="block text-[14px] font-extrabold">{qualifications || "Not listed yet"}</span>
                <span className="block text-[12.5px] text-[#5B667A]">{specialty}</span>
              </span>
            </div>
          )}
          {registration && (
            <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#4A5878]">
              <ShieldCheck className="w-4 h-4 text-[#067647]" /> {registration}
            </p>
          )}
        </div>
        {procedures.length > 0 && (
          <>
            <h3 className="mt-4 mb-2 flex items-center gap-1.5 text-[13.5px] font-extrabold">
              <Activity className="w-4 h-4 text-[#2A4DD0]" /> Conditions and procedures
            </h3>
            <div className="flex flex-wrap gap-2">
              {procedures.map((p) => (
                <span key={p} className="px-3 py-1.5 rounded-full bg-[#EEF3FF] text-[12.5px] font-bold text-[#27324A]">
                  {p}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card id="reviews" title="Patient reviews" sub="Written by patients after their visit">
        {!summary || rating == null ? (
          <div className="p-4 rounded-[14px] bg-[#F6F8FC] text-center">
            <p className="text-[14px] font-extrabold">No reviews yet</p>
            <p className="mt-1 text-[12.5px] text-[#5B667A]">Patients can rate {name} from their bookings after a visit.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 p-3.5 rounded-[14px] bg-[#F6F8FC]">
              <span className="shrink-0 text-center px-1">
                <span className="block text-[34px] leading-none font-extrabold">{rating.toFixed(1)}</span>
                <Stars value={rating} className="w-3.5 h-3.5" />
                <span className="block mt-0.5 text-[11.5px] font-bold text-[#5B667A]">
                  {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </span>
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-1">
                {([5, 4, 3, 2, 1] as const).map((n) => {
                  const count = summary.distribution[n];
                  return (
                    <span key={n} className="flex items-center gap-2 text-[11.5px] font-bold">
                      <span className="w-6 shrink-0">{n} ★</span>
                      <span className="flex-1 h-1.5 rounded-full bg-[#E6EBF3] overflow-hidden">
                        <span className="block h-full rounded-full bg-[#F5A524]" style={{ width: `${Math.round((count / reviewCount) * 100)}%` }} />
                      </span>
                      <span className="w-5 shrink-0 text-right text-[#5B667A]">{count}</span>
                    </span>
                  );
                })}
              </span>
            </div>
            <div className="mt-1">
              {reviews.map((r) => (
                <div key={r.id} className="py-3 border-b last:border-b-0 border-[#EEF2F7]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[13.5px] font-extrabold truncate">{r.patientName}</span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#067647] text-[10.5px] font-extrabold">Verified visit</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Stars value={r.rating} className="w-3.5 h-3.5" />
                      <span className="text-[11.5px] text-[#5B667A]">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </span>
                  </div>
                  {r.comment && <p className="mt-1.5 text-[13px] leading-relaxed text-[#4A5878]">{r.comment}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3.5 lg:gap-5">
        <Card id="insurance" title="Insurance accepted" sub={insurance.length ? "Listed by the doctor" : undefined}>
          {insurance.length > 0 ? (
            <>
              {insurance.map((i) => (
                <div key={i} className="flex items-center gap-2.5 py-[11px] border-t border-[#EEF2F7] text-[13.5px] font-extrabold">
                  <ShieldCheck className="w-4 h-4 text-[#067647] shrink-0" /> {i}
                </div>
              ))}
              <p className="mt-2 text-[11.5px] leading-normal text-[#5B667A]">
                Cashless or reimbursement claims go through {hospital?.name || "the hospital desk"}. Check your policy covers the visit.
              </p>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-[#5B667A]">
              No insurers listed yet. Ask {hospital?.name || "the hospital desk"} about cashless or reimbursement options.
            </p>
          )}
        </Card>
        <Card id="help" title="Questions before you book?">
          <p className="text-[13px] leading-relaxed text-[#5B667A]">The Care Assistant can help with booking, payments and finding the right specialist, and our support team is a message away.</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-extrabold text-[#2A4DD0]">
            <Link href="/ai" className="inline-flex items-center gap-1.5 hover:underline">
              <MessageCircleQuestion className="w-4 h-4" /> Ask the assistant
            </Link>
            <Link href={support} className="hover:underline">
              Contact support
            </Link>
          </div>
        </Card>
      </div>
    </>
  );

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen font-(family-name:--font-manrope) text-[#0B1B3F]">
      {account ? (
        <PhoneHeader backHref="/doctors" isSignedIn={account.isSignedIn} name={account.name} email={account.email} container="max-w-[900px] px-4 md:px-6" deskHidden>
          {hero}
        </PhoneHeader>
      ) : (
        <BlueHeader className="pb-[22px] md:pb-9 md:mt-4 lg:hidden" container="max-w-[900px] px-4 md:px-6">
          {hero}
        </BlueHeader>
      )}

      <main className={account ? "pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-11" : "pb-11"}>
        <div className={`max-w-[1340px] lg:px-9 lg:pt-7 ${account ? "" : "mx-auto"}`}>
          {account && (
            <Link href="/doctors" className="hidden lg:inline-flex items-center gap-1.5 mb-3.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline">
              <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Back to doctors
            </Link>
          )}

          {/* Desktops: the doctor in a card across the top. */}
          <section className={`hidden lg:flex items-center gap-6 mb-5 p-6 ${card}`}>
            {photo("w-[120px] h-[132px] rounded-[18px]", "text-[34px]")}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-extrabold text-[#2A4DD0]">{specialty}</p>
              <h1 className="flex items-center gap-2 mt-0.5 text-[30px] font-extrabold tracking-[-0.02em] leading-tight">
                <span className="truncate">{name}</span>
                <VerifiedBadge className="w-6 h-6" />
              </h1>
              {qualifications && <p className="mt-0.5 text-[14.5px] text-[#4A5878] truncate">{qualifications}</p>}
              <Dots items={[experience ? `${experience} yrs experience` : null, hospital ? [hospital.name, hospital.city].filter(Boolean).join(", ") : null, registration]} className="mt-2.5" />
            </div>
            <div className="shrink-0 flex gap-3">
              <DeskFact icon={Star} label="Patient rating" value={rating != null ? rating.toFixed(1) : "New"} note={reviewCount ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "No reviews yet"} />
              <DeskFact icon={CalendarDays} label="Open today" value={bookable ? String(openToday) : "—"} note={bookable ? (openToday === 1 ? "slot" : "slots") : "Booking not open"} />
            </div>
          </section>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start px-3 md:px-6 lg:px-0 pt-3.5 lg:pt-0 max-w-[900px] lg:max-w-none mx-auto">
            <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
              {booking}
              <div className="lg:hidden">{fees}</div>
              {details}
            </div>

            <aside className={`hidden lg:block sticky top-[96px] p-[22px] ${card}`}>
              <h2 className="text-[17px] font-extrabold">Booking summary</h2>
              <div className="mt-2.5">
                <InfoRow label="Doctor" value={name} />
                <InfoRow label="Time" value={selected ? formatSlot(selected.start, now) : "Not chosen yet"} valueClass={selected ? "" : "text-[#8A94A6]"} />
                <InfoRow label="Visit" value="In person" />
              </div>
              <div className="mt-2.5 px-3.5 py-1 rounded-[14px] bg-[#F6F8FC]">
                <div className="flex justify-between gap-3 py-2.5 border-b border-[#E6EBF3] text-[13.5px]">
                  <span>
                    <span className="block font-extrabold">Pay now online</span>
                    <span className="block text-[12px] text-[#5B667A]">Booking fee</span>
                  </span>
                  <span className="font-extrabold text-[#2A4DD0]">{formatINR(bookingFee)}</span>
                </div>
                <div className="flex justify-between gap-3 py-2.5 text-[13.5px]">
                  <span>
                    <span className="block font-extrabold">Pay at the hospital</span>
                    <span className="block text-[12px] text-[#5B667A]">Consultation fee, set by the hospital</span>
                  </span>
                  <span className="shrink-0 font-extrabold">{fee ? formatINR(fee) : "Not set"}</span>
                </div>
              </div>
              {account &&
                (bookable ? (
                  <Link href={bookHref} className={`${btnPrimary} w-full h-[50px]! text-[15px]! mt-4`}>
                    {selected ? `Book now · ${formatINR(bookingFee)}` : "Book a visit"}
                  </Link>
                ) : (
                  <Link href={otherDoctors} className={`${btnPrimary} w-full h-[50px]! text-[15px]! mt-4 bg-[#5B76DE]!`}>
                    See other doctors
                  </Link>
                ))}
              <p className="mt-2.5 text-[12px] leading-normal text-[#5B667A]">Only the booking fee is paid online. The consultation fee is paid at the hospital and never added to your booking total.</p>
            </aside>
          </div>
        </div>
      </main>

      {/* Phones: the fee and the next step, fixed at the bottom. */}
      {account && (
        <div className="lg:hidden fixed z-40 inset-x-0 bottom-0 flex items-center gap-3 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-white border-t border-[#E6EBF3] shadow-[0_-8px_20px_rgba(11,27,63,0.06)]">
          <span className="flex-1 min-w-0">
            <span className="block text-[17px] font-extrabold">{formatINR(bookingFee)}</span>
            <span className="block text-[11.5px] text-[#5B667A] truncate">{selected ? formatSlot(selected.start, now) : "Booking fee in app · consultation at hospital"}</span>
          </span>
          <Link
            href={bookable ? bookHref : otherDoctors}
            className={`shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] text-white text-[15px] font-extrabold ${bookable ? "bg-[#2A4DD0] shadow-[0_8px_16px_rgba(42,77,208,0.3)]" : "bg-[#5B76DE]"}`}
          >
            {bookable ? (selected ? "Book now" : "Book a visit") : "Other doctors"} <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
          </Link>
        </div>
      )}
    </div>
  );
}

function HeroFact({ label, value, note, border }: { label: string; value: string; note?: string; border?: boolean }) {
  return (
    <span className={`px-3 py-2.5 min-w-0 ${border ? "border-l border-white/18" : ""}`}>
      <span className="block text-[11px] font-bold text-[#CFDCFF] truncate">{label}</span>
      <span className="block text-[15px] font-extrabold truncate">{value}</span>
      {note && <span className="block text-[10.5px] text-[#CFDCFF] truncate">{note}</span>}
    </span>
  );
}

function DeskFact({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note: string }) {
  return (
    <span className="w-[140px] p-3.5 rounded-[14px] bg-[#F6F8FC]">
      <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#5B667A]">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className="block mt-1 text-[24px] font-extrabold leading-none">{value}</span>
      <span className="block mt-1 text-[11.5px] text-[#5B667A] truncate">{note}</span>
    </span>
  );
}

function Card({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 ${sectionCard}`}>
      <h2 id={`${id}-title`} className="text-[16px] font-extrabold">{title}</h2>
      {sub ? <p className="mt-1 mb-3 text-[12.5px] text-[#5B667A]">{sub}</p> : <div className="mb-2.5" />}
      {children}
    </section>
  );
}

function Times({ title, icon: Icon, slots, selectedId, onPick }: { title: string; icon: LucideIcon; slots: Slot[]; selectedId: string | null; onPick: (id: string) => void }) {
  if (slots.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[#5B667A]">
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-extrabold tracking-[0.04em] uppercase">
          {title} · {slots.length} open
        </span>
      </div>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {slots.map((s) => {
          const on = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(s.id)}
              className={`min-h-10 px-2 rounded-[10px] border-[1.5px] text-[13px] font-extrabold transition-colors ${
                on ? "border-[#2A4DD0] bg-[#2A4DD0] text-white" : "border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9CBFF]"
              }`}
            >
              {formatTime(s.start)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
