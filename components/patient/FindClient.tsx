"use client";

import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { preconnect } from "react-dom";
import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, Check, ChevronDown, Hospital, MapPin, Search, SearchX, SlidersHorizontal, Star, Stethoscope, UserRound, FlaskConical, Clock } from "lucide-react";
import { PhoneHeader } from "@/components/patient/PhoneHeader";
import { LocationSheet } from "@/components/patient/LocationSheet";
import { Sheet } from "@/components/patient/PhoneSheet";
import { byNearness, usePatientLocation } from "@/components/patient/location";
import { VerifiedBadge } from "@/components/home/ui";
import type { HomeHospital } from "@/components/home/types";
import type { Clinic } from "@/components/patient/CareMap";
import { doctorName, formatINR, formatSlot, initials } from "@/components/patient/format";
import { formatDistance, sameCity } from "@/lib/geo";
import { hospitalTags, placeOf } from "./HospitalCards";
import { Dots, PageBody, RatingPill, btnOutline, btnPrimary, card } from "./app-ui";
import { RemoteImage, type ImageLoad } from "@/components/RemoteImage";
import { TILE_ORIGIN } from "@/components/patient/map-tiles";

const CareMap = dynamic(() => import("@/components/patient/CareMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-[13px] text-[#5B667A] bg-[#EEF2F6]">Loading map…</div>,
});

export type FindDoctor = {
  id: string;
  name: string | null;
  specialty: string | null;
  qualifications: string | null;
  experience: number | null;
  /** Online booking is open (the hospital has set the consultation fee, which only the profile page shows). */
  bookable: boolean;
  image: string | null;
  hospital: { id: string; name: string; city: string | null; address: string | null } | null;
  nextSlot: string | null;
  openToday: number;
  rating: number | null;
  reviewCount: number;
  lat: number | null;
  lng: number | null;
  city: string | null;
};

export type FindLab = { id: string; name: string; city: string | null; address: string | null; image: string | null; tests: number; lat: number | null; lng: number | null };

export type FindMode = "doc" | "hosp" | "lab";
type Sort = "near" | "soonest" | "rating" | "experience" | "doctors" | "tests";

type Props = {
  doctors: FindDoctor[];
  hospitals: HomeHospital[];
  labs: FindLab[];
  now: number;
  initial: { mode: FindMode; q: string; specialty: string; city: string; availableToday: boolean };
  account: { isSignedIn: boolean; name: string | null; email: string | null };
  /** The doctor booking fee and the lab booking charge (a percentage of each test): the only prices shown here. */
  fees: { consultation: number; diagnosticPercent: number };
};

const PAGE = 12;
const MODES: { key: FindMode; label: string; icon: typeof Stethoscope }[] = [
  { key: "doc", label: "Doctors", icon: Stethoscope },
  { key: "hosp", label: "Hospitals", icon: Hospital },
  { key: "lab", label: "Diagnostics", icon: FlaskConical },
];
const NOUN: Record<FindMode, [string, string]> = { doc: ["doctor", "doctors"], hosp: ["hospital", "hospitals"], lab: ["diagnostic centre", "diagnostic centres"] };
const SORTS: Record<FindMode, [Sort, string][]> = {
  doc: [["soonest", "Soonest available"], ["near", "Nearest"], ["rating", "Top rated"], ["experience", "Most experienced"]],
  hosp: [["near", "Nearest"], ["rating", "Top rated"], ["doctors", "Most doctors"]],
  lab: [["near", "Nearest"], ["tests", "Most tests"]],
};
const count = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

