'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Result = { ok: true; email: string | null } | { ok: false; error: string }

/**
 * Starts or stops the monthly platform report email for the signed-in executive (Reports, "Schedule a monthly
 * email"). It goes out on the 1st for the month before (app/api/cron/monthly-report).
 */
export async function setMonthlyReport(on: boolean, rawEmail?: string): Promise<Result> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role, email').eq('id', user.id).maybeSingle()
  if (me?.role !== 'executive') return { ok: false, error: 'Only the Consult your Doctor team can schedule reports.' }

  if (!on) {
    const { error } = await admin.from('report_subscriptions').update({ active: false }).eq('profile_id', user.id)
    if (error) return { ok: false, error: 'Monthly reports aren’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.' }
    revalidatePath('/executive/reports')
    return { ok: true, email: null }
  }

  const given = (rawEmail ?? '').trim().toLowerCase()
  const fallback = me.email && !String(me.email).endsWith('.internal') ? String(me.email) : ''
  const email = given || fallback
  if (!z.string().email().safeParse(email).success) return { ok: false, error: 'Enter the email address to send it to.' }
  const { error } = await admin.from('report_subscriptions').upsert({ profile_id: user.id, email, active: true }, { onConflict: 'profile_id' })
  if (error) return { ok: false, error: 'Monthly reports aren’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.' }
  revalidatePath('/executive/reports')
  return { ok: true, email }
}
