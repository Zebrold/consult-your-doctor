"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, ChevronDown, MapPin, Search } from "lucide-react";
import { byNearness, usePatientLocation } from "@/components/patient/location";
import { LocationSheet } from "@/components/patient/LocationSheet";
import { formatDistance } from "@/lib/geo";
import { specialityIcon, type SpecialityInfo } from "./specialities";
import { AppBanner, VerifiedBadge } from "./ui";
import type { HomeHospital } from "./types";

export type SpecialityHospital = HomeHospital & {
  /** Doctors at the hospital listed under this speciality. */
  specialityDoctors: number;
  /** The names they are listed under, e.g. "Cardiology". */
  matched: string[];
};

type Sort = "near" | "rating" | "doctors";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * One speciality's partner hospitals: a blue header with the speciality's illustration, what it covers, sort and
 * filter chips, and the hospitals as tiles. Nearest first once the visitor sets a location.
 */
export function SpecialityHospitals({
  speciality: s,
  hospitals,
  cities,
  findHref,
  doctorCount,
}: {
  speciality: SpecialityInfo;
  hospitals: SpecialityHospital[];
  cities: string[];
  /** The doctors list filtered to this speciality. */
  findHref: string;
  doctorCount: number;
}) {
  const place = usePatientLocation();
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  const [chosenSort, setSort] = useState<Sort | null>(null);
  const [allDay, setAllDay] = useState(false);
  const sort: Sort = chosenSort ?? (place.location ? "near" : "doctors");

  const shown = useMemo(() => {
    const rows = byNearness(allDay ? hospitals.filter((h) => h.open247) : hospitals, place.location);
    if (sort === "rating") rows.sort((a, b) => (b.item.rating ?? 0) - (a.item.rating ?? 0) || b.item.reviewCount - a.item.reviewCount);
    if (sort === "doctors") rows.sort((a, b) => b.item.specialityDoctors - a.item.specialityDoctors);
    return rows;
  }, [hospitals, place.location, sort, allDay]);

  const chooseNear = () => {
    setSort("near");
    if (!place.location) setSheet(true);
  };

  return (
    <main className="font-(family-name:--font-manrope) text-[#0B1B3F] bg-white">
      <AppBanner />

      <header className="relative overflow-hidden h-[176px] md:h-[230px] bg-[#2A4DD0]">
        <div className="relative h-full max-w-[1100px] mx-auto">
          <svg aria-hidden width="120" height="40" viewBox="0 0 120 40" fill="none" stroke="#A9CBFF" strokeWidth={3} strokeLinecap="round" className="absolute left-[112px] md:left-[40%] top-[102px] md:top-[130px]">
            <path d="M2 8c10-8 20 8 30 0s20 8 30 0 20 8 30 0 20 8 26 2" />
            <path d="M2 22c10-8 20 8 30 0s20 8 30 0 20 8 30 0 20 8 26 2" />
            <path d="M2 36c10-8 20 8 30 0s20 8 30 0 20 8 30 0" />
          </svg>
          <span aria-hidden className="absolute left-[196px] md:left-[55%] top-[54px] w-4 h-4 rounded-full bg-white/25" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={specialityIcon(s)} alt="" className="absolute right-[18px] md:right-6 -bottom-1.5 w-[150px] h-[150px] md:w-[200px] md:h-[200px]" />
          <Link href="/" aria-label="Back to home" className="absolute left-3 md:left-6 top-3.5 md:top-5 w-11 h-11 rounded-full text-white flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6" strokeWidth={2.4} />
          </Link>
          <Link
            href={findHref}
            aria-label={`Search ${s.name} doctors`}
            className="absolute right-3.5 md:right-6 top-3.5 md:top-5 w-11 h-11 rounded-full border-[1.5px] border-white/45 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Search className="w-5 h-5" strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto">
        <section className="px-4 md:px-6 pt-5 md:pt-8 pb-1.5">
          <h1 className="text-[22px] md:text-[34px] font-extrabold tracking-[-0.02em]">{s.name}</h1>
          <p className="mt-1.5 text-sm md:text-base leading-normal text-[#4A5878] max-w-2xl">{s.desc}</p>
          {doctorCount > 0 && (
            <Link href={findHref} className="mt-3 inline-flex items-center gap-1.5 text-sm md:text-[15px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
              {doctorCount === 1 ? `See the ${s.name} doctor` : `See all ${doctorCount} ${s.name} doctors`} <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
            </Link>
          )}
        </section>

        {hospitals.length > 0 && (
          <div role="toolbar" aria-label="Sort and filter hospitals" className="flex gap-2 px-4 md:px-6 pt-3 pb-1 overflow-x-auto no-scrollbar">
            <Chip onClick={() => setSheet(true)} haspopup>
              <MapPin className="w-[15px] h-[15px]" strokeWidth={2.2} />
              <span className="max-w-[140px] truncate">{place.location?.label ?? "Set location"}</span>
              <ChevronDown className="w-[13px] h-[13px]" strokeWidth={2.6} />
            </Chip>
            <Chip pressed={sort === "near"} onClick={chooseNear}>Nearest</Chip>
            <Chip pressed={sort === "rating"} onClick={() => setSort("rating")}>Top rated</Chip>
            <Chip pressed={sort === "doctors"} onClick={() => setSort("doctors")}>Most doctors</Chip>
            <Chip pressed={allDay} onClick={() => setAllDay((v) => !v)}>Open 24/7</Chip>
          </div>
        )}

        <h2 className="mx-4 md:mx-6 mt-[18px] md:mt-7 mb-3.5 md:mb-5 text-[19px] md:text-[24px] font-extrabold tracking-[-0.02em]">
          {hospitals.length === 0 ? "No hospitals yet" : `${plural(shown.length, "hospital")} to explore`}
        </h2>

        {hospitals.length === 0 ? (
          <div className="mx-4 md:mx-6 mb-10 p-5 rounded-2xl bg-[#F6F8FC] text-sm md:text-[15px] text-[#4A5878] leading-relaxed">
            No partner hospital lists {s.name} doctors yet. You can still browse{" "}
            <Link href="/hospitals" className="font-bold text-[#2A4DD0] underline underline-offset-2">all hospitals</Link> or{" "}
            <Link href="/find" className="font-bold text-[#2A4DD0] underline underline-offset-2">find a doctor</Link>.
          </div>
        ) : shown.length === 0 ? (
          <p className="mx-4 md:mx-6 mb-10 text-sm text-[#4A5878]">None of these hospitals lists a round-the-clock service. Turn off &ldquo;Open 24/7&rdquo; to see them all.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3.5 md:gap-x-6 gap-y-[22px] md:gap-y-8 px-4 md:px-6 pb-8 md:pb-14">
            {shown.map(({ item, km, inArea }) => (
              <HospitalTile key={item.id} hospital={item} km={km} far={!!place.location && !inArea} />
            ))}
          </div>
        )}
      </div>

      {sheet && <LocationSheet place={place} cities={cities} onClose={closeSheet} />}
    </main>
  );
}

