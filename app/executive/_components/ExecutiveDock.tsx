'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BadgeCheck, Bell, Building, Building2, CalendarCheck, CalendarOff, ChartLine, CircleHelp, CreditCard, FlaskConical, Headset, IndianRupee, LayoutDashboard, LayoutGrid, LogOut, Search, Settings, ShoppingCart, Sparkles, Star, Stethoscope, Users, UsersRound, Wallet, type LucideIcon,
} from 'lucide-react'
import { initials } from '@/components/patient/format'
import { FloatingTabBar } from '@/components/FloatingTabBar'
import { canOpen, pageForPath, type Access } from '../_lib/access'

type NavItem = { href: string; label: string; icon: LucideIcon }

const TABS: NavItem[] = [
  { href: '/executive/dashboard', label: 'Command', icon: LayoutDashboard },
  { href: '/executive/payments', label: 'Payments', icon: CreditCard },
  { href: '/executive/support', label: 'Support', icon: Headset },
  { href: '/executive/today', label: 'Check-ins', icon: CalendarCheck },
  { href: '/executive/more', label: 'More', icon: LayoutGrid },
]

const MENU: NavItem[] = [
  { href: '/executive/dashboard', label: 'Command', icon: LayoutDashboard },
  { href: '/executive/payments', label: 'Payments', icon: CreditCard },
  { href: '/executive/wallets', label: 'Wallets', icon: Wallet },
  { href: '/executive/support', label: 'Support', icon: Headset },
  { href: '/executive/hospitals', label: 'Hospitals', icon: Building2 },
  { href: '/executive/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/executive/diagnostics', label: 'Diagnostics', icon: FlaskConical },
  { href: '/executive/patients', label: 'Patients', icon: Users },
  { href: '/executive/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/executive/today', label: 'Check-ins', icon: CalendarCheck },
  { href: '/executive/ai', label: 'Zebrold AI', icon: Sparkles },
]

const GROW: NavItem[] = [
  { href: '/executive/badges', label: 'Verified badges', icon: BadgeCheck },
  { href: '/executive/equipment', label: 'Equipment orders', icon: ShoppingCart },
  { href: '/executive/reviews', label: 'Review moderation', icon: Star },
  { href: '/executive/branches', label: 'Branches & practices', icon: Building },
  { href: '/executive/leave', label: 'Doctor leave', icon: CalendarOff },
  { href: '/executive/reports', label: 'Reports', icon: ChartLine },
]

const ADMIN: NavItem[] = [{ href: '/executive/staff', label: 'Staff & access', icon: UsersRound }]

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)
// Account & settings (/executive/more, also the desktop's Settings) and the policies under it.
const isSettings = (pathname: string) => isActive(pathname, '/executive/more') || isActive(pathname, '/executive/policies')

/** The top bar's "where am I". */
function crumb(pathname: string): string[] {
  if (pathname.startsWith('/executive/dashboard/walk-in')) return ['Command', 'Walk-in booking']
  if (pathname.startsWith('/executive/policies')) return ['Settings', 'Policies & templates']
  const item = [...MENU, ...GROW, ...ADMIN].find((m) => isActive(pathname, m.href))
  if (item) return [item.label]
  if (isSettings(pathname)) return ['Settings']
  return ['Command']
}

/**
 * The executive navigation, after the DeskExe* exports. Desktops get the blue sidebar (Menu, Grow & manage, Admin,
 * then Settings, Help & support and the account) and a white top bar with the page's place, a search of payments
 * by transaction, patient, hospital or booking ID, and a bell that jumps to what needs attention. Phones get the
 * floating tab bar (Command, Payments, Support, Check-ins, More).
 */
