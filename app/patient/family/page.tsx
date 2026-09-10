import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar as CalendarIcon, User, Users, Plus, ShieldCheck } from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'

export default async function PatientFamily() {
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

  // For sidebar active appointments count
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('patient_id', user.id)

  const upcomingAppointments = appointments?.filter(a => a.status === 'scheduled' || a.status === 'confirmed') || []

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
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
                    <h2 className="font-display-lg text-headline-lg font-bold text-on-surface">Family Members &amp; Dependents</h2>
                    <p className="font-body-md text-body-lg text-on-surface-variant mt-2">Manage linked ABDM profiles and health records for your family.</p>
                  </div>

                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center text-vibrant-blue mb-4">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-2">No Linked Members</h3>
                    <p className="font-body-md text-on-surface-variant max-w-md mb-6">
                      You haven't linked any family members yet. Add their ABDM profiles to easily manage their appointments and view their health records in one place.
                    </p>
                    <button className="py-2.5 px-6 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary transition-all flex items-center gap-2 shadow-sm">
                      <Plus className="w-[18px] h-[18px]" /> Link Family Member
                    </button>
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-5 flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-fresh-teal shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-title-md text-label-sm font-bold text-on-surface">Privacy &amp; Consent</h4>
                      <p className="font-body-md text-label-sm text-on-surface-variant mt-1">
                        Linking a member's profile requires their explicit consent via OTP. You will be able to manage their appointments, but access to sensitive medical records may require separate authorization based on ABDM guidelines.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
