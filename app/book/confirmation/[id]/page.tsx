import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { doctorName, formatLongDate, formatTime } from '@/components/patient/format'
import { ConfirmationClient, type ConfirmationData } from './ConfirmationClient'

interface Props {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ payment?: string; reason?: string }>
}

export default async function BookingConfirmationPage(props: Props) {
  const { id } = await props.params
  const search = (await props.searchParams) ?? {}
  const admin = createAdminClient()

  // 1. Check if id belongs to an appointment
  const { data: aptData } = await admin
    .from('appointments')
    .select(`
      id, status, created_at, patient_id,
      patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
      doctor:doctors (
        id, specialty, consultation_fee,
        profiles!doctors_profile_id_fkey ( full_name )
      ),
      hospital:hospitals ( id, name, city, address, hospital_code ),
      schedule:schedules ( start_time )
    `)
    .eq('id', id)
    .maybeSingle()

  if (aptData) {
    const apt = aptData as any
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

    // Check payment status from query or payments table
    let paymentStatus: 'success' | 'pending' | 'failed' = 'pending'
    if (search.payment === 'success' || apt.status === 'confirmed' || apt.status === 'visited' || apt.status === 'completed') {
      paymentStatus = 'success'
    } else if (search.payment === 'failed') {
      paymentStatus = 'failed'
    } else {
      const { data: paymentRow } = await admin.from('payments').select('status').eq('appointment_id', id).maybeSingle()
      if (paymentRow?.status === 'success') paymentStatus = 'success'
      else if (paymentRow?.status === 'failed') paymentStatus = 'failed'
    }

    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://consultyourdoctor.de'}/book/confirmation/${id}`
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
      patientPhone: patient?.phone_number || null,
      fee: Number(doc?.consultation_fee) || 500,
      paymentStatus,
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
      id, status, test_name, preferred_date, created_at,
      patient:profiles!diagnostic_bookings_patient_id_fkey ( full_name, phone_number ),
      center:diagnostic_centers ( id, name, city, address, center_code, test_prices )
    `)
    .eq('id', id)
    .maybeSingle()

  if (diagData) {
    const diag = diagData as any
    const center = diag.center
    const patient = diag.patient
    const tokenSeq = Math.abs(id.split('-').reduce((acc: number, part: string) => acc + parseInt(part.slice(0, 4), 16) || 0, 0) % 25) + 1
    const tokenNumber = String(tokenSeq).padStart(2, '0')

    const dateStr = diag.preferred_date ? formatLongDate(diag.preferred_date) : 'Scheduled Date'
    const price = (center?.test_prices && center.test_prices[diag.test_name]) || 500

    let paymentStatus: 'success' | 'pending' | 'failed' = 'pending'
    if (search.payment === 'success' || diag.status === 'confirmed' || diag.status === 'visited') {
      paymentStatus = 'success'
    } else if (search.payment === 'failed') {
      paymentStatus = 'failed'
    }

    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://consultyourdoctor.de'}/book/confirmation/${id}`
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
      patientPhone: patient?.phone_number || null,
      fee: price,
      paymentStatus,
      appointmentStatus: diag.status || 'confirmed',
      qrDataUrl,
      checkoutUrl: `/patient/checkout/diagnostic/${id}`
    }

    return <ConfirmationClient data={confirmationData} />
  }

  notFound()
}
