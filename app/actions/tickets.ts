'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executiveFor } from '@/app/executive/_lib/ops'
import { sendTicketConfirmationEmail, sendTicketReplyEmail, sendEmail } from '@/lib/notify/email'
import { sendTicketUpdateSms } from '@/lib/notify/sms'
import { notifyTicketWhatsApp } from '@/lib/notify/patient'
import { revalidatePath } from 'next/cache'
import { randomInt } from 'node:crypto'
import { siteUrl } from '@/lib/site-url'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { TICKET_CATEGORIES, stepsFor } from '@/lib/support-desk'

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'awaiting_response' | 'resolved' | 'closed'

export type SupportTicket = {
  id: string
  ticketCode: string
  userId: string | null
  requesterName: string
  requesterEmail: string | null
  requesterPhone: string | null
  requesterRole: string
  category: string
  subject: string
  description: string
  relatedBookingId: string | null
  relatedPaymentId: string | null
  priority: TicketPriority
  status: TicketStatus
  assignedTo: string | null
  assignedName?: string | null
  resolutionNotes: string | null
  createdAt: string
  updatedAt: string
}

export type TicketMessage = {
  id: string
  ticketId: string
  senderId: string | null
  senderRole: string
  senderName: string
  message: string
  statusChange: string | null
  createdAt: string
}


/** The signed-in executive whose team may use Support; null for everyone else (including other teams' executives). */
async function supportStaff() {
  const ctx = await executiveFor('support')
  return ctx ? { user: ctx.user, admin: ctx.admin, name: ctx.fullName as string | null } : null
}

/** Creates a support ticket and notifies executive support and the requester */
export async function createSupportTicket(input: {
  category: string
  subject?: string
  description: string
  bookingId?: string
  paymentId?: string
  priority?: TicketPriority
  role?: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
}): Promise<{ ok: true; ticketCode: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Every ticket sends a confirmation to the address and number given, so cap how often one network, account or
  // contact can raise one; otherwise the form would send messages to anyone, as often as anyone likes.
  const ip = (await clientIp()) ?? 'unknown'
  const contactKey = (user?.id || input.guestEmail?.trim().toLowerCase() || input.guestPhone?.replace(/\D/g, '') || '').slice(0, 120)
  const ipLimited = await overLimit(`ticket:ip:${ip}`, user ? 10 : 5, 60 * 60_000)
  const contactLimited = contactKey ? await overLimit(`ticket:contact:${contactKey}`, 5, 24 * 60 * 60_000) : false
  if (ipLimited || contactLimited) {
    return { ok: false, error: 'You have raised several tickets recently. Our team will reply to those first; please try again later.' }
  }

  let requesterName = input.guestName?.trim().slice(0, 120) || 'User'
  let requesterEmail = input.guestEmail?.trim().slice(0, 200) || null
  let requesterPhone = input.guestPhone?.trim().slice(0, 20) || null
  if (requesterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) requesterEmail = null
  if (requesterPhone && !/^\+?[\d\s-]{10,16}$/.test(requesterPhone)) requesterPhone = null
  // Signed-in requesters get their role from their profile below; a visitor can't claim one.
  let requesterRole = user ? 'patient' : 'visitor'
  const userId = user?.id || null

  if (user) {
    const { data: profile } = await admin.from('profiles').select('full_name, email, phone_number, role').eq('id', user.id).maybeSingle()
    if (profile) {
      requesterName = profile.full_name || requesterName
      requesterEmail = (profile.email && !profile.email.endsWith('.internal')) ? profile.email : requesterEmail
      requesterPhone = profile.phone_number || requesterPhone
      requesterRole = profile.role || requesterRole
    }
  }

  const category = input.category?.trim().slice(0, 80) || 'General Inquiry'
  const subject = input.subject?.trim().slice(0, 200) || `${category} - ${requesterName}`
  const description = input.description?.trim().slice(0, 5000)
  if (!description || description.length < 5) {
    return { ok: false, error: 'Please describe the issue in detail (at least 5 characters).' }
  }

  const bookingId = input.bookingId?.trim().toUpperCase().slice(0, 30) || null
  const paymentId = input.paymentId?.trim().slice(0, 50) || null
  // Only the support team sets urgency; a requester's choice is kept within the normal range.
  const priority: TicketPriority = input.priority === 'low' || input.priority === 'high' ? input.priority : 'medium'

  const res = await insertAndNotifyTicket(admin, {
    userId, requesterName, requesterEmail, requesterPhone, requesterRole, category, subject, description, bookingId, paymentId, priority,
  })
  if (!res.ok) return res
  return { ok: true, ticketCode: res.ticketCode }
}

