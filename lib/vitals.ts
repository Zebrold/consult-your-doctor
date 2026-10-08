// Vitals are kept in the visit's notes as "Vitals: BP 120/80, SpO2 98, HR 72, RR 16, Temp 98.6, Weight 70, Height 170, BMI 24.2."
// (the walk-in form, the prescription form and the hospital's health record form all write them this way), so the
// portals can show the latest reading without a separate table. Only what staff typed is ever shown; BMI is worked
// out from the weight and height they typed.

export type Vitals = {
  bp: string | null
  spo2: string | null
  hr: string | null
  /** Respiratory rate, breaths a minute. */
  rr: string | null
  temp: string | null
  /** Kilograms. */
  weight: string | null
  /** Centimetres. */
  height: string | null
  bmi: string | null
}

type VitalsInput = Partial<Record<Exclude<keyof Vitals, 'bmi'>, unknown>>

const LABELS: [keyof Vitals, string][] = [
  ['bp', 'BP'],
  ['spo2', 'SpO2'],
  ['hr', 'HR'],
  ['rr', 'RR'],
  ['temp', 'Temp'],
  ['weight', 'Weight'],
  ['height', 'Height'],
  ['bmi', 'BMI'],
]

// Commas and full stops separate the parts of the sentence, so they can't appear inside a value
// (a decimal point between digits is fine).
const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/,/g, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)

/** Body mass index from kilograms and centimetres, to one decimal, or null when either is missing or implausible. */
export function bmiOf(weight: unknown, height: unknown): string | null {
  const kg = Number(String(weight ?? '').replace(/[^\d.]/g, ''))
  const cm = Number(String(height ?? '').replace(/[^\d.]/g, ''))
  if (!(kg >= 2 && kg <= 400 && cm >= 40 && cm <= 250)) return null
  return (kg / (cm / 100) ** 2).toFixed(1)
}

/** The WHO adult category for a BMI value. */
export function bmiCategory(bmi: string | number | null | undefined) {
  const n = Number(bmi)
  if (!bmi || !Number.isFinite(n)) return null
  if (n < 18.5) return 'Underweight'
  if (n < 25) return 'Normal'
  if (n < 30) return 'Overweight'
  return 'Obese'
}

export function vitalsSentence(input: VitalsInput) {
  const values: Partial<Vitals> = {}
  for (const [key] of LABELS) if (key !== 'bmi') values[key] = clean(input[key]) || null
  values.bmi = bmiOf(values.weight, values.height)
  const parts = LABELS.map(([key, label]) => values[key] && `${label} ${values[key]}`).filter(Boolean)
  return parts.length ? `Vitals: ${parts.join(', ')}.` : ''
}

export function parseVitals(notes: string | null | undefined): Vitals | null {
  const match = notes?.match(/Vitals: (.*?)\.(?=\s|$)/)
  if (!match) return null
  const parts = match[1].split(', ')
  const get = (label: string) => parts.find((p) => p.startsWith(`${label} `))?.slice(label.length + 1).trim() || null
  const vitals = Object.fromEntries(LABELS.map(([key, label]) => [key, get(label)])) as Vitals
  vitals.bmi ??= bmiOf(vitals.weight, vitals.height)
  return Object.values(vitals).some(Boolean) ? vitals : null
}

/** The notes with the vitals sentence taken out, for showing the two separately. */
export const withoutVitals = (notes: string | null | undefined) => (notes ?? '').replace(/Vitals: .*?\.(?=\s|$)/, '').replace(/\s+/g, ' ').trim()

/** "98" → "98%", "72" → "72 bpm"; anything with its own unit is shown as typed. */
const bare = (v: string) => /^\d+(\.\d+)?$/.test(v)
export const showSpO2 = (v: string) => (bare(v) ? `${v}%` : v)
export const showHR = (v: string) => (bare(v) ? `${v} bpm` : v)
export const showRR = (v: string) => (bare(v) ? `${v} breaths/min` : v)
export const showTemp = (v: string) => (bare(v) ? `${v} °${Number(v) > 50 ? 'F' : 'C'}` : v)
export const showWeight = (v: string) => (bare(v) ? `${v} kg` : v)
export const showHeight = (v: string) => (bare(v) ? `${v} cm` : v)
export const showBMI = (v: string) => {
  const category = bmiCategory(v)
  return category ? `${v} (${category})` : v
}

/** Each recorded vital with its label and unit, in a fixed order, for lists and PDFs. */
export function vitalsList(v: Vitals | null): { label: string; value: string }[] {
  if (!v) return []
  const rows: [string, string | null, (s: string) => string][] = [
    ['Blood pressure', v.bp, (s) => (bare(s.replace('/', '')) ? `${s} mmHg` : s)],
    ['Pulse', v.hr, showHR],
    ['Respiratory rate', v.rr, showRR],
    ['SpO2', v.spo2, showSpO2],
    ['Temperature', v.temp, showTemp],
    ['Weight', v.weight, showWeight],
    ['Height', v.height, showHeight],
    ['BMI', v.bmi, showBMI],
  ]
  return rows.filter(([, value]) => value).map(([label, value, show]) => ({ label, value: show(value!) }))
}
