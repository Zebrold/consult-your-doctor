"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ChevronDown, FlaskConical, LogIn, Stethoscope, type LucideIcon } from "lucide-react";

/** The three ways to join, shared by the header's Corporate menu and the phone menu. */
export const JOIN_LINKS: { href: string; title: string; text: string; icon: LucideIcon }[] = [
  { href: "/signup/doctor", title: "Join as a doctor", text: "Get booked for in-person visits at your hospital.", icon: Stethoscope },
  { href: "/signup/hospital", title: "Join as a hospital", text: "List your OPD, publish doctors' slots, take bookings.", icon: Building2 },
  { href: "/signup/diagnostic-centre", title: "Join as a diagnostic centre", text: "List your tests and prices, receive lab bookings.", icon: FlaskConical },
];

/**
 * The blue headers' Corporate item: a menu with the three ways to join, opened on hover or click, plus links to the
 * partner page and the partner login. `className` styles the trigger to match the header's other links.
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

      {/* The top padding bridges the gap, so the menu stays open while the pointer moves onto it. */}
      <div
        id={menuId}
        className={`absolute left-1/2 -translate-x-1/2 top-full pt-3.5 z-50 transition-all duration-200 ${open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1"}`}
      >
        <span aria-hidden className="absolute left-1/2 -translate-x-1/2 top-[9px] w-3 h-3 rotate-45 rounded-[3px] bg-white shadow-[-1px_-1px_0_#E6EBF3]" />
        <div className="relative w-[392px] rounded-[22px] bg-white text-[#0B1B3F] shadow-[0_0_0_1px_#E6EBF3,0_28px_60px_-12px_rgba(11,27,63,0.35)] p-2.5 font-(family-name:--font-manrope)">
          <p className="px-3 pt-2 pb-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[#5B667A]">Partner with Consult your Doctor</p>
          <ul className="flex flex-col">
            {JOIN_LINKS.map(({ href, title, text, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#F3F6FD] focus-visible:bg-[#F3F6FD] focus-visible:outline-none transition-colors"
                >
                  <span className="shrink-0 w-11 h-11 rounded-[13px] bg-[#EAF1FF] text-[#2A4DD0] flex items-center justify-center group-hover:bg-[#2A4DD0] group-hover:text-white transition-colors">
                    <Icon className="w-[21px] h-[21px]" strokeWidth={2} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-extrabold tracking-[-0.01em]">{title}</span>
                    <span className="block mt-0.5 text-[12.5px] leading-snug text-[#5B667A]">{text}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-[#A3AEC2] group-hover:text-[#2A4DD0] group-hover:translate-x-0.5 transition-all" strokeWidth={2.6} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 mx-1 px-2.5 pt-3 pb-1.5 border-t border-[#EEF2F7] flex items-center justify-between gap-3 text-[13px] font-extrabold">
            <Link href="/corporate" onClick={() => setOpen(false)} className="text-[#2A4DD0] hover:underline">
              How partnering works
            </Link>
            <Link href="/corporate#login" onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 text-[#27324A] hover:text-[#2A4DD0]">
              <LogIn className="w-4 h-4" strokeWidth={2.4} /> Partner login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
