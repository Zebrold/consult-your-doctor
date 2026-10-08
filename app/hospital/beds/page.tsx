import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import { BedDouble, BedSingle, CircleAlert, Gauge, History, Wrench } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatShortDate } from '@/components/patient/format'
import { LiveRefresh } from '@/components/portal/LiveRefresh'
import { loadHospitalBeds, loadRecentDischarges, stayDays, summarizeBeds, wardSummaries } from '@/lib/beds'
import { loadHospitalDoctors, requireHospital } from '../_lib/hospital'
import { AddBedsButton, BedBoard } from '../_components/BedBoard'

export const metadata: Metadata = { title: 'Inpatient Beds | Hospital Portal' }
export const dynamic = 'force-dynamic'

const card = 'bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-[0_4px_24px_rgba(0,80,203,0.04)] border border-surface-container md:border-transparent'

function Counter({ icon: Icon, label, value, sub, tone }: { icon: LucideIcon; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="min-w-[150px] flex-1 p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container md:border-transparent flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-label-sm text-[11px] md:text-label-sm text-indigo-gray-600 uppercase tracking-wider font-semibold">{label}</div>
        <div className={`font-headline-lg text-[26px] md:text-headline-lg font-bold tracking-tight mt-0.5 ${tone}`}>{value}</div>
        <div className="text-[11px] text-indigo-gray-600 truncate">{sub}</div>
      </div>
      <span className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </span>
    </div>
  )
}

export default async function HospitalBedsPage() {
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const [beds, doctors, discharges] = await Promise.all([loadHospitalBeds(admin, hospital.id), loadHospitalDoctors(admin, hospital.id), loadRecentDischarges(admin, hospital.id)])
  const summary = summarizeBeds(beds.data)
  const wards = wardSummaries(beds.data)

  return (
    <>
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider">
            Inpatient care <LiveRefresh label="Live" />
          </span>
          <h1 className="font-headline-lg text-[24px] md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight mt-1.5">Inpatient Beds &amp; Bed Allocation</h1>
          <p className="text-sm md:text-body-md text-indigo-gray-600">
            Every bed by ward. Admissions show on the attending doctor’s dashboard and in the patient’s profile as soon as you save them.
          </p>
        </div>
        {beds.ready && <AddBedsButton wards={wards.map((w) => w.ward)} />}
      </section>

      {!beds.ready ? (
        <div className={`${card} flex items-start gap-3`}>
          <CircleAlert className="w-6 h-6 text-soft-coral shrink-0" />
          <div>
            <h2 className="font-title-md text-[17px] font-bold text-on-surface">Beds need a database update</h2>
            <p className="text-sm text-indigo-gray-600 mt-1">
              Ask your administrator to run <code className="font-mono text-[12px]">supabase/migrations/20261009_beds_reviews_profiles.sql</code> in the Supabase SQL editor. Bed setup and allocation open up here straight after.
            </p>
          </div>
        </div>
      ) : (
        <>
          <section className="flex md:grid md:grid-cols-4 gap-2.5 md:gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <Counter icon={BedDouble} label="Total beds" value={String(summary.total)} sub={`${wards.length} ${wards.length === 1 ? 'ward' : 'wards'}`} tone="text-indigo-gray-900" />
            <Counter icon={Gauge} label="Occupied" value={String(summary.occupied)} sub={`${summary.occupancy}% occupancy`} tone="text-vibrant-blue" />
            <Counter icon={BedSingle} label="Available" value={String(summary.available)} sub="Ready for a patient" tone="text-secondary" />
            <Counter icon={Wrench} label="Cleaning / repair" value={String(summary.unavailable)} sub="Not ready yet" tone={summary.unavailable ? 'text-soft-coral' : 'text-indigo-gray-900'} />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
            <div className="xl:col-span-8 min-w-0">
              <BedBoard beds={beds.data} doctors={doctors.map((d) => ({ id: d.id, name: doctorName(d.name), department: d.department }))} now={now} />
            </div>

            <div className="xl:col-span-4 min-w-0 flex flex-col gap-4 md:gap-6">
              <div className={card}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-title-md text-[18px] font-bold text-on-surface">Occupancy by Ward</h2>
                    <p className="text-[13px] text-indigo-gray-600">Occupied beds out of each ward’s total</p>
                  </div>
                  <span className="font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container text-on-surface-variant font-bold shrink-0">{summary.occupancy}%</span>
                </div>
                {wards.length === 0 ? (
                  <p className="p-4 rounded-xl bg-surface text-sm text-indigo-gray-600">Add beds to see each ward’s occupancy.</p>
                ) : (
                  <div className="space-y-4">
                    {wards.map((w) => {
                      const tone = w.occupancy >= 90 ? 'bg-soft-coral' : w.occupancy >= 70 ? 'bg-vibrant-blue' : 'bg-fresh-teal'
                      return (
                        <div key={w.ward} className="space-y-1.5">
                          <div className="flex justify-between items-center gap-2 text-[14px]">
                            <span className="font-bold text-on-surface truncate">{w.ward}</span>
                            <span className="font-semibold text-indigo-gray-600 shrink-0">
                              {w.occupied}/{w.total} • {w.available} free
                            </span>
                          </div>
                          <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden" role="img" aria-label={`${w.occupancy}% occupied`}>
                            <div className={`${tone} h-full rounded-full`} style={{ width: `${Math.max(w.occupancy, w.occupied ? 4 : 0)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className={card}>
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-fresh-teal" />
                  <h2 className="font-title-md text-[18px] font-bold text-on-surface">Recent Discharges</h2>
                </div>
                {discharges.length === 0 ? (
                  <p className="p-4 rounded-xl bg-surface text-sm text-indigo-gray-600">Discharged patients appear here.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {discharges.map((d) => (
                      <li key={d.id} className="p-3 rounded-xl bg-surface flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-semibold text-[14px] text-on-surface truncate">{d.patient.name}</span>
                          <span className="block text-[12px] text-indigo-gray-600 truncate">
                            {d.bed}
                            {d.doctor ? ` • ${d.doctor.name}` : ''}
                          </span>
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block text-[12px] font-semibold text-on-surface">{formatShortDate(d.dischargedAt!)}</span>
                          <span className="block text-[11px] text-indigo-gray-600">{stayDays(d.admittedAt, d.dischargedAt!)} days</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  )
}
