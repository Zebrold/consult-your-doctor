"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Check, Globe2, LoaderCircle, MapPin, Navigation } from "lucide-react";
import { placeLabel, type usePatientLocation } from "@/components/patient/location";

type Place = ReturnType<typeof usePatientLocation>;

/**
 * Desktops: the location field's dropdown, open under the field. Use my current location, the locations picked in this
 * browser before, and the cities with partner hospitals or labs. Phones get the same choices in LocationSheet.
 * Clicks outside it (and outside `anchor`, the field that opens it) and Escape close it.
 */
export function LocationMenu({
  place,
  cities,
  anchor,
  onClose,
  className = "",
}: {
  place: Place;
  cities: string[];
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { location, recent, status } = place;

  useEffect(() => {
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [anchor, onClose]);

  const message =
    status === "denied"
      ? "Location access is blocked for this site. Allow it in your browser settings, or pick a city below."
      : status === "unavailable"
        ? "Your location isn't available right now. Pick a city below instead."
        : null;
  const isCurrent = (city: string) => location?.kind === "city" && location.city === city;
  const row = "w-full flex items-center gap-3.5 px-7 text-left transition-colors hover:bg-[#F5F8FF] focus-visible:bg-[#F5F8FF] focus-visible:outline-none";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Your location"
      className={`absolute z-30 top-[calc(100%+12px)] left-0 w-[min(640px,calc(100vw-48px))] max-h-[min(560px,calc(100dvh-180px))] overflow-y-auto overscroll-contain rounded-[20px] bg-white text-left text-[#0B1B3F] shadow-[0_0_0_1px_#E6EBF3,0_24px_48px_-16px_rgba(11,27,63,0.35)] font-(family-name:--font-manrope) ${className}`}
    >
      <button type="button" onClick={() => place.locate(onClose)} disabled={status === "locating"} className={`${row} py-5 text-[17px] font-extrabold text-[#1D4ED8] disabled:opacity-70`}>
        {status === "locating" ? <LoaderCircle className="w-5 h-5 shrink-0 animate-spin" /> : <Navigation className="w-5 h-5 shrink-0 fill-current" strokeWidth={2} />}
        {status === "locating" ? "Finding your location…" : "Use my current location"}
      </button>
      {message && (
        <p role="alert" className="mx-7 mb-4 p-3 rounded-xl bg-amber-50 text-[13px] text-amber-900">
          {message}
        </p>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="loc-recent" className="pb-2">
          <div className="mx-7 border-t border-[#E6EBF3]" />
          <h3 id="loc-recent" className="px-7 pt-5 pb-2 text-[13px] font-bold uppercase tracking-[0.14em] text-[#7A8599]">
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
                    className={`${row} py-3 text-[16px] ${on ? "font-bold text-[#1D4ED8]" : "text-[#3D4250]"}`}
                  >
                    {l.kind === "gps" ? <Navigation className="w-[18px] h-[18px] shrink-0 text-[#27324A] fill-current" strokeWidth={2} /> : <MapPin className="w-[18px] h-[18px] shrink-0 text-[#27324A]" strokeWidth={2.2} />}
                    <span className="flex-1 min-w-0 truncate">{label}</span>
                    {on && <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {cities.length > 0 && (
        <section aria-labelledby="loc-cities" className="pb-3">
          <div className="mx-7 border-t border-[#E6EBF3]" />
          <h3 id="loc-cities" className="px-7 pt-5 pb-2 text-[13px] font-bold uppercase tracking-[0.14em] text-[#7A8599]">
            Cities we&apos;re in
          </h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3">
            {cities.map((city) => (
              <li key={city}>
                <button
                  type="button"
                  aria-pressed={isCurrent(city)}
                  onClick={() => {
                    place.chooseCity(city);
                    onClose();
                  }}
                  className={`${row} py-3 text-[16px] ${isCurrent(city) ? "font-bold text-[#1D4ED8]" : "text-[#3D4250]"}`}
                >
                  <MapPin className={`w-[18px] h-[18px] shrink-0 ${isCurrent(city) ? "" : "text-[#8A94A6]"}`} strokeWidth={2.2} />
                  <span className="truncate">{city}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between gap-4 px-7 py-4 border-t border-[#E6EBF3] bg-[#FAFBFD]">
        <p className="text-[12.5px] text-[#5B667A]">Your location stays on this device and is only used to sort the list.</p>
        {location && (
          <button
            type="button"
            onClick={() => {
              place.clear();
              onClose();
            }}
            className="shrink-0 inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#1D4ED8] hover:underline"
          >
            <Globe2 className="w-4 h-4" /> Show all locations
          </button>
        )}
      </div>
    </div>
  );
}
