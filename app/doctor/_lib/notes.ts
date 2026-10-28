// A visit's notes are one sentence-like string (see prescriptionNotes in lib/prescriptions.ts):
// "Complaints: … . Findings: … . <diagnosis> Allergy: … . Rx: a; b Tests: … . Advice: … Follow-up: … . Referral: … . Vitals: … ."
// The doctor screens pull the parts back out to show them in their own places.

const LABELS = ['Complaints', 'Findings', 'Allergy', 'Rx', 'Tests', 'Advice', 'Follow-up', 'Referral', 'Vitals'] as const
type Label = (typeof LABELS)[number]

const LABEL_RE = new RegExp(`(?:^|\\s)(${LABELS.join('|')}):\\s`, 'g')
// Complaints and findings are written as "Complaints: <text>." and the diagnosis follows them without a label.
const FIRST_SENTENCE: Label[] = ['Complaints', 'Findings']

export type NoteParts = {
  complaints: string | null
  findings: string | null
  /** The unlabelled text: the diagnosis on a prescription, or a free note. */
  diagnosis: string | null
  allergy: string | null
  rx: string | null
  tests: string | null
  followUp: string | null
}

const tidy = (s: string) => s.trim().replace(/\.$/, '').trim() || null

export function readNotes(notes: string | null | undefined): NoteParts {
  const text = (notes ?? '').replace(/\s+/g, ' ').trim()
  const marks = Array.from(text.matchAll(LABEL_RE), (m) => ({ label: m[1] as Label, start: m.index!, body: m.index! + m[0].length }))
  const parts: Partial<Record<Label, string | null>> = {}
  let loose = marks.length ? text.slice(0, marks[0].start) : text
  marks.forEach((m, i) => {
    let body = text.slice(m.body, marks[i + 1]?.start ?? text.length)
    if (FIRST_SENTENCE.includes(m.label)) {
      const stop = body.indexOf('. ')
      if (stop >= 0) {
        loose += ` ${body.slice(stop + 2)}`
        body = body.slice(0, stop)
      }
    }
    parts[m.label] = tidy(body)
  })
  return {
    complaints: parts.Complaints ?? null,
    findings: parts.Findings ?? null,
    diagnosis: tidy(loose),
    allergy: parts.Allergy ?? null,
    rx: parts.Rx ?? null,
    tests: parts.Tests ?? null,
    followUp: parts['Follow-up'] ?? null,
  }
}

/** The newest allergy written in any of these notes (newest first), or null. */
export function latestAllergy(notes: (string | null | undefined)[]) {
  for (const n of notes) {
    const allergy = readNotes(n).allergy
    if (allergy) return allergy
  }
  return null
}
