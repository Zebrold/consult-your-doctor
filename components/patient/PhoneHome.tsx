"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Bell, Building2, CalendarClock, CalendarDays, ChevronDown, ChevronRight, Ellipsis, FlaskConical, Globe2,
  LifeBuoy, LoaderCircle, LocateFixed, LogIn, LogOut, MapPin, Menu, Plus, Search, SlidersHorizontal, Star, Stethoscope,
  UserRound, X, type LucideIcon,
} from "lucide-react";
import type { HomeDoctor } from "@/components/PatientHome";
import { doctorName, formatDayLabel, formatINR, initials } from "@/components/patient/format";
import { specialtyMeta } from "@/components/patient/specialties";
import { byNearness, type usePatientLocation } from "@/components/patient/location";
import { formatDistance } from "@/lib/geo";

// The patient home on phones: the blue header with the greeting, location and search, the specialty shortcuts and
// the doctors nearest the patient. Tablets and desktops keep the wider layout in PatientHome; the sections after
// this (hospitals near you, reviews) are shared.

type Place = ReturnType<typeof usePatientLocation>;

type Props = {
  name: string | null;
  email: string | null;
  isSignedIn: boolean;
  now: number;
  /** "Your next visit: ..." when the patient has one coming up. */
  visitLine: string | null;
  /** Every bookable doctor, soonest available first. */
  doctors: HomeDoctor[];
  specialties: { name: string; count: number }[];
  /** Cities with partner hospitals or labs. */
  cities: string[];
  place: Place;
};

