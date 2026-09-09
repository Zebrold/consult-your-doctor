'use client'

import { useState } from 'react'
import { UserCircle, Ticket, Droplet, Pill, Download, X, FileText, ChevronRight } from 'lucide-react'

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'text-fresh-teal font-semibold';
  if (s === 'cancelled') return 'text-[#E31E24] font-semibold';
  if (s === 'pending_payment' || s === 'pending') return 'text-orange-500 font-semibold';
  if (s === 'scheduled' || s === 'confirmed') return 'text-primary font-semibold';
  return 'text-outline';
}

export function ConsultationsList({ appointments }: { appointments: any[] }) {
  const [displayCount, setDisplayCount] = useState(3)
  const [selectedApt, setSelectedApt] = useState<any | null>(null)

  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
        <p className="text-indigo-gray-600 font-label-sm">No upcoming clinical consultations.</p>
      </div>
    )
  }

  const visibleAppointments = appointments.slice(0, displayCount)
  const hasMore = displayCount < appointments.length

  return (
    <div className="flex flex-col gap-4">
      {visibleAppointments.map((apt, idx) => {
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
                  <UserCircle className="w-[28px] h-[28px]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-title-md text-title-md text-indigo-gray-900 font-bold">Dr. {doctor.profiles.full_name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-[11px] font-semibold">{doctor.specialty}</span>
                  </div>
                  <p className="font-body-md text-body-md text-indigo-gray-600">{hospital.name} · {hospital.city}</p>
                </div>
              </div>
              <div className="text-left sm:text-right mt-2 sm:mt-0">
                <span className="inline-block px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold">
                  {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}, {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className={`font-label-sm text-label-sm mt-1 capitalize ${getStatusColor(apt.status)}`}>Status: {apt.status.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="pt-base bg-surface-container-low/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-base mt-2 border-t border-outline-variant/20">
              <div className="flex items-center gap-4 text-indigo-gray-600 font-label-sm text-label-sm">
                <span className="flex items-center gap-1 uppercase">
                  <Ticket className="w-[16px] h-[16px] text-primary" /> ID: {apt.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {apt.status === 'pending_payment' && (
                  <a href={`/patient/checkout/${apt.id}`} className="px-4 py-1.5 rounded-full bg-[#E31E24] text-white font-label-sm text-label-sm font-semibold hover:bg-red-700 transition-colors">
                    Complete Payment
                  </a>
                )}
                <button 
                  onClick={() => setSelectedApt(apt)}
                  className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold hover:bg-primary hover:text-white transition-all shadow-sm" type="button">
                  View Details
                </button>
              </div>
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

      {/* Consultation Details Modal */}
      {selectedApt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedApt(null)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
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
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Doctor</p>
                <p className="font-body-md text-indigo-gray-900 font-bold">Dr. {selectedApt.doctors?.profiles?.full_name}</p>
                <p className="font-label-sm text-primary font-semibold">{selectedApt.doctors?.specialty}</p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Schedule</p>
                <p className="font-body-md text-indigo-gray-900 font-medium">
                  {new Date(selectedApt.schedules?.start_time).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="font-label-sm text-indigo-gray-600 mt-0.5">
                  Time: {new Date(selectedApt.schedules?.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Hospital</p>
                <p className="font-body-md text-indigo-gray-900">{selectedApt.hospitals?.name}</p>
                <p className="font-label-sm text-indigo-gray-600">{selectedApt.hospitals?.city}</p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-outline uppercase tracking-wider mb-1">Status &amp; ID</p>
                <p className={`font-body-md capitalize font-semibold ${getStatusColor(selectedApt.status)}`}>{selectedApt.status.replace('_', ' ')}</p>
                <p className="font-label-sm text-indigo-gray-600 mt-1 uppercase">Booking ID: {selectedApt.id.slice(0, 8)}</p>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/30 flex justify-end bg-surface-container-lowest rounded-b-2xl">
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
                <h4 className="font-label-sm text-body-md text-indigo-gray-900 font-semibold truncate group-hover:text-primary transition-colors">{record.prescription ? record.prescription.split('\n')[0] : (record.diagnosis || 'Medical Record')}</h4>
                <p className="font-label-sm text-[12px] text-indigo-gray-600 mt-0.5">Prescribed by Dr. {record.doctor_name}</p>
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
          <a className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1" data-path="prescriptions" href="/patient/prescriptions">
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

