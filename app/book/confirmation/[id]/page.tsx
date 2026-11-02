import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBookingCard } from '@/lib/booking-card'
import { currentTime } from '@/components/patient/data'
import { ConfirmationClient } from './ConfirmationClient'

// The booking page: "Complete your payment to confirm" while the booking fee is unpaid (a failed payment can be tried
// again from here), "Your appointment is confirmed!" once paid. The emails use the same layout (lib/notify/booking-email.ts).
// Payment status always comes from the database: a ?payment=success in the URL proves nothing.

// The page opens from the booking link and the QR code on the slip, so anyone holding the link can see it. Only the
// patient themself gets their full name and phone number.
const nameFor = (name: string, isOwner: boolean) => {
  if (isOwner) return name
  const first = name.trim().split(/\s+/)[0]
  return first ? `${first[0].toUpperCase()}. ••••` : 'Patient'
}

interface Props {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ payment?: string; reason?: string }>
}

export default async function BookingConfirmationPage(props: Props) {
  const { id } = await props.params
  const search = (await props.searchParams) ?? {}
  const [viewer, card] = await Promise.all([getCurrentUser(), loadBookingCard(createAdminClient(), id)])
  if (!card) notFound()

  const isOwner = viewer?.id === card.patientId
  const qr = card.state === 'confirmed' ? await QRCode.toDataURL(card.links.confirmation, { margin: 1, width: 240 }) : null
  // Set by the PayU callback when a payment didn't go through; shown while the booking still waits for payment.
  const failureReason = card.state === 'pending' && search.payment === 'failed' ? (search.reason || 'The payment was not completed.').slice(0, 300) : null

  return (
    <ConfirmationClient
      card={{ ...card, patient: { ...card.patient, name: nameFor(card.patient.name, isOwner), phone: isOwner ? card.patient.phone : null, email: isOwner ? card.patient.email : null } }}
      qr={qr}
      failureReason={failureReason}
      // Paying starts here for the patient themself; anyone else is sent to log in on the checkout page.
      pay={isOwner && card.state === 'pending' ? { payuKey: process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY || '', email: card.patient.email, phone: card.patient.phone } : null}
      now={currentTime()}
    />
  )
}
