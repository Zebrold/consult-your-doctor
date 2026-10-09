'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  UserCircle, Ticket, Droplet, Pill, Download, X, FileText, ChevronRight,
  Calendar, Clock, HelpCircle, CheckCircle2, AlertCircle, RefreshCw, Printer
} from 'lucide-react'
import { ReviewButton, type ExistingReview } from './patient/ReviewButton'

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'visited') return 'text-fresh-teal font-semibold';
  if (s === 'cancelled') return 'text-[#E31E24] font-semibold';
  if (s === 'pending_payment' || s === 'pending') return 'text-orange-500 font-semibold';
  if (s === 'scheduled' || s === 'confirmed') return 'text-primary font-semibold';
  if (s === 'rescheduled') return 'text-purple-600 font-semibold';
  return 'text-outline';
}

const getStatusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'visited') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
  if (s === 'pending_payment' || s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'scheduled' || s === 'confirmed') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s === 'rescheduled') return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

const calcToken = (id: string) => {
  const num = Math.abs(id.split('-').reduce((acc, p) => acc + (parseInt(p.slice(0, 4), 16) || 0), 0) % 25) + 1
  return String(num).padStart(2, '0')
}

type TabCategory = 'upcoming' | 'completed' | 'cancelled' | 'rescheduled' | 'all'

