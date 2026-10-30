'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BedDouble, Bell, Building2, CalendarDays, CircleHelp, ExternalLink, IndianRupee, LayoutDashboard, LayoutGrid, LogOut, Search, Users, UsersRound, type LucideIcon,
} from 'lucide-react'
import { initials } from '@/components/patient/format'
import { FloatingTabBar } from '@/components/FloatingTabBar'

type NavItem = { href: string; label: string; icon: LucideIcon }

const TABS: NavItem[] = [
  { href: '/hospital/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hospital/patients', label: 'Patients', icon: Users },
  { href: '/hospital/beds', label: 'Beds', icon: BedDouble },
  { href: '/hospital/doctors', label: 'Roster', icon: CalendarDays },
  { href: '/hospital/more', label: 'More', icon: LayoutGrid },
]

const MENU: NavItem[] = [
  { href: '/hospital/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hospital/patients', label: 'Patients', icon: Users },
  { href: '/hospital/beds', label: 'Beds', icon: BedDouble },
  { href: '/hospital/doctors', label: 'Doctors & roster', icon: CalendarDays },
  { href: '/hospital/revenue', label: 'Finance', icon: IndianRupee },
  { href: '/hospital/staff', label: 'Staff & access', icon: UsersRound },
  { href: '/hospital/profile', label: 'Hospital profile', icon: Building2 },
]

// Sections reached from More on phones.
const MORE = ['/hospital/more', '/hospital/profile', '/hospital/revenue', '/hospital/staff', '/hospital/ai']

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** The top bar's "where am I". */
function crumb(pathname: string): string[] {
  if (/^\/hospital\/doctors\/[^/]+\/schedule/.test(pathname)) return ['Doctors & roster', 'Slots']
  const item = MENU.find((m) => isActive(pathname, m.href))
  if (item) return [item.label]
  if (pathname.startsWith('/hospital/ai')) return ['Help & support']
  if (pathname.startsWith('/hospital/more')) return ['More']
  return ['Dashboard']
}

/**
 * The hospital navigation. Phones get the floating tab bar along the bottom (Dashboard, Patients, Beds, Roster, More);
 * desktops get the blue sidebar with the menu and the account, and a white top bar with the page's place, a search of
 * patients and bookings, and a bell that jumps to what needs attention.
 */
export function HospitalDock({ hospital, staff }: { hospital: { id: string; name: string }; staff: { name: string } }) {
  const pathname = usePathname() ?? '/hospital/dashboard'
  const parts = crumb(pathname)

  return (
    <>
      <FloatingTabBar
        label="Hospital navigation"
        tabs={TABS.map((t) => ({ ...t, active: t.href === '/hospital/more' ? MORE.some((m) => isActive(pathname, m)) : isActive(pathname, t.href) }))}
      />

      <aside
        aria-label="Hospital menu"
        className="hidden lg:flex fixed z-40 inset-y-0 left-0 w-[260px] flex-col gap-1 px-4 pt-[22px] pb-[18px] overflow-y-auto no-scrollbar bg-[#2A4DD0] text-white print:hidden"
      >
        <Link href="/hospital/dashboard" className="flex items-center gap-2.5 px-2 pb-[22px]">
          <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="30px" className="w-[30px] h-[30px] object-contain shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[18px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
            <span className="block text-[11.5px] text-[#CFDCFF]">Hospital workspace</span>
          </span>
        </Link>
        <span className="px-3.5 pb-1.5 text-[11px] font-extrabold tracking-[0.1em] text-[#AFC2FF]">MENU</span>
        {MENU.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <span className="flex-1 min-h-8" />
        <RailLink item={{ href: `/hospitals/${hospital.id}`, label: 'Patient page', icon: ExternalLink }} active={false} small />
        <RailLink item={{ href: '/hospital/ai', label: 'Help & support', icon: CircleHelp }} active={pathname.startsWith('/hospital/ai')} small />
        <div className="flex items-center gap-2.5 mt-3 p-3 rounded-[14px] border border-white/20">
          <Link href="/hospital/profile" className="flex flex-1 min-w-0 items-center gap-2.5">
            <span className="shrink-0 w-[38px] h-[38px] rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">{initials(staff.name)}</span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-extrabold truncate">{staff.name}</span>
              <span className="block text-[11.5px] text-[#CFDCFF] truncate">{hospital.name}</span>
            </span>
          </Link>
          <form action="/auth/signout" method="post" className="shrink-0">
            <button type="submit" aria-label="Log out" title="Log out" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          </form>
        </div>
      </aside>

      <header className="hidden lg:flex fixed z-30 top-0 left-[260px] right-0 h-[72px] items-center gap-5 px-9 bg-white border-b border-[#E6EAF0] print:hidden">
        <span className="shrink-0 text-[13.5px] font-bold text-[#5B667A]">
          Hospital
          {parts.map((p, i) => (
            <span key={p}>
              <span className="text-[#B7C1D1]"> / </span>
              {i === parts.length - 1 ? <strong className="text-[#0B1B3F]">{p}</strong> : p}
            </span>
          ))}
        </span>
        <span className="flex-1" />
        <form action="/hospital/patients" role="search" className="flex-[0_1_420px] flex items-center gap-2.5 h-[42px] px-3.5 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] transition-shadow">
          <Search className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
          <label htmlFor="hospital-top-search" className="sr-only">Search patient, doctor or booking ID</label>
          <input id="hospital-top-search" type="search" name="q" placeholder="Search patient, doctor or booking ID" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] text-[#0B1B3F] placeholder:text-[#7A8599]" />
          <input type="hidden" name="view" value="all" />
        </form>
        <Link
          href="/hospital/dashboard#attention"
          aria-label="Needs attention"
          title="Needs attention"
          className="shrink-0 w-[42px] h-[42px] rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center justify-center text-[#27324A] hover:bg-[#EEF2F8] transition-colors"
        >
          <Bell className="w-[19px] h-[19px]" />
        </Link>
      </header>
    </>
  )
}

function RailLink({ item: { href, label, icon: Icon }, active, small = false }: { item: NavItem; active: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-3.5 rounded-[11px] transition-colors ${small ? 'h-[42px] text-[13.5px]' : 'h-11 text-[14px]'} ${
        active ? 'bg-white text-[#2A4DD0] font-extrabold' : 'text-[#E3EAFF] font-bold hover:bg-white/10'
      }`}
    >
      <Icon className={small ? 'w-[18px] h-[18px]' : 'w-[19px] h-[19px]'} strokeWidth={small ? 2 : 2.1} />
      {label}
    </Link>
  )
}
