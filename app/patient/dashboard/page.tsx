import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PatientDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/patient')

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
        file_url
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

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface min-h-screen">
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest border-b border-outline-variant shadow-[0_1px_8px_rgba(0,102,255,0.04)]">
        <div className="h-20 w-full px-margin-x-mobile lg:px-margin-x-desktop flex items-center justify-between gap-gutter">
          <div className="flex items-center gap-stack-lg">
            <a className="flex items-center gap-base" data-path="dashboard" href="#">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">stethoscope</span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-indigo-gray-900 tracking-tight leading-none">Consult Your Doctor</span>
                <span className="font-label-sm text-label-sm text-indigo-gray-600 leading-none mt-1">PATIENT PORTAL</span>
              </div>
            </a>
            <nav className="hidden xl:flex items-center gap-base">
              <a aria-current="page" className="px-4 py-2 transition-colors bg-primary-container text-on-primary-container font-semibold rounded-full" data-path="dashboard" href="#">Dashboard</a>
              <a className="px-4 py-2 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" data-path="my-appointments" href="#">My Appointments</a>
              <a className="px-4 py-2 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" data-path="lab-reports-diagnostics" href="#">Lab Reports &amp; Diagnostics</a>
              <a className="px-4 py-2 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" data-path="prescriptions" href="#">Prescriptions</a>
              <a className="px-4 py-2 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" data-path="doctors-hospitals" href="#">Doctors &amp; Hospitals</a>
              <a className="px-4 py-2 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" data-path="profile" href="#">Profile</a>
            </nav>
          </div>
          <div className="flex items-center gap-gutter">
            <div className="flex items-center gap-base">
              <button aria-label="Search" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" type="button">
                <span className="material-symbols-outlined text-[22px]">search</span>
              </button>
              <div className="relative">
                <button aria-label="Notifications" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" type="button">
                  <span className="material-symbols-outlined text-[22px]">notifications</span>
                </button>
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-soft-coral ring-2 ring-surface-container-lowest"></span>
              </div>
              <button aria-label="Help &amp; Support" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" type="button">
                <span className="material-symbols-outlined text-[22px]">help</span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant hidden sm:block"></div>
            <div className="flex items-center gap-stack-sm">
              <div className="text-right hidden md:block leading-tight">
                <p className="font-label-sm text-label-sm text-indigo-gray-900 font-semibold">Eleanor Vance</p>
                <p className="font-label-sm text-label-sm text-fresh-teal">Active Patient</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 bg-background pb-12">
        <div className="flex flex-col w-full">
          <div className="w-full max-w-7xl mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-stack-md flex flex-col gap-stack-lg">
            
            {/* Section 1: Hero & Patient Context */}
            <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-stack-md lg:p-stack-lg shadow-sm">
              <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none"></div>
              <div className="absolute right-1/3 -bottom-20 w-80 h-80 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col gap-stack-md">
                
                {/* Patient Identity Badges & Greeting */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-base">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        ABHA ID: 91-8204-7721-0941
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-label-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-fresh-teal animate-pulse"></span>
                        2FA Secure Biometrics
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[14px]">military_tech</span>
                        Care Tier: Premium Gold
                      </span>
                    </div>
                    <h1 className="font-display-lg text-headline-lg lg:text-display-lg text-indigo-gray-900 tracking-tight">
                      Welcome back, <span className="text-primary-container">Eleanor</span>
                    </h1>
                    <p className="font-body-md text-body-md text-indigo-gray-600">
                      Your clinical records are synchronized. {diagnosticBookings?.length || 0} diagnostic panel(s) and {appointments?.length || 0} consultation(s) are logged.
                    </p>
                  </div>
                  
                  {/* Quick Sync / Care Coordinator Preview */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low self-start lg:self-auto">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-lowest overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtWxMz-eBvW1Ghk-RB4rK_hV39P8xTp2-LAveOPB4ndQBjUedzAxfQV6QciuxuRL7jy1-1pZ3eLC8F3QtPXcL3MS9SOgHQObqu5rIpnyHVY3oOaIziLd_iaUh26Ua1LaxgXu_ziK6iNy_DdCsBcSrxlYS-NZs-KJREy099iSwMiofbVBdIfYe9EJnHXj55PzQDV3HhMZtUalBxUS1ExCkpkGzd1u2bhGsCkinBy982ZsgkmmRNc6I9Bw" alt="Care Concierge" />
                    </div>
                    <div className="text-left leading-snug">
                      <p className="font-label-sm text-label-sm text-indigo-gray-900 font-semibold">Care Concierge Online</p>
                      <p className="font-label-sm text-label-sm text-fresh-teal">Sister Maya (RN, BSN)</p>
                      <button className="font-label-sm text-label-sm text-primary hover:underline font-semibold mt-0.5 inline-flex items-center gap-1" type="button">
                        <span>Instant Message</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Global Search Bar */}
                <div className="relative w-full">
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-outline text-[22px] pointer-events-none">search</span>
                    <input className="w-full pl-12 pr-28 py-3.5 rounded-full bg-indigo-gray-50 text-indigo-gray-900 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container shadow-inner transition-all" placeholder="Search your health records, doctors, test reports, or prescribed medications..." type="text" />
                    <div className="absolute right-2 flex items-center gap-1">
                      <kbd className="hidden sm:inline-block px-2.5 py-1 rounded bg-surface-container-high text-outline text-[11px] font-semibold font-label-sm">⌘K</kbd>
                      <button className="p-2 rounded-full hover:bg-surface-container text-outline transition-colors" title="Voice Search" type="button">
                        <span className="material-symbols-outlined text-[20px]">mic</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Primary Quick Actions Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <button className="group flex items-center gap-3 p-3.5 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm" type="button">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/20 flex items-center justify-center text-on-primary-container group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[22px]">calendar_add_on</span>
                    </div>
                    <div className="text-left">
                      <p className="font-label-sm text-label-sm font-semibold leading-tight">Book Doctor</p>
                      <p className="font-label-sm text-[11px] opacity-80 leading-none mt-0.5">In-clinic or video</p>
                    </div>
                  </button>
                  <button className="group flex items-center gap-3 p-3.5 rounded-xl bg-surface-container text-primary hover:bg-surface-variant transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm" type="button">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[22px]">biotech</span>
                    </div>
                    <div className="text-left">
                      <p className="font-label-sm text-label-sm font-semibold text-indigo-gray-900 leading-tight">Lab &amp; Diagnostics</p>
                      <p className="font-label-sm text-[11px] text-indigo-gray-600 leading-none mt-0.5">Home sample pick-up</p>
                    </div>
                  </button>
                  <button className="group flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm" type="button">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[22px]">prescriptions</span>
                    </div>
                    <div className="text-left">
                      <p className="font-label-sm text-label-sm font-semibold leading-tight">Refill Medicine</p>
                      <p className="font-label-sm text-[11px] text-indigo-gray-600 leading-none mt-0.5">Express delivery in 2h</p>
                    </div>
                  </button>
                  <button className="group flex items-center gap-3 p-3.5 rounded-xl bg-tertiary-fixed text-tertiary hover:bg-error-container transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm" type="button">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
                    </div>
                    <div className="text-left">
                      <p className="font-label-sm text-label-sm font-semibold leading-tight">Emergency Teleconsult</p>
                      <p className="font-label-sm text-[11px] opacity-80 leading-none mt-0.5">Connect in &lt; 90 sec</p>
                    </div>
                  </button>
                </div>
              </div>
            </section>
            
            {/* Section 2: Key Health Metric Snapshot (4-Card Grid) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-base">
              {/* Visits Metric */}
              <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Upcoming Visits</span>
                  <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
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
              
              {/* Lab Reports Metric */}
              <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Lab Diagnostics</span>
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">lab_profile</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <p className="font-headline-lg text-headline-lg text-indigo-gray-900 font-bold leading-none">{diagnosticBookings?.length || 0} Total</p>
                    {diagnosticBookings && diagnosticBookings.length > 0 && <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-[11px] font-semibold">Ready</span>}
                  </div>
                  {diagnosticBookings && diagnosticBookings.length > 0 && (
                    <div className="mt-2.5 p-2 rounded-lg bg-fresh-teal/5 flex items-center gap-1.5 text-secondary">
                      <span className="material-symbols-outlined text-[16px]">sms</span>
                      <p className="font-label-sm text-label-sm truncate">SMS Dispatched &amp; Download Available</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Prescriptions Metric */}
              <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Prescriptions</span>
                  <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">medication</span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-headline-lg text-headline-lg text-indigo-gray-900 font-bold leading-none">3 <span className="font-title-md text-title-md font-semibold text-outline">Active</span></p>
                  <div className="mt-2.5 flex items-center justify-between text-indigo-gray-600 font-label-sm text-label-sm">
                    <span>Next refill due:</span>
                    <span className="font-semibold text-soft-coral px-2 py-0.5 rounded bg-error-container/40">In 6 days</span>
                  </div>
                </div>
              </div>
              
              {/* Connected Vitals Metric */}
              <div className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">Biometrics &amp; Sync</span>
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">sync_saved_locally</span>
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
                    <span className="material-symbols-outlined text-[15px] text-fresh-teal">check_circle</span>
                    <span className="truncate">HbA1c 5.6% · Synced Apple Health</span>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Main Content Dual Column (Layout Breakup) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
              
              {/* Left Column (8 cols): Appointments & Diagnostic Records */}
              <div className="lg:col-span-8 flex flex-col gap-stack-lg">
                
                {/* Section 3: Upcoming Consultations */}
                <section className="space-y-base">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                      <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Upcoming Clinical Consultations</h2>
                    </div>
                    <a className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1" href="#">
                      Calendar View <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </a>
                  </div>

                  {appointments?.length === 0 ? (
                    <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                      <p className="text-indigo-gray-600 font-label-sm">No upcoming clinical consultations.</p>
                    </div>
                  ) : (
                    appointments?.map((apt, idx) => {
                      const doctor: any = apt.doctors
                      const hospital: any = apt.hospitals
                      const schedule: any = apt.schedules
                      const date = new Date(schedule.start_time)
                      const isFirst = idx === 0

                      return (
                        <div key={apt.id} className="p-stack-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                          {isFirst && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container"></div>}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-base pb-base">
                            <div className="flex items-center gap-3.5">
                              <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden flex-shrink-0 text-primary">
                                <span className="material-symbols-outlined text-[28px]">account_circle</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Dr. {doctor.profiles.full_name}</h3>
                                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-[11px] font-semibold">{doctor.specialty}</span>
                                </div>
                                <p className="font-body-md text-body-md text-indigo-gray-600">{hospital.name} · {hospital.city}</p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="inline-block px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold">
                                {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}, {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <p className="font-label-sm text-label-sm text-outline mt-1 capitalize">Status: {apt.status.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="pt-base bg-surface-container-low/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-base mt-2 border-t border-outline-variant/20">
                            <div className="flex items-center gap-4 text-indigo-gray-600 font-label-sm text-label-sm">
                              <span className="flex items-center gap-1 uppercase">
                                <span className="material-symbols-outlined text-[16px] text-primary">confirmation_number</span> ID: {apt.id.slice(0, 8)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {apt.status === 'pending_payment' && (
                                <a href={`/patient/checkout/${apt.id}`} className="px-4 py-1.5 rounded-full bg-[#E31E24] text-white font-label-sm text-label-sm font-semibold hover:bg-red-700 transition-colors">
                                  Complete Payment
                                </a>
                              )}
                              <button className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold hover:bg-primary transition-all shadow-sm" type="button">
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </section>
                
                {/* Section 4: Recent Diagnostic Test Reports & Dispatches */}
                <section className="space-y-base">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal"></span>
                      <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Recent Diagnostic Reports &amp; SMS Dispatches</h2>
                    </div>
                    <a className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1" href="#">
                      All Records ({diagnosticBookings?.length || 0}) <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </a>
                  </div>

                  {diagnosticBookings?.length === 0 ? (
                    <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                      <p className="text-indigo-gray-600 font-label-sm">No recent diagnostic bookings.</p>
                    </div>
                  ) : (
                    diagnosticBookings?.map((booking) => {
                      const center: any = booking.diagnostic_centers
                      const date = new Date(booking.preferred_date)

                      return (
                        <div key={booking.id} className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-base border border-outline-variant/20 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                              <span className="material-symbols-outlined text-[20px]">bloodtype</span>
                            </div>
                            <div>
                              <h4 className="font-title-md text-body-lg text-indigo-gray-900 font-bold capitalize">{booking.test_name.replace(/-/g, ' ')}</h4>
                              <p className="font-label-sm text-label-sm text-indigo-gray-600">{center.name} · {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <span className="font-label-sm text-label-sm text-outline capitalize mb-2 sm:mb-0 mr-2">{booking.status.replace('_', ' ')}</span>
                            {booking.status === 'pending_payment' && (
                              <a href={`/patient/checkout/diagnostic/${booking.id}`} className="px-3.5 py-1.5 rounded-full bg-[#E31E24] text-white font-label-sm text-label-sm font-semibold hover:bg-red-700">
                                Complete Payment
                              </a>
                            )}
                            <button className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm font-medium hover:bg-surface-container" type="button">
                              View Summary
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </section>
              </div>
              
              {/* Right Column (4 cols): Pills, Care Journey & Library */}
              <div className="lg:col-span-4 flex flex-col gap-stack-lg">
                
                {/* Section 5: Active Medications & Pill Tracker */}
                <section className="p-stack-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-base border border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">pill</span>
                      <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Daily Medications</h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-label-sm font-semibold">3 Active</span>
                  </div>
                  
                  <div className="space-y-base">
                    {/* Pill 1 */}
                    <div className="p-3 rounded-xl bg-surface-container-low flex items-start justify-between gap-base">
                      <div className="space-y-0.5">
                        <p className="font-title-md text-body-md text-indigo-gray-900 font-bold">Atorvastatin 20mg</p>
                        <p className="font-label-sm text-label-sm text-indigo-gray-600">1 tablet at bedtime</p>
                        <span className="inline-block text-[11px] font-label-sm text-outline">14 days supply remaining</span>
                      </div>
                      <span className="px-2 py-1 rounded bg-surface-container text-primary font-label-sm text-[11px] font-semibold">Night</span>
                    </div>
                    {/* Pill 2 */}
                    <div className="p-3 rounded-xl bg-surface-container-low flex items-start justify-between gap-base">
                      <div className="space-y-0.5">
                        <p className="font-title-md text-body-md text-indigo-gray-900 font-bold">Metoprolol Tartrate 25mg</p>
                        <p className="font-label-sm text-label-sm text-indigo-gray-600">1 tab Morning &amp; Night (with meal)</p>
                        <span className="inline-block text-[11px] font-label-sm text-soft-coral font-semibold">Refill in 6 days</span>
                      </div>
                      <span className="px-2 py-1 rounded bg-surface-container text-secondary font-label-sm text-[11px] font-semibold">2x Daily</span>
                    </div>
                    {/* Pill 3 */}
                    <div className="p-3 rounded-xl bg-surface-container-low flex items-start justify-between gap-base">
                      <div className="space-y-0.5">
                        <p className="font-title-md text-body-md text-indigo-gray-900 font-bold">Vitamin D3 60,000 IU</p>
                        <p className="font-label-sm text-label-sm text-indigo-gray-600">Weekly dose on Sundays</p>
                        <span className="inline-block text-[11px] font-label-sm text-fresh-teal font-medium">Next: This Sunday</span>
                      </div>
                      <span className="px-2 py-1 rounded bg-surface-container text-indigo-gray-600 font-label-sm text-[11px]">Weekly</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex flex-col gap-base">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">alarm</span>
                        <span className="font-label-sm text-label-sm text-indigo-gray-900 font-medium">WhatsApp Reminders</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input defaultChecked className="sr-only peer" type="checkbox" />
                        <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-fresh-teal"></div>
                      </label>
                    </div>
                    <button className="w-full py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold hover:bg-primary transition-all shadow-sm flex items-center justify-center gap-1.5" type="button">
                      <span className="material-symbols-outlined text-[18px]">local_pharmacy</span>
                      Express Refill to Home
                    </button>
                  </div>
                </section>
                
                {/* Section 6: Care Roadmap Progress & Health Guidance */}
                <section className="p-stack-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-base border border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Preventative Care Journey</h2>
                    <span className="material-symbols-outlined text-outline text-[20px]">timeline</span>
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
                      <span className="material-symbols-outlined text-fresh-teal text-[18px]">check_circle</span>
                      <span>1. Baseline Blood &amp; Lipid Evaluation</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-gray-900 font-medium">
                      <span className="material-symbols-outlined text-fresh-teal text-[18px]">check_circle</span>
                      <span>2. Contrast High-Resolution MRI</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <span className="material-symbols-outlined text-primary text-[18px] animate-spin">refresh</span>
                      <span>3. Physician Diagnostic Synthesis</span>
                    </div>
                    <div className="flex items-center gap-2 text-outline">
                      <span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
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
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="w-full bg-indigo-gray-900 text-surface py-stack-lg border-t border-outline/20">
        <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-lg">
            <div className="space-y-stack-sm">
              <div className="flex items-center gap-base">
                <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                </div>
                <span className="font-title-md text-title-md text-surface tracking-tight">Consult Your Doctor</span>
              </div>
              <p className="font-body-md text-body-md text-outline-variant max-w-sm">Empowering proactive health decisions through unified clinical communication and seamless diagnostic coordination.</p>
            </div>
            <div>
              <h4 className="font-label-sm text-label-sm text-surface mb-stack-sm uppercase tracking-wider font-semibold">Clinical Services</h4>
              <ul className="space-y-base font-body-md text-body-md text-outline-variant">
                <li><a className="hover:text-surface transition-colors" data-path="doctors-hospitals" href="#">Physician Network</a></li>
                <li><a className="hover:text-surface transition-colors" data-path="lab-reports-diagnostics" href="#">Diagnostics &amp; Imaging</a></li>
                <li><a className="hover:text-surface transition-colors" data-path="prescriptions" href="#">E-Prescription Refills</a></li>
                <li><a className="hover:text-surface transition-colors" data-path="my-appointments" href="#">Urgent Care Visits</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-sm text-label-sm text-surface mb-stack-sm uppercase tracking-wider font-semibold">Legal &amp; Governance</h4>
              <ul className="space-y-base font-body-md text-body-md text-outline-variant">
                <li><a className="hover:text-surface transition-colors" href="#">Privacy Policy</a></li>
                <li><a className="hover:text-surface transition-colors" href="#">Patient Terms of Care</a></li>
                <li><a className="hover:text-surface transition-colors" href="#">Consent &amp; Disclosure</a></li>
                <li><a className="hover:text-surface transition-colors" href="#">Medical Disclaimers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-sm text-label-sm text-surface mb-stack-sm uppercase tracking-wider font-semibold">Security &amp; Compliance</h4>
              <ul className="space-y-base font-body-md text-body-md text-outline-variant">
                <li><a className="hover:text-surface transition-colors" href="#">HIPAA Compliant</a></li>
                <li><a className="hover:text-surface transition-colors" href="#">HITRUST Certified</a></li>
                <li><a className="hover:text-surface transition-colors" href="#">Data Encryption Standards</a></li>
                <li><a className="hover:text-surface transition-colors" href="#">Compliance Hotline</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-stack-md border-t border-outline/30 flex flex-col md:flex-row items-center justify-between gap-base text-outline-variant font-label-sm text-label-sm">
            <span>© 2025 Consult Your Doctor Health Systems Inc. All rights reserved.</span>
            <span>Emergency assistance: Dial 911 immediately for acute medical emergencies.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
