import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: executives, error } = await supabase.from('profiles').select('*').eq('role', 'executive')
  console.log(executives)
  
  if (!executives || executives.length === 0) {
    console.log("No executives found. Creating a test executive...")
    
    // First create the auth user using admin API
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email: 'executive@consult.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'executive', full_name: 'Test Executive' }
    })
    
    if (authError) {
      console.error("Auth error:", authError)
      return
    }
    
    // Fetch a hospital to assign to
    const { data: hospitals } = await supabase.from('hospitals').select('id').limit(1)
    
    // Auth trigger might have created the profile. Update it.
    await supabase.from('profiles').update({
      full_name: 'Test Executive',
      phone_number: '9876543219',
      role: 'executive',
      hospital_id: hospitals[0].id
    }).eq('id', user.user.id)
    
    console.log("Created Executive:", user.user.email, "Password: password123")
  }
}

check()