// Leaflet needs a visible, sized container, so each map only mounts where it shows.
const wideQuery = "(min-width: 1024px)";
const subscribeWide = (onChange: () => void) => {
  const mq = window.matchMedia(wideQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useIsWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => false);

/** Find care: doctors, hospitals or diagnostic centres near the patient, with filters, a map and booking links. */
export function FindClient({ doctors, hospitals, labs, now, initial, account, fees }: Props) {
  const place = usePatientLocation();
  const isWide = useIsWide();
  const [mode, setModeState] = useState<FindMode>(initial.mode);
  const [query, setQuery] = useState(initial.q);
  const specialties = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of doctors) if (d.specialty) counts.set(d.specialty, (counts.get(d.specialty) ?? 0) + 1);
    return Array.from(counts.keys()).sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b));
  }, [doctors]);
  const [specialty, setSpecialty] = useState(() => specialties.find((s) => s.toLowerCase() === initial.specialty.toLowerCase()) ?? "");
  const cities = useMemo(
    () => Array.from(new Set([...doctors.map((d) => d.city), ...hospitals.map((h) => h.city), ...labs.map((l) => l.city)].filter(Boolean) as string[])).sort(),
    [doctors, hospitals, labs],
  );
  // A city from the link or picked here ("" is all cities). Until then (null) the lists follow the saved location.
  const [cityChoice, setCity] = useState<string | null>(() => (initial.city ? cities.find((c) => sameCity(c, initial.city)) ?? initial.city : null));
  const [availableToday, setAvailableToday] = useState(initial.availableToday);
  const [allDay, setAllDay] = useState(false);
  const [sortChoice, setSort] = useState<Sort | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"filters" | "location" | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const byLocation = cityChoice === null && !!place.location;
  const where = byLocation ? place.location!.label : cityChoice || "all cities";
  const sort: Sort = sortChoice && SORTS[mode].some(([s]) => s === sortChoice) ? sortChoice : mode === "doc" ? "soonest" : place.location ? "near" : mode === "hosp" ? "doctors" : "tests";

  const setMode = (m: FindMode) => {
    setModeState(m);
    setVisible(PAGE);
    setSelectedClinic(null);
  };

  /** Rows near the patient (or in the chosen city), with each one's distance. */
  function place_<T extends { lat: number | null; lng: number | null; city: string | null }>(items: T[]) {
    const rows = byNearness(items, place.location);
    if (byLocation) return rows.filter((r) => r.inArea);
    if (cityChoice) return rows.filter((r) => sameCity(r.item.city, cityChoice));
    return rows;
  }

  const q = query.trim().toLowerCase();
  const has = (...values: (string | null | undefined)[]) => !q || values.some((v) => v?.toLowerCase().includes(q));

  const doctorRows = useMemo(() => {
    const rows = place_(doctors).filter(
      ({ item: d }) => (!specialty || d.specialty === specialty) && (!availableToday || d.openToday > 0) && has(d.name, d.specialty, d.hospital?.name, d.city),
    );
    const last = "￿";
    if (sort === "soonest") rows.sort((a, b) => (a.item.nextSlot ?? last).localeCompare(b.item.nextSlot ?? last));
    if (sort === "rating") rows.sort((a, b) => (b.item.rating ?? 0) - (a.item.rating ?? 0) || b.item.reviewCount - a.item.reviewCount);
    if (sort === "experience") rows.sort((a, b) => (b.item.experience ?? -1) - (a.item.experience ?? -1));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, place.location, cityChoice, specialty, availableToday, q, sort]);

  const hospitalRows = useMemo(() => {
    const rows = place_(hospitals).filter(
      ({ item: h }) => (!allDay || h.open247) && (!specialty || h.specialties.some((s) => s.name === specialty)) && has(h.name, h.city, h.address, ...h.specialties.map((s) => s.name)),
    );
    if (sort === "rating") rows.sort((a, b) => (b.item.rating ?? 0) - (a.item.rating ?? 0) || b.item.reviewCount - a.item.reviewCount);
    if (sort === "doctors") rows.sort((a, b) => b.item.doctors - a.item.doctors);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitals, place.location, cityChoice, allDay, specialty, q, sort]);

  const labRows = useMemo(() => {
    const rows = place_(labs).filter(({ item: l }) => has(l.name, l.city, l.address));
    if (sort === "tests") rows.sort((a, b) => b.item.tests - a.item.tests);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labs, place.location, cityChoice, q, sort]);

  const total = mode === "doc" ? doctorRows.length : mode === "hosp" ? hospitalRows.length : labRows.length;

  const clinics: Clinic[] = useMemo(() => {
    if (mode === "lab") return labRows.map(({ item: l }) => ({ id: l.id, name: l.name, address: l.address, city: l.city, doctorCount: l.tests }));
    if (mode === "hosp") return hospitalRows.map(({ item: h }) => ({ id: h.id, name: h.name, address: h.address, city: h.city, doctorCount: h.doctors }));
    const byId = new Map<string, Clinic>();
    for (const { item: d } of doctorRows) {
      if (!d.hospital) continue;
      const c = byId.get(d.hospital.id) ?? { ...d.hospital, doctorCount: 0 };
      c.doctorCount++;
      byId.set(d.hospital.id, c);
    }
    return Array.from(byId.values());
  }, [mode, doctorRows, hospitalRows, labRows]);

  // The map tiles can be the largest thing on a phone screen, so open the connection to their server early.
  preconnect(TILE_ORIGIN);
  const map = (
    <CareMap clinics={clinics} selectedId={selectedClinic} onSelect={setSelectedClinic} unit={mode === "lab" ? "test" : "doctor"} />
  );
  const filtersActive = Boolean(q || specialty || cityChoice || availableToday || allDay);
  const reset = () => {
    setQuery("");
    setSpecialty("");
    setCity(null);
    setAvailableToday(false);
    setAllDay(false);
    setVisible(PAGE);
  };
  const title = mode === "doc" ? "Find a doctor" : mode === "hosp" ? "Find a hospital" : "Find a diagnostic centre";
  const subtitle = `${count(total, mode === "doc" ? ["verified doctor", "verified doctors"] : mode === "hosp" ? ["partner hospital", "partner hospitals"] : ["partner lab", "partner labs"])} ${byLocation ? `near ${where}` : cityChoice ? `in ${where}` : "across all cities"}`;

  const sortLabel = SORTS[mode].find(([s]) => s === sort)?.[1] ?? "";
  // The first few results sit near the top of a phone screen, so their photos load straight away, and the first one
  // that has a photo goes ahead of every other image (it is often the largest thing on screen).
  const shown = (mode === "doc" ? doctorRows : mode === "hosp" ? hospitalRows : labRows).slice(0, visible);
  const firstPhoto = shown.findIndex(({ item }) => mode === "lab" || !!item.image);
  const loadOf = (i: number): ImageLoad => (i === firstPhoto && i < 3 ? "first" : i < 3 ? "eager" : "lazy");

  return (
    <>
      <div className="lg:hidden">
        <PhoneHeader isSignedIn={account.isSignedIn} name={account.name} email={account.email} eyebrow="Find care" title={title} subtitle={subtitle} container="max-w-[900px] px-4 md:px-6">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              (document.activeElement as HTMLElement | null)?.blur();
            }}
            className="relative flex items-center gap-2.5 h-12 pl-3.5 pr-[5px] rounded-[14px] bg-white text-[#0B1B3F] shadow-[0_8px_18px_rgba(11,27,63,0.18)]"
          >
            <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
            <label htmlFor="find-search" className="sr-only">Search doctors, hospitals or labs</label>
            <input
              id="find-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PAGE);
              }}
              placeholder="Search doctors, hospitals or labs"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] placeholder:text-[#7A8599]"
            />
            <button type="button" onClick={() => setSheet("filters")} aria-label="Filters" aria-haspopup="dialog" className="relative shrink-0 w-[38px] h-[38px] rounded-[10px] bg-[#2A4DD0] text-white flex items-center justify-center">
              <SlidersHorizontal className="w-[17px] h-[17px]" />
              {filtersActive && <span aria-hidden className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F79009] ring-2 ring-[#2A4DD0]" />}
            </button>
          </form>
        </PhoneHeader>
      </div>

      <PageBody>
        <div className="hidden lg:flex items-end justify-between gap-5 mb-[22px]">
          <div className="min-w-0">
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">{title}</h1>
            <p className="mt-1 text-[14px] text-[#5B667A]">{subtitle}</p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button type="button" onClick={() => setSheet("location")} aria-haspopup="dialog" className={btnOutline}>
              <MapPin className="w-4 h-4" /> <span className="max-w-[160px] truncate">{byLocation ? where : cityChoice || "All cities"}</span>
            </button>
            <label className={`${btnOutline} relative`}>
              <span className="sr-only">Sort results</span>
              Sort: {sortLabel}
              <ChevronDown className="w-4 h-4" />
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="absolute inset-0 opacity-0 cursor-pointer">
                {SORTS[mode].map(([s, label]) => (
                  <option key={s} value={s}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Mode tabs: underlined on phones, a segmented control on desktops. */}
        <div className="px-4 md:px-6 lg:px-0 pt-2.5 lg:pt-0 bg-white lg:bg-transparent border-b border-[#E1E7F0] lg:border-0 lg:mb-[18px]">
          <div role="tablist" aria-label="What are you looking for" className="grid grid-cols-3 lg:inline-flex lg:gap-1 lg:p-1 lg:rounded-xl lg:bg-white lg:shadow-[inset_0_0_0_1px_#E6EAF0]">
            {MODES.map(({ key, label, icon: Icon }) => {
              const on = key === mode;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setMode(key)}
                  className={`flex items-center justify-center gap-1.5 h-[46px] lg:h-[34px] px-1 lg:px-3.5 text-[13.5px] lg:text-[13px] whitespace-nowrap transition-colors lg:rounded-[9px] ${
                    on
                      ? "font-extrabold text-[#2A4DD0] shadow-[inset_0_-2.5px_0_#2A4DD0] lg:shadow-[0_1px_2px_rgba(11,27,63,0.12),0_0_0_1px_#E1E7F0] lg:bg-white"
                      : "font-bold text-[#5B667A] hover:text-[#27324A]"
                  }`}
                >
                  <Icon className="w-4 h-4 lg:hidden" />
                  {label === "Diagnostics" ? (
                    <>
                      <span className="lg:hidden">Diagnostics</span>
                      <span className="hidden lg:inline">Diagnostic centres</span>
                    </>
                  ) : (
                    label
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {mode !== "lab" && specialties.length > 0 && (
          <div role="toolbar" aria-label="Filter by speciality" className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-6 pt-3">
            <Chip on={!specialty} onClick={() => setSpecialty("")}>
              <Stethoscope className="w-[15px] h-[15px]" /> All specialists
            </Chip>
            {specialties.slice(0, 12).map((s) => (
              <Chip key={s} on={specialty === s} onClick={() => setSpecialty(specialty === s ? "" : s)}>
                {s}
              </Chip>
            ))}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-5 lg:items-start">
          <aside className="hidden lg:flex flex-col gap-4">
            <div className={`${card} p-[22px]`}>
              <div className="flex justify-between items-center mb-1.5">
                <h2 className="text-[15px] font-extrabold">Filters</h2>
                {filtersActive && (
                  <button type="button" onClick={reset} className="text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                    Clear all
                  </button>
                )}
              </div>
              <Filters
                mode={mode}
                specialties={specialties}
                specialty={specialty}
                setSpecialty={setSpecialty}
                availableToday={availableToday}
                setAvailableToday={setAvailableToday}
                allDay={allDay}
                setAllDay={setAllDay}
                cities={cities}
                cityChoice={cityChoice}
                setCity={setCity}
                place={place.location?.label ?? null}
              />
            </div>
            <div className="h-[260px] rounded-2xl overflow-hidden shadow-[0_0_0_1px_#E6EAF0] relative isolate bg-[#EEF2F6]">{isWide && map}</div>
          </aside>

          <div className="min-w-0">
            <section className="lg:hidden px-4 md:px-6 pt-3.5">
              <div className="relative isolate h-[230px] rounded-[20px] overflow-hidden shadow-[0_0_0_1px_#E1E7F0] bg-[#EEF2F6]">
                {!isWide && map}
                <span className="absolute z-[500] left-3 top-3 flex items-center gap-2 h-8 px-3 rounded-full bg-white text-[12.5px] font-extrabold shadow-[0_4px_12px_rgba(11,27,63,0.12)] pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-[#2A4DD0]" />
                  <span className="max-w-[140px] truncate">{byLocation ? where : cityChoice || "All cities"}</span>
                  <span className="font-semibold text-[#5B667A]">· {count(clinics.length, mode === "lab" ? NOUN.lab : NOUN.hosp)}</span>
                </span>
              </div>
              <div className={`flex items-center justify-between gap-2.5 mt-2.5 px-3.5 py-3 ${card} rounded-[14px]!`}>
                <span className="flex items-center gap-2 min-w-0 text-[13px] text-[#27324A]">
                  <MapPin className="w-4 h-4 text-[#2A4DD0] shrink-0" />
                  <span className="truncate">
                    Showing {NOUN[mode][1]} {byLocation ? "near" : cityChoice ? "in" : "in"} <strong>{byLocation ? where : cityChoice || "all cities"}</strong>
                  </span>
                </span>
                <button type="button" onClick={() => setSheet("location")} className="shrink-0 text-[12.5px] font-extrabold text-[#2A4DD0]">
                  Change
                </button>
              </div>
            </section>

            <section aria-labelledby="results-title" className="px-4 md:px-6 lg:px-0 pt-[22px] lg:pt-0">
              <div className="flex items-end justify-between gap-2.5 mb-3 lg:mb-3.5">
                <div>
                  <h2 id="results-title" className="text-[18px] lg:text-[13.5px] font-extrabold lg:font-bold tracking-[-0.02em] lg:tracking-normal lg:text-[#5B667A]">
                    {count(total, NOUN[mode])} found
                    {filtersActive && <span className="hidden lg:inline"> · filters on</span>}
                  </h2>
                  <p className="lg:hidden mt-0.5 text-[12.5px] text-[#5B667A]">Sorted by {sortLabel.toLowerCase()}</p>
                </div>
              </div>

              {total === 0 ? (
                <div className={`${card} px-5 py-8 text-center`}>
                  <span className="inline-flex w-12 h-12 rounded-full shadow-[inset_0_0_0_1px_#E1E7F0] items-center justify-center text-[#2A4DD0]">
                    <SearchX className="w-[22px] h-[22px]" />
                  </span>
                  <p className="mt-2.5 text-[15px] font-extrabold">No {NOUN[mode][1]} match</p>
                  <p className="mt-0.5 text-[12.5px] text-[#5B667A]">
                    {byLocation ? `None listed near ${where} yet. ` : ""}Try another search or show all cities.
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    {filtersActive && (
                      <button type="button" onClick={reset} className={btnOutline}>
                        Clear filters
                      </button>
                    )}
                    {cityChoice !== "" && (
                      <button type="button" onClick={() => setCity("")} className={btnPrimary}>
                        All cities
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 lg:gap-3.5">
                  {mode === "doc" &&
                    doctorRows.slice(0, visible).map(({ item, km }, i) => <DoctorResult key={item.id} doctor={item} km={km} now={now} fee={fees.consultation} load={loadOf(i)} />)}
                  {mode === "hosp" &&
                    hospitalRows.slice(0, visible).map(({ item, km }, i) => <HospitalResult key={item.id} hospital={item} km={km} fee={fees.consultation} load={loadOf(i)} />)}
                  {mode === "lab" && labRows.slice(0, visible).map(({ item, km }, i) => <LabResult key={item.id} lab={item} km={km} percent={fees.diagnosticPercent} load={loadOf(i)} />)}
                  {total > visible && (
                    <button type="button" onClick={() => setVisible((v) => v + PAGE)} className={`${btnOutline} self-center mt-1`}>
                      Show more {NOUN[mode][1]}
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </PageBody>

      {sheet === "location" && <LocationSheet place={place} cities={cities} onClose={closeSheet} />}
      {sheet === "filters" && (
        <Sheet title="Filters" subtitle={`Narrow the ${NOUN[mode][1]}`} onClose={closeSheet}>
          <Filters
            mode={mode}
            specialties={specialties}
            specialty={specialty}
            setSpecialty={setSpecialty}
            availableToday={availableToday}
            setAvailableToday={setAvailableToday}
            allDay={allDay}
            setAllDay={setAllDay}
            cities={cities}
            cityChoice={cityChoice}
            setCity={setCity}
            place={place.location?.label ?? null}
          />
          <p className="mt-4 mb-1.5 text-[11.5px] font-extrabold tracking-[0.06em] text-[#5B667A] uppercase">Sort by</p>
          <div className="flex flex-wrap gap-2">
            {SORTS[mode].map(([s, label]) => (
              <Chip key={s} on={sort === s} onClick={() => setSort(s)}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <button type="button" onClick={reset} className={btnOutline}>
              Clear all
            </button>
            <button type="button" onClick={closeSheet} className={btnPrimary}>
              Show {count(total, NOUN[mode])}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 h-[38px] px-3.5 rounded-full border-[1.5px] text-[13px] font-extrabold whitespace-nowrap transition-colors ${
        on ? "border-[#2A4DD0] bg-[#2A4DD0] text-white" : "border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9CBFF]"
      }`}
    >
      {children}
    </button>
  );
}

function Check_({ on, onClick, label, note }: { on: boolean; onClick: () => void; label: string; note?: string | number }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className="flex items-center gap-2.5 w-full py-2 text-left text-[13.5px] font-bold text-[#0B1B3F]">
      <span aria-hidden className={`shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center ${on ? "border-[#2A4DD0] bg-[#2A4DD0]" : "border-[#B7C1D1] bg-white"}`}>
        {on && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
      </span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {note != null && <span className="text-[12px] font-semibold text-[#5B667A]">{note}</span>}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mt-3.5 mb-1 text-[11.5px] font-extrabold tracking-[0.06em] text-[#5B667A] uppercase">{title}</p>
      {children}
    </div>
  );
}

/** The filters, the same on the desktop panel and the phone sheet. */
function Filters(p: {
  mode: FindMode;
  specialties: string[];
  specialty: string;
  setSpecialty: (s: string) => void;
  availableToday: boolean;
  setAvailableToday: (v: boolean) => void;
  allDay: boolean;
  setAllDay: (v: boolean) => void;
  cities: string[];
  cityChoice: string | null;
  setCity: (c: string | null) => void;
  place: string | null;
}) {
  return (
    <>
      {p.mode !== "lab" && p.specialties.length > 0 && (
        <Group title="Speciality">
          {p.specialties.slice(0, 8).map((s) => (
            <Check_ key={s} on={p.specialty === s} onClick={() => p.setSpecialty(p.specialty === s ? "" : s)} label={s} />
          ))}
        </Group>
      )}
      {p.mode === "doc" && (
        <Group title="Availability">
          <Check_ on={p.availableToday} onClick={() => p.setAvailableToday(!p.availableToday)} label="Open slots today" />
        </Group>
      )}
      {p.mode === "hosp" && (
        <Group title="Facilities">
          <Check_ on={p.allDay} onClick={() => p.setAllDay(!p.allDay)} label="Open 24/7" />
        </Group>
      )}
      <Group title="Location">
        {p.place && <Check_ on={p.cityChoice === null} onClick={() => p.setCity(null)} label={`Near ${p.place}`} />}
        <Check_ on={p.cityChoice === "" || (p.cityChoice === null && !p.place)} onClick={() => p.setCity("")} label="All cities" />
        {p.cities.slice(0, 8).map((c) => (
          <Check_ key={c} on={p.cityChoice === c} onClick={() => p.setCity(p.cityChoice === c ? "" : c)} label={c} />
        ))}
      </Group>
    </>
  );
}

/** A result's photo, at most 112px square (lg:w-28), resized and sent as WebP. */
function Thumb({ image, alt, fallback, contain = false, load, className }: { image: string | null; alt: string; fallback: ReactNode; contain?: boolean; load: ImageLoad; className: string }) {
  return image ? (
    <RemoteImage src={image} alt={alt} width={112} height={112} load={load} className={`shrink-0 bg-[#EEF1F5] ${contain ? "object-contain" : "object-cover object-top"} ${className}`} />
  ) : (
    <span className={`shrink-0 flex items-center justify-center bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)] text-[#2A4DD0] ${className}`}>{fallback}</span>
  );
}

/** The desktop row's right side: what is paid online, what it covers, and the way in. */
function FeeColumn({ label, fee, note, href, cta }: { label: string; fee: string; note: string; href: string; cta: string }) {
  return (
    <div className="pl-5 border-l border-[#EEF2F7]">
      <span className="block text-[12px] font-bold text-[#5B667A]">{label}</span>
      <span className="block text-[20px] font-extrabold">{fee}</span>
      <span className="block mb-3 text-[12px] text-[#5B667A]">{note}</span>
      <Link href={href} className={`${btnPrimary} w-full`}>
        {cta}
      </Link>
    </div>
  );
}

function DoctorResult({ doctor: d, km, now, fee, load }: { doctor: FindDoctor; km: number | null; now: number; fee: number; load: ImageLoad }) {
  const name = doctorName(d.name);
  const href = d.bookable ? `/book/${d.id}` : `/doctors/${d.id}`;
  const quals = [d.qualifications, d.experience ? `${d.experience}+ yrs` : null].filter(Boolean).join(" · ");
  const where = [d.hospital?.name, km != null ? formatDistance(km) : null].filter(Boolean).join(" · ");
  const next = d.nextSlot ? formatSlot(d.nextSlot, now) : null;
  const photo = <Thumb image={d.image} alt={`Portrait of ${name}`} load={load} fallback={<span className="text-[18px] font-extrabold">{initials(d.name) || <UserRound className="w-6 h-6" />}</span>} className="w-[60px] h-[66px] lg:w-28 lg:h-28 rounded-[14px]" />;
  return (
    <article className={`${card} p-3 lg:p-[18px]`}>
      <div className="lg:grid lg:grid-cols-[112px_minmax(0,1fr)_220px] lg:gap-5 lg:items-center">
        <div className="flex gap-3 lg:contents">
          <Link href={`/doctors/${d.id}`} className="contents">{photo}</Link>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <h3 className="flex items-center gap-[5px] min-w-0 text-[15px] lg:text-[16.5px] font-extrabold">
                <Link href={`/doctors/${d.id}`} className="truncate hover:text-[#2A4DD0] transition-colors">{name}</Link>
                <VerifiedBadge className="w-[15px] h-[15px] lg:w-4 lg:h-4" />
              </h3>
              {d.rating != null && <RatingPill rating={d.rating} className="lg:hidden" />}
            </div>
            <p className="mt-px text-[13px] font-bold text-[#2A4DD0] lg:hidden">{d.specialty || "General"}</p>
            <p className="mt-px text-[12px] lg:text-[13.5px] text-[#5B667A] truncate">
              <span className="hidden lg:inline">{d.specialty || "General"}{quals ? " · " : ""}</span>
              {quals}
            </p>
            {where && (
              <p className="lg:hidden mt-[3px] flex items-center gap-1 text-[12px] text-[#5B667A] min-w-0">
                <MapPin className="w-3 h-3 text-[#7A8599] shrink-0" />
                <span className="truncate">{where}</span>
              </p>
            )}
            <span className="hidden lg:flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[13px] text-[#27324A]">
              {where && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#5B667A]" /> {where}
                </span>
              )}
              {d.rating != null && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[#E0A100]" /> <strong>{d.rating.toFixed(1)}</strong> ({d.reviewCount})
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#5B667A]" /> {next ?? "No open slots yet"}
              </span>
            </span>
          </div>
        </div>
        <div className="lg:hidden grid grid-cols-[minmax(0,1fr)_auto] gap-2 mt-2.5">
          <div className="flex items-center gap-2 h-[38px] px-2.5 rounded-[10px] bg-[#F4F6FA] text-[12px] text-[#4A5878] min-w-0">
            <CalendarDays className="w-[15px] h-[15px] shrink-0" />
            <span className="truncate">
              <strong className="text-[#27324A]">Next:</strong> {next ?? "No open slots yet"}
            </span>
          </div>
          <Link href={href} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] bg-[#2A4DD0] text-white text-[13px] font-extrabold whitespace-nowrap">
            {d.bookable ? "Consult" : "Profile"} <ArrowRight className="w-[13px] h-[13px]" strokeWidth={2.6} />
          </Link>
        </div>
        {d.bookable && (
          <p className="lg:hidden mt-2 text-[11.5px] text-[#5B667A]">
            Booking fee <strong className="text-[#0B1B3F]">{formatINR(fee)}</strong> · consultation paid at the hospital
          </p>
        )}
        <div className="hidden lg:block">
          <FeeColumn
            label="Booking fee"
            fee={formatINR(fee)}
            note="Consultation fee paid at the hospital"
            href={href}
            cta={d.bookable ? "Book appointment" : "View profile"}
          />
        </div>
      </div>
    </article>
  );
}

function HospitalResult({ hospital: h, km, fee, load }: { hospital: HomeHospital; km: number | null; fee: number; load: ImageLoad }) {
  const area = [placeOf(h), km != null ? formatDistance(km) : null].filter(Boolean).join(" · ");
  const doctors = count(h.doctors, ["doctor", "doctors"]);
  return (
    <Link href={`/hospitals/${h.id}`} className={`group block ${card} p-3 lg:p-[18px]`}>
      <span className="flex gap-3 lg:grid lg:grid-cols-[112px_minmax(0,1fr)_220px] lg:gap-5 lg:items-center">
        <Thumb image={h.image} alt="" load={load} fallback={<Building2 className="w-9 h-9" strokeWidth={1.5} />} className="w-[92px] h-[104px] lg:w-28 lg:h-28 rounded-[14px]" />
        <span className="flex-1 min-w-0 flex flex-col gap-[3px] lg:gap-0">
          <span className="flex justify-between gap-1.5">
            <span className="flex items-center gap-[5px] min-w-0 text-[14.5px] lg:text-[16.5px] font-extrabold">
              <span className="truncate group-hover:text-[#2A4DD0] transition-colors">{h.name}</span>
              <VerifiedBadge className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </span>
            {h.rating != null && <RatingPill rating={h.rating} className="lg:hidden" />}
          </span>
          <span className="text-[12px] lg:text-[13.5px] lg:mt-0.5 text-[#5B667A] truncate">{hospitalTags(h)}</span>
          <span className="flex items-center gap-1 text-[12px] lg:text-[13px] lg:mt-2.5 text-[#5B667A] lg:text-[#27324A] min-w-0">
            <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#7A8599] shrink-0" />
            <span className="truncate">{area}</span>
            {h.rating != null && (
              <span className="hidden lg:flex items-center gap-1.5 ml-3">
                <Star className="w-3.5 h-3.5 text-[#E0A100]" /> <strong>{h.rating.toFixed(1)}</strong> ({h.reviewCount})
              </span>
            )}
          </span>
          <Dots items={[h.open247 && "Open 24/7", doctors, h.facility]} className="mt-0.5 lg:mt-2" />
          <span className="lg:hidden flex items-center gap-1 mt-auto pt-1 text-[12.5px] font-extrabold text-[#2A4DD0]">
            View doctors <ArrowRight className="w-[13px] h-[13px]" strokeWidth={2.6} />
          </span>
        </span>
        <span className="hidden lg:block pl-5 border-l border-[#EEF2F7]">
          <span className="block text-[12px] font-bold text-[#5B667A]">Booking fee</span>
          <span className="block text-[20px] font-extrabold">{formatINR(fee)}</span>
          <span className="block mb-3 text-[12px] text-[#5B667A]">Per visit · consultation at the hospital</span>
          <span className={`${btnPrimary} w-full`}>View hospital</span>
        </span>
      </span>
    </Link>
  );
}

function LabResult({ lab: l, km, percent, load }: { lab: FindLab; km: number | null; percent: number; load: ImageLoad }) {
  const area = [l.address?.split(",")[0]?.trim() || l.city, km != null ? formatDistance(km) : null].filter(Boolean).join(" · ");
  return (
    <Link href={`/book/diagnostic/${l.id}`} className={`group block ${card} p-3 lg:p-[18px]`}>
      <span className="flex gap-3 lg:grid lg:grid-cols-[112px_minmax(0,1fr)_220px] lg:gap-5 lg:items-center">
        <Thumb image={l.image ?? "/images/home/lab-microscope.webp"} alt="" contain={!l.image} load={load} fallback={<FlaskConical className="w-9 h-9" />} className={`w-[92px] h-[104px] lg:w-28 lg:h-28 rounded-[14px] ${l.image ? "" : "p-2 bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)]!"}`} />
        <span className="flex-1 min-w-0 flex flex-col gap-[3px] lg:gap-0">
          <span className="flex items-center gap-[5px] min-w-0 text-[14.5px] lg:text-[16.5px] font-extrabold">
            <span className="truncate group-hover:text-[#2A4DD0] transition-colors">{l.name}</span>
            <VerifiedBadge className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </span>
          <span className="text-[12px] lg:text-[13.5px] lg:mt-0.5 text-[#5B667A] truncate">
            {l.tests ? `${count(l.tests, ["test", "tests"])} with prices` : "Diagnostic centre"}
          </span>
          <span className="flex items-center gap-1 text-[12px] lg:text-[13px] lg:mt-2.5 text-[#5B667A] lg:text-[#27324A] min-w-0">
            <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#7A8599] shrink-0" />
            <span className="truncate">{area || "Partner lab"}</span>
          </span>
          <Dots items={["Book by day", "Reports in your account"]} className="mt-0.5 lg:mt-2" />
          <span className="lg:hidden flex items-center gap-1 mt-auto pt-1 text-[12.5px] font-extrabold text-[#2A4DD0]">
            Choose tests <ArrowRight className="w-[13px] h-[13px]" strokeWidth={2.6} />
          </span>
        </span>
        <span className="hidden lg:block pl-5 border-l border-[#EEF2F7]">
          <span className="block text-[12px] font-bold text-[#5B667A]">Booking charge</span>
          <span className="block text-[20px] font-extrabold">{percent}%</span>
          <span className="block mb-3 text-[12px] text-[#5B667A]">of each test&apos;s price, rest at the lab</span>
          <span className={`${btnPrimary} w-full`}>Choose tests</span>
        </span>
      </span>
    </Link>
  );
}
