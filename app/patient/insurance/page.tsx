import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { AccountPage } from '@/components/patient/AccountPage'
import { card } from '@/components/patient/app-ui'
import { firstName, formatINR } from '@/components/patient/format'
import { AddPolicyButton, CashlessNearby, ClaimsList, PolicyCard, PolicyDetailsButton, StartClaim, type CashlessHospital, type Claim } from '@/components/patient/health/insurance'
import { istToday, patientAccount } from '@/lib/patient-account'
import { loadFamily, missingTable } from '@/lib/patient-health'
import { knownInsurers, loadInsurance, PLAN_LABEL } from '@/lib/insurance'
import { RECORD_BUCKET } from '@/lib/records'
import { toLatLng } from '@/lib/geo'

export const metadata: Metadata = { title: 'Insurance' }

type ClaimRow = {
  id: string
  claim_type: Claim['type']
  claim_number: string | null
  hospital_name: string
  treated_on: string | null
  amount: number | string | null
  status: Claim['status']
  settled_amount: number | string | null
  documents: { name?: string; path?: string }[] | null
  created_at: string
}

type HospitalRow = { id: string; name: string | null; city: string | null; insurance_accepted?: string[] | null; latitude?: number | null; longitude?: number | null }

const insurerKey = (s: string) => s.toLowerCase().replace(/\b(general|health|insurance|company|co|ltd|limited)\b|[^a-z]/g, '')
const num = (v: number | string | null) => (v == null || v === '' ? null : Number(v))

