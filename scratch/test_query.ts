import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://roehneuuwtpsgcwitgzs.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZWhuZXV1d3Rwc2djd2l0Z3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQzOTIxNywiZXhwIjoyMTAyMDE1MjE3fQ.aVl8FiYaSU9pfq5xQGzRkIYEOhYKVvXpa2N3JHB9ii8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      patient:profiles!appointments_patient_id_fkey ( id, full_name, phone_number ),
      executive_id
    `)
  console.log(JSON.stringify(appointments, null, 2))
}
run()
