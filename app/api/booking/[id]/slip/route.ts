import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAppointmentSlipPdf } from '@/lib/pdf/appointment-slip'
import { doctorName, formatLongDate, formatTime } from '@/components/patient/format'
import { doctorBookingFee, labBookingFee, matchBookedTests } from '@/lib/pricing'
import { getBookingFees } from '@/lib/booking-fees'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

// The slip is a payment receipt, so it is only issued once the booking is paid.
const PAID = ['confirmed', 'visited', 'completed', 'report_sent']

// It carries the patient's name and phone number: never let a shared cache keep a copy.
const PDF_HEADERS = { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' }

const tokenFor = (id: string) =>
  String(Math.abs(id.split('-').reduce((acc: number, part: string) => acc + parseInt(part.slice(0, 4), 16) || 0, 0) % 25) + 1).padStart(2, '0')

type Viewer = { id: string; role: string | null; hospitalId: string | null; centerId: string | null }

/** The patient who booked, staff at the hospital or centre it is with, and the operations team may see the slip. */
const canSee = (viewer: Viewer, patientId: string | null, place: { hospitalId?: string | null; centerId?: string | null }) =>
  viewer.id === patientId ||
  viewer.role === 'executive' ||
  (viewer.role === 'hospital_admin' && !!viewer.hospitalId && viewer.hospitalId === place.hospitalId) ||
  (viewer.role === 'diagnostic_admin' && !!viewer.centerId && viewer.centerId === place.centerId)

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in to download your slip.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('role, hospital_id, diagnostic_center_id').eq('id', user.id).maybeSingle()
    const viewer: Viewer = { id: user.id, role: profile?.role ?? null, hospitalId: profile?.hospital_id ?? null, centerId: profile?.diagnostic_center_id ?? null }

    // 1. Try finding in appointments
    const { data: aptData } = await admin
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey ( full_name, phone_number, email ),
        doctor:doctors (
          id, specialty, hospital_id,
          profiles!doctors_profile_id_fkey ( full_name )
        ),
        hospital:hospitals ( id, name, city, address ),
        schedule:schedules ( start_time )
      `)
      .eq('id', id)
      .maybeSingle()

    if (aptData) {
      const apt = aptData as any
      const doc = one<any>(apt.doctor)
      const hosp = one<any>(apt.hospital)
      const schedule = one<any>(apt.schedule)
      const patient = one<any>(apt.patient)
      if (!canSee(viewer, apt.patient_id, { hospitalId: hosp?.id ?? doc?.hospital_id })) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      if (!PAID.includes(apt.status)) {
        return NextResponse.json({ error: 'The slip is available once this booking is paid.' }, { status: 409 })
      }

      const docProfile = one<any>(doc?.profiles)
      const docFull = docProfile?.full_name ? doctorName(docProfile.full_name) : 'Medical Specialist'
      const dateStr = schedule?.start_time
        ? `${formatLongDate(schedule.start_time)}, ${formatTime(schedule.start_time)}`
        : 'Scheduled Visit'

      const { data: paymentRow } = await admin
        .from('payments')
        .select('amount, transaction_id, gateway')
        .eq('appointment_id', id)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // A PayU payment is the booking fee. A desk payment (cash or UPI) is what the counter took, which the slip doesn't show.
      const online = !paymentRow || paymentRow.gateway === 'payu'
      const bookingFee = paymentRow ? Number(paymentRow.amount) || 0 : doctorBookingFee(await getBookingFees(), apt.booking_type)

      const pdfBytes = await generateAppointmentSlipPdf({
        bookingId: id,
        tokenNumber: tokenFor(id),
        isConsultation: true,
        patient: {
          name: patient?.full_name || 'Patient',
          phone: patient?.phone_number || null,
          email: patient?.email || null,
        },
        provider: {
          name: docFull,
          specialty: doc?.specialty || 'Specialist Consultation',
          hospitalName: hosp?.name || 'Partner Hospital',
          address: hosp?.address || null,
          city: hosp?.city || null,
        },
        schedule: {
          dateTimeStr: dateStr,
        },
        payment: {
          online,
          amount: online ? bookingFee : 0,
          transactionId: paymentRow?.transaction_id || id,
          status: 'PAID',
          gateway: online ? 'PayU' : 'Hospital desk',
          paidAt: new Date(apt.created_at || Date.now()),
        },
      })

      return new NextResponse(pdfBytes as any, {
        headers: { ...PDF_HEADERS, 'Content-Disposition': `inline; filename="appointment_slip_${id.slice(0, 8).toUpperCase()}.pdf"` },
      })
    }

    // 2. Try diagnostic bookings
    const { data: diagData } = await admin
      .from('diagnostic_bookings')
      .select(`
        id, status, test_name, preferred_date, created_at, patient_id,
        patient:profiles!diagnostic_bookings_patient_id_fkey ( full_name, phone_number, email ),
        center:diagnostic_centers ( id, name, city, address, test_prices )
      `)
      .eq('id', id)
      .maybeSingle()

    if (diagData) {
      const diag = diagData as any
      const center = one<any>(diag.center)
      const patient = one<any>(diag.patient)
      if (!canSee(viewer, diag.patient_id, { centerId: center?.id })) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      if (!PAID.includes(diag.status)) {
        return NextResponse.json({ error: 'The slip is available once this booking is paid.' }, { status: 409 })
      }
      const dateStr = diag.preferred_date ? `Visit on ${diag.preferred_date}` : 'Scheduled Visit'

      const { data: paymentRow } = await admin
        .from('payments')
        .select('amount, transaction_id, gateway')
        .eq('diagnostic_booking_id', id)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const online = !paymentRow || paymentRow.gateway === 'payu'
      const tests = paymentRow ? null : matchBookedTests(diag.test_name || '', center?.test_prices)
      const bookingFee = paymentRow ? Number(paymentRow.amount) || 0 : tests ? labBookingFee(tests, (await getBookingFees()).diagnosticPercent) : 0

      const pdfBytes = await generateAppointmentSlipPdf({
        bookingId: id,
        tokenNumber: tokenFor(id),
        isConsultation: false,
        patient: {
          name: patient?.full_name || 'Patient',
          phone: patient?.phone_number || null,
          email: patient?.email || null,
        },
        provider: {
          name: diag.test_name,
          specialty: 'Diagnostic Laboratory Testing',
          hospitalName: center?.name || 'Diagnostic Centre',
          address: center?.address || null,
          city: center?.city || null,
        },
        schedule: {
          dateTimeStr: dateStr,
        },
        payment: {
          online,
          amount: online ? bookingFee : 0,
          transactionId: paymentRow?.transaction_id || id,
          status: 'PAID',
          gateway: online ? 'PayU' : 'Centre desk',
          paidAt: new Date(diag.created_at || Date.now()),
        },
      })

      return new NextResponse(pdfBytes as any, {
        headers: { ...PDF_HEADERS, 'Content-Disposition': `inline; filename="diagnostic_slip_${id.slice(0, 8).toUpperCase()}.pdf"` },
      })
    }

    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  } catch (err: any) {
    console.error('Error generating appointment slip:', err)
    return NextResponse.json({ error: 'Failed to generate appointment slip' }, { status: 500 })
  }
}
