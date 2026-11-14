import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { istDateKey } from '@/components/patient/format'
import { accessibleHospitals, branchPeople } from '@/lib/branches'
import { displayOrgCode } from '@/lib/organization-ids'
import { requireHospital } from '../_lib/hospital'
import { BranchCards, BranchPeople, type BranchCard } from '../_components/BranchesBoard'
import { DeskHead, HosBackHeader, HosBody, Panel, PanelHead, Row, btnOutline, btnPrimary } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Accounts & branches | Hospital Portal' }
export const dynamic = 'force-dynamic'

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`

/**
 * Accounts & branches, after the DeskHosAccounts export: every hospital this login can switch between, with its
 * doctors, beds and this month's bookings; branches asked for and waiting for the team; who can reach which branch;
 * and how money works across branches (each branch has its own payouts).
 */
export default async function HospitalBranchesPage() {
  const { admin, user, hospital } = await requireHospital()
  const { ready, ids } = await accessibleHospitals(admin, user.id, hospital.id)
  const monthStart = new Date(`${istDateKey(currentTime()).slice(0, 7)}-01T00:00:00+05:30`).toISOString()

  const [{ data: hospitals }, { data: doctors }, { data: beds }, { data: pending }, people] = await Promise.all([
    admin.from('hospitals').select('*').in('id', ids),
    admin.from('doctors').select('id, hospital_id').in('hospital_id', ids).limit(5000),
    admin.from('hospital_beds').select('hospital_id').in('hospital_id', ids).limit(20000),
    ready
      ? admin.from('partner_applications').select('id, organization_name, city, address, created_at').eq('kind', 'hospital').eq('status', 'pending').eq('details->branchOf->>requestedBy', user.id)
      : Promise.resolve({ data: [] }),
    ready ? branchPeople(admin, ids) : Promise.resolve([]),
  ])
  const doctorRows = (doctors ?? []) as { id: string; hospital_id: string }[]
  const doctorHospital = new Map(doctorRows.map((d) => [d.id, d.hospital_id]))
  const { data: bookings } = doctorRows.length
    ? await admin.from('appointments').select('doctor_id').in('doctor_id', doctorRows.map((d) => d.id)).gte('created_at', monthStart).not('status', 'in', '(cancelled,pending_payment)').limit(50000)
    : { data: [] }
  const count = <T,>(rows: T[] | null, key: (r: T) => string | null | undefined, id: string) => (rows ?? []).filter((r) => key(r) === id).length

  type H = { id: string; name: string | null; city: string | null; address: string | null; status: string | null; hospital_code?: string | null }
  const byId = new Map(((hospitals ?? []) as H[]).map((h) => [h.id, h]))
  const cards: BranchCard[] = ids
    .map((id) => byId.get(id))
    .filter((h): h is H => !!h)
    .map((h) => {
      const bedCount = count(beds as { hospital_id: string }[] | null, (r) => r.hospital_id, h.id)
      const docCount = count(doctorRows, (r) => r.hospital_id, h.id)
      const booked = count(bookings as { doctor_id: string }[] | null, (r) => doctorHospital.get(r.doctor_id), h.id)
      return {
        id: h.id,
        name: h.name || 'Hospital',
        place: h.address || h.city || '',
        code: displayOrgCode(h.hospital_code ?? null, h.id, 'CYD-HOS'),
        facts: [bedCount ? plural(bedCount, 'bed') : 'No beds added', plural(docCount, 'doctor')].join(' · '),
        bookings: `${plural(booked, 'booking')} this month`,
        status: h.status === 'active' ? 'Live' : 'Not listed yet',
        live: h.status === 'active',
        current: h.id === hospital.id,
      }
    })
  const waiting = ((pending ?? []) as { id: string; organization_name: string; city: string; address: string | null }[]).map((p) => ({
    id: p.id,
    name: p.organization_name,
    place: p.address || p.city,
  }))
  const names = Object.fromEntries(cards.map((c) => [c.id, `${c.name}${c.place ? `, ${c.place.split(',')[0]}` : ''}`]))
  const subtitle = cards.length > 1 ? `Every ${hospital.name} branch on Consult your Doctor, managed from one login` : 'Your hospital and its branches on Consult your Doctor, managed from one login'
  const addBranch = (
    <Link href="/hospital/branches/new" className={btnPrimary}>
      <Plus className="w-4 h-4" strokeWidth={2.6} />
      Add a branch
    </Link>
  )

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Accounts & branches">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </HosBackHeader>
      <HosBody>
        <DeskHead title="Accounts & branches" subtitle={subtitle} actions={addBranch} />
        {!ready && (
          <p className="mb-4 p-3.5 rounded-[14px] bg-[#FFF6E8] text-[13px] text-[#7A2E0E]">
            Branches are being set up. Until then you see the hospital you’re signed in to, and new branches can’t be added yet.
          </p>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 mb-4 px-4 lg:px-[18px] py-3.5 rounded-[14px] bg-white shadow-[0_0_0_1px_#E6EAF0]">
          <span className="text-[13.5px] text-[#5B667A]">You are signed in to</span>
          <strong className="text-[14.5px]">{names[hospital.id] ?? hospital.name}</strong>
          <span className="flex-1" />
          <span className="text-[12.5px] text-[#5B667A]">Switching keeps you signed in. Bookings, beds and finance change to that branch.</span>
        </div>

        <BranchCards cards={cards} waiting={waiting} canAdd={ready} />
        <div className="lg:hidden mt-3.5">{ready && addBranch}</div>

        <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-2 mt-3.5 lg:mt-5 items-start">
          <Panel>
            <PanelHead title="Who can reach which branch" sub="Hospital admins in your branches. Tick a branch to let them switch to it." />
            {ready ? <BranchPeople people={people} branches={cards.map((c) => ({ id: c.id, name: names[c.id] }))} me={user.id} /> : <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">Available once branches are set up.</p>}
          </Panel>
          <Panel>
            <PanelHead title="Billing and payouts" sub="How money is handled across branches" />
            <Row label="Payouts">Separate for each branch</Row>
            <Row label="Payout account">Set on each branch’s Payouts page</Row>
            <Row label="Booking fees and desk payments">Recorded under the branch that took them</Row>
            <Row label="Verified badges">Bought by each branch</Row>
            <Link href="/hospital/wallet" className={`${btnOutline} lg:border mt-4`}>
              Open payouts
            </Link>
          </Panel>
        </div>
      </HosBody>
    </>
  )
}
