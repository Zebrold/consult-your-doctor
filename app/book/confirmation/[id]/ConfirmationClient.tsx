'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Building2, CalendarDays, Download, FileText, IndianRupee, Printer, RefreshCw, User } from 'lucide-react'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { formatINR } from '@/components/patient/format'
import { payAtVenueNote } from '@/lib/pricing'

export type ConfirmationData = {
  id: string
  bookingReference: string
  tokenNumber: string
  isConsultation: boolean
  title: string
  subtitle: string
  providerName: string
  providerCode: string
  location: string
  address: string | null
  dateTime: string
  patientName: string
  patientPhone: string | null
  /** The booking fee paid (or to pay) online; null for a booking made and paid at a hospital or lab desk. */
  bookingFee: number | null
  /** What is paid at the hospital or lab, when it is more than the usual note says (services picked with a doctor booking). */
  venueNote?: string | null
  paymentStatus: 'success' | 'pending' | 'failed'
  /** Why the last payment didn't go through, from the PayU callback. */
  failureReason: string | null
  appointmentStatus: string
  qrDataUrl: string
  checkoutUrl?: string
}

const action = 'h-12 px-4 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 text-center transition-colors'
const actionOutline = `${action} bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 shadow-sm`

export function ConfirmationClient({ data }: { data: ConfirmationData }) {
  const isPaid = data.paymentStatus === 'success' || data.appointmentStatus === 'confirmed' || data.appointmentStatus === 'visited' || data.appointmentStatus === 'completed'
  const isFailed = data.paymentStatus === 'failed'

  const printReceipt = () => {
    window.print()
  }

  // Clean doctor name (prevent duplicate "Dr. Dr Vijay")
  const cleanDoctorName = data.title.replace(/^Dr\.?\s+Dr\.?/i, 'Dr. ')

  // Split date and time for two-line presentation as in Image 1
  let dateText = data.dateTime
  let timeText = ''
  if (data.dateTime.includes(' at ')) {
    const parts = data.dateTime.split(' at ')
    dateText = parts[0]
    timeText = parts[1]
  } else if (data.dateTime.includes('•')) {
    const parts = data.dateTime.split('•')
    dateText = parts[0].trim()
    timeText = parts[1].trim()
  }

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent text-on-surface antialiased min-h-screen font-body-md">
      <PatientNavHeader
        isSignedIn
        name={data.patientName}
        backHref="/patient/appointments"
        container="max-w-[1080px] px-margin-x-mobile lg:px-margin-x-desktop"
        eyebrow={data.isConsultation ? 'Appointment' : 'Lab booking'}
        title={isPaid ? 'Booking Confirmed' : isFailed ? 'Payment Failed' : 'Awaiting Payment'}
        subtitle={[cleanDoctorName, data.dateTime].filter(Boolean).join(' • ')}
      />

      {/* Phones: room under the buttons for the tab bar and the assistant's round button above it. */}
      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 pt-5 md:pt-6 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-16">
        
        {/* Minimalist Card Container (Matches Image 1) */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden max-w-[500px] mx-auto p-6 sm:p-8 print:shadow-none print:border-none print:p-0">
          
          {/* Card Header: Stethoscope Logo + Brand + APPOINTMENT CONFIRMATION */}
          <div className="flex items-center justify-between gap-3 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/logo-icon.png"
                alt="Consult Your Doctor"
                width={38}
                height={38}
                className="w-9 h-9 object-contain shrink-0"
              />
              <span className="font-extrabold text-[19px] sm:text-[21px] tracking-tight text-gray-900 leading-tight whitespace-nowrap">
                Consult Your Doctor
              </span>
            </div>

            {/* Phones leave this out, so the name stays on one line. */}
            <div className="hidden sm:block shrink-0 text-right border-l border-gray-200 pl-3">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-tight">
                Appointment<br />Confirmation
              </span>
            </div>
          </div>

          {/* Token Number & Status Highlight Box */}
          {/* Both labels on the top line; the status pill sits level with the token number below. */}
          <div className="mt-6 bg-[#f0f7ff] rounded-2xl p-4 sm:p-5 border border-blue-100/70 flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Token Number
              </span>
              <div className="font-black text-2xl sm:text-3xl leading-[36px] sm:leading-[40px] text-[#1D4ED8] tracking-tight mt-1">
                {data.tokenNumber.replace(/^#/, '')}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Status
              </span>
              <span
                className={`mt-1 sm:mt-2 inline-flex items-center h-8 px-3.5 rounded-full text-xs font-bold border ${
                  isPaid
                    ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]'
                    : isFailed
                    ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]'
                    : 'bg-[#fff8eb] text-[#d97706] border-[#fde68a]'
                }`}
              >
                {isPaid ? 'Confirmed' : isFailed ? 'Failed' : 'Pending Payment'}
              </span>
            </div>
          </div>

          {/* Details List with Circular Icon Chips */}
          <div className="mt-6 flex flex-col divide-y divide-gray-100">
            
            {/* 1. Doctor */}
            <div className="py-4 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#f0f7ff] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-100/60 mt-0.5">
                <User className="w-5 h-5 text-[#1D4ED8]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  {data.isConsultation ? 'Doctor' : 'Diagnostic Service'}
                </span>
                <div className="font-bold text-[15.5px] text-gray-900 mt-0.5 truncate">
                  {cleanDoctorName}
                </div>
                <div className="text-[13px] font-semibold text-[#1D4ED8] mt-0.5">
                  {data.subtitle || 'Specialist Consultation'}
                </div>
              </div>
            </div>

            {/* 2. Schedule */}
            <div className="py-4 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#f0f7ff] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-100/60 mt-0.5">
                <CalendarDays className="w-5 h-5 text-[#1D4ED8]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Schedule
                </span>
                <div className="font-bold text-[15.5px] text-gray-900 mt-0.5">
                  {dateText}
                </div>
                {timeText && (
                  <div className="text-[13px] font-medium text-gray-500 mt-0.5">
                    Time: {timeText}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Hospital / Clinic */}
            <div className="py-4 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#f0f7ff] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-100/60 mt-0.5">
                <Building2 className="w-5 h-5 text-[#1D4ED8]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Hospital / Clinic
                </span>
                <div className="font-bold text-[15.5px] text-gray-900 mt-0.5 truncate">
                  {data.providerName}
                </div>
                <div className="text-[13px] font-medium text-gray-500 mt-0.5">
                  {data.location}
                </div>
              </div>
            </div>

            {/* 4. Booking Reference */}
            <div className="py-4 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#f0f7ff] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-100/60 mt-0.5">
                <FileText className="w-5 h-5 text-[#1D4ED8]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Booking Reference
                </span>
                <div className="font-mono font-bold text-[15.5px] text-[#1D4ED8] mt-0.5 tracking-wide">
                  #{data.bookingReference}
                </div>
              </div>
            </div>

            {/* 5. Booking fee: the only amount paid online */}
            <div className="py-4 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#f0f7ff] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-100/60 mt-0.5">
                <IndianRupee className="w-5 h-5 text-[#1D4ED8]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Booking Fee
                </span>
                <div className="font-bold text-[15.5px] text-gray-900 mt-0.5">
                  {data.bookingFee == null ? 'None (booked at the desk)' : `${formatINR(data.bookingFee)} ${isPaid ? 'paid online' : 'to pay online'}`}
                </div>
                {data.bookingFee != null && (
                  <div className="text-[13px] font-medium text-gray-500 mt-0.5">
                    {data.venueNote || payAtVenueNote(data.isConsultation)}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Box: Important Message & QR Code (Matches Image 1) */}
          <div className="mt-5 bg-[#f0f7ff] rounded-2xl p-4 sm:p-5 border border-blue-100/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left flex-1">
              <span className="text-[11px] font-extrabold text-[#1D4ED8] tracking-wider uppercase block mb-1">
                Important
              </span>
              <p className="text-[12.5px] text-gray-600 leading-snug">
                {isPaid
                  ? 'Your appointment is confirmed. Please show this token or QR code at reception upon arrival.'
                  : isFailed
                  ? 'Payment was not completed. Please retry payment to confirm your booking.'
                  : 'Please complete your payment to confirm your appointment.'}
              </p>
              {isFailed && data.failureReason && (
                <p className="mt-1.5 text-[12px] font-semibold text-red-700 leading-snug">{data.failureReason}</p>
              )}
            </div>

            <div className="flex flex-col items-center shrink-0">
              <div className="p-1.5 rounded-xl bg-white shadow-sm border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrDataUrl}
                  alt="Booking Verification QR"
                  className="w-20 h-20 object-contain"
                />
              </div>
              <span className="text-[9.5px] font-semibold text-gray-400 mt-1.5 text-center">
                Scan to view confirmation slip
              </span>
            </div>
          </div>

        </div>

        {/* Actions: one grid as wide as the card, every button the same height. Retry payment (when it failed) and My
            bookings (once paid) take the whole row; the slip buttons share one. */}
        <div className="max-w-[500px] mx-auto mt-5 grid grid-cols-2 gap-3 print:hidden">
          {isFailed && data.checkoutUrl && (
            <a href={data.checkoutUrl} className={`${action} col-span-2 bg-[#D92D20] hover:bg-[#B42318] text-white shadow-[0_10px_20px_-10px_rgba(217,45,32,0.7)]`}>
              <RefreshCw className="w-4 h-4" strokeWidth={2.4} /> Retry payment
            </a>
          )}

          {isPaid && (
            <a href={`/api/booking/${data.id}/slip`} target="_blank" rel="noopener noreferrer" download className={actionOutline}>
              <Download className="w-4 h-4 text-[#1D4ED8]" strokeWidth={2.4} /> Download slip
            </a>
          )}

          <button type="button" onClick={printReceipt} className={actionOutline}>
            <Printer className="w-4 h-4 text-[#5B667A]" strokeWidth={2.4} /> Print slip
          </button>

          <Link
            href="/patient/appointments"
            className={`${action} ${isPaid ? 'col-span-2' : ''} bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-[0_10px_20px_-10px_rgba(29,78,216,0.7)]`}
          >
            My bookings <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
          </Link>
        </div>

      </main>

      <PatientDock activeTab="book" name={data.patientName} />
    </div>
  )
}