/** Insurance: the policy card, its cover, the patient's own claim tracker and the hospitals that accept the insurer. */
export default async function InsurancePage() {
  const { user, admin, profile, name } = await patientAccount('/patient/insurance')
  const [{ ready, policy }, insurers, family, claimsRes, { data: hospitalRows }] = await Promise.all([
    loadInsurance(admin, user.id),
    knownInsurers(admin),
    loadFamily(admin, user.id),
    admin.from('insurance_claims').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }),
    admin.from('hospitals').select('*').eq('status', 'active'),
  ])
  const claimsReady = !missingTable(claimsRes.error)
  const claimRows = (claimsRes.data ?? []) as ClaimRow[]

  // Claim documents are private: short-lived signed links for this patient's own files.
  const paths = claimRows.flatMap((c) => (c.documents ?? []).map((d) => d.path).filter((p): p is string => !!p))
  const signed: Record<string, string> = {}
  if (paths.length) {
    const { data } = await admin.storage.from(RECORD_BUCKET).createSignedUrls(paths, 60 * 60)
    for (const d of data ?? []) if (d.path && d.signedUrl && !d.error) signed[d.path] = d.signedUrl
  }
  const claims: Claim[] = claimRows.map((c) => ({
    id: c.id,
    number: c.claim_number,
    type: c.claim_type,
    hospital: c.hospital_name,
    treatedOn: c.treated_on,
    createdAt: c.created_at,
    amount: num(c.amount),
    settled: num(c.settled_amount),
    status: c.status,
    documents: (c.documents ?? []).map((d) => ({ name: d.name || 'Document', url: d.path ? signed[d.path] ?? null : null })),
  }))

  const members = family.members.map((m) => ({ id: m.id, name: m.name }))
  const covered = policy ? family.members.filter((m) => policy.coveredMemberIds.includes(m.id)) : []
  const insuredLine = [firstName(name) || name, ...covered.map((m) => firstName(m.name) || m.name)].join(', ')
  const settledTotal = claims.filter((c) => c.status === 'settled').reduce((s, c) => s + (c.settled ?? c.amount ?? 0), 0)

  const cashless: CashlessHospital[] = policy
    ? ((hospitalRows ?? []) as HospitalRow[])
        .filter((h) => (h.insurance_accepted ?? []).some((i) => insurerKey(i) && insurerKey(i) === insurerKey(policy.insurer)))
        .map((h) => {
          const pin = toLatLng(h.latitude, h.longitude)
          return { id: h.id, name: h.name || 'Hospital', city: h.city, lat: pin?.lat ?? null, lng: pin?.lng ?? null }
        })
    : []

  const detailRows: [string, string | null][] = policy
    ? [
        ['Plan', policy.planType ? PLAN_LABEL[policy.planType] : null],
        ['Room rent', policy.roomRent],
        ['Co-payment', policy.coPayment],
        ['Members', insuredLine],
        ['TPA', policy.tpaName],
        ['TPA helpline', policy.tpaPhone],
      ]
    : []

  const hasSum = policy?.sumInsured != null && policy.sumInsured > 0
  // On phones the design lists these as rows instead of tiles.
  const phoneRows: [string, string | null][] = policy
    ? [
        ['Sum insured', policy.sumInsured != null ? formatINR(policy.sumInsured) : null],
        ['Settled claims', formatINR(settledTotal)],
        ['Left', policy.sumInsured != null ? formatINR(Math.max(0, policy.sumInsured - settledTotal)) : null],
      ]
    : []

  return (
    <AccountPage
      user={user}
      profile={profile}
      wide
      title="Insurance"
      subtitle="Your policy, the hospitals that accept it and your claims in one place"
      phoneSubtitle={policy ? `${policy.insurer} · ${policy.policyNumber}` : 'Keep your policy and claims in one place.'}
    >
      {!policy ? (
        <section className={`${card} p-5 lg:p-7 text-center`}>
          <span className="inline-flex w-12 h-12 rounded-full bg-[#EEF3FF] text-[#2A4DD0] items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <p className="mt-2.5 text-[16px] font-extrabold">Add your health insurance</p>
          <p className="mt-1 max-w-md mx-auto text-[13px] leading-relaxed text-[#5B667A]">Keep it as a digital card to show at the hospital desk. The hospitals you book see it on their patient list.</p>
          <AddPolicyButton patientName={name} insurers={insurers} ready={ready} className="mt-4" />
          {!ready && <p className="mt-2.5 text-[12px] font-bold text-[#B54708]">Insurance details open up after the next update.</p>}
        </section>
      ) : (
        <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[420px_minmax(0,1fr)] items-start">
          <div className="flex flex-col gap-3.5 lg:self-stretch">
            <PolicyCard policy={policy} members={insuredLine} patientName={name} insurers={insurers} today={istToday()} />
            <div className="hidden lg:block flex-1 rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0] p-[18px]">
              <p className="text-[14.5px] font-extrabold">Planned hospital stay?</p>
              <p className="mt-0.5 text-[12.5px] leading-normal text-[#4A5878]">Ask the hospital&apos;s insurance desk to request cashless approval from your insurer a few days before admission. In an emergency they request it after you are admitted.</p>
            </div>
          </div>
          <section className={`${card} p-4 lg:p-[22px]`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[16px] font-extrabold">Coverage</h2>
                <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">As you entered it from your policy document</p>
              </div>
              <PolicyDetailsButton policy={policy} members={members} ready={policy.extended} />
            </div>
            {hasSum && (
              <div className="mt-3 lg:hidden flex items-baseline justify-between gap-3 text-[13px] font-bold">
                <span className="font-extrabold">{formatINR(settledTotal)} used</span>
                <span className="text-[#5B667A]">of {formatINR(policy.sumInsured!)}</span>
              </div>
            )}
            <div className="mt-3 hidden lg:grid grid-cols-3 gap-2.5">
              <Stat label="Sum insured" value={policy.sumInsured != null ? formatINR(policy.sumInsured) : '–'} />
              <Stat label="Settled claims" value={formatINR(settledTotal)} />
              <Stat label="Left" value={policy.sumInsured != null ? formatINR(Math.max(0, policy.sumInsured - settledTotal)) : '–'} blue />
            </div>
            {hasSum && (
              <>
                <span className="block mt-2 lg:mt-3.5 h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
                  <span className="block h-full rounded-full bg-[#2A4DD0]" style={{ width: `${Math.min(100, (settledTotal / policy.sumInsured!) * 100)}%` }} />
                </span>
                <p className="mt-1.5 text-[12px] text-[#5B667A]">{Math.round((settledTotal / policy.sumInsured!) * 100)}% of your cover used, from the settled claims you track here</p>
              </>
            )}
            <div className="mt-3 lg:grid lg:grid-cols-3 lg:gap-x-6">
              {[...phoneRows, ...detailRows].map(([label, value], i) => (
                <div key={label} className={`flex justify-between gap-3 py-2.5 border-t border-[#EEF2F7] text-[13px] lg:block lg:py-3 ${i < phoneRows.length ? 'lg:hidden' : ''}`}>
                  <span className="text-[#5B667A] lg:block lg:text-[12px] lg:font-bold">{label}</span>
                  <span className={`text-right font-extrabold lg:block lg:text-left lg:mt-0.5 lg:text-[14px] ${value ? '' : 'text-[#8A94A6] font-bold'}`}>{value ?? 'Not added'}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <ClaimsList claims={claims} ready={claimsReady} />

      <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-3 items-start">
        <StartClaim ready={claimsReady} tpa={policy?.tpaName ?? null} />
        {policy ? (
          <CashlessNearby hospitals={cashless} insurer={policy.insurer} />
        ) : (
          <section className={`${card} p-4 lg:p-[22px]`}>
            <h2 className="text-[16px] font-extrabold">Hospitals that accept your insurer</h2>
            <p className="mt-1 text-[13px] text-[#5B667A]">Add your policy to see the partner hospitals that list your insurer.</p>
            <Link href="/hospitals" className="inline-block mt-2.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">Browse hospitals</Link>
          </section>
        )}
        <section className={`${card} p-4 lg:p-[22px]`}>
          <h2 className="text-[16px] font-extrabold">What to check in your policy</h2>
          <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed text-[#27324A]">
            <li><strong>Hospital stays</strong> over 24 hours: room, ICU, surgery and medicines, up to your room rent limit.</li>
            <li><strong>Day-care procedures</strong> such as cataract surgery and dialysis.</li>
            <li><strong>Before and after</strong> a stay: how many days of tests and medicines are covered.</li>
            <li><strong>Waiting periods</strong> for illnesses you already had when you bought the policy.</li>
          </ul>
          <p className="mt-2.5 text-[12px] text-[#5B667A]">Many policies don&apos;t cover regular OPD consultations. Your policy document has the exact terms.</p>
        </section>
      </div>
    </AccountPage>
  )
}

function Stat({ label, value, blue }: { label: string; value: string; blue?: boolean }) {
  return (
    <span className="rounded-[14px] bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0] px-[18px] py-4 min-w-0">
      <span className="block text-[12.5px] font-bold text-[#5B667A] truncate">{label}</span>
      <span className={`block mt-1 text-[24px] font-extrabold tabular-nums truncate ${blue ? 'text-[#2A4DD0]' : ''}`}>{value}</span>
    </span>
  )
}
