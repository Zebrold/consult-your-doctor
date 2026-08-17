import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function assign() {
  const { data: user } = await supabase.auth.admin.listUsers()
  const execUser = user.users.find(u => u.email === 'executive@consult.com')
  
  if (execUser) {
    const { data: appointments } = await supabase.from('appointments').select('*')
    if (appointments && appointments.length > 0) {
      await supabase.from('appointments').update({ executive_id: execUser.id }).eq('id', appointments[0].id)
      console.log("Assigned appointment to executive")
    }
  }
}

assign()