export function ExecutiveDock({ person, access }: { person: { name: string; team: string }; access: Access }) {
  const pathname = usePathname() ?? '/executive/dashboard'
  // Only the pages this executive's team may open (Staff & access sets them).
  const allowed = (item: NavItem) => {
    const key = pageForPath(item.href)
    return !key || canOpen(access, key)
  }
  const parts = crumb(pathname)
  const onTab = TABS.slice(0, -1).some((t) => isActive(pathname, t.href))

  return (
    <>
      <FloatingTabBar label="Executive navigation" tabs={TABS.filter(allowed).map((t) => ({ ...t, active: t.href === '/executive/more' ? !onTab : isActive(pathname, t.href) }))} />

      <aside
        aria-label="Executive menu"
        className="hidden lg:flex fixed z-40 inset-y-0 left-0 w-[260px] flex-col gap-1 px-4 pt-[22px] pb-[18px] overflow-y-auto no-scrollbar bg-[#2A4DD0] text-white print:hidden"
      >
        <Link href="/executive/dashboard" className="shrink-0 flex items-center gap-2.5 px-2 pb-[22px]">
          <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="30px" className="w-[30px] h-[30px] object-contain shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[18px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
            <span className="block text-[11.5px] text-[#CFDCFF]">Executive workspace</span>
          </span>
        </Link>
        <RailLabel first>MENU</RailLabel>
        {MENU.filter(allowed).map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <RailLabel>GROW &amp; MANAGE</RailLabel>
        {GROW.filter(allowed).map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        {ADMIN.some(allowed) && <RailLabel>ADMIN</RailLabel>}
        {ADMIN.filter(allowed).map((item) => (
          <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <span className="flex-1 min-h-8" />
        <RailLink item={{ href: '/executive/more', label: 'Settings', icon: Settings }} active={isSettings(pathname)} small />
        {canOpen(access, 'ai') && <RailLink item={{ href: '/executive/ai', label: 'Help & support', icon: CircleHelp }} active={false} small />}
        <div className="shrink-0 flex items-center gap-2.5 mt-3 p-3 rounded-[14px] border border-white/20">
          <Link href="/executive/more" className="flex flex-1 min-w-0 items-center gap-2.5">
            <span className="shrink-0 w-[38px] h-[38px] rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">{initials(person.name)}</span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-extrabold truncate">{person.name}</span>
              <span className="block text-[11.5px] text-[#CFDCFF] truncate">{person.team}</span>
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
          Executive
          {parts.map((p, i) => (
            <span key={p}>
              <span className="text-[#B7C1D1]"> / </span>
              {i === parts.length - 1 ? <strong className="text-[#0B1B3F]">{p}</strong> : p}
            </span>
          ))}
        </span>
        <span className="flex-1" />
        <form action="/executive/payments" role="search" className="flex-[0_1_420px] flex items-center gap-2.5 h-[42px] px-3.5 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] transition-shadow">
          <Search className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
          <label htmlFor="executive-top-search" className="sr-only">Search bookings, patients, hospitals or IDs</label>
          <input id="executive-top-search" type="search" name="q" placeholder="Search bookings, patients, hospitals or IDs" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] text-[#0B1B3F] placeholder:text-[#7A8599]" />
        </form>
        <Link
          href="/executive/dashboard#attention"
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

function RailLabel({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return <span className={`shrink-0 px-3.5 ${first ? '' : 'pt-[18px]'} pb-1.5 text-[11px] font-extrabold tracking-[0.1em] text-[#AFC2FF]`}>{children}</span>
}

function RailLink({ item: { href, label, icon: Icon }, active, small = false }: { item: NavItem; active: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`shrink-0 flex items-center gap-3 px-3.5 rounded-[11px] transition-colors ${small ? 'h-[42px] text-[13.5px]' : 'h-11 text-[14px]'} ${
        active ? 'bg-white text-[#2A4DD0] font-extrabold' : 'text-[#E3EAFF] font-bold hover:bg-white/10'
      }`}
    >
      <Icon className={small ? 'w-[18px] h-[18px]' : 'w-[19px] h-[19px]'} strokeWidth={small ? 2 : 2.1} />
      {label}
    </Link>
  )
}
