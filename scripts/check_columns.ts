import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  if (line.includes('=')) {
    const [key, ...values] = line.split('=');
    if (!process.env[key.trim()]) process.env[key.trim()] = values.join('=').trim().replace(/^["'](.*)["']$/, '$1');
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  const { data, error } = await supabase.from('doctors').insert({
    profile_id: '00000000-0000-0000-0000-000000000000',
    hospital_id: '00000000-0000-0000-0000-000000000000',
    department_id: '00000000-0000-0000-0000-000000000000',
    experience_years: 5,
    consultation_fee: 500,
    specialty: 'Test',
    qualifications: 'Test'
  });
  console.log('Error:', error);
}
check();
