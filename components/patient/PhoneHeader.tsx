"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, LifeBuoy, LogIn, Menu, UserRound } from "lucide-react";
import { MenuSheet } from "@/components/patient/PhoneSheet";
import { AccountMenu, type TopBarLink } from "@/components/portal/TopBar";

// The blue app header the patient pages use: the brand, the account and the menu on top, then the page's title and
// whatever the page puts inside it (search, stats). Phones open the ☰ menu sheet; tablets get the account dropdown.
// On desktops the patient sidebar carries the brand and the account, so the header becomes a blue card in the page.

const glass = "w-10 h-10 rounded-full bg-white/[0.12] border border-white/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform";

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

/** The blue panel with its rounded bottom. `className` sets the bottom padding (pb-[22px] by default). */
export function BlueHeader({ children, className = "pb-[22px] md:pb-9", container = DEFAULT_CONTAINER }: { children: ReactNode; className?: string; container?: string }) {
  return (
    <section
      className={`relative rounded-b-[28px] md:rounded-b-[36px] bg-[#2A4DD0] text-white font-(family-name:--font-manrope) px-[18px] md:px-0 pt-[calc(env(safe-area-inset-top)+16px)] md:pt-5 print:hidden desk:mx-9 desk:mt-7 desk:rounded-[20px] desk:px-[34px] desk:pt-[30px] desk:pb-[30px] ${className}`}
    >
      <div className="relative md:mx-auto md:max-w-(--bh-max) md:px-(--bh-pad-md) lg:px-(--bh-pad-lg) desk:max-w-none desk:px-0" style={containerVars(container)}>
        {children}
      </div>
    </section>
  );
}

/** Where the ☰ button sits on phones: the account dropdown for signed-in patients, Sign in for visitors. */
function DesktopAccount({ isSignedIn, name, email }: { isSignedIn: boolean; name?: string | null; email?: string | null }) {
  if (!isSignedIn) {
    return (
      <Link href="/login/patient" className="hidden md:flex items-center gap-1.5 h-10 px-5 rounded-full bg-white text-[#2A4DD0] text-sm font-extrabold hover:bg-white/90 transition-colors">
        <LogIn className="w-4 h-4" /> Login
      </Link>
    );
  }
  return (
    <div className="hidden md:block">
      <AccountMenu tone="blue" person={{ name: name || "", role: "Patient", detail: email }} links={PATIENT_ACCOUNT_LINKS} />
    </div>
  );
}

/** The brand (with a back arrow when given), the profile or Sign in, and the menu or the account dropdown. */
export function BrandRow({
  backHref,
  isSignedIn,
  onMenu,
  name,
  email,
}: {
  backHref?: string;
  isSignedIn: boolean;
  onMenu: () => void;
  /** For the account dropdown on tablets. */
  name?: string | null;
  email?: string | null;
}) {
  return (
    <div className="relative flex items-center gap-2.5 desk:hidden">
      {backHref && (
        <Link href={backHref} aria-label="Back" className={glass}>
          <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
        </Link>
      )}
      <Link href="/" className="flex-1 min-w-0 flex items-center gap-2.5" aria-label="Consult your Doctor home">
        <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="36px" priority className={`w-[30px] h-[30px] md:w-9 md:h-9 object-contain shrink-0 ${backHref ? "hidden min-[400px]:block" : ""}`} />
        <span className="min-w-0 leading-tight">
          <span className="block font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[18px] md:text-[20px] font-bold tracking-[-0.01em] truncate">Consult your Doctor</span>
          <span className="block text-[11.5px] md:text-[12.5px] text-[#CFDCFF] truncate">Your health, our priority</span>
        </span>
      </Link>
      {isSignedIn ? (
        <Link
          href="/patient/profile"
          aria-label="My profile"
          className="md:hidden shrink-0 w-10 h-10 rounded-full border-2 border-white/55 bg-white text-[#2A4DD0] flex items-center justify-center active:scale-95 transition-transform"
        >
          <UserRound className="w-5 h-5" strokeWidth={2.2} />
        </Link>
      ) : (
        <Link
          href="/login/patient"
          aria-label="Login"
          className="md:hidden shrink-0 w-10 h-10 rounded-full border-2 border-white/55 bg-white text-[#2A4DD0] flex items-center justify-center active:scale-95 transition-transform"
        >
          <LogIn className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </Link>
      )}
      <button type="button" onClick={onMenu} aria-label="Open menu" aria-haspopup="dialog" className={`md:hidden ${glass}`}>
        <Menu className="w-[18px] h-[18px]" />
      </button>
      <DesktopAccount isSignedIn={isSignedIn} name={name} email={email} />
    </div>
  );
}

