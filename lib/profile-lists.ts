// Lists that hospital and doctor profiles pick from, and the clean-up applied before they are saved.

/** Health insurers and government schemes commonly accepted in India. Profiles can add others too. */
export const INSURERS = [
  'Star Health',
  'HDFC ERGO',
  'ICICI Lombard',
  'Niva Bupa',
  'Care Health',
  'Aditya Birla Health',
  'Bajaj Allianz',
  'Tata AIG',
  'ManipalCigna',
  'SBI General',
  'Reliance General',
  'New India Assurance',
  'United India Insurance',
  'National Insurance',
  'Oriental Insurance',
  'Ayushman Bharat PM-JAY',
  'CGHS',
  'ECHS',
]

export const FACILITIES = [
  '24x7 Emergency',
  'ICU',
  'NICU',
  'Operation Theatres',
  'Pharmacy',
  'Laboratory',
  'Radiology & Imaging',
  'Blood Bank',
  'Ambulance',
  'Dialysis',
  'Cashless Insurance Desk',
  'Cafeteria',
  'Parking',
  'Wheelchair Access',
]

export const ACCREDITATIONS = ['NABH', 'NABL', 'JCI', 'ISO 9001']

/** Trimmed, de-duplicated (ignoring case), each at most 80 characters, at most `max` items. */
export function cleanList(values: string[], max: number) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values.flatMap((v) => v.split(/[\n,]/))) {
    const value = raw.trim().replace(/\s+/g, ' ').slice(0, 80)
    if (!value || seen.has(value.toLowerCase())) continue
    seen.add(value.toLowerCase())
    out.push(value)
    if (out.length >= max) break
  }
  return out
}
