import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Stethoscope, Bell, HelpCircle, User, BadgeCheck, Medal, ArrowRight,
  Calendar, FileText, MessageSquare, Pill, MonitorCheck, CheckCircle2, ChevronRight, UserCircle, Ticket, Droplet, Clock,
  Store, TrendingUp, RefreshCw, Circle, Download
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PatientDashboardActions } from '@/components/PatientDashboardActions'
import { ConsultationsList, DiagnosticBookingsList, RecordsAndMedicationsList } from '@/components/PatientDashboardLists'
import { Footer } from '@/components/Footer'

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'text-fresh-teal font-semibold';
  if (s === 'cancelled') return 'text-[#E31E24] font-semibold';
  if (s === 'pending_payment' || s === 'pending') return 'text-orange-500 font-semibold';
  if (s === 'scheduled' || s === 'confirmed') return 'text-primary font-semibold';
  return 'text-outline';
}

export default async function PatientDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/patient')

  // Fetch user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Fetch all appointments for this patient
  const { data: appointments } = await supabase
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
  const { data: diagnosticBookings } = await supabase
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

  // Extract prescriptions from medical_records
  const prescriptions = appointments?.flatMap(apt =>
    (apt.medical_records || []).map(record => ({
      ...record,
      doctor_name: (apt.doctors as any)?.profiles?.full_name,
      date: (apt.schedules as any)?.start_time,
      hospital_name: (apt.hospitals as any)?.name
    }))
  ) || []

  const firstName = profile?.full_name?.split(' ')[0] || 'Patient'

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface min-h-screen">
      <Header />

      <main className="w-full pt-20 bg-background pb-12">
        <div className="flex flex-col w-full">
          <div className="w-full max-w-7xl mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-stack-md flex flex-col gap-stack-lg">

            <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-stack-md lg:p-stack-lg shadow-sm">
              <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none"></div>
              <div className="absolute right-1/3 -bottom-20 w-80 h-80 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col gap-stack-md">

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-base">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {/* <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm">
                        <BadgeCheck className="w-[15px] h-[15px]" />
                        ABHA ID: 91-8204-7721-0941
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-label-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-fresh-teal animate-pulse"></span>
                        2FA Secure Biometrics
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                        <Medal className="w-[14px] h-[14px]" />
                        Care Tier: Premium Gold
                      </span> */}
                    </div>
                    <h1 className="font-display-lg text-headline-lg lg:text-display-lg text-indigo-gray-900 tracking-tight">
                      Welcome back, <span className="text-primary-container">{firstName}</span>
                    </h1>
                    <p className="font-body-md text-body-md text-indigo-gray-600">
                      Your clinical records are synchronized. {diagnosticBookings?.length || 0} diagnostic panel(s) and {appointments?.length || 0} consultation(s) are logged.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low self-start lg:self-auto">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-lowest overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtWxMz-eBvW1Ghk-RB4rK_hV39P8xTp2-LAveOPB4ndQBjUedzAxfQV6QciuxuRL7jy1-1pZ3eLC8F3QtPXcL3MS9SOgHQObqu5rIpnyHVY3oOaIziLd_iaUh26Ua1LaxgXu_ziK6iNy_DdCsBcSrxlYS-NZs-KJREy099iSwMiofbVBdIfYe9EJnHXj55PzQDV3HhMZtUalBxUS1ExCkpkGzd1u2bhGsCkinBy982ZsgkmmRNc6I9Bw" alt="Care Concierge" />
                    </div>
                    <div className="text-left leading-snug">
                      <p className="font-label-sm text-label-sm text-indigo-gray-900 font-semibold">Care Concierge Online</p>
                      <p className="font-label-sm text-label-sm text-fresh-teal">Sister Maya (RN, BSN)</p>
                      <button className="font-label-sm text-label-sm text-primary hover:underline font-semibold mt-0.5 inline-flex items-center gap-1" type="button">
                        <span>Instant Message</span>
                        <ArrowRight className="w-[13px] h-[13px]" />
                      </button>
                    </div>
                  </div>
                </div>

                <PatientDashboardActions />
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-base">
              <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Upcoming Visits</span>
                  <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <Calendar className="w-[20px] h-[20px]" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-headline-lg text-headline-lg text-indigo-gray-900 font-bold leading-none">{appointments?.length || 0} <span className="font-title-md text-title-md font-semibold text-outline">Total</span></p>
                  {appointments && appointments.length > 0 && (
                    <div className="mt-2.5 p-2 rounded-lg bg-surface-container-low flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-fresh-teal"></span>
                      <p className="font-label-sm text-label-sm text-indigo-gray-900 truncate">Next: {new Date((appointments[0] as any).schedules.start_time).toLocaleDateString('en-IN')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Lab Diagnostics</span>
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
                    <FileText className="w-[20px] h-[20px]" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <p className="font-headline-lg text-headline-lg text-indigo-gray-900 font-bold leading-none">{diagnosticBookings?.length || 0} Total</p>
                    {diagnosticBookings && diagnosticBookings.length > 0 && <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-[11px] font-semibold">Ready</span>}
                  </div>
                  {diagnosticBookings && diagnosticBookings.length > 0 && (
                    <div className="mt-2.5 p-2 rounded-lg bg-fresh-teal/5 flex items-center gap-1.5 text-secondary">
                      <MessageSquare className="w-[16px] h-[16px]" />
                      <p className="font-label-sm text-label-sm truncate">SMS Dispatched &amp; Download Available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Prescriptions</span>
                  <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                    <Pill className="w-[20px] h-[20px]" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-headline-lg text-headline-lg text-indigo-gray-900 font-bold leading-none">{prescriptions.length} <span className="font-title-md text-title-md font-semibold text-outline">Total</span></p>
                  {prescriptions.length > 0 && (
                    <div className="mt-2.5 flex items-center justify-between text-indigo-gray-600 font-label-sm text-label-sm">
                      <span>Latest issue:</span>
                      <span className="font-semibold text-primary px-2 py-0.5 rounded bg-surface-container">{new Date(prescriptions[0].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Biometrics &amp; Sync</span>
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                    <MonitorCheck className="w-[20px] h-[20px]" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-title-md text-title-md font-bold text-indigo-gray-900">118/76</span>
                    <span className="font-label-sm text-label-sm text-indigo-gray-600">mmHg</span>
                    <span className="font-label-sm text-label-sm text-outline">|</span>
                    <span className="font-title-md text-title-md font-bold text-indigo-gray-900">68</span>
                    <span className="font-label-sm text-label-sm text-indigo-gray-600">bpm</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-indigo-gray-600 font-label-sm text-label-sm">
                    <CheckCircle2 className="w-[15px] h-[15px] text-fresh-teal" />
                    <span className="truncate">HbA1c 5.6% · Synced Apple Health</span>
                  </div>
                </div>
              </div> */}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">

              <div className="lg:col-span-8 flex flex-col gap-stack-lg">

                <section className="space-y-base">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                      <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Recent Clinical Consultations</h2>
                    </div>
                  </div>
                  <ConsultationsList appointments={appointments || []} />
                </section>

                <section className="space-y-base">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal"></span>
                      <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Recent Diagnostic Reports &amp; SMS Dispatches</h2>
                    </div>
                    {/* <a className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1" href="#">
                      All Records ({diagnosticBookings?.length || 0}) <ChevronRight className="w-[16px] h-[16px]" />
                    </a> */}
                  </div>
                  <DiagnosticBookingsList diagnosticBookings={diagnosticBookings || []} />
                </section>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-stack-lg">

                <RecordsAndMedicationsList prescriptions={prescriptions || []} />

                {/* <div className="pt-2 flex flex-col gap-base">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
                      <div className="flex items-center gap-2">
                        <Clock className="w-[18px] h-[18px] text-primary" />
                        <span className="font-label-sm text-label-sm text-indigo-gray-900 font-medium">WhatsApp Reminders</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input defaultChecked className="sr-only peer" type="checkbox" />
                        <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-fresh-teal"></div>
                      </label>
                    </div>
                    <button className="w-full py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold hover:bg-primary transition-all shadow-sm flex items-center justify-center gap-1.5" type="button">
                      <Store className="w-[18px] h-[18px]" />
                      Express Refill to Home
                    </button>
                  </div> */}


              {/* <section className="p-stack-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-base border border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Preventative Care Journey</h2>
                    <TrendingUp className="text-outline w-[20px] h-[20px]" />
                  </div>

                  <div className="p-base rounded-xl bg-surface-container-low flex items-center gap-4">
                    <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
                        <path className="text-fresh-teal" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="75, 100" strokeLinecap="round" strokeWidth="3.5"></path>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-title-md text-body-md font-bold text-indigo-gray-900">
                        75%
                      </div>
                    </div>
                    <div>
                      <p className="font-label-sm text-label-sm text-primary font-semibold">Cardiac Wellness Track</p>
                      <p className="font-title-md text-body-md text-indigo-gray-900 font-bold">Step 3 of 4 Complete</p>
                      <p className="font-label-sm text-label-sm text-outline mt-0.5">Awaiting cardiologist synthesis</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-indigo-gray-600 font-label-sm text-label-sm">
                    <div className="flex items-center gap-2 text-indigo-gray-900 font-medium">
                      <CheckCircle2 className="text-fresh-teal w-[18px] h-[18px]" />
                      <span>1. Baseline Blood &amp; Lipid Evaluation</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-gray-900 font-medium">
                      <CheckCircle2 className="text-fresh-teal w-[18px] h-[18px]" />
                      <span>2. Contrast High-Resolution MRI</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <RefreshCw className="text-primary w-[18px] h-[18px] animate-spin" />
                      <span>3. Physician Diagnostic Synthesis</span>
                    </div>
                    <div className="flex items-center gap-2 text-outline">
                      <Circle className="w-[18px] h-[18px]" />
                      <span>4. Personalized Lifestyle &amp; Rx Plan</span>
                    </div>
                  </div>

                  <div className="pt-base border-t border-outline-variant/30 space-y-base mt-2">
                    <p className="font-label-sm text-label-sm text-indigo-gray-900 uppercase tracking-wider font-semibold">Clinically Curated For You</p>
                    <a className="group flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors" href="#">
                      <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIaFfWfNRhQsKFm6WUP03qXmrvJka6MPVs1ktu5khNPLt6XnyLy64OYRA5ZGLgyU0KXfhbb7S53PqID6dFdlrFz7lBijbhL3DElLgKdCr0HndBJY1mG9zaQlU7yeScVUyrKffVvD--ynvcNPC6FDxz_jQg2IGy-lxR1IOuTPIc-WNC2mcvKzcBgPfHIhq9AlidGOtUa_8f8n5Bx4RxUDboqSdqL4MVyVCRUPVPQg9JUz72rCXHqzAiUg" alt="Article 1" />
                      </div>
                      <div className="leading-tight">
                        <p className="font-label-sm text-label-sm font-semibold text-indigo-gray-900 group-hover:text-primary transition-colors line-clamp-2">
                          Navigating Post-Cardiac MRI: Understanding Your Myocardial Strain Score
                        </p>
                        <span className="font-label-sm text-[11px] text-outline mt-1 inline-block">3 min read · Reviewed by Cardiology</span>
                      </div>
                    </a>
                    <a className="group flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors" href="#">
                      <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOrJ8A8QzdqVGYuQqjcbpf41AaGylKqQDG4_7VzFI5OLECX0HcQaHHAzuUSsFAnsiCNDFSaf6SG-MFYmYcFcbzav8mqHDvvUZm_bIVZnp-Zk_N_jHVx4P9PutKgwftph7-khFTs-sJFbEO4u1o_bSbli6OHTtJCLeCNwK90N0dY38-KOTx3hB6DYDqKuro33ckutdm8PfVs2HwROzJOCq2ovl1vq9fcRE4qUBV2i_W-umhR6Y35B17kA" alt="Article 2" />
                      </div>
                      <div className="leading-tight">
                        <p className="font-label-sm text-label-sm font-semibold text-indigo-gray-900 group-hover:text-primary transition-colors line-clamp-2">
                          Optimal Hydration Schedules for Beta-Blocker Efficacy
                        </p>
                        <span className="font-label-sm text-[11px] text-outline mt-1 inline-block">4 min read · Pharmacology team</span>
                      </div>
                    </a>
                  </div>
                </section> */}
            </div>
          </div>
        </div>
    </div>
      </main >
    <Footer />
    </div >
  )
}
