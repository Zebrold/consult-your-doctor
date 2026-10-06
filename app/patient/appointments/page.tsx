import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar as CalendarIcon, User } from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { ConsultationsList, DiagnosticBookingsList, RecordsAndMedicationsList } from '@/components/PatientDashboardLists'
import { PatientDashboardActions } from '@/components/PatientDashboardActions'

export default async function PatientAppointments() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/patient')

  // Fetch user profile for name
  const { data: patientDetails } = await supabase.from('patient_details').select('*').eq('id', user.id).single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch all appointments for this patient
  const { data: fetchedAppointments } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      doctors (
        specialty,
        profiles ( full_name )
      ),
      hospitals (
        name,
        city
      ),
      schedules (
        start_time
      ),
      medical_records (
        id,
        notes,
        file_url,
        document_type
      )
    `)
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch all diagnostic bookings
  const { data: fetchedDiagnosticBookings } = await supabase
    .from('diagnostic_bookings')
    .select(`
      id,
      status,
      test_name,
      preferred_date,
      diagnostic_centers (
        name,
        city,
        address
      )
    `)
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  const appointments = fetchedAppointments ?? []
  const diagnosticBookings = fetchedDiagnosticBookings ?? []

  // Extract prescriptions from medical_records
  const fetchedPrescriptions = fetchedAppointments?.flatMap(apt =>
    (apt.medical_records || []).map(record => ({
      ...record,
      doctor_name: (apt.doctors as any)?.profiles?.full_name,
      date: (apt.schedules as any)?.start_time,
      hospital_name: (apt.hospitals as any)?.name
    }))
  ) || []

  const prescriptions = fetchedPrescriptions

  const upcomingAppointments = appointments?.filter(a => a.status === 'scheduled' || a.status === 'confirmed') || []

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <PatientNavHeader name={profile?.full_name} email={profile?.email || user.email} isSignedIn container="max-w-[1440px] px-margin-x-mobile lg:px-margin-x-desktop" />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-24">
        <div className="flex flex-col w-full">
          <div className="relative w-full overflow-hidden">
            <div className="absolute -top-32 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-80 -left-20 w-80 h-80 bg-fresh-teal/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1440px] mx-auto">

                {/* ==================== LEFT COLUMN (30% -> 4 cols) ==================== */}
                <PatientSidebar user={user} profile={profile} patientDetails={patientDetails} activeAppointmentsCount={upcomingAppointments.length} />

                {/* ==================== RIGHT COLUMN (70% -> 8 cols) ==================== */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                  <div className="mb-2">
                    <h2 className="font-display-lg text-headline-lg font-bold text-on-surface">My Appointments &amp; History</h2>
                    <p className="font-body-md text-body-lg text-on-surface-variant mt-2">Manage your consultations, diagnostic bookings, and medical records.</p>
                  </div>

                  <PatientDashboardActions />

                  {/* Consultations List */}
                  <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6">Recent Consultations</h3>
                    <ConsultationsList appointments={appointments || []} />
                  </section>

                  {/* Diagnostic Bookings List */}
                  <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6">Lab &amp; Diagnostics</h3>
                    <DiagnosticBookingsList diagnosticBookings={diagnosticBookings || []} />
                  </section>

                  {/* Records & Prescriptions */}
                  <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6">Medical Records &amp; Prescriptions</h3>
                    <RecordsAndMedicationsList prescriptions={prescriptions} />
                  </section>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PatientDock activeTab="book" />
    </div>
  )
}
