import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { doctorName, formatLongDate, formatTime } from '@/components/patient/format'
import { labBookingFee, matchBookedTests } from '@/lib/pricing'
import { getBookingFees } from '@/lib/booking-fees'

// Paid booking states. Payment status always comes from the database: a ?payment=success in the URL proves nothing.
const PAID = ['confirmed', 'visited', 'completed', 'report_sent']

// The page opens from the booking link and the QR code on the slip, so anyone holding the link can see it. Only the
// patient themself gets their full phone number; everyone else sees the last four digits.
const maskPhone = (phone: string | null | undefined, isOwner: boolean) =>
  !phone ? null : isOwner ? phone : `•••• ${phone.replace(/D/g, '').slice(-4)}`
import { ConfirmationClient, type ConfirmationData } from './ConfirmationClient'
import { siteUrl } from '@/lib/site-url'

interface Props {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ payment?: string; reason?: string }>
}

export default async function BookingConfirmationPage(props: Props) {
  const { id } = await props.params
  const search = (await props.searchParams) ?? {}
  const admin = createAdminClient()
  const [viewer, fees] = await Promise.all([getCurrentUser(), getBookingFees()])
  // Set by the PayU callback when a payment didn't go through; shown with the failed state.
  const failureReason = search.payment === 'failed' && search.reason ? search.reason.slice(0, 300) : null

  // The booking fee is the only amount shown: what PayU took, or what it will take. null for a booking made and paid at a
  // hospital or lab desk, which has no booking fee (the counter took the consultation fee or test charges).
  const bookingFeeFrom = (payment: { amount: number | string; gateway: string | null } | null, unpaid: number | null) =>
    payment ? (payment.gateway === 'payu' ? Number(payment.amount) || 0 : null) : unpaid

  // 1. Check if id belongs to an appointment
  const { data: aptData } = await admin
    .from('appointments')
    .select(`
      id, status, created_at, patient_id,
      patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
      doctor:doctors (
        id, specialty,
        profiles!doctors_profile_id_fkey ( full_name )
      ),
      hospital:hospitals ( id, name, city, address ),
      schedule:schedules ( start_time )
    `)
    .eq('id', id)
    .maybeSingle()

  let apt = aptData as any
  if (!apt) {
    const { data: rawApt } = await admin.from('appointments').select('*').eq('id', id).maybeSingle()
    if (rawApt) {
      const [{ data: pProf }, { data: docRow }, { data: hospRow }, { data: schedRow }] = await Promise.all([
        admin.from('profiles').select('full_name, phone_number').eq('id', rawApt.patient_id).maybeSingle(),
        admin.from('doctors').select('id, specialty, profiles!doctors_profile_id_fkey ( full_name )').eq('id', rawApt.doctor_id).maybeSingle(),
        admin.from('hospitals').select('id, name, city, address').eq('id', rawApt.hospital_id).maybeSingle(),
        admin.from('schedules').select('start_time').eq('id', rawApt.schedule_id).maybeSingle(),
      ])
      apt = {
        ...rawApt,
        patient: pProf,
        doctor: docRow,
        hospital: hospRow,
        schedule: schedRow,
      }
    }
  }

  if (apt) {
    const doc = apt.doctor
    const hosp = apt.hospital
    const schedule = apt.schedule
    const patient = apt.patient

    // Determine Token Number (deterministic sequential token based on appointment ID)
    const tokenSeq = Math.abs(id.split('-').reduce((acc: number, part: string) => acc + parseInt(part.slice(0, 4), 16) || 0, 0) % 25) + 1
    const tokenNumber = String(tokenSeq).padStart(2, '0')

    const dateStr = schedule?.start_time
      ? `${formatLongDate(schedule.start_time)}, ${formatTime(schedule.start_time)}`
      : 'Date to be confirmed'

    // The PayU callback confirms the booking before it redirects here, so the booking's own status is the truth.
    const paymentStatus: 'success' | 'pending' | 'failed' = PAID.includes(apt.status)
      ? 'success'
      : search.payment === 'failed'
        ? 'failed'
        : 'pending'
    const { data: paid } = await admin
      .from('payments')
      .select('amount, gateway')
      .eq('appointment_id', id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const verificationUrl = `${siteUrl()}/book/confirmation/${id}`
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 240 })

    const confirmationData: ConfirmationData = {
      id,
      bookingReference: id.slice(0, 8).toUpperCase(),
      tokenNumber,
      isConsultation: true,
      title: doc?.profiles?.full_name ? doctorName(doc.profiles.full_name) : 'Medical Specialist',
      subtitle: doc?.specialty || 'General Consultation',
      providerName: hosp?.name || 'Affiliated Hospital',
      providerCode: hosp?.hospital_code || `CYD-HOSP-${hosp?.id?.slice(0, 4)?.toUpperCase() || '0000'}`,
      location: [hosp?.city, hosp?.address].filter(Boolean).join(', ') || 'Branch Clinic',
      address: hosp?.address || null,
      dateTime: dateStr,
      patientName: patient?.full_name || 'Patient',
      patientPhone: maskPhone(patient?.phone_number, viewer?.id === apt.patient_id),
      bookingFee: bookingFeeFrom(paid, fees.consultation),
      paymentStatus,
      failureReason,
      appointmentStatus: apt.status || 'confirmed',
      qrDataUrl,
      checkoutUrl: `/patient/checkout/${id}`
    }

    return <ConfirmationClient data={confirmationData} />
  }

  // 2. Otherwise check diagnostic bookings
  const { data: diagData } = await admin
    .from('diagnostic_bookings')
    .select(`
      id, status, test_name, preferred_date, created_at, patient_id,
      patient:profiles!diagnostic_bookings_patient_id_fkey ( full_name, phone_number ),
      center:diagnostic_centers ( id, name, city, address, test_prices )
    `)
    .eq('id', id)
    .maybeSingle()

  let diag = diagData as any
  if (!diag) {
    const { data: rawDiag } = await admin.from('diagnostic_bookings').select('*').eq('id', id).maybeSingle()
    if (rawDiag) {
      const [{ data: pProf }, { data: cRow }] = await Promise.all([
        admin.from('profiles').select('full_name, phone_number').eq('id', rawDiag.patient_id).maybeSingle(),
        admin.from('diagnostic_centers').select('id, name, city, address, test_prices').eq('id', rawDiag.center_id).maybeSingle(),
      ])
      diag = {
        ...rawDiag,
        patient: pProf,
        center: cRow,
      }
    }
  }

  if (diag) {
    const center = diag.center
    const patient = diag.patient
    const tokenSeq = Math.abs(id.split('-').reduce((acc: number, part: string) => acc + parseInt(part.slice(0, 4), 16) || 0, 0) % 25) + 1
    const tokenNumber = String(tokenSeq).padStart(2, '0')

    const dateStr = diag.preferred_date ? formatLongDate(diag.preferred_date) : 'Scheduled Date'
    // Priced the way checkout prices it: the booking fee on every booked test.
    const tests = matchBookedTests(diag.test_name || '', center?.test_prices)
    const { data: paid } = await admin
      .from('payments')
      .select('amount, gateway')
      .eq('diagnostic_booking_id', id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const paymentStatus: 'success' | 'pending' | 'failed' = PAID.includes(diag.status)
      ? 'success'
      : search.payment === 'failed'
        ? 'failed'
        : 'pending'

    const verificationUrl = `${siteUrl()}/book/confirmation/${id}`
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 240 })

    const confirmationData: ConfirmationData = {
      id,
      bookingReference: id.slice(0, 8).toUpperCase(),
      tokenNumber,
      isConsultation: false,
      title: diag.test_name || 'Laboratory Investigation',
      subtitle: 'Pathology & Diagnostic Testing',
      providerName: center?.name || 'Diagnostic Laboratory',
      providerCode: center?.center_code || `CYD-DIAG-${center?.id?.slice(0, 4)?.toUpperCase() || '0000'}`,
      location: [center?.city, center?.address].filter(Boolean).join(', ') || 'Diagnostic Lab',
      address: center?.address || null,
      dateTime: dateStr,
      patientName: patient?.full_name || 'Patient',
      patientPhone: maskPhone(patient?.phone_number, viewer?.id === diag.patient_id),
      bookingFee: bookingFeeFrom(paid, tests ? labBookingFee(tests, fees.diagnosticPercent) : null),
      paymentStatus,
      failureReason,
      appointmentStatus: diag.status || 'confirmed',
      qrDataUrl,
      checkoutUrl: `/patient/checkout/diagnostic/${id}`
    }

    return <ConfirmationClient data={confirmationData} />
  }

  notFound()
}
