import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function setup() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  
  let docUser = users.users.find(u => u.email === 'doctor@consult.com')
  
  if (!docUser) {
    console.log("Creating doctor@consult.com...")
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email: 'doctor@consult.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'doctor', full_name: 'Dr. Test Doctor' }
    })
    if (authError) {
      console.error(authError)
      return
    }
    docUser = user.user
    
    // Auth trigger creates profile. Ensure it's a doctor.
    await supabase.from('profiles').update({ role: 'doctor', full_name: 'Dr. Test Doctor' }).eq('id', docUser.id)
    
    // Create doctor entry
    const { data: hospital } = await supabase.from('hospitals').select('id').limit(1).single()
    const { data: dept } = await supabase.from('departments').select('id').limit(1).single()
    
    const { data: newDoc, error: dError } = await supabase.from('doctors').insert({
      profile_id: docUser.id,
      hospital_id: hospital.id,
      department_id: dept?.id || null,
      specialty: 'General Medicine',
      experience_years: 10,
      consultation_fee: 500
    }).select('id').single()
    
    if (dError) console.error(dError)
    else console.log("Created doctor row:", newDoc)
    
    // Move an appointment to this doctor
    const { data: apts } = await supabase.from('appointments').select('*').limit(1)
    if (apts && apts.length > 0) {
      await supabase.from('appointments').update({ doctor_id: newDoc.id }).eq('id', apts[0].id)
      console.log("Moved appointment to new doctor")
    }
  } else {
    console.log("Doctor already exists")
  }
}

setup()
