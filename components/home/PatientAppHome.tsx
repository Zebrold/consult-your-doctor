"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight, FileText, FlaskConical, Hospital, MapPin, Search, Stethoscope, UserRound } from "lucide-react";
import { PhoneHeader } from "@/components/patient/PhoneHeader";
import { LocationSheet } from "@/components/patient/LocationSheet";
import { nearbyOnly, usePatientLocation } from "@/components/patient/location";
import { AppSearch, PageBody, SectionHead, StatusDot, btnOutline, btnPrimary, card } from "@/components/patient/app-ui";
import { HospitalGridCard, HospitalListCard } from "@/components/patient/HospitalCards";
import { IST, directionsHref, doctorName, firstName, formatTime, initials } from "@/components/patient/format";
import { SPECIALITIES, specialityIcon } from "./specialities";
import { VerifiedBadge } from "./ui";
import type { HomeHospital } from "./types";

export type PatientVisit = {
  id: string;
  status: string;
  at: string;
  doctor: string | null;
  doctorImage: string | null;
  specialty: string | null;
  hospital: string | null;
  address: string | null;
  city: string | null;
  token: string;
};

export type PatientRecord = { id: string; title: string; sub: string; href: string };

type Props = {
  greeting: string;
  name: string | null;
  isSignedIn: boolean;
  hospitals: HomeHospital[];
  cities: string[];
  next: PatientVisit | null;
  vitals: { label: string; value: string }[];
  vitalsAt: string | null;
  records: PatientRecord[];
};

const month = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: IST, month: "short" }).toUpperCase();
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: IST, day: "numeric" });
const weekday = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });

