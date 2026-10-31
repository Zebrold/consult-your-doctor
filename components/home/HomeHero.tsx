"use client";

import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Bell, CalendarCheck, CalendarClock, ChevronDown, ChevronRight, FileText, LayoutDashboard, MapPin, NotebookPen, Search, UserRound, type LucideIcon } from "lucide-react";
import { GetTheApp } from "@/components/GetTheApp";
import { initials } from "@/components/patient/format";
import { locationCity, type usePatientLocation } from "@/components/patient/location";
import { formatCityName } from "@/lib/geo";
import { LocationMenu } from "@/components/patient/LocationMenu";
import { PATIENT_ACCOUNT_LINKS } from "@/components/patient/PhoneHeader";
import { AccountMenu } from "@/components/portal/TopBar";
import { CorporateMenu } from "@/components/site/CorporateMenu";
import { AppPromoStrip } from "./AppPromo";
import type { HomeAccount } from "./types";

type Place = ReturnType<typeof usePatientLocation>;

type Props = {
  account: HomeAccount;
  place: Place;
  /** Cities with partner hospitals or labs, for the desktop location menu. */
  cities: string[];
  /** "Your next visit: ..." for a signed-in patient with one coming up. */
  visitLine: string | null;
  /** Phones: opens the location sheet. */
  onLocation: () => void;
  onMenu: () => void;
};

// The blue top of the home page. Phones: the app strip, the location and account, search, the headline beside a
// doctor, then the three services. Wider screens: the site header, the headline, location and search side by side,
// then the services in a row.

type Service = {
  href: string;
  title: string;
  kind: string;
  /** Shorter wording for the half-width phone cards. */
  kindShort: string;
  tag: string;
  tagIcon: LucideIcon;
  /** One line on how it works, true to lib/assistant/knowledge.ts. */
  blurb: string;
  image: string;
  alt: string;
};

