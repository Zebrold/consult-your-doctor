"use client";

import { Globe2, LoaderCircle, LocateFixed } from "lucide-react";
import type { usePatientLocation } from "@/components/patient/location";
import { Sheet } from "@/components/patient/PhoneSheet";

type Place = ReturnType<typeof usePatientLocation>;

/** Where the patient is looking for care: their device's location or a city with partner hospitals or labs. */
export function LocationSheet({ place, cities, onClose }: { place: Place; cities: string[]; onClose: () => void }) {
  const { location, status } = place;
  const message =
    status === "denied"
      ? "Location access is blocked for this site. Allow it in your browser settings, or pick a city below."
      : status === "unavailable"
        ? "Your location isn't available right now. Pick a city below instead."
        : null;
  return (
    <Sheet title="Your location" subtitle="See the doctors, hospitals and labs nearest to you." onClose={onClose}>
      <button
        type="button"
        onClick={() => place.locate(onClose)}
        disabled={status === "locating"}
        className="w-full h-12 rounded-full bg-vibrant-blue text-white font-bold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(0,102,255,0.25)] disabled:opacity-70"
      >
        {status === "locating" ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
        {status === "locating" ? "Finding your location…" : "Use my current location"}
      </button>
      <p className="mt-2 text-[12px] text-slate-500 text-center">Your location stays on this device and is only used to sort the list.</p>
      {message && <p role="alert" className="mt-3 p-3 rounded-xl bg-amber-50 text-[13px] text-amber-900">{message}</p>}

      {cities.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Or choose a city</p>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => {
              const active = location?.kind === "city" && location.city === city;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    place.chooseCity(city);
                    onClose();
                  }}
                  aria-pressed={active}
                  className={`h-10 px-4 rounded-full text-[14px] font-semibold border transition-colors ${active ? "bg-vibrant-blue border-vibrant-blue text-white" : "bg-white border-slate-200 text-indigo-gray-900 active:bg-slate-50"}`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </>
      )}

      {location && (
        <button
          type="button"
          onClick={() => {
            place.clear();
            onClose();
          }}
          className="mt-5 w-full h-12 rounded-full border border-slate-200 text-indigo-gray-900 font-semibold flex items-center justify-center gap-2 active:bg-slate-50"
        >
          <Globe2 className="w-5 h-5 text-slate-500" /> Show all locations
        </button>
      )}
    </Sheet>
  );
}
