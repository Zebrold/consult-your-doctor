import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function setup() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  
  let adminUser = users?.users?.find(u => u.email === 'consultyourdoctor@admin')
  
  if (adminUser) {
    const { error: profileError } = await supabase.from('profiles').insert({ 
      id: adminUser.id,
      role: 'super_admin', 
      full_name: 'Platform Super Admin'
    })

    if (profileError) {
      console.error("Profile error:", profileError)
    } else {
      console.log("Fixed Super Admin profile successfully!")
    }
    
  } else {
    console.log("Super Admin auth user not found")
  }
}

setup()
