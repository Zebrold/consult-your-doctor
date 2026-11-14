import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { requireExecutive } from '../_lib/ops'
import { WorkBody, WorkHeader, card } from '../_components/ui'
import { TEAM_LABEL, canOpen, pageForPath, type Access } from '../_lib/access'

export const metadata: Metadata = { title: 'More' }

const MENU = [
  { href: '/executive/wallets', title: 'Wallets', sub: 'Hospital balances and withdrawals to pay' },
  { href: '/executive/hospitals', title: 'Hospitals', sub: 'Applications, logins and who is live' },
  { href: '/executive/doctors', title: 'Doctors', sub: 'Doctor applications and the roster' },
  { href: '/executive/diagnostics', title: 'Diagnostics', sub: 'Partner labs and lab bookings to follow up' },
  { href: '/executive/patients', title: 'Patients', sub: 'Stalled bookings and the patient directory' },
  { href: '/executive/revenue', title: 'Revenue', sub: 'By month, by source and by partner' },
  { href: '/executive/ai', title: 'Zebrold AI', sub: 'Ask about bookings, payments and partners' },
]

const GROW = [
  { href: '/executive/badges', title: 'Verified badges', sub: 'Paid badges to check, and the ones showing now' },
  { href: '/executive/equipment', title: 'Equipment orders', sub: 'Hospitals’ orders and the catalogue' },
  { href: '/executive/reviews', title: 'Review moderation', sub: 'Reviews that need a look' },
  { href: '/executive/branches', title: 'Branches & practices', sub: 'Branch requests and hospital groups' },
  { href: '/executive/leave', title: 'Doctor leave', sub: 'Leave and the patients to rebook' },
  { href: '/executive/reports', title: 'Reports', sub: 'How the platform is doing, and downloads' },
]

const ADMIN = [
  { href: '/executive/staff', title: 'Staff & access', sub: 'Your team and their last sign-in' },
  { href: '/executive/policies', title: 'Policies & templates', sub: 'The policy set and signing templates' },
  { href: '/legal', title: 'Legal documents', sub: 'Terms, privacy and our published policies' },
]

const openable = (access: Access, href: string) => {
  const key = pageForPath(href)
  return !key || canOpen(access, key)
}

function Menu({ items }: { items: { href: string; title: string; sub: string }[] }) {
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

const label = 'mt-5 mb-3.5 mx-1 text-[12px] font-extrabold tracking-[0.04em] text-[#5B667A]'

/** The phone's More tab, and Settings on desktops: the account, every section without a tab, and logging out. */
export default async function ExecutiveMorePage() {
  const { admin, user, profile, access } = await requireExecutive()
  const open = (items: { href: string; title: string; sub: string }[]) => items.filter((m) => openable(access, m.href))
  const role = access.ready ? `Executive · ${TEAM_LABEL[access.team]}` : 'Executive'
  const { data: me } = await admin.from('profiles').select('staff_id').eq('id', user.id).maybeSingle()

  return (
    <>
      <WorkHeader
        brand={{ home: '/executive/dashboard', workspace: 'Executive workspace', account: { href: '/executive/more', label: 'Account and more', name: profile.fullName, image: null } }}
        title={profile.fullName}
        avatar={<span className="w-14 h-14 rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[18px] font-extrabold shrink-0">{initials(profile.fullName)}</span>}
        subtitle={
          <>
            <span className="block">{[role, me?.staff_id].filter(Boolean).join(' · ')}</span>
            {profile.hospitalName && <span className="block">{profile.hospitalName}</span>}
          </>
        }
      />
      <WorkBody className="lg:max-w-[720px]">
        <h1 className="hidden lg:block mb-1 text-[26px] font-extrabold tracking-[-0.02em]">Account &amp; settings</h1>
        <p className="hidden lg:block mb-2 text-[14px] text-[#5B667A]">
          {[role, me?.staff_id, profile.hospitalName].filter(Boolean).join(' · ')}
        </p>
        <p className={`${label} lg:hidden !mt-1.5`}>MENU</p>
        <div className="lg:hidden">
          <Menu items={open(MENU)} />
        </div>
        <p className={label}>GROW &amp; MANAGE</p>
        <Menu items={open(GROW)} />
        <p className={label}>ADMIN</p>
        <Menu items={open(ADMIN)} />
        <form action="/auth/signout" method="post" className={`${card} mt-3.5`}>
          <button type="submit" className="w-full text-left p-4 text-[14.5px] font-extrabold text-[#B42318]">
            Log out
          </button>
        </form>
      </WorkBody>
    </>
  )
}
