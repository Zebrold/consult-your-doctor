"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, FlaskConical, Stethoscope, UserRound, type LucideIcon } from "lucide-react";

type LoginLink = { href: string; title: string; text: string; icon: LucideIcon };

/** The partner portals' sign-ins, shared by the headers' Login menu and the phone menu. */
export const PARTNER_LOGINS: LoginLink[] = [
  { href: "/login/doctor", title: "Doctor login", text: "Schedule, patients and prescriptions", icon: Stethoscope },
  { href: "/login/hospital", title: "Hospital login", text: "Queue, doctors, beds and payouts", icon: Building2 },
  { href: "/login/diagnostic", title: "Diagnostic centre login", text: "Bookings, test menu and reports", icon: FlaskConical },
];

const PATIENT_LOGIN: LoginLink = { href: "/login/patient", title: "Patient login", text: "Bookings, reports and prescriptions", icon: UserRound };

/**
 * The blue headers' Login button for visitors: the same plain white menu as Corporate, with each sign-in by name,
 * opened on hover or click. The partner pages list only the partner portals; elsewhere the patient sign-in comes first.
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
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
      </button>

      {/* The same plain white list as the Corporate menu, with a small notch towards the button. The top padding
          bridges the gap, so the menu stays open while the pointer moves onto it. */}
      <div
        id={menuId}
        className={`absolute right-0 top-full pt-3 z-50 transition-all duration-200 ${open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1"}`}
      >
        <span aria-hidden className="absolute right-8 top-[7px] w-2.5 h-2.5 rotate-45 bg-white border-l border-t border-[#E4E7EC]" />
        <ul className="relative w-[260px] py-2 rounded-lg bg-white border border-[#E4E7EC] shadow-[0_12px_28px_-8px_rgba(11,27,63,0.22)] font-(family-name:--font-manrope)">
          {(partnersOnly ? PARTNER_LOGINS : [PATIENT_LOGIN, ...PARTNER_LOGINS]).map(({ href, title }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="block px-6 py-3.5 text-[16px] font-medium text-[#3D4250] hover:bg-[#F4F6FB] hover:text-[#2A4DD0] focus-visible:bg-[#F4F6FB] focus-visible:text-[#2A4DD0] focus-visible:outline-none transition-colors"
              >
                {title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
