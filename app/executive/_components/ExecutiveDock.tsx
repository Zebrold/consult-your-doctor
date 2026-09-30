'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, IndianRupee, LayoutGrid, Microscope, Stethoscope, Users } from 'lucide-react'

const items = [
  { href: '/executive/dashboard', label: 'Command', icon: LayoutGrid, exact: true },
  { href: '/executive/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/executive/diagnostics', label: 'Diagnostics', icon: Microscope },
  { href: '/executive/patients', label: 'Patients', icon: Users },
  { href: '/executive/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/executive/today', label: 'Check-ins', icon: CalendarCheck },
]

export function ExecutiveDock() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-4 sm:bottom-6 inset-x-0 z-50 flex justify-center px-3 pointer-events-none">
      <nav
        aria-label="Executive navigation"
        className="pointer-events-auto flex items-center gap-1 p-1.5 sm:p-2 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_8px_32px_rgba(15,23,42,0.12)] ring-1 ring-surface-container max-w-full overflow-x-auto"
      >
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              title={label}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-vibrant-blue text-on-primary shadow-sm'
                  : 'text-indigo-gray-900 hover:text-vibrant-blue hover:bg-surface-container-low'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? '' : 'text-indigo-gray-600'}`} />
              <span className={active ? 'inline' : 'hidden md:inline'}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
