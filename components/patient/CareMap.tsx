"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";

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

/** OpenStreetMap's Nominatim geocoder, one request per second as its usage policy asks. */
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

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function pinIcon(clinic: Clinic, selected: boolean) {
  const label = `${escapeHtml(clinic.name.length > 26 ? `${clinic.name.slice(0, 25)}…` : clinic.name)} · ${clinic.doctorCount}`;
  const pill = selected
    ? "background:#0066FF;color:#fff;"
    : "background:#fff;color:#131b2e;border:1px solid #eaedff;";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="${pill}white-space:nowrap;padding:6px 12px;border-radius:9999px;font:700 12px/16px Manrope,Inter,sans-serif;box-shadow:0 4px 12px rgba(0,80,203,.18);">${label}</div>
      <div style="width:10px;height:10px;margin-top:-5px;transform:rotate(45deg);${selected ? "background:#0066FF;" : "background:#fff;"}"></div>
    </div>`,
  });
}

const youIcon = L.divIcon({
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `<div style="width:20px;height:20px;border-radius:9999px;background:#0066FF;border:4px solid #fff;box-shadow:0 0 0 6px rgba(0,102,255,.18),0 2px 6px rgba(0,0,0,.25);"></div>`,
});

function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) map.setView(INDIA, 5);
    else if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function FlyToSelected({ point }: { point: Point | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [point, map]);
  return null;
}

function LocateButton({ onFound }: { onFound: (p: [number, number]) => void }) {
  const map = useMap();
  const [error, setError] = useState(false);
  return (
    <div className="leaflet-top leaflet-right" style={{ top: 80 }}>
      <div className="leaflet-control">
        <button
          type="button"
          title={error ? "Location unavailable" : "Show my location"}
          aria-label="Show my location"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                onFound(p);
                map.flyTo(p, 12, { duration: 0.6 });
              },
              () => setError(true),
            )
          }
          className={`w-11 h-11 bg-surface-container-lowest/95 rounded-2xl shadow-md flex items-center justify-center hover:bg-surface-container transition-colors ${error ? "text-outline" : "text-vibrant-blue"}`}
        >
          <LocateFixed className="w-5 h-5" />
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
  const [you, setYou] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cityIndex: Record<string, number> = {};
      for (const clinic of clinics) {
        if (cancelled) return;
        const exact = clinic.address ? await geocode([clinic.address, clinic.city].filter(Boolean).join(", ")) : null;
        let point: Point | null = exact ? { lat: exact[0], lng: exact[1], approximate: false } : null;
        if (!point && clinic.city) {
          const center = await geocode(clinic.city);
          if (center) {
            // Spread clinics that share a city centre so their pins don't stack.
            const i = (cityIndex[clinic.city] = (cityIndex[clinic.city] ?? -1) + 1);
            const angle = (i * 137.5 * Math.PI) / 180;
            const r = 0.006 * Math.sqrt(i + 1);
            point = { lat: center[0] + r * Math.cos(angle), lng: center[1] + r * Math.sin(angle), approximate: true };
          }
        }
        if (point && !cancelled) {
          const p = point;
          setPoints((prev) => ({ ...prev, [clinic.id]: p }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clinics]);

  const placed = clinics.filter((c) => points[c.id]);
  const fitPoints = placed.map((c) => [points[c.id].lat, points[c.id].lng] as [number, number]);
  const anyApproximate = placed.some((c) => points[c.id].approximate);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={INDIA} zoom={5} className="w-full h-full z-0" zoomControl={false} style={{ background: "#e8effd" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={fitPoints} />
        <FlyToSelected point={selectedId ? points[selectedId] : undefined} />
        <LocateButton onFound={setYou} />
        {placed.map((clinic) => (
          <Marker
            key={clinic.id}
            position={[points[clinic.id].lat, points[clinic.id].lng]}
            icon={pinIcon(clinic, clinic.id === selectedId)}
            zIndexOffset={clinic.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(clinic.id) }}
          />
        ))}
        {you && <Marker position={you} icon={youIcon} />}
        <ZoomButtons />
      </MapContainer>
      {anyApproximate && (
        <p className="absolute bottom-1 left-2 z-[400] text-[10px] text-indigo-gray-600 bg-surface-container-lowest/80 px-1.5 rounded">
          Some pins are placed at the city centre (approximate)
        </p>
      )}
    </div>
  );
}

function ZoomButtons() {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control bg-surface-container-lowest/95 rounded-2xl shadow-md p-1 flex flex-col">
        <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()} className="w-10 h-10 flex items-center justify-center text-on-surface text-xl hover:bg-surface-container rounded-xl">
          +
        </button>
        <div className="h-px bg-surface-container mx-2" />
        <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()} className="w-10 h-10 flex items-center justify-center text-on-surface text-xl hover:bg-surface-container rounded-xl">
          −
        </button>
      </div>
    </div>
  );
}
