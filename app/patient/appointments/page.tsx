import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSignedFiles } from '@/lib/records'
import { redirect } from 'next/navigation'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { PatientFooter } from '@/components/AppFooter'
import { ConsultationsList, DiagnosticBookingsList, RecordsAndMedicationsList } from '@/components/PatientDashboardLists'
import { PatientDashboardActions } from '@/components/PatientDashboardActions'
import { HeroStat, HeroStats } from '@/components/patient/PhoneHeader'

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
        booking_type,
        doorstep_fee,
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
    ((myReviews ?? []) as { appointment_id: string; rating: number; comment: string | null; hospital_rating?: number | null; hospital_comment?: string | null }[]).map((r) => [
      r.appointment_id,
      { rating: r.rating, comment: r.comment, hospitalRating: r.hospital_rating ?? null, hospitalComment: r.hospital_comment ?? null },
    ]),
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

  // Counted like the Upcoming tab of the consultations list below.
  const upcomingCount = appointments.filter((a) => ['scheduled', 'confirmed', 'pending_payment', 'pending'].includes(a.status)).length

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <PatientNavHeader
        name={profile?.full_name}
        email={profile?.email || user.email}
        isSignedIn
        container="max-w-[1080px] px-margin-x-mobile lg:px-margin-x-desktop"
        eyebrow="Your bookings"
        title="Appointments & History"
        subtitle="Consultations, lab tests and prescriptions."
        hero={
          <HeroStats>
            <HeroStat href="#consultations" value={upcomingCount} label="Upcoming visits" />
            <HeroStat href="#labs" value={diagnosticBookings.length} label="Lab bookings" />
            <HeroStat href="#records" value={prescriptions.length} label="Records" />
          </HeroStats>
        }
      />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-12 md:pb-16">
        <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-5 md:pt-8">
          <div className="max-w-[1080px] mx-auto flex flex-col gap-6">

            <PatientDashboardActions />

            {/* Consultations List */}
            <section id="consultations" className="scroll-mt-24 bg-surface-container-lowest rounded-[20px] md:rounded-2xl p-4 md:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.05)] md:shadow-sm border border-[#edf1f7] md:border-outline-variant/20">
              <h3 className="font-title-md text-[19px] md:text-lg font-extrabold md:font-bold tracking-tight text-on-surface mb-4 md:mb-6">Recent Consultations</h3>
              <ConsultationsList appointments={appointments || []} reviews={reviews} />
            </section>

            {/* Diagnostic Bookings List */}
            <section id="labs" className="scroll-mt-24 bg-surface-container-lowest rounded-[20px] md:rounded-2xl p-4 md:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.05)] md:shadow-sm border border-[#edf1f7] md:border-outline-variant/20">
              <h3 className="font-title-md text-[19px] md:text-lg font-extrabold md:font-bold tracking-tight text-on-surface mb-4 md:mb-6">Lab &amp; Diagnostics</h3>
              <DiagnosticBookingsList diagnosticBookings={diagnosticBookings || []} />
            </section>

            {/* Records & Prescriptions */}
            <section id="records" className="scroll-mt-24 bg-surface-container-lowest rounded-[20px] md:rounded-2xl p-4 md:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.05)] md:shadow-sm border border-[#edf1f7] md:border-outline-variant/20">
              <h3 className="font-title-md text-[19px] md:text-lg font-extrabold md:font-bold tracking-tight text-on-surface mb-4 md:mb-6">Medical Records &amp; Prescriptions</h3>
              <RecordsAndMedicationsList prescriptions={prescriptions} />
            </section>

          </div>
        </div>
      </main>

      <PatientFooter isSignedIn />
      <PatientDock activeTab="book" name={profile?.full_name} />
    </div>
  )
}
