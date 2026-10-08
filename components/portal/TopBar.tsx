'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, LogIn, LogOut, UserRound } from 'lucide-react'
import { initials } from '@/components/patient/format'

/** `icon` is a rendered icon, e.g. <ExternalLink />, so server layouts can pass it. */
export type TopBarLink = { href: string; label: string; icon: ReactNode }

/** `detail` (such as an email address) replaces the role in the account menu's heading. */
type Person = { name: string; role: string; image?: string | null; detail?: string | null }

/**
 * The bar across the top of every part of the site that has the navigation pill: the logo and company name on the
 * left; on the right, details about where you are and who is signed in, whose menu holds their links and Sign out.
 */
export function TopBar({
  homeHref,
  section,
  person,
  chips,
  links = [],
  backHref,
  signInHref = '/login/patient',
  container = 'max-w-[1440px] px-4 lg:px-margin-x-desktop',
  className = '',
}: {
  homeHref: string
  /** Shown under the company name, e.g. "Doctor Portal". */
  section: string
  /** Who is signed in; null shows a Sign in button instead. */
  person: Person | null
  /** Context shown on wide screens, before the account (hospital name, listing status). */
  chips?: ReactNode
  /** Account links, listed above Sign out in the menu the avatar opens. */
  links?: TopBarLink[]
  /** Adds a back arrow on phones. */
  backHref?: string
  signInHref?: string
  /** Width and side padding, to line up with the page below. */
  container?: string
  /** Extra classes for the bar, e.g. "hidden md:block" where a page has its own phone header. */
  className?: string
}) {
  return (
    <header className={`sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-[env(safe-area-inset-top)] print:hidden ${className}`}>
      <div className={`h-16 mx-auto flex items-center justify-between gap-3 ${container}`}>
        <div className="flex items-center gap-1 min-w-0">
          {backHref && (
            <Link href={backHref} aria-label="Back" className="md:hidden w-9 h-9 -ml-2 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <Link href={homeHref} className="flex items-center gap-2.5 min-w-0 group">
            <Image
              src="/logo-icon.png"
              alt="Consult your Doctor"
              width={36}
              height={36}
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 transition-transform group-hover:scale-105"
              priority
            />
            <span className="flex flex-col min-w-0">
              <span className="font-title-md text-[15px] sm:text-lg font-bold text-on-surface tracking-tight leading-tight truncate">Consult your Doctor</span>
              <span className="font-label-sm text-[11px] sm:text-label-sm text-indigo-gray-600 truncate">{section}</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {chips && <div className="hidden lg:flex items-center gap-2">{chips}</div>}
          {person ? (
            <AccountMenu person={person} links={links} />
          ) : (
            <Link
              href={signInHref}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm font-bold shadow-sm transition-colors"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function Avatar({ person, size = 'w-9 h-9' }: { person: Person; size?: string }) {
  return (
    <span className={`${size} rounded-full overflow-hidden bg-vibrant-blue text-on-primary flex items-center justify-center font-bold text-xs shrink-0`}>
      {person.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.image} alt="" className="w-full h-full object-cover" />
      ) : person.name ? (
        initials(person.name)
      ) : (
        <UserRound className="w-[18px] h-[18px]" />
      )}
    </span>
  )
}

function NameAndRole({ person }: { person: Person }) {
  return (
    <span className="hidden sm:flex flex-col leading-tight text-left min-w-0 max-w-[180px]">
      <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 truncate">{person.name || 'My account'}</span>
      <span className="font-label-sm text-[11px] text-indigo-gray-600 truncate">{person.role}</span>
    </span>
  )
}

/** The avatar as a button that opens the account's links and Sign out. */
function AccountMenu({ person, links }: { person: Person; links: TopBarLink[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-full p-0.5 sm:pr-2 hover:bg-surface-container-low transition-colors"
      >
        <Avatar person={person} />
        <NameAndRole person={person} />
        <ChevronDown className={`hidden sm:block w-4 h-4 text-indigo-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-[0_12px_32px_rgba(0,50,140,0.14)] p-2 z-50">
          <div className="flex items-center gap-3 px-2.5 py-2.5 mb-1 border-b border-surface-container">
            <Avatar person={person} size="w-10 h-10" />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-on-surface truncate">{person.name || 'My account'}</span>
              <span className="block text-xs text-on-surface-variant truncate">{person.detail || person.role}</span>
            </span>
          </div>
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <span aria-hidden className="text-primary flex [&_svg]:w-[18px] [&_svg]:h-[18px]">
                {icon}
              </span>
              {label}
            </Link>
          ))}
          <form action="/auth/signout" method="post" className={links.length ? 'mt-1 pt-1 border-t border-surface-container' : ''}>
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-semibold text-soft-coral hover:bg-soft-coral/10 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" /> Sign out
            </button>
          </form>
          {/* The legal pages are open to every portal (see SHARED_PAGES in the middleware). */}
          <div className="mt-1 pt-2 px-2.5 pb-1 border-t border-surface-container flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-on-surface-variant">
            <Link href="/terms-of-use" role="menuitem" onClick={() => setOpen(false)} className="hover:text-primary hover:underline">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy-policy" role="menuitem" onClick={() => setOpen(false)} className="hover:text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
