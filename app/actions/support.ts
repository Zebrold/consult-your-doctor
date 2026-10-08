'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailConfigured, sendEmail } from '@/lib/notify/email'
import { COMPANY } from '@/lib/company'

// A signed-in patient's support ticket, emailed to the support inbox (SUPPORT_EMAIL, or the company address) from
// no-reply@zebrold.de with the patient's details, so the team can reply to them directly.

const TOPICS = ['Booking or appointment', 'Payment or refund', 'Prescription or report', 'Account or sign-in', 'Something else']

export async function raiseSupportTicket(input: { topic: string; bookingId: string; message: string }): Promise<{ ok: true; sent: boolean; mailto: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please sign in to raise a ticket.' }

  const topic = TOPICS.includes(input.topic) ? input.topic : 'Something else'
  const message = input.message.trim().slice(0, 3000)
  const bookingId = input.bookingId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)
  if (message.length < 10) return { ok: false, error: 'Tell us a little more (at least 10 characters).' }

  const { data: profile } = await createAdminClient().from('profiles').select('full_name, phone_number, email, patient_code').eq('id', user.id).maybeSingle()
  const name = profile?.full_name || 'Patient'
  const contact = [profile?.phone_number, profile?.email && !profile.email.endsWith('.internal') ? profile.email : null].filter(Boolean).join(' • ')
  const subject = `Support ticket: ${topic}${bookingId ? ` (booking ${bookingId})` : ''}`
  const lines = [
    `From: ${name}${profile?.patient_code ? ` (Patient ID ${profile.patient_code})` : ''}`,
    `Contact: ${contact || 'none on file'}`,
    `Account: ${user.id}`,
    bookingId ? `Booking ID: ${bookingId}` : null,
    `Topic: ${topic}`,
    '',
    message,
  ].filter((l): l is string => l !== null)

  const to = process.env.SUPPORT_EMAIL || COMPANY.email
  const sent = emailConfigured() ? await sendEmail({ to, subject, paragraphs: lines }) : false
  // Without email set up (or if it failed), the patient's own mail app sends the same ticket.
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
  return { ok: true, sent, mailto }
}
