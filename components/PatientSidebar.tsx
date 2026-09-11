'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User, Award, Droplet, Calendar, Mail, Phone, Edit, Download,
  Contact, ChevronRight, Users, Wallet, Heart, Sliders, HelpCircle,
  LogOut, Activity, ArrowRight
} from 'lucide-react'
import { EditProfileModal } from '@/components/EditProfileModal'

export function PatientSidebar({ user, profile, patientDetails, activeAppointmentsCount }: { user: any, profile: any, patientDetails?: any, activeAppointmentsCount?: number }) {
  const pathname = usePathname()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const fullName = profile?.full_name || 'Patient'
  const email = user?.email || ''
  const phone = user?.phone || profile?.phone_number || ''

  // Calculate age if date_of_birth is available
  let ageString = 'Not set'
  if (patientDetails?.date_of_birth) {
    const dob = new Date(patientDetails.date_of_birth)
    const ageDifMs = Date.now() - dob.getTime()
    const ageDate = new Date(ageDifMs)
    const years = Math.abs(ageDate.getUTCFullYear() - 1970)
    ageString = `${years} Years`
  }

  return (
    <div className="lg:col-span-4 flex flex-col gap-6">
      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        profile={profile}
        patientDetails={patientDetails}
      />

      {/* Patient Identity Card */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-vibrant-blue via-fresh-teal to-secondary-container"></div>
        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative w-24 h-24 mb-3 bg-surface-container-high rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-primary/50" />
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-fresh-teal ring-4 ring-surface-container-lowest" title="Sync Status: Live"></span>
          </div>
          <h2 className="font-headline-lg text-title-md font-bold text-on-surface tracking-tight leading-tight">{fullName}</h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
            UHID: <span className="font-semibold text-vibrant-blue">CYD-{user?.id?.slice(0, 8).toUpperCase()}</span>
          </span>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
              <Award className="w-[15px] h-[15px] text-primary" />
              Gold Care Member
            </span>
            <span className="px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm font-semibold">
              Credits: ₹350
            </span>
          </div>
        </div>

        {/* Key Specs Pill Row */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-xl">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-container-lowest">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Blood Group</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Droplet className="text-soft-coral w-[18px] h-[18px]" />
              <span className="font-title-md text-body-md font-bold text-on-surface">{patientDetails?.blood_group || 'Not set'}</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-container-lowest">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Age / Biological</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="text-vibrant-blue w-[18px] h-[18px]" />
              <span className="font-title-md text-body-md font-bold text-on-surface">{ageString}</span>
            </div>
          </div>
        </div>

        {/* Contact Snapshot */}
        <div className="flex flex-col gap-2.5 font-body-md text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-vibrant-blue">
              <Mail className="w-[18px] h-[18px]" />
            </div>
            <span className="text-on-surface font-medium truncate">{email}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-fresh-teal">
              <Phone className="w-[18px] h-[18px]" />
            </div>
            <span className="text-on-surface font-medium">{phone}</span>
          </div>
        </div>

        {/* Quick Profile Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            className="w-full py-2.5 px-4 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]" 
            type="button"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="w-[18px] h-[18px]" /> Edit Profile
          </button>
          <button className="w-full py-2.5 px-4 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm font-semibold hover:bg-surface-container-high transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]" type="button">
            <Download className="w-[18px] h-[18px] text-vibrant-blue" /> Download EHR
          </button>
        </div>
      </div>

      {/* Navigation Menu Card */}
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col gap-1.5">
        <div className="px-3 pt-2 pb-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold text-outline">Patient Dashboard</span>
        </div>

        <Link href="/patient/profile" className={`flex items-center justify-between p-3 rounded-xl transition-all group ${pathname === '/patient/profile' || pathname === '/patient/dashboard' ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-on-surface'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Contact className={`w-[20px] h-[20px] ${pathname === '/patient/profile' || pathname === '/patient/dashboard' ? '' : 'text-on-surface-variant group-hover:text-vibrant-blue transition-colors'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`font-title-md text-label-sm font-bold truncate ${pathname === '/patient/profile' || pathname === '/patient/dashboard' ? '' : 'font-semibold'}`}>Personal Information &amp; History</span>
              <span className={`font-label-sm text-label-sm truncate ${pathname === '/patient/profile' || pathname === '/patient/dashboard' ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>Identity, Contacts &amp; Vitals</span>
            </div>
          </div>
          <ChevronRight className={`w-[18px] h-[18px] ${pathname === '/patient/profile' || pathname === '/patient/dashboard' ? '' : 'text-outline-variant group-hover:text-on-surface transition-colors'}`} />
        </Link>

        <Link href="/patient/appointments" className={`flex items-center justify-between p-3 rounded-xl transition-all group ${pathname === '/patient/appointments' ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-on-surface'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Calendar className={`w-[20px] h-[20px] ${pathname === '/patient/appointments' ? '' : 'text-on-surface-variant group-hover:text-vibrant-blue transition-colors'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`font-body-md text-label-sm truncate ${pathname === '/patient/appointments' ? 'font-bold' : 'font-semibold'}`}>My Appointments &amp; History</span>
              <span className={`font-label-sm text-label-sm truncate ${pathname === '/patient/appointments' ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>Consultations &amp; Telehealth</span>
            </div>
          </div>
          {(activeAppointmentsCount !== undefined) && (
            <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${pathname === '/patient/appointments' ? 'bg-on-primary text-vibrant-blue' : 'bg-primary-fixed text-on-primary-fixed'}`}>
              {activeAppointmentsCount} Active
            </span>
          )}
        </Link>

        <Link href="/patient/family" className={`flex items-center justify-between p-3 rounded-xl transition-all group ${pathname === '/patient/family' ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-on-surface'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Users className={`w-[20px] h-[20px] ${pathname === '/patient/family' ? '' : 'text-on-surface-variant group-hover:text-vibrant-blue transition-colors'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`font-body-md text-label-sm truncate ${pathname === '/patient/family' ? 'font-bold' : 'font-semibold'}`}>Family Members &amp; Dependents</span>
              <span className={`font-label-sm text-label-sm truncate ${pathname === '/patient/family' ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>Linked ABDM Profiles</span>
            </div>
          </div>
          <ChevronRight className={`w-[18px] h-[18px] ${pathname === '/patient/family' ? '' : 'text-outline-variant group-hover:text-on-surface transition-colors'}`} />
        </Link>

        <Link href="/patient/insurance" className={`flex items-center justify-between p-3 rounded-xl transition-all group ${pathname === '/patient/insurance' ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-on-surface'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Wallet className={`w-[20px] h-[20px] ${pathname === '/patient/insurance' ? '' : 'text-on-surface-variant group-hover:text-vibrant-blue transition-colors'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`font-body-md text-label-sm truncate ${pathname === '/patient/insurance' ? 'font-bold' : 'font-semibold'}`}>Insurance &amp; Billing Details</span>
              <span className={`font-label-sm text-label-sm truncate ${pathname === '/patient/insurance' ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>Star Health Comprehensive</span>
            </div>
          </div>
          <ChevronRight className={`w-[18px] h-[18px] ${pathname === '/patient/insurance' ? '' : 'text-outline-variant group-hover:text-on-surface transition-colors'}`} />
        </Link>

        <Link href="/patient/saved" className={`flex items-center justify-between p-3 rounded-xl transition-all group ${pathname === '/patient/saved' ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-on-surface'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Heart className={`w-[20px] h-[20px] ${pathname === '/patient/saved' ? '' : 'text-on-surface-variant group-hover:text-vibrant-blue transition-colors'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`font-body-md text-label-sm truncate ${pathname === '/patient/saved' ? 'font-bold' : 'font-semibold'}`}>Saved Doctors &amp; Diagnostics</span>
              <span className={`font-label-sm text-label-sm truncate ${pathname === '/patient/saved' ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>Lilavati &amp; Apex Labs</span>
            </div>
          </div>
          <ChevronRight className={`w-[18px] h-[18px] ${pathname === '/patient/saved' ? '' : 'text-outline-variant group-hover:text-on-surface transition-colors'}`} />
        </Link>

        <Link href="/patient/preferences" className={`flex items-center justify-between p-3 rounded-xl transition-all group ${pathname === '/patient/preferences' ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-on-surface'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Sliders className={`w-[20px] h-[20px] ${pathname === '/patient/preferences' ? '' : 'text-on-surface-variant group-hover:text-vibrant-blue transition-colors'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`font-body-md text-label-sm truncate ${pathname === '/patient/preferences' ? 'font-bold' : 'font-semibold'}`}>App Preferences &amp; Notifications</span>
              <span className={`font-label-sm text-label-sm truncate ${pathname === '/patient/preferences' ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>Alerts, Channels, WhatsApp</span>
            </div>
          </div>
          <ChevronRight className={`w-[18px] h-[18px] ${pathname === '/patient/preferences' ? '' : 'text-outline-variant group-hover:text-on-surface transition-colors'}`} />
        </Link>

        <Link href="/patient/support" className={`flex items-center justify-between p-3 rounded-xl transition-all group ${pathname === '/patient/support' ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-on-surface'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <HelpCircle className={`w-[20px] h-[20px] ${pathname === '/patient/support' ? '' : 'text-on-surface-variant group-hover:text-vibrant-blue transition-colors'}`} />
            <div className="flex flex-col min-w-0">
              <span className={`font-body-md text-label-sm truncate ${pathname === '/patient/support' ? 'font-bold' : 'font-semibold'}`}>Help, Support &amp; Clinical FAQs</span>
              <span className={`font-label-sm text-label-sm truncate ${pathname === '/patient/support' ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>24/7 Triage Desk</span>
            </div>
          </div>
          <ChevronRight className={`w-[18px] h-[18px] ${pathname === '/patient/support' ? '' : 'text-outline-variant group-hover:text-on-surface transition-colors'}`} />
        </Link>

        <div className="pt-2 mt-1">
          <form action="/auth/signout" method="post">
            <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-error-container/40 text-on-error-container hover:bg-error-container/80 transition-all font-label-sm text-label-sm font-bold" type="submit">
              <LogOut className="w-[18px] h-[18px]" />
              Log Out of Patient Portal
            </button>
          </form>
        </div>
      </div>

      {/* Secondary Help Card */}
      <div className="p-5 rounded-xl bg-surface-container-high/60 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-fresh-teal/20 text-secondary flex items-center justify-center shrink-0">
          <Activity className="w-[22px] h-[22px]" />
        </div>
        <div className="flex flex-col">
          <span className="font-title-md text-body-md font-bold text-on-surface">Emergency Response Triage</span>
          <p className="font-body-md text-label-sm text-on-surface-variant mt-0.5">Need immediate clinical guidance? Direct line to on-call duty doctors.</p>
          <Link href="tel:+9118004429999" className="mt-2 font-label-sm text-label-sm font-bold text-vibrant-blue hover:underline inline-flex items-center gap-1">
            Call +91 1800-442-9999
            <ArrowRight className="w-[14px] h-[14px]" />
          </Link>
        </div>
      </div>
    </div>
  )
}
