"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GetTheApp } from "@/components/GetTheApp";

/** The blue scalloped tick next to partner hospitals and doctors (both are checked before they are listed). */
export function VerifiedBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg role="img" aria-label="Verified" viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
      <path
        d="M12.00 2.40Q15.26 -0.17 16.80 3.69Q20.91 3.09 20.31 7.20Q24.17 8.74 21.60 12.00Q24.17 15.26 20.31 16.80Q20.91 20.91 16.80 20.31Q15.26 24.17 12.00 21.60Q8.74 24.17 7.20 20.31Q3.09 20.91 3.69 16.80Q-0.17 15.26 2.40 12.00Q-0.17 8.74 3.69 7.20Q3.09 3.09 7.20 3.69Q8.74 -0.17 12.00 2.40Z"
        fill="#1D9BF0"
      />
      <path d="m7.6 12.2 3 3 5.8-6.2" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Moves a card row along by one card, wrapping round at either end. */
export function scrollRow(el: HTMLElement | null, direction: 1 | -1) {
  if (!el) return;
  const card = el.firstElementChild as HTMLElement | null;
  const step = card ? card.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 20) : 300;
  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
  if (direction === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
  else if (direction === -1 && el.scrollLeft <= 8) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  else el.scrollBy({ left: direction * step, behavior: "smooth" });
}

/** The round grey previous / next buttons beside a section title. */
export function CarouselArrows({ label, onScroll, className = "" }: { label: string; onScroll: (direction: 1 | -1) => void; className?: string }) {
  const button = "w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#EEF2F8] text-[#0B1B3F] flex items-center justify-center hover:bg-[#DCE7FF] active:scale-95 transition";
  return (
    <div className={`flex gap-2 md:gap-2.5 shrink-0 ${className}`}>
      <button type="button" aria-label={`Previous ${label}`} onClick={() => onScroll(-1)} className={button}>
        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2.6} />
      </button>
      <button type="button" aria-label={`More ${label}`} onClick={() => onScroll(1)} className={button}>
        <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}

/** The dark strip above phone pages pointing to the app. */
export function AppBanner() {
  return (
    <div className="md:hidden bg-[linear-gradient(135deg,#0B2075_0%,#1638B5_55%,#1D4ED8_100%)] border-b border-white/10 px-4 py-3 flex items-center gap-3">
      <span className="w-10 h-10 rounded-[10px] bg-white/[0.14] ring-1 ring-inset ring-white/25 flex items-center justify-center shrink-0">
        <Image src="/logo-icon-white.png" alt="" width={48} height={48} className="w-6 h-6 object-contain" />
      </span>
      <p className="flex-1 min-w-0 text-white text-[13px] font-semibold leading-[1.35]">Get our app for faster bookings &amp; a smoother experience.</p>
      <GetTheApp variant="promo" align="right" />
    </div>
  );
}