export function HomeHero({ account, place, cities, visitLine, onLocation, onMenu }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const closeLoc = useCallback(() => setLocOpen(false), []);
  const locAnchor = useRef<HTMLButtonElement>(null);
  const location = place.location;
  const rawCity = locationCity(location);
  const city = rawCity ? formatCityName(rawCity) : null;
  const findHref = city ? `/find?city=${encodeURIComponent(city)}` : "/find";

  const where =
    place.status === "locating"
      ? "Finding your location…"
      : location
        ? [formatCityName(location.label), location.city && location.city !== location.label ? formatCityName(location.city) : null].filter(Boolean).join(", ")
        : null;

  const search = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    router.push(params.size ? `/find?${params}` : "/find");
  };

  const services: Service[] = [
    {
      href: "/hospitals",
      title: "Hospital booking",
      kind: "OPD at partner hospitals",
      kindShort: "OPD at partner hospitals",
      tag: "Confirmed time slots",
      tagIcon: CalendarCheck,
      blurb: "Pick an open slot at a partner hospital and pay only the booking fee online.",
      image: "/images/home/hospital-building.webp",
      alt: "Hospital building",
    },
    {
      href: "/diagnostics",
      title: "Diagnostics",
      kind: "Verified partner labs",
      kindShort: "Verified labs",
      tag: "Digital reports",
      tagIcon: FileText,
      blurb: "Book tests by day at a lab near you. Your report arrives in your account.",
      image: "/images/home/lab-microscope.webp",
      alt: "Microscope and sample tubes",
    },
    {
      href: findHref,
      title: "Consult a doctor",
      kind: "Verified specialists near you",
      kindShort: "Verified specialists",
      tag: "E-prescriptions",
      tagIcon: NotebookPen,
      blurb: "Search by speciality and city, then see the doctor at their hospital.",
      image: "/images/home/doctor.webp",
      alt: "Doctor in a white coat with a stethoscope",
    },
  ];

  const searchLabel = "Search doctors, hospitals or specialities";

  return (
    <>
      <AppPromoStrip />

      {/* Phones */}
      <section className="md:hidden bg-[#1D4ED8] px-4 pt-[18px] pb-7 flex flex-col gap-[18px] overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onLocation} aria-haspopup="dialog" className="flex-1 min-w-0 text-left text-white">
            <span className="flex items-center gap-2 text-[20px] font-extrabold min-w-0">
              <MapPin className="w-[22px] h-[22px] shrink-0 fill-white/25" strokeWidth={2.2} />
              <span className="truncate">{location?.label ?? "Your location"}</span>
              <ChevronDown className="w-4 h-4 shrink-0" strokeWidth={2.6} />
            </span>
            <span className="block mt-1 text-[13px] text-[#DCE7FF] truncate">
              {place.status === "locating"
                ? "Finding your location…"
                : location?.kind === "gps"
                  ? where
                  : location
                    ? "Doctors and hospitals in this city"
                    : "Tap to see care near you"}
            </span>
          </button>
          <PhoneAccountButton account={account} onMenu={onMenu} />
        </div>

        <form role="search" onSubmit={search} className="flex items-center gap-2.5 min-h-[52px] pl-4 pr-1.5 bg-white rounded-[14px]">
          <label htmlFor="home-search-phone" className="sr-only">{searchLabel}</label>
          <input
            id="home-search-phone"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors, hospitals or specialities"
            className="flex-1 min-w-0 bg-transparent text-[15px] text-[#0B1B3F] placeholder:text-slate-400 outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="submit" aria-label="Search" className="w-10 h-10 rounded-[10px] bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform">
            <Search className="w-5 h-5" strokeWidth={2.4} />
          </button>
        </form>

        {visitLine && <VisitPill line={visitLine} />}

        <div className="flex items-end gap-2 mt-1">
          <div className="flex-1 min-w-0 pb-3.5">
            <h1 className="text-white text-[27px] leading-[1.12] font-extrabold tracking-[-0.025em]">
              Healthcare <span className="text-[#A9CBFF]">made simple,</span> for everyone.
            </h1>
            <p className="mt-2 text-[#DCE7FF] text-[13px] leading-[1.45]">Your healthcare, all in one place from appointments to reports.</p>
          </div>
          <Image
            src="/images/home/doctor.webp"
            alt=""
            width={377}
            height={518}
            priority
            className="h-[150px] w-auto shrink-0 [mask-image:linear-gradient(to_bottom,#000_70%,transparent_100%)]"
          />
        </div>

        <PhoneServiceCard service={services[0]} wide />
        <div className="grid grid-cols-2 gap-3.5">
          <PhoneServiceCard service={services[1]} />
          <PhoneServiceCard service={{ ...services[2], image: "/images/home/stethoscope.svg", alt: "Stethoscope" }} />
        </div>
      </section>

      {/* Tablets and desktops */}
      <section className="hidden md:block relative bg-[#1D4ED8] pb-14">
        <header className="relative z-[2] px-[max(24px,10%)] py-[22px] flex flex-wrap items-center justify-between gap-5">
          <Link href="/" aria-label="Consult your Doctor home" className="flex items-center gap-4 text-white">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} priority className="w-[46px] h-[46px] object-contain" />
            <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[28px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-7">
            <div className="hidden lg:block">
              <CorporateMenu className="text-white text-base font-semibold hover:text-[#DCE7FF] transition-colors" />
            </div>
            <Link href="/corporate#join" className="hidden lg:block text-white text-base font-semibold hover:text-[#DCE7FF] transition-colors">Partner with Us</Link>
            <GetTheApp variant="hero" />
            <DesktopAccount account={account} hasVisit={!!visitLine} />
          </nav>
        </header>

        <div className="max-w-[1000px] mx-auto px-6 pt-[22px] flex flex-col items-center text-center gap-3.5">
          <h1 className="text-white text-[44px] lg:text-[50px] leading-[1.08] font-extrabold tracking-[-0.03em]">
            Healthcare <span className="text-[#A9CBFF]">made simple,</span>
            <br />
            for everyone.
          </h1>
          <p className="max-w-[680px] text-[#DCE7FF] text-lg leading-normal">Your healthcare, all in one place from appointments to reports.</p>
          {visitLine && <VisitPill line={visitLine} />}

          <form role="search" onSubmit={search} className="mt-1.5 w-full max-w-[900px] flex flex-wrap gap-4">
            {/* The location: a dropdown under the field (phones use the location sheet). */}
            <div className="relative flex-[1_1_280px] flex">
              <button
                ref={locAnchor}
                type="button"
                onClick={() => setLocOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={locOpen}
                aria-label={`Your location: ${where ?? "not set"}. Change`}
                className={`w-full flex items-center gap-3 min-h-[58px] px-5 bg-white rounded-2xl text-left transition-shadow ${locOpen ? "shadow-[0_0_0_3px_rgba(169,203,255,0.8)]" : "hover:shadow-[0_0_0_3px_rgba(169,203,255,0.6)]"}`}
              >
                <MapPin className="w-[22px] h-[22px] text-[#1D4ED8] shrink-0" strokeWidth={2.2} />
                <span className={`flex-1 min-w-0 truncate text-[17px] font-semibold ${where ? "text-[#0B1B3F]" : "text-slate-400"}`}>{where ?? "Set your location"}</span>
                <ChevronDown className={`w-5 h-5 text-[#0B1B3F] shrink-0 transition-transform duration-200 ${locOpen ? "rotate-180" : ""}`} strokeWidth={2.2} />
              </button>
              {locOpen && <LocationMenu place={place} cities={cities} anchor={locAnchor} onClose={closeLoc} />}
            </div>
            <div className="flex-[2_1_380px] flex items-center gap-3 min-h-[58px] pl-5 pr-1.5 bg-white rounded-2xl focus-within:shadow-[0_0_0_3px_rgba(169,203,255,0.6)] transition-shadow">
              <label htmlFor="home-search" className="sr-only">{searchLabel}</label>
              <input
                id="home-search"
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctors, hospitals or specialities"
                className="flex-1 min-w-0 bg-transparent text-[17px] text-[#0B1B3F] placeholder:text-slate-400 outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              <button type="submit" aria-label="Search" className="w-[46px] h-[46px] rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 hover:bg-[#1E40AF] transition-colors">
                <Search className="w-[22px] h-[22px]" strokeWidth={2.4} />
              </button>
            </div>
          </form>
        </div>

        <div className="max-w-[1100px] mx-auto mt-11 px-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 lg:gap-7">
          <DesktopServiceCard service={services[0]} image="mb-3 w-[90%] max-w-[300px] h-auto" />
          <DesktopServiceCard service={services[1]} image="mb-1.5 h-[160px] w-auto" />
          <DesktopServiceCard service={services[2]} image="h-[172px] w-auto" floor={false} />
        </div>
      </section>
    </>
  );
}

function VisitPill({ line }: { line: string }) {
  return (
    <Link
      href="/patient/appointments"
      className="self-start md:self-auto inline-flex items-center gap-2 max-w-full px-4 py-2 rounded-full bg-white/15 border border-white/25 text-white text-[13px] md:text-[14px] font-semibold hover:bg-white/25 transition-colors"
    >
      <CalendarClock className="w-4 h-4 shrink-0" />
      <span className="truncate">{line}</span>
      <ChevronRight className="w-4 h-4 shrink-0 opacity-80" />
    </Link>
  );
}

/** The round navy button on phones: the menu (with sign-in or the patient's account), or staff's own portal. */
export function PhoneAccountButton({ account, onMenu }: { account: HomeAccount; onMenu: () => void }) {
  const cls = "w-[46px] h-[46px] rounded-full bg-[#0B1B3F] text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform";
  if (account.kind === "staff") {
    return (
      <Link href={account.href} aria-label="Your dashboard" className={cls}>
        <LayoutDashboard className="w-5 h-5" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onMenu} aria-haspopup="dialog" aria-label={account.kind === "patient" ? "Your account and menu" : "Menu and login"} className={cls}>
      {account.kind === "patient" && account.name ? (
        <span className="text-[15px] font-extrabold">{initials(account.name)}</span>
      ) : (
        <UserRound className="w-[22px] h-[22px] fill-white" strokeWidth={0} />
      )}
    </button>
  );
}

export function DesktopAccount({ account, hasVisit }: { account: HomeAccount; hasVisit: boolean }) {
  const pill = "flex items-center gap-1.5 min-h-[38px] px-[22px] rounded-[10px] bg-[#0B1B3F] text-white text-sm font-bold hover:bg-[#13285A] transition-colors";
  if (account.kind === "guest") {
    return (
      <Link href="/login" className={pill}>
        Login
      </Link>
    );
  }
  if (account.kind === "staff") {
    return (
      <Link href={account.href} className={pill}>
        <LayoutDashboard className="w-4 h-4" /> Dashboard
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/patient/appointments"
        aria-label={hasVisit ? "Bookings: you have a visit coming up" : "Bookings"}
        className="relative w-11 h-11 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center hover:bg-white/25 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {hasVisit && <span aria-hidden className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#ff4d4f] ring-2 ring-[#1D4ED8]" />}
      </Link>
      <AccountMenu tone="blue" person={{ name: account.name || "", role: "Patient", detail: account.email }} links={PATIENT_ACCOUNT_LINKS} />
    </div>
  );
}

/** The picture on a pale blue panel, lit from above with a soft shadow under it, like a product shot. */
function ServiceStage({ image, alt, imageClass, floor = true, className, children }: { image: string; alt: string; imageClass: string; floor?: boolean; className: string; children?: ReactNode }) {
  return (
    <div className={`relative overflow-hidden flex items-end justify-center bg-[linear-gradient(180deg,#F6F9FF_0%,#E1EAFE_100%)] shadow-[inset_0_0_0_1px_rgba(29,78,216,0.07)] ${className}`}>
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_0%,#FFFFFF_0%,rgba(255,255,255,0)_70%)]" />
      {floor && <span aria-hidden className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[62%] h-4 rounded-[50%] bg-[#0B1B3F]/20 blur-[10px]" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={alt} className={`relative origin-bottom transition-transform duration-500 ease-out group-hover:scale-[1.04] ${imageClass}`} />
      {children}
    </div>
  );
}

function PhoneServiceCard({ service: s, wide = false }: { service: Service; wide?: boolean }) {
  const TagIcon = s.tagIcon;
  const svg = s.image.endsWith(".svg");
  return (
    <Link
      href={s.href}
      className="flex flex-col p-1.5 bg-white rounded-[20px] text-[#0B1B3F] shadow-[0_1px_2px_rgba(11,27,63,0.08),0_16px_32px_-14px_rgba(7,22,72,0.6)] active:scale-[0.99] transition-transform"
    >
      <ServiceStage
        image={s.image}
        alt={s.alt}
        floor={!svg}
        className={`rounded-[15px] ${wide ? "h-[124px]" : "h-[104px]"}`}
        imageClass={wide ? "mb-2.5 w-[68%] max-w-[240px] h-auto" : svg ? "mb-1 h-[80px] w-auto" : "mb-1.5 h-[84px] w-auto"}
      >
        <span aria-hidden className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white text-[#1D4ED8] flex items-center justify-center shadow-[0_1px_3px_rgba(11,27,63,0.12)]">
          <ArrowUpRight className="w-4 h-4" strokeWidth={2.4} />
        </span>
      </ServiceStage>
      <div className={wide ? "px-3 pt-3 pb-2.5" : "px-2.5 pt-3 pb-2"}>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] leading-[1.35] text-[#1D4ED8]">{wide ? s.kind : s.kindShort}</p>
        <h2 className={`mt-1 font-bold leading-[1.15] tracking-[-0.02em] ${wide ? "text-[19px]" : "text-[16px]"}`}>{s.title}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[#4A5878]">
          <TagIcon className="w-3.5 h-3.5 shrink-0 text-[#1D4ED8]" strokeWidth={2.2} />
          {s.tag}
        </p>
      </div>
    </Link>
  );
}

function DesktopServiceCard({ service: s, image, floor = true }: { service: Service; image: string; floor?: boolean }) {
  const TagIcon = s.tagIcon;
  return (
    <Link
      href={s.href}
      className="group flex flex-col p-2 bg-white rounded-[24px] text-[#0B1B3F] shadow-[0_1px_2px_rgba(11,27,63,0.08),0_22px_44px_-16px_rgba(7,22,72,0.6)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(11,27,63,0.08),0_32px_56px_-18px_rgba(7,22,72,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A9CBFF]"
    >
      <ServiceStage image={s.image} alt={s.alt} imageClass={image} floor={floor} className="h-[184px] rounded-[18px]" />
      <div className="flex flex-1 flex-col px-4 pt-5 pb-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#1D4ED8]">{s.kind}</p>
        <h2 className="mt-1.5 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">{s.title}</h2>
        <p className="mt-2 text-[15px] leading-[1.55] text-[#4A5878]">{s.blurb}</p>
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-[#E8EDF6]">
            <span className="flex items-center gap-2 text-[14px] font-medium text-[#334155]">
              <TagIcon className="w-[18px] h-[18px] text-[#1D4ED8]" strokeWidth={2} />
              {s.tag}
            </span>
            <span aria-hidden className="w-10 h-10 rounded-full bg-[#EEF3FF] text-[#1D4ED8] flex items-center justify-center transition-colors duration-300 group-hover:bg-[#1D4ED8] group-hover:text-white">
              <ArrowRight className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.4} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
