'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays, CheckCircle2, Clock, Download, FileText, HelpCircle,
  MapPin, Phone, QrCode, RefreshCw, ShieldCheck, Stethoscope, User, XCircle, ArrowLeft, Printer
} from 'lucide-react'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'

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
  fee: number
  paymentStatus: 'success' | 'pending' | 'failed'
  appointmentStatus: string
  qrDataUrl: string
  checkoutUrl?: string
}

export function ConfirmationClient({ data }: { data: ConfirmationData }) {
  const isPaid = data.paymentStatus === 'success'
  const isFailed = data.paymentStatus === 'failed'

  const printReceipt = () => {
    window.print()
  }

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen font-body-md">
      <PatientNavHeader isSignedIn name={data.patientName} backHref="/patient/appointments" container="max-w-[1080px] px-margin-x-mobile lg:px-margin-x-desktop" />

      <main className="max-w-[1080px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-6 pb-28 md:pb-32">
        {/* Status Header Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 shadow-lg transition-transform hover:scale-105"
            style={{
              backgroundColor: isPaid ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B',
              color: '#FFFFFF'
            }}>
            {isPaid ? <CheckCircle2 className="w-9 h-9" /> : isFailed ? <XCircle className="w-9 h-9" /> : <Clock className="w-9 h-9" />}
          </div>

          <h1 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-on-surface">
            {isPaid ? 'Appointment Confirmed!' : isFailed ? 'Payment Not Completed' : 'Pending Confirmation'}
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant max-w-md mx-auto mt-1">
            {isPaid
              ? 'Your appointment has been successfully scheduled and confirmed with the clinician.'
              : isFailed
              ? 'Your slot is held temporarily, but the online payment was not completed.'
              : 'Your booking has been received and is waiting for payment settlement.'}
          </p>
        </div>

        {/* The Card - Clean Printable Booking Slip */}
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl overflow-hidden max-w-2xl mx-auto print:shadow-none print:border-none">
          {/* Top Ticket Header */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-primary to-vibrant-blue text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold opacity-90">Consult Your Doctor • Appointment Token</span>
              <div className="font-display-lg text-3xl md:text-4xl font-extrabold tracking-tight mt-1">
                Token #{data.tokenNumber}
              </div>
              <span className="text-xs font-mono opacity-80 mt-1 block">Booking ID: {data.bookingReference}</span>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/20">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm">
                {isPaid ? 'Confirmed' : isFailed ? 'Action Required' : 'Pending'}
              </span>
              <span className="text-xs font-medium opacity-90 mt-1">Amount: ₹{data.fee.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 md:p-8 flex flex-col gap-6">
            {/* Clinician & Facility Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-outline-variant/20">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-outline uppercase tracking-wider">
                  {data.isConsultation ? 'Doctor Details' : 'Laboratory Diagnostic'}
                </span>
                <h3 className="font-title-md text-lg font-bold text-on-surface">{data.title}</h3>
                <span className="text-xs text-primary font-semibold">{data.subtitle}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-outline uppercase tracking-wider">Hospital / Clinic</span>
                <h4 className="font-title-md text-base font-bold text-on-surface">{data.providerName}</h4>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <MapPin className="w-3.5 h-3.5 text-outline shrink-0" />
                  <span>{data.location}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-primary">{data.providerCode}</span>
              </div>
            </div>

            {/* Date, Time & Patient Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-outline-variant/20">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-outline uppercase tracking-wider">Appointment Time</span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
                  <CalendarDays className="w-4 h-4 text-vibrant-blue shrink-0" />
                  <span>{data.dateTime}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-outline uppercase tracking-wider">Patient Name</span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
                  <User className="w-4 h-4 text-fresh-teal shrink-0" />
                  <span>{data.patientName}</span>
                </div>
                {data.patientPhone && <span className="text-xs text-outline">{data.patientPhone}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-outline uppercase tracking-wider">Payment Status</span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="capitalize">{isPaid ? 'Paid in Full' : data.paymentStatus}</span>
                </div>
                <span className="text-xs text-outline">₹{data.fee.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* QR Verification Code & Instructions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/20">
              <div className="flex flex-col gap-1 text-center sm:text-left">
                <span className="font-title-md text-sm font-bold text-on-surface">Reception Check-in QR</span>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Show this QR code at the clinic or hospital reception desk upon arrival for instant token verification.
                </p>
                <span className="text-[11px] font-mono text-outline mt-1">Ref: {data.bookingReference}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white shadow-sm shrink-0 border border-outline-variant/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrDataUrl} alt="Booking Verification QR" className="w-24 h-24" />
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="p-6 md:p-8 bg-surface-container-low/30 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 print:hidden">
            {isFailed && data.checkoutUrl ? (
              <a
                href={data.checkoutUrl}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retry Payment Now
              </a>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={printReceipt}
                className="py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4 text-outline" /> Download / Print Slip
              </button>

              <Link
                href="/patient/appointments"
                className="py-2.5 px-4 rounded-xl bg-vibrant-blue hover:bg-primary text-white font-bold text-xs transition-colors shadow-sm"
              >
                View in Appointments
              </Link>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <Link
                href={`/patient/support?bookingId=${data.bookingReference}`}
                className="text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Contact Support
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PatientDock activeTab="book" name={data.patientName} />
    </div>
  )
}
