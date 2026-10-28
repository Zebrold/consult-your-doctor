import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { ageFrom, istDateKey } from '@/components/patient/format'
import { latestVitals, loadPatientFacts, loadVisits, patientCode, requireDoctor, type Visit } from '../_lib/doctor'
import { PatientRoster, type RosterPatient, type RosterStats } from '../_components/PatientRoster'

export const metadata: Metadata = { title: 'Patients | Doctor Portal' }
export const dynamic = 'force-dynamic'

const PAID = ['confirmed', 'visited', 'completed']

export default async function DoctorPatientsPage(props: { searchParams?: Promise<{ patient?: string; q?: string }> }) {
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
      .flatMap((v) => v.records.map((r) => ({ id: r.id, type: r.type, notes: r.notes, fileUrl: r.fileUrl, date: r.createdAt ?? v.start })))
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
      active: active ? { id: active.id, status: active.status, start: active.start } : null,
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

  // The last seven months, oldest first
  const thisMonth = istDateKey(now).slice(0, 7)
  const months = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${thisMonth}-15T12:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - (6 - i))
    return d.toISOString().slice(0, 7)
  })
  const monthOf = (iso: string | null) => (iso ? istDateKey(iso).slice(0, 7) : null)
  const visitSeries = months.map((m) => visits.filter((v) => monthOf(v.start) === m).length)
  const stats: RosterStats = {
    total: roster.length,
    newThisMonth: roster.filter((p) => monthOf(p.firstVisit) === thisMonth).length,
    visitsThisMonth: visitSeries[6],
    visitsLastMonth: visitSeries[5],
    lastMonthName: new Date(`${months[5]}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short' }),
    returningPct: roster.length ? Math.round((roster.filter((p) => p.visitCount > 1).length / roster.length) * 100) : 0,
    awaitingNotes: roster.filter((p) => p.group === 'checked-in').length,
    visitSeries,
    patientSeries: months.map((m) => roster.filter((p) => (monthOf(p.firstVisit) ?? '9999') <= m).length),
  }

  return (
    <PatientRoster
      key={params.q ?? ''}
      doctor={{ name: doctor.name, image: doctor.image }}
      patients={roster}
      stats={stats}
      now={now}
      initialPatient={params.patient ?? null}
      initialQuery={params.q ?? ''}
    />
  )
}
