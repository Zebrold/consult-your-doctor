import type { Metadata } from 'next'
import Link from 'next/link'
import { Building, Building2, CalendarOff, ChartLine, ChevronRight, CircleHelp, Eye, FileText, IndianRupee, KeyRound, QrCode, ShieldCheck, ShoppingCart, Star, Tag, UsersRound, Wallet, type LucideIcon } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { requireHospital } from '../_lib/hospital'
import { DeskHead, HosBody, HosHeader, Row, btnOutline, card } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'More | Hospital Portal' }
export const dynamic = 'force-dynamic'

type Item = { href: string; title: string; sub: string; icon: LucideIcon }

const MANAGE: Item[] = [
  { href: '/hospital/profile', title: 'Hospital profile', sub: 'What patients see on your hospital page', icon: Building2 },
  { href: '/hospital/preview', title: 'Patient page preview', sub: 'Your hospital page as patients see it', icon: Eye },
  { href: '/hospital/revenue', title: 'Finance & revenue', sub: 'Collections and the payments ledger', icon: IndianRupee },
  { href: '/hospital/wallet', title: 'Payouts', sub: 'Your balance, withdrawals and payout accounts', icon: Wallet },
  { href: '/hospital/staff', title: 'Staff & access', sub: 'Doctors, front desk and admins', icon: UsersRound },
  { href: '/hospital/settings/services', title: 'Services & charges', sub: 'Tests, scans and procedures patients can add, with prices', icon: Tag },
  { href: '/hospital/walk-in', title: 'Walk-in & QR', sub: 'Walk-in hours, and the QR code patients scan to book', icon: QrCode },
]

const GROW: Item[] = [
  { href: '/hospital/branches', title: 'Accounts & branches', sub: 'Your branches under one login, and switching between them', icon: Building },
  { href: '/hospital/badges', title: 'Verified badges', sub: 'Blue ticks for your hospital and doctors', icon: ShieldCheck },
  { href: '/hospital/equipment', title: 'Order equipment', sub: 'Devices, supplies and furniture, delivered', icon: ShoppingCart },
  { href: '/hospital/doctors/leave', title: 'Leave requests', sub: 'Approve doctors’ leave and move booked patients', icon: CalendarOff },
  { href: '/hospital/reviews', title: 'Reviews', sub: 'What patients say about the hospital and your doctors', icon: Star },
  { href: '/hospital/reports', title: 'Reports', sub: 'Bookings, new patients, no-shows and downloads', icon: ChartLine },
]

const ACCOUNT: Item[] = [
  { href: '/hospital/settings/account', title: 'Login details', sub: 'Your name, mobile number, Staff ID and password', icon: KeyRound },
  { href: '/legal', title: 'Legal documents', sub: 'Terms, privacy and our policies', icon: FileText },
  { href: '/hospital/ai', title: 'Help & support', sub: 'Talk to the Consult your Doctor team', icon: CircleHelp },
]

function Menu({ items }: { items: Item[] }) {
  return (
    <section className={`${card} overflow-hidden`}>
      {items.map((m, i) => (
        <Link key={m.href} href={m.href} className={`flex items-center gap-3 px-4 py-3.5 active:bg-[#F4F6FA] hover:bg-[#F7F9FC] ${i ? 'border-t border-[#EEF2F7]' : ''}`}>
          <span className="flex-1 min-w-0">
            <span className="block text-[14.5px] font-extrabold">{m.title}</span>
            <span className="block text-[12px] text-[#5B667A]">{m.sub}</span>
          </span>
          <ChevronRight className="w-[18px] h-[18px] text-[#8A94A6] shrink-0" />
        </Link>
      ))}
    </section>
  )
}

/** The desktop tiles: two to a row, with the section label above. */
function Tiles({ label, items }: { label: string; items: Item[] }) {
  return (
    <div>
      <p className="mb-2.5 text-[12px] font-extrabold tracking-[0.06em] text-[#5B667A]">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((m) => (
          <Link key={m.href} href={m.href} className={`${card} flex items-center gap-3 p-4 !rounded-[14px] hover:bg-[#F7F9FC]`}>
            <span className="w-[42px] h-[42px] rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center shrink-0">
              <m.icon className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14.5px] font-extrabold">{m.title}</span>
              <span className="block text-[12.5px] text-[#5B667A]">{m.sub}</span>
            </span>
            <ChevronRight className="w-[18px] h-[18px] text-[#8A94A6] shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

/** The phone's More tab after the HosMore export: the account, the sections without a tab, and logging out. */
export default async function HospitalMorePage() {
  const { admin, user, hospital, staff } = await requireHospital()
  const { data: me } = await admin.from('profiles').select('staff_id').eq('id', user.id).maybeSingle()
  const place = [hospital.name, hospital.city].filter(Boolean).join(', ')

  return (
    <>
      <HosHeader
        staff={staff}
        title={staff.name}
        avatar={<span className="w-14 h-14 rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[18px] font-extrabold shrink-0">{initials(staff.name)}</span>}
        subtitle={
          <>
            <span className="block">{['Hospital admin', me?.staff_id].filter(Boolean).join(' · ')}</span>
            <span className="block">{place}</span>
          </>
        }
      />
      <HosBody>
        <DeskHead title="Account &amp; settings" subtitle="Your account, hospital settings and support" />

        {/* Phones */}
        <div className="lg:hidden">
          <p className="mt-1.5 mb-3.5 mx-1 text-[12px] font-extrabold tracking-[0.04em] text-[#5B667A]">MANAGE</p>
          <Menu items={MANAGE} />
          <p className="mt-5 mb-3.5 mx-1 text-[12px] font-extrabold tracking-[0.04em] text-[#5B667A]">GROW &amp; MANAGE</p>
          <Menu items={GROW} />
          <p className="mt-5 mb-3.5 mx-1 text-[12px] font-extrabold tracking-[0.04em] text-[#5B667A]">ACCOUNT</p>
          <Menu items={ACCOUNT} />
          <form action="/auth/signout" method="post" className={`${card} mt-3.5`}>
            <button type="submit" className="w-full text-left p-4 text-[14.5px] font-extrabold text-[#B42318]">
              Log out
            </button>
          </form>
        </div>

        {/* Desktops: the account beside the tiles */}
        <div className="hidden lg:grid grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
          <section className={`${card} px-[22px] py-7 text-center`}>
            <span className="mx-auto w-[76px] h-[76px] rounded-full bg-[#2A4DD0] text-white flex items-center justify-center text-[24px] font-extrabold">{initials(staff.name)}</span>
            <p className="mt-3.5 text-[20px] font-extrabold">{staff.name}</p>
            <p className="mt-1 text-[13.5px] text-[#5B667A]">{['Hospital admin', me?.staff_id].filter(Boolean).join(' · ')}</p>
            <p className="text-[13.5px] text-[#5B667A]">{place}</p>
            <div className="mt-4 text-left">
              <Row label="Sign-in">Staff ID or work email + password</Row>
            </div>
            <Link href="/hospital/settings/account" className={`${btnOutline} w-full mt-4`}>
              Change password
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="mt-3 text-[14px] font-extrabold text-[#B42318]">
                Log out
              </button>
            </form>
          </section>
          <div className="flex flex-col gap-[22px] min-w-0">
            <Tiles label="MANAGE" items={MANAGE} />
            <Tiles label="GROW & MANAGE" items={GROW} />
            <Tiles label="ACCOUNT" items={ACCOUNT} />
          </div>
        </div>
      </HosBody>
    </>
  )
}
