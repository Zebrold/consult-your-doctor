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

import { approveDoctor } from './app/actions/doctorAuth';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  console.log('Fetching request...');
  const { data: reqs } = await supabase.from('doctor_signup_requests').select('*').eq('email', 'tech.aman2799@gmail.com');
  if (!reqs || reqs.length === 0) return console.log('No requests found.');
  const request = reqs[0];
  
  console.log('Checking for existing auth user...');
  const { data: users } = await supabase.auth.admin.listUsers();
  const existingUser = users.users.find(u => u.email === request.email);
  if (existingUser) {
    console.log('Deleting existing auth user to start fresh...');
    await supabase.auth.admin.deleteUser(existingUser.id);
  }
  
  console.log('Creating auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: request.email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { role: 'doctor' }
  });
  
  if (authError) return console.error('Auth Error:', authError.message);
  
  const userId = authData.user.id;
  console.log('Created Auth User:', userId);
  
  console.log('Inserting into profiles...');
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    full_name: request.full_name,
    email: request.email,
    phone_number: request.phone_number,
    role: 'doctor'
  });
  
  if (profileError) return console.error('Profile Error:', profileError);
  
  console.log('Inserting into doctors...');
  const { error: doctorError } = await supabase.from('doctors').insert({
    profile_id: userId,
    hospital_id: request.hospital_id,
    specialty: request.specialty,
    qualifications: request.qualifications
  });
  
  if (doctorError) return console.error('Doctor Error:', doctorError);
  
  console.log('Success! Deleting user to clean up...');
  await supabase.auth.admin.deleteUser(userId);
}
test();
