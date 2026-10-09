import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const tables = [
    'profiles', 'patient_details', 'hospitals', 'departments', 'doctors', 
    'schedules', 'appointments', 'diagnostic_centers', 'diagnostic_bookings', 
    'payments', 'prescriptions', 'beds', 'hospital_bed_categories', 
    'hospital_bed_availability', 'reviews', 'doctor_requests', 'tickets', 'support_tickets'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: Error (${error.message})`);
    } else {
      console.log(`Table ${t}: OK, sample row:`, data.length > 0 ? JSON.stringify(data[0]) : '(empty table)');
    }
  }
}

inspect();
