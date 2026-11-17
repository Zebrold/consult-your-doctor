"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ChevronDown, FlaskConical, MapPin, Search, SearchX, Star } from "lucide-react";
import { PhoneHeader } from "@/components/patient/PhoneHeader";
import { LocationMenu, useLocationMenu } from "@/components/patient/LocationMenu";
import { byNearness, usePatientLocation } from "@/components/patient/location";
import { VerifiedBadge } from "@/components/home/ui";
import type { HomeHospital } from "@/components/home/types";
import { formatINR } from "@/components/patient/format";
import { formatDistance, sameCity } from "@/lib/geo";
import { hospitalTags, placeOf } from "./HospitalCards";
import { Dots, PageBody, RatingPill, btnPrimary, card } from "./app-ui";
import { RemoteImage, type ImageLoad } from "@/components/RemoteImage";

// The partner hospital list (/hospitals) and lab list (/diagnostics): a search box, the place to sort by, and one
// card per hospital or lab. It replaced the old Find screen (map, tabs and filters), which the user had removed.

export type DirectoryLab = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image: string | null;
  tests: number;
  lat: number | null;
  lng: number | null;
  /** The tests it prices, so a search for a test finds the labs that do it. */
  testNames: string[];
};

type Account = { isSignedIn: boolean; name: string | null; email: string | null };
type Common = { account: Account; initialQuery: string; initialCity: string };

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const has = (q: string, ...texts: (string | null | undefined)[]) => texts.some((t) => t?.toLowerCase().includes(q));

export function HospitalDirectory({ hospitals, fee, ...common }: Common & { hospitals: HomeHospital[]; fee: number }) {
  return (
    <DirectoryFrame
      {...common}
      eyebrow="Hospitals"
      title="Partner hospitals"
      noun={["partner hospital", "partner hospitals"]}
      placeholder="Search a hospital, area or speciality"
      items={hospitals}
      matches={(h, q) => has(q, h.name, h.city, h.address, ...h.specialties.map((s) => s.name))}
      render={(h, km, load) => <HospitalResult key={h.id} hospital={h} km={km} fee={fee} load={load} />}
    />
  );
}

export function LabDirectory({ labs, percent, ...common }: Common & { labs: DirectoryLab[]; percent: number }) {
  return (
    <DirectoryFrame
      {...common}
      eyebrow="Lab tests"
      title="Book a lab test"
      noun={["partner lab", "partner labs"]}
      placeholder="Search a test, lab or area"
      items={labs}
      matches={(l, q) => has(q, l.name, l.city, l.address, ...l.testNames)}
      render={(l, km, load) => <LabResult key={l.id} lab={l} km={km} percent={percent} load={load} />}
    />
  );
}

type Placed = { id: string; city: string | null; lat: number | null; lng: number | null };

function DirectoryFrame<T extends Placed>({
  account,
  initialQuery,
  initialCity,
  eyebrow,
  title,
  noun,
  placeholder,
  items,
  matches,
  render,
}: Common & {
  eyebrow: string;
  title: string;
  noun: [string, string];
  placeholder: string;
  items: T[];
  matches: (item: T, q: string) => boolean;
  render: (item: T, km: number | null, load: ImageLoad) => ReactNode;
}) {
  const cities = Array.from(new Set(items.map((i) => i.city).filter(Boolean) as string[])).sort();
  const place = usePatientLocation(cities);
  const loc = useLocationMenu();
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();
  const where = place.location?.label ?? (initialCity || null);
  // A city in the link (/hospitals/in/<city>) narrows the list until the patient sets a location of their own.
  const inCity = !place.location && initialCity ? items.filter((i) => sameCity(i.city, initialCity)) : items;
  const rows = byNearness(inCity, place.location).filter(({ item }) => !q || matches(item, q));

  return (
    <>
      <PhoneHeader
        isSignedIn={account.isSignedIn}
        name={account.name}
        email={account.email}
        eyebrow={eyebrow}
        title={title}
        subtitle={`${count(inCity.length, noun[0], noun[1])}${where ? ` · nearest to ${where} first` : ""}`}
        container="max-w-[1100px] px-4 md:px-6"
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur();
          }}
          className="relative flex items-center gap-2.5 h-12 px-3.5 rounded-[14px] bg-white text-[#0B1B3F] shadow-[0_8px_18px_rgba(11,27,63,0.18)] lg:max-w-[560px]"
        >
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <label htmlFor="directory-search" className="sr-only">
            {placeholder}
          </label>
          <input
            id="directory-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] placeholder:text-[#7A8599]"
          />
        </form>
      </PhoneHeader>

      <PageBody>
        <div className="max-w-[1100px] lg:max-w-none px-4 md:px-6 lg:px-0 pt-5 lg:pt-0 pb-28 lg:pb-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
            <p className="text-[13.5px] font-bold text-[#5B667A]">
              {q ? `${count(rows.length, noun[0], noun[1])} for “${query.trim()}”` : count(rows.length, noun[0], noun[1])}
            </p>
            <button
              type="button"
              onClick={loc.toggle}
              aria-haspopup="dialog"
              aria-expanded={loc.open}
              className="inline-flex items-center gap-1 text-[13.5px] font-bold text-[#2A4DD0] hover:underline underline-offset-4"
            >
              <MapPin className="w-3.5 h-3.5" />
              {place.location ? `Nearest to ${place.location.label}` : "Set your location"}
              <ChevronDown className="w-3 h-3" strokeWidth={2.6} />
            </button>
          </div>

          {rows.length === 0 ? (
            <div className={`${card} p-6 text-center`}>
              <SearchX className="mx-auto w-8 h-8 text-[#7A8599]" />
              <p className="mt-2 text-[15px] font-extrabold">Nothing matches {q ? `“${query.trim()}”` : "here yet"}</p>
              <p className="mt-1 text-[13px] text-[#5B667A]">
                Try another word, or{" "}
                <Link href="/specialities" className="font-extrabold text-[#2A4DD0] hover:underline">
                  browse specialities
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:gap-3.5">{rows.map(({ item, km }, i) => render(item, km, i < 3 ? "eager" : "lazy"))}</div>
          )}
        </div>
      </PageBody>

      {loc.anchor && <LocationMenu place={place} cities={cities} anchor={loc.anchor} onClose={loc.close} />}
    </>
  );
}

