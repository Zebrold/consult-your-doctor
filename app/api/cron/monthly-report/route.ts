import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { istDateKey } from '@/components/patient/format'
import { prevMonth } from '@/lib/report-stats'
import { buildMonthlyReport } from '@/lib/monthly-report'
import { sendEmail } from '@/lib/notify/email'
import { siteUrl } from '@/lib/site-url'

// Emails last month's platform report to every executive who asked for it on the Reports page. Runs on the 1st
// (vercel.json); Vercel Cron calls it with `Authorization: Bearer <CRON_SECRET>`. Each subscriber gets a month once.

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const month = prevMonth(istDateKey(Date.now()).slice(0, 7))
  const { data: subs, error } = await admin.from('report_subscriptions').select('profile_id, email, last_sent_month').eq('active', true).limit(200)
  if (error) return NextResponse.json({ sent: 0, note: 'Monthly reports need the 20261115 migration.' })
  const due = ((subs ?? []) as { profile_id: string; email: string; last_sent_month: string | null }[]).filter((s) => s.last_sent_month !== month)
  if (!due.length) return NextResponse.json({ sent: 0 })

  // Only executives still in the team get it.
  const { data: execs } = await admin.from('profiles').select('id, full_name').eq('role', 'executive').in('id', due.map((s) => s.profile_id))
  const names = new Map(((execs ?? []) as { id: string; full_name: string | null }[]).map((e) => [e.id, e.full_name ?? 'there']))

  const report = await buildMonthlyReport(admin, month)
  let sent = 0
  for (const s of due) {
    if (!names.has(s.profile_id)) continue
    const ok = await sendEmail({
      to: s.email,
      subject: `Consult Your Doctor: platform report for ${report.title}`,
      paragraphs: [`Dear ${names.get(s.profile_id)},`, `Here is how the platform did in ${report.title}.`, ...report.summary.map(([k, v]) => `${k}: ${v}`), 'The bookings, payments and tickets for the month are attached as spreadsheets.', `Stop these emails from Reports in the executive workspace: ${siteUrl()}/executive/reports`],
      attachments: report.files.map((f) => ({ filename: f.filename, content: f.content, contentType: 'text/csv; charset=utf-8' })),
    }).catch(() => false)
    if (ok) {
      sent++
      await admin.from('report_subscriptions').update({ last_sent_month: month }).eq('profile_id', s.profile_id)
    }
  }
  return NextResponse.json({ sent, month })
}
