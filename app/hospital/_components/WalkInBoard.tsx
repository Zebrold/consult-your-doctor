'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Copy, Download, Footprints, LoaderCircle, Printer, QrCode } from 'lucide-react'
import { saveWalkInHours } from '@/app/actions/walk-in'
import { DAY_SHORT, WEEK_ORDER, formatClock, hoursLabel, isClockTime, toMinutes, type WalkInHours, type WalkInState } from '@/lib/walk-in'
import { HosBody, HosHeader, Panel, PanelHead, btnOutline, btnPrimary } from './hos-ui'

// Walk-in & QR: the hours the hospital takes walk-ins, and the hospital's own QR code. Patients scan it at reception,
// pick a doctor and "Walk in now", log in with their mobile number and pay the booking fee in the app; the visit is
// booked for that moment and shows in Patients like any booking (lib/walk-in.ts).

const input =
  'block w-full h-[46px] px-3.5 rounded-xl border border-[#D6DDE8] bg-white text-[15px] text-[#0B1B3F] outline-none focus:border-[#2A4DD0] focus:ring-2 focus:ring-[#2A4DD0]/15 disabled:opacity-60'
const label = 'block mb-1.5 text-[13px] font-extrabold text-[#27324A]'

const fileName = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hospital'}-walk-in-qr.png`

// Printing shows only the poster: everything else on the page is hidden while it prints.
const PRINT_CSS = `@media print {
  @page { size: A4; margin: 14mm; }
  body * { visibility: hidden !important; }
  #walk-in-poster, #walk-in-poster * { visibility: visible !important; }
  #walk-in-poster { position: fixed; inset: 0; }
}`

type Props = {
  hospitalName: string
  staff: { name: string }
  /** The walk-in columns exist (20261122_hospital_walk_in.sql has run). */
  ready: boolean
  saved: WalkInHours
  state: WalkInState | null
  /** What the QR code opens. */
  link: string
  /** The QR code as a PNG data address. */
  qr: string
}

