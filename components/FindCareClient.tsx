"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlarmClock, ArrowRight, ArrowUpDown, Building2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  Map as MapIcon, MapPin, Navigation, Search, SearchX, SlidersHorizontal, Stethoscope, X, Zap,
} from "lucide-react";
import { PatientDock } from "@/components/PatientDock";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { doctorName, formatINR, formatSlot, initials } from "@/components/patient/format";
import type { Clinic } from "@/components/patient/CareMap";

const CareMap = dynamic(() => import("@/components/patient/CareMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-sm text-indigo-gray-600 bg-surface-container-highest">Loading map…</div>,
});

export interface FindDoctor {
  id: string;
  name: string | null;
  specialty: string | null;
  qualifications: string | null;
  experience: number | null;
  fee: number | null;
  image: string | null;
  hospital: { id: string; name: string; city: string | null; address: string | null } | null;
  nextSlot: string | null;
  openToday: number;
}

type Sort = "soonest" | "fee" | "experience";

interface FindCareClientProps {
  doctors: FindDoctor[];
  now: number;
  initial: { q: string; specialty: string; city: string; availableToday: boolean };
  account: { isSignedIn: boolean; name: string | null; email: string | null };
}

const PAGE = 8;

// Leaflet needs a visible, sized container, so the inline map only mounts on wide screens.
const wideQuery = "(min-width: 1024px)";
const subscribeWide = (onChange: () => void) => {
  const mq = window.matchMedia(wideQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useIsWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => false);

export function FindCareClient({ doctors, now, initial, account }: FindCareClientProps) {
  const specialties = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of doctors) if (d.specialty) counts.set(d.specialty, (counts.get(d.specialty) ?? 0) + 1);
    return Array.from(counts.keys()).sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b));
  }, [doctors]);
  const cities = useMemo(
    () => Array.from(new Set(doctors.map((d) => d.hospital?.city).filter(Boolean) as string[])).sort(),
    [doctors],
  );

  const [query, setQuery] = useState(initial.q);
  const [specialty, setSpecialty] = useState(() => specialties.find((s) => s.toLowerCase() === initial.specialty.toLowerCase()) ?? "");
  const [city, setCity] = useState(() => cities.find((c) => c.toLowerCase() === initial.city.toLowerCase()) ?? "");
  const [availableToday, setAvailableToday] = useState(initial.availableToday);
  const [sort, setSort] = useState<Sort>("soonest");
  const [visible, setVisible] = useState(PAGE);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const isWide = useIsWide();
  const pills = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = doctors.filter((d) => {
      if (specialty && d.specialty !== specialty) return false;
      if (city && d.hospital?.city !== city) return false;
      if (availableToday && d.openToday === 0) return false;
      if (!q) return true;
      return [d.name, d.specialty, d.hospital?.name, d.hospital?.city].some((v) => v?.toLowerCase().includes(q));
    });
    const last = (v: number | null, empty: number) => (v == null ? empty : v);
    return list.sort((a, b) => {
      if (sort === "fee") return last(a.fee, Infinity) - last(b.fee, Infinity);
      if (sort === "experience") return last(b.experience, -1) - last(a.experience, -1);
      return (a.nextSlot ?? "￿").localeCompare(b.nextSlot ?? "￿");
    });
  }, [doctors, query, specialty, city, availableToday, sort]);

  const clinics: Clinic[] = useMemo(() => {
    const byId = new Map<string, Clinic>();
    for (const d of filtered) {
      if (!d.hospital) continue;
      const clinic = byId.get(d.hospital.id) ?? { ...d.hospital, doctorCount: 0 };
      clinic.doctorCount++;
      byId.set(d.hospital.id, clinic);
    }
    return Array.from(byId.values());
  }, [filtered]);

  const clinic = clinics.find((c) => c.id === selectedClinic) ?? null;
  const openTodayCount = filtered.filter((d) => d.openToday > 0).length;
  const filtersActive = Boolean(query || specialty || city || availableToday);

  const reset = () => {
    setQuery("");
    setSpecialty("");
    setCity("");
    setAvailableToday(false);
    setVisible(PAGE);
  };
  const pickSpecialty = (value: string) => {
    setSpecialty(value);
    setVisible(PAGE);
  };
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const mapPanel = (
    <div className="w-full h-full rounded-3xl overflow-hidden shadow-lg relative bg-surface-container-highest">
      <CareMap clinics={clinics} selectedId={selectedClinic} onSelect={setSelectedClinic} />
      <div className="absolute top-4 left-4 z-[500] px-3.5 py-2 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-vibrant-blue" />
        <span className="font-label-sm text-label-sm text-on-surface font-semibold">{city || "All cities"}</span>
        <span className="font-label-sm text-[11px] text-outline">| {clinics.length} {clinics.length === 1 ? "Hospital" : "Hospitals"}</span>
      </div>
      {clinic && (
        <div className="absolute bottom-6 left-4 right-4 z-[500]">
          <div className="w-full bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shrink-0 shadow-sm">
                <Building2 className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-title-md text-body-md font-bold text-on-surface truncate">{clinic.name}</span>
                  <span className="px-2 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-[11px] font-bold shrink-0">
                    {clinic.doctorCount} {clinic.doctorCount === 1 ? "doctor" : "doctors"}
                  </span>
                </div>
                <p className="font-body-md text-label-sm text-indigo-gray-600 truncate">{[clinic.address, clinic.city].filter(Boolean).join(" • ") || "Address not listed"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end shrink-0">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([clinic.name, clinic.address, clinic.city].filter(Boolean).join(", "))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-title-md text-label-sm font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1"
              >
                <Navigation className="w-4 h-4" /> Directions
              </a>
              <Link href={`/hospitals/${clinic.id}`} className="px-4 py-2 rounded-full bg-vibrant-blue text-on-primary font-title-md text-label-sm font-semibold hover:bg-primary transition-all shadow-sm flex items-center gap-1">
                View Hospital <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen">
      <PatientNavHeader isSignedIn={account.isSignedIn} name={account.name} email={account.email} container="max-w-[1536px] px-margin-x-mobile lg:px-margin-x-desktop" />

      <main className="w-full pb-28 md:pb-32">
        {/* Search & filters */}
        <section className="w-full md:bg-surface-container-low/70 md:backdrop-blur-md px-margin-x-mobile lg:px-margin-x-desktop pt-1 pb-4 md:py-8">
          <div className="max-w-[1536px] mx-auto flex flex-col gap-3 md:gap-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
              <form onSubmit={submitSearch} className="relative flex-1 group" role="search">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-on-surface-variant md:text-outline group-focus-within:text-vibrant-blue transition-colors pointer-events-none" />
                <input
                  className="w-full h-14 md:h-auto pl-12 pr-14 md:pr-40 md:py-3.5 bg-surface-container-lowest rounded-xl md:rounded-full font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all placeholder:text-on-surface-variant md:placeholder:text-outline"
                  placeholder="Search doctors, specialties or hospitals..."
                  aria-label="Search doctors"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisible(PAGE);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFiltersOpen((o) => !o)}
                  aria-label="Filters"
                  aria-expanded={filtersOpen}
                  className="md:hidden absolute right-2 top-2 w-10 h-10 flex items-center justify-center bg-primary text-on-primary rounded-lg"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  className="hidden md:flex absolute inset-y-1.5 right-1.5 px-6 rounded-full bg-vibrant-blue text-on-primary font-title-md text-body-md font-semibold hover:bg-primary transition-all items-center gap-2 shadow-sm"
                >
                  Find Care <ArrowRight className="w-[18px] h-[18px]" />
                </button>
              </form>

              <label className="hidden md:flex items-center gap-2 px-4 py-3 bg-surface-container-lowest rounded-full shadow-sm self-end lg:self-auto">
                <MapPin className="w-5 h-5 text-vibrant-blue" />
                <span className="sr-only">City</span>
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setVisible(PAGE);
                  }}
                  className="bg-transparent font-body-md text-body-md text-on-surface font-medium focus:outline-none cursor-pointer"
                >
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Phone filter panel */}
            {filtersOpen && (
              <div className="md:hidden p-4 bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-label-sm font-bold text-on-surface">Filters</span>
                  <button type="button" onClick={reset} className="text-label-sm text-primary font-semibold">Reset</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] font-semibold text-indigo-gray-600">
                    City
                    <select value={city} onChange={(e) => setCity(e.target.value)} className="px-2.5 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface font-medium focus:outline-none">
                      <option value="">All cities</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-semibold text-indigo-gray-600">
                    Sort by
                    <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="px-2.5 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface font-medium focus:outline-none">
                      <option value="soonest">Soonest available</option>
                      <option value="fee">Lowest fee</option>
                      <option value="experience">Most experienced</option>
                    </select>
                  </label>
                </div>
                <AvailableTodayToggle checked={availableToday} onChange={setAvailableToday} />
              </div>
            )}

            {/* Specialty pills */}
            <div className="relative flex items-center">
              <button
                type="button"
                aria-label="Scroll specialties left"
                onClick={() => pills.current?.scrollBy({ left: -280, behavior: "smooth" })}
                className="hidden md:flex absolute -left-3 z-10 w-9 h-9 rounded-full bg-surface-container-lowest/95 shadow-md items-center justify-center text-on-surface hover:text-vibrant-blue"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div
                ref={pills}
                className="flex items-center gap-2 md:gap-2.5 overflow-x-auto pb-1 pt-1 -mx-margin-x-mobile px-margin-x-mobile md:mx-0 md:px-7 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full"
              >
                <SpecialtyPill active={!specialty} onClick={() => pickSpecialty("")} icon>All Specialists</SpecialtyPill>
                {specialties.map((s) => (
                  <SpecialtyPill key={s} active={specialty === s} onClick={() => pickSpecialty(specialty === s ? "" : s)}>
                    {s}
                  </SpecialtyPill>
                ))}
              </div>
              <button
                type="button"
                aria-label="Scroll specialties right"
                onClick={() => pills.current?.scrollBy({ left: 280, behavior: "smooth" })}
                className="hidden md:flex absolute -right-3 z-10 w-9 h-9 rounded-full bg-surface-container-lowest/95 shadow-md items-center justify-center text-on-surface hover:text-vibrant-blue"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Secondary filters */}
            <div className="hidden md:flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-surface-container-high/60">
              <div className="flex flex-wrap items-center gap-2.5">
                <AvailableTodayToggle checked={availableToday} onChange={setAvailableToday} pill />
                {filtersActive && (
                  <button type="button" onClick={reset} className="px-4 py-1.5 rounded-full text-label-sm font-semibold text-vibrant-blue hover:bg-surface-container-lowest flex items-center gap-1">
                    <X className="w-4 h-4" /> Clear filters
                  </button>
                )}
              </div>
              <label className="flex items-center gap-3 font-label-sm text-label-sm text-outline">
                Sort:
                <span className="flex items-center gap-1 text-on-surface font-semibold">
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent font-semibold cursor-pointer focus:outline-none">
                    <option value="soonest">Next Available Slot</option>
                    <option value="fee">Fee: Low to High</option>
                    <option value="experience">Experience: High to Low</option>
                  </select>
                  <ArrowUpDown className="w-4 h-4" />
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Results + map */}
        <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop md:py-8 max-w-[1536px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div ref={results} className="scroll-mt-20 w-full lg:w-[58%] xl:w-[60%] flex flex-col gap-4 md:gap-6">
              {/* Phone & tablet: map teaser */}
              {clinics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="lg:hidden relative w-full h-36 md:h-40 rounded-2xl overflow-hidden shadow-sm text-left bg-[radial-gradient(#c2c6d8_1px,transparent_1px)] [background-size:18px_18px] bg-surface-container-highest"
                >
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-primary-fixed/70 via-transparent to-secondary-fixed/40" />
                  <span className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-inverse-surface/20 to-transparent flex items-end justify-between p-4 gap-3">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                        <MapIcon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-label-sm text-on-primary">Interactive Map View</span>
                        <span className="block text-[11px] text-inverse-on-surface/80 truncate">
                          {clinics.length} {clinics.length === 1 ? "hospital" : "hospitals"} with matching doctors
                        </span>
                      </span>
                    </span>
                    <span className="px-3 py-1.5 bg-surface/90 text-on-surface backdrop-blur-md rounded-full text-label-sm font-semibold shrink-0">Explore Map</span>
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between gap-3 md:px-2">
                <div>
                  <h2 className="font-title-md text-title-md md:font-headline-lg text-on-surface md:font-bold tracking-tight">Available Doctors</h2>
                  <p className="hidden md:block font-body-md text-label-sm text-indigo-gray-600 mt-0.5">
                    {filtered.length} verified {filtered.length === 1 ? "doctor" : "doctors"} {city ? `in ${city}` : "across all cities"}
                  </p>
                </div>
                <span className="md:hidden text-label-sm text-on-surface-variant">
                  Showing {Math.min(visible, filtered.length)} of {filtered.length}
                </span>
                {openTodayCount > 0 && (
                  <span className="hidden sm:flex items-center gap-2 font-label-sm text-label-sm text-secondary font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal" />
                    {openTodayCount} with open slots today
                  </span>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="w-full bg-surface-container-lowest rounded-2xl p-10 md:p-12 text-center shadow-sm">
                  <SearchX className="w-12 h-12 text-outline mx-auto mb-3" />
                  <h3 className="font-title-md text-lg font-bold text-on-surface">No doctors match these filters</h3>
                  <p className="font-body-md text-label-sm text-indigo-gray-600 mt-1">Try another specialty or city, or clear the search.</p>
                  {filtersActive && (
                    <button type="button" onClick={reset} className="mt-4 px-6 py-2 rounded-full bg-vibrant-blue text-on-primary font-bold text-sm hover:bg-primary transition-all">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filtered.slice(0, visible).map((d) => (
                  <DoctorCard
                    key={d.id}
                    doctor={d}
                    now={now}
                    selected={!!d.hospital && d.hospital.id === selectedClinic}
                    onSelect={() => d.hospital && setSelectedClinic(d.hospital.id)}
                  />
                ))
              )}

              {visible < filtered.length && (
                <div className="py-4 md:py-6 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE)}
                    className="px-8 py-3 rounded-full bg-surface-container-lowest text-on-surface font-title-md text-body-md font-semibold shadow-sm hover:bg-surface-container transition-colors flex items-center gap-2"
                  >
                    Show {Math.min(PAGE, filtered.length - visible)} More Doctors
                    <ChevronDown className="w-5 h-5 text-vibrant-blue" />
                  </button>
                </div>
              )}
            </div>

            {/* Desktop: sticky map */}
            <div className="hidden lg:block w-[42%] xl:w-[40%] sticky top-8 h-[calc(100vh-9rem)]">{isWide && mapPanel}</div>
          </div>
        </div>
      </main>

      {/* Phone & tablet: full-screen map */}
      {mapOpen && !isWide && (
        <div className="fixed inset-0 z-[70] bg-background flex flex-col" role="dialog" aria-modal="true" aria-label="Map of hospitals">
          <div className="h-16 px-margin-x-mobile flex items-center justify-between shrink-0">
            <span className="font-title-md text-title-md text-on-surface">Hospitals on the map</span>
            <button type="button" aria-label="Close map" onClick={() => setMapOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 px-3 pb-3">{mapPanel}</div>
        </div>
      )}

      <PatientDock activeTab="find" isSignedIn={account.isSignedIn} name={account.name} />
    </div>
  );
}

function SpecialtyPill({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 md:px-5 py-2.5 md:py-2 rounded-full text-label-sm md:font-body-md md:text-body-md whitespace-nowrap transition-all shadow-sm shrink-0 flex items-center gap-1.5 ${
        active ? "bg-primary md:bg-vibrant-blue text-on-primary font-semibold" : "bg-surface-container-low md:bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {icon && <Stethoscope className="w-4 h-4 md:hidden" />}
      {children}
    </button>
  );
}

function AvailableTodayToggle({ checked, onChange, pill }: { checked: boolean; onChange: (v: boolean) => void; pill?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`${pill ? "px-4 py-1.5" : "px-3 py-2 justify-center"} rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors ${
        checked ? "bg-fresh-teal/15 text-secondary ring-1 ring-fresh-teal/40" : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
      }`}
    >
      <Zap className={`w-4 h-4 ${checked ? "text-secondary" : "text-fresh-teal"}`} />
      Available today
    </button>
  );
}

function DoctorCard({ doctor: d, now, selected, onSelect }: { doctor: FindDoctor; now: number; selected: boolean; onSelect: () => void }) {
  const name = doctorName(d.name);
  const today = d.openToday > 0;
  return (
    <article
      onClick={onSelect}
      className={`w-full bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
        selected ? "ring-2 ring-vibrant-blue/40" : ""
      }`}
    >
      <div aria-hidden className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 via-transparent to-transparent rounded-bl-full pointer-events-none" />
      <div className="flex gap-4 md:gap-5 items-start">
        <div className="relative shrink-0">
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="w-20 h-20 md:w-28 md:h-28 rounded-xl md:rounded-2xl object-cover bg-surface-container" src={d.image} alt={name} />
          ) : (
            <span className="w-20 h-20 md:w-28 md:h-28 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-fixed to-surface-container flex items-center justify-center text-primary font-headline-lg text-2xl md:text-3xl font-bold">
              {initials(d.name)}
            </span>
          )}
          {today && <span title="Open slots today" className="md:hidden absolute bottom-1 right-1 w-3.5 h-3.5 border-2 border-surface rounded-full bg-fresh-teal" />}
          {today && (
            <span className="hidden md:flex absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-fresh-teal text-on-primary font-label-sm text-[11px] font-bold shadow-sm items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest" /> TODAY
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1 md:mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-vibrant-blue rounded-md md:rounded-full text-[10px] md:font-label-sm md:text-label-sm font-bold md:tracking-wide md:uppercase truncate">
                {d.specialty || "Specialist"}
              </span>
              {d.experience ? <span className="hidden md:inline font-label-sm text-label-sm text-outline font-normal">{d.experience} yrs exp</span> : null}
            </div>
            {d.fee ? (
              <span className="hidden md:inline font-headline-lg text-title-md font-bold text-on-surface">
                {formatINR(d.fee)} <span className="text-outline font-normal text-label-sm">/ visit</span>
              </span>
            ) : null}
          </div>
          <Link
            href={`/doctors/${d.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-title-md text-title-md md:font-headline-lg md:text-body-lg font-semibold md:font-bold text-on-surface hover:text-vibrant-blue transition-colors block truncate"
          >
            {name}
          </Link>
          <p className={`font-body-md text-sm md:text-label-sm text-on-surface-variant md:text-indigo-gray-600 md:font-medium truncate ${d.qualifications ? "" : "hidden md:block"}`}>
            {d.qualifications || `${d.specialty || "Specialist"} consultations`}
          </p>
          {d.hospital && (
            <p className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2 text-indigo-gray-600 font-body-md text-label-sm min-w-0">
              <Building2 className="w-4 h-4 text-outline shrink-0" />
              <span className="truncate">{[d.hospital.name, d.hospital.city].filter(Boolean).join(" • ")}</span>
            </p>
          )}
          <p className="md:hidden mt-1 text-label-sm text-on-surface-variant">
            {[d.experience ? `${d.experience} yrs exp` : null, d.fee ? `${formatINR(d.fee)} / visit` : null].filter(Boolean).join(" • ")}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 md:pt-3 border-t border-indigo-gray-50 md:border-surface-container flex flex-wrap items-center justify-between gap-3">
        <span className="hidden md:flex px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm items-center gap-1.5 font-medium">
          <Building2 className="w-[15px] h-[15px] text-secondary" /> In-person visit
        </span>
        <NextSlot doctor={d} now={now} />
        <Link
          href={`/book/${d.id}`}
          onClick={(e) => e.stopPropagation()}
          className="md:hidden px-5 py-2.5 bg-primary text-on-primary rounded-full text-label-sm shadow-sm"
        >
          Book Now
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-3 mt-4">
        <Link
          href={`/book/${d.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-2.5 px-4 rounded-full bg-vibrant-blue text-on-primary font-title-md text-body-md font-semibold hover:bg-primary transition-all shadow-sm flex items-center justify-center gap-2"
        >
          Book Now <CalendarDays className="w-[18px] h-[18px]" />
        </Link>
        <Link
          href={`/doctors/${d.id}`}
          onClick={(e) => e.stopPropagation()}
          className="py-2.5 px-5 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container font-title-md text-body-md font-semibold transition-colors"
        >
          View Full Profile
        </Link>
      </div>
    </article>
  );
}

function NextSlot({ doctor, now }: { doctor: FindDoctor; now: number }) {
  if (!doctor.nextSlot) {
    return <span className="text-label-sm text-on-surface-variant">No open slots in the next 30 days</span>;
  }
  const label = formatSlot(doctor.nextSlot, now);
  return doctor.openToday > 0 ? (
    <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary md:text-secondary font-semibold">
      <AlarmClock className="w-4 h-4 text-fresh-teal" /> Available {label}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant md:text-indigo-gray-600 font-medium">
      <CalendarDays className="w-4 h-4 text-outline" /> {label}
    </span>
  );
}
