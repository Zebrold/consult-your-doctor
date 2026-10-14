"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geo";

const pin = L.divIcon({
  className: "",
  html: '<div style="width:34px;height:34px;transform:translate(-50%,-100%);position:relative"><svg viewBox="0 0 24 24" width="34" height="34" fill="#0066FF" stroke="#fff" stroke-width="1.6"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="none"/></svg></div>',
  iconSize: [0, 0],
});

function Follow({ point }: { point: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), { duration: 0.5 });
  }, [map, point]);
  return null;
}

function ClickToMove({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** The map inside LocationPicker: tap anywhere or drag the pin to place it. */
export default function LocationPickerMap({ point, fallbackCenter, onPick }: { point: LatLng | null; fallbackCenter: LatLng; onPick: (p: LatLng) => void }) {
  const centre = point ?? fallbackCenter;
  return (
    <MapContainer center={[centre.lat, centre.lng]} zoom={point ? 16 : 5} scrollWheelZoom={false} className="w-full h-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <ClickToMove onPick={onPick} />
      <Follow point={point} />
      {point && (
        <Marker
          position={[point.lat, point.lng]}
          icon={pin}
          draggable
          eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onPick({ lat: ll.lat, lng: ll.lng }); } }}
        />
      )}
    </MapContainer>
  );
}
