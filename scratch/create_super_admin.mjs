import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function setup() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  
  let adminUser = users?.users?.find(u => u.email === 'consultyourdoctor@admin')
  
  if (!adminUser) {
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email: 'consultyourdoctor@admin',
      password: 'consultyourdoctor@pass',
      email_confirm: true,
      user_metadata: { role: 'super_admin', full_name: 'Platform Super Admin' }
    })
    
    if (authError) {
      console.error("Auth error:", authError)
      return
    }

    // Manually insert the profile since there is no trigger
    const { error: profileError } = await supabase.from('profiles').insert({ 
      id: user.user.id,
      role: 'super_admin', 
      full_name: 'Platform Super Admin'
    })

    if (profileError) {
      console.error("Profile error:", profileError)
    } else {
      console.log("Created Super Admin successfully!")
    }
    
  } else {
    console.log("Super Admin already exists")
  }
}

setup()
