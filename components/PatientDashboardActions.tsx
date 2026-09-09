'use client'

import { useState } from 'react'
import { Search, Mic, CalendarPlus, Microscope, ClipboardList, ShieldAlert, X } from 'lucide-react'
import { BookConsultationForm } from '@/components/BookConsultationForm'

export function PatientDashboardActions() {
  const [activeForm, setActiveForm] = useState<'consultation' | 'diagnostics' | null>(null)

  return (
    <div className="relative z-10 flex flex-col gap-stack-md w-full">
      <div className="relative w-full">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-outline w-[22px] h-[22px] pointer-events-none" />
          <input className="w-full pl-12 pr-28 py-3.5 rounded-full bg-indigo-gray-50 text-indigo-gray-900 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container shadow-inner transition-all" placeholder="Search your health records, doctors, test reports, or prescribed medications..." type="text" />
          <div className="absolute right-2 flex items-center gap-1">
            <kbd className="hidden sm:inline-block px-2.5 py-1 rounded bg-surface-container-high text-outline text-[11px] font-semibold font-label-sm">⌘K</kbd>
            <button className="p-2 rounded-full hover:bg-surface-container text-outline transition-colors" title="Voice Search" type="button">
              <Mic className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <button
          onClick={() => setActiveForm(activeForm === 'consultation' ? null : 'consultation')}
          className={`group flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm ${activeForm === 'consultation' ? 'bg-primary text-white' : 'bg-primary-container text-on-primary-container hover:bg-primary hover:text-white'}`} type="button">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${activeForm === 'consultation' ? 'bg-white/20 text-white' : 'bg-surface-container-lowest/20 text-on-primary-container group-hover:text-white'}`}>
            <CalendarPlus className="w-[22px] h-[22px]" />
          </div>
          <div className="text-left">
            <p className="font-label-sm text-label-sm font-semibold leading-tight">Book Doctor</p>
            <p className="font-label-sm text-[11px] opacity-80 leading-none mt-0.5">In-clinic or video</p>
          </div>
        </button>
        <button
          onClick={() => setActiveForm(activeForm === 'diagnostics' ? null : 'diagnostics')}
          className={`group flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm ${activeForm === 'diagnostics' ? 'bg-primary text-white' : 'bg-surface-container text-primary hover:bg-surface-variant'}`} type="button">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${activeForm === 'diagnostics' ? 'bg-white/20 text-white' : 'bg-surface-container-lowest text-primary'}`}>
            <Microscope className="w-[22px] h-[22px]" />
          </div>
          <div className="text-left">
            <p className={`font-label-sm text-label-sm font-semibold leading-tight ${activeForm === 'diagnostics' ? 'text-white' : 'text-indigo-gray-900'}`}>Lab &amp; Diagnostics</p>
            <p className={`font-label-sm text-[11px] leading-none mt-0.5 ${activeForm === 'diagnostics' ? 'text-white/80' : 'text-indigo-gray-600'}`}>Home sample pick-up</p>
          </div>
        </button>
        {/* <button className="group flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm" type="button">
          <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
            <ClipboardList className="w-[22px] h-[22px]" />
          </div>
          <div className="text-left">
            <p className="font-label-sm text-label-sm font-semibold leading-tight">Refill Medicine</p>
            <p className="font-label-sm text-[11px] text-indigo-gray-600 leading-none mt-0.5">Express delivery in 2h</p>
          </div>
        </button> */}
        <button className="group flex items-center gap-3 p-3.5 rounded-xl bg-tertiary-fixed text-tertiary hover:bg-error-container transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm" type="button">
          <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-[22px] h-[22px]" />
          </div>
          <div className="text-left">
            <p className="font-label-sm text-label-sm font-semibold leading-tight">Emergency Teleconsult</p>
            <p className="font-label-sm text-[11px] opacity-80 leading-none mt-0.5">Connect in &lt; 90 sec</p>
          </div>
        </button>
      </div>

      {activeForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setActiveForm(null)} />
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl shadow-black/20 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
              <h2 className="font-title-lg text-title-lg text-indigo-gray-900 font-bold">
                {activeForm === 'consultation' ? 'Book a Consultation' : 'Book Diagnostics'}
              </h2>
              <button
                onClick={() => setActiveForm(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {/* Disable the form's internal card styling by overriding some CSS, or just let it be since it's max-w-md inside max-w-lg */}
              <div className="[&>div]:shadow-none [&>div]:border-none [&>div]:p-0 [&>div]:max-w-none">
                <BookConsultationForm key={activeForm} defaultType={activeForm} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