type NewTicket = {
  userId: string | null
  requesterName: string
  requesterEmail: string | null
  requesterPhone: string | null
  requesterRole: string
  category: string
  subject: string
  description: string
  bookingId: string | null
  paymentId: string | null
  priority: TicketPriority
  assignedTo?: string | null
}

/** Inserts the ticket (code retried once if taken) and sends the requester their confirmation by email, SMS and WhatsApp. */
async function insertAndNotifyTicket(
  admin: ReturnType<typeof createAdminClient>,
  t: NewTicket
): Promise<{ ok: true; ticketCode: string; id: string | null } | { ok: false; error: string }> {
  const { requesterName, requesterEmail, requesterPhone, requesterRole, category, subject, description, bookingId, paymentId, priority } = t

  // Random six-digit code (a row count repeats when two tickets are raised at once); retried once if the code is taken.
  const newCode = () => `CYD-TICK-${randomInt(100000, 1000000)}`
  let ticketCode = newCode()
  const insertTicket = () => admin.from('tickets').insert({
    ticket_code: ticketCode,
    user_id: t.userId,
    requester_name: requesterName,
    requester_email: requesterEmail,
    requester_phone: requesterPhone,
    requester_role: requesterRole,
    category,
    subject,
    description,
    related_booking_id: bookingId,
    related_payment_id: paymentId,
    priority,
    status: 'open',
    ...(t.assignedTo ? { assigned_to: t.assignedTo } : {}),
  }).select('id, ticket_code').maybeSingle()

  // Attempt database insertion
  let { data: inserted, error: insertError } = await insertTicket()
  if (insertError?.code === '23505') {
    ticketCode = newCode()
    ;({ data: inserted, error: insertError } = await insertTicket())
  }

  if (insertError) {
    // Only a table that isn't migrated yet falls back to email; any other failure is reported, not hidden.
    if (insertError.code !== '42P01' && insertError.code !== 'PGRST205') {
      console.error('Ticket insert failed:', insertError.message)
      return { ok: false, error: 'We could not raise your ticket right now. Please try again.' }
    }
    console.warn('tickets table insert fallback:', insertError.message)
    // If table not migrated yet, email the ticket directly to support inbox
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@consultyourdoctor.de'
    await sendEmail({
      to: supportEmail,
      subject: `[${ticketCode}] Support Request: ${subject}`,
      heading: 'New support request',
      paragraphs: [
        `Requester: ${requesterName} (${requesterRole})`,
        `Contact: ${[requesterEmail, requesterPhone].filter(Boolean).join(' • ') || 'None'}`,
        bookingId ? `Booking ID: ${bookingId}` : '',
        paymentId ? `Payment Ref: ${paymentId}` : '',
        `Category: ${category}`,
        `Priority: ${priority}`,
        '',
        description
      ].filter(Boolean)
    }).catch(() => null)
  }

  // Notify requester via email if email available
  if (requesterEmail) {
    await sendTicketConfirmationEmail({
      to: requesterEmail,
      requesterName,
      ticketCode,
      category,
      subject,
      siteUrl: siteUrl(),
      role: requesterRole
    }).catch((e) => console.error('Ticket confirmation email error:', e))
  }

  // Notify requester via SMS & WhatsApp if phone available
  if (requesterPhone) {
    await sendTicketUpdateSms(requesterPhone, ticketCode, 'open').catch(() => null)
    notifyTicketWhatsApp({ phone: requesterPhone, name: requesterName, ticketCode, status: 'open' })
  }


  revalidatePath('/executive/support')
  revalidatePath('/patient/support')
  return { ok: true, ticketCode, id: (inserted as { id: string } | null)?.id ?? null }
}

