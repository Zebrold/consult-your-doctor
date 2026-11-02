import type { createAdminClient } from '@/lib/supabase/admin'
import { ageFrom, directionsHref, doctorName, visitToken } from '@/components/patient/format'
import { cardDate, cardTime } from '@/lib/booking-card-format'
import { getBookingFees } from '@/lib/booking-fees'
import { bookedServices, bookedTestsFor, isFastTrack, labBookingFee, onlinePayable, sumPrices, type BookingFees } from '@/lib/pricing'
import { appointmentBookingFee } from '@/lib/wallet'
import { FOLLOW_UP_DAYS } from '@/lib/follow-up'
import { siteUrl } from '@/lib/site-url'

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

// Everything the booking page (/book/confirmation/[id]) and the booking emails show about one booking, read once from
// the database so the page and the emails can never disagree. Payment status always comes from the booking itself.

/** How long an unpaid doctor booking holds its slot (app/actions/booking.ts STALE_HOLD_MS). */
export const HOLD_MINUTES = 30

const PAID = ['confirmed', 'visited', 'completed', 'report_sent']

export type CardLine = { label: string; value: string }

export type BookingCard = {
  id: string
  kind: 'consultation' | 'lab'
  /** "4603D60D" */
  code: string
  status: string
  state: 'pending' | 'confirmed' | 'cancelled'
  patientId: string

  title: string
  /** "Cardiology · In-person consultation" */
  subtitle: string
  verified: boolean
  /** "10:30 AM | Mon, 2 Nov, 2026" (a lab booking has the day only). */
  when: string | null
  startsAt: string | null
  place: string
  placeLines: string[]
  image: string | null
  /** "General appointment", "Fast track appointment", "Free follow-up", "Home collection" */
  typeLabel: string

  /** The queue token the hospital desk and the doctor call (consultations only). */
  token: string | null
  /** "10:15 AM": when to be at the desk, 15 minutes before the slot. */
  reportBy: string | null

  /** The free follow-up this visit comes with; null for a follow-up itself and for lab bookings. */
  followUp: { doctor: string; days: number } | null
  isFollowUp: boolean

  /** Order summary: the booking fee (Consult your Doctor's) and what is paid at the hospital or lab. */
  bookingFee: number
  /** The payment convenience fee on the booking fee: due with it while unpaid, or what an online payment included. */
  convenienceFee: number
  bookingFeeLines: CardLine[]
  venueTitle: 'PAY AT HOSPITAL' | 'PAY AT LAB' | 'PAID AT HOSPITAL' | 'PAID AT LAB'
  venueItems: { label: string; amount: number | null }[]
  venueTotal: number | null
  venueNote: string
  /** Pending: the booking fee and convenience fee due now. Confirmed: what has been paid so far. */
  amountLabel: 'AMOUNT DUE NOW' | 'AMOUNT PAID'
  amount: number

  bookedAt: string
  /** When an unpaid doctor booking's slot hold ends. */
  holdUntil: string | null
  paymentType: string | null
  transactionId: string | null

  patient: { name: string; ageSex: string | null; phone: string | null; email: string | null }
  links: { confirmation: string; appointment: string; checkout: string; directions: string | null; support: string; bookAgain: string | null }
}

const MODE_LABEL: Record<string, string> = {
  UPI: 'UPI', CC: 'Credit card', DC: 'Debit card', NB: 'Net banking', WALLET: 'Wallet', EMI: 'EMI', CASH: 'Cash', PAYLATER: 'Pay later',
}

type PaymentRow = { amount: number | string; gateway: string | null; method?: string | null; transaction_id: string | null; platform_share?: number | string | null; created_at: string }

function paymentFacts(payments: PaymentRow[], deskName: string) {
  const online = payments.find((p) => p.gateway === 'payu') ?? null
  const counter = payments.find((p) => p.gateway === 'cash' || p.gateway === 'upi_qr') ?? null
  const shown = online ?? counter
  if (!shown) return { online, counter, paymentType: null, transactionId: null }
  if (shown.gateway === 'payu') {
    const mode = MODE_LABEL[String(shown.method ?? '').toUpperCase()] ?? 'Online'
    const ref = String(shown.transaction_id ?? '')
    return { online, counter, paymentType: `${mode} · PayU`, transactionId: ref ? `PAYU ${ref.replace(/(\d{4})(?=\d)/g, '$1 ')}` : null }
  }
  return {
    online,
    counter,
    paymentType: `${shown.gateway === 'cash' ? 'Cash' : 'UPI'} · ${deskName}`,
    transactionId: shown.transaction_id,
  }
}

function ageSexOf(details: { date_of_birth?: string | null; gender?: string | null } | null, now: number) {
  const age = ageFrom(details?.date_of_birth ?? null, now)
  const sex = details?.gender ? details.gender.charAt(0).toUpperCase() : null
  return [age != null ? String(age) : null, sex].filter(Boolean).join(' ') || null
}

