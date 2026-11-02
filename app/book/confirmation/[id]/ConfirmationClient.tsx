'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { BadgeCheck, Download, LoaderCircle, Printer, Stethoscope } from 'lucide-react'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { RemoteImage } from '@/components/RemoteImage'
import { formatINR } from '@/components/patient/format'
import { startPayuPayment } from '@/lib/payu-client'
import { cardStamp } from '@/lib/booking-card-format'
import type { BookingCard } from '@/lib/booking-card'

// The booking page in the layout of the booking emails (lib/notify/booking-email.ts): a ticket with the visit, its
// token and QR code once paid, the free follow-up, and the order summary of what is paid online and at the venue.

const ink = 'text-[#0B1B3F]'
const muted = 'text-[#5B667A]'
const money = (n: number) => formatINR(n).replace(/^₹([\d,]+)$/, '₹$1.00')
// Links in the booking are absolute (they also go in emails); on the site they stay on this origin.
const local = (href: string) => href.replace(/^https?:\/\/[^/]+/, '') || '/'

function Label({ children }: { children: ReactNode }) {
  return <span className={`block text-[11px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{children}</span>
}

/** The ticket's perforation: a dashed line with a notch on each edge. */
function Perforation() {
  return (
    <div className="relative mx-5 sm:mx-6 border-t-[1.5px] border-dashed border-[#D5DBE6]" aria-hidden="true">
      <span className="absolute -left-[30px] sm:-left-[34px] -top-[11px] w-5 h-5 rounded-full bg-white" />
      <span className="absolute -right-[30px] sm:-right-[34px] -top-[11px] w-5 h-5 rounded-full bg-white" />
    </div>
  )
}

function SummaryRow({ label, value, strong = false }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1 text-[13.5px] ${strong ? `${ink} font-extrabold tracking-[0.02em]` : `${muted} font-medium`}`}>
      <span className="min-w-0">{label}</span>
      <span className="shrink-0 text-right">{value}</span>
    </div>
  )
}