const callerTicketSchema = z.object({
  name: z.string().trim().min(2, 'Enter the caller’s name.').max(120),
  phone: z.string().transform((s) => s.replace(/[\s-]/g, '')).pipe(z.string().regex(/^\+?\d{10,13}$/, 'Enter a valid phone number (10 to 13 digits).')),
  email: z.string().trim().max(200).optional().transform((s) => s || undefined).pipe(z.string().email('Enter a valid email, or leave it blank.').optional()),
  category: z.string().refine((c) => TICKET_CATEGORIES.some((x) => x.key === c), 'Choose a category.'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().trim().min(5, 'Describe the issue (at least 5 characters).').max(5000),
})

/**
 * A support executive raises a ticket for someone who called. It isn't linked to any account (no lookup by phone or
 * email), is assigned to the executive, and the caller gets the usual confirmation if they gave contact details.
 */
export async function createTicketForCaller(input: {
  name: string
  phone: string
  email?: string
  category: string
  priority: TicketPriority
  description: string
}): Promise<{ ok: true; ticketCode: string } | { ok: false; error: string }> {
  const staff = await supportStaff()
  if (!staff) return { ok: false, error: 'Your team can’t raise support tickets.' }
  const parsed = callerTicketSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the details and try again.' }
  const v = parsed.data
  if (await overLimit(`ticket:desk:${staff.user.id}`, 60, 60 * 60_000)) {
    return { ok: false, error: 'You have raised many tickets in the last hour. Please try again later.' }
  }

  const label = TICKET_CATEGORIES.find((c) => c.key === v.category)?.label ?? 'Other'
  const execName = staff.name || 'Executive'
  const res = await insertAndNotifyTicket(staff.admin, {
    userId: null,
    requesterName: v.name,
    requesterEmail: v.email ?? null,
    requesterPhone: v.phone,
    requesterRole: 'visitor',
    category: label,
    subject: `${label} - ${v.name}`.slice(0, 200),
    description: v.description,
    bookingId: null,
    paymentId: null,
    priority: v.priority,
    assignedTo: staff.user.id,
  })
  if (!res.ok) return res

  if (res.id) {
    await staff.admin.from('ticket_messages').insert({
      ticket_id: res.id,
      sender_id: staff.user.id,
      sender_role: 'internal',
      sender_name: execName,
      message: `Raised by ${execName} on a call.`,
    })
  }
  return { ok: true, ticketCode: res.ticketCode }
}

/** Fetches all tickets for Executive Panel review */
export async function getExecutiveTickets(filter?: {
  status?: string
  priority?: string
  search?: string
}): Promise<{
  tickets: SupportTicket[]
  stats: { total: number; open: number; inProgress: number; awaiting: number; resolved: number; closed: number }
}> {
  const staff = await supportStaff()
  if (!staff) return { tickets: [], stats: { total: 0, open: 0, inProgress: 0, awaiting: 0, resolved: 0, closed: 0 } }
  const { admin } = staff

  let query = admin.from('tickets').select(`
    id, ticket_code, user_id, requester_name, requester_email, requester_phone,
    requester_role, category, subject, description, related_booking_id,
    related_payment_id, priority, status, assigned_to, resolution_notes,
    created_at, updated_at
  `).order('created_at', { ascending: false })

  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status)
  }
  if (filter?.priority && filter.priority !== 'all') {
    query = query.eq('priority', filter.priority)
  }

  const { data: rows, error } = await query
  if (error || !rows) {
    return {
      tickets: [],
      stats: { total: 0, open: 0, inProgress: 0, awaiting: 0, resolved: 0, closed: 0 }
    }
  }

  const tickets: SupportTicket[] = rows.map((r) => ({
    id: r.id,
    ticketCode: r.ticket_code,
    userId: r.user_id,
    requesterName: r.requester_name,
    requesterEmail: r.requester_email,
    requesterPhone: r.requester_phone,
    requesterRole: r.requester_role,
    category: r.category,
    subject: r.subject,
    description: r.description,
    relatedBookingId: r.related_booking_id,
    relatedPaymentId: r.related_payment_id,
    priority: r.priority,
    status: r.status,
    assignedTo: r.assigned_to,
    resolutionNotes: r.resolution_notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }))

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    awaiting: tickets.filter((t) => t.status === 'awaiting_response').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length
  }

  return { tickets, stats }
}

