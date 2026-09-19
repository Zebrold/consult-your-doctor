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
  const { data: deps, error } = await supabase.from('departments').select('*');
  if (error) console.error(error);
  console.log('Departments:', deps);
}
check();
