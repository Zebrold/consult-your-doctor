import { SPECIALITIES, isOf } from '@/components/home/specialities'

// The filters a link can open the hospital and lab lists with (/hospitals, /diagnostics), e.g. /diagnostics?q=CBC,
// and where the removed doctor-search addresses (/find, /search, /doctors) send their links now.

export type DirectorySearch = Record<string, string | string[] | undefined>

export function directoryFilters(params: DirectorySearch) {
  const param = (key: string) => (typeof params[key] === 'string' ? (params[key] as string).trim().slice(0, 80) : '')
  return { q: param('q'), specialty: param('specialty'), city: param('city') }
}

/**
 * Where a /find, /search or /doctors link goes now that the Find screen is gone: lab searches to the lab list,
 * hospital searches to the hospital list, a speciality to its speciality page, a city to that city's hospitals, and
 * anything else (including plain words) to Browse specialities.
 */
export function findRedirectTarget(params: DirectorySearch) {
  const { q, specialty, city } = directoryFilters(params)
  const mode = typeof params.mode === 'string' ? params.mode : typeof params.type === 'string' ? params.type : ''
  const query = (entries: [string, string][]) => {
    const out = new URLSearchParams(entries.filter(([, v]) => v))
    return out.size ? `?${out}` : ''
  }
  if (['labs', 'diagnostics', 'diagnostic'].includes(mode)) return `/diagnostics${query([['q', q], ['city', city]])}`
  if (['hospitals', 'hospital'].includes(mode)) return `/hospitals${query([['q', q], ['city', city]])}`
  const speciality = specialty ? SPECIALITIES.find((s) => isOf(s, specialty)) : undefined
  if (speciality) return `/specialities/${speciality.slug}`
  if (specialty) return `/specialities${query([['q', specialty]])}`
  if (city && !q) return `/hospitals/in/${encodeURIComponent(city)}`
  return `/specialities${query([['q', q]])}`
}