function Thumb({ image, alt, fallback, contain = false, load, className }: { image: string | null; alt: string; fallback: ReactNode; contain?: boolean; load: ImageLoad; className: string }) {
  return image ? (
    <RemoteImage src={image} alt={alt} width={112} height={112} load={load} className={`shrink-0 bg-[#EEF1F5] ${contain ? "object-contain" : "object-cover object-top"} ${className}`} />
  ) : (
    <span className={`shrink-0 flex items-center justify-center bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)] text-[#2A4DD0] ${className}`}>{fallback}</span>
  );
}

function HospitalResult({ hospital: h, km, fee, load }: { hospital: HomeHospital; km: number | null; fee: number; load: ImageLoad }) {
  const area = [placeOf(h), km != null ? formatDistance(km) : null].filter(Boolean).join(" · ");
  return (
    <Link href={`/hospitals/${h.id}`} className={`group block ${card} p-3 lg:p-[18px]`}>
      <span className="flex gap-3 lg:grid lg:grid-cols-[112px_minmax(0,1fr)_220px] lg:gap-5 lg:items-center">
        <Thumb image={h.image} alt="" load={load} fallback={<Building2 className="w-9 h-9" strokeWidth={1.5} />} className="w-[92px] h-[104px] lg:w-28 lg:h-28 rounded-[14px]" />
        <span className="flex-1 min-w-0 flex flex-col gap-[3px] lg:gap-0">
          <span className="flex justify-between gap-1.5">
            <span className="flex items-center gap-[5px] min-w-0 text-[14.5px] lg:text-[16.5px] font-extrabold">
              <span className="truncate group-hover:text-[#2A4DD0] transition-colors">{h.name}</span>
              <VerifiedBadge hospitalId={h.id} className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
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
          <Dots items={[h.open247 && "Open 24/7", count(h.doctors, "doctor", "doctors"), h.facility]} className="mt-0.5 lg:mt-2" />
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

function LabResult({ lab: l, km, percent, load }: { lab: DirectoryLab; km: number | null; percent: number; load: ImageLoad }) {
  const area = [l.address?.split(",")[0]?.trim() || l.city, km != null ? formatDistance(km) : null].filter(Boolean).join(" · ");
  return (
    <Link href={`/book/diagnostic/${l.id}`} className={`group block ${card} p-3 lg:p-[18px]`}>
      <span className="flex gap-3 lg:grid lg:grid-cols-[112px_minmax(0,1fr)_220px] lg:gap-5 lg:items-center">
        <Thumb image={l.image ?? "/images/home/lab-microscope.webp"} alt="" contain={!l.image} load={load} fallback={<FlaskConical className="w-9 h-9" />} className={`w-[92px] h-[104px] lg:w-28 lg:h-28 rounded-[14px] ${l.image ? "" : "p-2 bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)]!"}`} />
        <span className="flex-1 min-w-0 flex flex-col gap-[3px] lg:gap-0">
          <span className="flex items-center gap-[5px] min-w-0 text-[14.5px] lg:text-[16.5px] font-extrabold">
            <span className="truncate group-hover:text-[#2A4DD0] transition-colors">{l.name}</span>
            <VerifiedBadge sample className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </span>
          <span className="text-[12px] lg:text-[13.5px] lg:mt-0.5 text-[#5B667A] truncate">{l.tests ? `${count(l.tests, "test", "tests")} with prices` : "Diagnostic centre"}</span>
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