/**
 * The convenience fee and the amount for the order summary. Unpaid: the convenience fee on today's terms and the total
 * payable. Paid: what was paid, and the convenience fee as the part of the PayU payment above the booking fee (counter
 * payments carry none). A paid booking with no payment on record (from before payments were recorded) shows its fee.
 */
function amounts(state: BookingCard['state'], bookingFee: number, payments: PaymentRow[], fees: BookingFees) {
  if (state !== 'confirmed') {
    const payable = onlinePayable(bookingFee, fees.conveniencePercent)
    return { convenienceFee: payable.convenience, amount: payable.total }
  }
  const sum = (rows: PaymentRow[]) => rows.reduce((total, p) => total + (Number(p.amount) || 0), 0)
  const online = sum(payments.filter((p) => p.gateway === 'payu'))
  return {
    convenienceFee: online > bookingFee ? Math.round((online - bookingFee) * 100) / 100 : 0,
    amount: payments.length ? sum(payments) : bookingFee,
  }
}

const stateOf = (status: string): BookingCard['state'] => (PAID.includes(status) ? 'confirmed' : status === 'cancelled' || status === 'refunded' ? 'cancelled' : 'pending')

/** One booking (a doctor appointment or a lab booking) as the page and the emails show it, or null. */
export async function loadBookingCard(admin: Admin, id: string, now = Date.now()): Promise<BookingCard | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const base = siteUrl()
  const fees = await getBookingFees()

  const { data: apt } = await admin.from('appointments').select('*').eq('id', id).maybeSingle()
  if (apt) {
    const [{ data: doctor }, { data: hospital }, { data: slot }, { data: patient }, { data: details }, { data: payRows }] = await Promise.all([
      admin.from('doctors').select('id, specialty, image_url, consultation_fee, profiles!doctors_profile_id_fkey ( full_name )').eq('id', apt.doctor_id).maybeSingle(),
      apt.hospital_id ? admin.from('hospitals').select('id, name, address, city, image_url').eq('id', apt.hospital_id).maybeSingle() : Promise.resolve({ data: null }),
      apt.schedule_id ? admin.from('schedules').select('start_time').eq('id', apt.schedule_id).maybeSingle() : Promise.resolve({ data: null }),
      admin.from('profiles').select('full_name, phone_number, email').eq('id', apt.patient_id).maybeSingle(),
      admin.from('patient_details').select('date_of_birth, gender').eq('id', apt.patient_id).maybeSingle(),
      admin.from('payments').select('*').eq('appointment_id', id).eq('status', 'success').order('created_at', { ascending: false }),
    ])
    const name = doctorName(one(doctor?.profiles as Joined<{ full_name: string | null }>)?.full_name)
    const startsAt: string | null = slot?.start_time ?? null
    const state = stateOf(apt.status)
    const payments = (payRows ?? []) as PaymentRow[]
    const deskName = hospital?.name ? `${hospital.name} desk` : 'Hospital desk'
    const facts = paymentFacts(payments, deskName)
    const isFollowUp = !!apt.follow_up_of
    const fastTrack = isFastTrack(apt.booking_type)
    const bookingFee = appointmentBookingFee(apt, fees)
    const consultation = Number(doctor?.consultation_fee) || 0
    const services = bookedServices(apt.services)
    const counterPaid = !!facts.counter

    const venueItems = [{ label: 'Consultation fee', amount: consultation || null }, ...services.map((s) => ({ label: s.name, amount: s.price }))]
    const venueTotal = consultation || services.length ? consultation + sumPrices(services) : null
    const { convenienceFee, amount } = amounts(state, bookingFee, payments, fees)

    return {
      id,
      kind: 'consultation',
      code: id.slice(0, 8).toUpperCase(),
      status: apt.status,
      state,
      patientId: apt.patient_id,
      title: name,
      subtitle: `${doctor?.specialty || 'General Medicine'} · In-person consultation`,
      verified: true,
      when: startsAt ? `${cardTime(startsAt)} | ${cardDate(startsAt)}` : null,
      startsAt,
      place: hospital?.name || 'Partner hospital',
      placeLines: [hospital?.address, hospital?.city].filter(Boolean) as string[],
      image: hospital?.image_url || doctor?.image_url || null,
      typeLabel: isFollowUp ? 'Free follow-up' : fastTrack ? 'Fast track appointment' : 'General appointment',
      token: visitToken(id),
      reportBy: startsAt ? cardTime(Date.parse(startsAt) - 15 * 60_000) : null,
      followUp: isFollowUp || state === 'cancelled' ? null : { doctor: name, days: FOLLOW_UP_DAYS },
      isFollowUp,
      bookingFee,
      convenienceFee,
      bookingFeeLines: [
        { label: 'Appointment type', value: isFollowUp ? 'Free follow-up' : fastTrack ? 'Fast track' : 'General' },
        { label: 'Collected by', value: facts.online || !facts.counter ? 'Consult your Doctor' : deskName },
      ],
      venueTitle: counterPaid ? 'PAID AT HOSPITAL' : 'PAY AT HOSPITAL',
      venueItems,
      venueTotal,
      venueNote: counterPaid ? 'Paid at the counter' : 'Not charged online',
      amountLabel: state === 'confirmed' ? 'AMOUNT PAID' : 'AMOUNT DUE NOW',
      amount,
      bookedAt: apt.created_at,
      holdUntil: state === 'pending' ? new Date(Date.parse(apt.created_at) + HOLD_MINUTES * 60_000).toISOString() : null,
      paymentType: facts.paymentType,
      transactionId: facts.transactionId,
      patient: { name: patient?.full_name || 'Patient', ageSex: ageSexOf(details, now), phone: patient?.phone_number ?? null, email: patient?.email ?? null },
      links: {
        confirmation: `${base}/book/confirmation/${id}`,
        appointment: `${base}/patient/appointments`,
        checkout: `${base}/patient/checkout/${id}`,
        directions: directionsHref(hospital?.name, hospital?.address, hospital?.city),
        support: `${base}/patient/support`,
        bookAgain: hospital?.id ? `${base}/hospitals/${hospital.id}?doctor=${apt.doctor_id}` : `${base}/book/${apt.doctor_id}`,
      },
    }
  }

  const { data: lab } = await admin.from('diagnostic_bookings').select('*').eq('id', id).maybeSingle()
  if (!lab) return null
  const [{ data: center }, { data: patient }, { data: details }, { data: payRows }] = await Promise.all([
    admin.from('diagnostic_centers').select('id, name, address, city, image_url, test_prices').eq('id', lab.center_id).maybeSingle(),
    admin.from('profiles').select('full_name, phone_number, email').eq('id', lab.patient_id).maybeSingle(),
    admin.from('patient_details').select('date_of_birth, gender').eq('id', lab.patient_id).maybeSingle(),
    admin.from('payments').select('*').eq('diagnostic_booking_id', id).eq('status', 'success').order('created_at', { ascending: false }),
  ])
  const state = stateOf(lab.status)
  const payments = (payRows ?? []) as PaymentRow[]
  const deskName = center?.name ? `${center.name} desk` : 'Lab desk'
  const facts = paymentFacts(payments, deskName)
  const tests = bookedTestsFor(lab, center?.test_prices)
  const doorstep = lab.booking_type === 'doorstep'
  const doorstepFee = doorstep ? Number(lab.doorstep_fee) || 0 : 0
  const bookingFee = tests ? labBookingFee(tests, fees.diagnosticPercent) : 0
  const counterPaid = !!facts.counter
  const label = tests ? tests.map((t) => t.name).join(', ') : String(lab.test_name || 'Lab tests').replace(/-/g, ' ')
  const venueItems = [...(tests ?? []).map((t) => ({ label: t.name, amount: t.price as number | null })), ...(doorstepFee ? [{ label: 'Home collection', amount: doorstepFee }] : [])]
  const { convenienceFee, amount } = amounts(state, bookingFee, payments, fees)
  const day = lab.preferred_date ? `${lab.preferred_date}T12:00:00+05:30` : null

  return {
    id,
    kind: 'lab',
    code: id.slice(0, 8).toUpperCase(),
    status: lab.status,
    state,
    patientId: lab.patient_id,
    title: label,
    subtitle: `Lab tests · ${doorstep ? 'Home collection' : 'Visit the lab'}`,
    verified: false,
    when: day ? cardDate(day) : null,
    startsAt: day,
    place: center?.name || 'Diagnostic centre',
    placeLines: [center?.address, center?.city].filter(Boolean) as string[],
    image: center?.image_url || null,
    typeLabel: doorstep ? 'Home collection' : 'Walk-in at the lab',
    token: null,
    reportBy: null,
    followUp: null,
    isFollowUp: false,
    bookingFee,
    convenienceFee,
    bookingFeeLines: [
      { label: 'Booking fee', value: `${fees.diagnosticPercent}% of each test` },
      { label: 'Collected by', value: facts.online || !facts.counter ? 'Consult your Doctor' : deskName },
    ],
    venueTitle: counterPaid ? 'PAID AT LAB' : 'PAY AT LAB',
    venueItems,
    venueTotal: venueItems.length ? venueItems.reduce((s, i) => s + (i.amount ?? 0), 0) : null,
    venueNote: counterPaid ? 'Paid at the lab' : 'Not charged online',
    amountLabel: state === 'confirmed' ? 'AMOUNT PAID' : 'AMOUNT DUE NOW',
    amount,
    bookedAt: lab.created_at,
    holdUntil: null,
    paymentType: facts.paymentType,
    transactionId: facts.transactionId,
    patient: { name: patient?.full_name || 'Patient', ageSex: ageSexOf(details, now), phone: patient?.phone_number ?? null, email: patient?.email ?? null },
    links: {
      confirmation: `${base}/book/confirmation/${id}`,
      appointment: `${base}/patient/appointments`,
      checkout: `${base}/patient/checkout/diagnostic/${id}`,
      directions: directionsHref(center?.name, center?.address, center?.city),
      support: `${base}/patient/support`,
      bookAgain: center?.id ? `${base}/book/diagnostic/${center.id}` : null,
    },
  }
}

