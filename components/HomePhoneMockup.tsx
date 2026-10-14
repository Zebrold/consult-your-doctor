import Image from "next/image";
import type { ComponentType } from "react";
import {
  Baby,
  Bot,
  CalendarDays,
  ChevronRight,
  Ellipsis,
  FileText,
  Heart,
  Menu,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  UserRound,
} from "lucide-react";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

// Sample screen content for the illustration (the real app lists live doctors, fees and open slots).
const specialties: { lines: string[]; icon: Icon; active?: boolean; more?: boolean }[] = [
  { lines: ["All"], icon: Stethoscope, active: true },
  { lines: ["General", "Physician"], icon: UserRound },
  { lines: ["Dermatology"], icon: SkinIcon },
  { lines: ["Pediatrics"], icon: Baby },
  { lines: ["Cardiology"], icon: Heart },
  { lines: ["More"], icon: Ellipsis, more: true },
];

const doctors = [
  { name: "Dr. Ananya Mehta", specialty: "General Physician", degree: "MBBS, MD", years: 12, rating: "4.9", reviews: "8.4K", fee: 350, photo: "/images/avatars/doctor-1.webp" },
  { name: "Dr. Rohit Sharma", specialty: "Dermatologist", degree: "MBBS, MD", years: 10, rating: "4.8", reviews: "6.2K", fee: 200, photo: "/images/avatars/doctor-4.webp" },
  { name: "Dr. Sneha Kapoor", specialty: "Pediatrician", degree: "MBBS, MD", years: 11, rating: "4.9", reviews: "7.1K", fee: 200, photo: "/images/avatars/doctor-2.webp" },
  { name: "Dr. Arjun Iyer", specialty: "Cardiologist", degree: "MBBS, DM", years: 14, rating: "4.9", reviews: "5.8K", fee: 400, photo: "/images/avatars/doctor-3.webp" },
];

const tabs: { label: string; icon: Icon; active?: boolean }[] = [
  { label: "Home", icon: HomeIcon, active: true },
  { label: "Appointments", icon: CalendarDays },
  { label: "Health Records", icon: FileText },
  { label: "Zebrold AI", icon: Bot },
  { label: "Profile", icon: UserRound },
];

/**
 * Decorative preview of the patient mobile app on the marketing home page, drawn as a real-proportion phone rather
 * than a picture so it stays sharp at any size. The phone is designed 430px wide with 1em = 16px; its font size is
 * tied to the width it is given (container query units), so every em inside scales with it.
 */
