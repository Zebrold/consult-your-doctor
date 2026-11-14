"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type LiveBadges = { doctors: Set<string>; hospitals: Set<string> };
let live: Promise<LiveBadges> | null = null;

/** The ids with a live verified badge (app/api/verified), fetched once per page load. */
function liveBadges(): Promise<LiveBadges> {
  live ??= fetch("/api/verified")
    .then((r) => (r.ok ? r.json() : { doctors: [], hospitals: [] }))
    .then((d: { doctors?: string[]; hospitals?: string[] }) => ({ doctors: new Set(d.doctors ?? []), hospitals: new Set(d.hospitals ?? []) }))
    .catch(() => {
      live = null;
      return { doctors: new Set<string>(), hospitals: new Set<string>() };
    });
  return live;
}

/**
 * The blue scalloped tick: shown beside a doctor or hospital only while their verified badge is live (paid, and
 * checked by the Consult your Doctor team: lib/badges.ts). `sample` draws it unconditionally, for illustrations and for
 * diagnostic centres, which aren't part of the badge programme.
 */
export function VerifiedBadge({ className = "w-4 h-4", doctorId, hospitalId, sample = false }: { className?: string; doctorId?: string | null; hospitalId?: string | null; sample?: boolean }) {
  const [on, setOn] = useState(sample);
  useEffect(() => {
    if (sample || (!doctorId && !hospitalId)) return;
    let alive = true;
    liveBadges().then((b) => alive && setOn(doctorId ? b.doctors.has(doctorId) : b.hospitals.has(hospitalId!)));
    return () => {
      alive = false;
    };
  }, [sample, doctorId, hospitalId]);
  if (!on) return null;
  return (
    <svg role="img" aria-label="Verified by Consult your Doctor" viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
      <title>{sample ? "Verified" : "Verified by Consult your Doctor: registration and photo ID checked by our team"}</title>
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