export function ConfirmationClient({
  card,
  qr,
  failureReason,
  pay,
  now,
}: {
  card: BookingCard
  /** The QR code (a data URL) once the booking is paid. */
  qr: string | null
  failureReason: string | null
  /** Present when the viewer is the patient and can pay from here. */
  pay: { payuKey: string; email: string | null; phone: string | null } | null
  now: number
}) {
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const confirmed = card.state === 'confirmed'
  const cancelled = card.state === 'cancelled'
  const isLab = card.kind === 'lab'
  const holdEnded = !!card.holdUntil && Date.parse(card.holdUntil) < now

  const headline = confirmed
    ? isLab ? 'Your lab booking is confirmed!' : 'Your appointment is confirmed!'
    : cancelled ? 'This booking was cancelled' : 'Complete your payment to confirm'
  const headColor = confirmed ? 'text-[#2A4DD0]' : cancelled ? 'text-[#B42318]' : 'text-[#C2410C]'

  const message = confirmed
    ? isLab ? 'Show the QR code at the lab front desk when you arrive.' : 'Show the QR code or token at the hospital front desk when you arrive.'
    : cancelled
      ? 'It was not paid in time, so the slot was released. You can book again.'
      : holdEnded
        ? 'The 30-minute hold on your slot has ended. Pay now to keep it if it is still free.'
        : card.holdUntil
          ? 'Your slot is held for 30 minutes. Pay the booking fee to get your token and QR code.'
          : 'Pay the booking fee to confirm your booking and get your QR code.'

  const startPay = async () => {
    if (!pay) return
    setPaying(true)
    setPayError(null)
    const error = await startPayuPayment({
      txnid: card.id,
      productinfo: isLab ? 'Diagnostic' : 'Consultation',
      firstname: card.patient.name || 'Patient',
      email: (pay.email || '').trim() || 'patient@example.com',
      phone: pay.phone || '9999999999',
      payuKey: pay.payuKey,
    })
    // On success the page navigates to PayU; an error means it never left.
    if (error) {
      setPayError(error)
      setPaying(false)
    }
  }

  const button = 'h-[50px] w-full max-w-[280px] mx-auto rounded-xl bg-[#2A4DD0] hover:bg-[#2443B8] text-white text-[15px] font-extrabold flex items-center justify-center gap-2 transition-colors disabled:opacity-70'
  const action = confirmed ? (
    <Link href={local(card.links.appointment)} className={button}>{isLab ? 'Open booking' : 'Open appointment'}</Link>
  ) : cancelled ? (
    card.links.bookAgain ? <Link href={local(card.links.bookAgain)} className={button}>Book again</Link> : null
  ) : pay ? (
    <button type="button" onClick={startPay} disabled={paying} className={button}>
      {paying && <LoaderCircle className="w-4 h-4 animate-spin" />} Pay {formatINR(card.amount)} now
    </button>
  ) : (
    <Link href={local(card.links.checkout)} className={button}>Pay {formatINR(card.amount)} now</Link>
  )

  const qrBox = confirmed && qr ? (
    <div className="flex flex-col items-center gap-1.5">
      <div className="p-1.5 rounded-xl bg-white border border-[#D5DBE6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Booking QR code" className="w-[96px] h-[96px]" />
      </div>
      <span className={`text-[11px] font-bold ${muted}`}>Scan at desk</span>
    </div>
  ) : (
    <div className={`w-[104px] h-[104px] rounded-xl bg-white border border-[#D5DBE6] flex items-center justify-center text-center px-2 text-[11px] font-bold leading-[1.35] ${muted}`}>
      {cancelled ? 'No QR code for a cancelled booking' : 'QR code appears after payment'}
    </div>
  )

  const patientLine = [card.patient.name, card.patient.ageSex].filter(Boolean).join(' · ')
  const fact = (label: string, value: string, tone = ink) => (
    <div className="min-w-0">
      <span className={`block text-[12.5px] ${muted}`}>{label}</span>
      <span className={`block mt-0.5 text-[14px] font-extrabold ${tone} break-words`}>{value}</span>
    </div>
  )

  return (
    <div className="bg-[#EEF2F7] min-h-screen antialiased font-(family-name:--font-manrope)">
      <div className="print:hidden">
        <PatientNavHeader
          isSignedIn={!!pay || confirmed}
          name={card.patient.name}
          backHref="/patient/appointments"
          container="max-w-[1080px] px-margin-x-mobile lg:px-margin-x-desktop"
          eyebrow={isLab ? 'Lab booking' : 'Appointment'}
          title={confirmed ? 'Booking confirmed' : cancelled ? 'Booking cancelled' : 'Awaiting payment'}
          subtitle={[card.title, card.when].filter(Boolean).join(' • ')}
        />
      </div>

      {/* Phones: room under the card for the tab bar and the assistant's round button above it. */}
      <main className="px-3 sm:px-6 pt-5 md:pt-8 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-16">
        <article className="max-w-[640px] mx-auto bg-white rounded-[14px] border border-[#E3E8F0] px-4 sm:px-7 py-7 print:border-none">
          <header className="text-center">
            <div className="flex items-center justify-center gap-2.5">
              <Stethoscope className="w-8 h-8 text-[#2A4DD0]" strokeWidth={2.2} aria-hidden="true" />
              <span className={`text-[22px] font-extrabold tracking-[-0.01em] ${ink}`}>Consult your Doctor</span>
            </div>
            <h1 className={`mt-5 text-[21px] sm:text-[22px] font-extrabold ${headColor}`}>{headline}</h1>
            <p className={`mt-1.5 text-[14px] ${muted}`}>
              Booking ID <b className={`font-extrabold ${ink}`}>{card.code}</b>
            </p>
          </header>

          {/* The ticket */}
          <section className="mt-6 rounded-2xl bg-[#F5F7FB]">
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4">
              <div className="flex gap-4 flex-1 min-w-0">
                <div className="relative w-[72px] h-[96px] sm:w-[84px] sm:h-[112px] rounded-[10px] overflow-hidden bg-[#E3E9F4] shrink-0">
                  {card.image && <RemoteImage src={card.image} alt="" fill sizes="84px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-[17px] font-extrabold break-words ${ink}`}>
                    {card.title}
                    {card.verified && <BadgeCheck className="inline-block ml-1.5 align-[-3px] w-[18px] h-[18px] fill-[#1D9BF0] text-white" aria-label="Verified doctor" />}
                  </p>
                  <p className="mt-0.5 text-[13.5px] font-bold text-[#2A4DD0]">{card.subtitle}</p>
                  {card.when && <p className={`mt-2 text-[14px] font-extrabold ${ink}`}>{card.when}</p>}
                  <p className={`mt-1.5 text-[13px] leading-[1.5] ${muted}`}>
                    {[card.place, ...card.placeLines].map((line, i) => (
                      <span key={i} className="block">{line}</span>
                    ))}
                  </p>
                  <p className={`mt-2 text-[13.5px] font-extrabold ${ink}`}>{card.typeLabel}</p>
                </div>
              </div>
              <div className="self-center sm:self-start shrink-0">{qrBox}</div>
            </div>

            <Perforation />
            <div className="px-5 sm:px-6 py-4 flex items-center gap-5 sm:gap-10 [&_span]:whitespace-nowrap">
              {isLab ? (
                <>
                  <div>
                    <Label>Visit on</Label>
                    <span className={`block mt-1 text-[15px] font-extrabold ${ink}`}>{card.when ?? 'To be confirmed'}</span>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <span className={`block mt-1 text-[15px] font-extrabold ${confirmed ? 'text-[#2A4DD0]' : 'text-[#C2410C]'}`}>{confirmed ? 'Booked' : cancelled ? 'Cancelled' : 'Payment pending'}</span>
                  </div>
                </>
              ) : (
                <>
                  {confirmed ? (
                    <div>
                      <Label>Token</Label>
                      <span className="block text-[30px] leading-[1.15] font-extrabold text-[#2A4DD0]">{card.token}</span>
                    </div>
                  ) : (
                    <div>
                      <Label>Status</Label>
                      <span className={`block mt-1 text-[15px] font-extrabold ${cancelled ? 'text-[#B42318]' : 'text-[#C2410C]'}`}>{cancelled ? 'Cancelled' : 'Payment pending'}</span>
                    </div>
                  )}
                  <div>
                    <Label>Report by</Label>
                    <span className={`block mt-1 text-[15px] font-extrabold ${ink}`}>{card.reportBy ?? '-'}</span>
                  </div>
                </>
              )}
              {confirmed && (
                <div className="ml-auto -rotate-[8deg] rounded-lg border-2 border-[#2A4DD0] px-2 sm:px-2.5 py-1 text-center text-[#2A4DD0] shrink-0 max-[379px]:hidden" aria-label="Booking confirmed">
                  <span className="block text-[7px] sm:text-[8.5px] font-extrabold tracking-[0.1em] sm:tracking-[0.12em]">★ CONSULT YOUR DOCTOR ★</span>
                  <span className="block text-[11px] sm:text-[13px] font-extrabold leading-[1.15] tracking-[0.04em]">BOOKING<br />CONFIRMED</span>
                </div>
              )}
            </div>
            <Perforation />

            <div className="px-5 sm:px-6 pt-4 pb-6 text-center">
              {failureReason && (
                <p role="alert" className="mb-3.5 p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-left text-[13px] leading-[1.45] text-[#B42318]">
                  <b>Your last payment didn&apos;t go through.</b> {failureReason} No money was taken for it; you can try again.
                </p>
              )}
              <p className={`max-w-[400px] mx-auto text-[14px] leading-[1.55] ${muted}`}>{message}</p>
              {payError && <p role="alert" className="mt-2.5 text-[13px] font-bold text-[#B42318]">{payError}</p>}
              <div className="mt-4 print:hidden">{action}</div>
            </div>
          </section>

          {card.followUp && (
            <section className="mt-3 rounded-2xl bg-[#2A4DD0] text-white px-5 sm:px-6 py-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] font-extrabold">Free follow-up for {card.followUp.days} days</h2>
                <p className="mt-1 text-[13.5px] leading-[1.5] text-[#E6ECFF]">
                  Need to see {card.followUp.doctor} again about the same problem? Book a follow-up in the app within {card.followUp.days} days at no booking fee.
                </p>
              </div>
              <Stethoscope className="w-14 h-14 shrink-0 text-white" strokeWidth={1.8} aria-hidden="true" />
            </section>
          )}

          <p className="mt-3 rounded-xl bg-[#F5F7FB] px-5 py-3.5 text-center text-[13px] leading-[1.5] text-[#3F4A5E]">
            <b className={ink}>Note:</b>{' '}
            {isLab
              ? 'Please carry a photo ID and your doctor’s prescription if you have one. The test charges are paid at the lab. In an emergency, call 108.'
              : card.venueTitle === 'PAID AT HOSPITAL'
                ? 'Please carry a photo ID and any previous reports. In an emergency, call 108.'
                : 'Please carry a photo ID and any previous reports. The consultation fee is paid at the hospital counter. In an emergency, call 108.'}
          </p>

          <h2 className={`mt-7 text-[12px] font-extrabold tracking-[0.08em] ${muted}`}>ORDER SUMMARY</h2>
          <section className="mt-2 rounded-xl border border-[#E3E8F0] overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <SummaryRow strong label={card.isFollowUp ? 'BOOKING FEE (FREE FOLLOW-UP)' : 'BOOKING FEE'} value={money(card.bookingFee)} />
              {card.bookingFeeLines.map((l) => (
                <SummaryRow key={l.label} label={l.label} value={l.value} />
              ))}
              {card.convenienceFee > 0 && <SummaryRow strong label="PAYMENT CONVENIENCE FEE" value={money(card.convenienceFee)} />}
            </div>
            {card.venueTotal != null && (
              <div className="mx-5 pt-2 pb-3 border-t border-dashed border-[#E3E8F0]">
                <div className="pt-1.5">
                  <SummaryRow strong label={card.venueTitle} value={money(card.venueTotal)} />
                </div>
                {card.venueItems.length > 1 ? (
                  <>
                    {card.venueItems.map((i) => (
                      <SummaryRow key={i.label} label={i.label} value={i.amount != null ? money(i.amount) : '-'} />
                    ))}
                    <SummaryRow label="Paid at" value={card.venueNote} />
                  </>
                ) : (
                  <SummaryRow label={card.venueItems[0]?.label ?? 'Consultation fee'} value={card.venueNote} />
                )}
              </div>
            )}
            <div className="bg-[#EDF1F8] px-5 py-3.5 flex justify-between gap-4 text-[15px] font-extrabold text-[#0B1B3F]">
              <span>{card.amountLabel}</span>
              <span>{money(card.amount)}</span>
            </div>
            {/* The receipt's torn edge */}
            <div
              aria-hidden="true"
              className="h-2"
              style={{ background: 'radial-gradient(circle at 6px 8px, #ffffff 4px, #EDF1F8 4.5px) repeat-x', backgroundSize: '12px 8px' }}
            />
          </section>

          <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
            {confirmed ? (
              <>
                {fact('Booking date & time', cardStamp(card.bookedAt))}
                {fact('Payment type', card.paymentType ?? (card.isFollowUp ? 'Free follow-up' : 'Online'))}
                {fact('Transaction ID', card.transactionId ?? card.code)}
                {fact('Patient', patientLine)}
              </>
            ) : (
              <>
                {card.holdUntil && !cancelled ? fact('Slot held until', cardStamp(card.holdUntil), 'text-[#C2410C]') : fact('Booked on', cardStamp(card.bookedAt))}
                {fact('Patient', patientLine)}
              </>
            )}
          </section>

          <nav className="mt-5 pt-4 border-t border-[#EEF1F6] flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13.5px] font-extrabold text-[#2A4DD0] print:hidden">
            {card.links.directions && (
              <a href={card.links.directions} target="_blank" rel="noreferrer" className="hover:underline">
                Get directions
              </a>
            )}
            <Link href={local(card.links.support)} className="hover:underline">Reschedule</Link>
            <Link href={local(card.links.support)} className="hover:underline">Help &amp; Support</Link>
          </nav>
          <p className="mt-3 text-center text-[11.5px] leading-[1.6] text-[#8A94A6]">
            This is a booking confirmation, not a medical record or prescription.
            <br />
            Consult your Doctor · Zebrold Private Limited · Hyderabad
          </p>
        </article>

        <div className="max-w-[640px] mx-auto mt-4 flex justify-center gap-3 print:hidden">
          {confirmed && (
            <a href={`/api/booking/${card.id}/slip`} target="_blank" rel="noopener noreferrer" className="h-11 px-4 rounded-xl bg-white border border-[#D6DDE8] text-[13.5px] font-extrabold text-[#27324A] flex items-center gap-2 hover:bg-[#F7F9FC]">
              <Download className="w-4 h-4 text-[#2A4DD0]" /> Download slip
            </a>
          )}
          <button type="button" onClick={() => window.print()} className="h-11 px-4 rounded-xl bg-white border border-[#D6DDE8] text-[13.5px] font-extrabold text-[#27324A] flex items-center gap-2 hover:bg-[#F7F9FC]">
            <Printer className="w-4 h-4 text-[#5B667A]" /> Print
          </button>
        </div>
      </main>

      <div className="print:hidden">
        <PatientDock activeTab="book" name={card.patient.name} />
      </div>
    </div>
  )
}
