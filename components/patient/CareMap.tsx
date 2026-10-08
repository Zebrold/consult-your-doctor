"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Minus, Plus } from "lucide-react";

export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  doctorCount: number;
};

type Point = { lat: number; lng: number; approximate: boolean };

const INDIA: [number, number] = [22.5, 78.5];
const memoryCache = new Map<string, [number, number] | null>();

function readCache(query: string): [number, number] | null | undefined {
  if (memoryCache.has(query)) return memoryCache.get(query);
  try {
    const raw = window.localStorage.getItem(`cyd-geo:${query}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return undefined;
}

function writeCache(query: string, value: [number, number] | null) {
  memoryCache.set(query, value);
  try {
    window.localStorage.setItem(`cyd-geo:${query}`, JSON.stringify(value));
  } catch {}
}

/** OpenStreetMap's Nominatim geocoder, one request per second as its usage policy asks. Answers are cached. */
let queue: Promise<unknown> = Promise.resolve();
function geocode(query: string): Promise<[number, number] | null> {
  const cached = readCache(query);
  if (cached !== undefined) return Promise.resolve(cached);
  const job = queue.then(async () => {
    const again = readCache(query);
    if (again !== undefined) return again;
    let result: [number, number] | null = null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) result = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch {
      return null; // network problem: don't cache, try again next visit
    }
    writeCache(query, result);
    await new Promise((r) => setTimeout(r, 1100));
    return result;
  });
  queue = job.catch(() => null);
  return job;
}

/** A compact pin with the hospital's doctor count; the selected one is larger and blue. */
function pinIcon(count: number, selected: boolean) {
  const size = selected ? 46 : 36;
  const fill = selected ? "#0066FF" : "#ffffff";
  const text = selected ? "#ffffff" : "#0050cb";
  const ring = selected ? "#ffffff" : "#0066FF";
  return L.divIcon({
    className: "cyd-pin",
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.25],
    tooltipAnchor: [0, -size * 1.1],
    html: `<svg width="${size}" height="${size * 1.25}" viewBox="0 0 40 50" style="filter:drop-shadow(0 4px 6px rgba(0,40,120,.28));overflow:visible">
      <path d="M20 49c-1.2-1.6-17-17.5-17-29A17 17 0 0 1 37 20c0 11.5-15.8 27.4-17 29z" fill="${fill}" stroke="${ring}" stroke-width="2.5"/>
      <text x="20" y="25" text-anchor="middle" font-family="Manrope,Inter,sans-serif" font-weight="800" font-size="${count > 9 ? 13 : 15}" fill="${text}">${count > 99 ? "99+" : count}</text>
    </svg>`,
  });
}

const youIcon = L.divIcon({
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `<div style="width:20px;height:20px;border-radius:9999px;background:#0066FF;border:4px solid #fff;box-shadow:0 0 0 6px rgba(0,102,255,.18),0 2px 6px rgba(0,0,0,.25);"></div>`,
});

/** Fits the map to the hospitals when the set of hospitals changes (not when a pin is refined, so the map stays put). */
function FitToPoints({ setKey, points }: { setKey: string; points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (fitted.current === setKey || (points.length === 0 && setKey)) return;
    fitted.current = setKey;
    if (points.length === 0) map.setView(INDIA, 5);
    else if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 });
  }, [setKey, points, map]);
  return null;
}

function FlyToSelected({ point }: { point: Point | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [point, map]);
  return null;
}

/** Scroll-wheel zoom only after the map is clicked, so scrolling the page never gets stuck on the map. */
function WheelOnFocus({ onChange }: { onChange: (active: boolean) => void }) {
  const map = useMapEvents({
    click: () => {
      map.scrollWheelZoom.enable();
      onChange(true);
    },
    mouseout: () => {
      map.scrollWheelZoom.disable();
      onChange(false);
    },
  });
  return null;
}

/** Zoom in, zoom out and "my location" in one control, top right. */
function Controls({ onFound }: { onFound: (p: [number, number]) => void }) {
  const map = useMap();
  const [locating, setLocating] = useState<"idle" | "busy" | "error">("idle");
  const button = "w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-xl transition-colors";
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control !m-3 bg-surface-container-lowest/95 backdrop-blur rounded-2xl shadow-md p-1 flex flex-col">
        <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()} className={button}>
          <Plus className="w-[18px] h-[18px]" />
        </button>
        <span className="h-px bg-surface-container mx-2" />
        <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()} className={button}>
          <Minus className="w-[18px] h-[18px]" />
        </button>
        <span className="h-px bg-surface-container mx-2" />
        <button
          type="button"
          title={locating === "error" ? "Location unavailable" : "Show my location"}
          aria-label="Show my location"
          onClick={() => {
            if (!navigator.geolocation) return setLocating("error");
            setLocating("busy");
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                onFound(p);
                map.flyTo(p, 12, { duration: 0.6 });
                setLocating("idle");
              },
              () => setLocating("error"),
              { timeout: 10000 },
            );
          }}
          className={`${button} ${locating === "error" ? "text-outline" : "text-vibrant-blue"}`}
        >
          <LocateFixed className={`w-[18px] h-[18px] ${locating === "busy" ? "animate-pulse" : ""}`} />
        </button>
      </div>
    </div>
  );
}

export default function CareMap({
  clinics,
  selectedId,
  onSelect,
}: {
  clinics: Clinic[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [points, setPoints] = useState<Record<string, Point>>({});
  // Which set of hospitals (their ids) has been placed at least roughly; the map fits to it once.
  const [placedKey, setPlacedKey] = useState('');
  const [you, setYou] = useState<[number, number] | null>(null);
  const [wheel, setWheel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = clinics.map((c) => c.id).join(',');
    (async () => {
      // 1. Every hospital at its city first: a handful of lookups, so pins appear straight away.
      const cityCentres = new Map<string, [number, number] | null>();
      for (const city of Array.from(new Set(clinics.map((c) => c.city).filter(Boolean) as string[]))) {
        if (cancelled) return;
        cityCentres.set(city, await geocode(city));
      }
      const cityIndex: Record<string, number> = {};
      const rough: Record<string, Point> = {};
      for (const clinic of clinics) {
        const centre = clinic.city ? cityCentres.get(clinic.city) : null;
        if (!centre) continue;
        // Spread hospitals that share a city centre so their pins don't stack.
        const i = (cityIndex[clinic.city!] = (cityIndex[clinic.city!] ?? -1) + 1);
        const angle = (i * 137.5 * Math.PI) / 180;
        const r = i === 0 ? 0 : 0.006 * Math.sqrt(i);
        rough[clinic.id] = { lat: centre[0] + r * Math.cos(angle), lng: centre[1] + r * Math.sin(angle), approximate: true };
      }
      if (cancelled) return;
      setPoints(rough);
      setPlacedKey(key);

      // 2. Then the exact address of each, in the background; the map doesn't re-centre for these.
      for (const clinic of clinics) {
        if (cancelled || !clinic.address) continue;
        const exact = await geocode([clinic.address, clinic.city].filter(Boolean).join(", "));
        if (exact && !cancelled) setPoints((prev) => ({ ...prev, [clinic.id]: { lat: exact[0], lng: exact[1], approximate: false } }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clinics]);

  const placed = clinics.filter((c) => points[c.id]);
  const currentKey = clinics.map((c) => c.id).join(',');
  const setKey = placedKey === currentKey ? currentKey : '';
  const fitPoints = useMemo(() => placed.map((c) => [points[c.id].lat, points[c.id].lng] as [number, number]), [placed, points]);
  const anyApproximate = placed.some((c) => points[c.id].approximate);
  // Icons are rebuilt only when a count or the selection changes.
  const icons = useMemo(() => new Map(clinics.map((c) => [c.id, pinIcon(c.doctorCount, c.id === selectedId)])), [clinics, selectedId]);

  return (
    <div className="cyd-map relative w-full h-full">
      <MapContainer center={INDIA} zoom={5} className="w-full h-full z-0" zoomControl={false} scrollWheelZoom={false} style={{ background: "#eef2f8" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          keepBuffer={4}
        />
        <FitToPoints setKey={setKey} points={fitPoints} />
        <FlyToSelected point={selectedId ? points[selectedId] : undefined} />
        <WheelOnFocus onChange={setWheel} />
        <Controls onFound={setYou} />
        {placed.map((clinic) => {
          const selected = clinic.id === selectedId;
          return (
            <Marker
              key={clinic.id}
              position={[points[clinic.id].lat, points[clinic.id].lng]}
              icon={icons.get(clinic.id)!}
              zIndexOffset={selected ? 1000 : 0}
              title={clinic.name}
              eventHandlers={{ click: () => onSelect(clinic.id) }}
            >
              <Tooltip key={selected ? "on" : "off"} direction="top" permanent={selected} className="cyd-pin-label">
                <span className="font-bold">{clinic.name}</span>
                <span className="text-indigo-gray-600"> • {clinic.doctorCount} {clinic.doctorCount === 1 ? "doctor" : "doctors"}</span>
              </Tooltip>
            </Marker>
          );
        })}
        {you && <Marker position={you} icon={youIcon} title="You are here" />}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex flex-col items-start gap-1">
        {!wheel && <span className="text-[10px] text-indigo-gray-600 bg-surface-container-lowest/85 px-1.5 py-0.5 rounded">Click the map to zoom with your mouse wheel</span>}
        {anyApproximate && <span className="text-[10px] text-indigo-gray-600 bg-surface-container-lowest/85 px-1.5 py-0.5 rounded">Some pins are at the city centre until the exact address is found</span>}
      </div>
      <style>{`
        .cyd-map .leaflet-tile-pane { filter: saturate(0.62) brightness(1.04) contrast(0.96); }
        .cyd-map .leaflet-control-attribution { background: rgba(255,255,255,.75); border-radius: 6px 0 0 0; font-size: 10px; }
        .cyd-map .cyd-pin { background: none; border: none; }
        .cyd-map .cyd-pin-label { border: none; border-radius: 9999px; padding: 6px 12px; font: 600 12px/16px Manrope, Inter, sans-serif; color: #131b2e; box-shadow: 0 6px 16px rgba(0,40,120,.18); }
        .cyd-map .cyd-pin-label::before { display: none; }
      `}</style>
    </div>
  );
}
