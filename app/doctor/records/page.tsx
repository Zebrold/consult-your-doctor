import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DoctorRecordsClient } from './DoctorRecordsClient'

export const dynamic = 'force-dynamic'

export default async function DoctorRecordsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  const { data: doctor } = await supabase
    .from('doctors')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!doctor) redirect('/')

  // Use admin client to bypass RLS for related patient profiles
  const adminClient = createAdminClient()
  
  // Fetch all medical records authored by this doctor
  const { data: records } = await adminClient
    .from('medical_records')
    .select(`
      id,
      document_type,
      notes,
      file_url,
      appointments!inner (
        doctor_id,
        schedules ( start_time ),
        patient:profiles!appointments_patient_id_fkey ( full_name )
      )
    `)
    .eq('appointments.doctor_id', doctor.id)

  // Clean up data for the client component
  const formattedRecords = records?.map(record => {
    const appointment: any = record.appointments
    return {
    id: record.id,
    type: record.document_type,
    notes: record.notes,
    date: appointment?.schedules?.start_time || null,
    patient_name: appointment?.patient?.full_name || 'Unknown Patient'
  }}) || []

  // Sort by date descending
  formattedRecords.sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
        <p className="text-gray-500">View all prescriptions and notes you have created.</p>
      </div>

      <DoctorRecordsClient records={formattedRecords} />
    </div>
  )
}
