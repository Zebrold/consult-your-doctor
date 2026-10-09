import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAll() {
  const tables = [
    'profiles', 'patient_details', 'hospitals', 'departments', 'doctors',
    'schedules', 'appointments', 'diagnostic_centers', 'diagnostic_bookings',
    'payments', 'medical_records', 'doctor_signup_requests'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(2);
    if (error) {
      console.log(`Table ${t}: Error: ${error.message}`);
    } else {
      console.log(`Table ${t}: count sample=${data.length}, columns=`, data.length > 0 ? Object.keys(data[0]) : '(empty)');
      if (data.length > 0) {
        console.log(`  Sample 1:`, JSON.stringify(data[0]));
      }
    }
  }
}

inspectAll();
