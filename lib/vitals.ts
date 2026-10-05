// Vitals a doctor measures are kept in the visit's notes as "Vitals: BP 120/80, SpO2 98, HR 72." (the walk-in form
// and the prescription form both write them this way), so the portal can show the latest reading without a
// separate table. Only what the doctor typed is ever shown.

export type Vitals = { bp: string | null; spo2: string | null; hr: string | null }

// Commas and full stops separate the parts of the sentence, so they can't appear inside a value.
const clean = (value: unknown) => String(value ?? '').replace(/,/g, ' ').replace(/\.+\s*$/, '').trim().slice(0, 24)

export function vitalsSentence(input: { bp?: unknown; spo2?: unknown; hr?: unknown }) {
  const bp = clean(input.bp)
  const spo2 = clean(input.spo2)
  const hr = clean(input.hr)
  const parts = [bp && `BP ${bp}`, spo2 && `SpO2 ${spo2}`, hr && `HR ${hr}`].filter(Boolean)
  return parts.length ? `Vitals: ${parts.join(', ')}.` : ''
}

export function parseVitals(notes: string | null | undefined): Vitals | null {
  const match = notes?.match(/Vitals: (.*?)\.(?=\s|$)/)
  if (!match) return null
  const parts = match[1].split(', ')
  const get = (label: string) => parts.find((p) => p.startsWith(`${label} `))?.slice(label.length + 1).trim() || null
  const vitals = { bp: get('BP'), spo2: get('SpO2'), hr: get('HR') }
  return vitals.bp || vitals.spo2 || vitals.hr ? vitals : null
}

/** "98" → "98%", "72" → "72 bpm"; anything with its own unit is shown as typed. */
export const showSpO2 = (v: string) => (/^\d+(\.\d+)?$/.test(v) ? `${v}%` : v)
export const showHR = (v: string) => (/^\d+(\.\d+)?$/.test(v) ? `${v} bpm` : v)
