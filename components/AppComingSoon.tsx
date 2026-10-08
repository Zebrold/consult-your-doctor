"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";

/** The site's blue stethoscope logo, as in the header. */
function Logo({ className = "" }: { className?: string }) {
  return <Image src="/logo-icon.png" alt="" width={96} height={96} className={`object-contain shrink-0 ${className}`} />;
}

function AppleLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function GooglePlayLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} strokeLinejoin="round" strokeWidth={0.8}>
      <path d="M3 1.5 13.5 12 3 22.5Z" fill="#00B4FF" stroke="#00B4FF" />
      <path d="M3 1.5 16.5 9.16 13.5 12Z" fill="#00D26A" stroke="#00D26A" />
      <path d="M3 22.5 13.5 12 16.5 14.84Z" fill="#FF3A44" stroke="#FF3A44" />
      <path d="M16.5 9.16 21.5 12 16.5 14.84 13.5 12Z" fill="#FFC400" stroke="#FFC400" />
    </svg>
  );
}

const stores = [
  { name: "App Store", logo: AppleLogo },
  { name: "Google Play", logo: GooglePlayLogo },
];

/**
 * The header's "Download our APP" badge. The mobile app isn't out yet, so it opens a "coming soon" card: on hover or
 * keyboard focus on desktop, and on tap on touch screens.
 */
export function AppComingSoon({ compact = false }: { compact?: boolean }) {
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
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={cardId}
        aria-label="Download our APP, coming soon"
        className={`relative flex items-center gap-2.5 rounded-full transition-colors ${
          compact ? "p-1" : "pl-1.5 pr-4 py-1.5 border border-outline-variant/50 hover:border-vibrant-blue/40 hover:bg-surface-container-low"
        }`}
      >
        <Logo className={compact ? "w-9 h-9" : "w-8 h-8"} />
        {compact ? (
          <span className="absolute -top-1 -right-2 px-1.5 py-[1px] rounded-full bg-fresh-teal text-white text-[8.5px] font-bold uppercase tracking-wide ring-2 ring-surface-container-lowest">
            Soon
          </span>
        ) : (
          <span className="flex flex-col items-start leading-none">
            <span className="text-[13px] font-bold text-on-surface whitespace-nowrap">Download our APP</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-vibrant-blue">Coming soon</span>
          </span>
        )}
      </button>

      {/* The top padding bridges the gap, so the card stays open while the pointer moves onto it. On phones the card
          reaches past the menu button beside the badge, to line up with the page's right edge. */}
      <div
        id={cardId}
        role="dialog"
        aria-label="Consult Your Doctor app"
        className={`absolute ${compact ? "-right-[3.25rem]" : "right-0"} top-full pt-3 z-50 transition-all duration-200 ${
          open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1 lg:group-hover:visible lg:group-hover:opacity-100 lg:group-hover:translate-y-0 lg:group-focus-within:visible lg:group-focus-within:opacity-100 lg:group-focus-within:translate-y-0"
        }`}
      >
        <div className="w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl bg-surface-container-lowest border border-slate-200 shadow-[0_16px_40px_rgba(15,23,42,0.14)] p-5">
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-[28%] bg-surface-container-lowest ring-1 ring-slate-200 shadow-[0_4px_12px_rgba(0,102,255,0.12)] flex items-center justify-center shrink-0">
              <Logo className="w-10 h-10" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-on-surface leading-tight">Consult Your Doctor</p>
              <span className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-fresh-teal/10 text-secondary text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-fresh-teal animate-pulse" /> Coming soon
              </span>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant">
            Our mobile app is on its way. Book visits, consult doctors and keep your reports in your pocket.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {stores.map(({ name, logo: StoreLogo }) => (
              <span key={name} className="flex items-center gap-2 rounded-lg bg-black text-white px-2.5 py-2">
                <StoreLogo className="w-5 h-5 shrink-0" />
                <span className="flex flex-col leading-none">
                  <span className="text-[8.5px] font-semibold uppercase tracking-wider text-white/75">Coming soon</span>
                  <span className="mt-1 text-[14px] font-semibold tracking-tight whitespace-nowrap">{name}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
