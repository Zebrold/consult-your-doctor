import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "ALTER TABLE hospitals ALTER COLUMN contact_email DROP NOT NULL;"
  })
  
  if (error) {
    console.error("RPC failed:", error)
  } else {
    console.log("Success")
  }
}

run()
