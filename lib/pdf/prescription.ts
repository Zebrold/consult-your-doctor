import { PDFDocument, rgb, type PDFImage, type PDFPage, type RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { C, PAGE, drawLogo, loadAssets, richWrap, safe, wrap, type Fonts, type Seg } from './clinical'
import { drawBarcode } from './barcode'
import { FORM_NAMES, frequencyWords, listItems, type Medicine } from '@/lib/rx'
import { bmiOf, showHR, showRR, showTemp } from '@/lib/vitals'

// The prescription PDF in the Consult Your Doctor format: the brand and the doctor's clinic and registration at the top,
// a patient grid (name, sex, date of birth, mobile, weight, height, age, BMI, oxygen, date and time), the medicine table,
// symptoms, vital observation, notes and follow-up, the doctor's signature and a barcode of the prescription number.
// The last page holds the terms and usage.

const M = 42
const W = PAGE[0] - M * 2
const FOOTER = 58
const BLUE = rgb(0.29, 0.62, 0.84)
const HEAD = rgb(0.85, 0.93, 0.97)
const BOX = rgb(0.94, 0.97, 0.995)
const RULE = rgb(0.55, 0.57, 0.6)
const INK = rgb(0.07, 0.07, 0.09)
const RED = rgb(0.78, 0.16, 0.24)

export type PrescriptionDoc = {
  /** "RX0000000001" */
  number: string
  /** The booking it belongs to, e.g. "A1B2C3D4". */
  code: string
  issuedAt: Date
  doctor: { name: string; registration: string | null; council: string | null; signature: { bytes: Uint8Array; type: 'png' | 'jpg' } | null }
  clinic: { name: string; lines: (string | null | undefined)[] }
  patient: { name: string; sex: string | null; dateOfBirth: string | null; age: number | null; phone: string | null }
  vitals: { bp?: string; hr?: string; rr?: string; spo2?: string; temp?: string; weight?: string; height?: string }
  complaints: string | null
  findings: string | null
  diagnosis: string | null
  allergy: string | null
  /** Structured medicines from the writer; older notes pass `medicinesText` (one per line) instead. */
  medicines: Medicine[]
  medicinesText: string | null
  investigations: string[]
  advice: string[]
  followUp: string | null
  referral: string | null
}

const STANDARD_NOTES = [
  'Take all medications as directed and do not skip doses.',
  'If you experience any severe side effects, stop taking the medication and contact your doctor immediately.',
  'If you miss a dose, take it as soon as you remember unless it is almost time for the next dose.',
  'Store medicines at room temperature and keep them out of reach of children.',
]

const FOLLOW_UP_TEXT: Seg[] = [
  { t: 'Your follow-up care is taken care of by our ' },
  { t: 'Zebrold AI', b: true },
  {
    t: ', which checks in with you regularly for 12 days after your consultation to see how you are recovering and to remind you to take your medicines on time. If your symptoms get worse or anything seems wrong, it will alert your doctor straight away so you get help without delay.',
  },
]

const TERMS = [
  'This prescription is issued after consultation with a licensed doctor and is valid for the named patient only.',
  'It is valid only with the doctor’s signature and stamp, and for the period the doctor states (default: 30 days from the date issued).',
  'Please give complete and accurate health details, including allergies, current medicines and pregnancy. Consult Your Doctor is not responsible for harm caused by missing or incorrect information.',
  'Online consultations have limits. They cannot replace an in-person examination in emergencies or where physical tests are needed.',
  'Controlled or restricted medicines are prescribed only where local law allows.',
  'Consultation records are kept confidential and shared only as required by law or with your consent.',
  'This prescription may not be altered, copied or reused. Refills need a new consultation unless the doctor writes otherwise.',
]

const AI_CHECKING: Seg[] = [
  { t: 'AI-assisted checking.', b: true },
  {
    t: ' Consult Your Doctor uses AI tools to check prescriptions for possible errors, such as dose or frequency problems, duplicate medicines, known interactions and listed allergies. AI only flags issues for review. It does not diagnose or prescribe. Every prescription is reviewed and approved by a licensed doctor, who makes the final decision. AI can make mistakes, so always confirm with your doctor or pharmacist if something looks wrong.',
  },
]

const USAGE = [
  'Take each medicine exactly as written: dose, timing and number of days.',
  'Finish the full course, especially antibiotics, unless your doctor tells you to stop.',
  'Do not share your medicines or take someone else’s.',
  'Do not mix with alcohol or other medicines, including herbal products, without asking your doctor or pharmacist.',
  'Store as the label says, away from heat and moisture, and out of reach of children.',
  'Check the expiry date before use.',
  'Stop and seek urgent help for rash, swelling of the face or throat, trouble breathing, or any severe reaction.',
  'Contact your doctor if symptoms do not improve or get worse.',
]

const DISCLAIMER =
  'This information is general guidance and does not replace professional medical advice. In an emergency, go to the nearest hospital or call your local emergency number.'

const longDate = (d: Date) =>
  d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'long', day: '2-digit', year: 'numeric' })