/** A signed-in patient's home: greeting, search, specialities, their next visit and partner hospitals near them. */
export function PatientAppHome({ greeting, name, isSignedIn, hospitals, cities, next, vitals, vitalsAt, records }: Props) {
  const place = usePatientLocation();
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  const near = nearbyOnly(hospitals, place.location).slice(0, 6);
  const where = place.location?.label;
  const nearSub = where ? `Nearest to ${where}` : "Verified partner hospitals";

  return (
    <>
      <div className="lg:hidden">
        <PhoneHeader isSignedIn={isSignedIn} name={name} eyebrow={`${greeting},`} title={name || "Welcome"} container="max-w-[900px] px-4 md:px-6">
          <div className="-mt-2 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-haspopup="dialog"
              className="self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/30 bg-white/[0.12] text-[13px] font-bold active:scale-95 transition-transform"
            >
              <MapPin className="w-[15px] h-[15px]" />
              <span className="max-w-[200px] truncate">{where || "Set your location"}</span>
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.6} />
            </button>
            <AppSearch />
          </div>
        </PhoneHeader>
      </div>

      <PageBody>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start">
          <div className="min-w-0">
            <DeskHero greeting={greeting} name={name} />
            <QuickActions />

            <section aria-labelledby="specialities-title" className="pt-6 px-4 md:px-6 lg:p-0 lg:mb-[26px]">
              <SectionHead
                id="specialities-title"
                title="Specialities"
                sub={<span className="hidden lg:inline">{where ? `Consult verified specialists near ${where}` : "Consult verified specialists"}</span>}
                href="/find"
                link="See all"
              />
              <PhoneSpecialities />
              <div className="hidden lg:grid grid-cols-4 gap-3">
                {SPECIALITIES.slice(0, 8).map((s) => (
                  <Link key={s.slug} href={`/specialities/${s.slug}`} className={`flex items-center gap-3 px-3.5 py-3 ${card} rounded-[14px]! text-[13.5px] font-extrabold hover:shadow-[0_0_0_1.5px_#2A4DD0] transition-shadow`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={specialityIcon(s)} alt="" className="shrink-0 w-10 h-10" />
                    <span className="min-w-0 leading-tight">{s.name}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="pt-5 px-4 md:px-6 lg:hidden">
              <NextVisitStrip next={next} />
            </section>

            <section aria-labelledby="hospitals-title" className="pt-[26px] px-4 md:px-6 lg:p-0">
              <SectionHead id="hospitals-title" title="Top hospitals near you" sub={nearSub} href="/hospitals" />
              {near.length === 0 ? (
                <div className={`${card} p-5 text-[13.5px] text-[#4A5878] leading-relaxed`}>
                  No partner hospital lists {where ? `in ${where}` : "here"} yet.{" "}
                  <button type="button" onClick={() => setSheet(true)} className="font-extrabold text-[#2A4DD0] hover:underline">
                    Change location
                  </button>{" "}
                  or browse{" "}
                  <Link href="/hospitals" className="font-extrabold text-[#2A4DD0] hover:underline">
                    all hospitals
                  </Link>
                  .
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:grid md:grid-cols-2 gap-3.5 lg:hidden">
                    {near.slice(0, 4).map(({ item, km }) => (
                      <HospitalListCard key={item.id} hospital={item} km={km} />
                    ))}
                  </div>
                  <div className="hidden lg:grid grid-cols-3 gap-4">
                    {near.slice(0, 3).map(({ item, km }) => (
                      <HospitalGridCard key={item.id} hospital={item} km={km} />
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="hidden lg:flex flex-col gap-4">
            <NextAppointmentCard next={next} />
            {vitals.length > 0 && (
              <div className={`${card} p-[22px]`}>
                <SectionHead title="Health summary" sub={vitalsAt ? `From your visit on ${vitalsAt}` : "From your last visit"} />
                <div className="grid grid-cols-2 gap-x-4">
                  {vitals.slice(0, 6).map((v) => (
                    <div key={v.label} className="py-2.5 border-t border-[#EEF2F7]">
                      <span className="block text-[12px] font-bold text-[#5B667A]">{v.label}</span>
                      <span className="block text-[16px] font-extrabold">{v.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className={`${card} p-[22px]`}>
              <SectionHead title="Recent reports" href="/patient/profile#records" link="All" />
              {records.length === 0 ? (
                <p className="py-3 border-t border-[#EEF2F7] text-[13px] text-[#5B667A] leading-relaxed">
                  Prescriptions from your doctors and reports from your labs appear here after your visits.
                </p>
              ) : (
                records.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                    <FileText className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-extrabold truncate capitalize">{r.title}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">{r.sub}</span>
                    </span>
                    <Link href={r.href} className="shrink-0 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                      View
                    </Link>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </PageBody>

      {sheet && <LocationSheet place={place} cities={cities} onClose={closeSheet} />}
    </>
  );
}

function DeskHero({ greeting, name }: { greeting: string; name: string | null }) {
  return (
    <div className="hidden lg:flex relative overflow-hidden items-center min-h-[212px] px-[34px] py-[30px] mb-5 rounded-[20px] bg-[#2A4DD0] text-white">
      <div className="relative z-[1] max-w-[460px]">
        <p className="text-[14px] font-bold text-[#CFDCFF]">
          {greeting}
          {name ? `, ${firstName(name)}` : ""}
        </p>
        <h1 className="mt-1.5 text-[30px] font-extrabold tracking-[-0.02em] leading-[1.15]">Healthcare made simple, for everyone.</h1>
        <p className="mt-2 text-[14.5px] leading-normal text-[#E3EAFF]">Book verified doctors, hospitals and lab tests near you.</p>
        <div className="flex gap-2.5 mt-[18px]">
          <Link href="/find" className="inline-flex items-center gap-2 h-[42px] px-4 rounded-[11px] bg-white text-[#2A4DD0] text-[13.5px] font-extrabold hover:bg-white/90 transition-colors">
            <Search className="w-4 h-4" strokeWidth={2.2} /> Find a doctor
          </Link>
          <Link href="/diagnostics" className="inline-flex items-center h-[42px] px-4 rounded-[11px] border border-white/45 text-[13.5px] font-extrabold hover:bg-white/10 transition-colors">
            Book a lab test
          </Link>
        </div>
      </div>
      <Image
        src="/images/home/doctor.webp"
        alt=""
        width={320}
        height={320}
        sizes="240px"
        className="absolute right-[18px] bottom-0 h-[236px] w-auto object-contain [mask-image:linear-gradient(to_bottom,#000_80%,transparent)]"
      />
    </div>
  );
}

const QUICK = [
  { href: "/find", title: "Book a doctor", sub: "In-clinic consultation", icon: Stethoscope },
  { href: "/diagnostics", title: "Lab tests", sub: "Verified partner labs", icon: FlaskConical },
  { href: "/hospitals", title: "Hospitals", sub: "Verified partners near you", icon: Hospital },
  { href: "/patient/profile#records", title: "My records", sub: "Prescriptions & reports", icon: FileText },
];

function QuickActions() {
  return (
    <div className="hidden lg:grid grid-cols-2 2xl:grid-cols-4 gap-3.5 mb-[26px]">
      {QUICK.map(({ href, title, sub, icon: Icon }) => (
        <Link key={href} href={href} className={`group flex items-center gap-3.5 px-[18px] py-4 ${card} hover:shadow-[0_0_0_1.5px_#2A4DD0] transition-shadow`}>
          <span className="shrink-0 w-11 h-11 rounded-xl shadow-[inset_0_0_0_1.5px_#D6DDE8] flex items-center justify-center text-[#2A4DD0]">
            <Icon className="w-[21px] h-[21px]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14.5px] font-extrabold">{title}</span>
            <span className="block text-[12.5px] text-[#5B667A] truncate">{sub}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#9AA4B5] shrink-0 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.4} />
        </Link>
      ))}
    </div>
  );
}

/** The phone's scrolling row: All, then every speciality. */
function PhoneSpecialities() {
  return (
    <div className="lg:hidden flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6 pt-1 pb-1.5">
      <Link href="/find" className="shrink-0 w-16 flex flex-col items-center gap-1.5 text-center text-[11px] font-bold leading-tight text-[#2A4DD0]">
        <span className="w-14 h-14 rounded-[18px] bg-[#2A4DD0] flex items-center justify-center shadow-[0_8px_16px_rgba(42,77,208,0.3)]">
          <Stethoscope className="w-[26px] h-[26px] text-white" />
        </span>
        All
      </Link>
      {SPECIALITIES.map((s) => (
        <Link key={s.slug} href={`/specialities/${s.slug}`} className="shrink-0 w-16 flex flex-col items-center gap-1.5 text-center text-[11px] font-bold leading-tight text-[#27324A]">
          <span className="w-14 h-14 rounded-[18px] bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)] shadow-[inset_0_0_0_1px_#D6E2FB] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={specialityIcon(s)} alt="" className="w-9 h-9" />
          </span>
          {s.short ?? s.name}
        </Link>
      ))}
    </div>
  );
}

const visitHref = (v: PatientVisit) => (v.status === "pending_payment" ? `/patient/checkout/${v.id}` : `/book/confirmation/${v.id}`);

/** The phone's next-visit strip: the date, the doctor, the time and hospital. */
function NextVisitStrip({ next }: { next: PatientVisit | null }) {
  if (!next) {
    return (
      <Link href="/find" className={`flex items-center gap-3 p-3.5 ${card}`}>
        <span className="shrink-0 w-[46px] h-[46px] rounded-xl shadow-[inset_0_0_0_1px_#E1E7F0] flex items-center justify-center text-[#2A4DD0]">
          <CalendarDays className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14.5px] font-extrabold">No visits booked</span>
          <span className="block text-[12px] text-[#5B667A]">Find a doctor near you and pick a time</span>
        </span>
        <ChevronRight className="w-[18px] h-[18px] text-[#9AA4B5] shrink-0" strokeWidth={2.4} />
      </Link>
    );
  }
  const unpaid = next.status === "pending_payment";
  return (
    <Link href={visitHref(next)} className={`flex items-center gap-3 p-3.5 ${card}`}>
      <span className="shrink-0 w-[46px] h-[46px] rounded-xl shadow-[inset_0_0_0_1px_#E1E7F0] flex flex-col items-center justify-center leading-none">
        <span className="text-[10px] font-extrabold text-[#2A4DD0]">{month(next.at)}</span>
        <span className="text-[17px] font-extrabold">{day(next.at)}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[11.5px] font-bold ${unpaid ? "text-[#B54708]" : "text-[#5B667A]"}`}>
          {unpaid ? "Awaiting payment · pay to confirm" : `Your next visit · Token ${next.token}`}
        </span>
        <span className="flex items-center gap-[5px] text-[14.5px] font-extrabold min-w-0">
          <span className="truncate">{doctorName(next.doctor)}</span>
          <VerifiedBadge className="w-3.5 h-3.5" />
          {next.specialty && <span className="truncate font-extrabold">· {next.specialty}</span>}
        </span>
        <span className="block text-[12px] text-[#5B667A] truncate">{[formatTime(next.at), next.hospital].filter(Boolean).join(" · ")}</span>
      </span>
      <ChevronRight className="w-[18px] h-[18px] text-[#9AA4B5] shrink-0" strokeWidth={2.4} />
    </Link>
  );
}

/** The desktop's next-appointment card: the doctor, date, time and token, with directions and the pass. */
function NextAppointmentCard({ next }: { next: PatientVisit | null }) {
  if (!next) {
    return (
      <div className={`${card} p-[22px]`}>
        <SectionHead title="Next appointment" />
        <p className="text-[13.5px] text-[#5B667A] leading-relaxed">You have no visits booked. Pick a doctor and an open time to book one.</p>
        <Link href="/find" className={`${btnPrimary} w-full mt-4`}>
          Find a doctor
        </Link>
      </div>
    );
  }
  const unpaid = next.status === "pending_payment";
  const directions = directionsHref(next.hospital, next.address, next.city);
  return (
    <div className={`${card} p-[22px]`}>
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">Next appointment</h2>
        {unpaid ? <StatusDot label="Awaiting payment" color="#B54708" /> : <StatusDot label="Confirmed" color="#067647" />}
      </div>
      <div className="flex items-center gap-3">
        {next.doctorImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={next.doctorImage} alt="" className="w-[50px] h-[50px] rounded-xl object-cover object-top bg-[#EEF1F5]" />
        ) : (
          <span className="w-[50px] h-[50px] rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[15px] font-extrabold">{initials(next.doctor) || <UserRound className="w-5 h-5" />}</span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-[5px] text-[15px] font-extrabold">
            <span className="truncate">{doctorName(next.doctor)}</span>
            <VerifiedBadge className="w-3.5 h-3.5" />
          </span>
          <span className="block text-[12.5px] text-[#5B667A] truncate">{[next.specialty, next.hospital].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_0.7fr] mt-3.5 border-y border-[#EEF2F7]">
        <span className="py-2.5">
          <span className="block text-[11.5px] font-bold text-[#5B667A]">Date</span>
          <span className="block text-[14px] font-extrabold">{weekday(next.at)}</span>
        </span>
        <span className="py-2.5 pl-3 border-l border-[#EEF2F7]">
          <span className="block text-[11.5px] font-bold text-[#5B667A]">Time</span>
          <span className="block text-[14px] font-extrabold">{formatTime(next.at)}</span>
        </span>
        <span className="py-2.5 pl-3 border-l border-[#EEF2F7]">
          <span className="block text-[11.5px] font-bold text-[#5B667A]">Token</span>
          <span className="block text-[14px] font-extrabold">{unpaid ? "—" : next.token}</span>
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1.3fr] gap-2 mt-3.5">
        {directions ? (
          <a href={directions} target="_blank" rel="noreferrer" className={btnOutline}>
            Directions
          </a>
        ) : (
          <Link href="/patient/appointments" className={btnOutline}>
            All bookings
          </Link>
        )}
        <Link href={visitHref(next)} className={btnPrimary}>
          {unpaid ? "Pay booking fee" : "Show at hospital"}
        </Link>
      </div>
    </div>
  );
}
