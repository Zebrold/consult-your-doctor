import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, CalendarDays, CircleCheck, CircleX, Clock, SearchX, UserRound } from 'lucide-react'
import { PayUCheckoutForm } from '@/components/PayUCheckoutForm'
import { CheckoutCard, CheckoutGrid, CheckoutHeading, CheckoutMessage, CheckoutShell, DetailRow, PaymentSummary } from '@/components/patient/CheckoutShell'
import { PayAtVenue } from '@/components/patient/booking-ui'
import { doctorName, formatINR, formatLongDate, formatTime } from '@/components/patient/format'
import { getBookingFees } from '@/lib/booking-fees'
import { bookedServices, doctorBookingFee, isFastTrack } from '@/lib/pricing'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

export default async function CheckoutPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params
  const supabase = await createClient()

  const [user, fees] = await Promise.all([getCurrentUser(), getBookingFees()])
  if (!user) redirect('/login/patient')

  // Only the patient's own appointment is ever loaded (and RLS enforces the same).
  const [{ data: appointment }, { data: profile }] = await Promise.all([
    // `*` so booking_type and services come back once 20261028_fast_track_services.sql has run (lib/booking-options.ts).
    supabase
      .from('appointments')
      .select(`
        *,
        doctors ( specialty, profiles ( full_name ) ),
        hospitals ( name, address, city ),
        schedules ( start_time )
      `)
      .eq('id', appointmentId)
      .eq('patient_id', user.id)
      .maybeSingle(),
    supabase.from('profiles').select('full_name, email, phone_number').eq('id', user.id).maybeSingle(),
  ])

  const name = profile?.full_name || user.user_metadata?.full_name || null
  const email = profile?.email || user.email || null

  if (!appointment) {
    return (
      <CheckoutShell name={name} email={email}>
        <CheckoutMessage icon={SearchX} title="Appointment not found">
          We couldn&apos;t find this appointment in your account. It may have been removed, or the link may be incomplete.
        </CheckoutMessage>
      </CheckoutShell>
    )
  }

  if (appointment.status !== 'pending_payment') {
    const cancelled = appointment.status === 'cancelled' || appointment.status === 'refunded'
    return (
      <CheckoutShell name={name} email={email}>
        <CheckoutMessage icon={cancelled ? CircleX : CircleCheck} tone={cancelled ? 'error' : 'success'} title={cancelled ? 'This appointment was cancelled' : 'This appointment is already paid'}>
          {cancelled
            ? 'There is nothing to pay. You can book a new visit from Find.'
            : 'Your payment has been received and the booking is confirmed. Your slip is in your appointments.'}
        </CheckoutMessage>
      </CheckoutShell>
    )
  }

  type Doctor = { specialty: string | null; profiles: Joined<{ full_name: string | null }> }
  type Hospital = { name: string; address: string | null; city: string | null }
  const doctor = one(appointment.doctors as Joined<Doctor>)
  const hospital = one(appointment.hospitals as Joined<Hospital>)
  const startTime = one(appointment.schedules as Joined<{ start_time: string }>)?.start_time ?? null
  // The same amount /api/payu/hash charges: the booking fee only. The consultation fee and any services are paid at the
  // hospital counter.
  const fastTrack = isFastTrack(appointment.booking_type)
  const total = doctorBookingFee(fees, appointment.booking_type)
  const services = bookedServices(appointment.services)

  return (
    <CheckoutShell name={name} email={email}>
      <CheckoutHeading title="Complete your payment">
        Your slot is reserved. Pay now to confirm the booking, and your slip and token number will be sent to you.
      </CheckoutHeading>

      <CheckoutGrid
        details={
          <CheckoutCard title="Appointment details">
            <DetailRow icon={UserRound} label="Doctor" value={doctorName(one(doctor?.profiles)?.full_name)} sub={[doctor?.specialty, fastTrack ? 'Fast track' : null].filter(Boolean).join(' · ')} />
            <DetailRow icon={Building2} label="Hospital" value={hospital?.name ?? 'Partner hospital'} sub={[hospital?.address, hospital?.city].filter(Boolean).join(', ')} />
            {startTime && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <DetailRow icon={CalendarDays} label="Date" value={formatLongDate(startTime)} />
                <DetailRow icon={Clock} label="Time" value={formatTime(startTime)} />
              </div>
            )}
          </CheckoutCard>
        }
        summary={
          <PaymentSummary
            lines={[{ label: fastTrack ? 'Fast-track booking fee' : 'Booking fee', sub: 'Consult Your Doctor', amount: total }]}
            total={total}
            isConsultation
            atVenue={
              <PayAtVenue title={services.length ? 'Consultation fee and services: paid at the hospital' : 'Consultation fee: paid at the hospital counter'}>
                {services.length
                  ? `The consultation fee and ${services.map((s) => `${s.name} (${formatINR(s.price)})`).join(', ')} are paid when you visit. They aren't collected online or added to this total.`
                  : <>Set by the hospital and paid when you visit. It isn&apos;t collected online or added to this total.</>}
              </PayAtVenue>
            }
          >
            <PayUCheckoutForm
              txnid={appointmentId}
              amount={total}
              productinfo="Consultation"
              firstname={(name || 'Patient').replace(/[|]/g, ' ')}
              email={email || 'patient@example.com'}
              phone={profile?.phone_number || user.phone || '9999999999'}
              payuKey={process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY || ''}
            />
          </PaymentSummary>
        }
      />
    </CheckoutShell>
  )
}
