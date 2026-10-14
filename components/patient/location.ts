"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { distanceKm, type LatLng } from "@/lib/geo";

// Where the patient is looking for care: their device's location, or a city they picked. Kept in this browser only
// (it never goes to our server); the device location is only used to sort what is already on the page.

export type PatientLocation =
  | { kind: "gps"; lat: number; lng: number; label: string }
  | { kind: "city"; city: string; label: string };

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

/** The neighbourhood or town for a point, from OpenStreetMap; falls back to "Current location". */
async function placeName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&addressdetails=1&lat=${lat}&lon=${lng}`, { headers: { Accept: "application/json" } });
    const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
    return a.suburb || a.neighbourhood || a.city_district || a.town || a.city || a.village || a.county || "Current location";
  } catch {
    return "Current location";
  }
}

export type LocateStatus = "idle" | "locating" | "denied" | "unavailable";

export function usePatientLocation() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const location = useMemo(() => parse(raw), [raw]);
  const [status, setStatus] = useState<LocateStatus>("idle");

  /** Asks the device where it is; `onDone` runs once the location is saved. */
  const locate = useCallback((onDone?: () => void) => {
    if (!("geolocation" in navigator)) return setStatus("unavailable");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e4) / 1e4;
        const lng = Math.round(pos.coords.longitude * 1e4) / 1e4;
        write({ kind: "gps", lat, lng, label: await placeName(lat, lng) });
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
 * Orders places for a patient's location, with each one's distance when both have a pin. With the device location:
 * pinned places nearest first, then the rest in their original order. With a city: places in that city first.
 * Without a location: the original order.
 */
export function byNearness<T extends Placeable>(items: T[], location: PatientLocation | null): { item: T; km: number | null; inArea: boolean }[] {
  if (!location) return items.map((item) => ({ item, km: null, inArea: true }));
  if (location.kind === "city") {
    const city = location.city.toLowerCase();
    const rows = items.map((item, i) => ({ item, km: null, inArea: (item.city ?? "").toLowerCase() === city, i }));
    return rows.sort((a, b) => Number(b.inArea) - Number(a.inArea) || a.i - b.i).map(({ item, km, inArea }) => ({ item, km, inArea }));
  }
  const here: LatLng = { lat: location.lat, lng: location.lng };
  const rows = items.map((item, i) => {
    const km = item.lat != null && item.lng != null ? distanceKm(here, { lat: item.lat, lng: item.lng }) : null;
    return { item, km, inArea: km != null && km <= 50, i };
  });
  return rows.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.i - b.i).map(({ item, km, inArea }) => ({ item, km, inArea }));
}