export function PhoneHome({ name, email, isSignedIn, now, visitLine, doctors, specialties, cities, place }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<"location" | "menu" | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const location = place.location;

  // Nearest first once the patient has shared a location; only doctors in their area, unless there are none.
  const ordered = useMemo(() => byNearness(doctors, location), [doctors, location]);
  const nearby = location ? ordered.filter((r) => r.inArea) : ordered;
  const shown = (nearby.length ? nearby : ordered).slice(0, 5);
  const noneNearby = !!location && nearby.length === 0 && doctors.length > 0;
  const findHref = location?.kind === "city" ? `/find?city=${encodeURIComponent(location.city)}` : "/find";

  const search = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location?.kind === "city") params.set("city", location.city);
    router.push(params.size ? `/find?${params}` : "/find");
  };

  return (
    <div className="md:hidden">
      <h1 className="sr-only">Find doctors and hospitals near you</h1>

      {/* Blue header: brand, greeting, location and search */}
      <section className="relative overflow-hidden rounded-b-[32px] bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-6 shadow-[0_14px_30px_-14px_rgba(0,80,220,0.6)]">
        <span aria-hidden className="absolute -right-28 -top-20 w-80 h-80 rounded-full bg-white/[0.07]" />
        <span aria-hidden className="absolute -right-14 top-32 w-56 h-56 rounded-full bg-white/[0.06]" />
        <Plus aria-hidden className="absolute right-6 top-[128px] w-14 h-14 text-white/15" strokeWidth={3.5} />

        <div className="relative flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Consult your Doctor home">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="40px" priority className="w-10 h-10 object-contain shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block font-title-md text-[16px] min-[360px]:text-[18px] font-extrabold tracking-tight truncate">Consult your Doctor</span>
              <span className="block text-[12.5px] text-white/80 truncate">Your Health, Our Priority</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {isSignedIn && (
              <Link
                href="/patient/appointments"
                aria-label={visitLine ? `Bookings: ${visitLine}` : "Bookings"}
                className="relative w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Bell className="w-5 h-5" />
                {visitLine && <span aria-hidden className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#ff4d4f] ring-2 ring-[#1570ff]" />}
              </Link>
            )}
            <button type="button" onClick={() => setSheet("menu")} aria-label="Open menu" aria-haspopup="dialog" className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center active:scale-95 transition-transform">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <Greeting name={name} now={now} />

        <button
          type="button"
          onClick={() => setSheet("location")}
          aria-haspopup="dialog"
          className="relative mt-2 inline-flex items-center gap-1.5 max-w-full -ml-1 px-1 py-1 rounded-lg text-[15px] font-semibold active:bg-white/10"
        >
          <MapPin className="w-[18px] h-[18px] shrink-0 fill-white/20" />
          <span className="truncate">{place.status === "locating" ? "Finding your location…" : location?.label ?? "Set your location"}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-80" />
        </button>

        <form onSubmit={search} role="search" className="relative mt-4 flex items-center gap-2.5 h-[54px] pl-4 pr-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm focus-within:bg-white/25 transition-colors">
          <Search className="w-5 h-5 text-white/90 shrink-0" />
          <label className="sr-only" htmlFor="phone-home-search">Search doctors or specialties</label>
          <input
            id="phone-home-search"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors or specialties…"
            className="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/70 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <Link href={findHref} aria-label="Filters" className="w-11 h-11 rounded-full bg-white text-indigo-gray-900 flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform">
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </Link>
        </form>
      </section>

      <div className="px-4 pt-5 pb-8 flex flex-col gap-6">
        {isSignedIn && visitLine && (
          <Link href="/patient/appointments" className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary-fixed/60 active:bg-primary-fixed transition-colors">
            <span className="w-10 h-10 rounded-full bg-white text-primary flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </span>
            <span className="flex-1 text-sm font-medium text-on-surface leading-snug">{visitLine}</span>
            <ChevronRight className="w-5 h-5 text-primary shrink-0" />
          </Link>
        )}

        <SpecialtyRow specialties={specialties} />

        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-title-md text-[21px] font-extrabold tracking-tight text-indigo-gray-900">{location && !noneNearby ? "Doctors Near You" : "Top Doctors for You"}</h2>
              {location && !noneNearby && <p className="text-[13px] text-slate-500 truncate">Nearest to {location.label}</p>}
            </div>
            <Link href={findHref} className="flex items-center gap-0.5 py-2 -my-2 text-sm font-semibold text-vibrant-blue shrink-0">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {noneNearby && (
            <p className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-[13px] text-amber-900">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              No partner doctors near {location?.label} yet, so here are doctors elsewhere.
            </p>
          )}

          {doctors.length === 0 ? (
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-[#edf1f7] text-center text-sm text-indigo-gray-600">
              <Stethoscope className="w-8 h-8 mx-auto mb-2 text-outline" />
              No doctors are listed yet. Please check back soon.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map(({ item, km }) => (
                <DoctorCard key={item.id} doctor={item} km={km} now={now} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {sheet === "location" && <LocationSheet place={place} cities={cities} onClose={closeSheet} />}
      {sheet === "menu" && <MenuSheet name={name} email={email} isSignedIn={isSignedIn} onClose={closeSheet} />}
    </div>
  );
}

function getSalutation(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The name to greet with: the first name (or "Dr. Surname"), never a phone number or an email address. */
function greetingName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed || /^(\+?\d[\d\s-]{6,}\d|\d+)$/.test(trimmed)) return null;
  const clean = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const parts = clean.split(/\s+/);
  const display = /^dr\.?$/i.test(parts[0]) ? `${parts[0]} ${parts[1] ?? ""}`.trim() : parts[0];
  return display ? display.charAt(0).toUpperCase() + display.slice(1) : null;
}

function Greeting({ name, now }: { name: string | null; now: number }) {
  // The server's clock may be in another time zone; the browser's decides "morning".
  const [salutation, setSalutation] = useState(() => getSalutation(new Date(now)));
  useEffect(() => {
    const id = requestAnimationFrame(() => setSalutation(getSalutation(new Date())));
    return () => cancelAnimationFrame(id);
  }, []);
  const display = greetingName(name);
  return (
    <div className="relative mt-5">
      <p suppressHydrationWarning className="text-[17px] text-white/90">{salutation},</p>
      <p className="font-title-md text-[32px] min-[380px]:text-[36px] font-extrabold leading-[1.1] tracking-tight truncate">{display ?? "Welcome"}</p>
    </div>
  );
}

const TINTS = [
  "bg-[#eaf2ff] text-[#1e6bff]",
  "bg-[#f3ecff] text-[#7c3aed]",
  "bg-[#ffecef] text-[#e11d48]",
  "bg-[#e7f8ee] text-[#16a34a]",
];

/** "All", the most-staffed specialties and "More". Five columns on most phones, six where there is room. */
function SpecialtyRow({ specialties }: { specialties: { name: string; count: number }[] }) {
  const tiles: { href: string; label: string; icon: LucideIcon; tint: string; wideOnly?: boolean }[] = [
    { href: "/find", label: "All", icon: Stethoscope, tint: "bg-vibrant-blue text-white shadow-[0_8px_16px_-6px_rgba(0,102,255,0.6)]" },
    ...specialties.slice(0, 4).map((s, i) => ({
      href: `/find?specialty=${encodeURIComponent(s.name)}`,
      label: s.name,
      icon: specialtyMeta(s.name).icon,
      tint: TINTS[i % TINTS.length],
      wideOnly: i === 3,
    })),
    { href: "/find", label: "More", icon: Ellipsis, tint: "bg-slate-100 text-slate-500" },
  ];
  return (
    <nav aria-label="Specialties" className="grid grid-cols-5 min-[400px]:grid-cols-6 gap-1">
      {tiles.map(({ href, label, icon: Icon, tint, wideOnly }, i) => (
        <Link key={label} href={href} className={`min-w-0 flex-col items-center gap-1.5 active:scale-95 transition-transform ${wideOnly ? "hidden min-[400px]:flex" : "flex"}`}>
          <span className={`w-[54px] h-[54px] rounded-2xl flex items-center justify-center ${tint}`}>
            <Icon className="w-6 h-6" strokeWidth={1.9} />
          </span>
          <span className={`w-full text-center text-[11px] min-[380px]:text-[11.5px] tracking-tight leading-tight line-clamp-2 ${i === 0 ? "font-semibold text-vibrant-blue" : "font-medium text-slate-700"}`}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

const compactCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

function DoctorCard({ doctor: d, km, now }: { doctor: HomeDoctor; km: number | null; now: number }) {
  const availableToday = d.openToday > 0;
  // Degrees (or the hospital when none are listed) and experience, as on the doctor's profile.
  const details = [d.qualifications || d.hospital, d.experience ? `${d.experience}+ Years Exp.` : null].filter(Boolean).join(" • ");
  const rated = d.reviewCount > 0 && d.rating !== null;
  return (
    <li className="flex items-center gap-2.5 min-[380px]:gap-3 p-3 rounded-[20px] bg-white border border-[#edf1f7] shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <Link href={`/doctors/${d.id}`} className="flex items-center gap-2.5 min-[380px]:gap-3 flex-1 min-w-0">
        <span className="relative w-14 h-14 min-[380px]:w-16 min-[380px]:h-16 shrink-0">
          <span className="absolute inset-0 rounded-full overflow-hidden bg-gradient-to-br from-primary-fixed to-surface-container flex items-center justify-center text-primary font-bold text-lg">
            {d.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.image} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(d.name)
            )}
          </span>
          {availableToday && <span aria-label="Available today" className="absolute right-0 bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-[2.5px] ring-white" />}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <span className="block font-title-md text-[15px] min-[380px]:text-[16px] font-bold text-indigo-gray-900 truncate">{doctorName(d.name)}</span>
          <span className="block mt-0.5 text-[13px] text-slate-500 truncate">{d.specialty || "Specialist"}</span>
          {details && <span className="block mt-1 text-[11px] text-slate-500 truncate">{details}</span>}
          <span className="mt-1.5 flex items-center gap-1.5 min-w-0">
            {rated ? (
              <Chip tone="green">
                <Star className="w-3 h-3 fill-current" strokeWidth={0} /> {d.rating!.toFixed(1)}
                {km == null && <span className="font-medium text-slate-500">({compactCount(d.reviewCount)})</span>}
              </Chip>
            ) : availableToday ? (
              <Chip tone="green"><CalendarDays className="w-3.5 h-3.5" /> Available today</Chip>
            ) : (
              <Chip tone="grey"><CalendarDays className="w-3.5 h-3.5" /> {d.nextSlot ? `Next: ${formatDayLabel(d.nextSlot, now)}` : "No open slots"}</Chip>
            )}
            {km != null && (
              <span className="flex items-center gap-0.5 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                <MapPin className="w-3 h-3" /> {formatDistance(km)}
              </span>
            )}
          </span>
        </span>
      </Link>
      <span className="flex flex-col items-end gap-2 shrink-0">
        {d.fee ? <span className="font-title-md text-[18px] min-[380px]:text-[20px] font-extrabold leading-none tracking-tight text-vibrant-blue tabular-nums">{formatINR(d.fee)}</span> : null}
        <Link href={`/book/${d.id}`} className="h-9 px-2.5 min-[380px]:px-3.5 rounded-full bg-vibrant-blue text-white text-[12px] min-[380px]:text-[12.5px] font-semibold flex items-center gap-1 whitespace-nowrap shadow-[0_6px_14px_-6px_rgba(0,102,255,0.7)] active:scale-95 transition-transform">
          {/* The smallest phones get the short label so the doctor's name keeps its room. */}
          <span className="min-[360px]:hidden">Book</span>
          <span className="hidden min-[360px]:inline">Consult Now</span>
          <ArrowRight className="hidden min-[400px]:block w-3.5 h-3.5" />
        </Link>
      </span>
    </li>
  );
}

function Chip({ tone, children }: { tone: "green" | "grey"; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-semibold whitespace-nowrap min-w-0 truncate ${tone === "green" ? "bg-[#e8f8ef] text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}

/** A panel that slides up from the bottom over a dimmed page. */
function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 w-full h-full bg-slate-900/40" />
      <div className="relative w-full max-h-[85dvh] overflow-y-auto overscroll-contain bg-white rounded-t-[28px] shadow-[0_-12px_40px_rgba(15,23,42,0.2)] px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <span aria-hidden className="block w-10 h-1.5 rounded-full bg-slate-200 mx-auto mb-3" />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-title-md text-[19px] font-extrabold text-indigo-gray-900">{title}</p>
            {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 -mr-1 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LocationSheet({ place, cities, onClose }: { place: Place; cities: string[]; onClose: () => void }) {
  const { location, status } = place;
  const message =
    status === "denied"
      ? "Location access is blocked for this site. Allow it in your browser settings, or pick a city below."
      : status === "unavailable"
        ? "Your location isn't available right now. Pick a city below instead."
        : null;
  return (
    <Sheet title="Your location" subtitle="See the doctors, hospitals and labs nearest to you." onClose={onClose}>
      <button
        type="button"
        onClick={() => place.locate(onClose)}
        disabled={status === "locating"}
        className="w-full h-12 rounded-full bg-vibrant-blue text-white font-bold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(0,102,255,0.25)] disabled:opacity-70"
      >
        {status === "locating" ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
        {status === "locating" ? "Finding your location…" : "Use my current location"}
      </button>
      <p className="mt-2 text-[12px] text-slate-500 text-center">Your location stays on this phone and is only used to sort the list.</p>
      {message && <p role="alert" className="mt-3 p-3 rounded-xl bg-amber-50 text-[13px] text-amber-900">{message}</p>}

      {cities.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Or choose a city</p>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => {
              const active = location?.kind === "city" && location.city === city;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    place.chooseCity(city);
                    onClose();
                  }}
                  aria-pressed={active}
                  className={`h-10 px-4 rounded-full text-[14px] font-semibold border transition-colors ${active ? "bg-vibrant-blue border-vibrant-blue text-white" : "bg-white border-slate-200 text-indigo-gray-900 active:bg-slate-50"}`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </>
      )}

      {location && (
        <button
          type="button"
          onClick={() => {
            place.clear();
            onClose();
          }}
          className="mt-5 w-full h-12 rounded-full border border-slate-200 text-indigo-gray-900 font-semibold flex items-center justify-center gap-2 active:bg-slate-50"
        >
          <Globe2 className="w-5 h-5 text-slate-500" /> Show all locations
        </button>
      )}
    </Sheet>
  );
}

function MenuSheet({ name, email, isSignedIn, onClose }: { name: string | null; email: string | null; isSignedIn: boolean; onClose: () => void }) {
  const links: { href: string; label: string; icon: LucideIcon }[] = [
    ...(isSignedIn
      ? [
          { href: "/patient/appointments", label: "My appointments", icon: CalendarDays },
          { href: "/patient/profile", label: "My profile & records", icon: UserRound },
        ]
      : []),
    { href: "/find", label: "Find a doctor", icon: Stethoscope },
    { href: "/hospitals", label: "Hospitals", icon: Building2 },
    { href: "/diagnostics", label: "Lab tests", icon: FlaskConical },
    { href: isSignedIn ? "/patient/support" : "/contact", label: "Help & support", icon: LifeBuoy },
  ];
  return (
    <Sheet title={isSignedIn ? name || "My account" : "Menu"} subtitle={isSignedIn ? email ?? undefined : undefined} onClose={onClose}>
      <nav aria-label="Account and site" className="flex flex-col">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={onClose} className="flex items-center gap-3 min-h-[52px] px-2 rounded-2xl text-[16px] font-semibold text-indigo-gray-900 active:bg-slate-100">
            <Icon className="w-5 h-5 text-vibrant-blue shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </Link>
        ))}
      </nav>
      <div className="mt-3">
        {isSignedIn ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full h-12 rounded-full border border-slate-200 text-indigo-gray-900 font-semibold flex items-center justify-center gap-2 active:bg-slate-50">
              <LogOut className="w-5 h-5 text-red-600" /> Sign out
            </button>
          </form>
        ) : (
          <Link href="/login/patient" onClick={onClose} className="w-full h-12 rounded-full bg-vibrant-blue text-white font-bold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(0,102,255,0.25)]">
            <LogIn className="w-5 h-5" /> Sign in or create an account
          </Link>
        )}
      </div>
      <p className="mt-4 px-2 flex gap-4 text-[13px] text-slate-500">
        <Link href="/terms-of-use" onClick={onClose} className="py-1.5">Terms &amp; Conditions</Link>
        <Link href="/privacy-policy" onClick={onClose} className="py-1.5">Privacy Policy</Link>
      </p>
    </Sheet>
  );
}
