'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type NavLink = {
  href: string
  label: string
}

const links: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/search?type=doctor', label: 'Find Doctors' },
  { href: '/search?type=hospital', label: 'Hospitals' },
  // { href: '#', label: 'Health Check Packages' },
  { href: '/diagnostics', label: 'Diagnostics' },
  { href: '/about', label: 'About Us' },
]

export function MainNav({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPathWithParams = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

  return (
    <>
      {links.map((link, idx) => {
        // Simple active check. If it's the home page, exact match. Otherwise, just pathname match.
        // For search links with query params, exact match would be needed, or startsWith if we want to be less strict.
        let isActive = false
        if (link.href === '/') {
          isActive = pathname === '/'
        } else if (link.href !== '#') {
          // Compare only pathname unless it's a search page that needs exact param match.
          // Since /search is used for both doctors and hospitals, we should match the full href or at least the type param.
          if (link.href.includes('/search')) {
            const urlType = new URLSearchParams(link.href.split('?')[1]).get('type')
            const currentType = searchParams.get('type')
            isActive = pathname === '/search' && urlType === currentType
          } else {
            isActive = pathname.startsWith(link.href)
          }
        }

        if (mobile) {
          return (
            <Link
              key={idx}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                  ? 'bg-red-50 text-[#E31E24] font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`}
            >
              {link.label}
            </Link>
          )
        }

        return (
          <Link
            key={idx}
            href={link.href}
            className={`transition-colors ${isActive
                ? 'text-[#E31E24] font-bold'
                : 'hover:text-[#E31E24] text-gray-700 font-semibold'
              }`}
          >
            {link.label}
          </Link>
        )
      })}
    </>
  )
}
