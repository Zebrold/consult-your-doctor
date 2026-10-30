import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { requireHospital } from '../_lib/hospital'
import { HosBody, HosHeader, card } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'More | Hospital Portal' }
export const dynamic = 'force-dynamic'

const MANAGE = [
  { href: '/hospital/profile', title: 'Hospital profile', sub: 'What patients see on your hospital page' },
  { href: '/hospital/revenue', title: 'Finance & revenue', sub: 'Collections and the payments ledger' },
  { href: '/hospital/staff', title: 'Staff & access', sub: 'Doctors, front desk and admins' },
  { href: '/hospital/profile#tests', title: 'Test charges', sub: 'Prices for tests at your hospital' },
]

const ACCOUNT = [
  { href: '/hospital/profile#account', title: 'Login details', sub: 'Your name, mobile number and password' },
  { href: '/legal', title: 'Legal documents', sub: 'Terms, privacy and our policies' },
  { href: '/hospital/ai', title: 'Help & support', sub: 'Talk to the Consult your Doctor team' },
]

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
      <HosBody className="lg:max-w-[720px]">
        <h1 className="hidden lg:block mb-4 text-[26px] font-extrabold tracking-[-0.02em]">More</h1>
        <p className="mt-1.5 mb-3.5 mx-1 text-[12px] font-extrabold tracking-[0.04em] text-[#5B667A]">MANAGE</p>
        <Menu items={MANAGE} />
        <p className="mt-5 mb-3.5 mx-1 text-[12px] font-extrabold tracking-[0.04em] text-[#5B667A]">ACCOUNT</p>
        <Menu items={ACCOUNT} />
        <form action="/auth/signout" method="post" className={`${card} mt-3.5`}>
          <button type="submit" className="w-full text-left p-4 text-[14.5px] font-extrabold text-[#B42318]">
            Log out
          </button>
        </form>
      </HosBody>
    </>
  )
}
