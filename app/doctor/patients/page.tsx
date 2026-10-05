import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { ageFrom, istDateKey } from '@/components/patient/format'
import { latestVitals, loadPatientFacts, loadVisits, patientCode, requireDoctor, type Visit } from '../_lib/doctor'
import { PatientRoster, type RosterPatient } from '../_components/PatientRoster'

export const metadata: Metadata = { title: 'Patients | Doctor Portal' }
export const dynamic = 'force-dynamic'

const PAID = ['confirmed', 'visited', 'completed']
const DAY = 86_400_000

export default async function DoctorPatientsPage(props: { searchParams?: Promise<{ patient?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  const visits = (await loadVisits(admin, doctor.id)).filter((v) => PAID.includes(v.status) && v.patient)

  // Group this doctor's paid visits by patient. Patients with only unpaid bookings aren't listed yet.
  const byPatient = new Map<string, Visit[]>()
  for (const v of visits) byPatient.set(v.patient!.id, [...(byPatient.get(v.patient!.id) ?? []), v])
  const facts = await loadPatientFacts(admin, Array.from(byPatient.keys()))
  const vitals = latestVitals(visits)

  const roster: RosterPatient[] = Array.from(byPatient.entries()).map(([id, list]) => {
    const p = list[0].patient!
    const f = facts[id]
    const seen = list.filter((v) => (v.status === 'completed' || v.status === 'visited') && v.start && Date.parse(v.start) <= now)
    const upcoming = list.filter((v) => v.status === 'confirmed' && v.start && Date.parse(v.start) > now - 60 * 60_000)
    const checkedIn = list.find((v) => v.status === 'visited')
    const active = checkedIn ?? upcoming[0] ?? list.filter((v) => v.status === 'confirmed').pop() ?? null
    const records = list
      .flatMap((v) => v.records.map((r) => ({ id: r.id, notes: r.notes, fileUrl: r.fileUrl, date: r.createdAt ?? v.start })))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    return {
      id,
      code: patientCode(id),
      name: p.name,
      phone: p.phone,
      email: p.email && !p.email.endsWith('@consultyourdoctor.internal') ? p.email : null,
      age: ageFrom(f?.dateOfBirth, now),
      gender: f?.gender ?? null,
      bloodGroup: f?.bloodGroup ?? null,
      dateOfBirth: f?.dateOfBirth ?? null,
      emergency: f?.emergencyName
        ? `${f.emergencyName}${f.emergencyRelation ? ` (${f.emergencyRelation})` : ''}${f.emergencyPhone ? `: ${f.emergencyPhone}` : ''}`
        : null,
      visitCount: list.length,
      firstVisit: list[0].start,
      lastSeen: seen.length ? seen[seen.length - 1].start : null,
      nextVisit: upcoming[0]?.start ?? null,
      active: active ? { id: active.id, status: active.status } : null,
      group: checkedIn ? 'checked-in' : upcoming.length ? 'upcoming' : 'past',
      records: records.slice(0, 6),
      vitals: vitals[id] ?? null,
    }
  })

  // Checked-in first, then upcoming (soonest first), then everyone else (most recently seen first)
  const rank = { 'checked-in': 0, upcoming: 1, past: 2 } as const
  roster.sort(
    (a, b) =>
      rank[a.group] - rank[b.group] ||
      (a.group === 'upcoming' ? (a.nextVisit ?? '').localeCompare(b.nextVisit ?? '') : (b.lastSeen ?? '').localeCompare(a.lastSeen ?? '')),
  )

  const monthKey = istDateKey(now).slice(0, 7)
  const lastMonthKey = istDateKey(Date.parse(`${monthKey}-01T00:00:00+05:30`) - DAY).slice(0, 7)
  const inMonth = (iso: string | null, key: string) => !!iso && istDateKey(iso).slice(0, 7) === key
  const stats = {
    total: roster.length,
    newThisMonth: roster.filter((p) => inMonth(p.firstVisit, monthKey)).length,
    visitsThisMonth: visits.filter((v) => inMonth(v.start, monthKey)).length,
    visitsLastMonth: visits.filter((v) => inMonth(v.start, lastMonthKey)).length,
    upcoming: visits.filter((v) => v.status === 'confirmed' && v.start && Date.parse(v.start) > now).length,
    nextUpcoming: visits.find((v) => v.status === 'confirmed' && v.start && Date.parse(v.start) > now)?.start ?? null,
    awaitingNotes: roster.filter((p) => p.group === 'checked-in').length,
  }

  return <PatientRoster patients={roster} stats={stats} now={now} initialPatient={params.patient ?? null} />
}