export type PhoneHeaderProps = {
  /** The page's name, shown large under the brand. Leave it out for just the top row. */
  title?: string;
  /** A short line above the title, e.g. "Your bookings". */
  eyebrow?: string;
  subtitle?: ReactNode;
  /** Adds a back arrow before the brand. */
  backHref?: string;
  isSignedIn: boolean;
  name?: string | null;
  email?: string | null;
  /** The page's width and side padding, so the header lines up with it on wider screens. */
  container?: string;
  /** Inside the blue, under the title: a search box, stat tiles. */
  children?: ReactNode;
  /** Leave the header out on desktops, for pages that show their own title there. */
  deskHidden?: boolean;
};

/** A patient page's header: the brand row, then the page's eyebrow, title and subtitle. */
export function PhoneHeader({ title, eyebrow, subtitle, backHref, isSignedIn, name, email, container, children, deskHidden = false }: PhoneHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);
  const bare = !title && !children;
  return (
    <>
      <BlueHeader container={container} className={bare || deskHidden ? `${bare ? "pb-4 md:pb-5" : "pb-[22px] md:pb-9"} desk:hidden` : "pb-[22px] md:pb-9"}>
        <BrandRow backHref={backHref} isSignedIn={isSignedIn} onMenu={() => setMenuOpen(true)} name={name} email={email} />
        {title && (
          <div className="relative mt-[22px] md:mt-8 desk:mt-0 md:max-w-4xl">
            {eyebrow && <p className="text-[13.5px] md:text-[15px] desk:text-[14px] desk:font-bold text-[#CFDCFF]">{eyebrow}</p>}
            <h1 className="mt-0.5 text-[26px] md:text-[36px] desk:text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] line-clamp-2 break-words">{title}</h1>
            {subtitle && <p className="mt-1 md:mt-2 text-[13px] md:text-[15px] desk:text-[14.5px] text-[#DCE6FF] leading-snug">{subtitle}</p>}
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
 * action, so the action stays in reach while the patient scrolls. On desktops it sits in the page as a blue card.
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
      <header
        className={`${phoneOnly ? "md:hidden " : ""}sticky top-0 z-40 rounded-b-[24px] md:rounded-b-[30px] bg-[#2A4DD0] text-white font-(family-name:--font-manrope) px-3 md:px-0 pt-[calc(env(safe-area-inset-top)+10px)] pb-3 md:py-3.5 print:hidden desk:static desk:mx-9 desk:mt-7 desk:rounded-[20px] desk:px-5`}
      >
        <div className="relative flex items-center gap-2.5 md:gap-3.5 md:mx-auto md:max-w-(--bh-max) md:px-(--bh-pad-md) lg:px-(--bh-pad-lg) desk:max-w-none desk:px-0" style={containerVars(container)}>
          <Link href={backHref} aria-label={backLabel} className={glass}>
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </Link>
          <Link href="/" aria-label="Consult your Doctor home" className="hidden md:block desk:hidden shrink-0">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="36px" className="w-9 h-9 object-contain" />
          </Link>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[17px] md:text-[19px] font-extrabold tracking-[-0.01em] truncate">{title}</p>
            {subtitle && <p className="text-[12.5px] md:text-[13.5px] text-[#CFDCFF] truncate">{subtitle}</p>}
          </div>
          {action}
          {menu && (
            <>
              <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-haspopup="dialog" className={`md:hidden ${glass}`}>
                <Menu className="w-[18px] h-[18px]" />
              </button>
              <div className="contents desk:hidden">
                <DesktopAccount isSignedIn={isSignedIn} name={name} email={email} />
              </div>
            </>
          )}
        </div>
      </header>
      {menuOpen && <MenuSheet name={name ?? null} email={email ?? null} isSignedIn={isSignedIn} onClose={close} />}
    </>
  );
}

/** A white pill for PhoneBar's action. */
export const barActionClass = "h-10 px-4 md:px-5 rounded-full bg-white text-[#2A4DD0] text-[13.5px] md:text-sm font-extrabold flex items-center gap-1.5 shrink-0 active:scale-95 hover:bg-white/90 transition-all";

/** A see-through tile inside the blue header: a number and what it counts. */
export function HeroStat({ href, value, label }: { href?: string; value: ReactNode; label: string }) {
  const cls = "min-w-0 rounded-2xl bg-white/[0.12] border border-white/25 px-3 py-3 md:px-5 md:py-4 active:bg-white/20 md:hover:bg-white/[0.18] transition-colors";
  const body = (
    <>
      <span className="block text-[24px] md:text-[30px] font-extrabold leading-none tabular-nums truncate">{value}</span>
      <span className="block mt-1.5 md:mt-2 text-[11.5px] md:text-[13px] font-semibold text-[#DCE6FF] leading-tight line-clamp-2">{label}</span>
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
