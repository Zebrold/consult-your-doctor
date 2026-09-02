import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('hospitals').select('*').limit(1);
  console.log('Hospitals keys:', data ? Object.keys(data[0] || {}) : null);
  
  const { data: diag, error: diagError } = await supabase.from('diagnostic_centers').select('*').limit(1);
  console.log('Diagnostic Centers keys:', diag ? Object.keys(diag[0] || {}) : null);
  console.log('Diag Error:', diagError?.message);
}

check();
