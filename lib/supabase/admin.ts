import { createClient } from '@supabase/supabase-js'
import { previewClient } from './preview-mock' // TEMP-PREVIEW

export function createAdminClient() {
  if (process.env.PATIENT_PREVIEW === '1') return previewClient() // TEMP-PREVIEW
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