export function HomePhoneMockup() {
  return (
    <div
      role="img"
      aria-label="Preview of the Consult your Doctor mobile app: specialties and top doctors with their fees"
      className="@container relative w-full max-w-[220px] md:max-w-[234px] lg:max-w-[248px] select-none pointer-events-none"
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
            <Screen />
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-[3.5em] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fd_45%,#f4f7fc_100%)] text-indigo-gray-900">
      {/* Dynamic Island */}
      <span className="absolute z-20 top-[0.6875em] left-1/2 -translate-x-1/2 w-[7.875em] h-[2.3125em] rounded-full bg-black">
        <span className="absolute right-[0.875em] top-1/2 -translate-y-1/2 w-[0.75em] h-[0.75em] rounded-full bg-[radial-gradient(circle_at_35%_35%,#2c3a5c,#0b0f1a_70%)]" />
      </span>

      {/* Status bar */}
      <div className="relative z-10 h-[3.375em] pt-[0.3125em] px-[2em] flex items-center justify-between">
        <span className="font-sans font-semibold text-[1.0625em] tracking-tight">9:41</span>
        <span className="flex items-center gap-[0.3125em]">
          <SignalIcon className="w-[1.125em] h-[0.75em]" />
          <WifiIcon className="w-[1em] h-[0.75em]" />
          <BatteryIcon className="w-[1.6875em] h-[0.75em]" />
        </span>
      </div>

      <div className="px-[1em]">
        {/* App header */}
        <div className="mt-[0.5em] flex items-center justify-between gap-[0.5em]">
          <div className="flex items-center gap-[0.5em] min-w-0">
            <Image src="/logo-icon.png" alt="" width={96} height={96} sizes="48px" className="w-[3em] h-[3em] object-contain shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-title-md font-extrabold text-[1.1875em] tracking-tight whitespace-nowrap">Consult your Doctor</p>
              <p className="mt-[0.125em] text-[0.8125em] text-slate-500">Good morning</p>
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <span className="w-[2.5em] h-[2.5em] rounded-full bg-[#eef3fb] flex items-center justify-center">
              <Menu className="w-[1.25em] h-[1.25em] text-indigo-gray-900" strokeWidth={2} />
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mt-[0.875em] h-[2.875em] rounded-full bg-[#f1f5fb] border border-[#e3e9f3] flex items-center gap-[0.625em] pl-[1em] pr-[0.375em]">
          <Search className="w-[1.1875em] h-[1.1875em] text-slate-500 shrink-0" strokeWidth={2} />
          <span className="flex-1 min-w-0 truncate text-[0.8125em] text-slate-400">Search doctors, specialties or conditions</span>
          <span className="w-[2.125em] h-[2.125em] rounded-full bg-white shadow-[0_0.0625em_0.25em_rgba(15,23,42,0.08)] flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-[1em] h-[1em] text-indigo-gray-900" strokeWidth={2} />
          </span>
        </div>

        {/* Specialties */}
        <div className="mt-[1em] flex justify-between">
          {specialties.map(({ lines, icon: Glyph, active, more }) => (
            <div key={lines.join(" ")} className="w-[3.375em] flex flex-col items-center">
              <span
                className={`w-[3.375em] h-[3.375em] rounded-[1em] flex items-center justify-center ${
                  active
                    ? "bg-vibrant-blue text-white shadow-[0_0.375em_0.75em_-0.25em_rgba(0,102,255,0.55)]"
                    : more
                      ? "bg-white border border-[#e3e9f3] text-vibrant-blue"
                      : "bg-[#eef4ff] border border-[#e1eafc] text-vibrant-blue"
                }`}
              >
                <Glyph className="w-[1.5em] h-[1.5em]" strokeWidth={1.9} />
              </span>
              <span className={`mt-[0.4375em] text-center whitespace-nowrap leading-[1.25] text-[0.6875em] ${active ? "text-vibrant-blue font-semibold" : "text-slate-700 font-medium"}`}>
                {lines.map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </span>
            </div>
          ))}
        </div>

        {/* Top doctors */}
        <div className="mt-[1.125em] flex items-center justify-between">
          <p className="font-title-md font-extrabold text-[1.3125em] tracking-tight">Top Doctors for You</p>
          <span className="flex items-center gap-[0.125em] text-vibrant-blue">
            <span className="text-[0.8125em] font-semibold">View All</span>
            <ChevronRight className="w-[1em] h-[1em]" strokeWidth={2.2} />
          </span>
        </div>

        <div className="mt-[0.75em] flex flex-col gap-[0.625em]">
          {doctors.map((d) => (
            <div
              key={d.name}
              className="flex items-center gap-[0.625em] p-[0.625em] rounded-[1.125em] bg-white border border-[#edf1f7] shadow-[0_0.125em_0.625em_rgba(15,23,42,0.05)]"
            >
              <span className="relative w-[4.75em] h-[4.75em] shrink-0">
                <span className="absolute inset-0 rounded-full overflow-hidden bg-slate-100">
                  <Image src={d.photo} alt="" fill sizes="80px" className="object-cover" />
                </span>
                <span className="absolute right-[0.1875em] bottom-[0.25em] w-[0.875em] h-[0.875em] rounded-full bg-emerald-500 shadow-[0_0_0_0.15625em_#ffffff]" />
              </span>

              <div className="flex-1 min-w-0 leading-tight">
                <p className="font-title-md font-bold text-[1em] truncate">{d.name}</p>
                <p className="mt-[0.1875em] text-[0.78125em] text-slate-500 truncate">{d.specialty}</p>
                <p className="mt-[0.25em] text-[0.625em] tracking-[-0.025em] text-slate-500 truncate">
                  {d.degree} • {d.years}+ Years Experience
                </p>
                <div className="mt-[0.375em] flex items-center gap-[0.375em]">
                  <span className="inline-flex items-center gap-[0.1875em] px-[0.375em] py-[0.125em] rounded-[0.375em] bg-[#e8f8ef] text-emerald-700">
                    <Star className="w-[0.75em] h-[0.75em] fill-current" strokeWidth={0} />
                    <span className="text-[0.75em] font-bold">{d.rating}</span>
                  </span>
                  <span className="text-[0.6875em] text-slate-500 whitespace-nowrap">({d.reviews} Reviews)</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-[0.5em] shrink-0">
                <span className="font-title-md font-extrabold text-[1.375em] leading-none tracking-tight text-vibrant-blue">₹{d.fee}</span>
                <span className="h-[2.25em] px-[0.75em] rounded-full bg-vibrant-blue text-white flex items-center shadow-[0_0.25em_0.5em_-0.25em_rgba(0,102,255,0.6)]">
                  <span className="text-[0.71875em] font-semibold whitespace-nowrap">Consult Now</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar and home indicator */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-[5.25em] bg-white/95 backdrop-blur border-t border-[#eef1f6] shadow-[0_-0.25em_1em_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-5 pt-[0.625em]">
          {tabs.map(({ label, icon: Glyph, active }) => (
            <span key={label} className={`flex flex-col items-center gap-[0.25em] ${active ? "text-vibrant-blue" : "text-slate-500"}`}>
              <Glyph className="w-[1.5em] h-[1.5em]" strokeWidth={1.8} />
              <span className={`text-[0.65625em] whitespace-nowrap ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
            </span>
          ))}
        </div>
        <span className="absolute bottom-[0.5em] left-1/2 -translate-x-1/2 w-[8.5em] h-[0.3125em] rounded-full bg-indigo-gray-900" />
      </div>
    </div>
  );
}

/** Solid house with a door, for the active Home tab. */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M10.6 2.5a2.2 2.2 0 0 1 2.8 0l7 5.9c.4.4.6.9.6 1.4V19a2 2 0 0 1-2 2h-4v-6.5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1V21H5a2 2 0 0 1-2-2V9.8c0-.5.2-1 .6-1.4l7-5.9Z" />
    </svg>
  );
}

/** Skin layers with hair, for Dermatology. */
function SkinIcon({ className, strokeWidth = 1.9 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M3 13h18" />
      <path d="M8 13c0-3 -1.2-4.5 -1.2-7" />
      <path d="M12 13c0-3.4 .6-5.6 .6-8.5" />
      <path d="M16 13c0-2.6 1.2-4 1.2-6.5" />
      <path d="M3 17.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2" />
      <path d="M6 21h.01M10 21h.01M14 21h.01M18 21h.01" />
    </svg>
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
