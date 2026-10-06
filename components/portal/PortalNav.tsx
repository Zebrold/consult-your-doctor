'use client'

import { usePathname } from 'next/navigation'
import { BrainCircuit, CalendarDays, CircleUserRound, IdCard, LayoutGrid, Users, Wallet } from 'lucide-react'
import { PillNav, type PillTab } from './PillNav'

export type Portal = 'doctor' | 'lab' | 'hospital'

type Tab = { href: string; label: string; icon: typeof LayoutGrid; /** Longer label for wide screens. */ wide?: string; ai?: boolean; profile?: boolean }

const TABS: Record<Portal, Tab[]> = {
  doctor: [
    { href: '/doctor/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/doctor/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/doctor/patients', label: 'Patients', icon: Users },
    { href: '/doctor/ai', label: 'Zebrold AI', icon: BrainCircuit, ai: true },
    { href: '/doctor/profile', label: 'Profile', icon: CircleUserRound, profile: true },
  ],
  lab: [
    { href: '/diagnostic-center/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/diagnostic-center/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/diagnostic-center/patients', label: 'Patients', icon: Users },
    { href: '/diagnostic-center/ai', label: 'Zebrold AI', icon: BrainCircuit, ai: true },
    { href: '/diagnostic-center/profile', label: 'Profile', icon: CircleUserRound, profile: true },
  ],
  hospital: [
    { href: '/hospital/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/hospital/patients', label: 'Patients', icon: Users, wide: 'Patients & Visits' },
    { href: '/hospital/doctors', label: 'Roster', icon: CalendarDays, wide: 'Duty Roster & Doctors' },
    { href: '/hospital/revenue', label: 'Finance', icon: Wallet, wide: 'Finance & Revenue' },
    { href: '/hospital/staff', label: 'Staff', icon: IdCard, wide: 'Staff Directory' },
    { href: '/hospital/ai', label: 'Zebrold AI', icon: BrainCircuit, ai: true },
  ],
}

const NAV_LABEL: Record<Portal, string> = { doctor: 'Doctor navigation', lab: 'Diagnostic center navigation', hospital: 'Hospital navigation' }

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** The section's rounded navigation bar (see PillNav). `avatar` pictures the profile tab. */
export function PortalDock({ portal, avatar }: { portal: Portal; avatar?: PillTab['avatar'] }) {
  const pathname = usePathname()
  return <PillNav label={NAV_LABEL[portal]} tabs={TABS[portal].map((t) => ({ ...t, active: isActive(pathname, t.href), avatar: t.profile ? avatar : undefined }))} />
}
