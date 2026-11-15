import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Eye, FileText, Lock } from 'lucide-react'
import { AccountPage } from '@/components/patient/AccountPage'
import { card } from '@/components/patient/app-ui'
import { doctorName, formatShortDate, initials } from '@/components/patient/format'
import { RemoveRecordButton, UploadRecordButton } from '@/components/patient/health/records'
import { patientAccount } from '@/lib/patient-account'
import { loadFamily, loadUploads, RECORD_KINDS, type RecordKind } from '@/lib/patient-health'
import { loadPatientLabs, loadPatientVisits, rangeCheck } from '@/lib/patient-visits'
import { RECORD_BUCKET, signRecordFiles } from '@/lib/records'
import { signReportLinks } from '@/lib/lab-reports'
import { withoutVitals } from '@/lib/vitals'

export const metadata: Metadata = { title: 'Health records' }

type Filter = 'rx' | 'lab' | 'scan' | 'vac' | 'other'
const FILTERS: Record<Filter, string> = { rx: 'Prescriptions', lab: 'Lab reports', scan: 'Scans', vac: 'Vaccinations', other: 'Other records' }
const KIND_FILTER: Record<RecordKind, Filter> = { prescription: 'rx', lab_report: 'lab', scan: 'scan', vaccination: 'vac', other: 'other' }

type Entry = {
  id: string
  date: string
  filter: Filter
  type: string
  title: string
  by: string
  href: string | null
  notes: string | null
  member: string | null
  uploadId?: string
}

const IST = 'Asia/Kolkata'
const day = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, day: '2-digit' })
const mon = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, month: 'short' }).toUpperCase()
const month = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, month: 'long', year: 'numeric' })
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)

