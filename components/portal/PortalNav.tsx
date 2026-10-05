'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CircleUserRound, ExternalLink, IdCard, LayoutGrid, LogOut, Menu, Users, Wallet, X } from 'lucide-react'
import { initials } from '@/components/patient/format'

export type Portal = 'doctor' | 'lab' | 'hospital'

type Tab = { href: string; label: string; icon: typeof LayoutGrid; /** Longer label for the desktop dock. */ wide?: string }

const TABS: Record<Portal, Tab[]> = {
  doctor: [
    { href: '/doctor/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/doctor/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/doctor/patients', label: 'Patients', icon: Users },
    { href: '/doctor/profile', label: 'Profile', icon: CircleUserRound },
  ],
  lab: [
    { href: '/diagnostic-center/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/diagnostic-center/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/diagnostic-center/patients', label: 'Patients', icon: Users },
    { href: '/diagnostic-center/profile', label: 'Profile', icon: CircleUserRound },
  ],
  hospital: [
    { href: '/hospital/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/hospital/patients', label: 'Patients', icon: Users, wide: 'Patients & Visits' },
    { href: '/hospital/doctors', label: 'Roster', icon: CalendarDays, wide: 'Duty Roster & Doctors' },
    { href: '/hospital/revenue', label: 'Finance', icon: Wallet, wide: 'Finance & Revenue' },
    { href: '/hospital/staff', label: 'Staff', icon: IdCard, wide: 'Staff Directory' },
  ],
}

const NAV_LABEL: Record<Portal, string> = { doctor: 'Doctor navigation', lab: 'Diagnostic center navigation', hospital: 'Hospital navigation' }

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** Bottom navigation: full-width bar on phones; a floating glass pill with the active tab filled from tablet up. */
export function PortalDock({ portal }: { portal: Portal }) {
  const pathname = usePathname()
  return <PillDock portal={portal} pathname={pathname} />
}

function PillDock({ portal, pathname }: { portal: Portal; pathname: string }) {
  const tabs = TABS[portal]
  return (
    <nav
      aria-label={NAV_LABEL[portal]}
      className="fixed z-50 bottom-0 inset-x-0 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,102,255,0.06)] pb-[env(safe-area-inset-bottom)] md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:pb-0 md:rounded-full md:bg-surface-container-lowest/80 md:border md:border-outline-variant/40 md:shadow-[0_8px_30px_rgba(0,102,255,0.08)]"
    >
      <div className="flex items-center justify-around h-16 md:h-auto px-base md:p-2 md:gap-1.5">
        {tabs.map(({ href, label, icon: Icon, wide }, i) => {
          const active = isActive(pathname, href)
          const profile = i === tabs.length - 1 && label === 'Profile'
          return (
            <Fragment key={href}>
              {profile && <span aria-hidden className="hidden md:block h-6 w-px bg-outline-variant/50 mx-1" />}
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 min-w-[56px] md:min-w-0 h-12 md:h-auto md:rounded-full transition-all text-[10px] md:text-label-sm font-semibold md:font-label-sm ${
                  profile ? 'md:pl-2 md:pr-4 md:py-1.5' : 'md:px-5 md:py-2.5'
                } ${active ? 'text-vibrant-blue md:bg-primary md:text-on-primary md:shadow-md' : 'text-on-surface-variant hover:text-vibrant-blue md:hover:text-on-surface md:hover:bg-surface-container'}`}
              >
                {profile && !active ? (
                  <>
                    <Icon className="md:hidden w-6 h-6" strokeWidth={1.8} />
                    <span className="hidden md:flex w-7 h-7 rounded-full bg-primary text-on-primary items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                  </>
                ) : (
                  <Icon className="w-6 h-6 md:w-5 md:h-5" strokeWidth={active ? 2.2 : 1.8} />
                )}
                {wide ? (
                  <>
                    <span className="xl:hidden">{label}</span>
                    <span className="hidden xl:inline whitespace-nowrap">{wide}</span>
                  </>
                ) : (
                  label
                )}
              </Link>
            </Fragment>
          )
        })}
      </div>
    </nav>
  )
}

/** Phone app bar with the page title and a menu; hidden from tablet width up. */
export function PortalMobileHeader({
  portal,
  name,
  subtitle,
  image,
  profileHref,
  extraLink,
}: {
  portal: Portal
  name: string
  subtitle: string
  image: string | null
  profileHref: string
  extraLink?: { href: string; label: string }
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const tabs = TABS[portal]
  const title = tabs.find((t) => isActive(pathname, t.href))?.label ?? subtitle

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high/60 px-4 py-3 flex items-center justify-between">
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full hover:bg-surface-container text-indigo-gray-900">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-headline-lg text-[20px] font-bold text-indigo-gray-900 tracking-tight">{title}</h1>
        <Link href={profileHref} aria-label="Profile" className="w-9 h-9 rounded-full overflow-hidden bg-primary-fixed text-on-primary-fixed ring-2 ring-primary/20 flex items-center justify-center text-[12px] font-bold">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            initials(name)
          )}
        </Link>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-[60] flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-indigo-gray-900/40" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[82vw] h-full bg-surface-container-lowest shadow-2xl flex flex-col">
            <div className="p-5 flex items-center justify-between gap-3 bg-surface-container-low">
              <div className="min-w-0">
                <p className="font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{name}</p>
                <p className="text-xs text-indigo-gray-600">{subtitle}</p>
              </div>
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 flex flex-col gap-1 flex-1">
              {tabs.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold ${isActive(pathname, href) ? 'bg-primary-fixed/50 text-primary' : 'text-indigo-gray-900 hover:bg-surface-container-low'}`}
                >
                  <Icon className="w-5 h-5" /> {label}
                </Link>
              ))}
              {extraLink && (
                <>
                  <div className="my-2 border-t border-surface-container" />
                  <Link href={extraLink.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-indigo-gray-600 hover:bg-surface-container-low">
                    <ExternalLink className="w-5 h-5" /> {extraLink.label}
                  </Link>
                </>
              )}
            </nav>
            <form action="/auth/signout" method="post" className="p-4 border-t border-surface-container">
              <button type="submit" className="w-full py-3 rounded-xl bg-error/10 text-error text-sm font-bold flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
