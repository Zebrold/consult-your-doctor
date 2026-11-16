"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Globe2, LoaderCircle, Navigation } from "lucide-react";
import { placeLabel, type usePatientLocation } from "@/components/patient/location";
import { formatCityName } from "@/lib/geo";

type Place = ReturnType<typeof usePatientLocation>;

/**
 * Which button opened the location dropdown, if any. `toggle` is the buttons' onClick: the same button again closes
 * it, another one moves it there. `openAt` opens it under a button from code (the speciality page's "Nearest").
 */
export function useLocationMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const toggle = useCallback((e: { currentTarget: HTMLElement }) => {
    const el = e.currentTarget;
    setAnchor((open) => (open === el ? null : el));
  }, []);
  const openAt = useCallback((el: HTMLElement | null) => {
    if (el) setAnchor(el);
  }, []);
  const close = useCallback(() => setAnchor(null), []);
  return { anchor, open: anchor !== null, toggle, openAt, close };
}

type Spot = { left: number; width: number; maxHeight: number } & ({ top: number } | { bottom: number });

/** Where the dropdown goes: under the button (over it when there's more room above), inside the window's gutters. */
function spotFor(anchor: HTMLElement): Spot {
  const r = anchor.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const phone = vw < 640;
  const gutter = phone ? 16 : 24;
  const gap = phone ? 8 : 12;
  const width = phone ? vw - 2 * gutter : Math.min(640, vw - 2 * gutter);
  const left = phone ? gutter : Math.max(gutter, Math.min(r.left, vw - gutter - width));
  const below = vh - r.bottom - gap - 12;
  const above = r.top - gap - 12;
  if (below < 320 && above > below) return { left, width, bottom: vh - r.top + gap, maxHeight: Math.min(560, above) };
  return { left, width, top: r.bottom + gap, maxHeight: Math.min(560, Math.max(200, below)) };
}

/**
 * The location dropdown, on every screen size: Use my current location, the locations picked in this browser before,
 * and the cities with partner hospitals or labs. It opens under `anchor`, the button that opened it, and is drawn at
 * the end of the page so a scrolling row or a clipped header around that button can't cut it off. Clicks outside it
 * (and outside the button) and Escape close it.
 */
export function LocationMenu({ place, cities, anchor, onClose }: { place: Place; cities: string[]; anchor: HTMLElement; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { location, recent, status } = place;

  // Placed before the first paint, then follows the button while the page scrolls or the window resizes; closes once
  // the button is gone (the phone's is hidden when the window widens to the desktop layout).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const position = () => {
      const spot = spotFor(anchor);
      el.style.left = `${spot.left}px`;
      el.style.width = `${spot.width}px`;
      el.style.maxHeight = `${spot.maxHeight}px`;
      el.style.top = "top" in spot ? `${spot.top}px` : "";
      el.style.bottom = "bottom" in spot ? `${spot.bottom}px` : "";
      el.style.visibility = "visible";
    };
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!anchor.isConnected || anchor.getClientRects().length === 0) onClose();
        else position();
      });
    };
    position();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !anchor.contains(target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      anchor.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  // The dropdown sits at the end of the page, so move the focus into it for keyboard users.
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  }, []);

  const message =
    status === "denied"
      ? "Location access is blocked for this site. Allow it in your browser settings, or pick a city below."
      : status === "unavailable"
        ? "Your location isn't available right now. Pick a city below instead."
        : null;
  const normalizedCities = Array.from(new Set(cities.map(formatCityName).filter(Boolean))).sort();
  const isCurrent = (city: string) => location?.kind === "city" && formatCityName(location.city) === city;
  const pad = "px-5 sm:px-7";
  const row = `w-full flex items-center gap-3.5 ${pad} text-left transition-colors hover:bg-[#F5F8FF] focus-visible:bg-[#F5F8FF] focus-visible:outline-none`;
  const rule = <div className="mx-5 sm:mx-7 border-t border-[#E6EBF3]" />;
  const heading = `${pad} pt-4 sm:pt-5 pb-1.5 sm:pb-2 text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.14em] text-[#7A8599]`;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Your location"
      className="invisible fixed z-[65] overflow-y-auto overscroll-contain rounded-[20px] bg-white text-left text-[#0B1B3F] shadow-[0_0_0_1px_#E6EBF3,0_24px_48px_-16px_rgba(11,27,63,0.35)] font-(family-name:--font-manrope)"
    >
      <button type="button" onClick={() => place.locate(onClose)} disabled={status === "locating"} className={`${row} py-4 sm:py-5 text-[16px] sm:text-[17px] font-extrabold text-[#1D4ED8] disabled:opacity-70`}>
        {status === "locating" ? <LoaderCircle className="w-5 h-5 shrink-0 animate-spin" /> : <Navigation className="w-5 h-5 shrink-0 fill-current" strokeWidth={2} />}
        {status === "locating" ? "Finding your location…" : "Use my current location"}
      </button>
      {message && (
        <p role="alert" className="mx-5 sm:mx-7 mb-4 p-3 rounded-xl bg-amber-50 text-[13px] text-amber-900">
          {message}
        </p>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="loc-recent" className="pb-2">
          {rule}
          <h3 id="loc-recent" className={heading}>
            Recent locations
          </h3>
          <ul>
            {recent.map((l) => {
              const label = placeLabel(l);
              const on = !!location && placeLabel(location) === label && location.kind === l.kind;
              return (
                <li key={`${l.kind}:${label}`}>
                  <button
                    type="button"
                    onClick={() => {
                      place.choose(l);
                      onClose();
                    }}
                    className={`${row} py-3 text-[15px] sm:text-[16px] ${on ? "font-bold text-[#1D4ED8]" : "text-[#3D4250]"}`}
                  >
                    <span className="flex-1 min-w-0 truncate">{label}</span>
                    {on && <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {normalizedCities.length > 0 && (
        <section aria-labelledby="loc-cities" className="pb-2 sm:pb-3">
          {rule}
          <h3 id="loc-cities" className={heading}>
            Cities we&apos;re in
          </h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3">
            {normalizedCities.map((city) => (
              <li key={city}>
                <button
                  type="button"
                  aria-pressed={isCurrent(city)}
                  onClick={() => {
                    place.chooseCity(city);
                    onClose();
                  }}
                  className={`${row} py-3 text-[15px] sm:text-[16px] ${isCurrent(city) ? "font-bold text-[#1D4ED8]" : "text-[#3D4250]"}`}
                >
                  <span className="truncate">{city}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 ${pad} py-4 border-t border-[#E6EBF3] bg-[#FAFBFD]`}>
        <p className="text-[12.5px] text-[#5B667A]">Your location stays on this device and is only used to sort the list.</p>
        {location && (
          <button
            type="button"
            onClick={() => {
              place.clear();
              onClose();
            }}
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#1D4ED8] hover:underline"
          >
            <Globe2 className="w-4 h-4" /> Show all locations
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
