'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CalendarDays, CircleHelp, ExternalLink, LayoutGrid, LogOut, Search, UserRound, Users, type LucideIcon } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { FloatingTabBar } from '@/components/FloatingTabBar'

type NavItem = { href: string; label: string; icon: LucideIcon }

const MENU: NavItem[] = [
  { href: '/doctor/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/doctor/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/doctor/patients', label: 'Patients', icon: Users },
  { href: '/doctor/profile', label: 'Profile', icon: UserRound },
]

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** The top bar's "where am I". */
function crumb(pathname: string): string[] {
  if (/^\/doctor\/patients\/[^/]+/.test(pathname)) return ['Patients', 'Patient record']
  if (pathname.startsWith('/doctor/patients')) return ['Patients']
  if (pathname.startsWith('/doctor/schedule')) return ['Schedule']
  if (pathname.startsWith('/doctor/profile')) return ['Profile']
  if (pathname.startsWith('/doctor/ai')) return ['Help & support']
  return ['Dashboard']
}

/**
 * The doctor navigation. Phones get the floating tab bar along the bottom (pages with their own bottom bar, like a patient
 * record, leave it out); desktops get the blue sidebar with the menu and the account, and a white top bar with the
 * page's place, a patient search and the waiting room.
 */
export function DoctorDock({ doctor }: { doctor: { id: string; name: string; specialty: string | null; image: string | null } }) {
  const pathname = usePathname() ?? '/doctor/dashboard'
  const phoneBar = !/^\/doctor\/patients\/[^/]+/.test(pathname)
  const parts = crumb(pathname)

  return (
    <>
      {phoneBar && <FloatingTabBar label="Doctor navigation" tabs={MENU.map((m) => ({ ...m, active: isActive(pathname, m.href) }))} />}

      <aside
        aria-label="Doctor menu"
        className="hidden lg:flex fixed z-40 inset-y-0 left-0 w-[260px] flex-col gap-1 px-4 pt-[22px] pb-[18px] overflow-y-auto no-scrollbar bg-[#2A4DD0] text-white print:hidden"
      >
        <Link href="/doctor/dashboard" className="flex items-center gap-2.5 px-2 pb-[22px]">
          <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="30px" className="w-[30px] h-[30px] object-contain shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[18px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
            <span className="block text-[11.5px] text-[#CFDCFF]">Doctor workspace</span>
          </span>
        </Link>
        <span className="px-3.5 pb-1.5 text-[11px] font-extrabold tracking-[0.1em] text-[#AFC2FF]">MENU</span>
        {MENU.map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <span className="flex-1 min-h-8" />
        <RailLink item={{ href: `/doctors/${doctor.id}`, label: 'Public profile', icon: ExternalLink }} active={false} small />
        <RailLink item={{ href: '/doctor/ai', label: 'Help & support', icon: CircleHelp }} active={pathname.startsWith('/doctor/ai')} small />
        <div className="flex items-center gap-2.5 mt-3 p-3 rounded-[14px] border border-white/20">
          <Link href="/doctor/profile" className="flex flex-1 min-w-0 items-center gap-2.5">
            <span className="shrink-0 w-[38px] h-[38px] rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold overflow-hidden">
              {doctor.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.image} alt="" className="w-full h-full object-cover" />
              ) : (
                initials(doctor.name)
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-extrabold truncate">{doctor.name}</span>
              <span className="block text-[11.5px] text-[#CFDCFF] truncate">{doctor.specialty || 'Doctor'}</span>
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
          Doctor
          {parts.map((p, i) => (
            <span key={p}>
              <span className="text-[#B7C1D1]"> / </span>
              {i === parts.length - 1 ? <strong className="text-[#0B1B3F]">{p}</strong> : p}
            </span>
          ))}
        </span>
        <span className="flex-1" />
        <form action="/doctor/patients" role="search" className="flex-[0_1_420px] flex items-center gap-2.5 h-[42px] px-3.5 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] transition-shadow">
          <Search className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
          <label htmlFor="doctor-top-search" className="sr-only">Search patients by name or ID</label>
          <input id="doctor-top-search" type="search" name="q" placeholder="Search patients by name or ID" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] text-[#0B1B3F] placeholder:text-[#7A8599]" />
        </form>
        <Link
          href="/doctor/dashboard#waiting-room"
          aria-label="Waiting room"
          title="Waiting room"
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
