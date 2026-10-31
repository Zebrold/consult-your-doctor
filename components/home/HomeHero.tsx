"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CalendarClock, ChevronDown, ChevronRight, LayoutDashboard, MapPin, Search, UserRound } from "lucide-react";
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
// then the services in a row, with a stethoscope and a clipboard at the edges of wide screens.

type Service = {
  href: string;
  title: string;
  kind: string;
  /** A short, true highlight (lib/assistant/knowledge.ts): no discounts or offers are made. */
  tag: string;
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
    { href: findHref, title: "Consult a doctor", kind: "In-person visits", tag: "E-prescriptions", image: "/images/home/doctor.webp", alt: "Doctor in a white coat with a stethoscope" },
    { href: "/diagnostics", title: "Diagnostics", kind: "Book lab tests", tag: "Digital reports", image: "/images/home/lab-microscope.webp", alt: "Microscope and sample tubes" },
    { href: "/hospitals", title: "Hospital booking", kind: "Find & book hospitals", tag: "Confirmed slots", image: "/images/home/hospital-building.webp", alt: "Hospital building" },
  ];

  const searchLabel = "Search doctors, hospitals, labs or specialities";
  const headline = "Book doctors & lab tests. Manage your health with Consult your Doctor.";

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

        <form role="search" onSubmit={search} className="flex items-center gap-2.5 min-h-[52px] pl-4 pr-1.5 bg-white rounded-[14px] shadow-[0_10px_24px_-14px_rgba(4,18,66,0.6)]">
          <label htmlFor="home-search-phone" className="sr-only">{searchLabel}</label>
          <input
            id="home-search-phone"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors, hospitals or labs"
            className="flex-1 min-w-0 bg-transparent text-[15px] text-[#0B1B3F] placeholder:text-[#6B7489] outline-none [&::-webkit-search-cancel-button]:hidden"
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
            width={376}
            height={518}
            loading="eager"
            className="h-[150px] w-auto shrink-0 [mask-image:linear-gradient(to_bottom,#000_70%,transparent_100%)]"
          />
        </div>

        {/* The doctor is already beside the headline, so this card shows a stethoscope. */}
        <PhoneServiceCard service={{ ...services[0], image: "/images/home/stethoscope.svg", alt: "Stethoscope" }} wide image="right-4 bottom-4 h-[132px] w-auto" />
        <div className="grid grid-cols-2 gap-3.5">
          <PhoneServiceCard service={services[1]} image="-right-1 bottom-3 w-[104px] h-auto" />
          <PhoneServiceCard service={services[2]} image="-right-3 bottom-3 w-[128px] h-auto" />
        </div>
      </section>

      {/* Tablets and desktops */}
      <section className="hidden md:block relative bg-[#1D4ED8] pb-16 lg:pb-20">
        {/* Props lying on the blue, cut off by the window's edges; only where they clear the search row. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/home/hero-stethoscope.webp" alt="" width={356} height={600} loading="lazy" decoding="async" className="hidden min-[1360px]:block absolute left-0 top-[150px] w-[178px] h-auto pointer-events-none select-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/home/hero-clipboard.webp" alt="" width={344} height={736} loading="lazy" decoding="async" className="hidden min-[1360px]:block absolute right-0 top-[155px] w-[172px] h-auto pointer-events-none select-none" />

        <header className="relative z-[3] max-w-[1440px] mx-auto px-6 lg:px-12 py-7 flex flex-wrap items-center justify-between gap-5">
          <Link href="/" aria-label="Consult your Doctor home" className="flex items-center gap-3.5 text-white">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} priority className="w-11 h-11 object-contain" />
            <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[26px] lg:text-[28px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-6 lg:gap-8">
            <div className="hidden lg:block">
              <CorporateMenu className="text-white text-base font-semibold hover:text-[#DCE7FF] transition-colors" />
            </div>
            <Link href="/corporate#join" className="hidden lg:block text-white text-base font-semibold hover:text-[#DCE7FF] transition-colors">Partner with us</Link>
            <GetTheApp variant="hero" />
            <DesktopAccount account={account} hasVisit={!!visitLine} />
          </nav>
        </header>

        {/* Above the cards, so the location dropdown opens over them. */}
        <div className="relative z-[2] max-w-[1060px] mx-auto px-6 pt-8 lg:pt-12 flex flex-col items-center text-center gap-4">
          <h1 className="max-w-[1010px] text-white text-[38px] lg:text-[44px] leading-[1.18] font-extrabold tracking-[-0.025em] text-balance">{headline}</h1>
          {visitLine && <VisitPill line={visitLine} />}

          <form role="search" onSubmit={search} className="mt-6 lg:mt-10 w-full grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 lg:gap-6">
            {/* The location: a dropdown under the field (phones use the location sheet). */}
            <div className="relative flex">
              <button
                ref={locAnchor}
                type="button"
                onClick={() => setLocOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={locOpen}
                aria-label={`Your location: ${where ?? "not set"}. Change`}
                className={`w-full flex items-center gap-3 h-[62px] lg:h-[66px] px-5 lg:px-6 bg-white rounded-2xl text-left shadow-[0_12px_28px_-16px_rgba(4,18,66,0.6)] transition-shadow ${locOpen ? "ring-4 ring-[#A9CBFF]/80" : "hover:ring-4 hover:ring-[#A9CBFF]/50"}`}
              >
                <MapPin className="w-6 h-6 text-[#1D4ED8] shrink-0" strokeWidth={2.2} />
                <span className="flex-1 min-w-0 truncate text-[17px] font-semibold text-[#0B1B3F]">{where ?? "Set your location"}</span>
                <ChevronDown className={`w-5 h-5 text-[#1D4ED8] shrink-0 transition-transform duration-200 ${locOpen ? "rotate-180" : ""}`} strokeWidth={2.6} />
              </button>
              {locOpen && <LocationMenu place={place} cities={cities} anchor={locAnchor} onClose={closeLoc} />}
            </div>
            <div className="flex items-center gap-2 h-[62px] lg:h-[66px] pl-5 lg:pl-6 pr-2 bg-white rounded-2xl shadow-[0_12px_28px_-16px_rgba(4,18,66,0.6)] focus-within:ring-4 focus-within:ring-[#A9CBFF]/70 transition-shadow">
              <label htmlFor="home-search" className="sr-only">{searchLabel}</label>
              <input
                id="home-search"
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchLabel}
                className="flex-1 min-w-0 bg-transparent text-[17px] text-[#0B1B3F] placeholder:text-[#6B7489] outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              <button type="submit" aria-label="Search" className="w-12 h-12 rounded-xl text-[#1D4ED8] flex items-center justify-center shrink-0 hover:bg-[#EEF3FF] transition-colors">
                <Search className="w-6 h-6" strokeWidth={2.4} />
              </button>
            </div>
          </form>
        </div>

        {/* Pictures are sized to the card's width, so they stay clear of the highlight as the cards narrow. */}
        <div className="relative z-[1] max-w-[1280px] mx-auto mt-12 lg:mt-16 px-6 lg:px-12 grid grid-cols-3 gap-5 lg:gap-6">
          <DesktopServiceCard service={services[0]} image="right-[3%] bottom-0 w-[46%] h-auto" />
          <DesktopServiceCard service={services[1]} image="right-[4%] bottom-4 w-[51%] h-auto" />
          <DesktopServiceCard service={services[2]} image="-right-1 bottom-5 w-[70%] h-auto" />
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

// A service as a white card: the name, what it is and a highlight at the top left, the round arrow at the bottom left
// and the picture at the bottom right (placed by `image`).

function PhoneServiceCard({ service: s, wide = false, image }: { service: Service; wide?: boolean; image: string }) {
  return (
    <Link
      href={s.href}
      className={`relative overflow-hidden flex flex-col bg-white rounded-[22px] text-[#151B2E] shadow-[0_1px_2px_rgba(4,18,66,0.08),0_16px_30px_-14px_rgba(4,18,66,0.6)] active:scale-[0.99] transition-transform ${
        wide ? "min-h-[200px] p-5" : "min-h-[236px] p-4"
      }`}
    >
      <h2 className={`relative z-[1] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] ${wide ? "max-w-[64%] text-[22px]" : "text-[17px]"}`}>{s.title}</h2>
      <p className={`relative z-[1] mt-1.5 font-semibold uppercase leading-[1.3] text-[#7A8197] ${wide ? "text-[13px]" : "text-[11px]"}`}>{s.kind}</p>
      <span className={`relative z-[1] self-start mt-3 rounded-full bg-[#E4ECFF] text-[#1D4ED8] font-extrabold uppercase ${wide ? "px-3 py-1.5 text-[12px]" : "px-2.5 py-1 text-[10.5px]"}`}>
        {s.tag}
      </span>
      <span aria-hidden className="relative z-[1] mt-auto pt-3">
        <span className={`rounded-full bg-[#1D4ED8] text-white flex items-center justify-center ${wide ? "w-11 h-11" : "w-9 h-9"}`}>
          <ArrowRight className={wide ? "w-5 h-5" : "w-[18px] h-[18px]"} strokeWidth={2.4} />
        </span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image} alt={s.alt} className={`absolute pointer-events-none select-none ${image}`} />
    </Link>
  );
}

