import type { createAdminClient } from '@/lib/supabase/admin'
import { ageFrom, doctorName } from '@/components/patient/format'
import { renderClinicalPdf } from '@/lib/pdf/clinical'
import { storeRecordFile } from '@/lib/records'
import { parseVitals, vitalsList, vitalsSentence } from '@/lib/vitals'
import { notifyReportReady } from '@/lib/notify/patient'

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

export type PrescriptionInput = {
  appointmentId: string
  diagnosis: string
  medicines: string
  advice: string
  allergy?: string
  vitals: { bp?: string; spo2?: string; hr?: string; temp?: string; weight?: string; height?: string }
}

type VisitRow = {
  id: string
  patient_id: string
  schedules: Joined<{ start_time: string }>
  hospitals: Joined<{ name: string; address: string | null; city: string | null }>
  doctors: Joined<{ specialty: string | null; qualifications: string | null; profiles: Joined<{ full_name: string | null }> }>
  patient: Joined<{ full_name: string | null; phone_number: string | null; patient_code?: string | null }>
}

/** The visit's notes in the text form the portals read (vitals sentence included), for searching and older screens. */
export function prescriptionNotes(input: Omit<PrescriptionInput, 'appointmentId'>) {
  return [
    input.diagnosis.trim(),
    input.allergy?.trim() && `Allergy: ${input.allergy.trim()}.`,
    input.medicines.trim() && `Rx: ${input.medicines.trim()}`,
    input.advice.trim() && `Advice: ${input.advice.trim()}`,
    vitalsSentence(input.vitals),
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Writes the prescription for a visit: a PDF in the patient's records (which their profile shows), the notes on the
 * visit, and the PDF sent to the patient on WhatsApp and by email.
 */
export async function issuePrescription(admin: Admin, input: PrescriptionInput): Promise<{ ok: true } | { ok: false; error: string }> {
  // patient_code arrives with the 20261008 migration; fall back to a select without it on older databases.
  const select = (withCode: boolean) =>
    admin
      .from('appointments')
      .select(
        `id, patient_id, schedules ( start_time ), hospitals ( name, address, city ),
         doctors ( specialty, qualifications, profiles!doctors_profile_id_fkey ( full_name ) ),
         patient:profiles!appointments_patient_id_fkey ( full_name, phone_number${withCode ? ', patient_code' : ''} )`,
      )
      .eq('id', input.appointmentId)
      .maybeSingle()
  let { data, error } = await select(true)
  if (error) ({ data, error } = await select(false))
  const visit = data as unknown as VisitRow | null
  if (!visit) return { ok: false, error: 'Visit not found.' }

  const patient = one(visit.patient)
  const doctor = one(visit.doctors)
  const hospital = one(visit.hospitals)
  const { data: facts } = await admin.from('patient_details').select('date_of_birth, gender, blood_group').eq('id', visit.patient_id).maybeSingle()
  const age = ageFrom(facts?.date_of_birth ?? null, Date.now())
  const notes = prescriptionNotes(input)
  const code = input.appointmentId.slice(0, 8).toUpperCase()
  const drName = doctorName(one(doctor?.profiles)?.full_name ?? 'Doctor')
  const visitAt = one(visit.schedules)?.start_time

  const pdf = await renderClinicalPdf({
    title: 'PRESCRIPTION',
    reference: `#${code}`,
    issuedAt: new Date(),
    organisation: { name: hospital?.name ?? 'Consult Your Doctor', lines: [hospital?.address, hospital?.city] },
    panels: [
      {
        title: 'Patient',
        rows: [
          ['Name', patient?.full_name ?? 'Patient'],
          ['Patient ID', patient?.patient_code ?? `CYD-${visit.patient_id.slice(0, 8).toUpperCase()}`],
          ['Age / Sex', [age != null ? `${age} years` : null, facts?.gender].filter(Boolean).join(' / ') || null],
          ['Blood group', facts?.blood_group],
          ['Phone', patient?.phone_number],
        ],
      },
      {
        title: 'Doctor',
        rows: [
          ['Name', drName],
          ['Specialty', doctor?.specialty],
          ['Qualifications', doctor?.qualifications],
          ['Visit', visitAt ? new Date(visitAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : null],
        ],
      },
    ],
    vitals: vitalsList(parseVitals(vitalsSentence(input.vitals))),
    sections: [
      { heading: 'Diagnosis & notes', body: input.diagnosis },
      { heading: 'Allergies', body: input.allergy },
      { heading: 'Medicines (Rx)', body: input.medicines },
      { heading: 'Advice & follow-up', body: input.advice },
    ],
    signature: { name: drName, lines: [doctor?.specialty, doctor?.qualifications, 'Electronically generated prescription'] },
    note: `Generated electronically through Consult Your Doctor for booking #${code}. Take medicines only as prescribed, and contact your doctor if symptoms get worse. In an emergency call 112.`,
  })

  const path = `prescriptions/${input.appointmentId}/${Date.now()}.pdf`
  try {
    await storeRecordFile(admin, path, pdf, 'application/pdf')
  } catch (err) {
    console.error('issuePrescription upload:', err)
    return { ok: false, error: 'Could not save the prescription PDF. Please try again.' }
  }

  const { error: insertError } = await admin.from('medical_records').insert({ appointment_id: input.appointmentId, document_type: 'prescription', notes, file_url: path })
  if (insertError) {
    console.error('issuePrescription record:', insertError)
    await admin.storage.from('medical_records').remove([path])
    return { ok: false, error: 'Could not save the prescription. Please try again.' }
  }

  notifyReportReady({
    patientId: visit.patient_id,
    what: 'prescription',
    from: hospital?.name ? `${drName}, ${hospital.name}` : drName,
    path,
    filename: `Prescription-${code}.pdf`,
    contentType: 'application/pdf',
    file: pdf,
  })
  return { ok: true }
}
