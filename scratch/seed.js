const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const hospitalsData = [
  { name: 'Apollo Hospitals', city: 'Delhi', address: 'Indraprastha Apollo, Mathura Rd, Delhi', contact_email: 'contact@apollo.com' },
  { name: 'Fortis Hospitals', city: 'Bangalore', address: 'Bannerghatta Road, Bangalore', contact_email: 'contact@fortis.com' },
  { name: 'Max Healthcare', city: 'Delhi', address: 'Saket, New Delhi', contact_email: 'contact@max.com' },
  { name: 'Medanta', city: 'Gurugram', address: 'Sector 38, Gurugram, Haryana', contact_email: 'contact@medanta.com' },
  { name: 'Manipal Hospitals', city: 'Bangalore', address: 'Old Airport Road, Bangalore', contact_email: 'contact@manipal.com' }
];

const departmentsList = [
  'Cardiology', 'Neurology', 'Orthopaedics', 'General Medicine', 'Pediatrics'
];

const doctorsData = [
  { name: 'Dr. Rohit Sharma', email: 'rohit.sharma@example.com', phone: '9876543210', spec: 'Cardiology', exp: 15, fee: 1000, hospIdx: 0, deptIdx: 0 },
  { name: 'Dr. Neha Verma', email: 'neha.verma@example.com', phone: '9876543211', spec: 'Neurology', exp: 12, fee: 800, hospIdx: 1, deptIdx: 1 },
  { name: 'Dr. Arvind Iyer', email: 'arvind.iyer@example.com', phone: '9876543212', spec: 'Orthopaedics', exp: 18, fee: 1100, hospIdx: 2, deptIdx: 2 },
  { name: 'Dr. Anjali Mehta', email: 'anjali.mehta@example.com', phone: '9876543213', spec: 'General Medicine', exp: 10, fee: 900, hospIdx: 3, deptIdx: 3 },
  { name: 'Dr. Amit Patel', email: 'amit.patel@example.com', phone: '9876543214', spec: 'Pediatrics', exp: 8, fee: 700, hospIdx: 4, deptIdx: 4 }
];

async function seed() {
  console.log("Starting DB seed...");
  
  // 1. Insert Hospitals
  console.log("Inserting Hospitals...");
  const { data: hospitals, error: hospErr } = await supabase.from('hospitals').insert(hospitalsData).select();
  if (hospErr) throw hospErr;

  // 2. Insert Departments for each hospital
  console.log("Inserting Departments...");
  const deptInserts = [];
  for (const hosp of hospitals) {
    for (const d of departmentsList) {
      deptInserts.push({ hospital_id: hosp.id, name: d });
    }
  }
  const { data: departments, error: deptErr } = await supabase.from('departments').insert(deptInserts).select();
  if (deptErr) throw deptErr;

  // 3. Insert Doctors (Auth, Profiles, Doctors)
  console.log("Inserting Doctors...");
  for (const doc of doctorsData) {
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: doc.email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { role: 'doctor' }
    });
    if (authErr) {
        console.error("Auth creation error for", doc.name, authErr.message);
        continue;
    }
    const userId = authData.user.id;

    // The profile is likely auto-created by a trigger on auth.users if one exists, but wait, schema doesn't have an auth trigger.
    // Let's explicitly insert the profile.
    const { data: profileData, error: profErr } = await supabase.from('profiles').insert({
        id: userId,
        full_name: doc.name,
        phone_number: doc.phone,
        role: 'doctor',
        hospital_id: hospitals[doc.hospIdx].id
    }).select().single();
    
    // If error, it might be due to trigger already creating it. We can try update.
    if (profErr) {
      if (profErr.code === '23505') { // unique violation
        await supabase.from('profiles').update({
            full_name: doc.name,
            phone_number: doc.phone,
            role: 'doctor',
            hospital_id: hospitals[doc.hospIdx].id
        }).eq('id', userId);
      } else {
        console.error("Profile error:", profErr.message);
      }
    }

    // Insert into doctors table
    const targetDept = departments.find(d => d.hospital_id === hospitals[doc.hospIdx].id && d.name === doc.spec);
    
    const { data: doctorData, error: doctorErr } = await supabase.from('doctors').insert({
        profile_id: userId,
        hospital_id: hospitals[doc.hospIdx].id,
        department_id: targetDept.id,
        specialty: doc.spec,
        experience_years: doc.exp,
        consultation_fee: doc.fee
    }).select().single();

    if (doctorErr) throw doctorErr;

    // Insert mock schedules for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10 AM
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0); // 11 AM
    
    await supabase.from('schedules').insert({
        doctor_id: doctorData.id,
        start_time: tomorrow.toISOString(),
        end_time: endTime.toISOString(),
        is_booked: false
    });
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
