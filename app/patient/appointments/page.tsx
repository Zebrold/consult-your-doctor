import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSignedFiles } from '@/lib/records'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User } from 'lucide-react'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { ConsultationsList, DiagnosticBookingsList, RecordsAndMedicationsList } from '@/components/PatientDashboardLists'
import { PatientDashboardActions } from '@/components/PatientDashboardActions'

export default async function PatientAppointments() {
  const supabase = await createClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login/patient')

  // Everything on this page is independent, so it is fetched in one round trip rather than five.
  const [
    { data: patientDetails },
    { data: profile },
    { data: fetchedAppointments },
    { data: fetchedDiagnosticBookings },
    { data: myReviews },
  ] = await Promise.all([
    supabase.from('patient_details').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    // All appointments for this patient
    supabase
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
      .order('created_at', { ascending: false }),
    // All diagnostic bookings
    supabase
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
      .order('created_at', { ascending: false }),
    // The patient's own reviews, so finished visits show their rating instead of "Rate your visit".
    supabase.from('doctor_reviews').select('appointment_id, rating, comment').eq('patient_id', user.id),
  ])

  const appointments = fetchedAppointments ?? []
  const diagnosticBookings = fetchedDiagnosticBookings ?? []

  const reviews = Object.fromEntries(
    ((myReviews ?? []) as { appointment_id: string; rating: number; comment: string | null }[]).map((r) => [r.appointment_id, { rating: r.rating, comment: r.comment }]),
  )

  // Extract prescriptions from medical_records
  const fetchedPrescriptions = fetchedAppointments?.flatMap(apt =>
    (apt.medical_records || []).map(record => ({
      ...record,
      doctor_name: (apt.doctors as any)?.profiles?.full_name,
      date: (apt.schedules as any)?.start_time,
      hospital_name: (apt.hospitals as any)?.name
    }))
  ) || []

  // Record files are private; the list gets short-lived signed links.
  const prescriptions = await withSignedFiles(createAdminClient(), fetchedPrescriptions)

  const upcomingAppointments = appointments?.filter(a => a.status === 'scheduled' || a.status === 'confirmed') || []

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <PatientNavHeader name={profile?.full_name} email={profile?.email || user.email} isSignedIn container="max-w-[1080px] px-margin-x-mobile lg:px-margin-x-desktop" />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-24">
        <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-8">
          <div className="max-w-[1080px] mx-auto flex flex-col gap-6">

            {/* Header with Title and View Profile action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/20">
              <div>
                <h1 className="font-display-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
                  My Appointments &amp; History
                </h1>
                <p className="font-body-md text-sm md:text-base text-on-surface-variant mt-1">
                  Manage your consultations, diagnostic bookings, and medical records.
                </p>
              </div>

              <Link
                href="/patient/profile"
                className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-variant text-sm font-semibold text-primary transition-colors border border-outline-variant/30 shadow-sm"
              >
                <User className="w-4 h-4" /> View Profile
              </Link>
            </div>

            <PatientDashboardActions />

            {/* Consultations List */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20">
              <h3 className="font-title-md text-lg font-bold text-on-surface mb-6">Recent Consultations</h3>
              <ConsultationsList appointments={appointments || []} reviews={reviews} />
            </section>

            {/* Diagnostic Bookings List */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20">
              <h3 className="font-title-md text-lg font-bold text-on-surface mb-6">Lab &amp; Diagnostics</h3>
              <DiagnosticBookingsList diagnosticBookings={diagnosticBookings || []} />
            </section>

            {/* Records & Prescriptions */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20">
              <h3 className="font-title-md text-lg font-bold text-on-surface mb-6">Medical Records &amp; Prescriptions</h3>
              <RecordsAndMedicationsList prescriptions={prescriptions} />
            </section>

          </div>
        </div>
      </main>

      <PatientDock activeTab="book" name={profile?.full_name} />
    </div>
  )
}
