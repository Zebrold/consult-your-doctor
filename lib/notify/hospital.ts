import type { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'
import { ORDER_STATUS, type OrderStatus } from '@/lib/equipment'
import { doctorName, formatINR } from '@/components/patient/format'
import { sendEmail } from './email'
import { later } from './later'
import { alertTeam } from './team'

// Emails to a hospital's admins (and doctors) about what the Consult your Doctor team, the hospital or the doctor did.

type Admin = ReturnType<typeof createAdminClient>
export type Recipient = { email: string; name: string }

const realEmail = (email: string | null | undefined) => (email && email.includes('@') && !email.endsWith('.internal') ? email : null)

/** One sign-in account as a recipient (null without a real email address). */
export async function profileRecipient(admin: Admin, profileId: string | null | undefined): Promise<Recipient | null> {
  if (!profileId) return null
  const { data } = await admin.from('profiles').select('full_name, email').eq('id', profileId).maybeSingle()
  const email = realEmail(data?.email)
  return email ? { email, name: (data?.full_name as string | null) || 'there' } : null
}

/** A doctor's display name ("Dr. A. Rao"), email (null when they have none) and home hospital. */
async function doctorContact(admin: Admin, doctorId: string) {
  const { data } = await admin.from('doctors').select('hospital_id, profiles!doctors_profile_id_fkey ( full_name, email )').eq('id', doctorId).maybeSingle()
  const p = (Array.isArray(data?.profiles) ? data?.profiles[0] : data?.profiles) as { full_name: string | null; email: string | null } | null
  return { name: doctorName(p?.full_name ?? 'Doctor'), email: realEmail(p?.email), hospitalId: (data?.hospital_id as string | null) ?? null }
}

const hospitalName = async (admin: Admin, hospitalId: string | null | undefined) => {
  if (!hospitalId) return 'the hospital'
  const { data } = await admin.from('hospitals').select('name').eq('id', hospitalId).maybeSingle()
  return (data?.name as string | undefined) || 'the hospital'
}

/** A doctor asked for leave: the hospital's admins approve or decline it. Runs after the response. */
export function emailLeaveRequested(admin: Admin, args: { doctorId: string; hospitalId: string; dates: string; reason: string; note: string | null }) {
  later('leave-request', async () => {
    const [doctor, admins] = await Promise.all([doctorContact(admin, args.doctorId), hospitalAdmins(admin, args.hospitalId)])
    for (const r of admins) {
      await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: ${doctor.name} asked for leave on ${args.dates}`,
        heading: 'New leave request',
        paragraphs: [
          `Dear ${r.name},`,
          `${doctor.name} asked for leave on ${args.dates}. Approving it closes their open slots on those days, and we tell the patients already booked that you’ll move their visit.`,
          ...(args.note ? [`Their note: “${args.note}”`] : []),
        ],
        facts: [
          ['Doctor', doctor.name],
          ['Dates', args.dates],
          ['Reason', args.reason],
        ],
        button: { text: 'Review the request', url: `${siteUrl()}/hospital/doctors/leave` },
      })
    }
  })
}

/** The invited doctor accepted or declined consulting at the hospital: tell its admins. Runs after the response. */
export function emailPracticeAnswered(admin: Admin, practiceId: string, accepted: boolean) {
  later('practice-answer', async () => {
    const { data: link } = await admin.from('doctor_practices').select('doctor_id, hospital_id, invited_by').eq('id', practiceId).maybeSingle()
    if (!link) return
    const [doctor, admins] = await Promise.all([doctorContact(admin, link.doctor_id as string), hospitalAdmins(admin, link.hospital_id as string, link.invited_by as string | null)])
    for (const r of admins) {
      await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: ${doctor.name} ${accepted ? 'accepted' : 'declined'} your invitation`,
        heading: accepted ? 'Invitation accepted' : 'Invitation declined',
        paragraphs: [
          `Dear ${r.name},`,
          accepted
            ? `${doctor.name} accepted your invitation to consult at your hospital. Our team now confirms the link; we’ll email you once it’s confirmed, and then you can publish their slots at your address.`
            : `${doctor.name} declined your invitation to consult at your hospital.`,
        ],
        button: { text: 'Open Doctors', url: `${siteUrl()}/hospital/doctors` },
      })
    }
    if (accepted) {
      await alertTeam('practice-review', {
        subject: `Practice link to confirm: ${doctor.name} at ${await hospitalName(admin, link.hospital_id as string)}`,
        heading: 'A practice link is waiting',
        lines: [`${doctor.name} accepted an invitation to consult at another hospital. Confirm or turn down the link.`],
        page: '/executive/branches',
        button: 'Review practice links',
      })
    }
  })
}

