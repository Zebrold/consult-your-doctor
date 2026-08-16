require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function check() {
  const { data: scheds } = await supabase.from('schedules').select('*')
  console.log("Total Schedules:", scheds?.length)
  console.log("Sample schedules:", scheds?.slice(0, 3))
}
check()
