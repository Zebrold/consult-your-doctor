import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar as CalendarIcon, User, MessageCircleQuestion, HelpCircle, PhoneCall, ChevronDown } from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'

export default async function PatientSupport() {
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
                    <h2 className="font-display-lg text-headline-lg font-bold text-on-surface">Help, Support &amp; FAQs</h2>
                    <p className="font-body-md text-body-lg text-on-surface-variant mt-2">Get answers to common questions or reach out to our triage desk.</p>
                  </div>

                  {/* Contact Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-vibrant-blue text-on-primary rounded-xl p-6 shadow-sm flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-on-primary/10 rounded-full flex items-center justify-center">
                        <PhoneCall className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-title-md text-title-md font-bold">24/7 Triage Desk</h4>
                        <p className="font-label-sm text-label-sm text-on-primary/80 mt-1">Immediate clinical guidance</p>
                      </div>
                      <Link href="tel:+9118004429999" className="mt-2 py-2 px-6 rounded-full bg-on-primary text-vibrant-blue font-bold text-label-sm">
                        Call 1800-442-9999
                      </Link>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-fresh-teal/10 text-fresh-teal rounded-full flex items-center justify-center">
                        <MessageCircleQuestion className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-title-md text-title-md font-bold text-on-surface">Support Ticket</h4>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">For billing and technical issues</p>
                      </div>
                      <button className="mt-2 py-2 px-6 rounded-full bg-surface-container-low text-on-surface font-bold text-label-sm border border-outline-variant/50 hover:bg-surface-container-high transition-colors">
                        Raise Ticket
                      </button>
                    </div>
                  </div>

                  {/* FAQs */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-6 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-vibrant-blue" /> Clinical &amp; App FAQs
                    </h3>

                    <div className="flex flex-col gap-4">
                      {/* FAQ Item 1 */}
                      <div className="border border-surface-variant rounded-xl p-4 cursor-pointer hover:bg-surface-container-low transition-colors">
                        <div className="flex justify-between items-center">
                          <h4 className="font-title-md text-label-sm font-bold text-on-surface">How do I access my prescription?</h4>
                          <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                        </div>
                      </div>

                      {/* FAQ Item 2 */}
                      <div className="border border-surface-variant rounded-xl p-4 cursor-pointer hover:bg-surface-container-low transition-colors">
                        <div className="flex justify-between items-center">
                          <h4 className="font-title-md text-label-sm font-bold text-on-surface">Can I reschedule an appointment?</h4>
                          <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                        </div>
                      </div>

                      {/* FAQ Item 3 */}
                      <div className="border border-surface-variant rounded-xl p-4 cursor-pointer hover:bg-surface-container-low transition-colors">
                        <div className="flex justify-between items-center">
                          <h4 className="font-title-md text-label-sm font-bold text-on-surface">How is my data synced with ABDM?</h4>
                          <ChevronDown className="w-5 h-5 text-on-surface-variant" />
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
