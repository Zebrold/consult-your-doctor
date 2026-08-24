// Run with: npx tsx scratch/add_columns.ts
import { readFileSync } from 'fs'

// Load env
const envContent = readFileSync('.env', 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim().replace(/\r$/, '')
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx > 0) {
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  }
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

// We'll use the PostgREST approach: 
// PATCH hospitals set image_url on a non-existent row to test,
// or we can use the SQL over HTTP endpoint at /pg
// Actually the cleanest approach: use the pg extension endpoint

async function runSQL(sql: string) {
  // Supabase exposes a /pg endpoint for the service role  
  // But actually, let's just use the approach of altering via fetch to the management API
  // The simplest approach is using the Supabase SQL HTTP endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  })
  return res
}

// Actually, the easiest way is to create a temporary Postgres function that runs our DDL
async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // First, create a temp function that can execute DDL
  // Use supabase.rpc after creating the function
  
  // Try approach: use the _internal SQL endpoint
  // Supabase cloud doesn't expose raw SQL via REST, but we can use 
  // a workaround: create the column by inserting with the column and catching error
  
  // The cleanest way: just log the SQL and ask the user to run it
  console.log('')
  console.log('=== IMPORTANT: Please run the following SQL in your Supabase Dashboard ===')
  console.log('Go to: https://supabase.com/dashboard → SQL Editor → New Query')
  console.log('')
  console.log('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS image_url TEXT;')
  console.log('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS image_url TEXT;')
  console.log('')
  console.log('=== Then come back here and the upload feature will work. ===')
}

main()
