"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell, CalendarDays, CircleHelp, FlaskConical, Hospital, House, LogIn, LogOut, Search, Settings, Stethoscope, UserRound, type LucideIcon,
} from "lucide-react";
import { initials } from "@/components/patient/format";
import { FloatingTabBar } from "@/components/FloatingTabBar";

type Tab = "home" | "find" | "book" | "ai" | "profile";

interface PatientDockProps {
  activeTab?: Tab;
  /** Pass false for signed-out visitors: the tabs offer sign-in instead of the account. */
  isSignedIn?: boolean;
  /** The patient's name, for the sidebar's account card. */
  name?: string | null;
  /** A line under the name in the sidebar, e.g. the UHID. */
  detail?: string | null;
  /** Off for detail pages with their own booking bar at the bottom of phones (a hospital, a lab). */
  phoneBar?: boolean;
}

type NavItem = { key: string; href: string; label: string; icon: LucideIcon };

/** Which sidebar item a path belongs to. */
function railKey(path: string, signedIn: boolean): string {
  if (path === "/") return "home";
  if (path.startsWith("/patient/appointments") || path.startsWith("/patient/checkout") || path.startsWith("/book/confirmation")) return "book";
  if (/^\/patient\/(profile|family|saved|insurance)/.test(path)) return "profile";
  if (path.startsWith("/patient/preferences")) return "settings";
  if (path.startsWith("/patient/support")) return "help";
  if (!signedIn && path.startsWith("/hospitals")) return "hospitals";
  if (!signedIn && (path.startsWith("/diagnostics") || path.startsWith("/book/diagnostic"))) return "labs";
  return "find";
}

/** The top bar's "where am I": the section, then the page. */
function crumb(path: string): string[] {
  if (path === "/") return ["Home"];
  if (path.startsWith("/patient/appointments")) return ["My bookings"];
  if (path.startsWith("/patient/checkout")) return ["My bookings", "Payment"];
  if (path.startsWith("/book/confirmation")) return ["My bookings", "Appointment pass"];
  if (path.startsWith("/patient/profile")) return ["Profile & records"];
  if (path.startsWith("/patient/family")) return ["Profile & records", "Family"];
  if (path.startsWith("/patient/saved")) return ["Profile & records", "Your doctors & labs"];
  if (path.startsWith("/patient/insurance")) return ["Profile & records", "Payments & billing"];
  if (path.startsWith("/patient/preferences")) return ["Settings"];
  if (path.startsWith("/patient/support")) return ["Help & support"];
  if (path === "/ai") return ["Care Assistant"];
  if (/^\/hospitals\/(?!in\/)[^/]+/.test(path)) return ["Find care", "Hospital"];
  if (path.startsWith("/hospitals")) return ["Find care", "Hospitals"];
  if (/^\/doctors\/(?!in\/)[^/]+/.test(path)) return ["Find care", "Doctor"];
  if (path.startsWith("/doctors")) return ["Find care", "Doctors"];
  if (path.startsWith("/book/diagnostic")) return ["Find care", "Book lab tests"];
  if (path.startsWith("/diagnostics")) return ["Find care", "Diagnostic centres"];
  if (path.startsWith("/book")) return ["Find care", "Book a visit"];
  if (path.startsWith("/specialities")) return ["Find care", "Speciality"];
  return ["Find care"];
}

/**
 * The patient navigation. Phones and tablets get the floating tab bar along the bottom; desktops get the blue sidebar
 * with the menu and the account, and a white top bar with the page's place, search and bookings.
 */
export function PatientDock({ activeTab = "home", isSignedIn = true, name, detail, phoneBar = true }: PatientDockProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const suffix = searchParams.get("preview") === "patient" ? "?preview=patient" : "";

  const tabs: (NavItem & { active: boolean })[] = isSignedIn
    ? [
        { key: "home", href: `/${suffix}`, label: "Home", icon: Stethoscope, active: activeTab === "home" },
        { key: "book", href: `/patient/appointments${suffix}`, label: "Bookings", icon: CalendarDays, active: activeTab === "book" },
        { key: "find", href: `/find${suffix}`, label: "Search", icon: Search, active: activeTab === "find" },
        { key: "profile", href: `/patient/profile${suffix}`, label: "Settings", icon: Settings, active: activeTab === "profile" },
      ]
    : [
        { key: "home", href: "/", label: "Home", icon: Stethoscope, active: activeTab === "home" },
        { key: "book", href: "/login/patient?next=/patient/appointments", label: "Bookings", icon: CalendarDays, active: activeTab === "book" },
        { key: "find", href: "/find", label: "Search", icon: Search, active: activeTab === "find" },
        { key: "profile", href: "/login/patient", label: "Login", icon: LogIn, active: activeTab === "profile" },
      ];

  return (
    <>
      {phoneBar && <FloatingTabBar label="Patient navigation" tabs={tabs} />}
      <Rail pathname={pathname} isSignedIn={isSignedIn} name={name} detail={detail} />
      <TopBar pathname={pathname} isSignedIn={isSignedIn} />
    </>
  );
}

