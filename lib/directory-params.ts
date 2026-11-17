// The filters a link can open the doctor, hospital and lab directories with (/doctors, /hospitals, /diagnostics), e.g.
// /doctors?specialty=Cardiology&city=Delhi. Kept short and plain: they only pre-fill the list's search and filters.

export type DirectorySearch = Record<string, string | string[] | undefined>

export function directoryFilters(params: DirectorySearch) {
  const param = (key: string) => (typeof params[key] === 'string' ? (params[key] as string).trim().slice(0, 80) : '')
  return { q: param('q'), specialty: param('specialty'), city: param('city'), availableToday: param('available') === 'today' }
}

/**
 * Where an old /find or /search link goes now that the Find screen is gone: lab searches to the diagnostic centres,
 * hospital searches to the hospitals, a speciality or city to the doctors list filtered by it, and anything else
 * (including plain words) to Browse specialities.
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
  if (specialty || city) return `/doctors${query([['q', q], ['specialty', specialty], ['city', city]])}`
  return `/specialities${query([['q', q]])}`
}
