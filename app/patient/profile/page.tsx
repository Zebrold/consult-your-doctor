import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Award, Droplet, Calendar, Mail, Phone, Edit, Download, Contact, ChevronRight, Users,
  Wallet, Heart, Sliders, HelpCircle, LogOut, Activity, ArrowRight, CalendarDays, FileText,
  TestTube, CheckCircle2, FolderOpen, User, Lock, MapPin, PhoneCall, HeartPulse, RefreshCw,
  Wind, AlertTriangle, AlertCircle, Stethoscope, MessageSquare, Share2, Cloud, ShieldCheck
} from 'lucide-react'
import { PatientSidebar } from '@/components/PatientSidebar'
import { PatientDock } from '@/components/PatientDock'

export default async function PatientProfilePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isPreview = searchParams?.preview === "patient";

  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser && !isPreview) redirect('/login/patient')

  const user = authUser || {
    id: 'preview-patient-id',
    email: 'alex.morgan@example.com',
    user_metadata: { role: 'patient' }
  }

  // Fetch user profile for name
  let profile = null;
  if (authUser) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = p;
  } else {
    profile = {
      id: user.id,
      full_name: 'Alex Eleanor Vance Morgan',
      email: 'alex.morgan@example.com'
    };
  }

  // Fetch patient details
  let patientDetails = null;
  if (authUser) {
    const { data: pd } = await supabase
      .from('patient_details')
      .select('*')
      .eq('id', user.id)
      .single()
    patientDetails = pd;
  } else {
    patientDetails = {
      uhid: 'CYD-MUM-8842',
      blood_group: 'O+ Positive',
      dob: '1996-01-08',
      gender: 'Male / Non-binary',
      address: 'Flat 42, Kensington Gardens Square, Bandra West, Mumbai, MH 400050',
      phone: '+91 98204 77210',
      emergency_contact_name: 'Marcus Morgan',
      emergency_contact_phone: '+91 98201 55319',
      emergency_contact_relation: 'Spouse'
    };
  }

  // Fetch all appointments for this patient
  let appointments = null;
  if (authUser) {
    const { data: appts } = await supabase
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
    appointments = appts;
  }

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
  const phone = (user as any).phone || '+91 98204 77210' // Placeholder if not available

  const upcomingAppointments = appointments?.filter(a => a.status === 'scheduled' || a.status === 'confirmed') || []
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null
  const completedLabs = diagnosticBookings?.filter(b => b.status === 'completed') || []
  const nextLab = completedLabs.length > 0 ? completedLabs[0] : null
  const totalDocuments = prescriptions.length

  const nextApptDoctor = nextAppointment ? (nextAppointment.doctors as any)?.profiles?.full_name : 'No upcoming appointments'
  const nextApptDate = nextAppointment ? new Date((nextAppointment.schedules as any)?.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

  return (
    <div className="bg-background min-h-screen text-on-surface flex flex-col font-sans pb-28">
      <main className="w-full flex-1">
        <div className="max-w-[1440px] mx-auto p-4 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: IDENTIFICATION & NAVIGATION SIDEBAR */}
            <PatientSidebar 
              user={user} 
              profile={profile} 
              patientDetails={patientDetails}
              activeAppointmentsCount={upcomingAppointments.length}
            />

            {/* RIGHT COLUMN: MAIN VITALS & PROFILE DATA */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* TOP SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border-t-2 border-primary">
                  <div className="flex items-start justify-between">
                    <span className="font-headline-lg text-3xl font-extrabold text-primary">{upcomingAppointments.length}</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      Active
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="font-title-md text-label-sm font-bold text-on-surface block">Upcoming</span>
                    <span className="font-body-md text-label-sm text-on-surface-variant flex items-center gap-1 mt-1 truncate">
                      <CalendarDays className="w-4 h-4 text-vibrant-blue shrink-0" />
                      {nextAppointment ? `${nextApptDoctor}: ${nextApptDate}` : 'No upcoming appts'}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border-t-2 border-fresh-teal">
                  <div className="flex items-start justify-between">
                    <span className="font-headline-lg text-3xl font-extrabold text-fresh-teal">{completedLabs.length}</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-fresh-teal font-label-sm text-label-sm font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="font-title-md text-label-sm font-bold text-on-surface block">Completed</span>
                    <span className="font-body-md text-label-sm text-on-surface-variant flex items-center gap-1 mt-1 truncate">
                      <TestTube className="w-4 h-4 text-fresh-teal shrink-0" />
                      {nextLab ? `${nextLab.test_name} (${(nextLab.diagnostic_centers as any)?.name})` : 'All reports verified'}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border-t-2 border-vibrant-blue">
                  <div className="flex items-start justify-between">
                    <span className="font-headline-lg text-3xl font-extrabold text-vibrant-blue">{totalDocuments}</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-vibrant-blue font-label-sm text-label-sm font-semibold flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5" />
                      Cloud Sync
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="font-title-md text-label-sm font-bold text-on-surface block">Documents</span>
                    <span className="font-body-md text-label-sm text-on-surface-variant flex items-center gap-1 mt-1 truncate">
                      <FileText className="w-4 h-4 text-vibrant-blue shrink-0" />
                      Prescriptions • Radiology • Labs
                    </span>
                  </div>
                </div>
              </div>

              {/* MEDICAL RECORDS & HISTORY ACCORDION/TABS CONTAINER */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6">
                
                {/* SECTION 1: PERSONAL INFORMATION & HISTORY */}
                <div className="flex flex-col gap-4 border-b border-surface-variant pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                        <Contact className="w-[18px] h-[18px]" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-headline-lg text-title-md font-bold text-on-surface">Personal Information</h3>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Official identification synced with ABDM Government Registry</span>
                      </div>
                    </div>
                    <Link href="#" className="font-label-sm text-label-sm font-bold text-vibrant-blue hover:underline flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" /> Request Update
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Full Legal Name</span>
                      <span className="font-title-md text-body-md font-bold text-on-surface">{fullName}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Date of Birth &amp; Gender</span>
                      <span className="font-title-md text-body-md font-bold text-on-surface">
                        {patientDetails?.date_of_birth ? new Date(patientDetails.date_of_birth).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : '08 January 1996'} • {patientDetails?.gender ? patientDetails.gender.charAt(0).toUpperCase() + patientDetails.gender.slice(1) : 'Male / Non-binary'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 md:col-span-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Registered Residential Address</span>
                      <div className="flex items-start gap-2 text-on-surface font-medium text-label-sm">
                        <MapPin className="w-4 h-4 text-vibrant-blue mt-0.5 shrink-0" />
                        <span>{patientDetails?.address || 'Flat 42, Kensington Gardens Square, Bandra West, Mumbai, MH 400050'}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 md:col-span-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Primary Emergency Contact</span>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface font-medium text-label-sm">
                          <User className="w-4 h-4 text-soft-coral" />
                          <span>{patientDetails?.emergency_contact_name || 'Marcus Morgan'}</span>
                          <span className="text-on-surface-variant text-label-sm">({patientDetails?.emergency_contact_relation || 'Spouse'})</span>
                        </div>
                        <span className="font-label-sm text-label-sm font-bold text-vibrant-blue flex items-center gap-1">
                          <PhoneCall className="w-3.5 h-3.5" />
                          {patientDetails?.emergency_contact_phone || '+91 98201 55319'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: HEALTH VITALS & BASELINE */}
                <div className="flex flex-col gap-4 border-b border-surface-variant pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-fresh-teal">
                        <HeartPulse className="w-[18px] h-[18px]" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-headline-lg text-title-md font-bold text-on-surface">Health Vitals &amp; Baseline</h3>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Continuous telemetry synced via Apple HealthKit &amp; ABDM gateway</span>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-fresh-teal bg-surface-container-low px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" /> Synced 14m ago
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Blood Pressure</span>
                        <Heart className="w-4 h-4 text-vibrant-blue" />
                      </div>
                      <div className="my-2">
                        <span className="font-headline-lg text-2xl font-black text-on-surface">118/76</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant ml-1">mmHg</span>
                      </div>
                      <div className="flex items-center justify-between text-label-sm">
                        <span className="font-label-sm text-label-sm text-vibrant-blue font-semibold">Optimal / Normal</span>
                        <svg className="w-16 h-4 text-vibrant-blue stroke-current" fill="none" viewBox="0 0 60 16">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 8h10l4-6 6 12 4-6h35" />
                        </svg>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Resting Heart Rate</span>
                        <Heart className="w-4 h-4 text-soft-coral" />
                      </div>
                      <div className="my-2">
                        <span className="font-headline-lg text-2xl font-black text-on-surface">71</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant ml-1">bpm</span>
                      </div>
                      <div className="flex items-center justify-between text-label-sm">
                        <span className="font-label-sm text-label-sm text-soft-coral font-semibold">Resting Steady</span>
                        <svg className="w-16 h-4 text-soft-coral stroke-current" fill="none" viewBox="0 0 60 16">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 10c10-8 20 6 30-2s18 4 28 0" />
                        </svg>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Blood Oxygen (SpO2)</span>
                        <Wind className="w-4 h-4 text-fresh-teal" />
                      </div>
                      <div className="my-2">
                        <span className="font-headline-lg text-2xl font-black text-on-surface">99%</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant ml-1">Oxygen Sat</span>
                      </div>
                      <div className="flex items-center justify-between text-label-sm">
                        <span className="font-label-sm text-label-sm text-fresh-teal font-semibold">Optimal Saturation</span>
                        <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div className="w-[99%] h-full bg-fresh-teal rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: ALLERGIES & CHRONIC CONDITIONS */}
                <div className="flex flex-col gap-4 border-b border-surface-variant pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-error-container/40 flex items-center justify-center text-error">
                        <AlertTriangle className="w-[18px] h-[18px]" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-headline-lg text-title-md font-bold text-on-surface">Allergies &amp; Clinical Alerts</h3>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Updated: 12 Jan 2026</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-4 rounded-xl bg-error-container/20 border border-error-container flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-error" />
                          <span className="font-title-md text-label-sm font-bold text-on-surface">Penicillin Group</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-extrabold tracking-wider">CRITICAL</span>
                      </div>
                      <p className="font-body-md text-label-sm text-on-surface-variant">Severe anaphylactic response. Strict contraindication for Beta-Lactam antibiotics.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-vibrant-blue" />
                          <span className="font-title-md text-label-sm font-bold text-on-surface">Mild Exercise Asthma</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">Managed</span>
                      </div>
                      <p className="font-body-md text-label-sm text-on-surface-variant">Prescribed rescue inhaler (Albuterol 90mcg PRN). Seasonal triggers during humidity shifts.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-container-high shrink-0">
                        <User className="w-full h-full p-2 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-title-md text-label-sm font-bold text-on-surface">Dr. Sarah Jenkins, MD</span>
                          <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">Primary Cardiologist</span>
                        </div>
                        <span className="font-body-md text-label-sm text-on-surface-variant">Lilavati Hospital Wing • Next review tomorrow, 10:30 AM</span>
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-sm shrink-0" type="button">
                      <MessageSquare className="w-4 h-4" /> Message Clinic
                    </button>
                  </div>
                </div>

                {/* SECTION 4: INTEGRATED CARE CHANNELS */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-vibrant-blue">
                        <Share2 className="w-[18px] h-[18px]" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-headline-lg text-title-md font-bold text-on-surface">Connected Health Channels</h3>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Real-time clinical delivery pipelines and patient dispatch gateways</span>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-fresh-teal bg-surface-container-low px-2.5 py-1 rounded-md font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-fresh-teal"></span> 3 Channels Online
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
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
      </main>

      {/* FLOATING BOTTOM DOCK WITH PROFILE TAB ACTIVE */}
      <PatientDock activeTab="profile" />
    </div>
  )
}
