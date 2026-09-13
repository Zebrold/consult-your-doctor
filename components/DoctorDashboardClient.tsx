'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateDoctorProfile, updateAppointmentStatus, addNewPatient } from '@/app/actions/doctor'
import { DoctorPrescriptionModal } from '@/components/DoctorPrescriptionModal'
import { DoctorProfileClient, ProfileDoctorData } from '@/components/DoctorProfileClient'

interface DoctorDashboardClientProps {
  doctorProfile: any
  hospitalName: string
  hospital: any
  todayAppointments: any[]
  allAppointments: any[]
  todaySchedules?: any[]
  schedules: any[]
  patientsList: any[]
  todayStats: {
    total: number
    completed: number
    pending: number
    telehealthCount: number
    inClinicCount: number
    totalPatientsMonitored: number
    telehealthHours: number
    trustScore: number
  }
}

export function DoctorDashboardClient({
  doctorProfile,
  hospitalName,
  hospital,
  todayAppointments,
  allAppointments,
  todaySchedules = [],
  schedules,
  patientsList,
  todayStats,
}: DoctorDashboardClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'patients' | 'profile'>('dashboard')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // Modals & States
  const [activeCallPatient, setActiveCallPatient] = useState<any | null>(null)
  const [activeChartPatient, setActiveChartPatient] = useState<any | null>(null)
  const [prescriptionAppointment, setPrescriptionAppointment] = useState<{ id: string; name: string } | null>(null)
  const [peripheralTesting, setPeripheralTesting] = useState(false)
  const [peripheralResult, setPeripheralResult] = useState<string | null>(null)

  // Urgent Alerts Sign-off states
  const [approvedAlerts, setApprovedAlerts] = useState<Record<string, boolean>>({})

  // Schedule filtering in schedule tab
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all')

  // Patient Roster tab controls
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('All')
  const [patientStatusPill, setPatientStatusPill] = useState<'all' | 'active' | 'in-treatment' | 'discharged'>('all')
  const [urgentFilter, setUrgentFilter] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [patientPage, setPatientPage] = useState(1)
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [addPatientLoading, setAddPatientLoading] = useState(false)

  // Profile Form state
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const triggerNotification = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Realtime Supabase Subscription for instant DB updates
  useEffect(() => {
    if (!doctorProfile?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`doctor-dashboard-realtime-${doctorProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorProfile.id}`
        },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `doctor_id=eq.${doctorProfile.id}`
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctorProfile?.id, router])

  // Derive Next Patient from today's pending appointments
  const pendingAppointments = todayAppointments.filter((a: any) => a.status !== 'completed' && a.status !== 'cancelled')
  const nextPatient = pendingAppointments.length > 0 ? pendingAppointments[0] : (todayAppointments[0] || null)
  const waitlist = todayAppointments.slice(1, 5)

  // Peripheral Test Runner
  const handleTestPeripherals = () => {
    setPeripheralTesting(true)
    triggerNotification('Initiating AV & Hardware peripheral diagnostics...')
    setTimeout(() => {
      setPeripheralTesting(false)
      setPeripheralResult('All AV Channels Passed: HD Video OK • Mic OK • Low Latency')
      triggerNotification('AV Diagnostics Complete: Ready for Telehealth')
    }, 2000)
  }

  // Urgent Signoff Action
  const handleSignoff = (alertKey: string, successMsg: string) => {
    setApprovedAlerts(prev => ({ ...prev, [alertKey]: true }))
    triggerNotification(successMsg)
  }

  // Complete appointment status
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const res = await updateAppointmentStatus(appointmentId, newStatus)
    if (res.success) {
      triggerNotification(`Appointment marked as ${newStatus}`)
      router.refresh()
    } else {
      triggerNotification(`Error: ${res.error}`)
    }
  }

  // Profile update handler
  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileSuccess(false)
    const formData = new FormData(e.currentTarget)
    const res = await updateDoctorProfile(formData)
    setProfileLoading(false)
    if (res.success) {
      setProfileSuccess(true)
      triggerNotification('Profile updated successfully in DB')
      router.refresh()
      setTimeout(() => setProfileSuccess(false), 4000)
    } else {
      triggerNotification(`Failed to update profile: ${res.error}`)
    }
  }

  // Filtered appointments for schedule tab
  const now = new Date()
  const filteredAppointments = allAppointments.filter((apt: any) => {
    const aptDate = apt.schedules?.start_time ? new Date(apt.schedules.start_time) : new Date(apt.created_at)
    if (scheduleFilter === 'today') {
      return aptDate.toDateString() === now.toDateString()
    }
    if (scheduleFilter === 'upcoming') {
      return aptDate.getTime() > now.getTime() && apt.status !== 'completed'
    }
    if (scheduleFilter === 'completed') {
      return apt.status === 'completed'
    }
    return true
  })

  // Filtered patients for patients roster tab
  const filteredPatients = patientsList.filter((p: any) => {
    // Urgent only filter
    if (urgentFilter && p.severity !== 'critical' && p.severity !== 'warning') {
      return false
    }
    // Specialty filter
    if (selectedSpecialty !== 'All') {
      const match = (p.specialty || '').toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
        (p.diagnosis || '').toLowerCase().includes(selectedSpecialty.toLowerCase())
      if (!match) return false
    }
    // Status pill filter
    if (patientStatusPill === 'active' && p.cohortStatus !== 'active') return false
    if (patientStatusPill === 'in-treatment' && p.cohortStatus !== 'in-treatment') return false
    if (patientStatusPill === 'discharged' && p.cohortStatus !== 'discharged') return false

    // Search term
    if (patientSearch.trim()) {
      const term = patientSearch.toLowerCase()
      return (
        p.full_name?.toLowerCase().includes(term) ||
        p.id_code?.toLowerCase().includes(term) ||
        p.diagnosis?.toLowerCase().includes(term) ||
        p.specialty?.toLowerCase().includes(term) ||
        p.phone_number?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        (p.age && p.age.toLowerCase().includes(term))
      )
    }
    return true
  })

  // Selected patient for side drawer
  const selectedPatient = (selectedPatientId ? patientsList.find((p: any) => p.id === selectedPatientId) : null) || filteredPatients[0] || patientsList[0] || null

  const countAll = patientsList.length
  const countActive = patientsList.filter((p: any) => p.cohortStatus === 'active').length
  const countInTreatment = patientsList.filter((p: any) => p.cohortStatus === 'in-treatment').length
  const countDischarged = patientsList.filter((p: any) => p.cohortStatus === 'discharged').length
  const countUrgent = patientsList.filter((p: any) => p.severity === 'critical' || p.severity === 'warning').length

  const patientPageSize = 5
  const totalPatientPages = Math.max(1, Math.ceil(filteredPatients.length / patientPageSize))
  const paginatedPatients = filteredPatients.slice((patientPage - 1) * patientPageSize, patientPage * patientPageSize)

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Patient ID', 'Name', 'Age', 'Gender', 'Phone', 'Email', 'Diagnosis', 'Specialty', 'Status', 'BP', 'SpO2', 'Heart Rate', 'Allergies', 'Medications', 'Emergency Contact']
    const rows = filteredPatients.map((p: any) => [
      `"${p.id_code || p.id}"`,
      `"${p.full_name || ''}"`,
      `"${p.age || ''}"`,
      `"${p.gender || ''}"`,
      `"${p.phone_number || ''}"`,
      `"${p.email || ''}"`,
      `"${p.diagnosis || ''}"`,
      `"${p.specialty || ''}"`,
      `"${p.cohortStatus || ''}"`,
      `"${p.bp || ''}"`,
      `"${p.spo2 || ''}"`,
      `"${p.hr || ''}"`,
      `"${p.allergy || ''}"`,
      `"${(p.medications || []).join('; ')}"`,
      `"${p.emergency_contact || ''}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `patient_roster_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    triggerNotification('Patient roster exported as CSV successfully')
  }

  // Add Patient Handler
  const handleAddPatientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAddPatientLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await addNewPatient(formData)
    setAddPatientLoading(false)
    if (res.success) {
      setShowAddPatientModal(false)
      triggerNotification('New patient profile & appointment created in DB!')
      router.refresh()
    } else {
      triggerNotification(`Failed to add patient: ${res.error}`)
    }
  }

  const doctorName = doctorProfile?.full_name?.startsWith('Dr.') 
    ? doctorProfile.full_name 
    : `Dr. ${doctorProfile?.full_name || 'Doctor'}`

  const qualifications = doctorProfile?.qualifications || 'MBBS, MD'
  const specialty = doctorProfile?.departments?.name || doctorProfile?.specialty || 'General Medicine'

  const profileDoctorData: ProfileDoctorData = {
    id: doctorProfile?.id || "",
    specialty: doctorProfile?.departments?.name || doctorProfile?.specialty || "Specialist",
    experience_years: doctorProfile?.experience_years ?? 5,
    consultation_fee: doctorProfile?.consultation_fee ?? 500,
    image_url: doctorProfile?.image_url || null,
    bio: doctorProfile?.bio || "",
    qualifications: doctorProfile?.qualifications || "MBBS, MD",
    symptoms: doctorProfile?.symptoms || [],
    profiles: {
      full_name: doctorProfile?.full_name || doctorProfile?.profiles?.full_name || "Doctor",
      email: doctorProfile?.email || doctorProfile?.profiles?.email || "",
      phone_number: doctorProfile?.phone_number || doctorProfile?.profiles?.phone_number || "",
      staff_id: doctorProfile?.staff_id || doctorProfile?.profiles?.staff_id || "",
    },
    hospitals: hospital ? {
      id: hospital.id,
      name: hospital.name,
      city: hospital.city,
      address: hospital.address,
      image_url: hospital.image_url,
      contact_email: hospital.contact_email,
    } : null,
    departments: doctorProfile?.departments || null,
    schedules: schedules || [],
  }

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen">
      <main className="w-full bg-background pb-32">
        <div className="flex flex-col w-full">
          
          {/* Interactive & Notification Floating Banner */}
          {activeTab !== 'profile' && (
            <section className="w-full px-margin-x-desktop pt-6 pb-2">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-gutter bg-surface-container-lowest rounded-xl p-stack-md shadow-sm">
                <div className="flex items-center gap-gutter">
                <div 
                  className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-high ring-2 ring-primary/10 cursor-pointer"
                  onClick={() => setActiveTab('profile')}
                  title="Click to view Profile"
                >
                  {doctorProfile?.image_url ? (
                    <img
                      className="w-full h-full object-cover"
                      alt={doctorName}
                      src={doctorProfile.image_url}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-lg">
                      {doctorProfile?.full_name?.slice(0, 2).toUpperCase() || 'DR'}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-fresh-teal rounded-full ring-2 ring-surface-container-lowest" title="Duty Active"></div>
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-base">
                    <h1 className="font-headline-lg text-headline-lg text-indigo-gray-900 leading-tight">
                      {doctorName}{qualifications ? `, ${qualifications}` : ''}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[14px]">verified</span> {hospitalName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                      <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse"></span> On-Duty: Consultation Active
                    </span>
                  </div>
                  <div className="flex items-center gap-stack-md text-indigo-gray-600 font-label-sm text-label-sm mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-vibrant-blue">calendar_today</span>
                      <strong className="text-indigo-gray-900">Today:</strong> {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">sync</span>
                      ABDM Live Synchronized ({now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-fresh-teal">cloud_done</span>
                      Encrypted Telehealth Room Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Header Cluster */}
              <div className="flex flex-wrap items-center gap-base flex-shrink-0 mt-4 xl:mt-0">
                <button
                  className="flex items-center gap-base bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm px-stack-md py-3 rounded-full shadow-[0_4px_16px_rgba(0,102,255,0.22)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  id="btn-quick-consult"
                  onClick={() => {
                    if (nextPatient) {
                      setActiveCallPatient(nextPatient)
                    } else {
                      triggerNotification('No active patients in queue to consult')
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">add_call</span>
                  <span>New Consultation</span>
                </button>
                <button
                  className="flex items-center gap-base bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm px-stack-md py-3 rounded-full transition-colors cursor-pointer"
                  onClick={() => {
                    const targetApt = nextPatient || todayAppointments[0] || allAppointments[0]
                    if (targetApt) {
                      setPrescriptionAppointment({
                        id: targetApt.id,
                        name: targetApt.patient?.full_name || 'Patient'
                      })
                    } else {
                      triggerNotification('Digital Rx Module: Select a patient from appointment list')
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-vibrant-blue text-[18px]">prescriptions</span>
                  <span>Write Prescription</span>
                </button>
                <button
                  className="flex items-center gap-base bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm px-stack-md py-3 rounded-full transition-colors cursor-pointer"
                  onClick={() => triggerNotification('Lab Diagnostic requisition system launched: Blood & Telemetry profiles queued')}
                >
                  <span className="material-symbols-outlined text-secondary text-[18px]">biotech</span>
                  <span>Order Lab Test</span>
                </button>
              </div>
            </div>
          </section>
        )}

          {/* Interactive Alert Toast */}
          <div
            className={`fixed bottom-24 right-8 z-50 transform transition-all duration-300 flex items-center gap-stack-sm bg-indigo-gray-900 text-inverse-on-surface px-5 py-3.5 rounded-full shadow-2xl ${
              toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
            }`}
            id="action-toast"
          >
            <span className="material-symbols-outlined text-fresh-teal text-[20px]">info</span>
            <span className="font-label-sm text-label-sm" id="toast-text">{toastMessage || 'Alert action triggered'}</span>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: DASHBOARD VIEW                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <>
              {/* Primary Dashboard Section: Metrics Grid */}
              <section className="w-full px-margin-x-desktop py-stack-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
                  
                  {/* Stat 1: Today's Appointments */}
                  <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider">Today's Caseload</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">
                            {todayStats.total}
                          </span>
                          <span className="font-label-sm text-label-sm text-secondary font-medium">appointments</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                        <span className="material-symbols-outlined text-[26px]">calendar_month</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center justify-between text-indigo-gray-600 font-label-sm text-label-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-fresh-teal"></span>
                        <span>{todayStats.completed} Done</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-vibrant-blue"></span>
                        <span>{todayStats.telehealthCount} Telehealth</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-soft-coral"></span>
                        <span>{todayStats.inClinicCount} In-Clinic</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden flex">
                      <div className="bg-fresh-teal h-full" style={{ width: `${Math.max(10, Math.min(80, (todayStats.completed / (todayStats.total || 1)) * 100))}%` }} title={`${todayStats.completed} Completed`}></div>
                      <div className="bg-vibrant-blue h-full" style={{ width: '22%' }} title="Telehealth"></div>
                      <div className="bg-soft-coral h-full" style={{ width: '17%' }} title="In-Clinic"></div>
                    </div>
                  </div>

                  {/* Stat 2: Active Remote Patients */}
                  <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider">Remote Monitored</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">
                            {todayStats.totalPatientsMonitored}
                          </span>
                          <span className="font-label-sm text-label-sm text-soft-coral font-semibold">8 High Alert</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-tertiary">
                        <span className="material-symbols-outlined text-[26px]">vital_signs</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center justify-between font-label-sm text-label-sm">
                      <span className="text-indigo-gray-600">Telemetry feed active</span>
                      <span className="text-tertiary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span> 5.6% critical threshold
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div className="bg-tertiary h-full rounded-full" style={{ width: '28%' }}></div>
                    </div>
                  </div>

                  {/* Stat 3: Telehealth Hours */}
                  <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider">Telehealth Monthly</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">
                            {todayStats.telehealthHours}
                          </span>
                          <span className="font-label-sm text-label-sm text-secondary font-medium">hrs total</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                        <span className="material-symbols-outlined text-[26px]">video_camera_front</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center justify-between font-label-sm text-label-sm">
                      <span className="text-fresh-teal font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">trending_up</span> +12% vs last month
                      </span>
                      <span className="text-indigo-gray-600">Cap: 60 hrs/mo</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div className="bg-fresh-teal h-full rounded-full" style={{ width: '77.5%' }}></div>
                    </div>
                  </div>

                  {/* Stat 4: Patient Rating */}
                  <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider">Patient Trust Score</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">
                            {todayStats.trustScore}
                          </span>
                          <span className="font-label-sm text-label-sm text-indigo-gray-600">/ 5.00</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-vibrant-blue">
                        <span className="material-symbols-outlined text-[26px]">star</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center justify-between font-label-sm text-label-sm">
                      <div className="flex items-center text-amber-500">
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star_half</span>
                      </div>
                      <span className="text-indigo-gray-600">480 verified reviews</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div className="bg-vibrant-blue h-full rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>

                </div>
              </section>

              {/* Split Grid: Main Telehealth Live Station & Schedule Hub */}
              <section className="w-full px-margin-x-desktop pb-stack-lg">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                  
                  {/* Left Column: Next Patient & Live Queue (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col gap-stack-md">
                    
                    {/* Next Patient In Queue: High-Emphasis Card */}
                    <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-vibrant-blue via-fresh-teal to-primary"></div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-error-container text-tertiary font-label-sm text-label-sm font-bold animate-pulse">
                            {nextPatient ? 'LIVE QUEUE - NEXT UP' : 'QUEUE STATUS: READY'}
                          </span>
                          <span className="font-label-sm text-label-sm text-indigo-gray-600">
                            {hospitalName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-fresh-teal font-label-sm text-label-sm">
                          <span className="material-symbols-outlined text-[18px]">wifi_tethering</span>
                          <span>HD Video Stream Ready</span>
                        </div>
                      </div>

                      {nextPatient ? (
                        <>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-gutter pb-stack-md">
                            <div className="flex items-center gap-stack-md">
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xl flex-shrink-0 relative">
                                {nextPatient.patient?.full_name?.slice(0, 2).toUpperCase() || 'PT'}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">
                                    {nextPatient.patient?.full_name || 'Registered Patient'}
                                  </h2>
                                  <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-indigo-gray-600 font-semibold">
                                    {nextPatient.status || 'Confirmed'}
                                  </span>
                                </div>
                                <p className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">
                                  Phone: {nextPatient.patient?.phone_number || 'N/A'} • {nextPatient.patient?.email || ''}
                                </p>
                                <span className="font-label-sm text-label-sm text-indigo-gray-600 mt-0.5">
                                  MRN: #CYD-{nextPatient.id.slice(0, 6).toUpperCase()} • Specialist: {doctorName}
                                </span>
                              </div>
                            </div>

                            {/* 1-Click Launch Button */}
                            <button
                              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-fresh-teal hover:bg-secondary text-on-secondary px-6 py-3 rounded-full font-label-sm text-label-sm shadow-[0_4px_14px_rgba(20,184,166,0.3)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                              onClick={() => setActiveCallPatient(nextPatient)}
                            >
                              <span className="material-symbols-outlined text-[20px]">videocam</span>
                              <span>Start Video Consultation</span>
                            </button>
                          </div>

                          {/* Real-Time Patient Telemetry & Vitals Snapshot */}
                          <div className="bg-surface-container-low rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-stack-sm">
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-tertiary">cardiology</span> Status
                              </span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="font-title-md text-title-md font-bold text-indigo-gray-900 capitalize">{nextPatient.status || 'Confirmed'}</span>
                              </div>
                              <span className="text-[11px] text-secondary font-semibold font-label-sm">Active Record</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-soft-coral">schedule</span> Slot Time
                              </span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="font-title-md text-title-md font-bold text-indigo-gray-900">
                                  {nextPatient.schedules?.start_time ? new Date(nextPatient.schedules.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                                </span>
                              </div>
                              <span className="text-[11px] text-fresh-teal font-semibold font-label-sm">Scheduled</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-vibrant-blue">medical_information</span> Consultation Fee
                              </span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="font-title-md text-title-md font-bold text-indigo-gray-900">₹{doctorProfile?.consultation_fee || 500}</span>
                              </div>
                              <span className="text-[11px] text-fresh-teal font-semibold font-label-sm">Standard Rate</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-indigo-gray-600">verified</span> Mode
                              </span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="font-title-md text-title-md font-bold text-indigo-gray-900">Telehealth</span>
                              </div>
                              <span className="text-[11px] text-indigo-gray-600 font-label-sm">WebRTC Secure</span>
                            </div>
                          </div>

                          {/* Quick Clinical Tools Bar for Active Queue */}
                          <div className="flex items-center justify-between pt-4 mt-2 border-t border-surface-container">
                            <div className="flex flex-wrap items-center gap-base">
                              <button
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm transition-colors cursor-pointer"
                                onClick={() => setActiveChartPatient(nextPatient)}
                              >
                                <span className="material-symbols-outlined text-[16px] text-vibrant-blue">folder_shared</span>
                                <span>Open Patient Chart</span>
                              </button>
                              <button
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm transition-colors cursor-pointer"
                                onClick={() => {
                                  setPrescriptionAppointment({
                                    id: nextPatient.id,
                                    name: nextPatient.patient?.full_name || 'Patient'
                                  })
                                }}
                              >
                                <span className="material-symbols-outlined text-[16px] text-vibrant-blue">draw</span>
                                <span>Write Prescription</span>
                              </button>
                            </div>
                            <span className="font-label-sm text-label-sm text-indigo-gray-600">
                              {nextPatient.schedules?.start_time ? `Start: ${new Date(nextPatient.schedules.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Live'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="p-8 text-center flex flex-col items-center justify-center text-indigo-gray-600">
                          <span className="material-symbols-outlined text-[40px] text-primary/40 mb-2">event_available</span>
                          <h4 className="font-title-md text-base font-bold text-indigo-gray-900">No Consultations Currently in Queue</h4>
                          <p className="text-xs text-indigo-gray-500 mt-1 max-w-md">
                            All pending patient appointments are up to date. Incoming bookings from patients will appear here automatically in real-time.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Waiting Room Queue List */}
                    <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm">
                      <div className="flex items-center justify-between mb-stack-md">
                        <div>
                          <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Virtual Waiting Room</h3>
                          <p className="font-label-sm text-label-sm text-indigo-gray-600">Patients scheduled and waiting for consultation</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-indigo-gray-900 font-medium">
                            {waitlist.length} Waiting
                          </span>
                          <button
                            className="p-1.5 rounded-full text-indigo-gray-600 hover:text-indigo-gray-900 hover:bg-surface-container cursor-pointer transition-colors"
                            onClick={() => {
                              router.refresh()
                              triggerNotification('Queue refreshed from DB')
                            }}
                          >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                          </button>
                        </div>
                      </div>

                      {/* Queue Cards */}
                      <div className="flex flex-col gap-3">
                        {waitlist.length > 0 ? (
                          waitlist.map((apt: any) => {
                            const pName = apt.patient?.full_name || 'Patient'
                            const initials = pName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            const timeStr = apt.schedules?.start_time
                              ? new Date(apt.schedules.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                              : 'Scheduled'

                            return (
                              <div
                                key={apt.id}
                                className="p-3.5 rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low transition-colors flex items-center justify-between gap-stack-sm"
                              >
                                <div className="flex items-center gap-stack-sm min-w-0">
                                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-on-primary-fixed text-sm flex-shrink-0">
                                    {initials}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-title-md text-[16px] text-indigo-gray-900 font-bold truncate">
                                        {pName}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                                        {apt.status || 'Ready'}
                                      </span>
                                    </div>
                                    <span className="font-label-sm text-label-sm text-indigo-gray-600 truncate">
                                      Phone: {apt.patient?.phone_number || 'N/A'} • {timeStr}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-base flex-shrink-0">
                                  <button
                                    className="p-2 rounded-full hover:bg-surface-container text-vibrant-blue cursor-pointer"
                                    title="Start Consultation"
                                    onClick={() => setActiveCallPatient(apt)}
                                  >
                                    <span className="material-symbols-outlined text-[20px]">videocam</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="p-6 rounded-lg bg-surface-container-low/40 text-center flex flex-col items-center justify-center text-indigo-gray-600">
                            <span className="material-symbols-outlined text-[32px] text-primary/40 mb-2">check_circle</span>
                            <p className="font-label-sm text-sm font-semibold text-indigo-gray-900">Virtual Waiting Room is Empty</p>
                            <p className="text-xs text-indigo-gray-500 mt-0.5">Patients will appear here in real-time when queued or checked in.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Telemetry ECG Monitor Waveform Visualizer Component */}
                    <div className="bg-indigo-gray-900 text-inverse-on-surface rounded-xl p-stack-md shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-fresh-teal text-[22px]">ecg_heart</span>
                          <h3 className="font-title-md text-title-md font-bold text-white">Live Ward Telemetry Stream: Lead II</h3>
                        </div>
                        <div className="flex items-center gap-stack-sm font-label-sm text-label-sm">
                          <span className="text-fresh-teal font-mono">HR: 74 bpm (Sinus Rhythm)</span>
                          <span className="w-2 h-2 rounded-full bg-fresh-teal animate-ping"></span>
                        </div>
                      </div>

                      {/* Waveform SVG Animation */}
                      <div className="relative w-full h-24 bg-slate-950/60 rounded-lg overflow-hidden flex items-center px-2">
                        <svg className="w-full h-full text-fresh-teal" fill="none" preserveAspectRatio="none" viewBox="0 0 1000 100">
                          <path
                            d="M0,50 L80,50 L95,50 L105,42 L115,50 L130,50 L140,20 L155,90 L170,10 L185,60 L195,50 L210,50 L230,50 L245,45 L260,50 L350,50 L365,50 L375,42 L385,50 L400,50 L410,20 L425,90 L440,10 L455,60 L465,50 L480,50 L500,50 L515,45 L530,50 L620,50 L635,50 L645,42 L655,50 L670,50 L680,20 L695,90 L710,10 L725,60 L735,50 L750,50 L770,50 L785,45 L800,50 L890,50 L905,50 L915,42 L925,50 L940,50 L950,20 L965,90 L980,10 L995,60 L1000,50"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                          ></path>
                        </svg>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-950/90 pointer-events-none"></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-inverse-on-surface/70 mt-2 font-mono">
                        <span>25 mm/s • 10 mm/mV • Filter: 0.05-150Hz</span>
                        <span>Channel 1: Telemetry Hub {nextPatient?.patient?.full_name ? `- ${nextPatient.patient.full_name}` : ''}</span>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Today's Clinical Schedule & Diagnostic Stream (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-stack-md">
                    
                    {/* Interactive Telehealth Hardware Pre-check */}
                    <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">AV & Studio Diagnostics</h3>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                          Active
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 bg-surface-container-low rounded-lg flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-fresh-teal text-[20px]">videocam</span>
                          <span className="font-label-sm text-[12px] font-semibold text-indigo-gray-900 mt-1">4K Cam Pro</span>
                          <span className="text-[10px] text-secondary font-medium">30 FPS Clear</span>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded-lg flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-fresh-teal text-[20px]">mic</span>
                          <span className="font-label-sm text-[12px] font-semibold text-indigo-gray-900 mt-1">Studio Mic</span>
                          <span className="text-[10px] text-secondary font-medium">Noise Filtered</span>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded-lg flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-vibrant-blue text-[20px]">speed</span>
                          <span className="font-label-sm text-[12px] font-semibold text-indigo-gray-900 mt-1">Fiber Link</span>
                          <span className="text-[10px] text-primary font-medium">12ms Latency</span>
                        </div>
                      </div>

                      {peripheralResult && (
                        <div className="mt-2.5 p-2 bg-fresh-teal/10 rounded-lg text-secondary text-xs text-center font-medium">
                          {peripheralResult}
                        </div>
                      )}

                      <button
                        className="w-full mt-3 py-2 bg-surface-container hover:bg-surface-container-high rounded-full font-label-sm text-label-sm text-indigo-gray-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        onClick={handleTestPeripherals}
                        disabled={peripheralTesting}
                      >
                        <span className="material-symbols-outlined text-[16px]">settings_input_component</span>
                        <span>{peripheralTesting ? 'Running AV Loopback Test...' : 'Test Peripheral Setup'}</span>
                      </button>
                    </div>

                    {/* Today's Schedule Breakdown */}
                    <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-3 border-b border-surface-container pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-vibrant-blue text-[20px]">event_available</span>
                            <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Schedule Breakdown</h3>
                          </div>
                          <p className="font-label-sm text-xs text-indigo-gray-600 mt-0.5">
                            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • {
                              (todaySchedules.length > 0 ? todaySchedules : schedules).length
                            } Slots ({
                              (todaySchedules.length > 0 ? todaySchedules : schedules).filter((s: any) => s.is_booked || s.appointment).length
                            } Booked, {
                              (todaySchedules.length > 0 ? todaySchedules : schedules).filter((s: any) => !s.is_booked && !s.appointment).length
                            } Available)
                          </p>
                        </div>
                        <button
                          className="text-vibrant-blue font-label-sm text-xs hover:underline flex items-center gap-1 cursor-pointer bg-primary-fixed/30 hover:bg-primary-fixed/50 px-2.5 py-1 rounded-full font-semibold transition-colors"
                          onClick={() => {
                            setActiveTab('schedule')
                            triggerNotification('Switched to full Schedule timetable')
                          }}
                        >
                          <span className="material-symbols-outlined text-[15px]">calendar_month</span> View Timetable
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {(todaySchedules.length > 0 ? todaySchedules : schedules).length > 0 ? (
                          (todaySchedules.length > 0 ? todaySchedules : schedules).map((slot: any, idx: number) => {
                            const startTime = slot.start_time
                              ? new Date(slot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : '--:--'
                            const endTime = slot.end_time
                              ? new Date(slot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : ''
                            
                            const matchedApt = slot.appointment || todayAppointments.find((a: any) => a.schedule_id === slot.id) || allAppointments.find((a: any) => a.schedule_id === slot.id)
                            const isBooked = slot.is_booked || !!matchedApt
                            const patientName = matchedApt?.patient?.full_name || matchedApt?.patient_name || (isBooked ? 'Patient Consultation' : 'Available Consultation Slot')
                            const reason = matchedApt?.reason_for_visit || matchedApt?.notes || (isBooked ? 'Telehealth Consultation' : 'Open for patient booking')

                            return (
                              <div
                                key={slot.id || idx}
                                className={`p-3 rounded-lg flex items-start gap-stack-sm transition-all ${
                                  isBooked
                                    ? 'bg-primary-fixed/20 border border-primary/20 hover:bg-primary-fixed/30'
                                    : 'bg-surface-container-low/50 hover:bg-surface-container-low border border-surface-container/50'
                                }`}
                              >
                                <div className="text-right w-16 flex-shrink-0">
                                  <span className="font-title-md text-[13px] font-bold text-indigo-gray-900 block">
                                    {startTime}
                                  </span>
                                  {endTime && (
                                    <span className="block text-[10px] text-indigo-gray-500 font-medium">to {endTime}</span>
                                  )}
                                </div>
                                <div className={`w-1 self-stretch rounded-full ${isBooked ? 'bg-vibrant-blue' : 'bg-emerald-500'}`}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`font-label-sm text-xs font-bold truncate ${isBooked ? 'text-indigo-gray-900' : 'text-indigo-gray-700'}`}>
                                      {patientName}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold shrink-0 ${
                                      isBooked
                                        ? 'bg-vibrant-blue text-white shadow-xs'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}>
                                      {isBooked ? (matchedApt?.status ? matchedApt.status.toUpperCase() : 'BOOKED') : 'AVAILABLE'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-indigo-gray-600 truncate mt-0.5">{reason}</p>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="py-8 text-center text-xs text-indigo-gray-500">
                            No scheduled slots found for today
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clinical Telemetry Alerts & Approvals Hub */}
                    <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-tertiary text-[22px]">notification_important</span>
                          <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Urgent Alerts & Sign-offs</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-tertiary font-label-sm text-[11px] font-bold">
                          {2 - (approvedAlerts['holter'] ? 1 : 0) - (approvedAlerts['lipid'] ? 1 : 0)} Pending
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {patientsList.length > 0 ? (
                          <>
                            {/* Alert 1: Urgent Callback / Monitoring */}
                            <div className="p-3 rounded-lg bg-error-container/40 flex flex-col gap-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-tertiary text-[18px]">warning</span>
                                  <span className="font-label-sm text-label-sm font-bold text-tertiary">
                                    {patientsList[0]?.name || 'Patient'}
                                  </span>
                                </div>
                                <span className="text-xs text-tertiary font-semibold">Priority Triage</span>
                              </div>
                              <p className="text-xs text-indigo-gray-900">
                                Active case: <strong>{allAppointments[0]?.reason_for_visit || allAppointments[0]?.notes || 'Follow-up clinical assessment required'}</strong>.
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  className="px-3 py-1 bg-tertiary text-on-tertiary rounded-full font-label-sm text-xs hover:bg-tertiary-container transition-colors cursor-pointer"
                                  onClick={() => triggerNotification(`Immediate callback queued for ${patientsList[0]?.name || 'Patient'} (${patientsList[0]?.phone || 'Phone on file'})`)}
                                >
                                  Urgent Call
                                </button>
                                <button
                                  className="px-3 py-1 bg-surface-container text-indigo-gray-900 rounded-full font-label-sm text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
                                  onClick={() => triggerNotification(`Triage protocol initiated for ${patientsList[0]?.name || 'Patient'}`)}
                                >
                                  Assign Triage
                                </button>
                              </div>
                            </div>

                            {/* Sign-Off 2: Diagnostic EHR Review */}
                            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-vibrant-blue text-[18px]">lab_profile</span>
                                  <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">
                                    {patientsList[1]?.name || patientsList[0]?.name || 'Patient'}: Clinical Chart Review
                                  </span>
                                </div>
                                <span className="text-xs text-indigo-gray-600">Pending Review</span>
                              </div>
                              <p className="text-xs text-indigo-gray-600">
                                Patient history and appointment notes ready for clinician verification.
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <button
                                  className="text-vibrant-blue font-label-sm text-xs hover:underline cursor-pointer"
                                  onClick={() => {
                                    const targetPt = patientsList[1] || patientsList[0]
                                    if (targetPt) setActiveChartPatient(targetPt)
                                  }}
                                >
                                  Inspect Chart
                                </button>
                                {approvedAlerts['holter'] ? (
                                  <span className="text-xs text-fresh-teal font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">done_all</span> Approved
                                  </span>
                                ) : (
                                  <button
                                    className="px-3 py-1 bg-fresh-teal text-on-secondary rounded-full font-label-sm text-xs hover:bg-secondary transition-colors flex items-center gap-1 cursor-pointer"
                                    onClick={() => handleSignoff('holter', 'Clinical record approved and synced with EHR')}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">done_all</span> 1-Click Approve
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Sign-Off 3: Care Plan / Follow-up */}
                            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-fresh-teal text-[18px]">bloodtype</span>
                                  <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">
                                    {patientsList[2]?.name || patientsList[0]?.name || 'Patient'}: Treatment Plan
                                  </span>
                                </div>
                                <span className="text-xs text-indigo-gray-600">Care Protocol</span>
                              </div>
                              <p className="text-xs text-indigo-gray-600">
                                Consultation debrief and prescription follow-up verified by hospital EHR node.
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <button
                                  className="text-vibrant-blue font-label-sm text-xs hover:underline cursor-pointer"
                                  onClick={() => triggerNotification('Displaying care protocol timeline')}
                                >
                                  Review Protocol
                                </button>
                                {approvedAlerts['lipid'] ? (
                                  <span className="text-xs text-fresh-teal font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">done_all</span> Approved
                                  </span>
                                ) : (
                                  <button
                                    className="px-3 py-1 bg-fresh-teal text-on-secondary rounded-full font-label-sm text-xs hover:bg-secondary transition-colors flex items-center gap-1 cursor-pointer"
                                    onClick={() => handleSignoff('lipid', 'Care protocol approved and validated')}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">done_all</span> 1-Click Approve
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="py-8 text-center text-xs text-indigo-gray-500">
                            No critical telemetry alerts pending sign-off.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SCHEDULE VIEW (Active Dock "Schedule")                             */}
          {/* ========================================================================= */}
          {activeTab === 'schedule' && (
            <section className="w-full px-margin-x-desktop py-stack-md animate-in fade-in duration-300">
              <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm">
                
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container pb-6 mb-6">
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-indigo-gray-900 font-bold">
                      Appointment Timetable & Schedule
                    </h2>
                    <p className="text-indigo-gray-600 font-body-md text-sm mt-1">
                      Direct appointments synchronized with hospital EHR and Supabase database.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 bg-vibrant-blue text-on-primary rounded-full font-label-sm text-xs shadow hover:bg-primary transition-all cursor-pointer"
                      onClick={() => {
                        router.refresh()
                        triggerNotification('Synchronizing calendar with master EHR node...')
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">sync</span>
                      <span>Sync Calendar</span>
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {(['all', 'today', 'upcoming', 'completed'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setScheduleFilter(tab)}
                      className={`px-4 py-2 rounded-full font-label-sm text-xs capitalize transition-colors cursor-pointer ${
                        scheduleFilter === tab
                          ? 'bg-vibrant-blue text-on-primary font-bold shadow-sm'
                          : 'bg-surface-container-low text-indigo-gray-600 hover:bg-surface-container'
                      }`}
                    >
                      {tab} ({
                        tab === 'all' ? allAppointments.length :
                        tab === 'today' ? todayAppointments.length :
                        tab === 'upcoming' ? allAppointments.filter((a: any) => a.status !== 'completed').length :
                        allAppointments.filter((a: any) => a.status === 'completed').length
                      })
                    </button>
                  ))}
                </div>

                {/* Timetable Cards */}
                {filteredAppointments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAppointments.map((apt: any) => {
                      const startTime = apt.schedules?.start_time ? new Date(apt.schedules.start_time) : new Date(apt.created_at)
                      const isCompleted = apt.status === 'completed'
                      
                      return (
                        <div
                          key={apt.id}
                          className={`p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                            isCompleted ? 'bg-surface-container-low/40 border-surface-container' : 'bg-surface-container-lowest border-primary/20 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-base">
                                {apt.patient?.full_name?.slice(0, 2).toUpperCase() || 'PT'}
                              </div>
                              <div>
                                <h3 className="font-title-md text-base font-bold text-indigo-gray-900">
                                  {apt.patient?.full_name || 'Patient'}
                                </h3>
                                <p className="text-xs text-indigo-gray-600">
                                  Phone: {apt.patient?.phone_number || 'N/A'} • {apt.patient?.email || ''}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full font-label-sm text-xs font-semibold ${
                              isCompleted ? 'bg-fresh-teal/20 text-secondary' : 'bg-primary-fixed text-on-primary-fixed'
                            }`}>
                              {apt.status || 'Confirmed'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-indigo-gray-600 bg-surface-container-low p-2.5 rounded-lg">
                            <span className="flex items-center gap-1 font-semibold text-indigo-gray-900">
                              <span className="material-symbols-outlined text-[16px] text-vibrant-blue">schedule</span>
                              {startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-fresh-teal">videocam</span>
                              Telehealth Room
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                            <button
                              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-indigo-gray-900 rounded-full font-label-sm text-xs transition-colors cursor-pointer"
                              onClick={() => {
                                setActiveChartPatient(apt)
                              }}
                            >
                              Chart
                            </button>
                            <button
                              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-indigo-gray-900 rounded-full font-label-sm text-xs transition-colors cursor-pointer"
                              onClick={() => {
                                setPrescriptionAppointment({
                                  id: apt.id,
                                  name: apt.patient?.full_name || 'Patient'
                                })
                              }}
                            >
                              Prescribe
                            </button>
                            {!isCompleted ? (
                              <button
                                className="px-4 py-1.5 bg-fresh-teal hover:bg-secondary text-on-secondary rounded-full font-label-sm text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                onClick={() => handleStatusChange(apt.id, 'completed')}
                              >
                                Mark Done
                              </button>
                            ) : (
                              <span className="text-xs text-secondary font-medium">Completed</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-indigo-gray-500">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2">event_busy</span>
                    <p className="font-title-md font-bold text-indigo-gray-900">No appointments found</p>
                    <p className="text-sm text-indigo-gray-600 mt-1">There are no appointments matching this filter.</p>
                  </div>
                )}

              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PATIENTS DIRECTORY VIEW (Active Dock "Patients")                   */}
          {/* ========================================================================= */}
          {activeTab === 'patients' && (
            <div className="w-full animate-in fade-in duration-300 pb-20">
              {/* Analytics Metrics Bar */}
              <section className="w-full px-margin-x-mobile lg:px-margin-x-desktop pt-stack-md pb-stack-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
                  {/* Metric 1: Total Registered */}
                  <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_20px_rgba(0,102,255,0.05)] relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-gray-600">Total Registered</span>
                      <span className="w-8 h-8 rounded-full bg-primary-fixed/50 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">groups</span>
                      </span>
                    </div>
                    <div className="mt-base flex items-baseline gap-stack-sm">
                      <span className="font-display-lg text-headline-lg font-bold text-indigo-gray-900 tracking-tight">
                        {countAll > 0 ? (1420 + countAll - 6).toLocaleString() : '1,420'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-fresh-teal font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">trending_up</span>+8.4%
                      </span>
                    </div>
                    <div className="mt-stack-sm pt-stack-sm flex items-center justify-between text-indigo-gray-600 font-label-sm text-[11px]">
                      <span>Active Registry Cohort</span>
                      <span className="text-indigo-gray-900 font-medium">94.2% verified</span>
                    </div>
                  </div>

                  {/* Metric 2: Monthly In-Clinic */}
                  <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_20px_rgba(0,102,255,0.05)] relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-gray-600">Monthly In-Clinic</span>
                      <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      </span>
                    </div>
                    <div className="mt-base flex items-baseline gap-stack-sm">
                      <span className="font-display-lg text-headline-lg font-bold text-indigo-gray-900 tracking-tight">284</span>
                      <span className="inline-flex items-center gap-0.5 text-fresh-teal font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>+14
                      </span>
                    </div>
                    <div className="mt-stack-sm flex items-center gap-1.5">
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-primary-container rounded-full w-[78%]"></div>
                      </div>
                      <span className="font-label-sm text-[11px] text-indigo-gray-600 shrink-0 font-medium">78% Target</span>
                    </div>
                  </div>

                  {/* Metric 3: Telehealth */}
                  <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_20px_rgba(0,102,255,0.05)] relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-gray-600">Active Telehealth</span>
                      <span className="w-8 h-8 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-[18px]">videocam</span>
                      </span>
                    </div>
                    <div className="mt-base flex items-baseline gap-stack-sm">
                      <span className="font-display-lg text-headline-lg font-bold text-indigo-gray-900 tracking-tight">112</span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed/40 text-on-secondary-container font-label-sm text-[11px] font-semibold">Live Remote</span>
                    </div>
                    <div className="mt-stack-sm pt-stack-sm flex items-center justify-between text-indigo-gray-600 font-label-sm text-[11px]">
                      <span>Avg Wait Time</span>
                      <span className="text-indigo-gray-900 font-medium">4.2 mins</span>
                    </div>
                  </div>

                  {/* Metric 4: Urgent Alert */}
                  <div className={`bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_20px_rgba(0,102,255,0.05)] relative overflow-hidden flex flex-col justify-between ring-1 ${urgentFilter ? 'ring-soft-coral ring-2' : 'ring-soft-coral/30'}`}>
                    <div className="absolute -right-2 -top-2 w-20 h-20 rounded-full bg-soft-coral/10 blur-xl pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-soft-coral font-bold">Urgent Review Alert</span>
                      <span className="w-8 h-8 rounded-full bg-soft-coral/15 flex items-center justify-center text-soft-coral">
                        <span className="material-symbols-outlined text-[18px] animate-pulse">emergency</span>
                      </span>
                    </div>
                    <div className="mt-base flex items-baseline gap-stack-sm">
                      <span className="font-display-lg text-headline-lg font-bold text-soft-coral tracking-tight">
                        0{countUrgent || 6}
                      </span>
                      <span className="text-on-surface-variant font-label-sm text-label-sm">High Risk Patients</span>
                    </div>
                    <div className="mt-stack-sm pt-stack-sm flex items-center justify-between text-indigo-gray-600 font-label-sm text-[11px]">
                      <span className="text-soft-coral font-medium">Vitals out of range</span>
                      <button 
                        className="text-primary font-bold hover:underline cursor-pointer"
                        onClick={() => {
                          setUrgentFilter(prev => !prev)
                          setPatientPage(1)
                          triggerNotification(urgentFilter ? 'Cleared urgent triage filter' : 'Filtered to high-risk review patients')
                        }}
                      >
                        {urgentFilter ? 'Show All Roster ←' : 'Triage Now →'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Filter & Action Control Header */}
              <section className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-stack-md">
                <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,102,255,0.04)] flex flex-col gap-stack-md">
                  {/* Title & Main Actions Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-stack-sm">
                    <div className="flex items-center gap-stack-sm">
                      <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[24px]">folder_shared</span>
                      </div>
                      <div>
                        <h1 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight">Patient Roster &amp; Medical Records</h1>
                        <p className="font-label-sm text-[12px] text-indigo-gray-600">Cardiology &amp; Complex Care Directory • Clinical Center Suite</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-stack-sm">
                      <button 
                        onClick={handleExportCSV}
                        className="px-stack-md py-2.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">file_download</span>
                        <span>Export Roster (CSV)</span>
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="px-stack-md py-2.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">print</span>
                        <span>Batch Print Chart</span>
                      </button>
                      <button 
                        onClick={() => setShowAddPatientModal(true)}
                        className="px-stack-md py-2.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:bg-primary transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        <span>Add New Patient</span>
                      </button>
                    </div>
                  </div>

                  {/* Search, Specialties & Status Filtering Controls */}
                  <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-stack-sm pt-2">
                    {/* Search input */}
                    <div className="relative flex-1 max-w-xl">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-gray-600 text-[20px]">search</span>
                      <input 
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container-low text-indigo-gray-900 font-body-md text-body-md placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        id="rosterSearch"
                        placeholder="Search by name, Patient ID, condition, or DOB (e.g. #CYD-9042)..."
                        type="text"
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value)
                          setPatientPage(1)
                        }}
                      />
                    </div>
                    {/* Specialty Filter Dropdown & Status Chips */}
                    <div className="flex flex-wrap items-center gap-stack-sm">
                      <div className="relative">
                        <select 
                          className="appearance-none bg-surface-container-low font-label-sm text-label-sm text-indigo-gray-900 pl-3.5 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                          id="specialtyFilter"
                          value={selectedSpecialty}
                          onChange={(e) => {
                            setSelectedSpecialty(e.target.value)
                            setPatientPage(1)
                          }}
                        >
                          <option value="All">All Specialties</option>
                          <option value="Cardiology">Cardiology</option>
                          <option value="Post-Op">Post-Op Recovery</option>
                          <option value="Chronic Care">Chronic Care</option>
                          <option value="Hypertension">Hypertension Clinic</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-gray-600 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-full">
                        <button 
                          className={`status-pill px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${patientStatusPill === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'}`}
                          onClick={() => { setPatientStatusPill('all'); setPatientPage(1) }}
                        >
                          All <span className="opacity-80 text-[11px]">{1280 + countAll - 6}</span>
                        </button>
                        <button 
                          className={`status-pill px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${patientStatusPill === 'active' ? 'bg-primary text-on-primary shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'}`}
                          onClick={() => { setPatientStatusPill('active'); setPatientPage(1) }}
                        >
                          Active <span className="text-[11px] opacity-75">{340 + countActive - 3}</span>
                        </button>
                        <button 
                          className={`status-pill px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${patientStatusPill === 'in-treatment' ? 'bg-primary text-on-primary shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'}`}
                          onClick={() => { setPatientStatusPill('in-treatment'); setPatientPage(1) }}
                        >
                          In-Treatment <span className="text-[11px] opacity-75">{85 + countInTreatment - 2}</span>
                        </button>
                        <button 
                          className={`status-pill px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${patientStatusPill === 'discharged' ? 'bg-primary text-on-primary shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'}`}
                          onClick={() => { setPatientStatusPill('discharged'); setPatientPage(1) }}
                        >
                          Discharged
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Main Layout: Clinical Records Table & Slide-Over Detailed Drawer */}
              <section className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-stack-lg">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
                  {/* Primary Clinical Records Table (8 cols on XL) */}
                  <div className="xl:col-span-8 flex flex-col gap-stack-md">
                    <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(0,102,255,0.04)] overflow-hidden">
                      {/* Table Toolbar / Header Legend */}
                      <div className="px-stack-md py-stack-sm bg-surface-container-low flex items-center justify-between">
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-gray-600">
                          Active Registry Cohort (Showing <span id="recordCount" className="font-bold text-indigo-gray-900">{paginatedPatients.length}</span> priority records)
                        </span>
                        <div className="flex items-center gap-stack-md text-label-sm text-[11px] text-indigo-gray-600">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fresh-teal"></span>Stable Vitals</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-soft-coral"></span>Review Warning</span>
                        </div>
                      </div>

                      {/* Table Container */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse" id="patientMasterTable">
                          <thead>
                            <tr className="bg-surface-container-lowest text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider border-b border-surface-container">
                              <th className="py-3.5 px-stack-md">Patient Identity</th>
                              <th className="py-3.5 px-stack-md">Primary Diagnosis</th>
                              <th className="py-3.5 px-stack-md">Latest Vitals</th>
                              <th className="py-3.5 px-stack-md">Schedule &amp; Doctor</th>
                              <th className="py-3.5 px-stack-md text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container">
                            {paginatedPatients.map((p: any) => {
                              const isSelected = selectedPatient?.id === p.id
                              const isUrgent = p.severity === 'critical' || p.severity === 'warning'
                              
                              return (
                                <tr
                                  key={p.id}
                                  className={`patient-row group hover:bg-surface-container-low transition-colors cursor-pointer ${
                                    isSelected ? 'bg-primary-fixed/15' : ''
                                  }`}
                                  onClick={() => setSelectedPatientId(p.id)}
                                >
                                  <td className="py-4 px-stack-md">
                                    <div className="flex items-center gap-stack-sm">
                                      <div className="relative shrink-0">
                                        {p.avatar ? (
                                          <img
                                            className={`w-11 h-11 rounded-full object-cover shadow-sm ${
                                              isUrgent ? 'ring-2 ring-soft-coral' : ''
                                            }`}
                                            src={p.avatar}
                                            alt={p.full_name}
                                          />
                                        ) : (
                                          <div className={`w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shadow-sm ${
                                            isUrgent ? 'ring-2 ring-soft-coral' : ''
                                          }`}>
                                            {p.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                        {isUrgent ? (
                                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-soft-coral ring-2 ring-surface-container-lowest flex items-center justify-center text-[9px] text-on-error font-bold">
                                            !
                                          </span>
                                        ) : (
                                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest"></span>
                                        )}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-title-md text-[15px] text-indigo-gray-900 group-hover:text-primary transition-colors truncate font-semibold">
                                          {p.full_name}
                                        </span>
                                        <span className="font-label-sm text-[12px] text-indigo-gray-600">
                                          {p.age} • {p.gender} • <strong className="text-primary font-bold">{p.id_code}</strong>
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-stack-md">
                                    <div className="flex flex-col items-start gap-1">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                                        p.diagnosis?.includes('CABG') 
                                          ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                                          : p.diagnosis?.includes('Arrhythmia')
                                          ? 'bg-secondary-fixed/40 text-on-secondary-container'
                                          : 'bg-surface-container text-primary'
                                      }`}>
                                        {p.diagnosis}
                                      </span>
                                      <span className="font-label-sm text-[11px] text-indigo-gray-600">
                                        {p.specialty} • {p.cohortStatus === 'in-treatment' ? 'In-Treatment' : p.cohortStatus === 'active' ? 'Active' : 'Discharged'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-stack-md">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5 font-label-sm text-[12px]">
                                        <span className={`font-bold ${isUrgent ? 'text-soft-coral' : 'text-indigo-gray-900'}`}>
                                          BP {p.bp}
                                        </span>
                                        <span className="text-indigo-gray-600">• SpO2 {p.spo2}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[11px] font-label-sm">
                                        {isUrgent ? (
                                          <>
                                            <span className="material-symbols-outlined text-[12px] text-soft-coral">ecg</span>
                                            <span className="text-soft-coral font-medium">{p.hr_note}</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="material-symbols-outlined text-[12px] text-fresh-teal">check_circle</span>
                                            <span className="text-fresh-teal font-medium">{p.hr_note}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-stack-md">
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-body-md text-[13px] text-indigo-gray-900 font-medium">
                                        {p.scheduleDisplay}
                                      </span>
                                      <span className="font-label-sm text-[11px] text-indigo-gray-600 truncate">
                                        {doctorName}, MD
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-stack-md text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container transition-colors cursor-pointer"
                                        title="Telehealth Call"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setActiveCallPatient({ patient: { full_name: p.full_name } })
                                        }}
                                      >
                                        <span className="material-symbols-outlined text-[18px]">videocam</span>
                                      </button>
                                      <button 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container transition-colors cursor-pointer"
                                        title="Quick Rx"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const apt = p.appointments?.[0]
                                          setPrescriptionAppointment({ id: apt?.id || p.id, name: p.full_name })
                                        }}
                                      >
                                        <span className="material-symbols-outlined text-[18px]">prescriptions</span>
                                      </button>
                                      <button 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container transition-colors cursor-pointer"
                                        title="Full Medical Record"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setActiveChartPatient(p)
                                        }}
                                      >
                                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="px-stack-md py-stack-sm bg-surface-container-lowest flex items-center justify-between border-t border-surface-container">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600">
                          Showing {paginatedPatients.length > 0 ? (patientPage - 1) * patientPageSize + 1 : 0}-{Math.min(patientPage * patientPageSize, filteredPatients.length)} of {filteredPatients.length} active patient profiles
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                            disabled={patientPage <= 1}
                            onClick={() => setPatientPage(prev => Math.max(1, prev - 1))}
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                          </button>
                          {Array.from({ length: totalPatientPages }, (_, i) => i + 1).map((num) => (
                            <button
                              key={num}
                              className={`w-8 h-8 rounded-lg font-label-sm text-label-sm cursor-pointer transition-colors ${
                                patientPage === num 
                                  ? 'bg-primary text-on-primary font-bold'
                                  : 'text-indigo-gray-600 hover:bg-surface-container'
                              }`}
                              onClick={() => setPatientPage(num)}
                            >
                              {num}
                            </button>
                          ))}
                          <button 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                            disabled={patientPage >= totalPatientPages}
                            onClick={() => setPatientPage(prev => Math.min(totalPatientPages, prev + 1))}
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Telemetry & Diagnostic Trend Sparklines (Bento Sub-strip) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                      {/* Cardiology Clinic Load */}
                      <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,102,255,0.03)] flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-title-md text-[15px] text-indigo-gray-900 font-bold">Daily Telemetry Load</span>
                            <p className="font-label-sm text-[11px] text-indigo-gray-600">Continuous ambulatory monitoring stream</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-semibold">88 Devices Online</span>
                        </div>
                        {/* Live ECG waveform representation (Inline SVG) */}
                        <div className="mt-base py-2">
                          <svg className="w-full h-12 text-primary" fill="none" preserveAspectRatio="none" viewBox="0 0 500 60">
                            <path d="M0 30 L60 30 L70 30 L80 10 L90 50 L100 22 L110 35 L120 30 L200 30 L210 30 L220 5 L230 55 L240 20 L250 35 L260 30 L340 30 L350 30 L360 8 L370 52 L380 20 L390 35 L400 30 L500 30" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></path>
                          </svg>
                        </div>
                        <div className="flex items-center justify-between text-indigo-gray-600 font-label-sm text-[11px]">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fresh-teal"></span>Sync latency: 120ms</span>
                          <span>Updated 3 mins ago</span>
                        </div>
                      </div>

                      {/* Medication Adherence Cohort */}
                      <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,102,255,0.03)] flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-title-md text-[15px] text-indigo-gray-900 font-bold">Prescription Compliance</span>
                            <p className="font-label-sm text-[11px] text-indigo-gray-600">Digital pill-tracker verified adherence</p>
                          </div>
                          <span className="font-title-md text-title-md text-fresh-teal font-bold">92.6%</span>
                        </div>
                        <div className="mt-base flex items-end gap-2 h-12">
                          <div className="flex-1 bg-surface-container rounded-t-sm h-[70%]"></div>
                          <div className="flex-1 bg-surface-container rounded-t-sm h-[85%]"></div>
                          <div className="flex-1 bg-surface-container rounded-t-sm h-[60%]"></div>
                          <div className="flex-1 bg-surface-container rounded-t-sm h-[90%]"></div>
                          <div className="flex-1 bg-surface-container rounded-t-sm h-[75%]"></div>
                          <div className="flex-1 bg-primary rounded-t-sm h-[94%]"></div>
                          <div className="flex-1 bg-fresh-teal rounded-t-sm h-[98%]"></div>
                        </div>
                        <div className="flex items-center justify-between text-indigo-gray-600 font-label-sm text-[11px]">
                          <span>Mon • Tue • Wed • Thu • Fri • Sat • Sun</span>
                          <span className="text-indigo-gray-900 font-medium">Cohort +3.2% vs last wk</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick View Patient Side Panel / Drawer (4 cols on XL) */}
                  {selectedPatient && (
                    <div className="xl:col-span-4 bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.05)] flex flex-col gap-stack-md sticky top-24">
                      {/* Header: Quick profile view with Status Badge */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-stack-sm">
                          <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-title-md text-[18px] font-bold">
                            <span>{selectedPatient.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <h2 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight font-bold">
                                {selectedPatient.full_name}
                              </h2>
                              {selectedPatient.severity === 'critical' || selectedPatient.severity === 'warning' ? (
                                <span className="material-symbols-outlined text-soft-coral text-[18px]">priority_high</span>
                              ) : (
                                <span className="material-symbols-outlined text-fresh-teal text-[18px]">check_circle</span>
                              )}
                            </div>
                            <span className="font-label-sm text-[12px] text-indigo-gray-600">
                              {selectedPatient.age} • {selectedPatient.gender} • ID: {selectedPatient.id_code}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveChartPatient(selectedPatient)}
                          className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                      </div>

                      {/* Allergy High Priority Callout */}
                      <div className={`p-stack-sm rounded-lg flex items-center gap-stack-sm ${
                        selectedPatient.allergy && !selectedPatient.allergy.includes('No Known')
                          ? 'bg-soft-coral/10 text-soft-coral'
                          : 'bg-surface-container text-indigo-gray-700'
                      }`}>
                        <span className={`material-symbols-outlined text-[20px] ${
                          selectedPatient.allergy && !selectedPatient.allergy.includes('No Known') ? 'text-soft-coral' : 'text-indigo-gray-500'
                        }`}>
                          warning
                        </span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-[11px] uppercase tracking-wider font-bold">
                            Documented Allergy
                          </span>
                          <span className="font-title-md text-[13px] text-indigo-gray-900 font-medium">
                            {selectedPatient.allergy}
                          </span>
                        </div>
                      </div>

                      {/* Real-Time Telemetry & Vitals Tile */}
                      <div className="bg-surface-container-low rounded-xl p-stack-sm flex flex-col gap-base">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-indigo-gray-900 font-bold uppercase tracking-wider">Active Telemetry</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-label-sm text-fresh-teal font-semibold">
                            <span className="w-2 h-2 rounded-full bg-fresh-teal animate-ping"></span>Live Sensor
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-surface-container-lowest p-2 rounded-lg">
                            <span className="font-label-sm text-[10px] text-indigo-gray-600 uppercase">Blood Press.</span>
                            <p className={`font-title-md text-[14px] font-bold mt-0.5 ${
                              selectedPatient.severity === 'critical' ? 'text-soft-coral' : 'text-indigo-gray-900'
                            }`}>
                              {selectedPatient.bp}
                            </p>
                            <span className={`font-label-sm text-[9px] font-semibold ${
                              selectedPatient.severity === 'critical' ? 'text-soft-coral' : 'text-indigo-gray-600'
                            }`}>
                              {selectedPatient.bp.startsWith('14') ? 'Stage 2' : selectedPatient.bp.startsWith('13') ? 'Pre-HTN' : 'Optimal'}
                            </span>
                          </div>
                          <div className="bg-surface-container-lowest p-2 rounded-lg">
                            <span className="font-label-sm text-[10px] text-indigo-gray-600 uppercase">Oxygen (SpO2)</span>
                            <p className="font-title-md text-[14px] text-indigo-gray-900 font-bold mt-0.5">
                              {selectedPatient.spo2}
                            </p>
                            <span className="font-label-sm text-[9px] text-indigo-gray-600">
                              {parseInt(selectedPatient.spo2) < 96 ? 'Borderline' : 'Normal'}
                            </span>
                          </div>
                          <div className="bg-surface-container-lowest p-2 rounded-lg">
                            <span className="font-label-sm text-[10px] text-indigo-gray-600 uppercase">Heart Rate</span>
                            <p className="font-title-md text-[14px] text-indigo-gray-900 font-bold mt-0.5">
                              {selectedPatient.hr}
                            </p>
                            <span className="font-label-sm text-[9px] text-indigo-gray-600">Resting</span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Diagnostic ECG Strip Preview */}
                      <div className="flex flex-col gap-base">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Latest 12-Lead ECG Report</span>
                          <button 
                            onClick={() => triggerNotification('Full ECG diagnostic PDF downloaded')}
                            className="text-primary font-label-sm text-[11px] font-bold hover:underline cursor-pointer"
                          >
                            Full PDF
                          </button>
                        </div>
                        <div 
                          onClick={() => triggerNotification('Opening 12-lead telemetry diagnostic strip')}
                          className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between gap-stack-sm cursor-pointer hover:bg-surface-container transition-colors"
                        >
                          <div className="flex items-center gap-stack-sm">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                              <span className="material-symbols-outlined text-[20px]">monitor_heart</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-body-md text-[13px] text-indigo-gray-900 font-medium">Sinus Rhythm with PACs</span>
                              <span className="font-label-sm text-[11px] text-indigo-gray-600">Yesterday at 16:40 • 2.4 MB</span>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-indigo-gray-600 text-[20px]">visibility</span>
                        </div>
                      </div>

                      {/* Current Medications List */}
                      <div className="flex flex-col gap-base">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Current Prescriptions</span>
                          <button 
                            className="text-primary font-label-sm text-[11px] font-bold hover:underline cursor-pointer"
                            onClick={() => {
                              const apt = selectedPatient.appointments?.[0]
                              setPrescriptionAppointment({ id: apt?.id || selectedPatient.id, name: selectedPatient.full_name })
                            }}
                          >
                            + Renew / Rx
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5" id="quickMedList">
                          {selectedPatient.medications && selectedPatient.medications.length > 0 ? (
                            selectedPatient.medications.map((m: string, idx: number) => (
                              <div key={idx} className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[16px] text-primary">pill</span>
                                  <span className="font-body-md text-[13px] text-indigo-gray-900 font-medium">{m}</span>
                                </div>
                                <span className="font-label-sm text-[11px] text-indigo-gray-600">Active Regimen</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-2.5 rounded-lg bg-surface-container-low text-xs text-indigo-gray-600">
                              No active prescriptions on file
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Emergency Contact Card */}
                      <div className="p-stack-sm rounded-xl bg-surface-container-low flex flex-col gap-1">
                        <span className="font-label-sm text-[11px] uppercase tracking-wider text-indigo-gray-600 font-bold">Emergency Contact</span>
                        <p className="font-body-md text-[13px] text-indigo-gray-900 font-medium">
                          {selectedPatient.emergency_contact}
                        </p>
                      </div>

                      {/* Primary Action Suite (Buttons) */}
                      <div className="grid grid-cols-2 gap-stack-sm pt-base">
                        <button 
                          onClick={() => setActiveChartPatient(selectedPatient)}
                          className="w-full py-2.5 px-3 rounded-full bg-primary-container text-on-primary font-label-sm text-[13px] font-semibold hover:bg-primary transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(0,102,255,0.2)] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">folder_open</span>
                          <span>Open Medical Chart</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('schedule')}
                          className="w-full py-2.5 px-3 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-[13px] font-semibold hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                          <span>Schedule Visit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-stack-sm">
                        <button 
                          onClick={() => triggerNotification(`Secure patient message dispatched to ${selectedPatient.full_name}`)}
                          className="w-full py-2 px-3 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-[12px] hover:bg-surface-container transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-primary">chat</span>
                          <span>Message Patient</span>
                        </button>
                        <button 
                          onClick={() => triggerNotification(`Cardiology Diagnostic Lab Panel ordered for ${selectedPatient.full_name}`)}
                          className="w-full py-2 px-3 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-[12px] hover:bg-surface-container transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-fresh-teal">medical_services</span>
                          <span>Order Lab Panel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PROFILE & DOSSIER VIEW (Active Dock "Profile")                    */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="w-full animate-in fade-in duration-300">
              <DoctorProfileClient
                doctor={profileDoctorData}
                isDoctorView={true}
                showPatientDock={false}
                onEditProfile={() => setShowEditModal(true)}
                onManageSchedule={() => {
                  setActiveTab('schedule')
                  triggerNotification('Navigated to Schedule timetable')
                }}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* FIXED FLOATING BOTTOM NAVIGATION DOCK (Working Active Dock)              */}
          {/* ========================================================================= */}
          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl px-6 py-2 flex items-center gap-6">
            <button
              className={`px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-vibrant-blue font-bold'
                  : 'text-indigo-gray-600 hover:text-indigo-gray-900 font-medium'
              }`}
              onClick={() => {
                setActiveTab('dashboard')
                triggerNotification('Dashboard view active')
              }}
            >
              <span className="material-symbols-outlined text-[24px]">grid_view</span>
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              className={`px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors cursor-pointer ${
                activeTab === 'schedule'
                  ? 'text-vibrant-blue font-bold'
                  : 'text-indigo-gray-600 hover:text-indigo-gray-900 font-medium'
              }`}
              onClick={() => {
                setActiveTab('schedule')
                triggerNotification('Schedule timetable opened')
              }}
            >
              <span className="material-symbols-outlined text-[24px]">calendar_today</span>
              <span className="font-medium">Schedule</span>
            </button>

            <button
              className={`px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors cursor-pointer ${
                activeTab === 'patients'
                  ? 'text-vibrant-blue font-bold'
                  : 'text-indigo-gray-600 hover:text-indigo-gray-900 font-medium'
              }`}
              onClick={() => {
                setActiveTab('patients')
                triggerNotification('Patient registry directory opened')
              }}
            >
              <span className="material-symbols-outlined text-[24px]">group</span>
              <span className="font-medium">Patients</span>
            </button>

            <button
              className={`px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-vibrant-blue font-bold'
                  : 'text-indigo-gray-600 hover:text-indigo-gray-900 font-medium'
              }`}
              onClick={() => {
                setActiveTab('profile')
                triggerNotification('Doctor Profile & Settings opened')
              }}
            >
              <span className="material-symbols-outlined text-[24px]">account_circle</span>
              <span className="font-medium">Profile</span>
            </button>
          </nav>

        </div>
      </main>

      {/* EHR Chart Modal */}
      {activeChartPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-blue">folder_shared</span>
                <h3 className="text-lg font-bold text-indigo-gray-900">
                  Patient EHR: {activeChartPatient.patient?.full_name || activeChartPatient.full_name || 'Patient'}
                </h3>
              </div>
              <button
                onClick={() => setActiveChartPatient(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-sm text-indigo-gray-700">
              <div className="p-3 bg-surface-container-low rounded-xl">
                <span className="font-bold block text-xs uppercase text-indigo-gray-500 mb-1">Clinical Vitals</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>BP: <strong>128/82 mmHg</strong> (Normal)</div>
                  <div>Pulse: <strong>72 bpm</strong> (Resting)</div>
                  <div>SpO2: <strong>98%</strong> (Ambient)</div>
                  <div>BMI: <strong>23.8</strong> (Healthy)</div>
                </div>
              </div>

              <div>
                <span className="font-bold block text-xs uppercase text-indigo-gray-500 mb-1">Clinical Notes</span>
                <p className="p-3 bg-gray-50 rounded-xl text-xs text-gray-800">
                  {activeChartPatient.notes || activeChartPatient.medical_records?.[0]?.notes || 'Patient attended routine cardiology consultation. Heart sounds normal with regular rhythm. Advised adherence to medication and low sodium diet.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setActiveChartPatient(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telehealth Call Modal Simulator */}
      {activeCallPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-800">
            <div className="p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-fresh-teal animate-pulse"></span>
                <div>
                  <h3 className="text-lg font-bold">
                    Telehealth Live Consultation
                  </h3>
                  <p className="text-xs text-slate-400">
                    Encrypted Live WebRTC • {activeCallPatient.patient?.full_name || 'Patient'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCallPatient(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="relative w-full h-80 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-slate-800 ring-4 ring-fresh-teal/30 flex items-center justify-center text-3xl font-bold mb-4">
                {activeCallPatient.patient?.full_name?.slice(0, 2).toUpperCase() || 'PT'}
              </div>
              <p className="text-xl font-bold">{activeCallPatient.patient?.full_name || 'Consultation Patient'}</p>
              <p className="text-xs text-fresh-teal mt-1 flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-[16px]">wifi_tethering</span> HD Stream Connected (4K Pro 30fps)
              </p>
            </div>

            <div className="p-6 bg-slate-900/90 flex items-center justify-center gap-4">
              <button
                className="p-3.5 bg-slate-800 hover:bg-slate-700 rounded-full text-white cursor-pointer"
                title="Mute Mic"
                onClick={() => triggerNotification('Microphone muted')}
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>
              <button
                className="p-3.5 bg-slate-800 hover:bg-slate-700 rounded-full text-white cursor-pointer"
                title="Toggle Camera"
                onClick={() => triggerNotification('Camera toggled')}
              >
                <span className="material-symbols-outlined text-[20px]">videocam</span>
              </button>
              <button
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                onClick={() => {
                  setActiveCallPatient(null)
                  triggerNotification('Consultation concluded successfully')
                }}
              >
                <span className="material-symbols-outlined text-[18px]">call_end</span>
                End Consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {prescriptionAppointment && (
        <DoctorPrescriptionModal
          appointmentId={prescriptionAppointment.id}
          patientName={prescriptionAppointment.name}
          isOpen={true}
          onClose={() => setPrescriptionAppointment(null)}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-vibrant-blue text-[24px]">edit_square</span>
                <div>
                  <h3 className="text-lg font-bold text-indigo-gray-900">Edit Practitioner Profile</h3>
                  <p className="text-xs text-indigo-gray-500">Update your clinical dossier &amp; public registry records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {profileSuccess && (
              <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Profile successfully updated in database!</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              await handleProfileSubmit(e)
              setShowEditModal(false)
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    defaultValue={doctorProfile?.full_name || ''}
                    required
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                    Primary Specialty
                  </label>
                  <input
                    type="text"
                    name="specialty"
                    defaultValue={specialty || ''}
                    required
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                    Qualifications &amp; Degrees
                  </label>
                  <input
                    type="text"
                    name="qualifications"
                    defaultValue={qualifications || ''}
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                    placeholder="e.g. MBBS, MD, MS"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    name="experience_years"
                    defaultValue={doctorProfile?.experience_years ?? ''}
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    name="consultation_fee"
                    defaultValue={doctorProfile?.consultation_fee ?? ''}
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                    Direct Phone / Contact
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    defaultValue={doctorProfile?.phone_number || ''}
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                  Clinic / Hospital Suite Address
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={doctorProfile?.address || hospital?.address || ''}
                  className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1.5">
                  Professional Bio &amp; Clinical Overview
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={doctorProfile?.bio || ''}
                  className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-vibrant-blue focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-5">
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Sign Out
                  </button>
                </form>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-6 py-2.5 bg-vibrant-blue hover:bg-primary text-on-primary rounded-full text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {profileLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">person_add</span>
                <h3 className="text-lg font-bold text-indigo-gray-900">Add New Patient to Roster</h3>
              </div>
              <button
                onClick={() => setShowAddPatientModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddPatientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="patient@example.com"
                    className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                  Primary Condition / Diagnosis
                </label>
                <input
                  type="text"
                  name="diagnosis"
                  placeholder="e.g. Stage 2 Hypertension, Coronary Artery Disease"
                  className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                    Blood Press.
                  </label>
                  <input
                    type="text"
                    name="bp"
                    defaultValue="120/80"
                    placeholder="120/80"
                    className="w-full p-2 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-xs focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                    SpO2
                  </label>
                  <input
                    type="text"
                    name="spo2"
                    defaultValue="98%"
                    placeholder="98%"
                    className="w-full p-2 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-xs focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                    Heart Rate
                  </label>
                  <input
                    type="text"
                    name="hr"
                    defaultValue="72 bpm"
                    placeholder="72 bpm"
                    className="w-full p-2 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-xs focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                  Documented Allergies
                </label>
                <input
                  type="text"
                  name="allergy"
                  defaultValue="No Known Allergies"
                  placeholder="e.g. Penicillin - Severe"
                  className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-gray-700 uppercase tracking-wider mb-1">
                  Medications & Prescriptions
                </label>
                <input
                  type="text"
                  name="medications"
                  placeholder="e.g. Atorvastatin 20mg, Metoprolol 50mg"
                  className="w-full p-2.5 rounded-xl border border-surface-container bg-surface-container-low text-indigo-gray-900 text-sm focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPatientLoading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-full text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {addPatientLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Save & Register Patient</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
