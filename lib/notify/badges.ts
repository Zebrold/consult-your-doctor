import type { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'
import { doctorName, formatINR } from '@/components/patient/format'
import { PLAN_LABEL, type BadgePlan } from '@/lib/badges'
import { sendEmail } from './email'
import { hospitalAdmins, profileRecipient, type Recipient } from './hospital'
import { later } from './later'
import { alertTeam } from './team'

// Who hears about a verified badge (reminders and review decisions): the doctor for their own badge, plus the
// hospital's admins when the hospital paid for it; the hospital's admins for a hospital badge.

type Admin = ReturnType<typeof createAdminClient>
export type BadgeSubject = { subject: 'doctor' | 'hospital'; doctor_id: string | null; hospital_id: string | null; paid_by: string | null }

/** The badge's holder ("Dr. A. Rao" or the hospital's name), its page, and who to email. */
export async function badgeAudience(admin: Admin, b: BadgeSubject): Promise<{ who: string; url: string; recipients: Recipient[] }> {
  const recipients: Recipient[] = []
  if (b.subject === 'doctor' && b.doctor_id) {
    const { data: d } = await admin.from('doctors').select('hospital_id, profiles!doctors_profile_id_fkey ( full_name, email )').eq('id', b.doctor_id).maybeSingle()
    const p = (Array.isArray(d?.profiles) ? d?.profiles[0] : d?.profiles) as { full_name: string | null; email: string | null } | null
    const who = doctorName(p?.full_name)
    if (p?.email && !p.email.endsWith('.internal')) recipients.push({ email: p.email, name: who })
    if (b.paid_by === 'hospital' && d?.hospital_id) recipients.push(...(await hospitalAdmins(admin, d.hospital_id as string)))
    return { who, url: `${siteUrl()}/doctor/badge`, recipients }
  }
  if (!b.hospital_id) return { who: 'your hospital', url: `${siteUrl()}/hospital/badges`, recipients }
  const [{ data: h }, admins] = await Promise.all([admin.from('hospitals').select('name').eq('id', b.hospital_id).maybeSingle(), hospitalAdmins(admin, b.hospital_id)])
  return { who: (h?.name as string | undefined) || 'your hospital', url: `${siteUrl()}/hospital/badges`, recipients: admins }
}

/** The badge holder's name: "Dr. A. Rao" for a doctor badge, the hospital's name for a hospital badge. */
async function holderName(admin: Admin, b: { subject: string; doctor_id: string | null; hospital_id: string | null }) {
  if (b.subject === 'doctor' && b.doctor_id) {
    const { data: d } = await admin.from('doctors').select('profiles!doctors_profile_id_fkey ( full_name )').eq('id', b.doctor_id).maybeSingle()
    const p = (Array.isArray(d?.profiles) ? d?.profiles[0] : d?.profiles) as { full_name: string | null } | null
    return doctorName(p?.full_name)
  }
  if (!b.hospital_id) return 'Hospital'
  const { data: h } = await admin.from('hospitals').select('name').eq('id', b.hospital_id).maybeSingle()
  return (h?.name as string | undefined) || 'Hospital'
}

/**
 * A verified badge payment went through (lib/purchases.ts): a receipt to whoever paid (the doctor, or the hospital's
 * admins) and the badges to the team to check. Runs after the response.
 */
export function emailBadgePaid(admin: Admin, paymentId: string) {
  later('badge-paid', async () => {
    const [{ data: pay }, { data: rows }] = await Promise.all([
      admin.from('badge_payments').select('payer_id, hospital_id, amount, razorpay_payment_id').eq('id', paymentId).maybeSingle(),
      admin.from('verified_badges').select('subject, doctor_id, hospital_id, plan').eq('payment_id', paymentId).limit(50),
    ])
    if (!pay) return
    const badges = (rows ?? []) as { subject: string; doctor_id: string | null; hospital_id: string | null; plan: BadgePlan | null }[]
    const names = await Promise.all(badges.map((b) => holderName(admin, b)))
    const amount = formatINR(Number(pay.amount) || 0)
    const plan = badges[0]?.plan ? PLAN_LABEL[badges[0].plan] : null
    const what = names.length === 1 ? `the verified badge for ${names[0]}` : `${names.length} verified badges`
    const recipients: Recipient[] = pay.hospital_id
      ? await hospitalAdmins(admin, pay.hospital_id as string, pay.payer_id as string | null)
      : [await profileRecipient(admin, pay.payer_id as string | null)].filter((r): r is Recipient => !!r)
    const url = pay.hospital_id ? `${siteUrl()}/hospital/badges` : `${siteUrl()}/doctor/badge`

    for (const r of recipients) {
      await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: payment received for ${what}`,
        heading: 'Payment received',
        paragraphs: [
          `Dear ${r.name},`,
          `We’ve received your payment of ${amount} for ${what}. Our team checks the details next; we’ll email you as soon as the badge is live. If we can’t approve it, the payment is refunded.`,
        ],
        facts: [
          ['Amount paid', amount],
          ['Badges', names.join(', ') || '1'],
          ...(plan ? ([['Plan', plan]] as [string, string][]) : []),
          ...(pay.razorpay_payment_id ? ([['Payment ID', pay.razorpay_payment_id as string]] as [string, string][]) : []),
        ],
        button: { text: 'Open verified badges', url },
      }).catch(() => false)
    }
    await alertTeam('badge-paid', {
      subject: `Verified badge to check: ${names.join(', ') || 'new badge'} (${amount})`,
      heading: 'A paid badge is waiting for review',
      lines: [`${amount} was paid for ${what}. Check the details and approve or turn it down.`],
      facts: [['Badges', names.join(', ')], ['Amount paid', amount]],
      page: '/executive/badges',
      button: 'Review badges',
    })
  })
}

/** Emails the team's decision on a paid badge. Never throws. */
export async function emailBadgeDecision(admin: Admin, badgeId: string, decision: 'approved' | 'rejected') {
  try {
    const { data: b } = await admin.from('verified_badges').select('subject, doctor_id, hospital_id, paid_by, ends_at, review_note').eq('id', badgeId).maybeSingle()
    if (!b) return
    const { who, url, recipients } = await badgeAudience(admin, b as BadgeSubject)
    const approved = decision === 'approved'
    const ends = b.ends_at ? new Date(b.ends_at as string).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : null
    for (const r of recipients) {
      await sendEmail({
        to: r.email,
        subject: approved ? `Consult Your Doctor: the verified badge for ${who} is live` : `Consult Your Doctor: the verified badge for ${who} wasn’t approved`,
        heading: approved ? 'Your verified badge is live' : 'Your verified badge wasn’t approved',
        paragraphs: [
          `Dear ${r.name},`,
          approved
            ? `We’ve checked the details, and the verified badge (the blue tick) for ${who} now shows on public pages.${ends ? ` It runs until ${ends} and doesn’t renew by itself; you can renew it in its last 7 days.` : ''}`
            : `We couldn’t approve the verified badge for ${who}.${b.review_note ? ` The reason: “${b.review_note}”` : ''} The payment for it is refunded to the account it was paid from.`,
        ],
        button: { text: approved ? 'See your badge' : 'Open verified badges', url },
      }).catch(() => false)
    }
  } catch (err) {
    console.error('badge decision email:', err)
  }
}
