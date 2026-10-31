import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Releases the slots of consultations that were never paid for. Vercel Cron calls this with
// `Authorization: Bearer <CRON_SECRET>`; nothing else may. A slot is also freed when a patient next tries to book it
// (app/actions/booking.ts), so this sweep catches the ones nobody is trying to book.

export const dynamic = 'force-dynamic'

const STALE_MS = 30 * 60_000

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - STALE_MS).toISOString()
  const { data: holds, error } = await admin
    .from('appointments')
    .select('id, schedule_id')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .limit(500)
  if (error) {
    console.error('release-holds: could not read holds:', error)
    return NextResponse.json({ error: 'Could not read the holds' }, { status: 500 })
  }

  let released = 0
  for (const hold of (holds ?? []) as { id: string; schedule_id: string | null }[]) {
    // Only while the booking is still unpaid: a payment that lands at the same moment wins.
    const { data: cancelled } = await admin.from('appointments').update({ status: 'cancelled' }).eq('id', hold.id).eq('status', 'pending_payment').select('id')
    if (!cancelled?.length) continue
    released++
    if (hold.schedule_id) await admin.from('schedules').update({ is_booked: false }).eq('id', hold.schedule_id)
  }

  return NextResponse.json({ released })
}
