import { z } from 'zod'

// What a prescription holds, shared by the doctor's prescription writer (browser) and the server that turns it into a
// PDF. Medicines are written the way Indian prescriptions read: "Tab. Paracetamol 650 mg — 1 tablet — 1-0-1 — after
// food — 5 days".

export const MED_FORMS = ['Tab.', 'Cap.', 'Syp.', 'Susp.', 'Inj.', 'Drops', 'Oint.', 'Cream', 'Gel', 'Inhaler', 'Sachet', 'Powder', 'Spray', 'Lotion', 'Other'] as const

export const FREQUENCIES: { value: string; label: string }[] = [
  { value: '1-0-0', label: 'Once a day (morning)' },
  { value: '0-1-0', label: 'Once a day (afternoon)' },
  { value: '0-0-1', label: 'Once a day (night)' },
  { value: '1-0-1', label: 'Twice a day' },
  { value: '1-1-1', label: 'Three times a day' },
  { value: '1-1-1-1', label: 'Four times a day' },
  { value: 'SOS', label: 'Only when needed' },
  { value: 'STAT', label: 'Immediately, once' },
  { value: 'Alternate days', label: 'Every other day' },
  { value: 'Once a week', label: 'Once a week' },
]

export const TIMINGS = ['After food', 'Before food', 'With food', 'Empty stomach', 'At bedtime', 'Any time'] as const

export const DURATION_UNITS = ['days', 'weeks', 'months'] as const

export const COMPLAINT_CHIPS = [
  'Fever', 'Cough', 'Cold', 'Sore throat', 'Headache', 'Body ache', 'Fatigue', 'Vomiting', 'Loose motions', 'Abdominal pain',
  'Acidity', 'Chest pain', 'Breathlessness', 'Dizziness', 'Joint pain', 'Back pain', 'Skin rash', 'Itching', 'Burning urination', 'Sleeplessness',
]

export const TEST_CHIPS = [
  'CBC', 'ESR', 'CRP', 'Blood sugar (FBS / PPBS)', 'HbA1c', 'Lipid profile', 'LFT', 'KFT', 'Thyroid profile (T3, T4, TSH)', 'Urine routine',
  'Vitamin D', 'Vitamin B12', 'Dengue NS1', 'Malaria antigen', 'Widal', 'Chest X-ray', 'ECG', 'USG abdomen', '2D Echo',
]

export const ADVICE_CHIPS = [
  'Drink plenty of fluids', 'Take adequate rest', 'Light, home-cooked diet', 'Avoid oily and spicy food', 'Steam inhalation twice a day',
  'Warm salt-water gargles', 'Walk 30 minutes daily', 'Check BP at home', 'Check blood sugar at home', 'Avoid smoking and alcohol',
  'Complete the full course of antibiotics', 'Come back sooner if symptoms get worse',
]

export const FOLLOW_UPS: { label: string; days: number }[] = [
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
]

const text = (max: number) => z.string().trim().max(max)

export const MedicineSchema = z.object({
  form: z.enum(MED_FORMS),
  /** Brand or medicine name with strength, e.g. "Dolo 650". */
  name: text(120),
  /** The generic (salt) name, e.g. "Paracetamol". */
  generic: text(120).default(''),
  dose: text(40),
  frequency: text(40),
  timing: text(40),
  duration: text(30),
  instructions: text(200),
})
export type Medicine = z.infer<typeof MedicineSchema>

export const RxSchema = z.object({
  complaints: text(2000),
  findings: text(2000),
  diagnosis: text(2000),
  allergy: text(300),
  medicines: z.array(MedicineSchema).max(30, 'A prescription can have up to 30 medicines.'),
  investigations: text(2000),
  advice: text(3000),
  followUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  referral: text(300),
  vitals: z.object({ bp: text(20), spo2: text(20), hr: text(20), rr: text(20).default(''), temp: text(20), weight: text(20), height: text(20) }),
})
export type RxData = z.infer<typeof RxSchema>

export const blankMedicine = (): Medicine => ({ form: 'Tab.', name: '', generic: '', dose: '', frequency: '1-0-1', timing: 'After food', duration: '5 days', instructions: '' })

/** Medicines that have a name (empty rows from the editor are dropped). */
export const filledMedicines = (list: Medicine[]) => list.filter((m) => m.name.trim())

/** "Tab. Paracetamol 650 mg" */
export const medicineName = (m: Pick<Medicine, 'form' | 'name'>) => (m.form && m.form !== 'Other' && !m.name.toLowerCase().startsWith(m.form.toLowerCase().replace('.', '')) ? `${m.form} ${m.name}` : m.name).trim()

/** The medicine type in words, as the prescription prints it: "Tablet", "Syrup", … (empty for Other). */
export const FORM_NAMES: Record<string, string> = {
  'Tab.': 'Tablet', 'Cap.': 'Capsule', 'Syp.': 'Syrup', 'Susp.': 'Suspension', 'Inj.': 'Injection', Drops: 'Drops', 'Oint.': 'Ointment',
  Cream: 'Cream', Gel: 'Gel', Inhaler: 'Inhaler', Sachet: 'Sachet', Powder: 'Powder', Spray: 'Spray', Lotion: 'Lotion', Other: '',
}

/** "Twice a day (1-0-1)": the frequency in words with the usual notation, for the prescription PDF. */
export const frequencyWords = (f: string) => {
  const known = FREQUENCIES.find((x) => x.value === f)
  if (!known) return f
  return /d/.test(f) ? `${known.label} (${f})` : known.label
}

/** "1-0-1" with its meaning, for the PDF and preview. */
export const frequencyText = (f: string) => {
  const known = FREQUENCIES.find((x) => x.value === f)
  return known && /\d/.test(f) ? `${f} (${known.label.toLowerCase()})` : f
}

/** One line of text per medicine, for the visit notes and older screens. */
export const medicineLine = (m: Medicine) =>
  [medicineName(m) + (m.generic ? ` (${m.generic})` : ''), m.dose, m.frequency && frequencyText(m.frequency), m.timing && m.timing !== 'Any time' ? m.timing.toLowerCase() : '', m.duration && `for ${m.duration}`, m.instructions]
    .filter(Boolean)
    .join(' — ')

/** Splits a list field (comma or new line separated) into items. */
export const listItems = (value: string | null | undefined) =>
  (value ?? '')
    .split(/\n|,(?![^(]*\))/)
    .map((s) => s.replace(/^\s*(?:[•\-*]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
