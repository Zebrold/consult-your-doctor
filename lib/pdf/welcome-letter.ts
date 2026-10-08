import { PDFDocument, rgb, type PDFPage, type RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { PAGE, drawLogo, loadAssets, richWrap, safe, wrap, type Fonts, type Seg } from './clinical'

// The welcome letter a new partner (doctor, hospital or diagnostic centre) receives with their login: page 1 is the
// welcome, partner details, login credentials, first steps and account security; page 2 is about Consult Your Doctor.

const M = 46
const W = PAGE[0] - M * 2
const FOOTER = 52
const INK = rgb(0.07, 0.07, 0.09)
const RULE = rgb(0.55, 0.57, 0.6)
const BLUE = rgb(0.29, 0.62, 0.84)
const CREDS_BLUE = rgb(0.16, 0.45, 0.8)
const HEAD = rgb(0.85, 0.93, 0.97)
const NOTE_BG = rgb(0.94, 0.97, 0.995)

export type PartnerType = 'doctor' | 'hospital' | 'diagnostic'

export type WelcomeLetter = {
  type: PartnerType
  /** Who the letter is addressed to: "Dr. Ananya Rao", "Sunrise Hospital", … */
  name: string
  registration: string | null
  services: string | null
  address: string | null
  contact: string | null
  partnerId: string
  /** When the account was created. The letter itself is dated today. */
  onboardedAt: Date
  loginUrl: string
  username: string
  password: string
}

const ABOUT: Seg[][] = [
  [{ t: 'Consult Your Doctor is an AI-assisted online healthcare platform that connects patients with licensed doctors, hospitals and diagnostic centres, making quality medical care simple to reach.' }],
  [{ t: 'Our AI takes care of everything around the consultation, from the first booking to the final follow-up, so that you can spend your time on your patients and not on paperwork.' }],
  [{ t: 'The company pays doctors starting from 6000 per month,', b: true }, { t: ' and your payment is based on your monthly bookings, so the more patients you see, the more you earn.' }],
  [{ t: 'Our system tracks your bookings automatically and gives you a clear monthly statement of your bookings and earnings, so you always know how your payment was calculated.' }],
  [{ t: 'We are the first AI-assisted doctor follow-up service,', b: true }, { t: ' and we care for every patient for 12 days after their consultation is completed.' }],
  [{ t: 'During those 12 days, our Zebrold AI checks in with the patient regularly and asks how they are recovering, so no patient is left without support.' }],
  [{ t: 'The AI reminds patients to take their medicines on time and as prescribed, which helps them complete their treatment properly.' }],
  [{ t: 'If a patient reports worsening symptoms or a warning sign, the AI alerts you straight away so that you can step in and act without delay.' }],
  [{ t: 'You receive a short progress summary for each patient, so you do not need to make extra calls or send extra messages yourself.' }],
  [{ t: 'Our AI handles patient registration and appointment booking, and it matches each patient to the right doctor for their needs.' }],
  [{ t: 'It manages your availability calendar, sends patients a reminder before every consultation, and shares a secure consultation link so that every visit starts on time.' }],
  [{ t: 'Before the visit, it collects the patient’s symptoms and history and prepares a clear summary for you, so your consultation time is used well.' }],
  [{ t: 'It checks every prescription for dose errors, duplicate medicines, interactions and listed allergies, and it flags anything that needs your attention.' }],
  [{ t: 'It produces the digital prescription in our professional format and sends it to the patient together with clear instructions.' }],
  [{ t: 'It refers patients to our partner diagnostic centres when tests are needed, and it shares the test results with you as soon as they are ready.' }],
  [{ t: 'It answers routine patient questions, so you and your team are not interrupted by simple queries during the day.' }],
  [{ t: 'It alerts you to urgent patient cases the moment they appear, so that serious situations are never missed.' }],
  [{ t: 'It takes care of rescheduling and missed appointments, and it collects patient feedback and ratings after each consultation so you can see how patients feel about your care.' }],
  [{ t: 'It looks after billing and payments and keeps all consultation records neatly in order, so your administration is always up to date.' }],
  [{ t: 'It keeps patient data secure and private, and shares it only for care or where the law requires.' }],
  [{ t: 'You stay in charge of care.', b: true }, { t: ' Our AI handles administration, checking and follow-up, but it does not diagnose or prescribe. You make every medical decision and approve every prescription.' }],
  [{ t: 'Contact us', b: true }, { t: ' at Bockenheimer Landstrasse 17-19, Frankfurt am Main, 60325, Germany, by email at info@zebrold.de, or on our website at www.consultyourdoctor.de.' }],
]

const GETTING_STARTED = [
  'Sign in with the username and temporary password above, then set a new password.',
  'Complete your profile and upload your licence and registration documents.',
  'Set your availability and consultation fees.',
  'Check your prescription template, including your name, registration number and signature.',
  'Start receiving patients. After each consultation, our Zebrold AI looks after the patient’s follow-up for 12 days.',
]

const SECURITY = [
  'Choose a strong new password that you do not use anywhere else.',
  'Never share your username or password with colleagues, patients or anyone else.',
  'Contact us immediately at info@zebrold.de if you think someone else has seen your login.',
]

export async function renderWelcomeLetter(letter: WelcomeLetter): Promise<Uint8Array> {
  const { regular, bold, logo } = await loadAssets()
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`Welcome to Consult Your Doctor: ${letter.name}`)
  pdf.setAuthor('Consult Your Doctor')
  pdf.setCreator('Consult Your Doctor')
  const fonts: Fonts = { regular: await pdf.embedFont(regular, { subset: true }), bold: await pdf.embedFont(bold, { subset: true }) }
  const logoImage = await pdf.embedPng(logo)

  let page!: PDFPage
  let y = 0
  const text = (s: string, x: number, at: number, size: number, opts: { bold?: boolean; color?: RGB } = {}) =>
    page.drawText(safe(s), { x, y: at, size, font: opts.bold ? fonts.bold : fonts.regular, color: opts.color ?? INK })
  const drawSegs = (line: Seg[], x: number, at: number, size: number) => {
    let cx = x
    for (const s of line) {
      const f = s.b ? fonts.bold : fonts.regular
      page.drawText(s.t, { x: cx, y: at, size, font: f, color: INK })
      cx += f.widthOfTextAtSize(s.t, size)
    }
  }
  const paragraph = (segs: Seg[], size = 9.5, line = 12.6, x = M, width = W) => {
    for (const l of richWrap(segs, fonts, size, width)) {
      drawSegs(l, x, y, size)
      y -= line
    }
  }
  const sectionTitle = (t: string) => {
    text(t, M, y, 10.5, { bold: true })
    y -= 14
  }

  const newPage = (title: string) => {
    page = pdf.addPage(PAGE)
    const scale = 340 / Math.max(logoImage.width, logoImage.height)
    page.drawImage(logoImage, { x: (PAGE[0] - logoImage.width * scale) / 2, y: PAGE[1] / 2 - (logoImage.height * scale) / 2 - 40, width: logoImage.width * scale, height: logoImage.height * scale, opacity: 0.08 })
    const top = PAGE[1] - 40
    drawLogo(page, logoImage, M, top - 34, 34)
    text('Consult Your Doctor', M + 42, top - 22, 17, { bold: true })
    page.drawLine({ start: { x: M, y: top - 46 }, end: { x: PAGE[0] - M, y: top - 46 }, thickness: 1, color: RULE })
    y = top - 74
    const tw = fonts.bold.widthOfTextAtSize(title, 15)
    text(title, (PAGE[0] - tw) / 2, y, 15, { bold: true })
    y -= 20
  }

  // Page 1: welcome
  newPage('WELCOME TO CONSULT YOUR DOCTOR')
  const day = (opts: Intl.DateTimeFormatOptions, d = new Date()) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', ...opts })
  text(`Date: ${day({ day: '2-digit' })} / ${day({ month: '2-digit' })} / ${day({ year: 'numeric' })}`, M, y, 9.5)
  y -= 16
  paragraph([{ t: 'Dear ' }, { t: letter.name, b: true }, { t: ',' }])
  y -= 5
  paragraph([
    {
      t: 'We are pleased to welcome you to the Consult Your Doctor network. Your registration has been verified and your account is now active. You can now receive patients, write digital prescriptions and manage consultations through our platform.',
    },
  ])
  y -= 5
  paragraph([
    {
      t: 'Our AI takes care of the work around every consultation, including booking, reminders, prescription checking and follow-up, so you can focus on your patients. The company pays doctors starting from 6000 per month, based on their monthly bookings.',
    },
  ])
  y -= 8

  // Partner details
  sectionTitle('PARTNER DETAILS')
  {
    const labelW = W * 0.32
    const rowH = 16.5
    const rows: [string, string | null][] = [
      ['Partner type', null],
      ['Name', letter.name],
      ['Medical registration / licence no.', letter.registration],
      ['Speciality / services', letter.services],
      ['Address', letter.address],
      ['Contact person, phone and email', letter.contact],
      ['Partner ID', letter.partnerId],
      ['Onboarding date', day({ day: '2-digit', month: 'long', year: 'numeric' }, letter.onboardedAt)],
    ]
    rows.forEach(([label, value], i) => {
      const top = y - i * rowH
      page.drawRectangle({ x: M, y: top - rowH, width: labelW, height: rowH, color: HEAD, borderColor: BLUE, borderWidth: 0.9 })
      page.drawRectangle({ x: M + labelW, y: top - rowH, width: W - labelW, height: rowH, borderColor: BLUE, borderWidth: 0.9 })
      text(label, M + 6, top - 11.5, 8.5, { bold: true })
      if (i === 0) {
        // Tick boxes for the partner type, with this partner's ticked.
        let x = M + labelW + 8
        for (const [key, name] of [['doctor', 'Doctor'], ['hospital', 'Hospital'], ['diagnostic', 'Diagnostic centre']] as const) {
          page.drawRectangle({ x, y: top - 13, width: 8.5, height: 8.5, borderColor: INK, borderWidth: 0.7 })
          if (letter.type === key) {
            page.drawLine({ start: { x: x + 1.6, y: top - 8.8 }, end: { x: x + 3.6, y: top - 11.6 }, thickness: 1.2, color: INK })
            page.drawLine({ start: { x: x + 3.6, y: top - 11.6 }, end: { x: x + 7.2, y: top - 6 }, thickness: 1.2, color: INK })
          }
          text(name, x + 12, top - 12, 8.5)
          x += 12 + fonts.regular.widthOfTextAtSize(name, 8.5) + 12
        }
      } else {
        text(wrap(safe(value) || '—', fonts.regular, 8.5, W - labelW - 12)[0] ?? '—', M + labelW + 7, top - 12, 8.5)
      }
    })
    y -= rows.length * rowH + 14
  }

  // Login credentials
  sectionTitle('YOUR LOGIN CREDENTIALS')
  {
    const note: Seg[] = [
      { t: 'Please note:', b: true },
      { t: ' this password is temporary. You must change it the first time you sign in. Do not share your login with anyone, and do not forward this letter. If you think your login has been seen by someone else, contact us immediately so we can reset it.' },
    ]
    const noteLines = richWrap(note, fonts, 8.5, W - 28)
    const rowH = 17
    const boxH = 10 + 3 * rowH + 8 + noteLines.length * 11 + 8
    page.drawRectangle({ x: M, y: y - boxH, width: W, height: boxH, color: NOTE_BG, borderColor: CREDS_BLUE, borderWidth: 1.4 })
    const inner = M + 10
    const innerW = W - 20
    const labelW = innerW * 0.32
    const rows: [string, string][] = [
      ['Login page', letter.loginUrl],
      ['Username', letter.username],
      ['Temporary password', letter.password],
    ]
    rows.forEach(([label, value], i) => {
      const top = y - 10 - i * rowH
      page.drawRectangle({ x: inner, y: top - rowH, width: labelW, height: rowH, color: HEAD, borderColor: BLUE, borderWidth: 0.8 })
      page.drawRectangle({ x: inner + labelW, y: top - rowH, width: innerW - labelW, height: rowH, color: rgb(1, 1, 1), borderColor: BLUE, borderWidth: 0.8 })
      text(label, inner + 6, top - 12, 8.5, { bold: true })
      text(wrap(value, fonts.bold, 9.5, innerW - labelW - 14)[0] ?? '', inner + labelW + 7, top - 12.5, 9.5, { bold: true })
    })
    let ny = y - 10 - 3 * rowH - 14
    for (const l of noteLines) {
      drawSegs(l, inner + 4, ny, 8.5)
      ny -= 11
    }
    y -= boxH + 14
  }

  sectionTitle('GETTING STARTED')
  GETTING_STARTED.forEach((s, i) => {
    text(`${i + 1}.`, M + 6, y, 9)
    paragraph([{ t: s }], 9, 12, M + 20, W - 20)
  })
  y -= 5

  sectionTitle('KEEPING YOUR ACCOUNT SECURE')
  for (const s of SECURITY) {
    page.drawCircle({ x: M + 26, y: y + 3, size: 1.4, color: INK })
    paragraph([{ t: s }], 9, 12, M + 34, W - 34)
  }
  y -= 5

  sectionTitle('NEED HELP?')
  paragraph([{ t: 'Our partner team is happy to help with your account, your profile or any question about the platform. Write to us at info@zebrold.de and we will reply as soon as possible.' }], 9, 12)
  y -= 4
  paragraph([{ t: 'We look forward to working with you.' }], 9, 12)
  y -= 4
  paragraph([{ t: 'Warm regards,' }], 9, 12)
  paragraph([{ t: 'Partner Onboarding Team', b: true }, { t: ', Consult Your Doctor' }], 9, 12)

  // Page 2: about
  newPage('ABOUT CONSULT YOUR DOCTOR')
  ABOUT.forEach((segs, i) => {
    text(`${i + 1}.`, M + (i < 9 ? 6 : 1), y, 9.2)
    paragraph(segs, 9.2, 12.2, M + 20, W - 20)
    y -= 3
  })

  // Footer on both pages
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: FOOTER }, end: { x: PAGE[0] - M, y: FOOTER }, thickness: 0.6, color: RULE })
    const left = `Page ${i + 1} of ${pages.length}`
    p.drawText(left, { x: M, y: FOOTER - 14, size: 8.5, font: fonts.bold, color: INK })
    p.drawText(`Partner ID: ${letter.partnerId}`, { x: M + fonts.bold.widthOfTextAtSize(left, 8.5) + 8, y: FOOTER - 14, size: 8.5, font: fonts.regular, color: INK })
    const right = 'Consult Your Doctor | www.consultyourdoctor.de'
    p.drawText(right, { x: PAGE[0] - M - fonts.regular.widthOfTextAtSize(right, 8.5), y: FOOTER - 14, size: 8.5, font: fonts.regular, color: INK })
  })

  return pdf.save()
}
