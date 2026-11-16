import type { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'
import { ORDER_STATUS, type OrderStatus } from '@/lib/equipment'
import { formatINR } from '@/components/patient/format'
import { sendEmail } from './email'

// Emails to a hospital's admins (and doctors) about what the Consult your Doctor team or the hospital decided.

type Admin = ReturnType<typeof createAdminClient>
export type Recipient = { email: string; name: string }

const realEmail = (email: string | null | undefined) => (email && email.includes('@') && !email.endsWith('.internal') ? email : null)

/** The hospital's admin logins that have a real email address. */
export async function hospitalAdmins(admin: Admin, hospitalId: string, alsoProfileId?: string | null): Promise<Recipient[]> {
  const { data } = await admin
    .from('profiles')
    .select('full_name, email')
    .or(`and(role.eq.hospital_admin,hospital_id.eq.${hospitalId})${alsoProfileId ? `,id.eq.${alsoProfileId}` : ''}`)
    .limit(10)
  const seen = new Set<string>()
  const out: Recipient[] = []
  for (const p of (data ?? []) as { full_name: string | null; email: string | null }[]) {
    const email = realEmail(p.email)?.toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    out.push({ email, name: p.full_name ?? 'there' })
  }
  return out
}

const ORDER_LINE: Partial<Record<OrderStatus, string>> = {
  confirmed: 'We’ve confirmed your order and are packing it.',
  shipped: 'Your order is on its way.',
  delivered: 'Your order has been delivered. You can rate it from 1 to 5 stars on the Order equipment page.',
  cancelled: 'Your order has been cancelled. If you paid for it, the payment is refunded to the account it was paid from.',
}

/** The team moved an equipment order on (packing, shipped, delivered) or cancelled it. Never throws. */
export async function emailOrderUpdate(admin: Admin, orderId: string, status: OrderStatus, teamNote: string | null) {
  const line = ORDER_LINE[status]
  if (!line) return
  try {
    const { data: order } = await admin.from('equipment_orders').select('hospital_id, placed_by, total').eq('id', orderId).maybeSingle()
    if (!order) return
    const code = orderId.slice(0, 8).toUpperCase()
    for (const r of await hospitalAdmins(admin, order.hospital_id as string, order.placed_by as string | null)) {
      await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: equipment order ${code} is ${ORDER_STATUS[status].label.toLowerCase()}`,
        heading: `Order ${ORDER_STATUS[status].label.toLowerCase()}`,
        paragraphs: [`Dear ${r.name},`, line, ...(teamNote ? [`A note from our team: “${teamNote}”`] : [])],
        facts: [
          ['Order', code],
          ['Status', ORDER_STATUS[status].label],
          ['Total', formatINR(Number(order.total) || 0)],
        ],
        button: { text: 'Open Order equipment', url: `${siteUrl()}/hospital/equipment` },
      }).catch(() => false)
    }
  } catch (err) {
    console.error('order email:', err)
  }
}

/** The hospital approved or declined a doctor's leave request: tell the doctor. Never throws. */
export async function emailLeaveDecision(args: { to: string | null | undefined; doctor: string; hospital: string; dates: string; approved: boolean; reason?: string | null }) {
  const to = realEmail(args.to)
  if (!to) return
  await sendEmail({
    to,
    subject: `Consult Your Doctor: your leave for ${args.dates} was ${args.approved ? 'approved' : 'declined'}`,
    heading: args.approved ? 'Your leave is approved' : 'Your leave request was declined',
    paragraphs: [
      `Dear ${args.doctor},`,
      args.approved
        ? `${args.hospital} approved your leave for ${args.dates}. Your open slots on those days are closed, and the hospital will move the patients already booked.`
        : `${args.hospital} declined your leave request for ${args.dates}.${args.reason ? ` The reason: “${args.reason}”` : ''} Your slots stay as they are.`,
    ],
    button: { text: 'Open Leave & availability', url: `${siteUrl()}/doctor/leave` },
  }).catch(() => false)
}
