'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, CalendarClock, ClipboardList, Copy, FilePenLine, FlaskConical, HeartPulse, LoaderCircle, MessageSquareText, Paperclip, Pill, Plus,
  RotateCcw, Stethoscope, Trash2, TriangleAlert, X, type LucideIcon,
} from 'lucide-react'
import { addPrescription } from '@/app/actions/doctor'
import { bmiCategory, bmiOf } from '@/lib/vitals'
import {
  ADVICE_CHIPS, COMPLAINT_CHIPS, DURATION_UNITS, FOLLOW_UPS, FORM_NAMES, FREQUENCIES, MED_FORMS, TEST_CHIPS, TIMINGS, blankMedicine, filledMedicines,
  frequencyWords, listItems, type Medicine, type RxData,
} from '@/lib/rx'

export type WriterVisit = { id: string; status: string; patientName: string }

// Common medicines offered as suggestions while typing (the doctor can write any name).
const COMMON_MEDICINES = [
  'Paracetamol 500 mg', 'Paracetamol 650 mg', 'Ibuprofen 400 mg', 'Aceclofenac 100 mg + Paracetamol 325 mg', 'Cetirizine 10 mg', 'Levocetirizine 5 mg',
  'Montelukast 10 mg + Levocetirizine 5 mg', 'Pantoprazole 40 mg', 'Rabeprazole 20 mg', 'Domperidone 10 mg', 'Ondansetron 4 mg', 'Amoxicillin 500 mg',
  'Amoxicillin + Clavulanic acid 625 mg', 'Azithromycin 500 mg', 'Cefixime 200 mg', 'Doxycycline 100 mg', 'Metronidazole 400 mg', 'Ofloxacin 200 mg',
  'ORS', 'Vitamin D3 60,000 IU', 'Vitamin B-complex', 'Calcium + Vitamin D3', 'Iron + Folic acid', 'Metformin 500 mg', 'Glimepiride 1 mg',
  'Amlodipine 5 mg', 'Telmisartan 40 mg', 'Atorvastatin 10 mg', 'Aspirin 75 mg', 'Salbutamol inhaler', 'Budesonide + Formoterol inhaler',
  'Dextromethorphan cough syrup', 'Ambroxol syrup', 'Diclofenac gel', 'Clotrimazole cream', 'Mupirocin ointment',
]

type Draft = Omit<RxData, 'followUp'> & { followUp: string }

const emptyDraft = (): Draft => ({
  complaints: '',
  findings: '',
  diagnosis: '',
  allergy: '',
  medicines: [blankMedicine()],
  investigations: '',
  advice: '',
  followUp: '',
  referral: '',
  vitals: { bp: '', spo2: '', hr: '', rr: '', temp: '', weight: '', height: '' },
})

const draftKey = (id: string) => `rx-draft:${id}`
const loadDraft = (id: string): Draft | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(id)) ?? 'null')
    if (!saved || typeof saved !== 'object' || !Array.isArray(saved.medicines)) return null
    // Drafts saved before a field existed get its empty value.
    const blank = emptyDraft()
    return { ...blank, ...saved, vitals: { ...blank.vitals, ...saved.vitals }, medicines: saved.medicines.map((m: Partial<Medicine>) => ({ ...blankMedicine(), ...m })) }
  } catch {
    return null
  }
}

const field = 'w-full rounded-lg bg-surface-container-low px-3 py-2.5 text-[14px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

/** Adds `chip` to a comma-separated list field, or takes it out if it's there. */
function toggleItem(value: string, chip: string) {
  const items = listItems(value)
  const has = items.some((i) => i.toLowerCase() === chip.toLowerCase())
  return (has ? items.filter((i) => i.toLowerCase() !== chip.toLowerCase()) : [...items, chip]).join(', ')
}

/**
 * The prescription writer: a full-screen form with every part of a prescription (complaints, findings, diagnosis,
 * medicines with dose / frequency / timing / duration, tests, advice, follow-up and vitals) beside a live preview.
 * The draft is kept in this browser until it's sent, so closing by mistake loses nothing.
 */
