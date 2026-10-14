import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar as CalendarIcon, User, Users, Plus, ShieldCheck } from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { AccountShortcuts } from '@/components/patient/AccountShortcuts'

export default async function PatientFamily() {
  const supabase = await createClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login/patient')

  // The name for the header and the upcoming-visit count for the sidebar, fetched together.
  const [{ data: patientDetails }, { data: profile }, { data: appointments }] = await Promise.all([
    supabase.from('patient_details').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('appointments').select('id, status').eq('patient_id', user.id),
  ])

  const upcomingAppointments = appointments?.filter(a => a.status === 'scheduled' || a.status === 'confirmed') || []

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <PatientNavHeader
        name={profile?.full_name}
        email={profile?.email || user.email}
        isSignedIn
        container="max-w-[1440px] px-margin-x-mobile lg:px-margin-x-desktop"
        backHref="/patient/profile"
        eyebrow="My account"
        title="Family Members"
        subtitle="Linked ABDM profiles and health records for your family."
      />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-dock">
        <div className="flex flex-col w-full">
          <div className="relative w-full overflow-hidden">
            <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-5 md:pt-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1440px] mx-auto">

                {/* ==================== LEFT COLUMN (30% -> 4 cols) ==================== */}
                <PatientSidebar user={user} profile={profile} patientDetails={patientDetails} activeAppointmentsCount={upcomingAppointments.length} />

                {/* ==================== RIGHT COLUMN (70% -> 8 cols) ==================== */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  <AccountShortcuts />

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

      <PatientDock activeTab="profile" name={profile?.full_name} />
    </div>
  )
}
