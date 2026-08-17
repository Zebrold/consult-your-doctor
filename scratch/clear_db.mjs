import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function clearDB() {
  console.log("Clearing database...")
  
  // 1. Delete all hospitals
  // Because of ON DELETE CASCADE, this will also wipe:
  // departments, doctors, schedules, appointments, payments, medical_records
  const { error: hError } = await supabase.from('hospitals').delete().neq('id', '00000000-0000-0000-0000-000000000000') // delete all
  if (hError) console.error("Error deleting hospitals:", hError)
  else console.log("Hospitals deleted.")

  // 2. Delete all Auth Users EXCEPT the Super Admin
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    console.error("Error fetching users:", usersError)
    return
  }
  
  const users = usersData.users
  let deletedCount = 0
  
  for (const user of users) {
    if (user.email !== 'consultyourdoctor@admin') {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) {
        console.error("Error deleting user:", user.email, error)
      } else {
        deletedCount++
      }
    }
  }
  
  console.log(`Deleted ${deletedCount} users. Profiles cascadingly deleted.`)
  console.log("Database reset complete. Only Super Admin remains.")
}

clearDB()
