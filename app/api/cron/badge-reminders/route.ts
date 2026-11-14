import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/notify/email'
import { siteUrl } from '@/lib/site-url'
import { doctorName, formatShortDate } from '@/components/patient/format'

// Reminds doctors and hospitals that a verified badge is about to end. Badges don't renew by themselves; they can be
// renewed in their last 7 days (app/actions/badges.ts). One reminder 7 days before the end and one the day before,
// unless it has already been renewed. Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`.

export const dynamic = 'force-dynamic'

const DAY = 86_400_000

type BadgeRow = { id: string; subject: 'doctor' | 'hospital'; doctor_id: string | null; hospital_id: string | null; paid_by: string; ends_at: string; reminded_at: string | null }

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = Date.now()
  const { data, error } = await admin
    .from('verified_badges')
    .select('id, subject, doctor_id, hospital_id, paid_by, ends_at, reminded_at')
    .eq('status', 'active')
    .gt('ends_at', new Date(now).toISOString())
    .lte('ends_at', new Date(now + 7 * DAY).toISOString())
    .limit(500)
  // Before 20261115_executive_workspace.sql there is no reminded_at: nothing to do yet.
  if (error) return NextResponse.json({ sent: 0, note: 'Badge reminders need the 20261115 migration.' })

  let sent = 0
  for (const b of (data ?? []) as BadgeRow[]) {
    const ends = Date.parse(b.ends_at)
    const lastDay = ends - now <= DAY
    // Once in the last week, and again on the last day.
    const due = !b.reminded_at || (lastDay && Date.parse(b.reminded_at) < ends - 2 * DAY)
    if (!due) continue

    // Already renewed: a paid badge for the same doctor or hospital waiting to be checked or starting later.
    const key = b.subject === 'doctor' ? 'doctor_id' : 'hospital_id'
    const id = b.subject === 'doctor' ? b.doctor_id : b.hospital_id
    if (!id) continue
    const { data: next } = await admin.from('verified_badges').select('id').eq('subject', b.subject).eq(key, id).neq('id', b.id).in('status', ['in_review', 'active']).limit(1)
    if (next?.length) continue

    const recipients: { email: string; name: string }[] = []
    let who = 'your hospital'
    let renewUrl = `${siteUrl()}/hospital/badges`
    if (b.subject === 'doctor' && b.doctor_id) {
      const { data: d } = await admin.from('doctors').select('hospital_id, profiles!doctors_profile_id_fkey ( full_name, email )').eq('id', b.doctor_id).maybeSingle()
      const p = (Array.isArray(d?.profiles) ? d?.profiles[0] : d?.profiles) as { full_name: string | null; email: string | null } | null
      who = doctorName(p?.full_name)
      renewUrl = `${siteUrl()}/doctor/badge`
      if (p?.email && !p.email.endsWith('.internal')) recipients.push({ email: p.email, name: who })
      if (b.paid_by === 'hospital' && d?.hospital_id) recipients.push(...(await hospitalAdmins(admin, d.hospital_id as string)))
    } else if (b.hospital_id) {
      recipients.push(...(await hospitalAdmins(admin, b.hospital_id)))
    }

    let any = false
    for (const r of recipients) {
      const ok = await sendEmail({
        to: r.email,
        subject: `Consult Your Doctor: the verified badge for ${who} ends ${formatShortDate(b.ends_at)}`,
        paragraphs: [
          `Dear ${r.name},`,
          `The verified badge (the blue tick) for ${who} ends on ${formatShortDate(b.ends_at)}. Badges don’t renew by themselves, so the tick comes off public pages that day unless it is renewed.`,
          'You can renew it now, in its last 7 days; the new period starts when this one ends.',
        ],
        button: { text: 'Renew the badge', url: renewUrl },
      }).catch(() => false)
      any = any || ok
    }
    if (any) {
      await admin.from('verified_badges').update({ reminded_at: new Date().toISOString() }).eq('id', b.id)
      sent++
    }
  }
  return NextResponse.json({ sent })
}

async function hospitalAdmins(admin: ReturnType<typeof createAdminClient>, hospitalId: string) {
  const { data } = await admin.from('profiles').select('full_name, email').eq('role', 'hospital_admin').eq('hospital_id', hospitalId).limit(10)
  return ((data ?? []) as { full_name: string | null; email: string | null }[])
    .filter((p) => p.email && !p.email.endsWith('.internal'))
    .map((p) => ({ email: p.email!, name: p.full_name ?? 'there' }))
}
