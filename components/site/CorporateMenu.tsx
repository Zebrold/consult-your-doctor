"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, FlaskConical, Stethoscope, type LucideIcon } from "lucide-react";

/** The three ways to join, shared by the header's Corporate menu and the phone menu. */
export const JOIN_LINKS: { href: string; title: string; text: string; icon: LucideIcon }[] = [
  { href: "/signup/doctor", title: "Join as a doctor", text: "Get booked for in-person visits at your hospital.", icon: Stethoscope },
  { href: "/signup/hospital", title: "Join as a hospital", text: "List your OPD, publish doctors' slots, take bookings.", icon: Building2 },
  { href: "/signup/diagnostic-centre", title: "Join as a diagnostic centre", text: "List your tests and prices, receive lab bookings.", icon: FlaskConical },
];

/**
 * The blue headers' Corporate item: a simple white menu with the three ways to join, opened on hover or click.
 * `className` styles the trigger to match the header's other links.
 */
export function CorporateMenu({ className = "" }: { className?: string }) {
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
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={menuId} className={`flex items-center gap-1.5 ${className}`}>
        Corporate
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
      </button>

      {/* A plain white list with a small notch towards the trigger. The top padding bridges the gap, so the menu stays
          open while the pointer moves onto it. */}
      <div
        id={menuId}
        className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 transition-all duration-200 ${open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1"}`}
      >
        <span aria-hidden className="absolute left-1/2 -translate-x-1/2 top-[7px] w-2.5 h-2.5 rotate-45 bg-white border-l border-t border-[#E4E7EC]" />
        <ul className="relative w-[288px] py-2 rounded-lg bg-white border border-[#E4E7EC] shadow-[0_12px_28px_-8px_rgba(11,27,63,0.22)] font-(family-name:--font-manrope)">
          {JOIN_LINKS.map(({ href, title }) => (
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
