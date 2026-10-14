"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Bell, CalendarDays, LifeBuoy, LogIn, Menu, Plus, UserRound } from "lucide-react";
import { MenuSheet } from "@/components/patient/PhoneSheet";
import { AccountMenu, type TopBarLink } from "@/components/portal/TopBar";

// The blue app header the patient pages use, first drawn for the home page (PhoneHome): the brand, the bookings bell
// and the account on top, then the page's title and whatever the page puts inside it (search, stats). Phones open
// the ☰ menu sheet; tablets and desktops get the account dropdown, and the header lines up with the page below.

const glass = "w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0 active:scale-95 transition-transform";

/** The patient's account links in the desktop dropdown (phones list them in the ☰ sheet). */
export const PATIENT_ACCOUNT_LINKS: TopBarLink[] = [
  { href: "/patient/appointments", label: "My appointments", icon: <CalendarDays /> },
  { href: "/patient/profile", label: "My profile", icon: <UserRound /> },
  { href: "/patient/support", label: "Help & support", icon: <LifeBuoy /> },
];

const DEFAULT_CONTAINER = "max-w-[1240px] px-margin-x-mobile lg:px-12";

const NAMED_WIDTHS: Record<string, string> = {
  "5xl": "64rem",
  "6xl": "72rem",
  "7xl": "80rem",
  "container-max": "var(--spacing-container-max, 1440px)",
};

/** A padding class's value: px-4 → 1rem, px-margin-x-desktop → the theme's desktop margin. */
function paddingValue(token: string | undefined): string | undefined {
  const value = token?.replace(/^(?:[a-z]+:)?px-/, "");
  if (!value) return undefined;
  if (value === "margin-x-mobile") return "var(--spacing-margin-x-mobile, 20px)";
  if (value === "margin-x-desktop") return "var(--spacing-margin-x-desktop, 48px)";
  return /^\d+(\.\d+)?$/.test(value) ? `${Number(value) * 0.25}rem` : undefined;
}

/**
 * The page's container (e.g. "max-w-[1080px] px-margin-x-mobile lg:px-margin-x-desktop") as CSS variables, so on
 * tablets and desktops the header's content starts and ends where the page's does. Phones keep their own padding.
 */
function containerVars(container: string): CSSProperties {
  const tokens = container.split(/\s+/).filter(Boolean);
  const max = tokens.find((t) => t.startsWith("max-w-"))?.slice("max-w-".length);
  const width = max ? (max.match(/^\[(.+)\]$/)?.[1] ?? NAMED_WIDTHS[max]) : undefined;
  const padAt = (...prefixes: string[]) => {
    for (const prefix of prefixes) {
      const token = tokens.find((t) => (prefix ? t.startsWith(`${prefix}:px-`) : t.startsWith("px-")));
      if (token) return paddingValue(token);
    }
  };
  return {
    "--bh-max": width ?? "1240px",
    "--bh-pad-md": padAt("md", "sm", "") ?? "1.5rem",
    "--bh-pad-lg": padAt("lg", "md", "sm", "") ?? "3rem",
  } as CSSProperties;
}

