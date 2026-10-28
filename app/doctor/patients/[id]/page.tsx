import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Phone } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { ageFrom, formatShortDate, formatSlot, formatTime, istDateKey, visitToken } from '@/components/patient/format'
import { vitalsList } from '@/lib/vitals'
import { latestVitals, loadPatientFacts, loadVisits, patientCode, requireDoctor, type Visit } from '../../_lib/doctor'
import { latestAllergy, readNotes } from '../../_lib/notes'
import { CallLink, CheckInButton, PrescriptionButton, type VisitRef } from '../../_components/VisitControls'
import { DocBackHeader, DocBody, EmptyLine, Initials, Panel, PanelHead, Row, Status, visitStatus } from '../../_components/doc-ui'

export const metadata: Metadata = { title: 'Patient record | Doctor Portal' }
export const dynamic = 'force-dynamic'

const PAID = ['confirmed', 'visited', 'completed']
const ref = (v: Visit): VisitRef => ({ id: v.id, status: v.status, patientName: v.patient?.name ?? 'Patient', phone: v.patient?.phone ?? null })

/** A patient's record as their doctor sees it: who they are, their latest readings and notes, every visit and file. */
export default async function DoctorPatientRecord(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  // Only patients who booked and paid for a visit with this doctor have a record here.
  const visits = (await loadVisits(admin, doctor.id)).filter((v) => v.patient?.id === id && PAID.includes(v.status))
  if (!visits.length) notFound()

  const patient = visits[0].patient!
  const facts = (await loadPatientFacts(admin, [id]))[id]
  const vitals = latestVitals(visits)[id] ?? null
  const newestFirst = [...visits].reverse()
  const notes = newestFirst.flatMap((v) => v.records.map((r) => r.notes))
  const allergy = latestAllergy(notes)

  const checkedIn = visits.find((v) => v.status === 'visited')
  const upcoming = visits.filter((v) => v.status === 'confirmed' && v.start && Date.parse(v.start) > now - 60 * 60_000)
  const active = checkedIn ?? upcoming[0] ?? visits.filter((v) => v.status === 'confirmed').pop() ?? null
  const lastCompleted = newestFirst.find((v) => v.status === 'completed') ?? null
  const latest = notes.map(readNotes).find((n) => n.diagnosis || n.complaints || n.findings) ?? null

  const age = ageFrom(facts?.dateOfBirth, now)
  const identity = [age != null ? `${age} yrs` : null, facts?.gender, patientCode(id)].filter(Boolean).join(' · ')
  const activeLine = active?.start
    ? `${visitStatus(active.status).label} · Token ${visitToken(active.id)} · ${istDateKey(active.start) === istDateKey(now) ? formatTime(active.start) : formatSlot(active.start, now)}`
    : null
  const files = newestFirst.flatMap((v) =>
    v.records.filter((r) => r.fileUrl).map((r) => ({ id: r.id, url: r.fileUrl!, title: r.type === 'health_record' ? 'Health record' : /attachment/i.test(r.notes ?? '') ? 'Attachment from you' : 'Prescription PDF', date: v.start })),
  )

  const prescribe = active ?? lastCompleted
  const rxButton = (size?: string) =>
    prescribe ? (
      <PrescriptionButton visit={ref(prescribe)} kind="primary" label={prescribe.status === 'completed' ? 'Update prescription' : 'Write prescription'} size={size} />
    ) : null
  const hasLeft = active?.status === 'confirmed' || !!patient.phone
  const leftButton = (size?: string) =>
    active?.status === 'confirmed' ? <CheckInButton visit={ref(active)} kind="outline" label="Check in" size={size} /> : <CallLink phone={patient.phone} name={patient.name} size={size} />

  return (
    <>
      <DocBackHeader
        backHref="/doctor/patients"
        backLabel="Back to patients"
        title="Patient record"
        action={
          patient.phone ? (
            <a href={`tel:${patient.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${patient.name}`} className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:bg-white/10">
              <Phone className="w-[19px] h-[19px]" />
            </a>
          ) : null
        }
      >
        <div className="flex items-center gap-3.5 mt-3 mx-1">
          <span className="shrink-0 w-14 h-14 rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[18px] font-extrabold">
            {patient.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block text-[21px] font-extrabold tracking-[-0.01em] truncate">{patient.name}</span>
            <span className="block text-[13px] text-[#DCE6FF] truncate">{identity}</span>
            {activeLine && <span className="block mt-0.5 text-[12.5px] font-bold truncate">{activeLine}</span>}
          </span>
        </div>
      </DocBackHeader>

      <DocBody bar={false}>
        <div className="hidden lg:flex items-center justify-between gap-5 mb-[22px]">
          <div className="flex items-center gap-4 min-w-0">
            <Initials name={patient.name} className="w-16 h-16 text-[20px]" />
            <div className="min-w-0">
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight truncate">{patient.name}</h1>
              <p className="mt-1 text-[14px] text-[#5B667A]">
                {identity}
                {activeLine && <span className="font-bold" style={{ color: visitStatus(active!.status).color }}>{` · ${activeLine}`}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {hasLeft && leftButton()}
            {rxButton()}
          </div>
        </div>

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start">
          <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
            <Panel>
              <PanelHead title="Latest notes" sub={latest ? undefined : 'Your notes appear here after you write a prescription'} />
              {latest ? (
                <div className="flex flex-col gap-2 text-[14px] leading-normal text-[#27324A]">
                  {latest.complaints && (
                    <p>
                      <span className="font-extrabold text-[#0B1B3F]">Complaints: </span>
                      {latest.complaints}
                    </p>
                  )}
                  {latest.findings && (
                    <p>
                      <span className="font-extrabold text-[#0B1B3F]">Findings: </span>
                      {latest.findings}
                    </p>
                  )}
                  {latest.diagnosis && (
                    <p>
                      <span className="font-extrabold text-[#0B1B3F]">Diagnosis: </span>
                      {latest.diagnosis}
                    </p>
                  )}
                </div>
              ) : null}
            </Panel>

            <Panel>
              <PanelHead title="Vitals" sub={vitals ? `Recorded ${vitals.date ? formatSlot(vitals.date, now) : 'at a visit'}` : 'Nothing recorded yet. Add vitals when you write a prescription.'} />
              {vitals && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5">
                  {vitalsList(vitals).map((r) => (
                    <div key={r.label} className="py-2.5 border-b border-[#EEF2F7]">
                      <span className="block text-[11.5px] font-bold text-[#5B667A]">{r.label}</span>
                      <span className="block mt-0.5 text-[15px] font-extrabold">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHead title="Visits with you" sub={`${visits.length} ${visits.length === 1 ? 'visit' : 'visits'}`} />
              <ul>
                {newestFirst.map((v) => {
                  const n = v.records.map((r) => readNotes(r.notes)).find((x) => x.diagnosis || x.complaints || x.rx)
                  const file = v.records.find((r) => r.fileUrl)
                  return (
                    <li key={v.id} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                      <span className="shrink-0 w-[84px] text-[12.5px] font-extrabold">{v.start ? formatShortDate(v.start) : '—'}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-extrabold truncate">{n?.diagnosis || n?.complaints || (v.status === 'completed' ? 'No notes recorded' : visitStatus(v.status).label)}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">{n?.rx ?? (v.start ? `${formatTime(v.start)} · Token ${visitToken(v.id)}` : `Token ${visitToken(v.id)}`)}</span>
                      </span>
                      {file?.fileUrl ? (
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                          View
                        </a>
                      ) : (
                        <Status status={v.status} dot={false} className="shrink-0" />
                      )}
                    </li>
                  )
                })}
              </ul>
            </Panel>
          </div>

          <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
            <Panel>
              <PanelHead title="Medical details" sub="From the patient's own profile and your notes" />
              <Row label="Allergies">{allergy ? <span className="text-[#B42318]">{allergy}</span> : <span className="text-[#98A2B3]">None recorded</span>}</Row>
              <Row label="Blood group">{facts?.bloodGroup ?? <span className="text-[#98A2B3]">Not added</span>}</Row>
              <Row label="Date of birth">{facts?.dateOfBirth ? formatShortDate(facts.dateOfBirth) : <span className="text-[#98A2B3]">Not added</span>}</Row>
              <Row label="Sex">{facts?.gender ?? <span className="text-[#98A2B3]">Not added</span>}</Row>
              <Row label="Emergency contact">
                {facts?.emergencyName ? (
                  `${facts.emergencyName}${facts.emergencyRelation ? ` (${facts.emergencyRelation})` : ''}${facts.emergencyPhone ? ` · ${facts.emergencyPhone}` : ''}`
                ) : (
                  <span className="text-[#98A2B3]">Not added</span>
                )}
              </Row>
            </Panel>

            <Panel>
              <PanelHead title="Reports & files" sub={files.length ? undefined : 'Prescriptions you send and files you attach appear here'} />
              {files.length === 0 ? (
                <EmptyLine>No files yet.</EmptyLine>
              ) : (
                <ul>
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-extrabold truncate">{f.title}</span>
                        <span className="block text-[12px] text-[#5B667A]">{f.date ? formatShortDate(f.date) : 'Date not recorded'}</span>
                      </span>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </DocBody>

      {/* Phones: the next step stays in reach at the bottom */}
      {(prescribe || hasLeft) && (
        <div className={`lg:hidden fixed z-40 inset-x-0 bottom-0 grid ${prescribe && hasLeft ? 'grid-cols-[1fr_1.6fr]' : 'grid-cols-1'} gap-2.5 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-white border-t border-[#E6EBF3] shadow-[0_-8px_20px_rgba(11,27,63,0.06)] print:hidden`}>
          {hasLeft && leftButton('h-12 px-3 text-[13.5px]')}
          {rxButton('h-12 px-3 text-[13.5px]')}
        </div>
      )}
    </>
  )
}
