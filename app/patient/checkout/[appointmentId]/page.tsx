import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, CalendarDays, CircleCheck, CircleX, Clock, SearchX, UserRound } from 'lucide-react'
import { PayUCheckoutForm } from '@/components/PayUCheckoutForm'
import { CheckoutCard, CheckoutGrid, CheckoutHeading, CheckoutMessage, CheckoutShell, DetailRow, PaymentSummary } from '@/components/patient/CheckoutShell'
import { doctorName, formatLongDate, formatTime } from '@/components/patient/format'
import { getPlatformFees } from '@/lib/platform-fees'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

export default async function CheckoutPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params
  const supabase = await createClient()

  const [user, fees] = await Promise.all([getCurrentUser(), getPlatformFees()])
  if (!user) redirect('/login/patient')

  // Only the patient's own appointment is ever loaded (and RLS enforces the same).
  const [{ data: appointment }, { data: profile }] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id,
        status,
        doctors ( specialty, consultation_fee, profiles ( full_name ) ),
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

  type Doctor = { specialty: string | null; consultation_fee: number | null; profiles: Joined<{ full_name: string | null }> }
  type Hospital = { name: string; address: string | null; city: string | null }
  const doctor = one(appointment.doctors as Joined<Doctor>)
  const hospital = one(appointment.hospitals as Joined<Hospital>)
  const startTime = one(appointment.schedules as Joined<{ start_time: string }>)?.start_time ?? null
  const fee = Number(doctor?.consultation_fee) || 0
  const total = fee + fees.consultation

  return (
    <CheckoutShell name={name} email={email}>
      <CheckoutHeading title="Complete your payment">
        Your slot is reserved. Pay now to confirm the booking, and your slip and token number will be sent to you.
      </CheckoutHeading>

      <CheckoutGrid
        details={
          <CheckoutCard title="Appointment details">
            <DetailRow icon={UserRound} label="Doctor" value={doctorName(one(doctor?.profiles)?.full_name)} sub={doctor?.specialty} />
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
            lines={[
              { label: 'Consultation fee', amount: fee },
              { label: 'Platform fee', amount: fees.consultation },
            ]}
            total={total}
          >
            {fee > 0 ? (
              <PayUCheckoutForm
                txnid={appointmentId}
                amount={total}
                productinfo="Consultation"
                firstname={(name || 'Patient').replace(/[|]/g, ' ')}
                email={email || 'patient@example.com'}
                phone={profile?.phone_number || user.phone || '9999999999'}
                payuKey={process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY || ''}
              />
            ) : (
              <p className="rounded-xl bg-error-container/60 text-on-error-container text-sm p-3">
                This doctor&apos;s fee isn&apos;t set yet, so the visit can&apos;t be paid online. Please contact support.
              </p>
            )}
          </PaymentSummary>
        }
      />
    </CheckoutShell>
  )
}
