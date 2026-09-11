'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  CheckCircle2, Calendar, RefreshCw, Cloud, PhoneCall, FileText, Activity,
  CalendarDays, Video, Star, HeartPulse, Wind, Stethoscope,
  FolderOpen, Edit3, MessageSquare, Send, Settings, User, Contact, List,
  Mic, Gauge, CalendarSync, Users
} from 'lucide-react'
import { DoctorPrescriptionModal } from '@/components/DoctorPrescriptionModal'

export function DoctorDashboardClient({ 
  doctorProfile, 
  appointments, 
  todayStats,
  hospitalName
}: { 
  doctorProfile: any, 
  appointments: any[], 
  todayStats: any,
  hospitalName: string
}) {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)

  const triggerNotification = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  const openPrescriptionModal = (patientId?: string, appointmentId?: string) => {
    setSelectedPatientId(patientId || null)
    setSelectedAppointmentId(appointmentId || null)
    setPrescriptionModalOpen(true)
  }

  // Derive mock data for Next Patient and Waitlist from actual appointments if available
  const pendingAppointments = appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled')
  const nextPatient = pendingAppointments.length > 0 ? pendingAppointments[0] : null
  const waitlist = pendingAppointments.slice(1, 5) // Next 4

  const fullName = doctorProfile?.full_name || 'Doctor'
  const specialty = doctorProfile?.specialty || 'General Practitioner'
  
  return (
    <div className="bg-background font-body-md text-on-surface">
      <main className="w-full bg-background pb-24">
        <div className="flex flex-col w-full">
          
          {/* Interactive & Notification Floating Banner */}
          <section className="w-full px-margin-x-desktop pt-6 pb-2">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-gutter bg-surface-container-lowest rounded-xl p-stack-md shadow-sm">
              <div className="flex items-center gap-gutter">
                <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-high ring-2 ring-primary/10">
                  <Image 
                    src={doctorProfile?.image_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCU0_Fxp4dwxJ-fCWnJJZjrerPekD7I_ZNCYJZ3G5yvSLOWZPdxnqfRc0wv3n9RJBv6I9Yd6lv16selvw2pE0WYIKEG_EoTx4sSO087nr-3UkwrmAV0whQSDasOXdBqxqJqv8pA7y0E0on8b_UntnwPPuUf8zzbPkh9rM2gIEYRk_OV20om_dxfq-3hHnw6Kq46LomXWJt8gz4lyjf24kmwMHBT05bc5sqiNwO7jdSkpidNxZx1aNDL7w"} 
                    alt="Doctor Profile" 
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-fresh-teal rounded-full ring-2 ring-surface-container-lowest" title="Duty Active"></div>
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-base">
                    <h1 className="font-headline-lg text-headline-lg text-indigo-gray-900 leading-tight">Dr. {fullName.replace('Dr. ', '')}, {specialty}</h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                      <CheckCircle2 className="w-[14px] h-[14px]" /> {hospitalName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                      <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse"></span> On-Duty: Consultation Room 4B
                    </span>
                  </div>
                  <div className="flex items-center gap-stack-md text-indigo-gray-600 font-label-sm text-label-sm mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-[16px] h-[16px] text-vibrant-blue" />
                      <strong className="text-indigo-gray-900">Today:</strong> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-[16px] h-[16px] text-secondary" />
                      Epic EHR Synchronized ({new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span className="flex items-center gap-1">
                      <Cloud className="w-[16px] h-[16px] text-fresh-teal" />
                      Encrypted Telehealth Node: UK-LON-02
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Header Cluster */}
              <div className="flex flex-wrap items-center gap-base flex-shrink-0 mt-4 xl:mt-0">
                <button 
                  className="flex items-center gap-base bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm px-stack-md py-3 rounded-full shadow-[0_4px_16px_rgba(0,102,255,0.22)] transition-all hover:scale-[1.02] active:scale-95"
                  onClick={() => triggerNotification('Opening Telehealth room initiation panel...')}
                >
                  <PhoneCall className="w-[18px] h-[18px]" />
                  <span>New Consultation</span>
                </button>
                <button 
                  className="flex items-center gap-base bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm px-stack-md py-3 rounded-full transition-colors"
                  onClick={() => openPrescriptionModal()}
                >
                  <FileText className="text-vibrant-blue w-[18px] h-[18px]" />
                  <span>Write Prescription</span>
                </button>
                <button 
                  className="flex items-center gap-base bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm px-stack-md py-3 rounded-full transition-colors"
                  onClick={() => triggerNotification('Lab Diagnostic requisition system launched')}
                >
                  <Activity className="text-secondary w-[18px] h-[18px]" />
                  <span>Order Lab Test</span>
                </button>
              </div>
            </div>
          </section>

          {/* Interactive Alert Toast */}
          <div className={`fixed bottom-24 right-8 z-50 transform transition-all duration-300 flex items-center gap-stack-sm bg-indigo-gray-900 text-inverse-on-surface px-5 py-3.5 rounded-full shadow-2xl ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
            <CheckCircle2 className="text-fresh-teal w-[20px] h-[20px]" />
            <span className="font-label-sm text-label-sm">{toastMessage}</span>
          </div>

          {/* Primary Dashboard Section: Metrics Grid */}
          <section className="w-full px-margin-x-desktop py-stack-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
              {/* Stat 1: Today's Appointments */}
              <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider">Today's Caseload</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">{todayStats.total}</span>
                      <span className="font-label-sm text-label-sm text-secondary font-medium">appointments</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                    <CalendarDays className="w-[26px] h-[26px]" />
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-indigo-gray-600 font-label-sm text-label-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-fresh-teal"></span>
                    <span>{todayStats.completed} Done</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-vibrant-blue"></span>
                    <span>{Math.floor(todayStats.pending / 2)} Telehealth</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-soft-coral"></span>
                    <span>{Math.ceil(todayStats.pending / 2)} In-Clinic</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2.5 overflow-hidden flex">
                  <div className="bg-fresh-teal h-full" style={{ width: `${(todayStats.completed / (todayStats.total || 1)) * 100}%` }} title={`${todayStats.completed} Completed`}></div>
                  <div className="bg-vibrant-blue h-full" style={{ width: `${(Math.floor(todayStats.pending / 2) / (todayStats.total || 1)) * 100}%` }} title="Telehealth"></div>
                  <div className="bg-soft-coral h-full" style={{ width: `${(Math.ceil(todayStats.pending / 2) / (todayStats.total || 1)) * 100}%` }} title="Pending"></div>
                </div>
              </div>

              {/* Stat 2: Active Remote Patients */}
              <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-indigo-gray-600 uppercase tracking-wider">Remote Monitored</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">142</span>
                      <span className="font-label-sm text-label-sm text-soft-coral font-semibold">8 High Alert</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-tertiary">
                    <Activity className="w-[26px] h-[26px]" />
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between font-label-sm text-label-sm">
                  <span className="text-indigo-gray-600">Telemetry feed active</span>
                  <span className="text-tertiary font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-[14px] h-[14px]" /> 5.6% critical threshold
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
                      <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">46.5</span>
                      <span className="font-label-sm text-label-sm text-secondary font-medium">hrs total</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                    <Video className="w-[26px] h-[26px]" />
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between font-label-sm text-label-sm">
                  <span className="text-fresh-teal font-semibold flex items-center gap-1">
                    <Activity className="w-[16px] h-[16px]" /> +12% vs last month
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
                      <span className="font-display-lg text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">4.96</span>
                      <span className="font-label-sm text-label-sm text-indigo-gray-600">/ 5.00</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-vibrant-blue">
                    <Star className="w-[26px] h-[26px]" />
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between font-label-sm text-label-sm">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-[16px] h-[16px] fill-amber-500" />
                    <Star className="w-[16px] h-[16px] fill-amber-500" />
                    <Star className="w-[16px] h-[16px] fill-amber-500" />
                    <Star className="w-[16px] h-[16px] fill-amber-500" />
                    <Star className="w-[16px] h-[16px] fill-amber-500" />
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
                {nextPatient ? (
                  <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-vibrant-blue via-fresh-teal to-primary"></div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-error-container text-tertiary font-label-sm text-label-sm font-bold animate-pulse">
                          LIVE QUEUE - NEXT UP (02:14 WAIT)
                        </span>
                        <span className="font-label-sm text-label-sm text-indigo-gray-600">Room 4B Ready</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-fresh-teal font-label-sm text-label-sm">
                        <Activity className="w-[18px] h-[18px]" />
                        <span>HD Video Stream Ready</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-gutter pb-stack-md">
                      <div className="flex items-center gap-stack-md">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0 relative">
                          <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVncrv55pUts9g6ADwc2u-5ty7d_eE7zhJKExcCmWvNxyci0k97mPyuQFp9QtcEyDVzo8kI7p6YytG4o0dOReW70hd7VPEfEZHSJ3QrV129qodA-sWVl6PQYH9rbbGi1oNlUNYrcp6pItHBYnixqkZBietijhFfrUBsljcXPIYpFXtD8QPh7rDxEFg_O9MWL3HulytDJDhAqTXR-2scGIL5NUKL3w9XCiCcL-9HANB12q4WTnx9lPAlA" alt="Patient" fill className="object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">{nextPatient.patient?.full_name || 'Unknown Patient'}</h2>
                            <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-indigo-gray-600 font-semibold">68 yrs • Male</span>
                          </div>
                          <p className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">Post-Angioplasty Follow-up (Day 14)</p>
                          <span className="font-label-sm text-label-sm text-indigo-gray-600 mt-0.5">MRN: #CYD-{nextPatient.patient_id?.slice(0, 4)} • Cardiologist: Dr. {fullName.replace('Dr. ', '')}</span>
                        </div>
                      </div>
                      <button 
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-fresh-teal hover:bg-secondary text-on-secondary px-6 py-3 rounded-full font-label-sm text-label-sm shadow-[0_4px_14px_rgba(20,184,166,0.3)] transition-transform hover:scale-105 active:scale-95"
                        onClick={() => triggerNotification(`Connecting encrypted video pipeline to ${nextPatient.patient?.full_name}...`)}
                      >
                        <Video className="w-[20px] h-[20px]" />
                        <span>Start Video Consultation</span>
                      </button>
                    </div>

                    {/* Real-Time Patient Telemetry & Vitals Snapshot */}
                    <div className="bg-surface-container-low rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-stack-sm">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                          <HeartPulse className="w-[14px] h-[14px] text-tertiary" /> Blood Pressure
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-title-md text-title-md font-bold text-indigo-gray-900">128/82</span>
                          <span className="text-xs text-indigo-gray-600 font-label-sm">mmHg</span>
                        </div>
                        <span className="text-[11px] text-secondary font-semibold font-label-sm">Target controlled</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                          <Activity className="w-[14px] h-[14px] text-soft-coral" /> Pulse / Heart Rate
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-title-md text-title-md font-bold text-indigo-gray-900">72</span>
                          <span className="text-xs text-indigo-gray-600 font-label-sm">BPM</span>
                        </div>
                        <span className="text-[11px] text-fresh-teal font-semibold font-label-sm">Resting sinus</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                          <Wind className="w-[14px] h-[14px] text-vibrant-blue" /> Oxygen (SpO2)
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-title-md text-title-md font-bold text-indigo-gray-900">98%</span>
                          <span className="text-xs text-indigo-gray-600 font-label-sm">ambient</span>
                        </div>
                        <span className="text-[11px] text-fresh-teal font-semibold font-label-sm">Optimal</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-1">
                          <Stethoscope className="w-[14px] h-[14px] text-indigo-gray-600" /> Anticoagulant
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-title-md text-title-md font-bold text-indigo-gray-900">Ticagrelor</span>
                        </div>
                        <span className="text-[11px] text-indigo-gray-600 font-label-sm">90mg BID (Logged 8am)</span>
                      </div>
                    </div>

                    {/* Quick Clinical Tools Bar */}
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-surface-container">
                      <div className="flex flex-wrap items-center gap-base">
                        <button 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm transition-colors"
                          onClick={() => triggerNotification('Opening Patient EHR chart in overlay...')}
                        >
                          <FolderOpen className="w-[16px] h-[16px] text-vibrant-blue" />
                          <span>Open EHR Chart</span>
                        </button>
                        <button 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm transition-colors"
                          onClick={() => openPrescriptionModal(nextPatient.patient_id, nextPatient.id)}
                        >
                          <Edit3 className="w-[16px] h-[16px] text-vibrant-blue" />
                          <span>Quick Prescription</span>
                        </button>
                        <button 
                          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm transition-colors"
                          onClick={() => triggerNotification('Diagnostic lab panel requested: Post-Op Lipid & Troponin')}
                        >
                          <Activity className="w-[16px] h-[16px] text-vibrant-blue" />
                          <span>Review ECG Waveform</span>
                        </button>
                      </div>
                      <span className="font-label-sm text-label-sm text-indigo-gray-600 whitespace-nowrap ml-2">
                        {new Date((nextPatient.schedules as any)?.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm flex flex-col items-center justify-center text-center py-16">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-indigo-gray-400 mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold mb-1">Queue Empty</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 max-w-sm">
                      You have no pending patients in the queue right now. Great job catching up!
                    </p>
                  </div>
                )}

                {/* Waiting Room Queue List */}
                <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm">
                  <div className="flex items-center justify-between mb-stack-md">
                    <div>
                      <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Virtual Waiting Room</h3>
                      <p className="font-label-sm text-label-sm text-indigo-gray-600">Patients checked-in and prepared by triage nurses</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-indigo-gray-900 font-medium">{waitlist.length} Waiting</span>
                      <button 
                        className="p-1.5 rounded-full text-indigo-gray-600 hover:text-indigo-gray-900 hover:bg-surface-container"
                        onClick={() => triggerNotification('Queue refreshed with latest nurse triage inputs')}
                      >
                        <RefreshCw className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {waitlist.length > 0 ? waitlist.map((apt: any, idx: number) => {
                      const patientName = apt.patient?.full_name || 'Patient'
                      const initials = patientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
                      
                      // Assign mock statuses based on index to match design variety
                      const mockStatus = idx === 0 ? 'Ready' : idx === 1 ? 'In Triage' : idx === 2 ? 'Scheduled' : 'Delayed (+15m)'
                      const isReady = mockStatus === 'Ready'
                      const isDelayed = mockStatus.includes('Delayed')
                      const isInTriage = mockStatus === 'In Triage'
                      
                      return (
                        <div key={apt.id} className="p-3.5 rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low transition-colors flex items-center justify-between gap-stack-sm">
                          <div className="flex items-center gap-stack-sm min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                              isReady ? 'bg-primary-fixed text-on-primary-fixed' : 
                              isDelayed ? 'bg-error-container text-tertiary' : 
                              'bg-surface-container-high text-indigo-gray-900'
                            }`}>
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-title-md text-[16px] text-indigo-gray-900 font-bold truncate">{patientName}</span>
                                <span className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                                  isReady ? 'bg-secondary-container text-on-secondary-container' : 
                                  isDelayed ? 'bg-error-container text-tertiary font-bold' : 
                                  'bg-surface-container text-indigo-gray-600'
                                }`}>
                                  {mockStatus}
                                </span>
                              </div>
                              <span className="font-label-sm text-label-sm text-indigo-gray-600 truncate">
                                {new Date((apt.schedules as any)?.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • Routine Checkup
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-base flex-shrink-0">
                            <span className={`font-label-sm text-label-sm hidden md:block ${
                              isReady ? 'text-indigo-gray-600' :
                              isInTriage ? 'text-secondary' :
                              isDelayed ? 'text-tertiary' : 'text-indigo-gray-600'
                            }`}>
                              {isReady ? 'Vitals synced' : isInTriage ? 'Nurse Kelly assigned' : isDelayed ? 'Arriving via patient transit' : 'Pending check-in'}
                            </span>
                            <button 
                              className={`p-2 rounded-full hover:bg-surface-container ${isReady ? 'text-vibrant-blue' : 'text-indigo-gray-600'}`}
                              onClick={() => triggerNotification(`Action triggered for ${patientName}`)}
                            >
                              {isReady ? <Video className="w-[20px] h-[20px]" /> : 
                               isInTriage ? <FileText className="w-[20px] h-[20px]" /> :
                               isDelayed ? <Contact className="w-[20px] h-[20px]" /> : <PhoneCall className="w-[20px] h-[20px]" />}
                            </button>
                          </div>
                        </div>
                      )
                    }) : (
                      <p className="text-center py-4 text-indigo-gray-500 font-label-sm">No other patients waiting.</p>
                    )}
                  </div>
                </div>

                {/* Telemetry ECG Monitor Waveform Visualizer */}
                <div className="bg-indigo-gray-900 text-inverse-on-surface rounded-xl p-stack-md shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="text-fresh-teal w-[22px] h-[22px]" />
                      <h3 className="font-title-md text-title-md font-bold text-white">Live Ward Telemetry Stream: Lead II</h3>
                    </div>
                    <div className="flex items-center gap-stack-sm font-label-sm text-label-sm">
                      <span className="text-fresh-teal font-mono">HR: 74 bpm (Sinus Rhythm)</span>
                      <span className="w-2 h-2 rounded-full bg-fresh-teal animate-ping"></span>
                    </div>
                  </div>
                  <div className="relative w-full h-24 bg-slate-950/60 rounded-lg overflow-hidden flex items-center px-2">
                    <svg className="w-full h-full text-fresh-teal" fill="none" preserveAspectRatio="none" viewBox="0 0 1000 100">
                      <path d="M0,50 L80,50 L95,50 L105,42 L115,50 L130,50 L140,20 L155,90 L170,10 L185,60 L195,50 L210,50 L230,50 L245,45 L260,50 L350,50 L365,50 L375,42 L385,50 L400,50 L410,20 L425,90 L440,10 L455,60 L465,50 L480,50 L500,50 L515,45 L530,50 L620,50 L635,50 L645,42 L655,50 L670,50 L680,20 L695,90 L710,10 L725,60 L735,50 L750,50 L770,50 L785,45 L800,50 L890,50 L905,50 L915,42 L925,50 L940,50 L950,20 L965,90 L980,10 L995,60 L1000,50" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-950/90 pointer-events-none"></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-inverse-on-surface/70 mt-2 font-mono">
                    <span>25 mm/s • 10 mm/mV • Filter: 0.05-150Hz</span>
                    <span>Channel 1: Telemetry Bedside Hub Arthur P.</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Schedule & Diagnostics (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-stack-md">
                
                {/* Interactive Telehealth Hardware Pre-check */}
                <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">AV & Studio Diagnostics</h3>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">Active</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-surface-container-low rounded-lg flex flex-col items-center text-center">
                      <Video className="text-fresh-teal w-[20px] h-[20px]" />
                      <span className="font-label-sm text-[12px] font-semibold text-indigo-gray-900 mt-1">4K Cam Pro</span>
                      <span className="text-[10px] text-secondary font-medium">30 FPS Clear</span>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-lg flex flex-col items-center text-center">
                      <Mic className="text-fresh-teal w-[20px] h-[20px]" />
                      <span className="font-label-sm text-[12px] font-semibold text-indigo-gray-900 mt-1">Studio Mic</span>
                      <span className="text-[10px] text-secondary font-medium">Noise Filtered</span>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-lg flex flex-col items-center text-center">
                      <Gauge className="text-vibrant-blue w-[20px] h-[20px]" />
                      <span className="font-label-sm text-[12px] font-semibold text-indigo-gray-900 mt-1">Fiber Link</span>
                      <span className="text-[10px] text-primary font-medium">12ms Latency</span>
                    </div>
                  </div>
                  <button 
                    className="w-full mt-3 py-2 bg-surface-container hover:bg-surface-container-high rounded-full font-label-sm text-label-sm text-indigo-gray-900 transition-colors flex items-center justify-center gap-1.5"
                    onClick={() => triggerNotification('Loopback camera & microphone test sequence initiated')}
                  >
                    <Settings className="w-[16px] h-[16px]" />
                    <span>Test Peripheral Setup</span>
                  </button>
                </div>

                {/* Today's Schedule Breakdown */}
                <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Schedule Breakdown</h3>
                      <p className="font-label-sm text-label-sm text-indigo-gray-600">Rest of day timetable</p>
                    </div>
                    <button 
                      className="text-vibrant-blue font-label-sm text-label-sm hover:underline flex items-center gap-1"
                      onClick={() => triggerNotification('Syncing with Google Calendar and Harley St Master Timetable...')}
                    >
                      <CalendarSync className="w-[16px] h-[16px]" /> Sync Cal
                    </button>
                  </div>
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map((apt, idx) => {
                      const st = new Date((apt.schedules as any)?.start_time)
                      const et = new Date((apt.schedules as any)?.end_time)
                      const durationMins = Math.round((et.getTime() - st.getTime()) / 60000) || 30
                      
                      const isCurrent = idx === 0
                      const typeClass = isCurrent ? 'bg-vibrant-blue' : idx % 2 === 1 ? 'bg-secondary' : 'bg-tertiary-container'
                      const pillClass = isCurrent ? 'bg-primary-fixed text-on-primary-fixed' : idx % 2 === 1 ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'
                      const typeText = isCurrent ? 'Telehealth' : idx % 2 === 1 ? 'In-Person' : 'Review'

                      return (
                        <div key={apt.id} className="p-3 rounded-lg bg-surface-container-low/40 flex items-start gap-stack-sm">
                          <div className="text-right w-14 flex-shrink-0">
                            <span className="font-title-md text-[14px] font-bold text-indigo-gray-900">
                              {st.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                            <span className="block text-[11px] text-indigo-gray-600">{isCurrent ? 'Current' : `${durationMins} min`}</span>
                          </div>
                          <div className={`w-1 self-stretch rounded-full ${typeClass}`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 truncate pr-2">{apt.patient?.full_name || 'Patient'}</span>
                              <span className={`px-2 py-0.5 rounded font-label-sm text-[11px] whitespace-nowrap ${pillClass}`}>{typeText}</span>
                            </div>
                            <p className="text-xs text-indigo-gray-600 truncate mt-0.5">Scheduled Consultation</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Clinical Telemetry Alerts & Approvals Hub */}
                <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-sm flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="text-tertiary w-[22px] h-[22px]" />
                      <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Urgent Alerts & Sign-offs</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-error-container text-tertiary font-label-sm text-[11px] font-bold">2 Pending</span>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {/* Alert 1: Urgent */}
                    <div className="p-3 rounded-lg bg-error-container/40 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="text-tertiary w-[18px] h-[18px]" />
                          <span className="font-label-sm text-label-sm font-bold text-tertiary">Eleanor Vance (74y)</span>
                        </div>
                        <span className="text-xs text-tertiary font-semibold">14 mins ago</span>
                      </div>
                      <p className="text-xs text-indigo-gray-900">Elevated remote BP monitor trigger: <strong>142/94 mmHg</strong> with mild palpitations reported.</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          className="px-3 py-1 bg-tertiary text-on-tertiary rounded-full font-label-sm text-xs hover:bg-tertiary-container transition-colors"
                          onClick={() => triggerNotification('Immediate triage callback protocol queued for Eleanor Vance')}
                        >
                          Urgent Call
                        </button>
                        <button 
                          className="px-3 py-1 bg-surface-container text-indigo-gray-900 rounded-full font-label-sm text-xs hover:bg-surface-container-high transition-colors"
                          onClick={() => triggerNotification('Nurse team dispatched for home telemetry verify')}
                        >
                          Assign Triage
                        </button>
                      </div>
                    </div>

                    {/* Sign-Off 2: Diagnostic Lab */}
                    <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="text-vibrant-blue w-[18px] h-[18px]" />
                          <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">Liam O'Connor: 48h ECG</span>
                        </div>
                        <span className="text-xs text-indigo-gray-600">Lab Batch #814</span>
                      </div>
                      <p className="text-xs text-indigo-gray-600">Automated AI reading: Normal sinus rhythm. 2 isolated PVCs, no sustained arrhythmias detected.</p>
                      <div className="flex items-center justify-between mt-1">
                        <button 
                          className="text-vibrant-blue font-label-sm text-xs hover:underline"
                          onClick={() => triggerNotification('Holter full multi-lead PDF opened')}
                        >
                          Inspect Traces
                        </button>
                        <button 
                          className="px-3 py-1 bg-fresh-teal text-on-secondary rounded-full font-label-sm text-xs hover:bg-secondary transition-colors flex items-center gap-1"
                          onClick={() => triggerNotification('Diagnostic sign-off approved and transmitted to patient chart')}
                        >
                          <CheckCircle2 className="w-[14px] h-[14px]" /> 1-Click Approve
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Fixed Floating Bottom Navigation Dock */}
          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl px-6 py-2 flex items-center gap-6">
            <button 
              className="text-vibrant-blue font-bold px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors"
              onClick={() => triggerNotification('Dashboard view active')}
            >
              <List className="w-[24px] h-[24px]" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              className="text-indigo-gray-600 hover:text-indigo-gray-900 px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors"
              onClick={() => triggerNotification('Schedule timetable opened')}
            >
              <Calendar className="w-[24px] h-[24px]" />
              <span className="font-medium">Schedule</span>
            </button>
            <button 
              className="text-indigo-gray-600 hover:text-indigo-gray-900 px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors"
              onClick={() => triggerNotification('Patient registry directory opened')}
            >
              <Users className="w-[24px] h-[24px]" />
              <span className="font-medium">Patients</span>
            </button>
            <button 
              className="text-indigo-gray-600 hover:text-indigo-gray-900 px-3 py-1 flex flex-col items-center gap-1 text-xs transition-colors"
              onClick={() => triggerNotification('Doctor Profile & Settings opened')}
            >
              <User className="w-[24px] h-[24px]" />
              <span className="font-medium">Profile</span>
            </button>
          </nav>

        </div>
      </main>
      
      {prescriptionModalOpen && selectedAppointmentId && (
        <DoctorPrescriptionModal
          appointmentId={selectedAppointmentId}
          patientName={selectedPatientId || "Patient"}
        />
      )}
    </div>
  )
}
