import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

async function run() {
  console.log('Running DB Fix...')
  
  // Get all users
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error(error)
    return
  }

  // Find Aman Kumar by full name from profiles
  const { data: profiles } = await supabase.from('profiles').select('*')
  
  for (const profile of profiles || []) {
    const user = users.users.find(u => u.id === profile.id)
    if (!user) continue

    let staffId = null
    if (user.email?.endsWith('@cyd.internal')) {
      staffId = user.email.split('@')[0].toUpperCase()
    } else {
      // If it's the broken one
      if (profile.full_name === 'Aman Kumar') {
        staffId = 'CYDAK2679' // The user's ID
      }
    }

    if (staffId && !profile.staff_id) {
      console.log(`Fixing staff_id for ${profile.full_name}: ${staffId}`)
      await supabase.from('profiles').update({ staff_id: staffId }).eq('id', profile.id)
    }
  }

  console.log('Done!')
}
run()