/** Fetches ticket messages / audit history */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  // Support staff see every thread; anyone else only the tickets they raised.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const admin = createAdminClient()
  const staff = !!(await supportStaff())
  if (!staff) {
    const { data: own } = await admin.from('tickets').select('id').eq('id', ticketId).eq('user_id', user.id).maybeSingle()
    if (!own) return []
  }
  let query = admin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  // Internal notes are for the support team only; the person who raised the ticket never sees them.
  if (!staff) query = query.neq('sender_role', 'internal')
  const { data: rows } = await query

  if (!rows) return []
  return rows.map((r) => ({
    id: r.id,
    ticketId: r.ticket_id,
    senderId: r.sender_id,
    senderRole: r.sender_role,
    senderName: r.sender_name,
    message: r.message,
    statusChange: r.status_change,
    createdAt: r.created_at
  }))
}

/** Updates a ticket status and resolution notes, and notifies the requester */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  resolutionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await supportStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }
  const { user, admin } = staff
  const execName = staff.name || 'Executive Officer'

  // Fetch ticket details before updating
  const { data: ticket } = await admin.from('tickets').select('*').eq('id', ticketId).single()
  if (!ticket) return { success: false, error: 'Ticket not found' }

  const { error } = await admin.from('tickets').update({
    status,
    resolution_notes: resolutionNotes !== undefined ? resolutionNotes : ticket.resolution_notes,
    updated_at: new Date().toISOString()
  }).eq('id', ticketId)

  if (error) return { success: false, error: error.message }

  // Record status transition in ticket_messages
  try {
    await admin.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_role: 'executive',
      sender_name: execName,
      message: resolutionNotes ? `Status updated to ${status.toUpperCase().replace(/_/g, ' ')}. Note: ${resolutionNotes}` : `Status marked as ${status.toUpperCase().replace(/_/g, ' ')}.`,
      status_change: status
    })
  } catch {}

  // Notify requester via email
  if (ticket.requester_email) {
    await sendTicketReplyEmail({
      to: ticket.requester_email,
      requesterName: ticket.requester_name,
      ticketCode: ticket.ticket_code,
      executiveName: execName,
      message: resolutionNotes || `Ticket status has been updated to ${status.toUpperCase().replace(/_/g, ' ')}.`,
      status,
      siteUrl: siteUrl(),
      role: ticket.requester_role
    }).catch(() => null)
  }

  // Notify requester via SMS & WhatsApp
  if (ticket.requester_phone) {
    await sendTicketUpdateSms(ticket.requester_phone, ticket.ticket_code, status).catch(() => null)
    notifyTicketWhatsApp({ phone: ticket.requester_phone, name: ticket.requester_name, ticketCode: ticket.ticket_code, status })
  }


  revalidatePath('/executive/support')
  revalidatePath('/patient/support')
  return { success: true }
}

/** Sends an executive reply to a ticket */
export async function replyToTicket(
  ticketId: string,
  message: string,
  newStatus: TicketStatus = 'awaiting_response'
): Promise<{ success: boolean; error?: string }> {
  const staff = await supportStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }
  const { user, admin } = staff
  const execName = staff.name || 'Executive'

  const { data: ticket } = await admin.from('tickets').select('*').eq('id', ticketId).single()
  if (!ticket) return { success: false, error: 'Ticket not found' }

  // Insert reply
  await admin.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: user.id,
    sender_role: 'executive',
    sender_name: execName,
    message: message.trim(),
    status_change: newStatus
  })

  // Update ticket status
  await admin.from('tickets').update({
    status: newStatus,
    updated_at: new Date().toISOString()
  }).eq('id', ticketId)

  // Send email to requester
  if (ticket.requester_email) {
    await sendTicketReplyEmail({
      to: ticket.requester_email,
      requesterName: ticket.requester_name,
      ticketCode: ticket.ticket_code,
      executiveName: execName,
      message: message.trim(),
      status: newStatus,
      siteUrl: siteUrl(),
      role: ticket.requester_role
    }).catch(() => null)
  }

  revalidatePath('/executive/support')
  return { success: true }
}

/** Assigns a ticket to an executive */
export async function assignTicket(ticketId: string, executiveId: string): Promise<{ success: boolean }> {
  const staff = await supportStaff()
  if (!staff) return { success: false }
  const { admin } = staff
  await admin.from('tickets').update({ assigned_to: executiveId, updated_at: new Date().toISOString() }).eq('id', ticketId)
  revalidatePath('/executive/support')
  return { success: true }
}

