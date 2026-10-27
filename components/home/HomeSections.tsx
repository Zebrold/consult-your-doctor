"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, ChevronRight, CircleCheck, MapPin, Star } from "lucide-react";
import { HomePhoneMockup } from "@/components/HomePhoneMockup";
import { NearbyNote } from "@/components/patient/Nearby";
import { doctorName, formatSlot, initials } from "@/components/patient/format";
import type { usePatientLocation } from "@/components/patient/location";
import { formatDistance } from "@/lib/geo";
import { SPECIALITIES, specialityIcon } from "./specialities";
import { CarouselArrows, VerifiedBadge, scrollRow } from "./ui";
import type { HomeDoctor, HomeHospital } from "./types";

type Place = ReturnType<typeof usePatientLocation>;
type Near<T> = { item: T; km: number | null };

const SIDES = "px-4 md:px-[max(24px,10%)]";
const ROW = `flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar ${SIDES} scroll-px-4 md:scroll-px-[max(24px,10%)]`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Phones scroll two rows sideways; wider screens show every speciality in a grid. */
export function SpecialitiesSection() {
  const row = useRef<HTMLDivElement>(null);
  return (
    <section aria-labelledby="specs-title" className={`${SIDES} pt-[26px] pb-8 md:pt-12 md:pb-14`}>
      <div className="flex items-center justify-between gap-2.5 mb-4 md:mb-6">
        <h2 id="specs-title" className="text-[17px] md:text-[22px] font-extrabold tracking-[-0.02em]">Book top specialities near you</h2>
        <CarouselArrows label="specialities" className="md:hidden" onScroll={(d) => scrollRow(row.current, d)} />
      </div>
      <div
        ref={row}
        className="grid grid-flow-col grid-rows-[repeat(2,auto)] auto-cols-[72px] gap-x-1 gap-y-3.5 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 pb-1.5 scroll-px-4 md:mx-0 md:px-0 md:pb-0 md:overflow-visible md:grid-flow-row md:grid-rows-none md:auto-cols-auto md:grid-cols-5 xl:grid-cols-10 md:gap-x-4 md:gap-y-[22px]"
      >
        {SPECIALITIES.map((s) => (
          <Link key={s.slug} href={`/specialities/${s.slug}`} className="group snap-start flex flex-col items-center gap-1.5 md:gap-2.5 text-center">
            <span className="w-14 h-14 md:w-full md:h-auto md:max-w-[92px] md:aspect-square rounded-full bg-[linear-gradient(160deg,#F2F6FF_0%,#DCE7FF_100%)] shadow-[inset_0_0_0_1px_#D6E2FB] flex items-center justify-center group-hover:shadow-[inset_0_0_0_2px_#A9CBFF] transition-shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={specialityIcon(s)} alt="" className="w-9 h-9 md:w-[65%] md:h-[65%] group-hover:scale-105 transition-transform" />
            </span>
            <span className="max-w-full text-[11px] md:text-sm font-bold leading-[1.25] tracking-[-0.02em] md:tracking-normal group-hover:text-[#2A4DD0] transition-colors">
              <span className="md:hidden">{s.short ?? s.name}</span>
              <span className="hidden md:inline">{s.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function hospitalTags(h: HomeHospital) {
  const names = h.specialties.map((s) => s.name);
  if (names.length >= 3) return `Multi-speciality · ${names.length} specialities`;
  return names.join(" · ") || "Hospital";
}

/** A partner hospital: photo with its name and rating, what it offers, where it is, and the way in. */
function HospitalCard({ hospital: h, km }: { hospital: HomeHospital; km: number | null }) {
  const href = `/hospitals/${h.id}`;
  const features = [h.doctors > 0 ? plural(h.doctors, "doctor") : null, h.facility].filter(Boolean) as string[];
  return (
    <article className="shrink-0 snap-start w-[240px] md:w-[290px] rounded-2xl md:rounded-[18px] bg-white overflow-hidden shadow-[0_0_0_1px_#E6EBF3,0_10px_22px_rgba(11,27,63,0.07)] flex flex-col">
      <Link href={href} className="relative block h-[124px] md:h-40 overflow-hidden bg-[linear-gradient(160deg,#F2F6FF_0%,#DCE7FF_100%)]">
        {h.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={h.image} alt={`Exterior of ${h.name}`} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center pb-8 text-[#2A4DD0]">
            <Building2 className="w-12 h-12" strokeWidth={1.6} />
          </span>
        )}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,20,51,0)_40%,rgba(8,20,51,0.85)_100%)]" />
        <span className="absolute left-3 right-3 bottom-2.5 md:left-4 md:right-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 min-w-0 text-white text-[15px] md:text-[17px] font-extrabold tracking-[-0.01em] leading-[1.15]">
            <span className="truncate">{h.name}</span>
            <VerifiedBadge className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </h3>
          {h.rating != null && (
            <span
              aria-label={`Rated ${h.rating.toFixed(1)} out of 5 by ${plural(h.reviewCount, "patient")}`}
              className="shrink-0 flex items-center gap-1 px-2 py-[3px] rounded-full border border-white/70 bg-[rgba(8,20,51,0.45)] text-white text-[10.5px] md:text-xs font-extrabold"
            >
              {h.rating.toFixed(1)}
              <Star className="w-[11px] h-[11px] fill-white" strokeWidth={0} />
            </span>
          )}
        </span>
      </Link>
      <div className="p-3 md:p-4 flex flex-col gap-[7px] md:gap-2 flex-1">
        <div className="flex justify-between gap-2 text-[11.5px] md:text-[13px] leading-[1.35] text-[#4A5878]">
          <span className="min-w-0 truncate">{hospitalTags(h)}</span>
          {h.open247 && <span className="shrink-0 font-extrabold text-[#2A4DD0]">24/7</span>}
        </div>
        <div className="flex justify-between gap-2 -mt-[3px] text-[11.5px] md:text-[13px] text-[#4A5878]">
          <span className="flex items-center gap-[5px] min-w-0">
            <MapPin className="w-3 h-3 shrink-0 text-[#7A8599]" strokeWidth={2.2} />
            <span className="truncate">{h.address || h.city || "Partner hospital"}</span>
          </span>
          {km != null && <span className="shrink-0">{formatDistance(km)}</span>}
        </div>
        {features.length > 0 && (
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
            {features.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 max-w-full text-[10.5px] md:text-[11.5px] font-bold text-[#4A5878]">
                <span aria-hidden className="w-1 h-1 rounded-full bg-[#9AA4B5] shrink-0" />
                <span className="truncate">{f}</span>
              </span>
            ))}
          </div>
        )}
        <Link href={href} className="self-start mt-auto pt-0.5 inline-flex items-center gap-2 text-[12.5px] md:text-sm font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
          Book consultation <ArrowRight className="w-[15px] h-[15px]" strokeWidth={2.4} />
        </Link>
      </div>
    </article>
  );
}

export function HospitalsSection({ hospitals, place }: { hospitals: Near<HomeHospital>[]; place: Place }) {
  const row = useRef<HTMLDivElement>(null);
  return (
    <section aria-labelledby="hosp-title" className="bg-[#F6F8FC] border-t border-[#EEF2F7] pt-[26px] pb-7 md:pt-12 md:pb-14">
      <div className={`${SIDES} flex items-center justify-between gap-2.5 md:gap-4`}>
        <h2 id="hosp-title" className="text-[17px] md:text-[28px] leading-[1.25] md:leading-[1.15] font-extrabold tracking-[-0.02em]">
          Discover the best <span className="text-[#2A4DD0]">hospitals {place.location ? "near you" : "in your city"}</span>
        </h2>
        {hospitals.length > 1 && <CarouselArrows label="hospitals" onScroll={(d) => scrollRow(row.current, d)} />}
      </div>
      {hospitals.length === 0 ? (
        <div className={`${SIDES} mt-4`}>
          <NearbyNote place={place} count={0} noun="hospitals" />
        </div>
      ) : (
        <div ref={row} className={`${ROW} gap-3 md:gap-5 mt-3.5 md:mt-6 pt-1 pb-3 md:pb-3.5`}>
          {hospitals.map(({ item, km }) => (
            <HospitalCard key={item.id} hospital={item} km={km} />
          ))}
        </div>
      )}
    </section>
  );
}

/** A bookable doctor: photo, name, rating, specialty, degrees, hospital, next open slot and Consult Now. */
function DoctorCard({ doctor: d, km, now }: { doctor: HomeDoctor; km: number | null; now: number }) {
  const profile = `/doctors/${d.id}`;
  const details = [d.qualifications, d.experience ? `${d.experience}+ years exp.` : null].filter(Boolean).join(" · ");
  const rated = d.reviewCount > 0 && d.rating != null;
  return (
    <article className="shrink-0 snap-start w-[272px] md:w-[372px] box-border p-[11px] md:p-4 rounded-2xl md:rounded-[18px] bg-white shadow-[0_0_0_1px_#E6EBF3,0_8px_20px_rgba(11,27,63,0.06)] flex flex-col gap-2.5 md:gap-3.5">
      <div className="flex gap-2.5 md:gap-3.5 items-stretch">
        <Link
          href={profile}
          tabIndex={-1}
          aria-hidden
          className="shrink-0 w-[70px] h-[84px] md:w-[104px] md:h-[118px] rounded-xl md:rounded-[14px] overflow-hidden bg-[linear-gradient(160deg,#F2F6FF_0%,#DCE7FF_100%)] flex items-center justify-center text-[#2A4DD0] text-xl md:text-3xl font-extrabold"
        >
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
          ) : (
            initials(d.name)
          )}
        </Link>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:gap-[3px]">
          <div className="flex items-start justify-between gap-1.5 md:gap-2">
            <h3 className="min-w-0 flex items-center gap-1 md:gap-1.5 text-[13.5px] md:text-base font-extrabold tracking-[-0.01em] leading-[1.25]">
              <Link href={profile} className="truncate hover:text-[#2A4DD0] transition-colors">{doctorName(d.name)}</Link>
              <VerifiedBadge className="w-[13px] h-[13px] md:w-4 md:h-4" />
            </h3>
            {rated && (
              <span
                aria-label={`Rated ${d.rating!.toFixed(1)} out of 5 by ${plural(d.reviewCount, "patient")}`}
                className="shrink-0 flex items-center gap-[3px] md:gap-1 px-1.5 md:px-2 py-0.5 md:py-[3px] rounded-[7px] md:rounded-lg bg-[#EAF7F0] text-[10.5px] md:text-[12.5px] font-extrabold"
              >
                <Star className="w-2.5 h-2.5 md:w-[11px] md:h-[11px] fill-[#0B1B3F]" strokeWidth={0} />
                {d.rating!.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm font-bold text-[#2A4DD0] truncate">{d.specialty || "Specialist"}</p>
          {details && <p className="text-[10.5px] md:text-[12.5px] text-[#5B667A] truncate">{details}</p>}
          <p className="mt-auto flex items-center justify-between gap-1.5 text-[10.5px] md:text-[12.5px] text-[#4A5878]">
            <span className="flex items-center gap-1 md:gap-[5px] min-w-0">
              <MapPin className="w-[11px] h-[11px] md:w-3 md:h-3 shrink-0 fill-[#5B667A] text-white" strokeWidth={1.5} />
              <span className="truncate">{d.hospital || d.city || "Partner hospital"}</span>
            </span>
            {km != null && <span className="shrink-0">{formatDistance(km)}</span>}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:gap-2.5 items-stretch">
        <div className="min-w-0 flex items-center gap-[7px] md:gap-2 h-9 md:h-auto px-[9px] md:px-2.5 md:py-1.5 rounded-[10px] md:rounded-xl bg-[#F4F6FA]">
          <CalendarDays className="w-[15px] h-[15px] md:w-[18px] md:h-[18px] shrink-0 text-[#4A5878]" strokeWidth={2} />
          <span className="min-w-0 text-[10.5px] md:text-[12.5px] leading-[1.25] md:leading-[1.3] text-[#4A5878]">
            <span className="block font-bold text-[#27324A]">Next available</span>
            <span className="block truncate">{d.nextSlot ? formatSlot(d.nextSlot, now) : "No open slots yet"}</span>
          </span>
        </div>
        <Link
          href={`/book/${d.id}`}
          className="flex items-center justify-center gap-[5px] md:gap-1.5 h-9 md:h-auto md:min-h-[42px] px-3 md:px-3.5 rounded-[10px] md:rounded-xl bg-[#2A4DD0] text-white text-xs md:text-sm font-extrabold whitespace-nowrap shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#1F3FB8] transition-colors"
        >
          Consult Now <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" strokeWidth={2.8} />
        </Link>
      </div>
    </article>
  );
}

export function DoctorsSection({ doctors, place, now, findHref }: { doctors: Near<HomeDoctor>[]; place: Place; now: number; findHref: string }) {
  const row = useRef<HTMLDivElement>(null);
  return (
    <section aria-labelledby="docs-title" className="bg-white pt-[26px] pb-7 md:pt-12 md:pb-14">
      <div className={`${SIDES} flex items-center justify-between gap-2.5 md:gap-4`}>
        <h2 id="docs-title" className="text-[17px] md:text-[28px] leading-[1.25] md:leading-[1.15] font-extrabold tracking-[-0.02em]">
          Top <span className="text-[#2A4DD0]">doctors</span> near you
        </h2>
        <div className="flex items-center gap-2.5">
          <Link href={findHref} className="hidden md:flex items-center gap-1 mr-2 text-base font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            View All <ChevronRight className="w-4 h-4" strokeWidth={2.6} />
          </Link>
          {doctors.length > 1 && <CarouselArrows label="doctors" onScroll={(d) => scrollRow(row.current, d)} />}
        </div>
      </div>
      {doctors.length === 0 ? (
        <div className={`${SIDES} mt-4`}>
          <NearbyNote place={place} count={0} noun="doctors" />
        </div>
      ) : (
        <div ref={row} className={`${ROW} gap-3 md:gap-5 mt-3.5 md:mt-6 pt-1 pb-2.5 md:pb-3.5`}>
          {doctors.map(({ item, km }) => (
            <DoctorCard key={item.id} doctor={item} km={km} now={now} />
          ))}
        </div>
      )}
      <Link href={findHref} className="md:hidden flex items-center justify-center gap-1 mt-1.5 mx-4 py-2 text-sm font-extrabold text-[#2A4DD0]">
        View all doctors <ChevronRight className="w-4 h-4" strokeWidth={2.6} />
      </Link>
    </section>
  );
}

const CONDITION_GROUPS = [
  { short: "Acute & general", title: "Acute and general", items: ["Cough, Cold & Flu", "Urinary Tract Infections", "Food Poisoning & GI", "Sinusitis & Rhinitis", "Ear Infections (Otitis)", "Fever Management"] },
  { short: "Skin & allergies", title: "Skin and allergies", items: ["Rash, Eczema & Psoriasis", "Severe Acne & Rosacea", "Bug Bites & Cellulitis", "Hives & Contact Allergies", "Cold Sores & Shingles", "Fungal Skin Infections"] },
  { short: "Long-term care", title: "Long-term care", items: ["Asthma & Inhaler Refills", "Acid Reflux & GERD", "Hypertension Follow-Up", "Lab Orders & Blood Tests", "Men's & Women's Health", "Mental Health & Sleep"] },
];

function ConditionList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 py-2.5 md:py-[9px] text-[15px] md:text-[17px] text-[#27324A]">
          <CircleCheck className="w-5 h-5 md:w-[22px] md:h-[22px] shrink-0 text-[#2A4DD0]" strokeWidth={2} />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** What we treat: the app preview beside the conditions, as tabs on phones and three columns on wider screens. */
export function TreatSection({ bookingFee }: { bookingFee: number }) {
  const [tab, setTab] = useState(0);
  const group = CONDITION_GROUPS[tab];
  return (
    <section
      aria-labelledby="treat-title"
      className={`${SIDES} border-t border-[#EEF2F7] pt-8 pb-10 md:pt-[72px] md:pb-24 md:flex md:flex-wrap md:items-center md:gap-x-[72px] md:gap-y-14`}
    >
      <div className="hidden md:flex flex-[0_1_360px] justify-center min-w-[260px]">
        <HomePhoneMockup bookingFee={bookingFee} size="max-w-[300px]" />
      </div>
      <div className="md:flex-[1_1_560px] min-w-0">
        <p className="text-sm md:text-[17px] font-bold text-[#2A4DD0]">What we treat</p>
        <h2 id="treat-title" className="mt-2 md:mt-3.5 text-[26px] md:text-[46px] leading-[1.15] md:leading-[1.1] font-extrabold tracking-[-0.025em] md:tracking-[-0.03em]">
          Care for everyday and long-term conditions
        </h2>
        <p className="mt-3 md:mt-5 max-w-[760px] text-[14.5px] md:text-lg leading-[1.6] md:leading-[1.65] text-[#4A5878]">
          Book a specialist for anything from a fever to a follow-up for blood pressure. Your prescriptions and lab reports are saved to your account, ready to download or show at the pharmacy.
        </p>

        {/* Phones */}
        <div className="md:hidden">
          <div className="flex justify-center mt-6 mb-2">
            <HomePhoneMockup bookingFee={bookingFee} size="max-w-[230px]" />
          </div>
          <div role="tablist" aria-label="Condition groups" className="flex gap-1.5 p-1 rounded-[14px] bg-[#F1F4F9]">
            {CONDITION_GROUPS.map((g, i) => (
              <button
                key={g.title}
                type="button"
                role="tab"
                id={`treat-tab-${i}`}
                aria-selected={i === tab}
                aria-controls="treat-panel"
                onClick={() => setTab(i)}
                className={`flex-1 min-h-10 px-1.5 rounded-[10px] text-[12.5px] font-extrabold transition-colors ${
                  i === tab ? "bg-white text-[#2A4DD0] shadow-[0_1px_3px_rgba(11,27,63,0.14)]" : "text-[#5B667A]"
                }`}
              >
                {g.short}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="treat-panel" aria-labelledby={`treat-tab-${tab}`}>
            <h3 className="mt-5 mb-1 pb-2.5 border-b border-[#DDE3EC] text-base font-extrabold">{group.title}</h3>
            <ConditionList items={group.items} />
          </div>
        </div>

        {/* Tablets and desktops */}
        <div className="hidden md:flex flex-wrap gap-x-9 gap-y-8 mt-10">
          {CONDITION_GROUPS.map((g) => (
            <div key={g.title} className="flex-[1_1_196px] min-w-0">
              <h3 className="mb-2.5 pb-3.5 border-b border-[#DDE3EC] text-lg font-extrabold">{g.title}</h3>
              <ConditionList items={g.items} />
            </div>
          ))}
        </div>

        <Link
          href="/what-we-treat"
          className="mt-5 md:mt-9 flex md:inline-flex items-center justify-center gap-2 md:gap-2.5 min-h-12 md:min-h-0 rounded-[14px] md:rounded-none border-[1.5px] md:border-0 border-[#2A4DD0] text-[15px] md:text-lg font-extrabold text-[#2A4DD0] hover:underline underline-offset-4"
        >
          See everything we treat <ArrowRight className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={2.4} />
        </Link>
      </div>
    </section>
  );
}
