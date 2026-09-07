'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Module-level geocode cache (persists across re-renders)
const geocodeCache: Record<string, [number, number]> = {}

async function geocodeCity(city: string): Promise<[number, number] | null> {
  if (!city) return null
  if (geocodeCache[city]) return geocodeCache[city]

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    if (data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodeCache[city] = coords
      return coords
    }
  } catch (e) {
    console.error('Geocoding failed for:', city, e)
  }
  return null
}

// Auto-fit map to all marker positions
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])))
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
    } else {
      map.setView([22.5, 78.5], 5) // Default: India center
    }
  }, [positions, map])
  return null
}

export type MapItem = {
  id: string
  name: string
  city: string
  subtitle?: string
}

export default function MapWithMarkers({
  items,
  activeId,
  onHover
}: {
  items: MapItem[],
  activeId: string | null,
  onHover: (id: string | null) => void
}) {
  const [cityCoords, setCityCoords] = useState<Record<string, [number, number]>>(
    () => ({ ...geocodeCache }) // Initialize from cache
  )

  // Extract unique cities
  const uniqueCities = useMemo(() => {
    return Array.from(new Set(items.map(i => i.city).filter(Boolean)))
  }, [items])

  // Geocode cities progressively
  useEffect(() => {
    let cancelled = false

    async function geocodeAll() {
      const uncached = uniqueCities.filter(c => !geocodeCache[c])
      for (const city of uncached) {
        if (cancelled) break
        const coords = await geocodeCity(city)
        if (coords && !cancelled) {
          setCityCoords(prev => ({ ...prev, [city]: coords }))
        }
        // Respect Nominatim rate limit: 1 req/sec
        if (uncached.indexOf(city) < uncached.length - 1) {
          await new Promise(r => setTimeout(r, 1100))
        }
      }
    }

    // Pre-populate from cache for instant rendering
    const fromCache: Record<string, [number, number]> = {}
    uniqueCities.forEach(c => {
      if (geocodeCache[c]) fromCache[c] = geocodeCache[c]
    })
    if (Object.keys(fromCache).length > 0) {
      setCityCoords(prev => ({ ...prev, ...fromCache }))
    }

    geocodeAll()
    return () => { cancelled = true }
  }, [uniqueCities])

  // Spread items within the same city so markers don't overlap
  const itemPositions = useMemo(() => {
    const positions: Record<string, [number, number]> = {}
    const cityCounts: Record<string, number> = {}

    items.forEach(item => {
      const base = cityCoords[item.city]
      if (!base) return

      cityCounts[item.city] = (cityCounts[item.city] || 0)
      const idx = cityCounts[item.city]
      cityCounts[item.city]++

      // Use golden angle to spread items in a sunflower pattern
      const angle = (idx * 137.5 * Math.PI) / 180
      const radius = 0.004 * Math.sqrt(idx + 1)

      positions[item.id] = [
        base[0] + radius * Math.cos(angle),
        base[1] + radius * Math.sin(angle)
      ]
    })

    return positions
  }, [items, cityCoords])

  // Create Leaflet marker icons
  const activeIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;background:#0066FF;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(0,102,255,0.3),0 4px 12px rgba(0,102,255,0.4);transition:all 0.2s;"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }), [])

  const normalIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:#0066FF;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25);transition:all 0.2s;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  }), [])

  const dimIcon = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;background:#cbd5e1;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.15);opacity:0.4;transition:all 0.2s;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  }), [])

  const allPositions = useMemo(() => Object.values(itemPositions), [itemPositions])

  return (
    <MapContainer
      center={[22.5, 78.5]}
      zoom={5}
      className="w-full h-full z-0"
      zoomControl={true}
      style={{ background: '#f0f4f8' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={allPositions} />

      {items.map(item => {
        const pos = itemPositions[item.id]
        if (!pos) return null

        const isActive = activeId === item.id
        const isDimmed = activeId !== null && !isActive

        return (
          <Marker
            key={item.id}
            position={pos}
            icon={isActive ? activeIcon : isDimmed ? dimIcon : normalIcon}
            zIndexOffset={isActive ? 1000 : isDimmed ? -100 : 0}
            eventHandlers={{
              mouseover: () => onHover(item.id),
              mouseout: () => onHover(null),
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '140px' }}>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>{item.name}</strong>
                {item.subtitle && <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>{item.subtitle}</p>}
                <p style={{ fontSize: '11px', color: '#0066FF', margin: '2px 0 0' }}>{item.city}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
