// Run with: npx tsx scratch/run_migration.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env and .env.local manually
function loadEnv(filepath: string) {
  try {
    const content = readFileSync(filepath, 'utf-8')
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const [key, ...rest] = trimmed.split('=')
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim()
      }
    })
  } catch {}
}

loadEnv('.env')
loadEnv('.env.local')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Running migration...')
  
  // Test if columns exist
  const { error: testH } = await supabase.from('hospitals').select('image_url').limit(1)
  if (testH) {
    console.log('❌ hospitals.image_url does not exist. Run this SQL in Supabase Dashboard:')
    console.log('  ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS image_url TEXT;')
    console.log('  ALTER TABLE doctors ADD COLUMN IF NOT EXISTS image_url TEXT;')
  } else {
    console.log('✓ hospitals.image_url column exists')
  }

  const { error: testD } = await supabase.from('doctors').select('image_url').limit(1)
  if (testD) {
    console.log('❌ doctors.image_url does not exist')
  } else {
    console.log('✓ doctors.image_url column exists')
  }

  // Create avatars bucket
  const { error: bucketError } = await supabase.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  })
  
  if (bucketError) {
    if (bucketError.message?.includes('already exists')) {
      console.log('✓ avatars bucket already exists')
    } else {
      console.log('Bucket error:', bucketError.message)
    }
  } else {
    console.log('✓ Created avatars bucket')
  }
  
  console.log('Done!')
}

main().catch(console.error)