function Rail({ pathname, isSignedIn, name, detail }: { pathname: string; isSignedIn: boolean; name?: string | null; detail?: string | null }) {
  const active = railKey(pathname, isSignedIn);
  const menu: NavItem[] = isSignedIn
    ? [
        { key: "home", href: "/", label: "Home", icon: House },
        { key: "find", href: "/find", label: "Find care", icon: Search },
        { key: "book", href: "/patient/appointments", label: "My bookings", icon: CalendarDays },
        { key: "profile", href: "/patient/profile", label: "Profile & records", icon: UserRound },
      ]
    : [
        { key: "home", href: "/", label: "Home", icon: House },
        { key: "find", href: "/find", label: "Find care", icon: Search },
        { key: "hospitals", href: "/hospitals", label: "Hospitals", icon: Hospital },
        { key: "labs", href: "/diagnostics", label: "Lab tests", icon: FlaskConical },
      ];
  const extra: NavItem[] = isSignedIn
    ? [
        { key: "settings", href: "/patient/preferences", label: "Settings", icon: Settings },
        { key: "help", href: "/patient/support", label: "Help & support", icon: CircleHelp },
      ]
    : [{ key: "help", href: "/contact", label: "Help & support", icon: CircleHelp }];

  return (
    <aside
      data-patient-rail
      aria-label="Patient menu"
      className="hidden lg:flex fixed z-40 inset-y-0 left-0 w-[260px] flex-col gap-1 px-4 pt-[22px] pb-[18px] overflow-y-auto no-scrollbar bg-[#2A4DD0] text-white font-(family-name:--font-manrope) print:hidden"
    >
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-[22px]">
        <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="32px" className="w-8 h-8 object-contain shrink-0" />
        <span className="min-w-0 leading-tight">
          <span className="block font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[18px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
          <span className="block text-[11.5px] text-[#CFDCFF]">{isSignedIn ? "Patient workspace" : "Your health, our priority"}</span>
        </span>
      </Link>
      <span className="px-3.5 pb-1.5 text-[11px] font-extrabold tracking-[0.1em] text-[#AFC2FF]">MENU</span>
      {menu.map((item) => (
        <RailLink key={item.key} item={item} active={active === item.key} />
      ))}
      <span className="flex-1 min-h-8" />
      {extra.map((item) => (
        <RailLink key={item.key} item={item} active={active === item.key} small />
      ))}
      {isSignedIn ? (
        <div className="flex items-center gap-2.5 mt-3 p-3 rounded-[14px] border border-white/20">
          <Link href="/patient/profile" className="flex flex-1 min-w-0 items-center gap-2.5">
            <span className="shrink-0 w-[38px] h-[38px] rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">
              {initials(name) || <UserRound className="w-[18px] h-[18px]" strokeWidth={2.2} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-extrabold truncate">{name || "My account"}</span>
              <span className="block text-[11.5px] text-[#CFDCFF] truncate">{detail || "Patient"}</span>
            </span>
          </Link>
          <form action="/auth/signout" method="post" className="shrink-0">
            <button type="submit" aria-label="Log out" title="Log out" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-3 p-3.5 rounded-[14px] border border-white/20">
          <p className="text-[13.5px] font-extrabold">Book in a few taps</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#CFDCFF]">Log in with your mobile number to book and see your visits.</p>
          <Link href="/login/patient" className="mt-3 flex items-center justify-center gap-2 h-10 rounded-[11px] bg-white text-[#2A4DD0] text-[13.5px] font-extrabold hover:bg-white/90 transition-colors">
            <LogIn className="w-4 h-4" /> Login
          </Link>
        </div>
      )}
    </aside>
  );
}

function RailLink({ item: { href, label, icon: Icon }, active, small = false }: { item: NavItem; active: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 px-3.5 rounded-[11px] transition-colors ${small ? "h-[42px] text-[13.5px]" : "h-11 text-[14px]"} ${
        active ? "bg-white text-[#2A4DD0] font-extrabold" : "text-[#E3EAFF] font-bold hover:bg-white/10"
      }`}
    >
      <Icon className={small ? "w-[18px] h-[18px]" : "w-[19px] h-[19px]"} strokeWidth={small ? 2 : 2.1} />
      {label}
    </Link>
  );
}

/** The desktop top bar: where the patient is, a search over doctors, hospitals and tests, and their bookings. */
function TopBar({ pathname, isSignedIn }: { pathname: string; isSignedIn: boolean }) {
  const parts = crumb(pathname);
  return (
    <header className="hidden lg:flex fixed z-30 top-0 left-[260px] right-0 h-[72px] items-center gap-5 px-9 bg-white border-b border-[#E6EAF0] font-(family-name:--font-manrope) print:hidden">
      <span className="shrink-0 text-[13.5px] font-bold text-[#5B667A]">
        {isSignedIn ? "Patient" : "Consult your Doctor"}
        {parts.map((p, i) => (
          <span key={p}>
            <span className="text-[#B7C1D1]"> / </span>
            {i === parts.length - 1 ? <strong className="text-[#0B1B3F]">{p}</strong> : p}
          </span>
        ))}
      </span>
      <span className="flex-1" />
      <form action="/find" role="search" className="flex-[0_1_420px] flex items-center gap-2.5 h-[42px] px-3.5 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] transition-shadow">
        <Search className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
        <label htmlFor="patient-top-search" className="sr-only">Search doctors, hospitals or tests</label>
        <input id="patient-top-search" type="search" name="q" placeholder="Search doctors, hospitals or tests" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] text-[#0B1B3F] placeholder:text-[#7A8599]" />
      </form>
      {isSignedIn ? (
        <Link href="/patient/appointments" aria-label="My bookings" title="My bookings" className="shrink-0 w-[42px] h-[42px] rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center justify-center text-[#27324A] hover:bg-[#EEF2F8] transition-colors">
          <Bell className="w-[19px] h-[19px]" />
        </Link>
      ) : (
        <Link href="/login/patient" className="shrink-0 flex items-center gap-2 h-[42px] px-4 rounded-[11px] bg-[#2A4DD0] text-white text-[13.5px] font-extrabold hover:bg-[#2443B8] transition-colors">
          <LogIn className="w-4 h-4" /> Login
        </Link>
      )}
    </header>
  );
}
