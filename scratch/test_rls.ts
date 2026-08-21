import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://roehneuuwtpsgcwitgzs.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZWhuZXV1d3Rwc2djd2l0Z3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQzOTIxNywiZXhwIjoyMTAyMDE1MjE3fQ.aVl8FiYaSU9pfq5xQGzRkIYEOhYKVvXpa2N3JHB9ii8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('get_policies') // if exists? No, I'll query pg_policies
  // Since I can't query pg_policies via standard REST, maybe I can use postgres connection?
}
run()
