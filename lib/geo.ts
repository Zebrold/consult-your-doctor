// Coordinates for hospitals and diagnostic centres (pinned by their staff) and the distance to a patient.

export type LatLng = { lat: number; lng: number }

/** A pin from form fields: null when both are blank, 'invalid' when they aren't real coordinates. */
export function parseLatLng(latRaw: unknown, lngRaw: unknown): LatLng | null | 'invalid' {
  const latText = String(latRaw ?? '').trim()
  const lngText = String(lngRaw ?? '').trim()
  if (!latText && !lngText) return null
  const lat = Number(latText)
  const lng = Number(lngText)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'invalid'
  // Rounded to about 1 m; more digits only look precise.
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }
}

/** A pin read back from the database (columns may be missing or empty). */
export function toLatLng(lat: unknown, lng: unknown): LatLng | null {
  const a = typeof lat === 'number' ? lat : lat == null ? NaN : Number(lat)
  const b = typeof lng === 'number' ? lng : lng == null ? NaN : Number(lng)
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0) ? { lat: a, lng: b } : null
}

/** Straight-line (great-circle) distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** "650 m", "2.4 km", "18 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}
