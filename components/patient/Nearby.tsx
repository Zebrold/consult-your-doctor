"use client";

import { Fragment, type ReactNode } from "react";
import { Globe2, MapPin } from "lucide-react";
import { nearbyOnly, usePatientLocation } from "@/components/patient/location";

type Place = ReturnType<typeof usePatientLocation>;

/**
 * Says the list only holds places near the patient's location (or that there are none there yet), with a way back
 * to every location. Shows nothing until a location is set.
 */
export function NearbyNote({ place, count, noun, className = "" }: { place: Place; count: number; noun: string; className?: string }) {
  if (!place.location) return null;
  const none = count === 0;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 rounded-xl text-[13.5px] ${none ? "bg-amber-50 text-amber-900" : "bg-primary-fixed/40 text-indigo-gray-900"} ${className}`}>
      <span className="flex items-start gap-2 min-w-0">
        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {none ? `No partner ${noun} near ${place.location.label} yet.` : `Showing ${noun} near ${place.location.label}.`}
        </span>
      </span>
      <button type="button" onClick={place.clear} className="inline-flex items-center gap-1.5 font-semibold text-vibrant-blue hover:underline underline-offset-4 shrink-0">
        <Globe2 className="w-4 h-4" /> Show all locations
      </button>
    </div>
  );
}

type NearbyItem = { key: string; city: string | null; lat?: number | null; lng?: number | null; card: ReactNode };

/** A server-rendered list of hospitals or labs, narrowed in the browser to the ones near the patient's saved location. */
export function NearbyList({ items, noun, className }: { items: NearbyItem[]; noun: string; className: string }) {
  const place = usePatientLocation();
  const shown = nearbyOnly(items.map((item) => ({ ...item, lat: item.lat ?? null, lng: item.lng ?? null })), place.location).map((row) => row.item);
  return (
    <>
      <NearbyNote place={place} count={shown.length} noun={noun} className="mb-5" />
      {shown.length > 0 && (
        <div className={className}>
          {shown.map((item) => (
            <Fragment key={item.key}>{item.card}</Fragment>
          ))}
        </div>
      )}
    </>
  );
}
