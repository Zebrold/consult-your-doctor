"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Search, SlidersHorizontal, Stethoscope } from "lucide-react";
import { BackArrow } from "@/components/BackArrow";
import { LocationMenu, useLocationMenu } from "@/components/patient/LocationMenu";
import { nearbyOnly, usePatientLocation } from "@/components/patient/location";
import { PageBody, SectionHead, btnPrimary, card } from "@/components/patient/app-ui";
import { HospitalGridCard, HospitalListCard } from "@/components/patient/HospitalCards";
import { SPECIALITIES, specialityIcon, type SpecialityTile } from "./specialities";
import type { HomeHospital } from "./types";

/** Whether a tile matches what was typed: its name, short name, tagline or description. */
const matches = (s: SpecialityTile, q: string) =>
  !q || [s.name, s.short, s.tagline, s.desc].some((text) => text?.toLowerCase().includes(q));

/**
 * The blue banner at the top (the user's "Find a specialist" design): back, search, and the doctor picture. On
 * desktops it is a blue card in the page, like the other patient headers.
 */
function SpecialistBanner({ onSearch }: { onSearch: () => void }) {
  return (
    <section className="relative overflow-hidden bg-[#2A4DD0] text-white h-[calc(env(safe-area-inset-top)+178px)] md:h-[220px] print:hidden desk:mx-9 desk:mt-7 desk:h-[200px] desk:rounded-[20px]">
      <div className="relative h-full mx-auto max-w-[1100px] px-4 md:px-6 pt-[calc(env(safe-area-inset-top)+12px)] md:pt-5 desk:max-w-none desk:px-7">
        <div className="relative z-10 flex items-center justify-between">
          <BackArrow fallback="/" />
          <button
            type="button"
            onClick={onSearch}
            aria-label="Search a speciality or symptom"
            className="w-10 h-10 rounded-full border-[1.5px] border-white/70 flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </button>
        </div>
        {/* Decoration: a soft dot, three waves, and the doctor rising from the bottom edge. */}
        <span aria-hidden className="absolute left-[50%] md:left-[44%] top-[34%] w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#A9BEF7]/80" />
        <svg aria-hidden viewBox="0 0 80 40" fill="none" className="absolute left-[24%] md:left-[30%] top-[56%] w-[72px] md:w-[96px] text-white/75">
          {[6, 19, 32].map((y) => (
            <path key={y} d={`M2 ${y}c6-5 12-5 18 0s12 5 18 0 12-5 18 0 12 5 18 0`} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          ))}
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={specialityIcon({ slug: "general-physician" })}
          alt=""
          className="absolute bottom-0 right-5 md:right-[10%] w-[146px] h-[146px] md:w-[184px] md:h-[184px] desk:w-[172px] desk:h-[172px] pointer-events-none select-none"
        />
      </div>
    </section>
  );
}

/**
 * Find a specialist ("Hospital booking" on the home page, the In-Person tab), after the user's design: the blue
 * banner, the title and search, every speciality as a tile that opens its hospitals, then a nudge to the Care
 * Assistant and partner hospitals near the patient.
 */
