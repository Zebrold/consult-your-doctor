import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DoctorPatientsClient } from './DoctorPatientsClient'

export const dynamic = 'force-dynamic'

export default async function DoctorPatientsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  const { data: doctor } = await supabase
    .from('doctors')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!doctor) redirect('/')

  // Use admin client to fetch all appointments and related patient profiles
  // since doctors may not have full RLS access to read all patient profiles directly.
  const adminClient = createAdminClient()
  
  const { data: appointments } = await adminClient
    .from('appointments')
    .select(`
      id,
      status,
      patient_id,
      patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
      schedules ( start_time )
    `)
    .eq('doctor_id', doctor.id)
    .order('created_at', { ascending: false })

  // Process appointments to find unique patients
  const patientsMap = new Map()

  appointments?.forEach(apt => {
    const pId = apt.patient_id
    if (!patientsMap.has(pId)) {
      patientsMap.set(pId, {
        id: pId,
        full_name: apt.patient?.full_name || 'Unknown',
        phone_number: apt.patient?.phone_number || 'N/A',
        total_visits: 0,
        last_visit: apt.schedules?.start_time || null,
        status: apt.status
      })
    }
    
    // Increment visit count
    const p = patientsMap.get(pId)
    p.total_visits += 1
    
    // Update last visit if this appointment is more recent
    if (apt.schedules?.start_time) {
      if (!p.last_visit || new Date(apt.schedules.start_time) > new Date(p.last_visit)) {
        p.last_visit = apt.schedules.start_time
        p.status = apt.status // update status to the most recent one
      }
    }
  })

  const uniquePatients = Array.from(patientsMap.values())

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
        <p className="text-gray-500">View all patients you have consulted with.</p>
      </div>

      <DoctorPatientsClient patients={uniquePatients} />
    </div>
  )
}