/** Fetches a signed-in user's tickets */
export async function getUserTickets(): Promise<SupportTicket[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!rows) return []
  return rows.map((r) => ({
    id: r.id,
    ticketCode: r.ticket_code,
    userId: r.user_id,
    requesterName: r.requester_name,
    requesterEmail: r.requester_email,
    requesterPhone: r.requester_phone,
    requesterRole: r.requester_role,
    category: r.category,
    subject: r.subject,
    description: r.description,
    relatedBookingId: r.related_booking_id,
    relatedPaymentId: r.related_payment_id,
    priority: r.priority,
    status: r.status,
    assignedTo: r.assigned_to,
    resolutionNotes: r.resolution_notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }))
}

/** An internal note on a ticket: only the support team sees it, and the requester isn't told. */
export async function addInternalNote(ticketId: string, note: string): Promise<{ success: boolean; error?: string }> {
  const staff = await supportStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }
  const text = note.trim().slice(0, 2000)
  if (!text) return { success: false, error: 'Write the note first.' }
  const { error } = await staff.admin.from('ticket_messages').insert({ ticket_id: ticketId, sender_id: staff.user.id, sender_role: 'internal', sender_name: staff.name || 'Executive', message: text })
  if (error) return { success: false, error: 'Could not save the note.' }
  revalidatePath('/executive/support')
  return { success: true }
}

const STEPS_NOT_READY = 'Steps open after the next update.'

/** Ticks or unticks one "Steps to solve" step on a ticket. Stored in ticket_steps (migration 20261118 section 5). */
export async function setTicketStep(ticketId: string, stepKey: string, done: boolean): Promise<{ success: boolean; error?: string; notReady?: boolean }> {
  const staff = await supportStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }
  const parsed = z.object({ ticketId: z.string().uuid(), stepKey: z.string().min(1).max(60), done: z.boolean() }).safeParse({ ticketId, stepKey, done })
  if (!parsed.success) return { success: false, error: 'That step is not valid.' }
  const { data: ticket } = await staff.admin.from('tickets').select('category').eq('id', ticketId).maybeSingle()
  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (!stepsFor((ticket as { category: string }).category ?? '').some((s) => s.key === stepKey)) return { success: false, error: 'That step is not valid.' }

  const res = done
    ? await staff.admin.from('ticket_steps').upsert(
        { ticket_id: ticketId, step_key: stepKey, done_by: staff.user.id, done_by_name: staff.name || 'Executive', done_at: new Date().toISOString() },
        { onConflict: 'ticket_id,step_key' }
      )
    : await staff.admin.from('ticket_steps').delete().eq('ticket_id', ticketId).eq('step_key', stepKey)
  if (res.error) {
    if (res.error.code === '42P01' || res.error.code === 'PGRST205') return { success: false, error: STEPS_NOT_READY, notReady: true }
    return { success: false, error: 'Could not save that step.' }
  }
  return { success: true }
}

const TEAMS = ['management', 'operations', 'finance', 'support'] as const
const TEAM_NAMES: Record<(typeof TEAMS)[number], string> = { management: 'Management', operations: 'Operations', finance: 'Finance', support: 'Support' }

/** Hands a ticket to a team (Finance for payouts, say), leaving an internal note saying so. */
export async function setTicketTeam(ticketId: string, team: string | null): Promise<{ success: boolean; error?: string }> {
  const staff = await supportStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }
  if (team !== null && !(TEAMS as readonly string[]).includes(team)) return { success: false, error: 'Unknown team.' }
  const { error } = await staff.admin.from('tickets').update({ team, updated_at: new Date().toISOString() }).eq('id', ticketId)
  if (error) return { success: false, error: 'Teams for tickets aren’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.' }
  await staff.admin.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: staff.user.id,
    sender_role: 'internal',
    sender_name: staff.name || 'Executive',
    message: team ? `Moved to ${TEAM_NAMES[team as (typeof TEAMS)[number]]}.` : 'Taken back from the team.',
  })
  revalidatePath('/executive/support')
  return { success: true }
}
