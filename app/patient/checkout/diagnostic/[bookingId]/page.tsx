import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, CalendarDays, CircleCheck, CircleX, FlaskConical, Home, SearchX } from 'lucide-react'
import { PayUCheckoutForm } from '@/components/PayUCheckoutForm'
import { CheckoutCard, CheckoutGrid, CheckoutHeading, CheckoutMessage, CheckoutShell, DetailRow, PaymentSummary } from '@/components/patient/CheckoutShell'
import { LabChargesAtVenue } from '@/components/patient/booking-ui'
import { formatINR, formatLongDate } from '@/components/patient/format'
import { formatPercent, labBookingFee, labDoorstepFee, labTestBookingFee, matchBookedTests } from '@/lib/pricing'
import { getBookingFees } from '@/lib/booking-fees'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

export default async function DiagnosticCheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const supabase = await createClient()

  const [user, fees] = await Promise.all([getCurrentUser(), getBookingFees()])
  if (!user) redirect('/login/patient')

  // Only the patient's own booking is ever loaded (and RLS enforces the same).
  const [{ data: booking }, { data: profile }] = await Promise.all([
    supabase
      .from('diagnostic_bookings')
      .select('id, status, test_name, preferred_date, booking_type, diagnostic_centers ( name, address, city, test_prices, doorstep_fee )')
      .eq('id', bookingId)
      .eq('patient_id', user.id)
      .maybeSingle(),
    supabase.from('profiles').select('full_name, email, phone_number').eq('id', user.id).maybeSingle(),
  ])

  const name = profile?.full_name || user.user_metadata?.full_name || null
  const email = profile?.email || user.email || null

  if (!booking) {
    return (
      <CheckoutShell name={name} email={email}>
        <CheckoutMessage icon={SearchX} title="Booking not found">
          We couldn&apos;t find this lab booking in your account. It may have been removed, or the link may be incomplete.
        </CheckoutMessage>
      </CheckoutShell>
    )
  }

  if (booking.status !== 'pending_payment') {
    const cancelled = booking.status === 'cancelled' || booking.status === 'refunded'
    return (
      <CheckoutShell name={name} email={email}>
        <CheckoutMessage icon={cancelled ? CircleX : CircleCheck} tone={cancelled ? 'error' : 'success'} title={cancelled ? 'This booking was cancelled' : 'This booking is already paid'}>
          {cancelled
            ? 'There is nothing to pay. You can book lab tests again from Find.'
            : 'Your payment has been received and the booking is confirmed. Your slip is in your appointments.'}
        </CheckoutMessage>
      </CheckoutShell>
    )
  }

  type Center = { name: string; address: string | null; city: string | null; test_prices: Record<string, number> | null; doorstep_fee: number | null }
  const center = one(booking.diagnostic_centers as Joined<Center>)
  // Price each booked test from the lab's price list (a booking can hold several tests).
  const bookedTests = matchBookedTests(booking.test_name || '', center?.test_prices)
  const isDoorstep = booking.booking_type === 'doorstep'
  // The home-collection fee is the lab's listed one, paid to the lab with the tests.
  const doorstepFee = isDoorstep ? labDoorstepFee(center) : 0
  // The same amount /api/payu/hash charges: the booking fee on each test, and nothing the lab charges itself.
  const percent = fees.diagnosticPercent
  const total = bookedTests ? labBookingFee(bookedTests, percent) : 0

  return (
    <CheckoutShell name={name} email={email}>
      <CheckoutHeading title="Complete your payment">
        Your lab booking is reserved. Pay now to confirm it, and your slip will be sent to you.
      </CheckoutHeading>

      <CheckoutGrid
        details={
          <CheckoutCard title="Booking details">
            <DetailRow icon={FlaskConical} label={bookedTests && bookedTests.length > 1 ? 'Tests' : 'Test'} value={<span className="capitalize">{booking.test_name}</span>} />
            <DetailRow icon={Building2} label="Diagnostic centre" value={center?.name ?? 'Partner lab'} sub={[center?.address, center?.city].filter(Boolean).join(', ')} />
            <DetailRow
              icon={Home}
              label="Collection mode"
              value={isDoorstep ? '🏠 Doorstep Collection' : '🚶 Lab Centre Visit'}
              sub={isDoorstep && doorstepFee > 0 ? `Home collection fee ${formatINR(doorstepFee)}, paid to the lab` : undefined}
            />
            {booking.preferred_date && <DetailRow icon={CalendarDays} label="Preferred date" value={formatLongDate(booking.preferred_date)} />}
          </CheckoutCard>
        }
        summary={
          <PaymentSummary
            lines={(bookedTests ?? []).map((t) => ({
              label: `Booking fee: ${t.name}`,
              sub: `${formatPercent(percent)} of the ${formatINR(t.price)} test price`,
              amount: labTestBookingFee(t.price, percent),
            }))}
            total={total}
            isConsultation={false}
            atVenue={<LabChargesAtVenue tests={bookedTests ?? []} doorstepFee={doorstepFee} />}
          >
            {bookedTests && total > 0 ? (
              <PayUCheckoutForm
                txnid={bookingId}
                amount={total}
                productinfo="Diagnostic"
                firstname={(name || 'Patient').replace(/[|]/g, ' ')}
                email={email || 'patient@example.com'}
                phone={profile?.phone_number || user.phone || '9999999999'}
                payuKey={process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY || ''}
              />
            ) : (
              <p className="rounded-xl bg-error-container/60 text-on-error-container text-sm p-3">
                We couldn&apos;t price this booking from the lab&apos;s current price list, so it can&apos;t be paid online. Please contact support.
              </p>
            )}
          </PaymentSummary>
        }
      />
    </CheckoutShell>
  )
}