export function WalkInBoard({ hospitalName, staff, ready, saved, state, link, qr }: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(saved.enabled)
  const [start, setStart] = useState(saved.start)
  const [end, setEnd] = useState(saved.end)
  const [days, setDays] = useState<number[]>(saved.days)
  const [pending, startSave] = useTransition()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  const valid = isClockTime(start) && isClockTime(end) && toMinutes(end) > toMinutes(start)
  const draft: WalkInHours = { enabled, start, end, days }

  const save = () => {
    setError('')
    setDone(false)
    startSave(async () => {
      const res = await saveWalkInHours({ enabled, start, end, days })
      if (!res.ok) return setError(res.error)
      setDone(true)
      router.refresh()
    })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const status = !saved.enabled ? { text: 'Walk-ins are off', tone: 'bg-[#F4F6FA] text-[#5B667A]' } : state?.open ? { text: `Taking walk-ins now · ${state.note.replace(/^Open now /, '')}`, tone: 'bg-[#ECFDF3] text-[#067647]' } : { text: state?.note ?? 'Walk-ins are off', tone: 'bg-[#FFFAEB] text-[#B54708]' }

  return (
    <>
      <style>{PRINT_CSS}</style>
      <HosHeader staff={staff} back={{ href: '/hospital/more', label: 'More' }} title="Walk-in & QR" subtitle="Patients scan your QR code to book a walk-in." />

      <HosBody>
        <div className="hidden lg:block mb-[22px]">
          <Link href="/hospital/more" className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Account &amp; settings
          </Link>
          <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em] leading-tight">Walk-in &amp; QR</h1>
          <p className="mt-1 text-[14px] text-[#5B667A]">Set the hours {hospitalName} takes walk-ins, and put your QR code at reception for patients to scan.</p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px] gap-3.5 lg:gap-5 lg:items-start">
          <Panel>
            <PanelHead
              title="Walk-in hours"
              sub="India time. During these hours patients who scan your code can book Walk in now with a doctor."
              right={<span className={`shrink-0 px-2.5 py-1 rounded-full text-[12px] font-extrabold ${status.tone}`}>{status.text}</span>}
            />
            {!ready && (
              <p className="mb-4 p-3.5 rounded-xl bg-[#FFFAEB] text-[13px] font-bold text-[#B54708]">
                Walk-in booking starts once supabase/migrations/20261122_hospital_walk_in.sql has run. Until then the QR code opens your hospital page, where patients book a time.
              </p>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={!ready}
              onClick={() => setEnabled((v) => !v)}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0] text-left disabled:opacity-60"
            >
              <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-[#2A4DD0] text-white' : 'bg-white text-[#5B667A] shadow-[inset_0_0_0_1px_#E6EAF0]'}`}>
                <Footprints className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14.5px] font-extrabold">Take walk-in bookings</span>
                <span className="block text-[12.5px] text-[#5B667A]">{enabled ? 'Patients can book Walk in now during the hours below.' : 'Off: the QR code still opens your page for booking a time.'}</span>
              </span>
              <span className={`relative shrink-0 w-11 h-[26px] rounded-full transition-colors ${enabled ? 'bg-[#2A4DD0]' : 'bg-[#C9D2E0]'}`}>
                <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[18px]' : ''}`} />
              </span>
            </button>

            <div className="mt-[18px] grid grid-cols-2 gap-3.5">
              <label className="block">
                <span className={label}>From</span>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} disabled={!ready} className={input} />
              </label>
              <label className="block">
                <span className={label}>To</span>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} disabled={!ready} className={input} />
              </label>
            </div>
            {!valid && <p className="mt-1.5 text-[12.5px] font-bold text-[#B42318]">The end time must be after the start time, on the same day.</p>}

            <fieldset className="mt-[18px]" disabled={!ready}>
              <legend className={label}>Days</legend>
              <div className="flex flex-wrap gap-2">
                {WEEK_ORDER.map((d) => {
                  const on = days.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDays((list) => (on ? list.filter((x) => x !== d) : [...list, d]))}
                      className={`min-w-[52px] h-10 px-3 rounded-[10px] border-[1.5px] text-[13px] font-extrabold transition-colors disabled:opacity-60 ${
                        on ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9BCEF]'
                      }`}
                    >
                      {DAY_SHORT[d]}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {valid && days.length > 0 && (
              <p className="mt-4 text-[13px] text-[#5B667A]">
                Patients will see: <b className="text-[#27324A]">{enabled ? `Walk-ins ${hoursLabel(draft)}` : 'no walk-ins'}</b>
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
                {error}
              </p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={save} disabled={!ready || pending || !valid || (enabled && !days.length)} className={`${btnPrimary} disabled:opacity-60`}>
                {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null} Save walk-in hours
              </button>
              {done && !pending && (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#067647]">
                  <Check className="w-4 h-4" strokeWidth={3} /> Saved
                </span>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-[#EEF2F7]">
              <h3 className="text-[14.5px] font-extrabold">How a walk-in works</h3>
              <ol className="mt-2.5 flex flex-col gap-2 text-[13px] leading-relaxed text-[#4A5878] list-decimal pl-5">
                <li>The patient scans your QR code at reception or the entrance.</li>
                <li>They pick a doctor and choose Walk in now (or a later time).</li>
                <li>They log in with their mobile number and pay the booking fee in the app.</li>
                <li>The visit is booked for that moment and shows in Patients. Check them in at the desk and take the consultation fee as usual.</li>
              </ol>
              <p className="mt-3 text-[12.5px] text-[#5B667A]">Doctors who are paused, on leave today or have no consultation fee set can’t be picked. Walk-ins you book at the desk still use Add walk-in patient.</p>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Your walk-in QR code" sub="Only for your hospital. It opens your hospital page with Walk in now ready." />
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR code for walk-ins at ${hospitalName}`} width={240} height={240} className="w-[240px] h-[240px] rounded-2xl shadow-[0_0_0_1px_#E6EAF0]" />
              <p className="mt-3 text-[15px] font-extrabold text-center">{hospitalName}</p>
              <p className="text-[12.5px] text-[#5B667A] text-center">{saved.enabled ? `Walk-ins ${hoursLabel(saved)}` : 'Walk-ins are off'}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 p-1.5 pl-3.5 rounded-xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]">
              <span className="flex-1 min-w-0 text-[12.5px] font-bold text-[#27324A] truncate">{link}</span>
              <button type="button" onClick={copy} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] bg-white text-[12.5px] font-extrabold text-[#2A4DD0] shadow-[0_0_0_1px_#E1E7F0] hover:bg-[#EEF3FF]">
                {copied ? <Check className="w-4 h-4" strokeWidth={3} /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <a href={qr} download={fileName(hospitalName)} className={`${btnOutline} w-full`}>
                <Download className="w-4 h-4" /> Download
              </a>
              <button type="button" onClick={() => window.print()} className={`${btnPrimary} w-full`}>
                <Printer className="w-4 h-4" /> Print poster
              </button>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-normal text-[#5B667A]">
              <QrCode className="w-4 h-4 shrink-0 mt-px" /> Put it where patients wait. The same code keeps working when you change your hours.
            </p>
          </Panel>
        </div>
      </HosBody>

      {/* What Print poster prints: an A4 sign for reception. */}
      <div id="walk-in-poster" aria-hidden className="hidden print:flex flex-col items-center justify-center text-center bg-white text-[#0B1B3F] font-(family-name:--font-manrope)">
        <p className="text-[22px] font-extrabold text-[#2A4DD0]">Consult your Doctor</p>
        <p className="mt-8 text-[40px] font-extrabold leading-tight">{hospitalName}</p>
        <p className="mt-3 text-[28px] font-extrabold">Scan to book a walk-in</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="" className="mt-8 w-[95mm] h-[95mm]" />
        <p className="mt-8 text-[20px] font-bold">{saved.enabled ? `Walk-ins ${formatClock(saved.start)} – ${formatClock(saved.end)}` : 'Book a doctor here'}</p>
        {saved.enabled && saved.days.length < 7 && <p className="mt-1 text-[18px] text-[#4A5878]">{hoursLabel(saved).split(' · ')[1]}</p>}
        <p className="mt-6 max-w-[150mm] text-[16px] leading-relaxed text-[#4A5878]">Open your phone camera, scan the code, pick a doctor and choose Walk in now. Log in with your mobile number and pay the booking fee in the app.</p>
      </div>
    </>
  )
}
