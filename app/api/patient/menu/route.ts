import { NextResponse } from 'next/server'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { istDateKey } from '@/components/patient/format'

// What the phone ☰ menu shows on its account card: the patient's UHID and how many bookings are coming up. Read-only
// and only the patient's own rows (row level security), so the session token is checked locally like a page does.

/** The same "upcoming" rules as My bookings (app/patient/appointments/page.tsx). */
const ACTIVE_VISIT = ['scheduled', 'confirmed', 'pending_payment', 'pending', 'rescheduled']
const CLOSED_LAB = ['visited', 'completed', 'report_sent', 'cancelled']

type Rel<T> = T | T[] | null
const one = <T,>(v: Rel<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const supabase = await createClient()
  const today = istDateKey(Date.now())
  const [{ data: visits }, { data: labs }] = await Promise.all([
    supabase.from('appointments').select('status, schedules ( start_time )').eq('patient_id', user.id).in('status', ACTIVE_VISIT),
    supabase.from('diagnostic_bookings').select('status, preferred_date').eq('patient_id', user.id).not('status', 'in', `(${CLOSED_LAB.join(',')})`),
  ])

  const upcomingVisits = ((visits ?? []) as { schedules: Rel<{ start_time: string }> }[]).filter((v) => {
    const at = one(v.schedules)?.start_time
    return !at || istDateKey(at) >= today
  }).length
  const upcomingLabs = ((labs ?? []) as { preferred_date: string | null }[]).filter((b) => !b.preferred_date || b.preferred_date >= today).length

  return NextResponse.json(
    { uhid: `CYD-${user.id.slice(0, 8).toUpperCase()}`, upcoming: upcomingVisits + upcomingLabs },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
