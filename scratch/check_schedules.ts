import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function check() {
  const { data: docs } = await supabase.from('doctors').select('id, profiles(full_name)')
  console.log("Doctors:", docs)

  const { data: scheds } = await supabase.from('schedules').select('*')
  console.log("Schedules count:", scheds?.length)
  console.log("Sample schedules:", scheds?.slice(0, 3))
}

check()