/** The blue panel with its rounded bottom and soft circles. `className` sets the bottom padding (pb-6 by default). */
export function BlueHeader({ children, className = "pb-6 md:pb-10", container = DEFAULT_CONTAINER }: { children: ReactNode; className?: string; container?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-b-[32px] md:rounded-b-[44px] bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white px-4 md:px-0 pt-[calc(env(safe-area-inset-top)+14px)] md:pt-5 shadow-[0_14px_30px_-14px_rgba(0,80,220,0.6)] print:hidden ${className}`}>
      <span aria-hidden className="absolute -right-28 -top-20 w-80 h-80 md:w-[30rem] md:h-[30rem] md:-top-40 rounded-full bg-white/[0.07]" />
      <span aria-hidden className="absolute -right-14 top-32 w-56 h-56 md:right-[18%] md:top-24 md:w-72 md:h-72 rounded-full bg-white/[0.06]" />
      <span aria-hidden className="hidden md:block absolute -left-24 -bottom-40 w-80 h-80 rounded-full bg-white/[0.05]" />
      <Plus aria-hidden className="absolute right-6 top-[128px] w-14 h-14 md:right-[8%] md:top-[110px] md:w-20 md:h-20 text-white/15" strokeWidth={3.5} />
      <div className="relative md:mx-auto md:max-w-(--bh-max) md:px-(--bh-pad-md) lg:px-(--bh-pad-lg)" style={containerVars(container)}>
        {children}
      </div>
    </section>
  );
}

/** Where the ☰ button sits on phones: the account dropdown for signed-in patients, Sign in for visitors. */
function DesktopAccount({ isSignedIn, name, email }: { isSignedIn: boolean; name?: string | null; email?: string | null }) {
  if (!isSignedIn) {
    return (
      <Link href="/login/patient" className="hidden md:flex items-center gap-1.5 h-11 px-5 rounded-full bg-white text-vibrant-blue text-sm font-bold shadow-sm hover:bg-white/90 transition-colors">
        <LogIn className="w-4 h-4" /> Sign in
      </Link>
    );
  }
  return (
    <div className="hidden md:block">
      <AccountMenu tone="blue" person={{ name: name || "", role: "Patient", detail: email }} links={PATIENT_ACCOUNT_LINKS} />
    </div>
  );
}

/** Logo and name (or a back arrow and the name), the bookings bell for signed-in patients, and the menu or account. */
export function BrandRow({
  backHref,
  isSignedIn,
  dot = false,
  bellLabel = "Bookings",
  onMenu,
  name,
  email,
}: {
  backHref?: string;
  isSignedIn: boolean;
  /** A red dot on the bell, e.g. when a visit is coming up. */
  dot?: boolean;
  bellLabel?: string;
  onMenu: () => void;
  /** For the account dropdown on tablets and desktops. */
  name?: string | null;
  email?: string | null;
}) {
  const label = (
    <span className="min-w-0 leading-tight">
      <span className={`block font-title-md font-extrabold tracking-tight truncate md:text-[20px] ${backHref ? "text-[16px]" : "text-[16px] min-[360px]:text-[18px]"}`}>Consult your Doctor</span>
      <span className="block text-[12.5px] md:text-[13px] text-white/80 truncate">Your Health, Our Priority</span>
    </span>
  );
  const logo = <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="44px" priority className="w-10 h-10 md:w-11 md:h-11 object-contain shrink-0" />;
  return (
    <div className="relative flex items-center justify-between gap-3">
      {backHref ? (
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={backHref} aria-label="Back" className={glass}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Consult your Doctor home">
            <span className="hidden md:contents">{logo}</span>
            {label}
          </Link>
        </div>
      ) : (
        <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Consult your Doctor home">
          {logo}
          {label}
        </Link>
      )}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {isSignedIn && (
          <Link href="/patient/appointments" aria-label={bellLabel} className={`relative ${glass}`}>
            <Bell className="w-5 h-5" />
            {dot && <span aria-hidden className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#ff4d4f] ring-2 ring-[#1570ff]" />}
          </Link>
        )}
        <button type="button" onClick={onMenu} aria-label="Open menu" aria-haspopup="dialog" className={`md:hidden ${glass}`}>
          <Menu className="w-5 h-5" />
        </button>
        <DesktopAccount isSignedIn={isSignedIn} name={name} email={email} />
      </div>
    </div>
  );
}

export type PhoneHeaderProps = {
  /** The page's name, shown large where the home page greets the patient. Leave it out for just the top row. */
  title?: string;
  /** A short line above the title, e.g. "Your bookings". */
  eyebrow?: string;
  subtitle?: ReactNode;
  /** Adds a back arrow next to the name. */
  backHref?: string;
  isSignedIn: boolean;
  name?: string | null;
  email?: string | null;
  /** The page's width and side padding, so the header lines up with it on wider screens. */
  container?: string;
  /** Inside the blue, under the title: a search box, stat tiles. */
  children?: ReactNode;
};

/** A patient page's header: the home page's blue header with the page's title in place of the greeting. */
export function PhoneHeader({ title, eyebrow, subtitle, backHref, isSignedIn, name, email, container, children }: PhoneHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);
  return (
    <>
      <BlueHeader container={container} className={title || children ? "pb-6 md:pb-10" : "pb-4 md:pb-5"}>
        <BrandRow backHref={backHref} isSignedIn={isSignedIn} onMenu={() => setMenuOpen(true)} name={name} email={email} />
        {title && (
          <div className="relative mt-5 md:mt-9 md:max-w-4xl">
            {eyebrow && <p className="text-[16px] md:text-[17px] text-white/90">{eyebrow}</p>}
            <h1 className="font-title-md text-[28px] min-[380px]:text-[30px] md:text-[40px] lg:text-[44px] font-extrabold leading-[1.15] md:leading-[1.1] tracking-tight line-clamp-2 break-words">{title}</h1>
            {subtitle && <p className="mt-1.5 md:mt-2 text-[14px] md:text-[16px] text-white/80 leading-snug">{subtitle}</p>}
          </div>
        )}
        {children && <div className="relative mt-4 md:mt-6">{children}</div>}
      </BlueHeader>
      {menuOpen && <MenuSheet name={name ?? null} email={email ?? null} isSignedIn={isSignedIn} onClose={close} />}
    </>
  );
}

/**
 * The slim version for detail pages (a doctor, a hospital): a sticky blue bar with a back arrow, the name and one
 * action, so the action stays in reach while the patient scrolls.
 */
export function PhoneBar({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  action,
  menu = true,
  isSignedIn,
  name,
  email,
  container = DEFAULT_CONTAINER,
  phoneOnly = false,
}: {
  title: string;
  subtitle?: string | null;
  backHref: string;
  backLabel?: string;
  /** A white button on the right, e.g. Book. */
  action?: ReactNode;
  /** The patient menu (☰ on phones, the account dropdown on wider screens); off for staff looking at a public page. */
  menu?: boolean;
  isSignedIn: boolean;
  name?: string | null;
  email?: string | null;
  /** The page's width and side padding, so the bar lines up with it on wider screens. */
  container?: string;
  /** Phones only, for pages that keep another bar on wider screens (a doctor looking at a public profile). */
  phoneOnly?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);
  return (
    <>
      <header className={`${phoneOnly ? "md:hidden " : ""}sticky top-0 z-40 overflow-hidden rounded-b-[24px] md:rounded-b-[32px] bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white px-3 md:px-0 pt-[calc(env(safe-area-inset-top)+10px)] pb-3 md:py-3.5 shadow-[0_10px_24px_-12px_rgba(0,80,220,0.6)] print:hidden`}>
        <span aria-hidden className="absolute -right-16 -top-24 w-56 h-56 md:w-80 md:h-80 md:-top-40 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-2.5 md:gap-3.5 md:mx-auto md:max-w-(--bh-max) md:px-(--bh-pad-md) lg:px-(--bh-pad-lg)" style={containerVars(container)}>
          <Link href={backHref} aria-label={backLabel} className={glass}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" aria-label="Consult your Doctor home" className="hidden md:block shrink-0">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="40px" className="w-10 h-10 object-contain" />
          </Link>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="font-title-md text-[17px] md:text-[19px] font-extrabold tracking-tight truncate">{title}</p>
            {subtitle && <p className="text-[12.5px] md:text-[13.5px] text-white/80 truncate">{subtitle}</p>}
          </div>
          {action}
          {menu && (
            <>
              <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-haspopup="dialog" className={`md:hidden ${glass}`}>
                <Menu className="w-5 h-5" />
              </button>
              <DesktopAccount isSignedIn={isSignedIn} name={name} email={email} />
            </>
          )}
        </div>
      </header>
      {menuOpen && <MenuSheet name={name ?? null} email={email ?? null} isSignedIn={isSignedIn} onClose={close} />}
    </>
  );
}

/** A white pill for PhoneBar's action. */
export const barActionClass = "h-11 px-4 md:px-5 rounded-full bg-white text-vibrant-blue text-[13.5px] md:text-sm font-bold flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95 hover:bg-white/90 transition-all";

/** A see-through tile inside the blue header: a number and what it counts. */
export function HeroStat({ href, value, label }: { href?: string; value: ReactNode; label: string }) {
  const cls = "min-w-0 rounded-2xl bg-white/15 border border-white/20 px-3 py-3 md:px-5 md:py-4 active:bg-white/25 md:hover:bg-white/20 transition-colors";
  const body = (
    <>
      <span className="block font-title-md text-[24px] md:text-[32px] font-extrabold leading-none tabular-nums truncate">{value}</span>
      <span className="block mt-1.5 md:mt-2 text-[11.5px] md:text-[13px] font-medium text-white/85 leading-tight line-clamp-2">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Three HeroStats side by side. */
export function HeroStats({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-2.5 md:gap-4 md:max-w-2xl">{children}</div>;
}
