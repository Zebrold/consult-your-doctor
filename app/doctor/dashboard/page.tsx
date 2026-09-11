import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DoctorDashboardClient } from '@/components/DoctorDashboardClient'

export default async function DoctorDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  // Verify doctor and fetch profile
  const { data: doctor } = await supabase.from('doctors').select(`
    id, 
    specialty,
    hospital_id,
    profiles!doctors_profile_id_fkey ( full_name, image_url )
  `).eq('profile_id', user.id).single()
  
  if (!doctor) redirect('/')

  // Fetch hospital name if available
  let hospitalName = 'Medical Hub'
  if (doctor.hospital_id) {
    // Assuming there is a hospitals table, we can fetch the name. If not, fallback.
    const { data: hospital } = await supabase.from('hospitals').select('name').eq('id', doctor.hospital_id).single()
    if (hospital?.name) hospitalName = hospital.name
  }

  // Formatting doctor profile
  const doctorProfile = {
    ...doctor,
    full_name: (doctor.profiles as any)?.full_name || 'Doctor',
    image_url: (doctor.profiles as any)?.image_url || null,
  }

  // Fetch today's appointments for this doctor
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const adminClient = createAdminClient()
  const { data: appointments } = await adminClient
    .from('appointments')
    .select(`
      id,
      status,
      patient_id,
      patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
      schedules!inner (
        start_time,
        end_time
      ),
      medical_records (
        id,
        notes
      )
    `)
    .eq('doctor_id', doctor.id)
    .gte('schedules.start_time', todayStart.toISOString())
    .lte('schedules.start_time', todayEnd.toISOString())

  appointments?.sort((a: any, b: any) => new Date(a.schedules.start_time).getTime() - new Date(b.schedules.start_time).getTime())

  // Calculate today's stats
  const total = appointments?.length || 0
  const completed = appointments?.filter(a => a.status === 'completed').length || 0
  const pending = total - completed

  const todayStats = {
    total,
    completed,
    pending
  }

  return (
    <DoctorDashboardClient 
      doctorProfile={doctorProfile}
      appointments={appointments || []}
      todayStats={todayStats}
      hospitalName={hospitalName}
    />
  )
}
