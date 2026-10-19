import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar as CalendarIcon, User, Heart, Star, MapPin } from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { PatientFooter } from '@/components/AppFooter'
import { AccountShortcuts } from '@/components/patient/AccountShortcuts'

export default async function PatientSaved() {
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
        title="Saved Doctors & Labs"
        subtitle="Your favourite doctors and preferred lab centres."
      />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-12 md:pb-16">
        <div className="flex flex-col w-full">
          <div className="relative w-full overflow-hidden">
            <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-5 md:pt-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1440px] mx-auto">

                {/* ==================== LEFT COLUMN (30% -> 4 cols) ==================== */}
                <PatientSidebar user={user} profile={profile} patientDetails={patientDetails} activeAppointmentsCount={upcomingAppointments.length} />

                {/* ==================== RIGHT COLUMN (70% -> 8 cols) ==================== */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  <AccountShortcuts />

                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-soft-coral fill-soft-coral" /> Saved Doctors
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Dummy Doctor 1 */}
                      <div className="p-4 rounded-xl border border-surface-variant flex flex-col gap-4 hover:border-vibrant-blue/50 transition-colors group">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-title-md text-label-sm font-bold text-on-surface">Dr. Sarah Jenkins</h4>
                              <p className="font-label-sm text-label-sm text-on-surface-variant">Cardiologist</p>
                            </div>
                          </div>
                          <button className="text-soft-coral hover:text-on-surface-variant transition-colors">
                            <Heart className="w-5 h-5 fill-soft-coral" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                          <MapPin className="w-4 h-4" /> Lilavati Hospital, Mumbai
                        </div>
                        <button className="w-full py-2 rounded-lg bg-surface-container-low text-vibrant-blue font-label-sm text-label-sm font-bold hover:bg-surface-container-high transition-colors">
                          Book Appointment
                        </button>
                      </div>

                      {/* Dummy Doctor 2 */}
                      <div className="p-4 rounded-xl border border-surface-variant flex flex-col gap-4 hover:border-vibrant-blue/50 transition-colors group">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-title-md text-label-sm font-bold text-on-surface">Dr. Marcus Vance</h4>
                              <p className="font-label-sm text-label-sm text-on-surface-variant">Dermatologist</p>
                            </div>
                          </div>
                          <button className="text-soft-coral hover:text-on-surface-variant transition-colors">
                            <Heart className="w-5 h-5 fill-soft-coral" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                          <MapPin className="w-4 h-4" /> Apollo Spectra, Bandra
                        </div>
                        <button className="w-full py-2 rounded-lg bg-surface-container-low text-vibrant-blue font-label-sm text-label-sm font-bold hover:bg-surface-container-high transition-colors">
                          Book Appointment
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6 flex items-center gap-2">
                      <Star className="w-5 h-5 text-orange-500 fill-orange-500" /> Preferred Diagnostic Centers
                    </h3>

                    <div className="flex flex-col gap-4">
                      {/* Dummy Lab 1 */}
                      <div className="p-4 rounded-xl border border-surface-variant flex items-center justify-between hover:bg-surface-container-low transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-fresh-teal/10 flex items-center justify-center text-fresh-teal">
                            <Search className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-title-md text-label-sm font-bold text-on-surface">Apex Diagnostics &amp; Imaging</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Andheri West, Mumbai • 4.8/5 Rating</p>
                          </div>
                        </div>
                        <button className="py-2 px-4 rounded-lg bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-bold hover:bg-primary transition-colors">
                          Book Test
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PatientFooter isSignedIn />
      <PatientDock activeTab="profile" name={profile?.full_name} />
    </div>
  )
}
