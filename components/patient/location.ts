"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { distanceKm, sameCity, type LatLng } from "@/lib/geo";

// Where the patient is looking for care: their device's location, or a city they picked. Kept in this browser only
// (it never goes to our server); the device location is only used to sort what is already on the page.

export type PatientLocation =
  // city: the town the device is in, for places without a map pin ("" when it couldn't be found; missing on locations
  // saved before it was added, which are looked up again).
  | { kind: "gps"; lat: number; lng: number; label: string; city?: string }
  | { kind: "city"; city: string; label: string };

/** How far a place with a map pin can be from the device and still count as near. */
export const NEARBY_KM = 30;

/** The city a location is in, when known. */
export const locationCity = (location: PatientLocation | null) => (location?.city ? location.city : null);

const KEY = "cyd-patient-location";
const EVENT = "cyd-location-change";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function write(location: PatientLocation | null) {
  try {
    if (location) localStorage.setItem(KEY, JSON.stringify(location));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function parse(raw: string | null): PatientLocation | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PatientLocation;
    if (v.kind === "gps" && Number.isFinite(v.lat) && Number.isFinite(v.lng)) return v;
    if (v.kind === "city" && typeof v.city === "string" && v.city) return v;
  } catch {}
  return null;
}

/** The neighbourhood (label) and city for a point, from OpenStreetMap; "Current location" and "" when it can't say. */
async function placeOf(lat: number, lng: number): Promise<{ label: string; city: string }> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&addressdetails=1&lat=${lat}&lon=${lng}`, { headers: { Accept: "application/json" } });
    const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
    return {
      label: a.suburb || a.neighbourhood || a.city_district || a.town || a.city || a.village || a.county || "Current location",
      city: a.city || a.town || a.municipality || a.state_district || a.county || "",
    };
  } catch {
    return { label: "Current location", city: "" };
  }
}

export type LocateStatus = "idle" | "locating" | "denied" | "unavailable";

export function usePatientLocation() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const location = useMemo(() => parse(raw), [raw]);
  const [status, setStatus] = useState<LocateStatus>("idle");

  // A device location saved before cities were recorded: look its city up once.
  useEffect(() => {
    if (location?.kind !== "gps" || location.city !== undefined) return;
    placeOf(location.lat, location.lng).then(({ city }) => write({ ...location, city }));
  }, [location]);

  /** Asks the device where it is; `onDone` runs once the location is saved. */
  const locate = useCallback((onDone?: () => void) => {
    if (!("geolocation" in navigator)) return setStatus("unavailable");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e4) / 1e4;
        const lng = Math.round(pos.coords.longitude * 1e4) / 1e4;
        write({ kind: "gps", lat, lng, ...(await placeOf(lat, lng)) });
        setStatus("idle");
        onDone?.();
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  const chooseCity = useCallback((city: string) => write({ kind: "city", city, label: city }), []);
  const clear = useCallback(() => write(null), []);

  return { location, status, locate, chooseCity, clear };
}

type Placeable = { lat: number | null; lng: number | null; city: string | null };

/**
 * Orders places for a patient's location, with each one's distance when both have a pin, and whether it is near
 * (inArea). With the device location a pinned place is near within NEARBY_KM, and a place without a pin when it is in
 * the device's city. With a chosen city, places in that city are near. Near places come first, nearest first; without
 * a location everything keeps its order and counts as near.
 */
export function byNearness<T extends Placeable>(items: T[], location: PatientLocation | null): { item: T; km: number | null; inArea: boolean }[] {
  if (!location) return items.map((item) => ({ item, km: null, inArea: true }));
  const here: LatLng | null = location.kind === "gps" ? { lat: location.lat, lng: location.lng } : null;
  const rows = items.map((item, i) => {
    const km = here && item.lat != null && item.lng != null ? distanceKm(here, { lat: item.lat, lng: item.lng }) : null;
    return { item, km, inArea: km != null ? km <= NEARBY_KM : sameCity(item.city, location.city), i };
  });
  return rows
    .sort((a, b) => Number(b.inArea) - Number(a.inArea) || (a.km ?? Infinity) - (b.km ?? Infinity) || a.i - b.i)
    .map(({ item, km, inArea }) => ({ item, km, inArea }));
}

/** Only the places near the patient's location, nearest first (all of them when no location is set). */
export const nearbyOnly = <T extends Placeable>(items: T[], location: PatientLocation | null) =>
  byNearness(items, location).filter((row) => row.inArea);
