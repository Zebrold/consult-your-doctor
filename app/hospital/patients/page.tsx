import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PatientsListClient } from './PatientsListClient'

export const dynamic = 'force-dynamic'

export default async function HospitalPatientsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('id', user.id)
    .single()

  if (!profile?.hospital_id) redirect('/login')

  // Use admin client to bypass RLS for fetching related profiles (patients)
  const adminClient = createAdminClient()
  
  const { data: appointments, error } = await adminClient
    .from('appointments')
    .select(`
      id,
      status,
      schedules ( start_time, end_time ),
      patient:profiles!appointments_patient_id_fkey ( id, full_name, phone_number ),
      doctor:doctors (
        profiles!doctors_profile_id_fkey ( full_name ),
        departments ( name ),
        consultation_fee
      )
    `)
    .eq('hospital_id', profile.hospital_id)
    // Order by created_at since schedules is a joined table
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching appointments:', error)

  // Extract unique doctors and departments for filters
  const doctorsSet = new Set<string>()
  const departmentsSet = new Set<string>()

  appointments?.forEach(apt => {
    const doctor: any = apt.doctor
    const doctorName = doctor?.profiles?.full_name?.replace('Dr. ', '') || 'Unknown'
    const deptName = doctor?.departments?.name || 'Unknown'
    doctorsSet.add(doctorName)
    departmentsSet.add(deptName)
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Patients</h1>
        <p className="text-gray-500">View and filter all appointments at your hospital.</p>
      </div>

      <PatientsListClient 
        appointments={appointments || []} 
        doctorsList={Array.from(doctorsSet).sort()}
        departmentsList={Array.from(departmentsSet).sort()}
      />
    </div>
  )
}
