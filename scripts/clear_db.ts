import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://roehneuuwtpsgcwitgzs.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZWhuZXV1d3Rwc2djd2l0Z3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQzOTIxNywiZXhwIjoyMTAyMDE1MjE3fQ.aVl8FiYaSU9pfq5xQGzRkIYEOhYKVvXpa2N3JHB9ii8"

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearData() {
  console.log('Starting data cleanup...')

  // 1. Get super_admin profiles
  const { data: superAdmins, error: saError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')

  if (saError) {
    console.error('Error fetching super admins:', saError)
    process.exit(1)
  }

  const superAdminIds = superAdmins.map(sa => sa.id)
  console.log(`Found ${superAdminIds.length} super_admin(s). They will be preserved.`)

  // 2. Clear all child tables first
  const tablesToClear = [
    'messages',
    'chat_sessions',
    'test_results',
    'diagnostic_bookings',
    'prescriptions',
    'appointments',
    'patient_records',
    'doctor_signup_requests',
    'doctors',
    'departments',
    'hospital_admins',
    'patients',
    'diagnostic_tests',
    'diagnostic_centers',
    'profiles'
  ]

  for (const table of tablesToClear) {
    if (table === 'profiles') {
      const { error } = await supabase
        .from(table)
        .delete()
        .not('id', 'in', `(${superAdminIds.join(',')})`)
      if (error) console.error(`Error clearing ${table}:`, error.message)
      else console.log(`Cleared ${table}.`)
    } else {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // dummy where clause to delete all
      if (error) console.error(`Error clearing ${table}:`, error.message)
      else console.log(`Cleared ${table}.`)
    }
  }

  // 3. Get all users from auth to delete those who are not super admins
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Error fetching auth users:', authError.message)
  } else {
    const usersToDelete = authUsers.users.filter(u => !superAdminIds.includes(u.id))
    console.log(`Found ${usersToDelete.length} users to delete from auth.users.`)
    
    for (const u of usersToDelete) {
      const { error: delError } = await supabase.auth.admin.deleteUser(u.id)
      if (delError) {
        console.error(`Error deleting user ${u.email}:`, delError.message)
      } else {
        console.log(`Deleted user ${u.email} (${u.id})`)
      }
    }
  }

  console.log('Data cleanup completed.')
}

clearData()
