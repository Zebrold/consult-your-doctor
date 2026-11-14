"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PARTNER_LOGINS } from "@/components/site/LoginMenu";

/**
 * The "Partner with us" dropdown menu in the desktop headers.
 * Clicking or hovering reveals the 3 partner login options (Doctor, Hospital, Diagnostic Centre).
 */
export function PartnerMenu({ className = "" }: { className?: string }) {
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
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 ${className}`}
      >
        Partner with us
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
      </button>

      <div
        id={menuId}
        className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 transition-all duration-200 ${
          open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1"
        }`}
      >
        <span aria-hidden className="absolute left-1/2 -translate-x-1/2 top-[7px] w-2.5 h-2.5 rotate-45 bg-white border-l border-t border-[#E4E7EC]" />
        <ul className="relative w-[260px] py-2 rounded-lg bg-white border border-[#E4E7EC] shadow-[0_12px_28px_-8px_rgba(11,27,63,0.22)] font-(family-name:--font-manrope)">
          {PARTNER_LOGINS.map(({ href, title }) => (
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
          <li className="mt-1 pt-1 border-t border-[#EEF2F6]">
            <Link
              href="/corporate#join"
              onClick={() => setOpen(false)}
              className="block px-6 py-2.5 text-[14px] font-bold text-[#2A4DD0] hover:bg-[#F4F6FB] focus-visible:outline-none transition-colors"
            >
              How to partner →
            </Link>
          </li>
          <li>
            <Link
              href="/corporate#talk"
              onClick={() => setOpen(false)}
              className="block px-6 py-2.5 text-[14px] font-bold text-[#2A4DD0] hover:bg-[#F4F6FB] focus-visible:outline-none transition-colors"
            >
              Talk to our team →
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

