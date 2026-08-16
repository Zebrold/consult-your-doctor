const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
)

async function check() {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      doctors (
        specialty,
        consultation_fee,
        profiles ( full_name )
      ),
      hospitals (
        name,
        address,
        city
      ),
      schedules (
        start_time
      )
    `)
    .eq('id', 'b6b1f58f-2837-4795-8ed5-27de4b5f6544')
    .single()

  console.log("Appointment:", JSON.stringify(appointment, null, 2))
  if (error) console.error("Error:", error)
}
check()
