"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Search, SlidersHorizontal, Stethoscope } from "lucide-react";
import { PhoneHeader } from "@/components/patient/PhoneHeader";
import { LocationSheet } from "@/components/patient/LocationSheet";
import { nearbyOnly, usePatientLocation } from "@/components/patient/location";
import { PageBody, SectionHead, btnPrimary, card } from "@/components/patient/app-ui";
import { HospitalGridCard, HospitalListCard } from "@/components/patient/HospitalCards";
import { SPECIALITIES, specialityIcon, type SpecialityTile } from "./specialities";
import type { HomeHospital } from "./types";

/** Whether a tile matches what was typed: its name, short name, tagline or description. */
const matches = (s: SpecialityTile, q: string) =>
  !q || [s.name, s.short, s.tagline, s.desc].some((text) => text?.toLowerCase().includes(q));

/**
 * "Hospital booking" from the home page (the user's Browse specialities and app home designs): every speciality as a
 * tile that opens its hospitals, a nudge to the Care Assistant, and partner hospitals near the patient.
 */
export function BrowseSpecialities({
  isSignedIn,
  name,
  email,
  hospitals,
  cities,
}: {
  isSignedIn: boolean;
  name: string | null;
  email: string | null;
  /** Partner hospitals that can be booked (they have doctors). */
  hospitals: HomeHospital[];
  cities: string[];
}) {
  const place = usePatientLocation();
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const tiles = SPECIALITIES.filter((s) => matches(s, q));
  const where = place.location?.label;
  const near = nearbyOnly(hospitals, place.location).slice(0, 6);

  return (
    <>
      <PhoneHeader
        isSignedIn={isSignedIn}
        name={name}
        email={email}
        eyebrow="Find care by speciality"
        title="Browse specialities"
        subtitle={`${SPECIALITIES.length} specialities · hospitals and doctors ${where ? `near ${where}` : "at partner hospitals"}`}
        container="max-w-[1100px] px-4 md:px-6"
      >
        <form
          role="search"
          action="/find"
          className="relative flex items-center gap-2.5 h-12 pl-3.5 pr-[5px] rounded-[14px] bg-white text-[#0B1B3F] shadow-[0_8px_18px_rgba(11,27,63,0.18)] lg:max-w-[560px]"
        >
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <label htmlFor="speciality-search" className="sr-only">
            Search a speciality or symptom
          </label>
          <input
            id="speciality-search"
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a speciality or symptom"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] placeholder:text-[#7A8599]"
          />
          <Link
            href="/find"
            aria-label="Search doctors with filters"
            className="shrink-0 w-[38px] h-[38px] rounded-[10px] bg-[#2A4DD0] text-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <SlidersHorizontal className="w-[17px] h-[17px]" strokeWidth={2.2} />
          </Link>
        </form>
      </PhoneHeader>

      <PageBody>
        <div className="max-w-[1100px] lg:max-w-none">
          <section aria-labelledby="choose-title" className="pt-6 px-4 md:px-6 lg:p-0">
            <div className="flex items-end justify-between gap-3">
              <h2 id="choose-title" className="text-[19px] lg:text-[18px] font-extrabold tracking-[-0.02em]">
                Choose a speciality
              </h2>
              <span className="text-[12.5px] font-bold text-[#5B667A]">
                {q ? `${tiles.length} of ${SPECIALITIES.length}` : `${SPECIALITIES.length} specialities`}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-[#5B667A]">Tap one to see hospitals and doctors near you.</p>

            {tiles.length === 0 ? (
              <div className={`${card} mt-3.5 p-5 text-[13.5px] leading-relaxed text-[#4A5878]`}>
                No speciality matches &ldquo;{query.trim()}&rdquo;.{" "}
                <Link href={`/find?q=${encodeURIComponent(query.trim())}`} className="font-extrabold text-[#2A4DD0] hover:underline">
                  Search doctors for it
                </Link>{" "}
                or ask the Care Assistant below.
              </div>
            ) : (
              <ul className="mt-3.5 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2.5 lg:gap-3.5">
                {tiles.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/specialities/${s.slug}`}
                      className={`group h-full flex flex-col items-center text-center px-2 pt-3.5 pb-3 lg:px-3 lg:pt-5 lg:pb-4 ${card} hover:shadow-[0_0_0_1.5px_#2A4DD0] transition-shadow`}
                    >
                      <span className="w-[60px] h-[60px] lg:w-[68px] lg:h-[68px] rounded-full bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)] shadow-[inset_0_0_0_1px_#D6E2FB] flex items-center justify-center group-hover:scale-[1.04] transition-transform">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={specialityIcon(s)} alt="" className="w-10 h-10 lg:w-11 lg:h-11" />
                      </span>
                      <span className="mt-2.5 text-[13.5px] lg:text-[14.5px] font-extrabold leading-tight">
                        <span className="lg:hidden">{s.short ?? s.name}</span>
                        <span className="hidden lg:inline">{s.name}</span>
                      </span>
                      <span className="mt-1 text-[11.5px] lg:text-[12.5px] leading-snug text-[#5B667A]">{s.tagline}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pt-5 px-4 md:px-6 lg:px-0">
            <div className={`${card} flex items-center gap-3.5 p-4`}>
              <span className="shrink-0 w-11 h-11 rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center">
                <Stethoscope className="w-[22px] h-[22px]" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-extrabold">Not sure which speciality?</span>
                <span className="block text-[12.5px] leading-snug text-[#5B667A]">Tell the Care Assistant your symptoms.</span>
              </span>
              <Link href="/ai" className={`${btnPrimary} shrink-0 px-5!`}>
                Ask
              </Link>
            </div>
          </section>

          <section aria-labelledby="near-title" className="pt-[26px] px-4 md:px-6 lg:px-0">
            <SectionHead
              id="near-title"
              title="Top hospitals near you"
              sub={
                <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" className="inline-flex items-center gap-1 font-bold text-[#2A4DD0] hover:underline underline-offset-4">
                  <MapPin className="w-3.5 h-3.5" />
                  {where ? `Nearest to ${where}` : "Set your location"}
                  <ChevronDown className="w-3 h-3" strokeWidth={2.6} />
                </button>
              }
              href="/hospitals"
            />
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
                  {/* Full rows of three */}
                  {near.slice(0, near.length >= 6 ? 6 : 3).map(({ item, km }) => (
                    <HospitalGridCard key={item.id} hospital={item} km={km} />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </PageBody>

      {sheet && <LocationSheet place={place} cities={cities} onClose={closeSheet} />}
    </>
  );
}