function Chip({ pressed, haspopup, onClick, children }: { pressed?: boolean; haspopup?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={haspopup ? undefined : pressed}
      aria-haspopup={haspopup ? "dialog" : undefined}
      className={`shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full border-[1.5px] text-[13px] font-bold whitespace-nowrap transition-colors ${
        pressed ? "border-[#2A4DD0] bg-[#EAF1FF] text-[#1F3FB8]" : "border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9CBFF]"
      }`}
    >
      {children}
    </button>
  );
}

function HospitalTile({ hospital: h, km, far }: { hospital: SpecialityHospital; km: number | null; far: boolean }) {
  const rated = h.rating != null;
  const facts = [rated ? h.rating!.toFixed(1) : null, plural(h.specialityDoctors, "doctor"), km != null ? formatDistance(km) : null].filter(Boolean).join(" · ");
  const tags = [...h.matched, h.specialties.length >= 3 ? "Multi-speciality" : null].filter(Boolean).join(", ");
  return (
    <Link href={`/hospitals/${h.id}`} className="group flex flex-col gap-[3px] min-w-0">
      <span className="relative block aspect-[1/1.08] md:aspect-[4/3.4] rounded-[18px] overflow-hidden bg-[linear-gradient(160deg,#F2F6FF_0%,#DCE7FF_100%)] mb-2">
        {h.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={h.image} alt={`Exterior of ${h.name}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[#2A4DD0]">
            <Building2 className="w-12 h-12" strokeWidth={1.6} />
          </span>
        )}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,20,51,0)_60%,rgba(8,20,51,0.55)_100%)]" />
        {h.open247 && <span className="absolute left-2 bottom-2 px-2 py-[3px] rounded-md bg-white text-[#2A4DD0] text-[11px] font-extrabold">OPEN 24/7</span>}
        {far && <span className="absolute right-2 top-2 px-2 py-[3px] rounded-md bg-white/90 text-[#4A5878] text-[11px] font-bold">Further away</span>}
      </span>
      <span className="flex items-center gap-[5px] min-w-0 text-[15.5px] md:text-[17px] font-extrabold tracking-[-0.01em] leading-[1.25] group-hover:text-[#2A4DD0] transition-colors">
        <span className="truncate">{h.name}</span>
        <VerifiedBadge className="w-[15px] h-[15px]" />
      </span>
      <span className="flex items-center gap-[5px] text-[13.5px] font-extrabold min-w-0">
        {rated && (
          <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" className="shrink-0">
            <circle cx="12" cy="12" r="11" fill="#1F8A57" />
            <path d="m12 6 1.8 3.8 4.1.4-3.1 2.8.9 4.1L12 15l-3.7 2.1.9-4.1-3.1-2.8 4.1-.4Z" fill="#fff" />
          </svg>
        )}
        <span className="truncate">
          {rated && <span className="sr-only">Rated </span>}
          {facts}
        </span>
      </span>
      {tags && <span className="text-[13px] text-[#5B667A] truncate">{tags}</span>}
      <span className="text-[13px] text-[#5B667A] truncate">{h.address || h.city || "Partner hospital"}</span>
    </Link>
  );
}
