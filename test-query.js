const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' }); // Next.js usually uses .env.local

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDoctors() {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id,
      specialty,
      experience_years,
      profiles!doctors_profile_id_fkey ( full_name, avatar_url ),
      hospitals ( name, city )
    `)
    .limit(3);
    
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

checkDoctors();
