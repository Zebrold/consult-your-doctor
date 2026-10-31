import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Building2, CalendarDays, ChevronDown, ChevronRight, MapPin, Menu, Search, Settings, UserRound } from "lucide-react";
import { RemoteImage } from "@/components/RemoteImage";
import { placeOf } from "@/components/patient/HospitalCards";
import { SPECIALITIES, specialityIcon } from "@/components/home/specialities";
import type { HomeHospital } from "@/components/home/types";
import { VerifiedBadge } from "@/components/home/ui";
import { formatCityName } from "@/lib/geo";

// The tiles after All, as on the patient app's home.
const TILES = ["general-physician", "cardiology", "orthopaedics", "paediatrics", "gynaecology"].flatMap((slug) => SPECIALITIES.filter((s) => s.slug === slug));

/**
 * Decorative preview of the patient app's home on the marketing home page, drawn as a real-proportion phone rather
 * than a picture so it stays sharp at any size. The hospitals are real partners (photos first), so the preview never
 * shows a hospital that isn't on the site. The phone is designed 430px wide with 1em = 16px; its font size is tied to
 * the width it is given (container query units), so every em inside scales with it.
 */
export function HomePhoneMockup({ hospitals, size = "max-w-[220px] md:max-w-[234px] lg:max-w-[248px]" }: { hospitals: HomeHospital[]; size?: string }) {
  return (
    <div
      role="img"
      aria-label="Preview of the Consult your Doctor mobile app: specialities, your visits and partner hospitals near you"
      className={`@container relative w-full ${size} select-none pointer-events-none`}
    >
      <div style={{ fontSize: "calc(100cqw / 26.875)" }} className="relative w-full h-[55.625em]">
        {/* Side buttons: action and volume on the left, power on the right */}
        <span className="absolute -left-[0.1875em] top-[8.75em] w-[0.25em] h-[2em] rounded-l-[0.125em] bg-[linear-gradient(90deg,#3d4046,#1c1d20)]" />
        <span className="absolute -left-[0.1875em] top-[12.5em] w-[0.25em] h-[3.5em] rounded-l-[0.125em] bg-[linear-gradient(90deg,#3d4046,#1c1d20)]" />
        <span className="absolute -left-[0.1875em] top-[16.875em] w-[0.25em] h-[3.5em] rounded-l-[0.125em] bg-[linear-gradient(90deg,#3d4046,#1c1d20)]" />
        <span className="absolute -right-[0.1875em] top-[14.375em] w-[0.25em] h-[5.5em] rounded-r-[0.125em] bg-[linear-gradient(270deg,#3d4046,#1c1d20)]" />

        {/* Titanium band, then the black bezel */}
        <div className="absolute inset-0 rounded-[4.25em] p-[0.1875em] bg-[linear-gradient(145deg,#71757d,#2a2c30_30%,#50545b_58%,#1d1f22)] shadow-[0_2.25em_4em_-1.25em_rgba(15,23,42,0.45),0_0.75em_1.5em_-0.75em_rgba(15,23,42,0.25)]">
          <div className="w-full h-full rounded-[4.0625em] bg-[#0a0a0b] p-[0.5625em]">
            <Screen hospitals={hospitals} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen({ hospitals }: { hospitals: HomeHospital[] }) {
  // The city with the most partner hospitals, and only its hospitals, so "Nearest to" stays true.
  const counts = new Map<string, number>();
  for (const h of hospitals) if (h.city) counts.set(formatCityName(h.city), (counts.get(formatCityName(h.city)) ?? 0) + 1);
  const city = [...counts].reduce<[string, number] | null>((best, c) => (!best || c[1] > best[1] ? c : best), null)?.[0] ?? null;
  const shown = (city ? hospitals.filter((h) => h.city && formatCityName(h.city) === city) : hospitals).slice(0, 4);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[3.5em] bg-[#F6F8FC] text-[#0B1B3F]">
      {/* Dynamic Island */}
      <span className="absolute z-20 top-[0.6875em] left-1/2 -translate-x-1/2 w-[7.875em] h-[2.3125em] rounded-full bg-black">
        <span className="absolute right-[0.875em] top-1/2 -translate-y-1/2 w-[0.75em] h-[0.75em] rounded-full bg-[radial-gradient(circle_at_35%_35%,#2c3a5c,#0b0f1a_70%)]" />
      </span>

      {/* The blue header: brand and buttons, the greeting, the location and search */}
      <div className="bg-[#1D4ED8] text-white rounded-b-[1.5em] pb-[0.875em]">
        <div className="h-[2.875em] pt-[0.3125em] px-[2em] flex items-center justify-between">
          <span className="font-sans font-semibold text-[1.0625em] tracking-tight">9:41</span>
          <span className="flex items-center gap-[0.3125em]">
            <SignalIcon className="w-[1.125em] h-[0.75em]" />
            <WifiIcon className="w-[1em] h-[0.75em]" />
            <BatteryIcon className="w-[1.6875em] h-[0.75em]" />
          </span>
        </div>

        <div className="px-[1em]">
          <div className="h-[2.625em] flex items-center justify-between gap-[0.5em]">
            <div className="flex items-center gap-[0.5em] min-w-0">
              <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="48px" className="w-[2.5em] h-[2.5em] object-contain shrink-0" />
              <div className="min-w-0 leading-tight">
                <p className="font-extrabold text-[1.125em] tracking-tight whitespace-nowrap">Consult your Doctor</p>
                <p className="text-[0.6875em] text-[#DCE7FF] whitespace-nowrap">Your health, our priority</p>
              </div>
            </div>
            <div className="flex items-center gap-[0.4375em] shrink-0">
              <span className="w-[2.25em] h-[2.25em] rounded-full bg-white text-[#1D4ED8] flex items-center justify-center">
                <UserRound className="w-[1.125em] h-[1.125em]" strokeWidth={2} />
              </span>
              <span className="w-[2.25em] h-[2.25em] rounded-full shadow-[inset_0_0_0_0.0625em_rgba(255,255,255,0.55)] flex items-center justify-center">
                <Menu className="w-[1.125em] h-[1.125em]" strokeWidth={2} />
              </span>
            </div>
          </div>

          <p className="mt-[0.5em] text-[0.8125em] leading-[1.25] text-[#DCE7FF]">Good afternoon,</p>
          <p className="text-[1.375em] leading-[1.1] font-extrabold tracking-[-0.02em]">Patient</p>
          <span className="mt-[0.375em] inline-flex items-center gap-[0.375em] h-[1.625em] px-[0.6875em] rounded-full bg-white/[0.08] shadow-[inset_0_0_0_0.0625em_rgba(255,255,255,0.5)]">
            <MapPin className="w-[0.875em] h-[0.875em]" strokeWidth={2.2} />
            <span className="text-[0.75em] font-bold">{city ?? "Your city"}</span>
            <ChevronDown className="w-[0.75em] h-[0.75em]" strokeWidth={2.6} />
          </span>
          <div className="mt-[0.5em] h-[2.5em] rounded-[0.75em] bg-white flex items-center gap-[0.5em] pl-[0.75em] pr-[0.25em] shadow-[0_0.5em_1em_-0.5em_rgba(4,18,66,0.5)]">
            <Search className="w-[1em] h-[1em] text-[#7A8599] shrink-0" strokeWidth={2.2} />
            <span className="flex-1 min-w-0 truncate text-[0.75em] text-[#7A8599]">Search doctors, hospitals or labs</span>
            <span className="w-[2em] h-[2em] rounded-[0.5em] bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
              <Search className="w-[1em] h-[1em]" strokeWidth={2.4} />
            </span>
          </div>
        </div>
      </div>

      <div className="px-[1em]">
        <Heading title="Specialities" link="See all" className="mt-[1em]" />
        <div className="mt-[0.5em] flex justify-between">
          <Tile label={["All"]} active>
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="32px" className="w-[1.75em] h-[1.75em] object-contain" />
          </Tile>
          {TILES.map((s) => (
            <Tile key={s.slug} label={s.slug === "general-physician" ? ["General", "Physician"] : [s.name]}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={specialityIcon(s)} alt="" className="w-[2.125em] h-[2.125em]" />
            </Tile>
          ))}
        </div>

        <div className="mt-[0.5em] flex items-center gap-[0.625em] p-[0.5em] rounded-[0.875em] bg-white shadow-[0_0_0_0.0625em_#E6EBF3]">
          <span className="w-[2.5em] h-[2.5em] rounded-[0.625em] shadow-[inset_0_0_0_0.0625em_#E1E7F0] flex items-center justify-center text-[#1D4ED8] shrink-0">
            <CalendarDays className="w-[1.25em] h-[1.25em]" strokeWidth={2} />
          </span>
          <span className="flex-1 min-w-0 leading-tight">
            <span className="block text-[0.875em] font-extrabold">No visits booked</span>
            <span className="block mt-[0.125em] text-[0.6875em] text-[#5B667A] truncate">Find a doctor near you and pick a time</span>
          </span>
          <ChevronRight className="w-[1em] h-[1em] text-[#9AA4B5] shrink-0" strokeWidth={2.4} />
        </div>

        {shown.length > 0 && (
          <>
            <Heading title="Top hospitals near you" sub={city ? `Nearest to ${city}` : undefined} link="View all" className="mt-[0.875em]" />
            <div className="mt-[0.5em] grid grid-cols-2 gap-[0.625em]">
              {shown.map((h) => (
                <HospitalTile key={h.id} h={h} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* The floating tab bar: home, bookings, search and settings */}
      <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-[1.75em] w-[18.5em] h-[3em] p-[0.3125em] rounded-full bg-[#1D4ED8] shadow-[0_0.75em_1.5em_-0.5em_rgba(29,78,216,0.6)] flex items-center justify-between text-white">
        <span className="h-full w-[4.75em] rounded-full bg-white flex items-center justify-center">
          <Image src="/logo-icon.png" alt="" width={96} height={96} sizes="32px" className="w-[1.5em] h-[1.5em] object-contain" />
        </span>
        {[CalendarDays, Search, Settings].map((Glyph, i) => (
          <span key={i} className="w-[4em] flex justify-center">
            <Glyph className="w-[1.375em] h-[1.375em]" strokeWidth={1.9} />
          </span>
        ))}
      </div>
    </div>
  );
}

function Heading({ title, sub, link, className }: { title: string; sub?: string; link: string; className: string }) {
  return (
    <div className={`flex items-end justify-between gap-[0.5em] ${className}`}>
      <div className="min-w-0 leading-tight">
        <p className="text-[1.125em] font-extrabold tracking-[-0.01em]">{title}</p>
        {sub && <p className="mt-[0.125em] text-[0.75em] text-[#5B667A] truncate">{sub}</p>}
      </div>
      <span className="flex items-center text-[#1D4ED8] shrink-0">
        <span className="text-[0.75em] font-bold">{link}</span>
        <ChevronRight className="w-[0.875em] h-[0.875em]" strokeWidth={2.4} />
      </span>
    </div>
  );
}

function Tile({ label, active = false, children }: { label: string[]; active?: boolean; children: ReactNode }) {
  return (
    <div className="w-[3.25em] flex flex-col items-center">
      <span
        className={`w-[3.25em] h-[3.25em] rounded-[0.875em] flex items-center justify-center ${
          active
            ? "bg-[linear-gradient(160deg,#2F63F0,#1D4ED8)] shadow-[0_0.375em_0.75em_-0.25em_rgba(29,78,216,0.55)]"
            : "bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)] shadow-[inset_0_0_0_0.0625em_#D6E2FB]"
        }`}
      >
        {children}
      </span>
      <span className={`mt-[0.3125em] text-center whitespace-nowrap leading-[1.25] text-[0.5625em] font-bold ${active ? "text-[#1D4ED8]" : "text-[#27324A]"}`}>
        {label.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

/** A partner hospital as on the app: its photo, name, what it offers and where it is. */
function HospitalTile({ h }: { h: HomeHospital }) {
  const area = placeOf(h);
  const place = h.city && area !== h.city ? `${area}, ${formatCityName(h.city)}` : area;
  return (
    <div className="overflow-hidden rounded-[0.75em] bg-white shadow-[0_0_0_0.0625em_#E6EBF3,0_0.25em_0.75em_-0.375em_rgba(11,27,63,0.12)]">
      <span className="relative block h-[5.75em] bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)]">
        {h.image ? (
          <RemoteImage src={h.image} alt="" fill sizes="160px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[#2A4DD0]">
            <Building2 className="w-[2em] h-[2em]" strokeWidth={1.5} />
          </span>
        )}
      </span>
      <span className="block px-[0.5em] pt-[0.4375em] pb-[0.5em] leading-tight">
        <span className="flex items-center gap-[0.25em] min-w-0">
          <span className="truncate text-[0.75em] font-extrabold">{h.name}</span>
          <VerifiedBadge className="w-[0.75em] h-[0.75em]" />
        </span>
        <span className="block mt-[0.125em] truncate text-[0.625em] text-[#5B667A]">
          {h.specialties.length >= 3 ? "Multi-speciality hospital" : (h.specialties[0]?.name ?? "Partner hospital")}
        </span>
        <span className="mt-[0.25em] flex items-center gap-[0.25em] text-[#5B667A]">
          <MapPin className="w-[0.75em] h-[0.75em] shrink-0" strokeWidth={2} />
          <span className="flex-1 min-w-0 truncate text-[0.625em]">{place}</span>
          <ArrowRight className="w-[0.875em] h-[0.875em] text-[#1D4ED8] shrink-0" strokeWidth={2.4} />
        </span>
      </span>
    </div>
  );
}

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" fill="currentColor" aria-hidden className={className}>
      <rect x="0" y="8" width="3" height="4" rx="0.8" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
      <rect x="10" y="3" width="3" height="9" rx="0.8" />
      <rect x="15" y="0" width="3" height="12" rx="0.8" />
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden className={className}>
      <path d="M1.3 4.4a9.4 9.4 0 0 1 13.4 0" />
      <path d="M3.8 7a5.8 5.8 0 0 1 8.4 0" />
      <path d="M6.4 9.6a2.3 2.3 0 0 1 3.2 0" />
    </svg>
  );
}

function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 27 12" aria-hidden className={className}>
      <rect x="0.5" y="0.5" width="23" height="11" rx="3.2" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      <rect x="2" y="2" width="20" height="8" rx="2" fill="currentColor" />
      <path d="M25 4v4c.8-.3 1.5-1.1 1.5-2S25.8 4.3 25 4Z" fill="currentColor" fillOpacity="0.45" />
    </svg>
  );
}