/** `reviews` holds the patient's own reviews by appointment id, so finished visits show "Rate your visit" or their rating. */
export function ConsultationsList({ appointments, reviews = {} }: { appointments: any[]; reviews?: Record<string, ExistingReview> }) {
  const [activeTab, setActiveTab] = useState<TabCategory>('upcoming')
  const [selectedApt, setSelectedApt] = useState<any | null>(null)

  const items = appointments || []

  // Categorize
  const upcoming = items.filter((a) => ['scheduled', 'confirmed', 'pending_payment', 'pending'].includes(a.status))
  const completed = items.filter((a) => ['completed', 'visited'].includes(a.status))
  const cancelled = items.filter((a) => a.status === 'cancelled')
  const rescheduled = items.filter((a) => a.status === 'rescheduled')

  const currentList =
    activeTab === 'upcoming'
      ? upcoming
      : activeTab === 'completed'
      ? completed
      : activeTab === 'cancelled'
      ? cancelled
      : activeTab === 'rescheduled'
      ? rescheduled
      : items

  return (
    <div className="flex flex-col gap-5">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-outline-variant/20">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          Upcoming
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
            {upcoming.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          Completed
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
            {completed.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'cancelled'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          Cancelled
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
            {cancelled.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rescheduled')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rescheduled'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          Rescheduled
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'rescheduled' ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
            {rescheduled.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          All
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
            {items.length}
          </span>
        </button>
      </div>

      {/* Appointment Cards List */}
      {currentList.length === 0 ? (
        <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
          <Calendar className="w-8 h-8 text-outline mx-auto mb-2" />
          <p className="text-on-surface font-bold text-sm">No {activeTab === 'all' ? '' : activeTab} appointments</p>
          <p className="text-xs text-outline mt-1">Bookings in this category will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {currentList.map((apt) => {
            const doctor: any = apt.doctors
            const hospital: any = apt.hospitals
            const schedule: any = apt.schedules
            const date = schedule?.start_time ? new Date(schedule.start_time) : null
            const token = calcToken(apt.id)
            const badgeClass = getStatusBadge(apt.status)

            // Check if prescription file exists in medical records
            const rxRecord = (apt.medical_records || []).find((r: any) => r.document_type === 'prescription' && r.file_url && r.file_url !== 'none')

            return (
              <div
                key={apt.id}
                className="p-5 md:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col gap-4"
              >
                {/* Top Row: Doctor Info & Token Highlight */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary-container/30 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                      <UserCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-title-md text-base md:text-lg font-bold text-on-surface">
                          Dr. {doctor?.profiles?.full_name || 'Medical Specialist'}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-bold">
                          {doctor?.specialty || 'General'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {hospital?.name || 'Clinic'}{hospital?.city ? ` · ${hospital.city}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Prominent Token & Status Badge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-primary to-vibrant-blue text-white font-mono text-xs font-bold shadow-sm">
                        Token #{token}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${badgeClass}`}>
                        {apt.status.replace('_', ' ')}
                      </span>
                    </div>
                    {date && (
                      <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-vibrant-blue" />
                        {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}, {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Controls / Quick Actions Bar */}
                <div className="pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/30 -mx-5 -mb-5 md:-mx-6 md:-mb-6 p-4">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
                    <Ticket className="w-3.5 h-3.5 text-primary" />
                    <span>ID: #{apt.id.slice(0, 8).toUpperCase()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {apt.status === 'pending_payment' && (
                      <a
                        href={`/patient/checkout/${apt.id}`}
                        className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm"
                      >
                        Complete Payment
                      </a>
                    )}

                    {rxRecord && (
                      <a
                        href={rxRecord.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Rx Prescription
                      </a>
                    )}

                    <Link
                      href={`/book/confirmation/${apt.id}`}
                      className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5 text-outline" /> Slip
                    </Link>

                    <Link
                      href={`/patient/support?bookingId=${apt.id.slice(0, 8).toUpperCase()}`}
                      className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-outline" /> Support
                    </Link>

                    {(apt.status === 'completed' || apt.status === 'visited') && (
                      <ReviewButton appointmentId={apt.id} doctorName={`Dr. ${doctor?.profiles?.full_name ?? ''}`.trim()} existing={reviews[apt.id] ?? null} />
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedApt(apt)}
                      className="px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-white text-xs font-bold transition-all shadow-sm"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Consultation Details Modal */}
      {selectedApt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedApt(null)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
              <h2 className="font-title-lg text-title-lg text-indigo-gray-900 font-bold flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-primary" />
                Consultation Details
              </h2>
              <button 
                onClick={() => setSelectedApt(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                <div>
                  <span className="text-[11px] text-outline font-semibold uppercase block">Token Number</span>
                  <span className="font-mono text-base font-bold text-primary">Token #{calcToken(selectedApt.id)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-outline font-semibold uppercase block text-right">Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${getStatusBadge(selectedApt.status)}`}>
                    {selectedApt.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-outline uppercase tracking-wider mb-1">Doctor</p>
                <p className="font-body-md text-indigo-gray-900 font-bold">Dr. {selectedApt.doctors?.profiles?.full_name}</p>
                <p className="font-label-sm text-primary font-semibold">{selectedApt.doctors?.specialty}</p>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-outline uppercase tracking-wider mb-1">Schedule</p>
                <p className="font-body-md text-indigo-gray-900 font-medium">
                  {selectedApt.schedules?.start_time ? new Date(selectedApt.schedules.start_time).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </p>
                <p className="font-label-sm text-indigo-gray-600 mt-0.5">
                  Time: {selectedApt.schedules?.start_time ? new Date(selectedApt.schedules.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-outline uppercase tracking-wider mb-1">Hospital / Clinic</p>
                <p className="font-body-md text-indigo-gray-900">{selectedApt.hospitals?.name}</p>
                <p className="font-label-sm text-indigo-gray-600">{selectedApt.hospitals?.city}</p>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-outline uppercase tracking-wider mb-1">Booking Reference</p>
                <p className="font-mono font-bold text-primary">#{selectedApt.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest rounded-b-2xl">
              <Link
                href={`/book/confirmation/${selectedApt.id}`}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> View Confirmation Slip
              </Link>

              <button 
                onClick={() => setSelectedApt(null)}
                className="px-6 py-2 rounded-full bg-surface-container hover:bg-surface-variant text-indigo-gray-900 font-label-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DiagnosticBookingsList({ diagnosticBookings }: { diagnosticBookings: any[] }) {
  const [displayCount, setDisplayCount] = useState(3)
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

  if (!diagnosticBookings || diagnosticBookings.length === 0) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
        <p className="text-indigo-gray-600 font-label-sm">No recent diagnostic bookings.</p>
      </div>
    )
  }

  const visibleBookings = diagnosticBookings.slice(0, displayCount)
  const hasMore = displayCount < diagnosticBookings.length

  return (
    <div className="flex flex-col gap-4">
      {visibleBookings.map((booking) => {
        const center: any = booking.diagnostic_centers
        const date = new Date(booking.preferred_date)

        return (
          <div key={booking.id} className="p-base rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-base border border-outline-variant/20 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                <Droplet className="w-[20px] h-[20px]" />
              </div>
              <div>
                <h4 className="font-title-md text-body-lg text-indigo-gray-900 font-bold capitalize">{booking.test_name.replace(/-/g, ' ')}</h4>
                <p className="font-label-sm text-label-sm text-indigo-gray-600">{center.name} · {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className={`font-label-sm text-label-sm capitalize mb-2 sm:mb-0 mr-2 ${getStatusColor(booking.status)}`}>{booking.status.replace('_', ' ')}</span>
              {booking.status === 'pending_payment' && (
                <a href={`/patient/checkout/diagnostic/${booking.id}`} className="px-3.5 py-1.5 rounded-full bg-[#E31E24] text-white font-label-sm text-label-sm font-semibold hover:bg-red-700">
                  Complete Payment
                </a>
              )}
              <button 
                onClick={() => setSelectedBooking(booking)}
                className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm font-medium hover:bg-surface-container" type="button">
                View Summary
              </button>
            </div>
          </div>
        )
      })}
      <div className="mt-2 flex justify-center pb-2">
        {hasMore ? (
          <button
            onClick={() => setDisplayCount(prev => prev + 2)}
            className="px-6 py-2 rounded-full bg-surface-container hover:bg-surface-variant text-primary font-label-sm font-semibold transition-colors"
          >
            View More
          </button>
        ) : (
          <p className="font-label-sm text-outline mt-2">No more bookings</p>
        )}
      </div>


      {/* Diagnostic Booking Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedBooking(null)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
              <h2 className="font-title-lg text-title-lg text-indigo-gray-900 font-bold flex items-center gap-2">
                <Droplet className="w-5 h-5 text-primary" />
                Diagnostic Summary
              </h2>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Test Details</p>
                <p className="font-body-md text-indigo-gray-900 font-bold capitalize">{selectedBooking.test_name.replace(/-/g, ' ')}</p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Schedule</p>
                <p className="font-body-md text-indigo-gray-900 font-medium">
                  {new Date(selectedBooking.preferred_date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Diagnostic Center</p>
                <p className="font-body-md text-indigo-gray-900">{selectedBooking.diagnostic_centers?.name}</p>
                <p className="font-label-sm text-indigo-gray-600">{selectedBooking.diagnostic_centers?.address}, {selectedBooking.diagnostic_centers?.city}</p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Status</p>
                <p className={`font-body-md capitalize font-semibold ${getStatusColor(selectedBooking.status)}`}>{selectedBooking.status.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/30 flex justify-end bg-surface-container-lowest rounded-b-2xl">
              <button 
                onClick={() => setSelectedBooking(null)}
                className="px-6 py-2 rounded-full bg-surface-container hover:bg-surface-variant text-indigo-gray-900 font-label-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RecordsAndMedicationsList({ prescriptions }: { prescriptions: any[] }) {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)

  return (
    <div className="p-stack-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-base border border-outline-variant/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="text-primary w-[20px] h-[20px]" />
          <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Records &amp; Medications</h2>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-[11px] font-semibold">{prescriptions.length} Files</span>
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-4 text-indigo-gray-600 font-label-sm">No records available.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {prescriptions.slice(0, 3).map((record: any, idx: number) => (
            <div
              key={idx}
              onClick={() => setSelectedRecord(record)}
              className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-outline-variant/30 group relative"
            >
              <div className="pr-16">
                <h4 className="font-label-sm text-body-md text-indigo-gray-900 font-semibold truncate group-hover:text-primary transition-colors">
                  {record.document_type === 'health_record' ? 'Health record' : record.notes?.split(/(?<=\.)\s/)[0] || 'Prescription'}
                </h4>
                <p className="font-label-sm text-[12px] text-indigo-gray-600 mt-0.5">
                  {record.document_type === 'health_record' ? `Recorded at ${record.hospital_name ?? 'the hospital'}` : `Prescribed by ${/^dr\.?\s/i.test(record.doctor_name ?? '') ? record.doctor_name : `Dr. ${record.doctor_name ?? ''}`}`}
                </p>
                <p className="font-label-sm text-[11px] text-outline mt-1">{new Date(record.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>

              {record.file_url && record.file_url !== 'none' && (
                <a
                  href={record.file_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white font-label-sm text-[12px] font-semibold bg-primary px-2.5 py-1.5 rounded-md hover:bg-vibrant-blue transition-colors"
                >
                  <Download className="w-[14px] h-[14px]" /> View
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {prescriptions.length > 3 && (
        <div className="pt-2">
          <a className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1" href="/patient/profile#records">
            View all records <ChevronRight className="w-[16px] h-[16px]" />
          </a>
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRecord(null)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
              <h2 className="font-title-lg text-title-lg text-indigo-gray-900 font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Record Details
              </h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Diagnosis</p>
                <p className="font-body-md text-indigo-gray-900 font-medium">Consultation</p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Doctor &amp; Date</p>
                <p className="font-body-md text-indigo-gray-900">Dr. {selectedRecord.doctor_name}</p>
                <p className="font-label-sm text-indigo-gray-600 mt-1">{new Date(selectedRecord.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>

              {/* Hospital name */}
              {selectedRecord.hospital_name && (
                <div>
                  <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Hospital</p>
                  <p className="font-body-md text-indigo-gray-900">{selectedRecord.hospital_name}</p>
                </div>
              )}

              {selectedRecord.symptoms && (
                <div>
                  <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Symptoms</p>
                  <p className="font-body-md text-indigo-gray-900 bg-surface-container-low p-3 rounded-xl">{selectedRecord.symptoms}</p>
                </div>
              )}

              {selectedRecord.prescription && (
                <div>
                  <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Prescription</p>
                  <p className="font-body-md text-indigo-gray-900 bg-surface-container-low p-3 rounded-xl whitespace-pre-line">{selectedRecord.prescription}</p>
                </div>
              )}

              {selectedRecord.notes && (
                <div>
                  <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Notes / Instructions</p>
                  <p className="font-body-md text-indigo-gray-900">{selectedRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-outline-variant/30 flex justify-end gap-3 bg-surface-container-lowest rounded-b-2xl">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-full font-label-sm font-semibold text-indigo-gray-600 hover:bg-surface-container transition-colors"
              >
                Close
              </button>
              {selectedRecord.file_url && selectedRecord.file_url !== 'none' ? (
                <a
                  href={selectedRecord.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2 rounded-full bg-primary text-white font-label-sm font-semibold hover:bg-vibrant-blue transition-colors flex items-center gap-2 shadow-sm shadow-primary/20"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
              ) : (
                <button disabled className="px-6 py-2 rounded-full bg-surface-container text-outline font-label-sm font-semibold flex items-center gap-2 opacity-60 cursor-not-allowed">
                  No File Available
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

