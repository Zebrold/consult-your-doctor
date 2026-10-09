'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailConfigured, sendEmail } from '@/lib/notify/email'
import { COMPANY } from '@/lib/company'
import { createSupportTicket } from './tickets'

const TOPICS = ['Booking or appointment', 'Payment or refund', 'Prescription or report', 'Account or sign-in', 'Something else']

export async function raiseSupportTicket(input: { topic: string; bookingId: string; message: string }): Promise<{ ok: true; sent: boolean; mailto: string; ticketCode?: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please sign in to raise a ticket.' }

  const topic = TOPICS.includes(input.topic) ? input.topic : 'Something else'
  const message = input.message.trim().slice(0, 3000)
  const bookingId = input.bookingId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)
  if (message.length < 10) return { ok: false, error: 'Tell us a little more (at least 10 characters).' }

  // 1. Create automated support ticket in database & route to Executive inbox
  const ticketRes = await createSupportTicket({
    category: topic,
    subject: `Support: ${topic}${bookingId ? ` (${bookingId})` : ''}`,
    description: message,
    bookingId: bookingId || undefined,
    role: 'patient'
  })

  const ticketCode = ticketRes.ok ? ticketRes.ticketCode : undefined

  // 2. Format details and email support
  const { data: profile } = await createAdminClient().from('profiles').select('full_name, phone_number, email, patient_code').eq('id', user.id).maybeSingle()
  const name = profile?.full_name || 'Patient'
  const contact = [profile?.phone_number, profile?.email && !profile.email.endsWith('.internal') ? profile.email : null].filter(Boolean).join(' • ')
  const subject = `[${ticketCode || 'SUPPORT'}] ${topic}${bookingId ? ` (booking ${bookingId})` : ''}`
  const lines = [
    ticketCode ? `Ticket ID: ${ticketCode}` : null,
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
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
  return { ok: true, sent, mailto, ticketCode }
}
