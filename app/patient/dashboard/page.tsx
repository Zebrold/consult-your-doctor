import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Award, Droplet, Calendar, Mail, Phone, Edit, Download, Contact, ChevronRight, Users,
  Wallet, Heart, Sliders, HelpCircle, LogOut, Activity, ArrowRight, CalendarDays, FileText,
  TestTube, CheckCircle2, FolderOpen, User, Lock, MapPin, PhoneCall, HeartPulse, RefreshCw,
  Wind, AlertTriangle, AlertCircle, Stethoscope, MessageSquare, Share2, Cloud, ShieldCheck,
  Home, Search, Calendar as CalendarIcon
} from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'

export default async function PatientDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/patient')

  // Fetch user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch patient details
  const { data: patientDetails } = await supabase
    .from('patient_details')
    .select('*')
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

  const fullName = profile?.full_name || 'Patient'
  const email = user.email
  const phone = user.phone || '+91 98204 77210' // Placeholder if not available

  const upcomingAppointments = appointments?.filter(a => a.status === 'scheduled' || a.status === 'confirmed') || []
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null
  const completedLabs = diagnosticBookings?.filter(b => b.status === 'completed') || []
  const nextLab = completedLabs.length > 0 ? completedLabs[0] : null
  const totalDocuments = prescriptions.length

  const nextApptDoctor = nextAppointment ? (nextAppointment.doctors as any)?.profiles?.full_name : 'No upcoming appointments'
  const nextApptDate = nextAppointment ? new Date((nextAppointment.schedules as any)?.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

  const nextLabName = nextLab ? nextLab.test_name : 'No recent lab reports'
  const nextLabCenter = nextLab ? (nextLab.diagnostic_centers as any)?.name : ''

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-24">
        <div className="flex flex-col w-full">
          {/* Subtle ambient background glow */}
          <div className="relative w-full overflow-hidden">
            <div className="absolute -top-32 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-80 -left-20 w-80 h-80 bg-fresh-teal/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Main Two-Column Layout */}
            <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1440px] mx-auto">

                {/* ==================== LEFT COLUMN (30% -> 4 cols) ==================== */}
                <PatientSidebar user={user} profile={profile} patientDetails={patientDetails} activeAppointmentsCount={upcomingAppointments.length} />

                {/* ==================== RIGHT COLUMN (70% -> 8 cols) ==================== */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* 1. Key Counts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-vibrant-blue/10 text-vibrant-blue flex items-center justify-center">
                          <CalendarDays className="w-[24px] h-[24px]" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">Active</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display-lg text-headline-lg font-extrabold text-on-surface leading-none">{upcomingAppointments.length}</span>
                          <span className="font-title-md text-body-md font-bold text-on-surface-variant">Upcoming</span>
                        </div>
                        <div className="mt-2.5 p-2 bg-surface-container-low rounded-lg flex items-center gap-2">
                          <FileText className="w-[16px] h-[16px] text-vibrant-blue shrink-0" />
                          <p className="font-label-sm text-label-sm text-on-surface truncate">
                            <strong className="font-bold">Dr. {nextApptDoctor}</strong>: {nextApptDate}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-fresh-teal/10 text-fresh-teal flex items-center justify-center">
                          <TestTube className="w-[24px] h-[24px]" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm font-bold">Verified</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display-lg text-headline-lg font-extrabold text-on-surface leading-none">{completedLabs.length}</span>
                          <span className="font-title-md text-body-md font-bold text-on-surface-variant">Completed</span>
                        </div>
                        <div className="mt-2.5 p-2 bg-surface-container-low rounded-lg flex items-center gap-2">
                          <CheckCircle2 className="w-[16px] h-[16px] text-fresh-teal shrink-0" />
                          <p className="font-label-sm text-label-sm text-on-surface truncate">
                            <strong className="font-bold">{nextLabCenter || 'Lab'}</strong>: {nextLabName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-surface-variant text-on-primary-fixed-variant flex items-center justify-center">
                          <FolderOpen className="w-[24px] h-[24px]" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">Cloud Sync</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display-lg text-headline-lg font-extrabold text-on-surface leading-none">{totalDocuments}</span>
                          <span className="font-title-md text-body-md font-bold text-on-surface-variant">Documents</span>
                        </div>
                        <div className="mt-2.5 p-2 bg-surface-container-low rounded-lg flex items-center gap-2">
                          <FileText className="w-[16px] h-[16px] text-primary shrink-0" />
                          <p className="font-label-sm text-label-sm text-on-surface truncate">
                            Prescriptions • Radiology • Summaries
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Personal Information & Medical History Panel */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-3 border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-vibrant-blue/10 flex items-center justify-center text-vibrant-blue">
                          <User className="w-[20px] h-[20px]" />
                        </div>
                        <div>
                          <h3 className="font-title-md text-title-md font-bold text-on-surface">Personal Information</h3>
                          <p className="font-body-md text-label-sm text-on-surface-variant">Official identification synced with ABDM Government Registry</p>
                        </div>
                      </div>
                      <button className="text-vibrant-blue hover:text-primary font-label-sm text-label-sm font-semibold inline-flex items-center gap-1" type="button">
                        <Lock className="w-[16px] h-[16px]" /> Request Update
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="p-3.5 bg-surface-container-low rounded-xl flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-outline">Full Legal Name</span>
                        <span className="font-body-md text-body-md font-semibold text-on-surface">{fullName}</span>
                      </div>
                      <div className="p-3.5 bg-surface-container-low rounded-xl flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-outline">Date of Birth &amp; Gender</span>
                        <span className="font-body-md text-body-md font-semibold text-on-surface">
                          {patientDetails?.date_of_birth ? new Date(patientDetails.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not provided'} • {patientDetails?.gender || 'Not provided'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-surface-container-low rounded-xl flex flex-col gap-1 md:col-span-2">
                        <span className="font-label-sm text-label-sm text-outline">Registered Residential Address</span>
                        <div className="flex items-start gap-2">
                          <MapPin className="text-on-surface-variant w-[18px] h-[18px] mt-0.5" />
                          <span className="font-body-md text-body-md font-medium text-on-surface">
                            {patientDetails?.address || 'Not provided'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3.5 bg-surface-container-low rounded-xl flex flex-col gap-1 md:col-span-2">
                        <span className="font-label-sm text-label-sm text-outline">Primary Emergency Contact</span>
                        {patientDetails?.emergency_contact_name ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="text-soft-coral w-[20px] h-[20px]" />
                              <span className="font-body-md text-body-md font-bold text-on-surface">{patientDetails.emergency_contact_name}</span>
                              {patientDetails.emergency_contact_relation && (
                                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">{patientDetails.emergency_contact_relation}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 font-body-md text-label-sm font-semibold text-vibrant-blue">
                              <Phone className="w-[16px] h-[16px]" /> {patientDetails.emergency_contact_phone || 'Not provided'}
                            </div>
                          </div>
                        ) : (
                          <span className="font-body-md text-body-md font-medium text-on-surface mt-1">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Health Vitals & Real-Time Baseline */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-fresh-teal/15 flex items-center justify-center text-fresh-teal">
                          <HeartPulse className="w-[20px] h-[20px]" />
                        </div>
                        <div>
                          <h3 className="font-title-md text-title-md font-bold text-on-surface">Health Vitals &amp; Baseline</h3>
                          <p className="font-body-md text-label-sm text-on-surface-variant">Continuous telemetry synced via Apple HealthKit &amp; ABDM gateway</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-bold flex items-center gap-1 self-start sm:self-auto">
                        <RefreshCw className="w-[14px] h-[14px]" /> Synced 14m ago
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Blood Pressure</span>
                          <Heart className="text-vibrant-blue w-[18px] h-[18px]" />
                        </div>
                        <div className="my-3">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">118/76</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">mmHg</span>
                          </div>
                          <span className="inline-block mt-1 font-label-sm text-label-sm font-bold text-fresh-teal">Optimal / Normal</span>
                        </div>
                        <div className="w-full h-8 pt-1">
                          <svg className="w-full h-full text-vibrant-blue" fill="none" viewBox="0 0 100 24">
                            <path d="M0 16 L20 16 L26 6 L32 20 L38 12 L44 16 L100 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Resting Heart Rate</span>
                          <Activity className="text-soft-coral w-[18px] h-[18px]" />
                        </div>
                        <div className="my-3">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">71</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">bpm</span>
                          </div>
                          <span className="inline-block mt-1 font-label-sm text-label-sm font-bold text-fresh-teal">Resting Steady</span>
                        </div>
                        <div className="w-full h-8 pt-1">
                          <svg className="w-full h-full text-soft-coral" fill="none" viewBox="0 0 100 24">
                            <path d="M0 14 Q25 8 50 14 T100 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                          </svg>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Blood Oxygen (SpO2)</span>
                          <Wind className="text-fresh-teal w-[18px] h-[18px]" />
                        </div>
                        <div className="my-3">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">99%</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">Oxygen Sat</span>
                          </div>
                          <span className="inline-block mt-1 font-label-sm text-label-sm font-bold text-fresh-teal">Optimal Saturation</span>
                        </div>
                        <div className="w-full h-8 flex items-center">
                          <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                            <div className="bg-fresh-teal h-full rounded-full" style={{ width: '99%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Allergies & Critical Alerts */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-soft-coral/15 flex items-center justify-center text-soft-coral">
                          <AlertTriangle className="w-[20px] h-[20px]" />
                        </div>
                        <h3 className="font-title-md text-title-md font-bold text-on-surface">Allergies &amp; Clinical Alerts</h3>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline">Updated: 12 Jan 2026</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-error-container/30 flex items-start gap-3">
                        <AlertCircle className="text-tertiary w-[22px] h-[22px] shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-title-md text-body-md font-bold text-on-error-container">Penicillin Group</span>
                            <span className="px-2 py-0.5 rounded-full bg-soft-coral text-on-error font-label-sm text-label-sm font-bold uppercase tracking-wider">Critical</span>
                          </div>
                          <p className="font-body-md text-label-sm text-on-error-container/90 mt-1">Severe anaphylactic response. Strict contraindication for Beta-Lactam antibiotics.</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex items-start gap-3">
                        <Stethoscope className="text-vibrant-blue w-[22px] h-[22px] shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-title-md text-body-md font-bold text-on-surface">Mild Exercise Asthma</span>
                            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold">Managed</span>
                          </div>
                          <p className="font-body-md text-label-sm text-on-surface-variant mt-1">Prescribed rescue inhaler (Albuterol 90mcg PRN). Seasonal triggers during humidity shifts.</p>
                        </div>
                      </div>
                    </div>

                    {nextApptDoctor !== 'No upcoming appointments' && (
                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                            <User className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-title-md text-body-md font-bold text-on-surface">Dr. {nextApptDoctor}</span>
                              <span className="font-label-sm text-label-sm text-vibrant-blue font-bold px-2 py-0.5 bg-primary-fixed rounded">Upcoming Consult</span>
                            </div>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">Scheduled for {nextApptDate}</span>
                          </div>
                        </div>
                        <button className="py-2 px-4 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0" type="button">
                          <MessageSquare className="w-[16px] h-[16px]" /> Message Clinic
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 5. Connected Health Channels */}
                  <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-fresh-teal/15 flex items-center justify-center text-secondary">
                          <Share2 className="w-[20px] h-[20px]" />
                        </div>
                        <div>
                          <h3 className="font-title-md text-title-md font-bold text-on-surface">Connected Health Channels</h3>
                          <p className="font-body-md text-label-sm text-on-surface-variant">Real-time clinical delivery pipelines and patient dispatch gateways</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-fresh-teal"></span> 3 Channels Online
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-fresh-teal/20 text-fresh-teal flex items-center justify-center">
                              <MessageSquare className="w-[20px] h-[20px]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-title-md text-label-sm font-bold text-on-surface">WhatsApp Rx Sync</span>
                              <span className="font-label-sm text-label-sm text-on-surface-variant">{phone}</span>
                            </div>
                          </div>
                          <div className="w-10 h-6 rounded-full bg-fresh-teal flex items-center justify-end px-1 cursor-pointer">
                            <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm"></div>
                          </div>
                        </div>
                        <p className="font-body-md text-label-sm text-on-surface-variant">Instant PDF prescriptions sent directly after clinical sign-off.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-vibrant-blue/20 text-vibrant-blue flex items-center justify-center">
                              <MessageSquare className="w-[20px] h-[20px]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-title-md text-label-sm font-bold text-on-surface">SMS Critical Alerts</span>
                              <span className="font-label-sm text-label-sm text-on-surface-variant">Priority 1 Gateway</span>
                            </div>
                          </div>
                          <div className="w-10 h-6 rounded-full bg-fresh-teal flex items-center justify-end px-1 cursor-pointer">
                            <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm"></div>
                          </div>
                        </div>
                        <p className="font-body-md text-label-sm text-on-surface-variant">Instant notification if lab markers deviate outside clinical baselines.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-secondary-container/50 text-on-secondary-container flex items-center justify-center">
                              <Cloud className="w-[20px] h-[20px]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-title-md text-label-sm font-bold text-on-surface">ABHA Locker</span>
                              <span className="font-label-sm text-label-sm text-on-surface-variant">National PHR Node</span>
                            </div>
                          </div>
                          <div className="w-10 h-6 rounded-full bg-fresh-teal flex items-center justify-end px-1 cursor-pointer">
                            <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm"></div>
                          </div>
                        </div>
                        <p className="font-body-md text-label-sm text-on-surface-variant">Encrypted consent-driven record replication across pan-India clinics.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="text-fresh-teal w-[18px] h-[18px]" />
                        <span>End-to-end 256-bit encrypted data store. Compliant with DISHA, ABDM M3, and HIPAA patient data mandates.</span>
                      </div>
                      <Link href="#" className="font-bold text-vibrant-blue hover:underline shrink-0 ml-2">Audit Logs</Link>
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
