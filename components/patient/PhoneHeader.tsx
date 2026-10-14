"use client";

import { useCallback, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Bell, Menu, Plus } from "lucide-react";
import { MenuSheet } from "@/components/patient/PhoneSheet";

// The blue app header the patient pages use on phones, first drawn for the home page (PhoneHome): the brand, the
// bookings bell and the menu on top, then the page's title and whatever the page puts inside it (search, stats).
// Tablets and desktops keep the white top bar (TopBar).

const glass = "w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0 active:scale-95 transition-transform";

/** The blue panel with its rounded bottom and soft circles. `className` sets the bottom padding (pb-6 by default). */
export function BlueHeader({ children, className = "pb-6" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`md:hidden relative overflow-hidden rounded-b-[32px] bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white px-4 pt-[calc(env(safe-area-inset-top)+14px)] shadow-[0_14px_30px_-14px_rgba(0,80,220,0.6)] print:hidden ${className}`}>
      <span aria-hidden className="absolute -right-28 -top-20 w-80 h-80 rounded-full bg-white/[0.07]" />
      <span aria-hidden className="absolute -right-14 top-32 w-56 h-56 rounded-full bg-white/[0.06]" />
      <Plus aria-hidden className="absolute right-6 top-[128px] w-14 h-14 text-white/15" strokeWidth={3.5} />
      {children}
    </section>
  );
}

/** Logo and name (or a back arrow and the name), the bookings bell for signed-in patients, and the menu button. */
export function BrandRow({
  backHref,
  isSignedIn,
  dot = false,
  bellLabel = "Bookings",
  onMenu,
}: {
  backHref?: string;
  isSignedIn: boolean;
  /** A red dot on the bell, e.g. when a visit is coming up. */
  dot?: boolean;
  bellLabel?: string;
  onMenu: () => void;
}) {
  const name = (
    <span className="min-w-0 leading-tight">
      <span className={`block font-title-md font-extrabold tracking-tight truncate ${backHref ? "text-[16px]" : "text-[16px] min-[360px]:text-[18px]"}`}>Consult your Doctor</span>
      <span className="block text-[12.5px] text-white/80 truncate">Your Health, Our Priority</span>
    </span>
  );
  return (
    <div className="relative flex items-center justify-between gap-3">
      {backHref ? (
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={backHref} aria-label="Back" className={glass}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-w-0" aria-label="Consult your Doctor home">
            {name}
          </Link>
        </div>
      ) : (
        <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Consult your Doctor home">
          <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="40px" priority className="w-10 h-10 object-contain shrink-0" />
          {name}
        </Link>
      )}
      <div className="flex items-center gap-2 shrink-0">
        {isSignedIn && (
          <Link href="/patient/appointments" aria-label={bellLabel} className={`relative ${glass}`}>
            <Bell className="w-5 h-5" />
            {dot && <span aria-hidden className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#ff4d4f] ring-2 ring-[#1570ff]" />}
          </Link>
        )}
        <button type="button" onClick={onMenu} aria-label="Open menu" aria-haspopup="dialog" className={glass}>
          <Menu className="w-5 h-5" />
        </button>
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
  /** Adds a back arrow in place of the logo. */
  backHref?: string;
  isSignedIn: boolean;
  name?: string | null;
  email?: string | null;
  /** Inside the blue, under the title: a search box, stat tiles. */
  children?: ReactNode;
};

/** A patient page's phone header: the home page's blue header with the page's title in place of the greeting. */
export function PhoneHeader({ title, eyebrow, subtitle, backHref, isSignedIn, name, email, children }: PhoneHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);
  return (
    <>
      <BlueHeader className={title || children ? "pb-6" : "pb-4"}>
        <BrandRow backHref={backHref} isSignedIn={isSignedIn} onMenu={() => setMenuOpen(true)} />
        {title && (
          <div className="relative mt-5">
            {eyebrow && <p className="text-[16px] text-white/90">{eyebrow}</p>}
            <h1 className="font-title-md text-[28px] min-[380px]:text-[30px] font-extrabold leading-[1.15] tracking-tight line-clamp-2 break-words">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[14px] text-white/80 leading-snug">{subtitle}</p>}
          </div>
        )}
        {children && <div className="relative mt-4">{children}</div>}
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
}: {
  title: string;
  subtitle?: string | null;
  backHref: string;
  backLabel?: string;
  /** A white button on the right, e.g. Book. */
  action?: ReactNode;
  /** The patient menu button; off for staff looking at a public page. */
  menu?: boolean;
  isSignedIn: boolean;
  name?: string | null;
  email?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = useCallback(() => setMenuOpen(false), []);
  return (
    <>
      <header className="md:hidden sticky top-0 z-40 overflow-hidden rounded-b-[24px] bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-3 shadow-[0_10px_24px_-12px_rgba(0,80,220,0.6)] print:hidden">
        <span aria-hidden className="absolute -right-16 -top-24 w-56 h-56 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center gap-2.5">
          <Link href={backHref} aria-label={backLabel} className={glass}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="font-title-md text-[17px] font-extrabold tracking-tight truncate">{title}</p>
            {subtitle && <p className="text-[12.5px] text-white/80 truncate">{subtitle}</p>}
          </div>
          {action}
          {menu && (
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-haspopup="dialog" className={glass}>
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>
      {menuOpen && <MenuSheet name={name ?? null} email={email ?? null} isSignedIn={isSignedIn} onClose={close} />}
    </>
  );
}

/** A white pill for PhoneBar's action. */
export const barActionClass = "h-11 px-4 rounded-full bg-white text-vibrant-blue text-[13.5px] font-bold flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95 transition-transform";

/** A see-through tile inside the blue header: a number and what it counts. */
export function HeroStat({ href, value, label }: { href?: string; value: ReactNode; label: string }) {
  const cls = "min-w-0 rounded-2xl bg-white/15 border border-white/20 px-3 py-3 active:bg-white/25 transition-colors";
  const body = (
    <>
      <span className="block font-title-md text-[24px] font-extrabold leading-none tabular-nums truncate">{value}</span>
      <span className="block mt-1.5 text-[11.5px] font-medium text-white/85 leading-tight line-clamp-2">{label}</span>
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
  return <div className="grid grid-cols-3 gap-2.5">{children}</div>;
}
