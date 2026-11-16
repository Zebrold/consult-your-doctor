import type { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'
import { doctorName } from '@/components/patient/format'
import { sendEmail } from './email'
import { hospitalAdmins, type Recipient } from './hospital'

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