export function BrowseSpecialities({
  hospitals,
  cities,
  initialQuery = "",
}: {
  /** Partner hospitals that can be booked (they have doctors). */
  hospitals: HomeHospital[];
  cities: string[];
  /** Words searched elsewhere on the site (/specialities?q=). */
  initialQuery?: string;
}) {
  const place = usePatientLocation(cities);
  const loc = useLocationMenu();
  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();
  const tiles = SPECIALITIES.filter((s) => matches(s, q));
  // With no speciality for the words, the bookable hospitals whose name, place or specialities have them.
  const hospitalHits = q && tiles.length === 0 ? hospitals.filter((h) => [h.name, h.city, h.address, ...h.specialties.map((s) => s.name)].some((t) => t?.toLowerCase().includes(q))).slice(0, 6) : [];
  const where = place.location?.label;
  const near = nearbyOnly(hospitals, place.location).slice(0, 6);

  const focusSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <SpecialistBanner onSearch={focusSearch} />

      <PageBody>
        <div className="max-w-[1100px] mx-auto lg:mx-0 lg:max-w-none">
          <section className="pt-[22px] px-4 md:px-6 lg:p-0">
            <h1 className="text-[23px] md:text-[28px] lg:text-[26px] font-extrabold leading-tight tracking-[-0.02em]">Find a specialist</h1>
            <p className="mt-1.5 max-w-[560px] text-[13.5px] md:text-[15px] leading-[1.5] text-[#5B667A]">
              Choose the care you need to see verified hospitals and doctors near you, with fees and open slots.
            </p>
            <form
              ref={searchRef}
              role="search"
              action="/specialities"
              // The tiles filter as you type, so Enter only closes the keyboard.
              onSubmit={(e) => {
                e.preventDefault();
                inputRef.current?.blur();
              }}
              className="mt-4 flex items-center gap-2.5 h-[50px] pl-3.5 pr-1.5 rounded-[12px] border border-[#D6DDE8] bg-white focus-within:border-[#2A4DD0] focus-within:ring-2 focus-within:ring-[#2A4DD0]/15 transition-shadow lg:max-w-[560px]"
            >
              <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
              <label htmlFor="speciality-search" className="sr-only">
                Search a speciality or symptom
              </label>
              <input
                ref={inputRef}
                id="speciality-search"
                type="search"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a speciality or symptom"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14.5px] text-[#0B1B3F] placeholder:text-[#7A8599]"
              />
              {/* The filter: where the patient is, which sets the hospitals and doctors "near you". */}
              <button
                type="button"
                onClick={() => (loc.open ? loc.close() : loc.openAt(searchRef.current))}
                aria-haspopup="dialog"
                aria-expanded={loc.open}
                aria-label={where ? `Location: ${where}. Change location` : "Choose your location"}
                title={where ? `Near ${where}` : "Choose your location"}
                className="shrink-0 w-[38px] h-[38px] rounded-[10px] bg-[#2A4DD0] text-white flex items-center justify-center hover:bg-[#2443B8] active:scale-95 transition"
              >
                <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </form>
          </section>

          <section aria-labelledby="choose-title" className="pt-6 px-4 md:px-6 lg:px-0 lg:pt-7">
            <div className="flex items-end justify-between gap-3">
              <h2 id="choose-title" className="text-[17.5px] lg:text-[18px] font-extrabold tracking-[-0.01em]">
                All specialities
              </h2>
              <span className="text-[12.5px] font-bold text-[#5B667A]">
                {q ? `${tiles.length} of ${SPECIALITIES.length}` : `${SPECIALITIES.length} specialities`}
              </span>
            </div>

            {tiles.length === 0 ? (
              <>
                <div className={`${card} mt-3 p-5 text-[13.5px] leading-relaxed text-[#4A5878]`}>
                  No speciality matches &ldquo;{query.trim()}&rdquo;.{" "}
                  {hospitalHits.length > 0 ? "These hospitals do. " : ""}
                  Looking for a hospital?{" "}
                  <Link href="/hospitals" className="font-extrabold text-[#2A4DD0] hover:underline">
                    See all hospitals
                  </Link>
                  . Not sure what you need? Ask the Care Assistant below.
                </div>
                {hospitalHits.length > 0 && (
                  <div className="mt-3.5 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {hospitalHits.map((h) => (
                      <HospitalListCard key={h.id} hospital={h} km={null} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <ul className="mt-3 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3.5">
                {tiles.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/specialities/${s.slug}`}
                      className="group h-full flex flex-col items-center text-center px-1.5 pt-3 pb-3.5 lg:px-3 lg:pt-5 lg:pb-4 rounded-[14px] lg:rounded-2xl border border-[#E6EAF0] bg-white hover:border-[#2A4DD0] hover:shadow-[0_0_0_1px_#2A4DD0] transition"
                    >
                      <span className="w-[54px] h-[54px] lg:w-[68px] lg:h-[68px] rounded-full bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)] shadow-[inset_0_0_0_1px_#D6E2FB] flex items-center justify-center group-hover:scale-[1.04] transition-transform">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={specialityIcon(s)} alt="" className="w-9 h-9 lg:w-11 lg:h-11" />
                      </span>
                      <span className="mt-2 text-[12.5px] lg:text-[14.5px] font-extrabold leading-tight">
                        <span className="lg:hidden">{s.short ?? s.name}</span>
                        <span className="hidden lg:inline">{s.name}</span>
                      </span>
                      <span className="mt-1 text-[11px] lg:text-[12.5px] leading-snug text-[#5B667A]">{s.tagline}</span>
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
                <button type="button" onClick={loc.toggle} aria-haspopup="dialog" aria-expanded={loc.open} className="inline-flex items-center gap-1 font-bold text-[#2A4DD0] hover:underline underline-offset-4">
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
                <button type="button" onClick={loc.toggle} aria-haspopup="dialog" className="font-extrabold text-[#2A4DD0] hover:underline">
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

      {loc.anchor && <LocationMenu place={place} cities={cities} anchor={loc.anchor} onClose={loc.close} />}
    </>
  );
}
