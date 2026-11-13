"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, ChevronRight, FlaskConical, Stethoscope, UserRound, type LucideIcon } from "lucide-react";

type LoginLink = { href: string; title: string; text: string; icon: LucideIcon };

/** The partner portals' sign-ins, shared by the headers' Login menu and the phone menu. */
export const PARTNER_LOGINS: LoginLink[] = [
  { href: "/login/doctor", title: "Doctor login", text: "Schedule, patients and prescriptions", icon: Stethoscope },
  { href: "/login/hospital", title: "Hospital login", text: "Queue, doctors, beds and payouts", icon: Building2 },
  { href: "/login/diagnostic", title: "Diagnostic centre login", text: "Bookings, test menu and reports", icon: FlaskConical },
];

const PATIENT_LOGIN: LoginLink = { href: "/login/patient", title: "Patient login", text: "Bookings, reports and prescriptions", icon: UserRound };

/**
 * The blue headers' Login button for visitors: a white menu with each sign-in, opened on hover or click. The partner
 * page lists only the partner portals; elsewhere the patient sign-in comes first.
 */
export function LoginMenu({ partnersOnly = false, className = "" }: { partnersOnly?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      // Hover opens it for a mouse only: a tap would open it here and close it again with the click.
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}
    >
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={menuId} aria-haspopup="true" className={className}>
        Login
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2.6} />
      </button>

      {/* The top padding bridges the gap to the button, so the menu stays open while the pointer moves onto it. */}
      <div
        id={menuId}
        className={`absolute right-0 top-full pt-3 z-50 transition-all duration-200 ${open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1"}`}
      >
        <span aria-hidden className="absolute right-8 top-[7px] w-2.5 h-2.5 rotate-45 bg-white border-l border-t border-[#E4E7EC]" />
        <div className="relative w-[336px] p-2 rounded-2xl bg-white border border-[#E4E7EC] shadow-[0_18px_40px_-12px_rgba(11,27,63,0.28)] font-(family-name:--font-manrope) text-[#0B1B3F]">
          {!partnersOnly && (
            <>
              <Item link={PATIENT_LOGIN} onPick={() => setOpen(false)} />
              <p className="mt-1.5 mb-1 mx-2 pt-2.5 border-t border-[#EEF2F7] text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#7A8599]">For partners</p>
            </>
          )}
          {partnersOnly && <p className="mt-1 mb-1 mx-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#7A8599]">Sign in to your portal</p>}
          <ul>
            {PARTNER_LOGINS.map((link) => (
              <li key={link.href}>
                <Item link={link} onPick={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Item({ link: { href, title, text, icon: Icon }, onPick }: { link: LoginLink; onPick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onPick}
      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F4F6FB] focus-visible:bg-[#F4F6FB] focus-visible:outline-none transition-colors"
    >
      <span className="shrink-0 w-10 h-10 rounded-[11px] bg-[#EEF3FF] text-[#1D4ED8] flex items-center justify-center">
        <Icon className="w-[19px] h-[19px]" strokeWidth={2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-extrabold group-hover:text-[#1D4ED8] transition-colors">{title}</span>
        <span className="block text-[12.5px] text-[#5B667A] truncate">{text}</span>
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-[#9AA4B5] group-hover:translate-x-0.5 transition-transform" strokeWidth={2.4} />
    </Link>
  );
}
