import { createClient } from '@supabase/supabase-js'
import { serverFetch } from './fetch'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // A stalled request gives up instead of hanging the page (lib/supabase/fetch.ts).
      global: { fetch: serverFetch },
    }
  )
}
