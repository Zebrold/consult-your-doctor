"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { StoreBadge } from "@/components/StoreBadges";
import { STORE_LINKS } from "@/lib/app-links";

/**
 * The "Get the app" button and its card with the store badges: the card opens on hover or keyboard focus on desktop,
 * and on tap on touch screens. `hero` is the outlined white button on the blue headers, `promo` the white pill in the
 * phone app banners, `open` the blue Open app pill in the phones' top strip, which goes straight to the phone's own
 * store listing once there is one (lib/app-links.ts).
 */
export function GetTheApp({
  variant,
  align,
}: {
  variant: "hero" | "promo" | "open";
  /** Which edge of the button the card lines up with; it opens towards the other side. */
  align?: "left" | "right";
}) {
  const side = align ?? (variant === "promo" ? "left" : "right");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cardId = useId();

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
    <div ref={ref} className="relative group">
      <button
        type="button"
        onClick={() => {
          if (variant === "open") {
            const ua = navigator.userAgent;
            const listing = /iPhone|iPad|iPod/.test(ua) ? STORE_LINKS.apple : /Android/i.test(ua) ? STORE_LINKS.google : null;
            if (listing) return void (window.location.href = listing);
          }
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-controls={cardId}
        className={
          variant === "hero"
            ? "flex items-center gap-1.5 min-h-[38px] px-4 rounded-[10px] border-[1.5px] border-white/85 text-white text-sm font-bold whitespace-nowrap hover:bg-white/10 transition-colors"
            : variant === "open"
              ? "flex items-center h-10 px-[18px] rounded-full bg-[#2A4DD0] text-white text-[13px] font-extrabold tracking-[0.04em] uppercase whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_rgba(42,77,208,0.45)] active:scale-95 transition-transform"
              : "flex items-center gap-1 h-9 pl-4 pr-3.5 rounded-full bg-white text-[#1D4ED8] text-[13px] font-extrabold whitespace-nowrap shadow-[0_6px_14px_rgba(5,20,80,0.28)] active:scale-95 transition-transform"
        }
      >
        {variant === "open" ? (
          "Open app"
        ) : (
          <>
            {variant === "hero" ? "Get the App" : "Get the app"} <ArrowUpRight className={variant === "hero" ? "w-[13px] h-[13px]" : "w-[14px] h-[14px]"} strokeWidth={variant === "hero" ? 2.4 : 2.6} />
          </>
        )}
      </button>

      {/* The top padding bridges the gap, so the card stays open while the pointer moves onto it. */}
      <div
        id={cardId}
        role="dialog"
        aria-label="Consult your Doctor app"
        className={`absolute ${side === "left" ? "left-0" : "right-0"} top-full pt-3 z-50 transition-all duration-200 ${
          open
            ? "visible opacity-100 translate-y-0"
            : "invisible opacity-0 -translate-y-1 lg:group-hover:visible lg:group-hover:opacity-100 lg:group-hover:translate-y-0 lg:group-focus-within:visible lg:group-focus-within:opacity-100 lg:group-focus-within:translate-y-0"
        }`}
      >
        <div className="w-[min(20rem,calc(100vw-2rem))] max-h-[calc(100dvh-var(--header-h)-1.5rem)] overflow-y-auto rounded-[20px] bg-white text-[#0B1B3F] shadow-[0_0_0_1px_#E6EBF3,0_20px_44px_rgba(11,27,63,0.18)] p-5 font-(family-name:--font-manrope)">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-[14px] bg-white shadow-[0_0_0_1px_#E6EBF3,0_6px_14px_rgba(11,27,63,0.08)] flex items-center justify-center shrink-0">
              <Image src="/logo-icon.png" alt="" width={96} height={96} className="w-8 h-8 object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-extrabold leading-tight">Consult your Doctor</span>
              <span className="block mt-0.5 text-[12.5px] font-semibold text-[#5B667A]">For iPhone and Android</span>
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-[1.55] text-[#4A5878]">Book doctors and lab tests, pay the booking fee and keep your prescriptions and reports with you.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StoreBadge store="apple" size="sm" />
            <StoreBadge store="google" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
