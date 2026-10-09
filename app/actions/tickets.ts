'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTicketConfirmationEmail, sendTicketReplyEmail, sendEmail, emailConfigured } from '@/lib/notify/email'
import { sendTicketUpdateSms } from '@/lib/notify/sms'
import { revalidatePath } from 'next/cache'

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

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

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

  let requesterName = input.guestName?.trim() || 'User'
  let requesterEmail = input.guestEmail?.trim() || null
  let requesterPhone = input.guestPhone?.trim() || null
  let requesterRole = input.role || 'patient'
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

  const category = input.category?.trim() || 'General Inquiry'
  const subject = input.subject?.trim() || `${category} - ${requesterName}`
  const description = input.description?.trim()
  if (!description || description.length < 5) {
    return { ok: false, error: 'Please describe the issue in detail (at least 5 characters).' }
  }

  const bookingId = input.bookingId?.trim().toUpperCase().slice(0, 30) || null
  const paymentId = input.paymentId?.trim().slice(0, 50) || null
  const priority = input.priority || 'medium'

  // Generate unique ticket code
  let ticketCode = `CYD-TICK-${Date.now().toString().slice(-6)}`
  try {
    const { count } = await admin.from('tickets').select('*', { count: 'exact', head: true })
    ticketCode = `CYD-TICK-${String(1000 + (count ?? 0) + 1)}`
  } catch {
    // Sequence fallback
  }

  // Attempt database insertion
  const { data: inserted, error: insertError } = await admin.from('tickets').insert({
    ticket_code: ticketCode,
    user_id: userId,
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
    status: 'open'
  }).select('id, ticket_code').maybeSingle()

  if (insertError) {
    console.warn('tickets table insert fallback:', insertError.message)
    // If table not migrated yet, email the ticket directly to support inbox
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@consultyourdoctor.de'
    await sendEmail({
      to: supportEmail,
      subject: `[${ticketCode}] Support Request: ${subject}`,
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
      siteUrl: SITE_URL
    }).catch((e) => console.error('Ticket confirmation email error:', e))
  }

  // Notify requester via SMS if phone available
  if (requesterPhone) {
    await sendTicketUpdateSms(requesterPhone, ticketCode, 'open').catch(() => null)
  }

  revalidatePath('/executive/support')
  revalidatePath('/patient/support')
  return { ok: true, ticketCode }
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
  const admin = createAdminClient()

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

  const tickets: SupportTicket[] = rows.map((r: any) => ({
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
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (!rows) return []
  return rows.map((r: any) => ({
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: execProfile } = await admin.from('profiles').select('full_name, role').eq('id', user.id).single()
  const execName = execProfile?.full_name || 'Executive Officer'

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
      siteUrl: SITE_URL
    }).catch(() => null)
  }

  // Notify requester via SMS
  if (ticket.requester_phone) {
    await sendTicketUpdateSms(ticket.requester_phone, ticket.ticket_code, status).catch(() => null)
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: execProfile } = await admin.from('profiles').select('full_name, role').eq('id', user.id).single()
  const execName = execProfile?.full_name || 'Executive'

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
      siteUrl: SITE_URL
    }).catch(() => null)
  }

  revalidatePath('/executive/support')
  return { success: true }
}

/** Assigns a ticket to an executive */
export async function assignTicket(ticketId: string, executiveId: string): Promise<{ success: boolean }> {
  const admin = createAdminClient()
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
  return rows.map((r: any) => ({
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
