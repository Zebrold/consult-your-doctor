"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LoaderCircle, LocateFixed, MapPin, Search, X } from "lucide-react";
import type { LatLng } from "@/lib/geo";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-surface-container" />,
});

// India, for a centre with no pin yet.
const INDIA: LatLng = { lat: 22.5, lng: 79 };

/**
 * The map pin for a hospital or diagnostic centre, so patients nearby see it first with its distance. Sits inside the
 * profile form and posts `latitude` and `longitude`; "Find from address" reads the form's address and city fields.
 */
export function LocationPicker({ initial }: { initial: LatLng | null }) {
  const [point, setPoint] = useState<LatLng | null>(initial);
  const [busy, setBusy] = useState<"gps" | "address" | null>(null);
  const [note, setNote] = useState("");
  const anchor = useRef<HTMLDivElement>(null);

  const place = (p: LatLng) => {
    setPoint({ lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5 });
    setNote("");
  };

  const useCurrent = () => {
    if (!navigator.geolocation) return setNote("This browser can't share its location. Use the address or tap the map.");
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(null);
      },
      () => {
        setBusy(null);
        setNote("Location access was blocked. Allow it in the browser, or use the address or the map.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const fromAddress = async () => {
    const form = anchor.current?.closest("form");
    const value = (name: string) => ((form?.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "").trim();
    const query = [value("address"), value("city"), "India"].filter(Boolean).join(", ");
    if (!value("address") && !value("city")) return setNote("Enter the address and city first.");
    setBusy("address");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
      const found = (await res.json()) as { lat: string; lon: string }[];
      if (found[0]) place({ lat: Number(found[0].lat), lng: Number(found[0].lon) });
      else setNote("That address wasn't found on the map. Drag the pin or tap the map instead.");
    } catch {
      setNote("The map search isn't reachable right now. Drag the pin or tap the map instead.");
    } finally {
      setBusy(null);
    }
  };

  const button = "inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-60";
  return (
    <div ref={anchor} className="flex flex-col gap-3">
      <input type="hidden" name="latitude" value={point?.lat ?? ""} />
      <input type="hidden" name="longitude" value={point?.lng ?? ""} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useCurrent} disabled={!!busy} className={button}>
          {busy === "gps" ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-vibrant-blue" />} Use my current location
        </button>
        <button type="button" onClick={fromAddress} disabled={!!busy} className={button}>
          {busy === "address" ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-vibrant-blue" />} Find from address
        </button>
        {point && (
          <button type="button" onClick={() => setPoint(null)} className={`${button} text-error`}>
            <X className="w-4 h-4" /> Remove pin
          </button>
        )}
      </div>
      <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden ring-1 ring-outline-variant/50 isolate">
        <LocationPickerMap point={point} fallbackCenter={INDIA} onPick={place} />
        {!point && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-lg bg-surface-container-lowest/95 px-3 py-2 text-[13px] text-on-surface-variant shadow-sm">
            Tap the map where the entrance is, or use the buttons above.
          </p>
        )}
      </div>
      <p className="flex items-start gap-1.5 text-[13px] text-on-surface-variant">
        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-vibrant-blue" />
        {point
          ? `Pinned at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}. Drag the pin to fine-tune it, then save.`
          : "No pin yet: patients nearby won't see how far away you are."}
      </p>
      {note && <p role="alert" className="text-[13px] text-error">{note}</p>}
    </div>
  );
}
