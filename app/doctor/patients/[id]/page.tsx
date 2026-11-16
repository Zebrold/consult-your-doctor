import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileText, Phone } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { ageFrom, formatShortDate, formatSlot, formatTime, initials, istDateKey, visitToken } from '@/components/patient/format'
import { vitalsList } from '@/lib/vitals'
import { latestVitals, loadPatientFacts, loadVisits, patientCode, requireDoctor, visitName, type Visit } from '../../_lib/doctor'
import { latestAllergy, readNotes } from '../../_lib/notes'
import { CallLink, CheckInButton, PrescriptionButton, type VisitRef } from '../../_components/VisitControls'
import { DocBackHeader, DocBody, EmptyLine, Panel, PanelHead, Row, Status, card, visitStatus } from '../../_components/doc-ui'

export const metadata: Metadata = { title: 'Patient record | Doctor Portal' }
export const dynamic = 'force-dynamic'

const PAID = ['confirmed', 'visited', 'completed']
const ref = (v: Visit): VisitRef => ({ id: v.id, status: v.status, patientName: visitName(v), phone: v.patient?.phone ?? null })

/** A patient's record as their doctor sees it: who they are, their latest readings and notes, every visit and file. */
export default async function DoctorPatientRecord(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  // Only patients who booked and paid for a visit with this doctor have a record here.
  const visits = (await loadVisits(admin, doctor.id)).filter((v) => v.patient?.id === id && PAID.includes(v.status) && !v.recordsHidden)
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

  // The writer shows the patient's known allergy in its header.
  const vref = (v: Visit): VisitRef => ({ ...ref(v), allergy })
  const prescribe = active ?? lastCompleted
  const rxButton = (size?: string) =>
    prescribe ? (
      <PrescriptionButton visit={vref(prescribe)} kind="primary" label={prescribe.status === 'completed' ? 'Update prescription' : 'Write prescription'} size={size} />
    ) : null
  const hasLeft = active?.status === 'confirmed' || !!patient.phone
  const leftButton = (size?: string) =>
    active?.status === 'confirmed' ? <CheckInButton visit={vref(active)} kind="outline" label="Check in" size={size} /> : <CallLink phone={patient.phone} name={patient.name} size={size} />

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
        <Link href="/doctor/patients" className="hidden lg:inline-flex items-center gap-1.5 mb-3.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
          <ChevronLeft className="w-4 h-4" strokeWidth={2.6} />
          All patients
        </Link>
        <div className={`hidden lg:flex ${card} p-[22px] mb-5 items-center gap-5`}>
          <span aria-hidden className="shrink-0 w-[68px] h-[68px] rounded-full bg-[#EEF3FF] text-[#2A4DD0] text-[22px] font-extrabold flex items-center justify-center">
            {initials(patient.name)}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight truncate">{patient.name}</h1>
            <p className="mt-1 text-[14px] text-[#5B667A]">{[identity, facts?.bloodGroup ? `Blood group ${facts.bloodGroup}` : null].filter(Boolean).join(' · ')}</p>
            {(activeLine || allergy) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-[18px] gap-y-1">
                {activeLine && active && <Status color={visitStatus(active.status).color} label={activeLine} />}
                {allergy && <span className="text-[12.5px] font-extrabold text-[#B42318]">Allergy: {allergy}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <CallLink phone={patient.phone} name={patient.name} />
            {active?.status === 'confirmed' && <CheckInButton visit={vref(active)} kind="outline" label="Check in" />}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 lg:gap-3">
                  {vitalsList(vitals).map((r) => (
                    <div key={r.label} className="py-2.5 border-b border-[#EEF2F7] lg:px-4 lg:py-3.5 lg:rounded-xl lg:bg-[#F7F9FC] lg:shadow-[inset_0_0_0_1px_#EEF2F7] lg:border-b-0">
                      <span className="block text-[11.5px] lg:text-[12px] font-bold text-[#5B667A]">{r.label}</span>
                      <span className="block mt-0.5 text-[15px] font-extrabold lg:mt-1 lg:text-[18px]">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHead title="Visits with you" sub={`${visits.length} ${visits.length === 1 ? 'visit' : 'visits'}`} />
              <div className="hidden lg:grid grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1.2fr)_90px] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
                <span>Date</span>
                <span>Diagnosis</span>
                <span>Treatment</span>
                <span>View</span>
              </div>
              <ul>
                {newestFirst.map((v) => {
                  const n = v.records.map((r) => readNotes(r.notes)).find((x) => x.diagnosis || x.complaints || x.rx)
                  const file = v.records.find((r) => r.fileUrl)
                  const title = n?.diagnosis || n?.complaints || (v.status === 'completed' ? 'No notes recorded' : visitStatus(v.status).label)
                  const sub = n?.rx ?? (v.start ? `${formatTime(v.start)} · Token ${visitToken(v.id)}` : `Token ${visitToken(v.id)}`)
                  return (
                    <li key={v.id} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7] lg:grid lg:grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1.2fr)_90px] lg:gap-4 lg:py-[13px]">
                      <span className="shrink-0 w-[84px] lg:w-auto text-[12.5px] lg:text-[13.5px] font-extrabold">{v.start ? formatShortDate(v.start) : '—'}</span>
                      <span className="flex-1 min-w-0 lg:contents">
                        <span className="block text-[13.5px] font-extrabold truncate">{title}</span>
                        <span className="block text-[12px] lg:text-[13.5px] text-[#5B667A] truncate">{sub}</span>
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
                      <span aria-hidden className="hidden lg:flex shrink-0 w-[38px] h-[38px] rounded-[10px] bg-[#EEF3FF] text-[#2A4DD0] items-center justify-center">
                        <FileText className="w-[18px] h-[18px]" />
                      </span>
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