/** The team confirmed or turned down a link the doctor accepted: tell the doctor and the hospital. Runs after the response. */
export function emailPracticeReviewed(admin: Admin, practiceId: string, confirmed: boolean, note: string | null) {
  later('practice-review', async () => {
    const { data: link } = await admin.from('doctor_practices').select('doctor_id, hospital_id, invited_by').eq('id', practiceId).maybeSingle()
    if (!link) return
    const [doctor, hospital, admins] = await Promise.all([
      doctorContact(admin, link.doctor_id as string),
      hospitalName(admin, link.hospital_id as string),
      hospitalAdmins(admin, link.hospital_id as string, link.invited_by as string | null),
    ])
    const reason = !confirmed && note ? ` The reason: “${note}”` : ''
    if (doctor.email) {
      await sendEmail({
        to: doctor.email,
        subject: `Consult Your Doctor: your link with ${hospital} is ${confirmed ? 'confirmed' : 'not confirmed'}`,
        heading: confirmed ? 'Your practice link is confirmed' : 'Your practice link wasn’t confirmed',
        paragraphs: [
          `Dear ${doctor.name},`,
          confirmed
            ? `Our team confirmed that you consult at ${hospital} too. The hospital can now publish your slots at its address; your own hospital’s slots don’t change.`
            : `We couldn’t confirm the link between you and ${hospital}.${reason}`,
        ],
        button: { text: 'Open Practice', url: `${siteUrl()}/doctor/practice` },
      })
    }
    for (const r of admins) {
      await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: ${doctor.name} is ${confirmed ? 'confirmed' : 'not confirmed'} at ${hospital}`,
        heading: confirmed ? 'Visiting doctor confirmed' : 'Visiting doctor not confirmed',
        paragraphs: [
          `Dear ${r.name},`,
          confirmed
            ? `Our team confirmed ${doctor.name} as a visiting doctor at ${hospital}. You can now publish their slots from Doctors.`
            : `We couldn’t confirm ${doctor.name} as a visiting doctor at ${hospital}.${reason}`,
        ],
        button: { text: 'Open Doctors', url: `${siteUrl()}/hospital/doctors` },
      })
    }
  })
}

/** The hospital paused or resumed a doctor's new online bookings: tell the doctor. Runs after the response. */
export function emailDoctorPaused(admin: Admin, doctorId: string, hospitalId: string, paused: boolean) {
  later('doctor-paused', async () => {
    const [doctor, hospital] = await Promise.all([doctorContact(admin, doctorId), hospitalName(admin, hospitalId)])
    if (!doctor.email) return
    await sendEmail({
      to: doctor.email,
      subject: `Consult Your Doctor: ${hospital} ${paused ? 'paused' : 'resumed'} your online bookings`,
      heading: paused ? 'Your online bookings are paused' : 'Your online bookings are back on',
      paragraphs: [
        `Dear ${doctor.name},`,
        paused
          ? `${hospital} paused new online bookings for you, so patients can’t find or book you for now. Bookings already made stay as they are. Only the hospital can switch them back on.`
          : `${hospital} switched your online bookings back on. Patients can find and book you again.`,
      ],
      button: { text: 'Open your dashboard', url: `${siteUrl()}/doctor/dashboard` },
    })
  })
}

/** An equipment order was paid: a receipt to the hospital's admins and the order to the team. Runs after the response. */
export function emailOrderPlaced(admin: Admin, orderId: string) {
  later('order-placed', async () => {
    const [{ data: order }, { data: items }] = await Promise.all([
      admin.from('equipment_orders').select('code, hospital_id, placed_by, delivery_fee, total, razorpay_payment_id').eq('id', orderId).maybeSingle(),
      admin.from('equipment_order_items').select('name, quantity, price').eq('order_id', orderId).limit(50),
    ])
    if (!order) return
    const code = (order.code as string | null) || orderId.slice(0, 8).toUpperCase()
    const lines = ((items ?? []) as { name: string; quantity: number; price: number | string }[]).map(
      (i) => [`${i.name} × ${i.quantity}`, formatINR((Number(i.price) || 0) * i.quantity)] as [string, string],
    )
    const total = formatINR(Number(order.total) || 0)
    const delivery = Number(order.delivery_fee) || 0
    const [hospital, admins] = await Promise.all([hospitalName(admin, order.hospital_id as string), hospitalAdmins(admin, order.hospital_id as string, order.placed_by as string | null)])
    for (const r of admins) {
      await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: payment received for equipment order ${code}`,
        heading: 'Order placed',
        paragraphs: [`Dear ${r.name},`, `We’ve received your payment of ${total} for order ${code}. Our team confirms the order and emails you when it ships.`],
        facts: [
          ['Order', code],
          ...lines.slice(0, 10),
          ...(lines.length > 10 ? ([[`and ${lines.length - 10} more`, '']] as [string, string][]) : []),
          ['Delivery', delivery ? formatINR(delivery) : 'Free'],
          ['Total paid', total],
          ...(order.razorpay_payment_id ? ([['Payment ID', order.razorpay_payment_id as string]] as [string, string][]) : []),
        ],
        button: { text: 'Open Order equipment', url: `${siteUrl()}/hospital/equipment` },
      })
    }
    await alertTeam('order-placed', {
      subject: `New equipment order ${code} from ${hospital} (${total})`,
      heading: 'New equipment order',
      lines: [`${hospital} paid ${total} for order ${code}. Confirm it and send it on.`],
      facts: [['Order', code], ['Hospital', hospital], ['Items', String(lines.length)], ['Total paid', total]],
      page: '/executive/equipment',
      button: 'Open Equipment',
    })
  })
}

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

/** How the subject and heading say the status ("confirmed" reads better than the page's "Packing" label). */
const ORDER_WORD: Partial<Record<OrderStatus, string>> = { confirmed: 'confirmed', shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled' }

/** The team moved an equipment order on (packing, shipped, delivered) or cancelled it. Never throws. */
export async function emailOrderUpdate(admin: Admin, orderId: string, status: OrderStatus, teamNote: string | null) {
  const line = ORDER_LINE[status]
  if (!line) return
  try {
    const { data: order } = await admin.from('equipment_orders').select('code, hospital_id, placed_by, total').eq('id', orderId).maybeSingle()
    if (!order) return
    const code = (order.code as string | null) || orderId.slice(0, 8).toUpperCase()
    for (const r of await hospitalAdmins(admin, order.hospital_id as string, order.placed_by as string | null)) {
      await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: equipment order ${code} is ${ORDER_WORD[status] ?? ORDER_STATUS[status].label.toLowerCase()}`,
        heading: `Order ${ORDER_WORD[status] ?? ORDER_STATUS[status].label.toLowerCase()}`,
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
