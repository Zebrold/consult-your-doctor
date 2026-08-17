'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

export function SidebarLink({ 
  href, 
  icon, 
  label,
  activeClassName = 'bg-emerald-50 text-emerald-700 font-bold',
  inactiveClassName = 'text-gray-600 hover:bg-gray-50 font-medium'
}: { 
  href: string, 
  icon: React.ReactNode, 
  label: string,
  activeClassName?: string,
  inactiveClassName?: string
}) {
  const pathname = usePathname()
  
  // Determine if active. For dashboards, usually exact match or starts with.
  // E.g., /admin/dashboard, /admin/hospitals, /admin/staff
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        isActive ? activeClassName : inactiveClassName
      }`}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {icon}
      </div>
      {label}
    </Link>
  )
}
