import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAppointmentSlipPdf } from '@/lib/pdf/appointment-slip'
import { loadBookingCard } from '@/lib/booking-card'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

type AppointmentRow = {
  patient_id: string | null
  status: string
  doctor: Joined<{ hospital_id: string | null }>
  hospital: Joined<{ id: string }>
}
type DiagnosticRow = {
  status: string
  patient_id: string | null
  center: Joined<{ id: string }>
}

// The slip is a payment receipt, so it is only issued once the booking is paid.
const PAID = ['confirmed', 'visited', 'completed', 'report_sent']

// It carries the patient's name and phone number: never let a shared cache keep a copy.
const PDF_HEADERS = { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' }

/** The slip, drawn from the same booking card as the booking page and the booking email. */
async function slipFor(admin: ReturnType<typeof createAdminClient>, id: string) {
  const card = await loadBookingCard(admin, id)
  return card ? generateAppointmentSlipPdf(card) : null
}

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
      .select('patient_id, status, doctor:doctors ( hospital_id ), hospital:hospitals ( id )')
      .eq('id', id)
      .maybeSingle()

    if (aptData) {
      const apt = aptData as unknown as AppointmentRow
      const doc = one(apt.doctor)
      const hosp = one(apt.hospital)
      if (!canSee(viewer, apt.patient_id, { hospitalId: hosp?.id ?? doc?.hospital_id })) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      if (!PAID.includes(apt.status)) {
        return NextResponse.json({ error: 'The slip is available once this booking is paid.' }, { status: 409 })
      }

      const pdfBytes = await slipFor(admin, id)
      if (!pdfBytes) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      return new NextResponse(pdfBytes as unknown as BodyInit, {
        headers: { ...PDF_HEADERS, 'Content-Disposition': `inline; filename="appointment_slip_${id.slice(0, 8).toUpperCase()}.pdf"` },
      })
    }

    // 2. Try diagnostic bookings
    const { data: diagData } = await admin
      .from('diagnostic_bookings')
      .select('status, patient_id, center:diagnostic_centers ( id )')
      .eq('id', id)
      .maybeSingle()

    if (diagData) {
      const diag = diagData as unknown as DiagnosticRow
      const center = one(diag.center)
      if (!canSee(viewer, diag.patient_id, { centerId: center?.id })) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      if (!PAID.includes(diag.status)) {
        return NextResponse.json({ error: 'The slip is available once this booking is paid.' }, { status: 409 })
      }
      const pdfBytes = await slipFor(admin, id)
      if (!pdfBytes) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      return new NextResponse(pdfBytes as unknown as BodyInit, {
        headers: { ...PDF_HEADERS, 'Content-Disposition': `inline; filename="diagnostic_slip_${id.slice(0, 8).toUpperCase()}.pdf"` },
      })
    }

    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  } catch (err) {
    console.error('Error generating appointment slip:', err)
    return NextResponse.json({ error: 'Failed to generate appointment slip' }, { status: 500 })
  }
}
