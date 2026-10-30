"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CalendarClock, ChevronDown, ChevronRight, LayoutDashboard, MapPin, Search, UserRound } from "lucide-react";
import { GetTheApp } from "@/components/GetTheApp";
import { initials } from "@/components/patient/format";
import { locationCity, type usePatientLocation } from "@/components/patient/location";
import { PATIENT_ACCOUNT_LINKS } from "@/components/patient/PhoneHeader";
import { AccountMenu } from "@/components/portal/TopBar";
import { CorporateMenu } from "@/components/site/CorporateMenu";
import { AppPromoStrip } from "./AppPromo";
import type { HomeAccount } from "./types";

type Place = ReturnType<typeof usePatientLocation>;

type Props = {
  account: HomeAccount;
  place: Place;
  /** "Your next visit: ..." for a signed-in patient with one coming up. */
  visitLine: string | null;
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
  word: string;
  image: string;
  alt: string;
};

export function HomeHero({ account, place, visitLine, onLocation, onMenu }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const location = place.location;
  const city = locationCity(location);
  const findHref = city ? `/find?city=${encodeURIComponent(city)}` : "/find";

  const where =
    place.status === "locating"
      ? "Finding your location…"
      : location
        ? [location.label, location.city && location.city !== location.label ? location.city : null].filter(Boolean).join(", ")
        : null;

  const search = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    router.push(params.size ? `/find?${params}` : "/find");
  };

  const services: Service[] = [
    { href: "/hospitals", title: "Hospital Booking", kind: "OPD at partner hospitals", kindShort: "OPD at partner hospitals", tag: "Confirmed time slots", word: "Seamless", image: "/images/home/hospital-building.webp", alt: "Hospital building" },
    { href: "/diagnostics", title: "Diagnostics", kind: "Verified partner labs", kindShort: "Verified labs", tag: "Digital reports", word: "Precise", image: "/images/home/lab-microscope.webp", alt: "Microscope and sample tubes" },
    { href: findHref, title: "Consult a Doctor", kind: "Verified specialists near you", kindShort: "Verified specialists", tag: "E-prescriptions", word: "Expert", image: "/images/home/doctor.webp", alt: "Doctor in a white coat with a stethoscope" },
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
            <button
              type="button"
              onClick={onLocation}
              aria-haspopup="dialog"
              aria-label={`Your location: ${where ?? "not set"}. Change`}
              className="flex-[1_1_280px] flex items-center gap-3 min-h-[58px] px-5 bg-white rounded-2xl text-left hover:shadow-[0_0_0_3px_rgba(169,203,255,0.6)] transition-shadow"
            >
              <MapPin className="w-[22px] h-[22px] text-[#1D4ED8] shrink-0" strokeWidth={2.2} />
              <span className={`flex-1 min-w-0 truncate text-[17px] font-semibold ${where ? "text-[#0B1B3F]" : "text-slate-400"}`}>{where ?? "Set your location"}</span>
              <ChevronDown className="w-5 h-5 text-[#0B1B3F] shrink-0" strokeWidth={2.2} />
            </button>
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

        <div className="max-w-[1100px] mx-auto mt-10 px-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">
          <DesktopServiceCard service={services[0]} image="right-3 bottom-4 w-[255px] h-auto" />
          <DesktopServiceCard service={services[1]} image="right-4 bottom-4 h-[170px] w-auto" />
          <DesktopServiceCard service={services[2]} image="right-6 bottom-0 h-[196px] w-auto" />
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

function PhoneServiceCard({ service: s, wide = false }: { service: Service; wide?: boolean }) {
  return (
    <Link
      href={s.href}
      className={`relative overflow-hidden flex flex-col gap-1.5 box-border bg-white rounded-[22px] text-[#0B1B3F] shadow-[0_14px_28px_rgba(11,27,63,0.2)] active:scale-[0.99] transition-transform ${
        wide ? "min-h-[168px] px-5 py-[22px]" : "min-h-[230px] px-4 py-5"
      }`}
    >
      <h2 className={`relative z-[1] font-extrabold uppercase tracking-[-0.02em] leading-[1.05] ${wide ? "text-[22px]" : "text-[19px]"}`}>{s.title}</h2>
      <p className={`relative z-[1] font-bold uppercase text-[#4A5878] ${wide ? "text-[13px]" : "text-[11px]"}`}>{wide ? s.kind : s.kindShort}</p>
      <span className={`relative z-[1] self-start mt-1.5 rounded-lg bg-[#EAF1FF] text-[#1D4ED8] font-extrabold uppercase ${wide ? "px-2.5 py-1.5 text-[12px]" : "px-[9px] py-1.5 text-[11px]"}`}>
        {s.tag}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.image}
        alt={s.alt}
        className={`absolute h-auto ${wide ? "-right-3.5 bottom-1.5 w-[175px]" : s.image.endsWith(".svg") ? "right-1 bottom-1.5 w-[110px]" : "-right-1.5 bottom-1 w-[128px]"}`}
      />
    </Link>
  );
}

function DesktopServiceCard({ service: s, image }: { service: Service; image: string }) {
  return (
    <Link
      href={s.href}
      className="group relative overflow-hidden flex flex-col gap-2.5 min-h-[320px] box-border p-7 bg-white rounded-[28px] text-[#0B1B3F] shadow-[0_20px_40px_rgba(11,27,63,0.22)] hover:-translate-y-1 hover:shadow-[0_26px_48px_rgba(11,27,63,0.28)] transition-all"
    >
      <h2 className="text-[28px] font-extrabold uppercase tracking-[-0.02em] leading-[1.05]">{s.title}</h2>
      <p className="text-base font-bold uppercase text-[#4A5878] tracking-[0.02em]">{s.kind}</p>
      <span className="self-start px-3 py-[7px] rounded-[10px] bg-[#EAF1FF] text-[#1D4ED8] text-sm font-extrabold uppercase">{s.tag}</span>
      <p className="relative z-[1] mt-1.5 max-w-[46%] text-lg font-bold leading-[1.4] text-[#4A5878]">{s.word}</p>
      <span aria-hidden className="relative z-[1] mt-auto w-[52px] h-[52px] rounded-full bg-[#1D4ED8] text-white flex items-center justify-center group-hover:bg-[#1E40AF] transition-colors">
        <ArrowRight className="w-6 h-6" strokeWidth={2.4} />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image} alt={s.alt} className={`absolute ${image}`} />
    </Link>
  );
}
