const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data } = await supabase.from('profiles').select('*').limit(20)
  console.log(data)
}
check()
