'use client'

import { usePathname } from 'next/navigation'
import { BrainCircuit, CalendarCheck, CreditCard, IndianRupee, LayoutGrid, LifeBuoy, Microscope, Stethoscope, Users } from 'lucide-react'
import { PillNav } from '@/components/portal/PillNav'

const items = [
  { href: '/executive/dashboard', label: 'Command', icon: LayoutGrid, exact: true },
  { href: '/executive/payments', label: 'Payments', icon: CreditCard },
  { href: '/executive/support', label: 'Support', icon: LifeBuoy },
  { href: '/executive/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/executive/diagnostics', label: 'Diagnostics', icon: Microscope },
  { href: '/executive/patients', label: 'Patients', icon: Users },
  { href: '/executive/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/executive/today', label: 'Check-ins', icon: CalendarCheck },
  { href: '/executive/ai', label: 'Zebrold AI', icon: BrainCircuit, ai: true },
]

export function ExecutiveDock() {
  const pathname = usePathname()
  return (
    <PillNav
      label="Executive navigation"
      tabs={items.map(({ exact, ...t }) => ({ ...t, active: exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`) }))}
    />
  )
}
