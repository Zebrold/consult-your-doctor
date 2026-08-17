import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function setup() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  
  let hospUser = users.users.find(u => u.email === 'hospital@consult.com')
  
  if (!hospUser) {
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email: 'hospital@consult.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'hospital_admin', full_name: 'Admin - Apollo Hospital' }
    })
    
    // Wait for trigger to fire
    await new Promise(r => setTimeout(r, 2000))
    
    // Assign to a real hospital from db
    const { data: hospital } = await supabase.from('hospitals').select('id').limit(1).single()
    
    await supabase.from('profiles').update({ 
      role: 'hospital_admin', 
      full_name: 'Admin - Apollo Hospital',
      hospital_id: hospital.id
    }).eq('id', user.user.id)
    
    console.log("Created hospital admin")
  } else {
    console.log("Hospital admin already exists")
  }
}

setup()
