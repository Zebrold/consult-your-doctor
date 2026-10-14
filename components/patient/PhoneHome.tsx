"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2, CalendarClock, CalendarDays, ChevronRight, Ellipsis, FlaskConical, LifeBuoy, LogIn, LogOut, Menu, Search,
  SlidersHorizontal, Star, Stethoscope, UserRound, X, type LucideIcon,
} from "lucide-react";
import type { HomeDoctor } from "@/components/PatientHome";
import { doctorName, formatDayLabel, formatINR, initials } from "@/components/patient/format";
import { specialtyMeta } from "@/components/patient/specialties";

// The patient home on phones: the app-style header, search, specialty shortcuts and the top doctors list. Tablets
// and desktops keep the wider layout in PatientHome; the sections after this (hospitals, reviews) are shared.

type Props = {
  name: string | null;
  email: string | null;
  isSignedIn: boolean;
  now: number;
  /** "Your next visit: ..." when the patient has one coming up. */
  visitLine: string | null;
  doctors: HomeDoctor[];
  specialties: { name: string; count: number }[];
};

export function PhoneHome({ name, email, isSignedIn, now, visitLine, doctors, specialties }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const search = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/find?q=${encodeURIComponent(q)}` : "/find");
  };

  return (
    <div className="md:hidden">
      <PhoneHeader name={name} email={email} isSignedIn={isSignedIn} now={now} />

      <div className="px-4 pt-2 pb-8 flex flex-col gap-5">
        <h1 className="sr-only">Find a specialist and book a visit</h1>
        {/* Search */}
        <form onSubmit={search} role="search" className="flex items-center gap-2.5 h-[52px] pl-4 pr-1.5 rounded-full bg-[#f1f5fb] border border-[#e3e9f3] focus-within:border-vibrant-blue/60 focus-within:bg-white transition-colors">
          <Search className="w-5 h-5 text-slate-500 shrink-0" />
          <label className="sr-only" htmlFor="phone-home-search">Search doctors, specialties or conditions</label>
          <input
            id="phone-home-search"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors or specialties"
            className="flex-1 min-w-0 bg-transparent text-on-surface placeholder:text-slate-400 focus:outline-none"
          />
          <Link href="/find" aria-label="Filters" className="w-10 h-10 rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)] flex items-center justify-center text-indigo-gray-900 shrink-0 active:scale-95 transition-transform">
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </Link>
        </form>

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

        {/* Top doctors */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-title-md text-[21px] font-extrabold tracking-tight text-indigo-gray-900">Top Doctors for You</h2>
            <Link href="/find" className="flex items-center gap-0.5 py-2 -my-2 text-sm font-semibold text-vibrant-blue shrink-0">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {doctors.length === 0 ? (
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-[#edf1f7] text-center text-sm text-indigo-gray-600">
              <Stethoscope className="w-8 h-8 mx-auto mb-2 text-outline" />
              No doctors are listed yet. Please check back soon.
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {doctors.slice(0, 5).map((d) => (
                <DoctorCard key={d.id} doctor={d} now={now} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function getSalutation(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

function getGreeting(name: string | null | undefined, date: Date = new Date()): string {
  const salutation = getSalutation(date);
  const trimmed = name?.trim();
  if (!trimmed) return salutation;

  // Don't greet with phone numbers or raw digit sequences
  if (/^(\+?\d[\d\s-]{6,}\d|\d+)$/.test(trimmed)) {
    return salutation;
  }

  // If name looks like an email, use the username part
  let cleanName = trimmed;
  if (cleanName.includes("@")) {
    cleanName = cleanName.split("@")[0];
  }

  let displayName = cleanName;
  if (/^dr\.?\s+/i.test(cleanName)) {
    const parts = cleanName.split(/\s+/);
    displayName = `${parts[0]} ${parts[1] || ""}`.trim();
  } else {
    displayName = cleanName.split(/\s+/)[0];
  }

  if (displayName) {
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  }

  return displayName ? `${salutation}, ${displayName}` : salutation;
}

function PhoneHeader({
  name,
  email,
  isSignedIn,
  now,
}: {
  name: string | null;
  email: string | null;
  isSignedIn: boolean;
  now: number;
}) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;
  const close = () => setMenuPath(null);

  const [greeting, setGreeting] = useState(() => getGreeting(name, new Date(now)));

  useEffect(() => {
    setGreeting(getGreeting(name, new Date()));
  }, [name]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuPath(null);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 pt-[env(safe-area-inset-top)]">
        <div className="h-16 px-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Consult your Doctor home">
            <Image src="/logo-icon.png" alt="" width={96} height={96} sizes="40px" priority className="w-10 h-10 object-contain shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block font-title-md text-[15px] min-[360px]:text-[17px] font-extrabold tracking-tight text-indigo-gray-900 truncate">Consult your Doctor</span>
              <span suppressHydrationWarning className="block text-[12.5px] font-medium text-slate-500 truncate">{greeting}</span>
            </span>
          </Link>
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => (open ? close() : setMenuPath(pathname))}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="phone-home-menu"
              className="w-10 h-10 rounded-full bg-[#eef3fb] flex items-center justify-center text-indigo-gray-900 active:scale-95 transition-transform"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className={`fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 transition-[opacity,visibility] duration-200 ${open ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`}>
        <button type="button" tabIndex={-1} aria-label="Close menu" onClick={close} className="absolute inset-0 w-full h-full bg-slate-900/30" />
        <nav
          id="phone-home-menu"
          aria-label="Account and site"
          className={`relative max-h-full overflow-y-auto overscroll-contain bg-white rounded-b-3xl shadow-[0_24px_48px_rgba(15,23,42,0.18)] px-3 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-200 ${open ? "translate-y-0" : "-translate-y-3"}`}
        >
          {isSignedIn && (
            <div className="flex items-center gap-3 px-3 py-3 mb-1 border-b border-slate-100">
              <span className="w-11 h-11 rounded-full bg-vibrant-blue text-white flex items-center justify-center font-bold text-sm shrink-0">
                {name ? initials(name) : <UserRound className="w-5 h-5" />}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-indigo-gray-900 truncate">{name || "My account"}</span>
                {email && <span className="block text-sm text-slate-500 truncate">{email}</span>}
              </span>
            </div>
          )}
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={close} className="flex items-center gap-3 min-h-[52px] px-3 rounded-2xl text-[16px] font-semibold text-indigo-gray-900 active:bg-slate-100">
              <Icon className="w-5 h-5 text-vibrant-blue shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </Link>
          ))}
          <div className="mt-3 px-1">
            {isSignedIn ? (
              <form action="/auth/signout" method="post">
                <button type="submit" className="w-full h-12 rounded-full border border-slate-200 text-indigo-gray-900 font-semibold flex items-center justify-center gap-2 active:bg-slate-50">
                  <LogOut className="w-5 h-5 text-red-600" /> Sign out
                </button>
              </form>
            ) : (
              <Link href="/login/patient" onClick={close} className="w-full h-12 rounded-full bg-vibrant-blue text-white font-bold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(0,102,255,0.25)]">
                <LogIn className="w-5 h-5" /> Sign in or create an account
              </Link>
            )}
          </div>
          <p className="mt-4 px-3 flex gap-4 text-[13px] text-slate-500">
            <Link href="/terms-of-use" onClick={close} className="py-1.5">Terms &amp; Conditions</Link>
            <Link href="/privacy-policy" onClick={close} className="py-1.5">Privacy Policy</Link>
          </p>
        </nav>
      </div>
    </>
  );
}

/** "All", the three most-staffed specialties, and "More": five even columns, so every label fits a phone. */
function SpecialtyRow({ specialties }: { specialties: { name: string; count: number }[] }) {
  const tiles: { href: string; label: string; icon: LucideIcon; active?: boolean; more?: boolean }[] = [
    { href: "/find", label: "All", icon: Stethoscope, active: true },
    ...specialties.slice(0, 3).map((s) => ({ href: `/find?specialty=${encodeURIComponent(s.name)}`, label: s.name, icon: specialtyMeta(s.name).icon })),
    { href: "/find", label: "More", icon: Ellipsis, more: true },
  ];
  return (
    <nav aria-label="Specialties" className="grid grid-cols-5 gap-1">
      {tiles.map(({ href, label, icon: Icon, active, more }) => (
        <Link key={label} href={href} className="min-w-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <span
            className={`w-[54px] h-[54px] rounded-2xl flex items-center justify-center ${
              active
                ? "bg-vibrant-blue text-white shadow-[0_6px_14px_-4px_rgba(0,102,255,0.55)]"
                : more
                  ? "bg-white border border-[#e3e9f3] text-vibrant-blue"
                  : "bg-[#eef4ff] border border-[#e1eafc] text-vibrant-blue"
            }`}
          >
            <Icon className="w-6 h-6" strokeWidth={1.9} />
          </span>
          <span className={`w-full text-center text-[10px] min-[360px]:text-[11px] min-[380px]:text-[11.5px] tracking-tight leading-tight line-clamp-2 ${active ? "font-semibold text-vibrant-blue" : "font-medium text-slate-700"}`}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

const compactCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

function DoctorCard({ doctor: d, now }: { doctor: HomeDoctor; now: number }) {
  const availableToday = d.openToday > 0;
  // Degrees (or the hospital when none are listed) and experience, as on the doctor's profile.
  const details = [d.qualifications || d.hospital, d.experience ? `${d.experience}+ Years Exp.` : null].filter(Boolean).join(" • ");
  return (
    <li className="flex items-center gap-2.5 min-[380px]:gap-3 p-3 rounded-[18px] bg-white border border-[#edf1f7] shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
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
          {availableToday && <span aria-label="Available today" className="absolute right-0.5 bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-[2.5px] ring-white" />}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <span className="block font-title-md text-[15px] min-[380px]:text-[16px] font-bold text-indigo-gray-900 truncate">{doctorName(d.name)}</span>
          <span className="block mt-0.5 text-[13px] text-slate-500 truncate">{d.specialty || "Specialist"}</span>
          {details && <span className="block mt-1 text-[11px] text-slate-500 truncate">{details}</span>}
          <span className="mt-1.5 flex items-center gap-1.5 min-w-0">
            {d.reviewCount > 0 && d.rating !== null ? (
              <>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#e8f8ef] text-emerald-700 text-[12px] font-bold">
                  <Star className="w-3 h-3 fill-current" strokeWidth={0} /> {d.rating.toFixed(1)}
                </span>
                <span className="text-[11.5px] text-slate-500 whitespace-nowrap">({compactCount(d.reviewCount)} {d.reviewCount === 1 ? "Review" : "Reviews"})</span>
              </>
            ) : availableToday ? (
              <span className="px-2 py-0.5 rounded-md bg-[#e8f8ef] text-emerald-700 text-[11.5px] font-semibold whitespace-nowrap truncate">Available today</span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11.5px] font-medium whitespace-nowrap truncate">
                {d.nextSlot ? `Next: ${formatDayLabel(d.nextSlot, now)}` : "No open slots"}
              </span>
            )}
          </span>
        </span>
      </Link>
      <span className="flex flex-col items-end gap-2 shrink-0">
        {d.fee ? <span className="font-title-md text-[18px] min-[380px]:text-[20px] font-extrabold leading-none tracking-tight text-vibrant-blue tabular-nums">{formatINR(d.fee)}</span> : null}
        <Link href={`/book/${d.id}`} className="h-9 px-2.5 min-[380px]:px-3 rounded-full bg-vibrant-blue text-white text-[12px] min-[380px]:text-[12.5px] font-semibold flex items-center whitespace-nowrap shadow-[0_4px_10px_-4px_rgba(0,102,255,0.6)] active:scale-95 transition-transform">
          {/* The smallest phones get the short label so the doctor's name keeps its room. */}
          <span className="min-[360px]:hidden">Book</span>
          <span className="hidden min-[360px]:inline">Consult Now</span>
        </Link>
      </span>
    </li>
  );
}