function DesktopServiceCard({ service: s, image }: { service: Service; image: string }) {
  return (
    <Link
      href={s.href}
      className="group relative overflow-hidden flex flex-col min-h-[280px] lg:min-h-[320px] xl:min-h-[350px] p-6 lg:p-7 bg-white rounded-[22px] lg:rounded-[26px] text-[#151B2E] shadow-[0_2px_4px_rgba(4,18,66,0.08),0_24px_48px_-22px_rgba(4,18,66,0.6)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(4,18,66,0.08),0_32px_56px_-22px_rgba(4,18,66,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#A9CBFF]"
    >
      <h2 className="relative z-[1] text-[20px] lg:text-[22px] xl:text-[28px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em]">{s.title}</h2>
      <p className="relative z-[1] mt-2 text-[12px] lg:text-[14px] xl:text-[16px] font-semibold uppercase leading-[1.3] tracking-[0.01em] text-[#7A8197]">{s.kind}</p>
      <span className="relative z-[1] self-start mt-4 lg:mt-5 px-3 lg:px-3.5 py-1 lg:py-1.5 rounded-full bg-[#E4ECFF] text-[#1D4ED8] text-[11px] lg:text-[12px] xl:text-[14px] font-extrabold uppercase tracking-[0.01em]">
        {s.tag}
      </span>
      <span aria-hidden className="relative z-[1] mt-auto pt-4">
        <span className="w-10 h-10 lg:w-12 lg:h-12 xl:w-[52px] xl:h-[52px] rounded-full bg-[#1D4ED8] text-white flex items-center justify-center shadow-[0_10px_20px_-8px_rgba(29,78,216,0.7)] transition-colors duration-300 group-hover:bg-[#1E40AF]">
          <ArrowRight className="w-[18px] h-[18px] lg:w-5 lg:h-5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.4} />
        </span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image} alt={s.alt} className={`absolute origin-bottom-right pointer-events-none select-none transition-transform duration-500 ease-out group-hover:scale-[1.03] ${image}`} />
    </Link>
  );
}
