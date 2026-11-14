import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { liveBadgeIds } from '@/lib/badges'

// The doctors and hospitals whose verified badge is live, for the blue tick on public pages (VerifiedBadge in
// components/home/ui.tsx). Ids only, cached briefly at the edge.

export const dynamic = 'force-dynamic'

export async function GET() {
  const ids = await liveBadgeIds(createAdminClient())
  return NextResponse.json(ids, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