export function PrescriptionWriter({ visit, onClose }: { visit: WriterVisit; onClose: () => void }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(() => (typeof window === 'undefined' ? emptyDraft() : loadDraft(visit.id) ?? emptyDraft()))
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const firstField = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(visit.id), JSON.stringify(draft))
    } catch {
      // Storage blocked: the draft lasts until the writer closes.
    }
  }, [draft, visit.id])

  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (window.matchMedia('(min-width: 768px)').matches) firstField.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setMed = (i: number, patch: Partial<Medicine>) => setDraft((d) => ({ ...d, medicines: d.medicines.map((m, j) => (j === i ? { ...m, ...patch } : m)) }))
  const bmi = bmiOf(draft.vitals.weight, draft.vitals.height)
  const meds = filledMedicines(draft.medicines)

  const clear = () => {
    if (!window.confirm('Clear this prescription and start again?')) return
    setDraft(emptyDraft())
    setFile(null)
    setError(null)
  }

  const submit = () => {
    if (file && file.size > 5 * 1024 * 1024) return setError('The attachment must be under 5 MB.')
    if (!draft.diagnosis.trim() && meds.length === 0) return setError('Enter the diagnosis or at least one medicine.')
    const incomplete = draft.medicines.find((m) => !m.name.trim() && (m.dose.trim() || m.instructions.trim()))
    if (incomplete) return setError('A medicine row has a dose or instructions but no medicine name.')
    const payload: RxData = { ...draft, medicines: meds, followUp: draft.followUp || null }
    const form = new FormData()
    form.append('appointmentId', visit.id)
    form.append('payload', JSON.stringify(payload))
    if (file) form.append('file', file)
    start(async () => {
      const res = await addPrescription(form)
      if ('error' in res && res.error) {
        setError(res.error)
        return
      }
      try {
        localStorage.removeItem(draftKey(visit.id))
      } catch {
        // Nothing to clear.
      }
      onClose()
      router.refresh()
    })
  }

  const completing = visit.status !== 'completed'

  return (
    <div className="fixed inset-0 z-[90] bg-background flex flex-col" role="dialog" aria-modal="true" aria-label={`Prescription for ${visit.patientName}`}>
      {/* Top bar */}
      <header className="shrink-0 bg-surface-container-lowest border-b border-surface-container px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:flex w-10 h-10 rounded-xl bg-primary-fixed text-primary items-center justify-center shrink-0">
            <FilePenLine className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-title-md text-[16px] md:text-title-md font-bold text-indigo-gray-900 truncate">Prescription • {visit.patientName}</h2>
            <p className="text-[12px] text-indigo-gray-600 truncate">
              Booking #{visit.id.slice(0, 8).toUpperCase()} • PDF goes to the patient on WhatsApp and email{completing ? ' and completes the visit' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={clear} className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold text-indigo-gray-600 hover:bg-surface-container">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-[13px] md:text-sm font-bold disabled:opacity-60 shadow-sm"
          >
            {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
            <span className="hidden sm:inline">{completing ? 'Save, Send PDF & Complete' : 'Save & Send PDF'}</span>
            <span className="sm:hidden">Send</span>
          </button>
          <button type="button" onClick={onClose} aria-label="Close" title="Close (your draft is kept)" className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Phone: switch between writing and the preview */}
      <div className="xl:hidden shrink-0 px-3 pt-2 flex gap-1.5" role="tablist">
        {(['write', 'preview'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-[13px] font-semibold ${tab === t ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container text-on-surface'}`}
          >
            {t === 'write' ? 'Write' : 'Preview'}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mx-3 md:mx-6 mt-3 p-3 rounded-lg bg-error-container text-on-error-container text-sm flex items-start gap-2">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        {/* Writer */}
        <div className={`${tab === 'write' ? 'block' : 'hidden'} xl:block min-h-0 overflow-y-auto`}>
          <div className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-6 flex flex-col gap-4">
            <Block icon={HeartPulse} title="Vitals" hint="Measured at this visit">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {(
                  [
                    ['bp', 'BP', 'mmHg', '120/80'],
                    ['hr', 'Pulse', 'bpm', '72'],
                    ['rr', 'Resp. rate', '/min', '16'],
                    ['spo2', 'SpO2', '%', '98'],
                    ['temp', 'Temp', '°F', '98.6'],
                    ['weight', 'Weight', 'kg', '68'],
                    ['height', 'Height', 'cm', '170'],
                  ] as const
                ).map(([key, label, unit, ph]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-indigo-gray-600">
                      {label} <span className="font-normal">({unit})</span>
                    </span>
                    <input value={draft.vitals[key]} onChange={(e) => set('vitals', { ...draft.vitals, [key]: e.target.value })} placeholder={ph} maxLength={20} className={field} />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-indigo-gray-600" aria-live="polite">
                BMI: <span className="font-bold text-indigo-gray-900">{bmi ? `${bmi} • ${bmiCategory(bmi)}` : 'worked out from weight and height'}</span>
              </p>
            </Block>

            <Block icon={MessageSquareText} title="Chief complaints" hint="Tap to add, then add duration or details">
              <Chips options={COMPLAINT_CHIPS} value={draft.complaints} onToggle={(c) => set('complaints', toggleItem(draft.complaints, c))} />
              <textarea ref={firstField} value={draft.complaints} onChange={(e) => set('complaints', e.target.value)} rows={2} maxLength={2000} placeholder="e.g. Fever since 3 days, dry cough, body ache" className={`${field} mt-2 resize-y`} />
            </Block>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Block icon={Activity} title="Clinical findings" hint="History and examination">
                <textarea value={draft.findings} onChange={(e) => set('findings', e.target.value)} rows={4} maxLength={2000} placeholder="e.g. Throat congested, chest clear, no lymphadenopathy" className={`${field} resize-y`} />
              </Block>
              <Block icon={Stethoscope} title="Diagnosis" hint="Provisional or final">
                <textarea value={draft.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} rows={2} maxLength={2000} placeholder="e.g. Acute viral pharyngitis" className={`${field} resize-y`} />
                <label className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-error">Allergies</span>
                  <input value={draft.allergy} onChange={(e) => set('allergy', e.target.value)} maxLength={300} placeholder="e.g. Penicillin, sulfa drugs (or leave blank)" className={field} />
                </label>
              </Block>
            </div>

            <Block
              icon={Pill}
              title="Medicines (Rx)"
              hint={`${meds.length} ${meds.length === 1 ? 'medicine' : 'medicines'}`}
              action={
                <button type="button" onClick={() => set('medicines', [...draft.medicines, blankMedicine()])} disabled={draft.medicines.length >= 30} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-fixed/60 text-primary text-[13px] font-bold hover:bg-primary-fixed disabled:opacity-50">
                  <Plus className="w-4 h-4" /> Add medicine
                </button>
              }
            >
              <datalist id="rx-medicines">
                {COMMON_MEDICINES.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <ol className="flex flex-col gap-3">
                {draft.medicines.map((m, i) => (
                  <MedicineRow
                    key={i}
                    index={i}
                    medicine={m}
                    onChange={(patch) => setMed(i, patch)}
                    onCopy={() => setDraft((d) => ({ ...d, medicines: [...d.medicines.slice(0, i + 1), { ...m }, ...d.medicines.slice(i + 1)] }))}
                    onRemove={() => setDraft((d) => ({ ...d, medicines: d.medicines.length > 1 ? d.medicines.filter((_, j) => j !== i) : [blankMedicine()] }))}
                  />
                ))}
              </ol>
            </Block>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Block icon={FlaskConical} title="Investigations advised" hint="Tests to do">
                <Chips options={TEST_CHIPS} value={draft.investigations} onToggle={(c) => set('investigations', toggleItem(draft.investigations, c))} />
                <textarea value={draft.investigations} onChange={(e) => set('investigations', e.target.value)} rows={2} maxLength={2000} placeholder="Comma or new line between tests" className={`${field} mt-2 resize-y`} />
              </Block>
              <Block icon={ClipboardList} title="Advice" hint="Diet, rest and care at home">
                <Chips options={ADVICE_CHIPS} value={draft.advice} onToggle={(c) => set('advice', toggleItem(draft.advice, c))} />
                <textarea value={draft.advice} onChange={(e) => set('advice', e.target.value)} rows={2} maxLength={3000} placeholder="One piece of advice per line" className={`${field} mt-2 resize-y`} />
              </Block>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Block icon={CalendarClock} title="Follow-up" hint="When to come back">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {FOLLOW_UPS.map((f) => {
                    const date = addDays(f.days)
                    return (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => set('followUp', draft.followUp === date ? '' : date)}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border ${draft.followUp === date ? 'bg-vibrant-blue text-on-primary border-vibrant-blue' : 'bg-surface-container-lowest border-outline-variant/60 hover:border-vibrant-blue/50'}`}
                      >
                        After {f.label}
                      </button>
                    )
                  })}
                </div>
                <input type="date" min={istToday()} value={draft.followUp} onChange={(e) => set('followUp', e.target.value)} className={field} />
              </Block>
              <Block icon={Paperclip} title="Referral & attachment" hint="Optional">
                <input value={draft.referral} onChange={(e) => set('referral', e.target.value)} maxLength={300} placeholder="Refer to, e.g. Cardiologist for 2D Echo review" className={field} />
                <label className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-indigo-gray-600">Attach a document (PDF or image, up to 5 MB)</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-indigo-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-surface-container-high file:text-primary"
                  />
                </label>
              </Block>
            </div>
            <p className="text-[12px] text-indigo-gray-600 pb-6">Your draft is saved in this browser as you type. It’s cleared once the prescription is sent.</p>
          </div>
        </div>

        {/* Live preview */}
        <aside className={`${tab === 'preview' ? 'block' : 'hidden'} xl:block min-h-0 overflow-y-auto bg-surface-container-low xl:border-l border-surface-container`}>
          <div className="p-3 md:p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-gray-600 mb-2">Preview • the PDF adds your letterhead, registration and signature</p>
            <Preview draft={draft} patientName={visit.patientName} code={visit.id.slice(0, 8).toUpperCase()} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Block({ icon: Icon, title, hint, action, children }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-5 shadow-sm border border-surface-container">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-primary-fixed/50 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="font-title-md text-[15px] font-bold text-indigo-gray-900">{title}</h3>
            {hint && <p className="text-[11.5px] text-indigo-gray-600 truncate">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Chips({ options, value, onToggle }: { options: string[]; value: string; onToggle: (chip: string) => void }) {
  const chosen = new Set(listItems(value).map((i) => i.toLowerCase()))
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = chosen.has(o.toLowerCase())
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-colors ${on ? 'bg-vibrant-blue text-on-primary border-vibrant-blue' : 'bg-surface-container-lowest text-on-surface border-outline-variant/60 hover:border-vibrant-blue/50'}`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

function MedicineRow({ index, medicine: m, onChange, onCopy, onRemove }: { index: number; medicine: Medicine; onChange: (patch: Partial<Medicine>) => void; onCopy: () => void; onRemove: () => void }) {
  const [amount, unit] = (() => {
    const match = m.duration.match(/^(\d+)\s*(days?|weeks?|months?)$/i)
    return match ? [match[1], `${match[2].toLowerCase().replace(/s?$/, 's')}`] : [m.duration, '']
  })()
  const setDuration = (value: string, u: string) => onChange({ duration: value && u ? `${value} ${Number(value) === 1 ? u.replace(/s$/, '') : u}` : value })

  return (
    <li className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="w-6 h-6 rounded-full bg-vibrant-blue text-on-primary text-[12px] font-bold flex items-center justify-center">{index + 1}</span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={onCopy} title="Duplicate" aria-label="Duplicate medicine" className="p-1.5 rounded-full hover:bg-surface-container text-indigo-gray-600">
            <Copy className="w-4 h-4" />
          </button>
          <button type="button" onClick={onRemove} title="Remove" aria-label="Remove medicine" className="p-1.5 rounded-full hover:bg-error-container/50 text-error">
            <Trash2 className="w-4 h-4" />
          </button>
        </span>
      </div>
      <div className="grid grid-cols-12 gap-2">
        <label className="col-span-4 sm:col-span-2 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">Type</span>
          <select value={m.form} onChange={(e) => onChange({ form: e.target.value as Medicine['form'] })} className={field}>
            {MED_FORMS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="col-span-8 sm:col-span-4 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">Medicine name and strength</span>
          <input value={m.name} onChange={(e) => onChange({ name: e.target.value })} list="rx-medicines" maxLength={120} placeholder="e.g. Dolo 650" className={field} />
        </label>
        <label className="col-span-6 sm:col-span-3 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">Generic name</span>
          <input value={m.generic} onChange={(e) => onChange({ generic: e.target.value })} maxLength={120} placeholder="e.g. Paracetamol" className={field} />
        </label>
        <label className="col-span-6 sm:col-span-3 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">Dose</span>
          <input value={m.dose} onChange={(e) => onChange({ dose: e.target.value })} maxLength={40} placeholder="1 tablet / 5 ml" className={field} />
        </label>
        <label className="col-span-6 sm:col-span-4 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">Frequency</span>
          <select value={FREQUENCIES.some((f) => f.value === m.frequency) ? m.frequency : ''} onChange={(e) => onChange({ frequency: e.target.value })} className={field}>
            <option value="">Choose</option>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.value} • {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-6 sm:col-span-3 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">When</span>
          <select value={m.timing} onChange={(e) => onChange({ timing: e.target.value })} className={field}>
            {TIMINGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="col-span-12 sm:col-span-5 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">Duration</span>
          <div className="flex gap-2">
            <input
              value={amount}
              onChange={(e) => setDuration(e.target.value.replace(/[^\d]/g, '').slice(0, 3), unit || 'days')}
              inputMode="numeric"
              aria-label="Duration"
              placeholder="5"
              className={`${field} w-20`}
            />
            <select value={unit || 'days'} onChange={(e) => setDuration(amount, e.target.value)} aria-label="Duration unit" className={field}>
              {DURATION_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <button type="button" onClick={() => onChange({ duration: 'Continue' })} className={`px-3 rounded-lg text-[12px] font-semibold shrink-0 ${m.duration === 'Continue' ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container hover:bg-surface-container-high'}`}>
              Continue
            </button>
          </div>
        </div>
        <label className="col-span-12 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-indigo-gray-600">Instructions (optional)</span>
          <input value={m.instructions} onChange={(e) => onChange({ instructions: e.target.value })} maxLength={200} placeholder="e.g. Stop if fever settles; dissolve in water" className={field} />
        </label>
      </div>
    </li>
  )
}

/** A paper-like preview in the prescription format: patient grid, medicine table, symptoms, vitals, notes, follow-up. */
function Preview({ draft, patientName, code }: { draft: Draft; patientName: string; code: string }) {
  const meds = filledMedicines(draft.medicines)
  const bmi = bmiOf(draft.vitals.weight, draft.vitals.height)
  const v = draft.vitals
  const grid: [string, string][] = [
    ['Patient name', patientName],
    ['Weight', v.weight ? `${v.weight} kg` : '—'],
    ['Height', v.height ? `${v.height} cm` : '—'],
    ['BMI', bmi ? `${bmi} kg/m²` : '—'],
    ['O2 (oxygen saturation)', v.spo2 ? `${v.spo2.replace(/%$/, '')} %` : '—'],
    ['Date and time', new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ]
  const observed = [
    ['Blood Pressure', v.bp && `${v.bp} mmHg`],
    ['Heart Rate', v.hr && `${v.hr} bpm`],
    ['Respiratory Rate', v.rr && `${v.rr} breaths/min`],
    ['Body Temperature', v.temp],
  ].filter(([, value]) => value)
  const symptoms = listItems(draft.complaints)
  const tests = listItems(draft.investigations)
  const notes = listItems(draft.advice)
  const heading = (t: string) => <p className="text-[10.5px] font-bold uppercase tracking-wide text-on-surface">{t}:</p>
  const cell = 'border border-sky-400/70 px-1.5 py-1 align-middle'

  return (
    <div className="bg-white text-on-surface rounded-lg shadow-[0_4px_20px_rgba(15,23,42,0.12)] p-5 flex flex-col gap-3 min-h-[600px]">
      <div className="border-b border-outline pb-2 flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-on-surface flex items-center gap-1.5">
          <Stethoscope className="w-5 h-5 text-vibrant-blue" /> Consult Your Doctor
        </p>
        <div className="text-right">
          <p className="text-[11.5px] font-bold">Your name</p>
          <p className="text-[10px] text-indigo-gray-600">Hospital and address • Reg. No.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 border border-sky-400/70 text-[10.5px]">
        {grid.map(([label, value]) => (
          <div key={label} className="border border-sky-400/40 px-1.5 py-1 min-w-0">
            <p className="font-bold text-[9px]">{label}</p>
            <p className="truncate">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[14px] font-bold tracking-wide">PRESCRIPTION</p>
      {meds.length > 0 ? (
        <table className="w-full text-[10.5px] border-collapse">
          <thead>
            <tr className="bg-sky-100 text-center">
              {['#', 'Medicine', 'Dose', 'Frequency', 'Duration', 'Instructions'].map((h) => (
                <th key={h} className={`${cell} font-bold`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meds.map((m, i) => (
              <tr key={i}>
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td className={cell}>
                  {m.name}
                  {FORM_NAMES[m.form] && <span className="font-bold"> ({FORM_NAMES[m.form]})</span>}
                  {m.generic && <> {m.generic}</>}
                </td>
                <td className={`${cell} text-center`}>{m.dose || '—'}</td>
                <td className={`${cell} text-center`}>{m.frequency ? frequencyWords(m.frequency) : '—'}</td>
                <td className={`${cell} text-center`}>{m.duration || '—'}</td>
                <td className={cell}>{[m.timing && m.timing !== 'Any time' ? m.timing : '', m.instructions].filter(Boolean).join('. ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-[12px] text-indigo-gray-600 text-center">Medicines you add appear in the table here.</p>
      )}
      {symptoms.length > 0 && (
        <div>
          {heading('Symptoms')}
          {symptoms.map((s) => (
            <p key={s} className="text-[12px] font-bold">
              {s}
            </p>
          ))}
        </div>
      )}
      {draft.diagnosis.trim() && (
        <div>
          {heading('Diagnosis')}
          <p className="text-[12px] whitespace-pre-line">{draft.diagnosis}</p>
        </div>
      )}
      {observed.length > 0 && (
        <div>
          {heading('Vital observation')}
          {observed.map(([label, value]) => (
            <p key={label} className="text-[12px]">
              <span className="font-bold">{label}</span>: {value}
            </p>
          ))}
        </div>
      )}
      {draft.allergy.trim() && (
        <div>
          {heading('Allergies')}
          <p className="text-[12px] font-bold text-error">{draft.allergy}</p>
        </div>
      )}
      {tests.length > 0 && (
        <div>
          {heading('Tests advised')}
          <ul className="list-disc pl-4 text-[12px]">
            {tests.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        {heading('Notes')}
        <ul className="list-disc pl-4 text-[12px]">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li className="text-indigo-gray-600">The standard medicine-use notes are printed after these.</li>
        </ul>
      </div>
      <div>
        {heading('Followup')}
        {draft.followUp && (
          <p className="text-[12px]">
            <span className="font-bold">Next review with your doctor:</span>{' '}
            {new Date(`${draft.followUp}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        <p className="text-[11.5px] text-indigo-gray-600">Zebrold AI follows up with the patient for 12 days after the consultation.</p>
      </div>
      <div className="mt-auto pt-4 flex items-end justify-between gap-3 text-[10px] text-indigo-gray-600">
        <span className="border-t border-on-surface pt-1 w-40">Doctor’s signature and stamp</span>
        <span>Booking #{code} • RX number and barcode added on save</span>
      </div>
    </div>
  )
}
