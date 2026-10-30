import type { Metadata } from 'next'
import { Building2, ClipboardList, KeyRound, MapPin, Stethoscope } from 'lucide-react'
import { currentTime, loadPartnerApplications, requireExecutive, timeAgo } from '../_lib/ops'
import { Chip, EmptyState, MetricCard, PageHeader, Panel } from '../_components/ui'
import { AddHospitalButton, AddLoginButton } from '../_components/NetworkForms'
import { PartnerQueue } from '../_components/PartnerQueue'

export const metadata: Metadata = { title: 'Partner Hospitals' }

type HospitalRow = {
  id: string
  name: string
  city: string | null
  address: string | null
  status: string | null
  hospital_code: string | null
  created_at: string | null
}

export default async function ExecutiveHospitalsPage() {
  const { admin } = await requireExecutive()

  const [{ data: hospitalRows }, { data: doctorRows }, { data: loginRows }, applications] = await Promise.all([
    admin.from('hospitals').select('id, name, city, address, status, hospital_code, created_at').order('name'),
    admin.from('doctors').select('hospital_id'),
    admin.from('profiles').select('hospital_id, staff_id').eq('role', 'hospital_admin'),
    loadPartnerApplications(admin, 'hospital'),
  ])
  const now = currentTime()
  // Oldest first, so the longest wait is reviewed first.
  const pendingApplications = applications.filter((a) => a.status === 'pending').reverse()
  const appliedLabels = Object.fromEntries(pendingApplications.map((a) => [a.id, timeAgo(a.createdAt, now)]))

  const doctorCount = new Map<string, number>()
  for (const d of (doctorRows ?? []) as { hospital_id: string | null }[]) {
    if (d.hospital_id) doctorCount.set(d.hospital_id, (doctorCount.get(d.hospital_id) ?? 0) + 1)
  }
  const logins = new Map<string, string[]>()
  for (const p of (loginRows ?? []) as { hospital_id: string | null; staff_id: string | null }[]) {
    if (p.hospital_id) logins.set(p.hospital_id, [...(logins.get(p.hospital_id) ?? []), p.staff_id ?? '—'])
  }

  const hospitals = (hospitalRows ?? []) as HospitalRow[]
  const live = hospitals.filter((h) => h.status === 'active').length
  const withoutLogin = hospitals.filter((h) => !logins.has(h.id)).length
  const cities = new Set(hospitals.map((h) => h.city).filter(Boolean))
  const totalDoctors = Array.from(doctorCount.values()).reduce((a, b) => a + b, 0)

  return (
    <>
      <PageHeader
        eyebrow="Partner Network"
        title="Partner Hospitals"
        description="Add hospitals to the network with their staff login, and see which ones are live for booking."
        actions={<AddHospitalButton />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-gutter">
        <MetricCard label="Hospitals" value={hospitals.length} icon={Building2} tone="blue" footer={<span>In {cities.size} {cities.size === 1 ? 'city' : 'cities'}</span>} />
        <MetricCard label="Live for booking" value={live} icon={MapPin} tone="teal" footer={<span>{hospitals.length - live} not listed</span>} />
        <MetricCard label="Doctors" value={totalDoctors} icon={Stethoscope} tone="primary" footer={<span>Across all hospitals</span>} />
        <MetricCard label="Without a login" value={withoutLogin} icon={KeyRound} tone={withoutLogin ? 'coral' : 'neutral'} footer={<span>{withoutLogin ? 'Create one below' : 'Every hospital can login'}</span>} />
      </section>

      <Panel
        id="applications"
        title="Hospital Applications"
        icon={ClipboardList}
        description="Hospitals that applied to join at /signup/hospital. Approving adds the hospital and its staff login, and emails the applicant their staff ID."
        aside={<Chip tone={pendingApplications.length ? 'coral' : 'teal'} dot>{pendingApplications.length} pending</Chip>}
      >
        <PartnerQueue applications={pendingApplications} submittedLabels={appliedLabels} />
      </Panel>

      <Panel title="All hospitals" icon={Building2} description="Each hospital's staff manage their own listing, doctors, slots and payments.">
        {hospitals.length === 0 ? (
          <EmptyState icon={Building2}>No hospitals yet. Add the first one to start taking bookings.</EmptyState>
        ) : (
          <>
            {/* Phones: cards */}
            <ul className="md:hidden flex flex-col gap-3">
              {hospitals.map((h) => (
                <li key={h.id} className="rounded-xl ring-1 ring-surface-container p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-indigo-gray-900 truncate">{h.name}</p>
                      <p className="text-sm text-indigo-gray-600 truncate">{[h.city, h.hospital_code].filter(Boolean).join(' · ')}</p>
                    </div>
                    <StatusChip status={h.status} />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-indigo-gray-600">{doctorCount.get(h.id) ?? 0} doctors</span>
                    <LoginCell id={h.id} name={h.name} staffIds={logins.get(h.id)} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablets and up: table */}
            <div className="hidden md:block w-full rounded-xl overflow-hidden ring-1 ring-surface-container">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm">
                      <th className="py-3.5 px-5 font-semibold">Hospital</th>
                      <th className="py-3.5 px-4 font-semibold">City</th>
                      <th className="py-3.5 px-4 font-semibold">Doctors</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-5 font-semibold">Staff login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {hospitals.map((h) => (
                      <tr key={h.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-4 px-5">
                          <p className="font-semibold text-indigo-gray-900">{h.name}</p>
                          <p className="text-[12px] text-indigo-gray-600">{h.hospital_code ?? 'No ID yet'}{h.address ? ` · ${h.address}` : ''}</p>
                        </td>
                        <td className="py-4 px-4 text-sm text-indigo-gray-900">{h.city ?? '—'}</td>
                        <td className="py-4 px-4 text-sm text-indigo-gray-900 tabular-nums">{doctorCount.get(h.id) ?? 0}</td>
                        <td className="py-4 px-4"><StatusChip status={h.status} /></td>
                        <td className="py-4 px-5"><LoginCell id={h.id} name={h.name} staffIds={logins.get(h.id)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  )
}

function StatusChip({ status }: { status: string | null }) {
  return status === 'active' ? <Chip tone="teal" dot>Live</Chip> : <Chip tone="neutral">Not listed</Chip>
}

function LoginCell({ id, name, staffIds }: { id: string; name: string; staffIds?: string[] }) {
  if (!staffIds?.length) return <AddLoginButton kind="hospital" id={id} name={name} />
  return <span className="font-mono text-[13px] text-indigo-gray-900">{staffIds.join(', ')}</span>
}
