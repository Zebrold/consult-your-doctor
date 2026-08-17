import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  
  let adminUser = users?.users?.find(u => u.email === 'consultyourdoctor@admin')
  
  if (adminUser) {
    console.log("Auth User metadata:", adminUser.user_metadata)
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', adminUser.id).single()
    console.log("Profile data:", profile)
  } else {
    console.log("User not found")
  }
}

check()
