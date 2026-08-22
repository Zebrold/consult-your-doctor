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
      schedules!inner ( start_time ),
      medical_records (
        id,
        notes
      )
    `)
    .eq('doctor_id', doctor.id)
    .order('schedules(start_time)', { ascending: false })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Appointments</h1>
        <p className="text-gray-500">View all your consultations.</p>
      </div>

      <DoctorPatientsClient appointments={appointments || []} />
    </div>
  )
}