const dateTime = (d: Date) =>
  `${d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`
/** "+919876543210" → "+91 98765 43210" */
const phoneText = (p: string | null) => {
  const digits = (p ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  return p
}
const unit = (v: string | undefined, suffix: string) => (v ? (/^\d+(\.\d+)?$/.test(v.trim()) ? `${v.trim()} ${suffix}` : v.trim()) : null)

/** "Fever since 3 days" → Fever (since 3 days); "Cough: dry, at night" → Cough (dry, at night). */
function symptomSegs(item: string): Seg[] {
  const m = item.match(/^(.*?)\s*(?::|—|–|\s-\s)\s*(.+)$/) ?? item.match(/^(.*?)\s+((?:since|for|from|on|off and on|at)\b.+)$/i)
  return m && m[1] ? [{ t: m[1], b: true }, { t: ` (${m[2]})` }] : [{ t: item, b: true }]
}

export async function renderPrescriptionPdf(doc: PrescriptionDoc): Promise<Uint8Array> {
  const { regular, bold, logo } = await loadAssets()
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`Prescription ${doc.number}`)
  pdf.setAuthor(doc.doctor.name)
  pdf.setCreator('Consult Your Doctor')
  const fonts: Fonts = { regular: await pdf.embedFont(regular, { subset: true }), bold: await pdf.embedFont(bold, { subset: true }) }
  const logoImage = await pdf.embedPng(logo)
  const signature = doc.doctor.signature
    ? await (doc.doctor.signature.type === 'png' ? pdf.embedPng(doc.doctor.signature.bytes) : pdf.embedJpg(doc.doctor.signature.bytes)).catch(() => null)
    : null

  const clinicLines = [doc.clinic.name, ...doc.clinic.lines].map(safe).filter(Boolean)
  const clinicOneLine = clinicLines.join(', ')
  const reg = doc.doctor.registration ? `${doc.doctor.registration}${doc.doctor.council ? ` (${doc.doctor.council})` : ''}` : '________'

  let page!: PDFPage
  let y = 0
  const pages: { page: PDFPage; terms: boolean }[] = []

  const text = (s: string, x: number, at: number, size: number, opts: { bold?: boolean; color?: RGB } = {}) =>
    page.drawText(safe(s), { x, y: at, size, font: opts.bold ? fonts.bold : fonts.regular, color: opts.color ?? INK })
  const rightText = (s: string, at: number, size: number, isBold = false, color: RGB = INK) => {
    const f = isBold ? fonts.bold : fonts.regular
    page.drawText(safe(s), { x: PAGE[0] - M - f.widthOfTextAtSize(safe(s), size), y: at, size, font: f, color })
  }
  const centered = (s: string, at: number, size: number, isBold = false) => {
    const f = isBold ? fonts.bold : fonts.regular
    page.drawText(safe(s), { x: (PAGE[0] - f.widthOfTextAtSize(safe(s), size)) / 2, y: at, size, font: f, color: INK })
  }
  const drawSegs = (line: Seg[], x: number, at: number, size: number, color: RGB = INK) => {
    let cx = x
    for (const s of line) {
      const f = s.b ? fonts.bold : fonts.regular
      page.drawText(s.t, { x: cx, y: at, size, font: f, color })
      cx += f.widthOfTextAtSize(s.t, size)
    }
  }

  const watermark = (p: PDFPage, image: PDFImage) => {
    const size = 330
    const scale = size / Math.max(image.width, image.height)
    p.drawImage(image, { x: (PAGE[0] - image.width * scale) / 2, y: PAGE[1] / 2 - (image.height * scale) / 2 - 40, width: image.width * scale, height: image.height * scale, opacity: 0.08 })
  }

  /** Brand on the left; the doctor (or "Terms and Usage") on the right; a rule underneath. */
  const header = (terms: boolean) => {
    const top = PAGE[1] - M
    drawLogo(page, logoImage, M, top - 34, 34)
    text('Consult Your Doctor', M + 42, top - 22, 17, { bold: true })
    let ry = top - 12
    if (terms) {
      rightText('Terms and Usage', ry, 11.5, true)
      ry -= 16
      rightText('Consult Your Doctor', ry, 10.5)
      ry -= 6
    } else {
      rightText(doc.doctor.name, ry, 11.5, true)
      ry -= 16
      for (const l of wrap(clinicOneLine, fonts.regular, 10.5, 250)) {
        rightText(l, ry, 10.5)
        ry -= 13.5
      }
      rightText(`Reg. No.: ${reg}`, ry, 9)
      ry -= 6
    }
    const bottom = Math.min(top - 44, ry) - 6
    page.drawLine({ start: { x: M, y: bottom }, end: { x: PAGE[0] - M, y: bottom }, thickness: 1, color: RULE })
    y = bottom - 12
  }

  const newPage = (terms = false) => {
    page = pdf.addPage(PAGE)
    watermark(page, logoImage)
    pages.push({ page, terms })
    header(terms)
  }

  // Without a signature image, the signature and barcode block at the foot of the page reaches this high (the barcode).
  const SIGN_TOP = FOOTER + 52
  const ensure = (space: number) => {
    if (y - space < FOOTER + 14) newPage()
  }

  newPage()

  // Patient grid
  {
    const v = doc.vitals
    const bmi = bmiOf(v.weight, v.height)
    const cell = (label: string, value: string | null | undefined): [string, string] => [label, safe(value) || '—']
    const rows: [string, string][][] = [
      [cell('Patient name', doc.patient.name), cell('Sex', doc.patient.sex), cell('Born (month, day, year)', doc.patient.dateOfBirth ? longDate(new Date(`${doc.patient.dateOfBirth}T12:00:00+05:30`)) : null), cell('Mobile number', phoneText(doc.patient.phone))],
      [cell('Weight', unit(v.weight, 'kg')), cell('Height', unit(v.height, 'cm')), cell('Age', doc.patient.age != null ? `${doc.patient.age} years` : null), cell('Body mass index (BMI)', bmi ? `${bmi} kg/m²` : null)],
      [cell('O2 (oxygen saturation)', unit(v.spo2?.replace(/%$/, ''), '%')), cell('Date and time', dateTime(doc.issuedAt))],
    ]
    const colW = W / 4
    const rowH = 33
    rows.forEach((row, r) => {
      const top = y - r * rowH
      row.forEach(([label, value], c) => {
        const x = M + c * colW
        const width = r === 2 && c === 1 ? colW * 3 : colW
        page.drawRectangle({ x, y: top - rowH, width, height: rowH, borderColor: BLUE, borderWidth: 0.9 })
        text(label, x + 7, top - 11, 7.5, { bold: true })
        text(wrap(value, fonts.regular, 10, width - 14)[0] ?? '', x + 7, top - 25, 10)
      })
    })
    y -= rows.length * rowH + 22
  }

  centered('PRESCRIPTION', y, 15, true)
  y -= 12

  // Medicine table
  const meds = doc.medicines.filter((m) => safe(m.name))
  const legacy = meds.length ? [] : (doc.medicinesText ?? '').split('\n').map(safe).filter(Boolean)
  const tableRows: { med: Seg[]; dose: string; freq: string; duration: string; instructions: string }[] = meds.length
    ? meds.map((m) => {
        const type = FORM_NAMES[m.form] ?? ''
        const med: Seg[] = [{ t: m.name.trim() }]
        if (type) med.push({ t: ` (${type})`, b: true })
        if (m.generic.trim()) med.push({ t: ` ${m.generic.trim()}` })
        const instructions = [m.timing && m.timing !== 'Any time' ? m.timing : '', m.instructions.trim()].filter(Boolean).join('. ')
        return { med, dose: m.dose, freq: m.frequency ? frequencyWords(m.frequency) : '', duration: m.duration, instructions }
      })
    : legacy.map((line) => ({ med: [{ t: line }], dose: '', freq: '', duration: '', instructions: '' }))

  if (tableRows.length) {
    const cols = [
      { title: '#', w: 0.05, align: 'center' as const },
      { title: 'Medicine', w: 0.34, align: 'left' as const },
      { title: 'Dose', w: 0.1, align: 'center' as const },
      { title: 'Frequency', w: 0.18, align: 'center' as const },
      { title: 'Duration', w: 0.1, align: 'center' as const },
      { title: 'Instructions', w: 0.23, align: 'left' as const },
    ].map((c) => ({ ...c, px: c.w * W }))
    const head = () => {
      const h = 24
      let x = M
      for (const c of cols) {
        page.drawRectangle({ x, y: y - h, width: c.px, height: h, color: HEAD, borderColor: BLUE, borderWidth: 0.9 })
        // Headings are centred over every column, as on the printed pad.
        text(c.title, x + (c.px - fonts.bold.widthOfTextAtSize(c.title, 9.5)) / 2, y - 15.5, 9.5, { bold: true })
        x += c.px
      }
      y -= h
    }
    head()
    tableRows.forEach((r, i) => {
      const size = 9
      const cells: Seg[][][] = [
        [[{ t: String(i + 1) }]],
        richWrap(r.med, fonts, size, cols[1].px - 14),
        ...[r.dose, r.freq, r.duration, r.instructions].map((v, k) => wrap(safe(v) || '—', fonts.regular, size, cols[k + 2].px - 12).map((l) => [{ t: l }])),
      ]
      const lines = Math.max(...cells.map((c) => c.length))
      const h = Math.max(24, lines * 11.5 + 12)
      if (y - h < FOOTER + 14) {
        newPage()
        head()
      }
      let x = M
      cells.forEach((cellLines, c) => {
        const col = cols[c]
        page.drawRectangle({ x, y: y - h, width: col.px, height: h, borderColor: BLUE, borderWidth: 0.9 })
        const blockTop = y - (h - cellLines.length * 11.5) / 2 - 9
        cellLines.forEach((line, j) => {
          const lw = line.reduce((sum, s) => sum + (s.b ? fonts.bold : fonts.regular).widthOfTextAtSize(s.t, size), 0)
          const lx = col.align === 'center' ? x + (col.px - lw) / 2 : x + 7
          drawSegs(line, lx, blockTop - j * 11.5, size)
        })
        x += col.px
      })
      y -= h
    })
    y -= 18
  }

  const LINE = 12.8
  const heading = (title: string) => {
    ensure(30)
    text(`${title.toUpperCase()}:`, M, y, 9.5, { bold: true })
    y -= 14.5
  }
  const paragraph = (segs: Seg[], size = 9.8, color: RGB = INK, indent = 0) => {
    for (const line of richWrap(segs, fonts, size, W - indent)) {
      ensure(LINE + 1)
      drawSegs(line, M + indent, y, size, color)
      y -= LINE
    }
  }
  const bulletList = (items: string[], size = 9.8) => {
    for (const item of items) {
      const lines = richWrap([{ t: item }], fonts, size, W - 18)
      ensure(lines.length * LINE + 1)
      page.drawCircle({ x: M + 6, y: y + 3.3, size: 1.6, color: INK })
      lines.forEach((l, j) => drawSegs(l, M + 16, y - j * LINE, size))
      y -= lines.length * LINE + 1.5
    }
  }
  const gap = () => (y -= 8)

  /** The barcode of the prescription number, bottom right, with the number spaced out beneath it. */
  const barW = 168
  const spaced = doc.number.split('').join(' ')
  const barcode = () => {
    drawBarcode(page, doc.number, PAGE[0] - M - barW, FOOTER + 16, barW, 34, INK)
    page.drawText(spaced, { x: PAGE[0] - M - barW / 2 - fonts.regular.widthOfTextAtSize(spaced, 7.5) / 2, y: FOOTER + 5, size: 7.5, font: fonts.regular, color: INK })
  }

  // Symptoms
  const symptoms = listItems(doc.complaints)
  if (symptoms.length) {
    heading('Symptoms')
    for (const s of symptoms) paragraph(symptomSegs(s))
    gap()
  }
  if (safe(doc.diagnosis)) {
    heading('Diagnosis')
    paragraph([{ t: doc.diagnosis! }])
    gap()
  }
  if (safe(doc.findings)) {
    heading('Clinical findings')
    paragraph([{ t: doc.findings! }])
    gap()
  }

  // Vital observation
  const vitals: [string, string | null][] = [
    ['Blood Pressure', doc.vitals.bp ? (/^\d+\/\d+$/.test(doc.vitals.bp.trim()) ? `${doc.vitals.bp.trim()} mmHg` : doc.vitals.bp) : null],
    ['Heart Rate', doc.vitals.hr ? showHR(doc.vitals.hr.trim()) : null],
    ['Respiratory Rate', doc.vitals.rr ? showRR(doc.vitals.rr.trim()) : null],
    ['Body Temperature', doc.vitals.temp ? showTemp(doc.vitals.temp.trim()) : null],
  ]
  if (vitals.some(([, v]) => v)) {
    heading('Vital observation')
    for (const [label, value] of vitals) if (value) paragraph([{ t: label, b: true }, { t: `: ${value}` }])
    gap()
  }

  if (safe(doc.allergy)) {
    heading('Allergies')
    paragraph([{ t: doc.allergy!, b: true }], 10, RED)
    gap()
  }
  if (doc.investigations.length) {
    heading('Tests advised')
    bulletList(doc.investigations)
    gap()
  }

  heading('Notes')
  bulletList([...doc.advice, ...STANDARD_NOTES])
  gap()

  if (safe(doc.referral)) {
    heading('Referral')
    paragraph([{ t: doc.referral! }])
    gap()
  }

  heading('Followup')
  const review: Seg[] = doc.followUp
    ? [
        { t: 'Next review with your doctor: ', b: true },
        { t: `${new Date(`${doc.followUp}T12:00:00+05:30`).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' })}. ` },
      ]
    : []
  paragraph([...review, ...FOLLOW_UP_TEXT])

  // Signature and barcode, at the foot of the last prescription page. The last line of text (its baseline is
  // y + LINE) has to clear the top of the block, which is the signature image when there is one.
  const lineY = FOOTER + 24
  const sigScale = signature ? Math.min(170 / signature.width, 40 / signature.height) : 0
  const blockTop = signature ? lineY + 3 + signature.height * sigScale : SIGN_TOP
  if (y + LINE - 4 < blockTop + 4) newPage()
  if (signature) {
    page.drawImage(signature, { x: M + 6, y: lineY + 3, width: signature.width * sigScale, height: signature.height * sigScale })
  } else {
    // Without an uploaded signature, the doctor's name stands in for it.
    text(`${doc.doctor.name} (issued electronically)`, M, lineY + 6, 8.5, { color: C.muted })
  }
  page.drawLine({ start: { x: M, y: lineY }, end: { x: M + 200, y: lineY }, thickness: 1.2, color: INK })
  text('Doctor’s signature and stamp', M, lineY - 12, 9)
  barcode()

  // Terms and usage
  newPage(true)
  text('Terms and conditions', M, y, 13.5, { bold: true })
  y -= 20
  TERMS.forEach((t, i) => {
    const lines = wrap(t, fonts.regular, 10, W - 18)
    text(`${i + 1}.`, M + 4, y, 10)
    lines.forEach((l, j) => text(l, M + 18, y - j * 14, 10))
    y -= lines.length * 14 + 2.5
  })
  y -= 12
  {
    const lines = richWrap(AI_CHECKING, fonts, 10, W - 26)
    const h = lines.length * 14.5 + 18
    page.drawRectangle({ x: M, y: y - h + 10, width: W, height: h, color: BOX, borderColor: BLUE, borderWidth: 0.9 })
    lines.forEach((l, j) => drawSegs(l, M + 13, y - 6 - j * 14.5, 10))
    y -= h + 22
  }
  text('How to use your medicines', M, y, 13.5, { bold: true })
  y -= 20
  bulletList(USAGE)
  y -= 16
  text('Disclaimer', M, y, 13.5, { bold: true })
  y -= 20
  paragraph([{ t: DISCLAIMER }], 10)
  barcode()

  // Footer on every page
  pages.forEach(({ page: p, terms }, i) => {
    p.drawLine({ start: { x: M, y: FOOTER - 4 }, end: { x: PAGE[0] - M, y: FOOTER - 4 }, thickness: 0.6, color: C.line })
    p.drawText(`Page ${i + 1} of ${pages.length}`, { x: M, y: FOOTER - 18, size: 8.5, font: fonts.bold, color: INK })
    if (!terms) p.drawText(`Prescription No.: ${doc.number}`, { x: M, y: FOOTER - 30, size: 8.5, font: fonts.regular, color: INK })
    const name = safe(doc.doctor.name)
    p.drawText(name, { x: PAGE[0] - M - fonts.bold.widthOfTextAtSize(name, 8.5), y: FOOTER - 18, size: 8.5, font: fonts.bold, color: INK })
    const lines = wrap(clinicOneLine, fonts.regular, 8.5, W - 170)
    const address = lines.length > 1 ? `${lines[0].replace(/[,\s]+$/, '')}…` : (lines[0] ?? '')
    p.drawText(address, { x: PAGE[0] - M - fonts.regular.widthOfTextAtSize(address, 8.5), y: FOOTER - 30, size: 8.5, font: fonts.regular, color: INK })
  })

  return pdf.save()
}
