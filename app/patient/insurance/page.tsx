import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar as CalendarIcon, User, Wallet, ShieldPlus, FileText, CheckCircle2 } from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'

export default async function PatientInsurance() {
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
                    <h2 className="font-display-lg text-headline-lg font-bold text-on-surface">Insurance &amp; Billing Details</h2>
                    <p className="font-body-md text-body-lg text-on-surface-variant mt-2">Manage your insurance policies and view billing statements.</p>
                  </div>

                  {/* Current Active Insurance Card */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-vibrant-blue/10 rounded-full flex items-center justify-center text-vibrant-blue">
                        <ShieldPlus className="w-5 h-5" />
                      </div>
                      <h3 className="font-title-md text-title-md font-bold text-on-surface">Active Insurance Policy</h3>
                    </div>

                    <div className="bg-gradient-to-br from-inverse-surface to-indigo-gray-900 rounded-2xl p-6 text-on-error relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                          <p className="font-label-sm text-label-sm text-indigo-gray-50/70 uppercase tracking-wider mb-1">Provider</p>
                          <h4 className="font-title-md text-title-md font-bold text-white">Star Health Comprehensive</h4>
                        </div>
                        <span className="px-3 py-1 bg-fresh-teal/20 text-secondary-container rounded-full font-label-sm text-label-sm font-bold border border-fresh-teal/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-6 relative z-10">
                        <div>
                          <p className="font-label-sm text-label-sm text-indigo-gray-50/70 uppercase tracking-wider mb-1">Policy Number</p>
                          <p className="font-body-md text-body-lg font-medium tracking-wide">SH-400-8842-19</p>
                        </div>
                        <div>
                          <p className="font-label-sm text-label-sm text-indigo-gray-50/70 uppercase tracking-wider mb-1">Coverage Limit</p>
                          <p className="font-body-md text-body-lg font-medium">₹10,00,000</p>
                        </div>
                        <div>
                          <p className="font-label-sm text-label-sm text-indigo-gray-50/70 uppercase tracking-wider mb-1">Primary Holder</p>
                          <p className="font-body-md text-body-md">{profile?.full_name}</p>
                        </div>
                        <div>
                          <p className="font-label-sm text-label-sm text-indigo-gray-50/70 uppercase tracking-wider mb-1">Valid Till</p>
                          <p className="font-body-md text-body-md">31 March 2027</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing History */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary-container/30 rounded-full flex items-center justify-center text-secondary">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <h3 className="font-title-md text-title-md font-bold text-on-surface">Recent Billing Statements</h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Dummy Bill 1 */}
                      <div className="p-4 rounded-xl border border-surface-variant flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-title-md text-label-sm font-bold text-on-surface">OPD Consultation - Dr. Sarah Jenkins</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Lilavati Hospital • 12 Jan 2026</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-body-md text-body-md font-bold text-on-surface">₹1,500</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">Paid</span>
                        </div>
                      </div>

                      {/* Dummy Bill 2 */}
                      <div className="p-4 rounded-xl border border-surface-variant flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-title-md text-label-sm font-bold text-on-surface">Comprehensive Metabolic Panel</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Apex Labs • 05 Jan 2026</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-body-md text-body-md font-bold text-on-surface">₹2,800</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-fresh-teal/20 text-secondary-container">Insurance Covered</span>
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