/** Health records: prescriptions and health details from visits, lab reports, and what the patient uploads. */
export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  const filter = type && type in FILTERS ? (type as Filter) : null
  const { user, admin, profile } = await patientAccount('/patient/records')
  const [visits, labs, uploads, family] = await Promise.all([
    loadPatientVisits(admin, user.id),
    loadPatientLabs(admin, user.id),
    loadUploads(admin, user.id),
    loadFamily(admin, user.id),
  ])
  const memberName = new Map(family.members.map((m) => [m.id, m.name]))

  // Every file is private: short-lived signed links, made for this patient's own records only.
  const [recordLinks, reportLinks, uploadLinks] = await Promise.all([
    signRecordFiles(admin, visits.flatMap((v) => v.records.map((r) => r.fileUrl))),
    signReportLinks(admin, labs.filter((b) => b.status === 'report_sent' && b.center).map((b) => ({ id: b.id, centerId: b.center!.id }))),
    uploads.records.length
      ? admin.storage
          .from(RECORD_BUCKET)
          .createSignedUrls(uploads.records.map((r) => r.path), 60 * 60)
          .then(({ data }) => Object.fromEntries((data ?? []).filter((d) => d.signedUrl && !d.error).map((d) => [d.path, d.signedUrl])))
      : Promise.resolve({} as Record<string, string>),
  ])

  const entries: Entry[] = [
    ...visits.flatMap((v) =>
      v.records.map((r): Entry => {
        const by = [v.doctor ? doctorName(v.doctor.name) : null, v.hospital?.name].filter(Boolean).join(' · ')
        return r.kind === 'health'
          ? { id: r.id, date: v.date, filter: 'other', type: 'Health record', title: 'Health details recorded at the visit', by: v.hospital?.name ?? by, href: (r.fileUrl && recordLinks[r.fileUrl]) || null, notes: withoutVitals(r.notes) || null, member: v.familyMemberId }
          : { id: r.id, date: v.date, filter: 'rx', type: 'Prescription', title: v.doctor?.specialty ? `${v.doctor.specialty} consultation` : 'Consultation', by, href: (r.fileUrl && recordLinks[r.fileUrl]) || null, notes: r.fileUrl ? null : withoutVitals(r.notes) || null, member: v.familyMemberId }
      }),
    ),
    ...labs
      .filter((b) => b.status === 'report_sent' || b.results)
      .map((b): Entry => ({
        id: b.id,
        date: b.results?.reportedAt ? istDay(b.results.reportedAt) : b.date ?? istDay(b.createdAt),
        filter: 'lab',
        type: 'Lab report',
        title: b.tests,
        by: b.center?.name ?? 'Lab',
        href: reportLinks[b.id] ?? null,
        notes: null,
        member: b.familyMemberId,
      })),
    ...uploads.records.map((r): Entry => ({
      id: r.id,
      date: r.date ?? istDay(r.createdAt),
      filter: KIND_FILTER[r.kind],
      type: `${RECORD_KINDS[r.kind]} · uploaded`,
      title: r.title,
      by: r.provider ?? 'Uploaded by you',
      href: (uploadLinks as Record<string, string>)[r.path] ?? null,
      notes: null,
      member: r.familyMemberId,
      uploadId: r.id,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const shown = filter ? entries.filter((e) => e.filter === filter) : entries
  const tiles = (['rx', 'lab', 'scan', 'vac'] as Filter[]).map((f) => {
    const list = entries.filter((e) => e.filter === f)
    return { f, label: FILTERS[f], count: list.length, latest: list[0]?.date ?? null }
  })

  // The newest lab report with results typed in by the lab.
  const latestLab = labs.filter((b) => b.results).sort((a, b) => (b.results!.reportedAt ?? b.createdAt).localeCompare(a.results!.reportedAt ?? a.createdAt))[0]

  // Who sees what: each doctor and hospital sees the records of the visits booked with them; each lab its own reports.
  const viewers = new Map<string, { name: string; sub: string }>()
  for (const v of visits) {
    if (v.status === 'cancelled' || v.status === 'refunded' || v.status === 'pending_payment') continue
    if (v.doctor && !viewers.has(v.doctor.id)) viewers.set(v.doctor.id, { name: doctorName(v.doctor.name), sub: [v.hospital?.name, `last visit ${formatShortDate(`${v.date}T12:00:00+05:30`)}`].filter(Boolean).join(' · ') })
  }
  for (const b of labs) {
    if (b.center && b.status !== 'cancelled' && b.status !== 'pending_payment' && !viewers.has(b.center.id)) viewers.set(b.center.id, { name: b.center.name, sub: 'Lab · your reports from them' })
  }

  const upload = <UploadRecordButton members={family.members.map((m) => ({ id: m.id, name: m.name }))} ready={uploads.ready} />

  return (
    <AccountPage
      user={user}
      profile={profile}
      wide
      title="Health records"
      subtitle="Every prescription, report and scan from your visits, in one place"
      phoneSubtitle="Prescriptions, reports and scans, saved from your visits."
      actions={upload}
      hero={<UploadRecordButton members={family.members.map((m) => ({ id: m.id, name: m.name }))} ready={uploads.ready} variant="hero" className="w-full" />}
    >
      <nav aria-label="Record types" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
        {tiles.map((t) => {
          const on = filter === t.f
          return (
            <Link
              key={t.f}
              href={on ? '/patient/records' : `/patient/records?type=${t.f}`}
              aria-current={on ? 'true' : undefined}
              scroll={false}
              className={`rounded-[18px] lg:rounded-2xl px-4 py-3.5 lg:px-5 lg:py-4 transition-colors ${on ? 'bg-[#F5F8FF] shadow-[0_0_0_2px_#2A4DD0]' : 'bg-white shadow-[0_0_0_1px_#E6EAF0] hover:shadow-[0_0_0_1px_#C9D4EA]'}`}
            >
              <span className="block text-[12.5px] lg:text-[13px] font-bold text-[#5B667A]">{t.label}</span>
              <span className="block mt-1 text-[24px] lg:text-[28px] font-extrabold tracking-[-0.03em] tabular-nums">{t.count}</span>
              <span className="block mt-0.5 text-[11.5px] lg:text-[12px] text-[#5B667A]">{t.latest ? `Latest ${formatShortDate(`${t.latest}T12:00:00+05:30`)}` : 'None yet'}</span>
            </Link>
          )
        })}
      </nav>

      <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <section className={`${card} p-4 lg:p-[22px] min-w-0`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[16px] font-extrabold">{filter ? FILTERS[filter] : 'All records'}</h2>
              <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">
                {shown.length} {shown.length === 1 ? 'record' : 'records'}
                {filter ? ' · ' : ' · tap a number above to filter'}
                {filter && (
                  <Link href="/patient/records" scroll={false} className="font-extrabold text-[#2A4DD0] hover:underline">
                    Show all
                  </Link>
                )}
              </p>
            </div>
          </div>
          {shown.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-[#F3F6FC] px-4 py-6 text-center">
              <FileText className="w-6 h-6 mx-auto text-[#2A4DD0]" />
              <p className="mt-2 text-[14px] font-extrabold">Nothing here yet</p>
              <p className="mt-1 text-[12.5px] text-[#5B667A]">Prescriptions appear after your consultation and lab reports when the lab uploads them. You can also upload your own.</p>
            </div>
          ) : (
            <div className="mt-2">
              {shown.map((e, i) => (
                <div key={`${e.filter}-${e.id}`}>
                  {(i === 0 || month(shown[i - 1].date) !== month(e.date)) && (
                    <p className="pt-4 pb-1.5 text-[11.5px] font-extrabold tracking-[0.06em] text-[#8A94A6] uppercase">{month(e.date)}</p>
                  )}
                  <div className="flex gap-3.5 py-3 border-t border-[#EEF2F7]">
                    <span className="shrink-0 w-12 h-12 rounded-xl bg-[#F3F6FC] flex flex-col items-center justify-center leading-none">
                      <span className="text-[16px] font-extrabold">{day(e.date)}</span>
                      <span className="mt-0.5 text-[10px] font-extrabold text-[#5B667A]">{mon(e.date)}</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11.5px] font-extrabold text-[#2A4DD0]">
                        {e.type}
                        {e.member && memberName.has(e.member) ? <span className="text-[#5B667A]"> · for {memberName.get(e.member)}</span> : null}
                      </span>
                      <span className="block text-[14px] font-extrabold first-letter:uppercase break-words">{e.title}</span>
                      <span className="block text-[12.5px] text-[#5B667A] truncate">{e.by}</span>
                      {e.notes && <span className="block mt-1 text-[12.5px] text-[#4A5878] line-clamp-3">{e.notes}</span>}
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {e.href && (
                          <>
                            <a href={e.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                              <Eye className="w-3.5 h-3.5" /> View
                            </a>
                            <a href={e.href} download className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                          </>
                        )}
                        {e.uploadId && <RemoveRecordButton id={e.uploadId} title={e.title} />}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          {latestLab?.results && (
            <section className={`${card} p-4 lg:p-[22px]`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[16px] font-extrabold">Latest lab results</h2>
                {reportLinks[latestLab.id] && (
                  <a href={reportLinks[latestLab.id]} target="_blank" rel="noreferrer" className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
                    Open report
                  </a>
                )}
              </div>
              <p className="mt-2 text-[14px] font-extrabold capitalize">{latestLab.tests}</p>
              <p className="text-[12.5px] text-[#5B667A]">
                {[latestLab.center?.name, latestLab.results.reportedAt ? formatShortDate(latestLab.results.reportedAt) : null].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2">
                {latestLab.results.rows.slice(0, 6).map((r) => {
                  const check = rangeCheck(r.value, r.range)
                  const flagged = !!r.flag
                  const ok = check ? check.within && !flagged : !flagged
                  return (
                    <div key={r.test} className="py-2.5 border-t border-[#EEF2F7] first:border-t-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] font-extrabold">{r.test}</span>
                        <span className="text-[13.5px] font-extrabold tabular-nums">
                          {r.value} <span className="text-[12px] font-bold text-[#5B667A]">{r.unit}</span>
                        </span>
                      </div>
                      {check && (
                        <span className="relative block mt-2 h-1.5 rounded-full bg-[#EEF2F7]">
                          <span className="absolute inset-y-0 left-1/4 right-1/4 rounded-full bg-[#D1FADF]" />
                          <span className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-2 ring-white ${ok ? 'bg-[#12B76A]' : 'bg-[#F04438]'}`} style={{ left: `${check.position * 100}%` }} />
                        </span>
                      )}
                      <div className="mt-1.5 flex justify-between gap-3 text-[11.5px]">
                        <span className="text-[#5B667A]">{r.range ? `Normal range ${r.range}` : 'No range given'}</span>
                        <span className={`font-extrabold ${ok ? 'text-[#067647]' : 'text-[#B42318]'}`}>{flagged ? r.flag : check ? (check.within ? 'Within range' : 'Outside range') : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-[12px] text-[#5B667A]">Discuss your results with your doctor. Ranges are as printed by the lab.</p>
            </section>
          )}

          <section className={`${card} p-4 lg:p-[22px]`}>
            <h2 className="text-[16px] font-extrabold">Who can see your records</h2>
            {viewers.size === 0 ? (
              <p className="mt-1.5 text-[13px] text-[#5B667A]">No one yet. When you book, that doctor, hospital or lab sees the records of that booking.</p>
            ) : (
              <div className="mt-2">
                {[...viewers.values()].slice(0, 6).map((v) => (
                  <div key={v.name + v.sub} className="flex items-center gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0">
                    <span className="shrink-0 w-9 h-9 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[11.5px] font-extrabold">{initials(v.name)}</span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-extrabold truncate">{v.name}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">{v.sub}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2.5 flex gap-2 text-[12px] leading-normal text-[#5B667A]">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Doctors, hospitals and labs see only the records from the bookings you made with them. Files you upload are visible only to you.
            </p>
          </section>
        </div>
      </div>
    </AccountPage>
  )
}
