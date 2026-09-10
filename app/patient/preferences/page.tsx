import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar as CalendarIcon, User, Bell, Smartphone, Mail, Moon, Globe } from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'

export default async function PatientPreferences() {
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
                    <h2 className="font-display-lg text-headline-lg font-bold text-on-surface">App Preferences &amp; Notifications</h2>
                    <p className="font-body-md text-body-lg text-on-surface-variant mt-2">Manage your communication channels and application settings.</p>
                  </div>

                  {/* Notification Channels */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-vibrant-blue" /> Notification Channels
                    </h3>

                    <div className="flex flex-col gap-5">
                      {/* Toggle Item */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-vibrant-blue">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-title-md text-label-sm font-bold text-on-surface">WhatsApp Notifications</h4>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Get appointment reminders and Rx directly on WhatsApp.</p>
                          </div>
                        </div>
                        <div className="w-11 h-6 rounded-full bg-fresh-teal flex items-center justify-end px-1 cursor-pointer transition-colors">
                          <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm"></div>
                        </div>
                      </div>

                      {/* Toggle Item */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-vibrant-blue">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-title-md text-label-sm font-bold text-on-surface">Email Summaries</h4>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Receive weekly health summaries and billing invoices via email.</p>
                          </div>
                        </div>
                        <div className="w-11 h-6 rounded-full bg-fresh-teal flex items-center justify-end px-1 cursor-pointer transition-colors">
                          <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* App Settings */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-vibrant-blue" /> App Settings
                    </h3>

                    <div className="flex flex-col gap-5">
                      {/* Language Selection */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-surface-variant">
                        <div>
                          <h4 className="font-title-md text-label-sm font-bold text-on-surface">Preferred Language</h4>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">Choose the language for the portal interface.</p>
                        </div>
                        <select className="bg-surface-container-low text-on-surface border border-outline-variant rounded-lg px-4 py-2 font-label-sm text-label-sm focus:outline-none focus:ring-2 focus:ring-vibrant-blue focus:border-transparent">
                          <option value="en">English</option>
                          <option value="hi">Hindi (हिंदी)</option>
                          <option value="mr">Marathi (मराठी)</option>
                        </select>
                      </div>

                      {/* Theme Selection */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-surface-variant">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                            <Moon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-title-md text-label-sm font-bold text-on-surface">Dark Mode</h4>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Switch to a darker theme for better viewing in low light.</p>
                          </div>
                        </div>
                        <div className="w-11 h-6 rounded-full bg-surface-container-high flex items-center justify-start px-1 cursor-pointer transition-colors border border-outline-variant">
                          <div className="w-4 h-4 rounded-full bg-outline shadow-sm"></div>
                        </div>
                      </div>
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
