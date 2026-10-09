import type { createAdminClient } from '@/lib/supabase/admin'
import { ageFrom, doctorName } from '@/components/patient/format'
import { renderPrescriptionPdf, type PrescriptionDoc } from '@/lib/pdf/prescription'
import { RECORD_BUCKET, storeRecordFile } from '@/lib/records'
import { vitalsSentence } from '@/lib/vitals'
import { notifyReportReady } from '@/lib/notify/patient'
import { blankMedicine, filledMedicines, listItems, medicineLine, type Medicine } from '@/lib/rx'

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

export type PrescriptionInput = {
  appointmentId: string
  diagnosis: string
  /** Structured medicines from the prescription writer, or free text (one per line) from the walk-in form. */
  medicines: Medicine[] | string
  advice: string
  allergy?: string
  complaints?: string
  findings?: string
  investigations?: string
  /** "YYYY-MM-DD" */
  followUp?: string | null
  referral?: string
  vitals: { bp?: string; spo2?: string; hr?: string; rr?: string; temp?: string; weight?: string; height?: string }
}

type VisitRow = {
  id: string
  patient_id: string
  hospitals: Joined<{ name: string; address: string | null; city: string | null }>
  doctors: Joined<{ id: string; specialty: string | null; qualifications: string | null; registration_number?: string | null; registration_council?: string | null; profiles: Joined<{ full_name: string | null }> }>
  patient: Joined<{ full_name: string | null; phone_number: string | null }>
}

const medicineText = (m: PrescriptionInput['medicines']) => (typeof m === 'string' ? m.trim() : filledMedicines(m).map(medicineLine).join('\n'))

/** The visit's notes in the text form the portals read (vitals sentence included), for searching and older screens. */
export function prescriptionNotes(input: Omit<PrescriptionInput, 'appointmentId'>) {
  const meds = medicineText(input.medicines)
  return [
    input.complaints?.trim() && `Complaints: ${input.complaints.trim()}.`,
    input.findings?.trim() && `Findings: ${input.findings.trim()}.`,
    input.diagnosis.trim(),
    input.allergy?.trim() && `Allergy: ${input.allergy.trim()}.`,
    meds && `Rx: ${meds.replace(/\n/g, '; ')}`,
    input.investigations?.trim() && `Tests: ${listItems(input.investigations).join(', ')}.`,
    input.advice.trim() && `Advice: ${input.advice.trim()}`,
    input.followUp && `Follow-up: ${input.followUp}.`,
    input.referral?.trim() && `Referral: ${input.referral.trim()}.`,
    vitalsSentence(input.vitals),
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * The next prescription number, "RX0000000001", from the database sequence (20261010 migration). Before that
 * migration a number is made from the clock, which is unique in practice but not consecutive.
 */
export async function nextPrescriptionNo(admin: Admin) {
  const { data, error } = await admin.rpc('next_prescription_no')
  if (!error && typeof data === 'string' && /^RX\d{10}$/.test(data)) return data
  return `RX${String(Date.now()).slice(-10)}`
}

// The doctor's signature lives in the private records bucket, one file per doctor, and is only read on the server to
// print on their prescriptions.
export const signaturePath = (doctorId: string) => `signatures/${doctorId}`

export async function loadSignature(admin: Admin, doctorId: string): Promise<PrescriptionDoc['doctor']['signature']> {
  const { data, error } = await admin.storage.from(RECORD_BUCKET).download(signaturePath(doctorId))
  if (error || !data) return null
  const type = data.type === 'image/png' ? 'png' : data.type === 'image/jpeg' ? 'jpg' : null
  return type ? { bytes: new Uint8Array(await data.arrayBuffer()), type } : null
}

/** "Plot 12, Banjara Hills", "Hyderabad", "India" */
const clinicLines = (h: { address: string | null; city: string | null } | null) => [h?.address, h?.city, 'India']

/**
 * Writes the prescription for a visit: a PDF in the patient's records (which their profile shows), the notes on the
 * visit, and the PDF sent to the patient on WhatsApp and by email.
 */
export async function issuePrescription(admin: Admin, input: PrescriptionInput): Promise<{ ok: true; prescriptionNo: string } | { ok: false; error: string }> {
  // The doctor's registration (20261009) is a newer column; fall back to a select without it on older databases.
  const select = (withRegistration: boolean) =>
    admin
      .from('appointments')
      .select(
        `id, patient_id, hospitals ( name, address, city ),
         doctors ( id, specialty, qualifications${withRegistration ? ', registration_number, registration_council' : ''}, profiles!doctors_profile_id_fkey ( full_name ) ),
         patient:profiles!appointments_patient_id_fkey ( full_name, phone_number )`,
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
  const [{ data: facts }, number, signature] = await Promise.all([
    admin.from('patient_details').select('date_of_birth, gender').eq('id', visit.patient_id).maybeSingle(),
    nextPrescriptionNo(admin),
    doctor ? loadSignature(admin, doctor.id) : Promise.resolve(null),
  ])
  const notes = prescriptionNotes(input)
  const code = input.appointmentId.slice(0, 8).toUpperCase()
  const drName = doctorName(one(doctor?.profiles)?.full_name ?? 'Doctor')

  const pdf = await renderPrescriptionPdf({
    number,
    code,
    issuedAt: new Date(),
    doctor: { name: drName, registration: doctor?.registration_number ?? null, council: doctor?.registration_council ?? null, signature },
    clinic: { name: hospital?.name ?? 'Consult Your Doctor', lines: clinicLines(hospital) },
    patient: {
      name: patient?.full_name ?? 'Patient',
      sex: facts?.gender ? facts.gender.charAt(0).toUpperCase() + facts.gender.slice(1).toLowerCase() : null,
      dateOfBirth: facts?.date_of_birth ?? null,
      age: ageFrom(facts?.date_of_birth ?? null, Date.now()),
      phone: patient?.phone_number ?? null,
    },
    vitals: input.vitals,
    complaints: input.complaints ?? null,
    findings: input.findings ?? null,
    diagnosis: input.diagnosis || null,
    allergy: input.allergy ?? null,
    medicines: typeof input.medicines === 'string' ? [] : filledMedicines(input.medicines),
    medicinesText: typeof input.medicines === 'string' ? input.medicines : null,
    investigations: listItems(input.investigations),
    advice: listItems(input.advice),
    followUp: input.followUp ?? null,
    referral: input.referral ?? null,
  })

  const path = `prescriptions/${input.appointmentId}/${number}.pdf`
  try {
    await storeRecordFile(admin, path, pdf, 'application/pdf')
  } catch (err) {
    console.error('issuePrescription upload:', err)
    return { ok: false, error: 'Could not save the prescription PDF. Please try again.' }
  }

  // prescription_no arrives with the 20261010 migration; save without it on older databases.
  const record = { appointment_id: input.appointmentId, document_type: 'prescription', notes, file_url: path }
  let { error: insertError } = await admin.from('medical_records').insert({ ...record, prescription_no: number })
  if (insertError && /prescription_no|schema cache/i.test(insertError.message)) ({ error: insertError } = await admin.from('medical_records').insert(record))
  if (insertError) {
    console.error('issuePrescription record:', insertError)
    await admin.storage.from(RECORD_BUCKET).remove([path])
    return { ok: false, error: 'Could not save the prescription. Please try again.' }
  }

  notifyReportReady({
    patientId: visit.patient_id,
    what: 'prescription',
    from: hospital?.name ? `${drName}, ${hospital.name}` : drName,
    path,
    filename: `Prescription-${number}.pdf`,
    contentType: 'application/pdf',
    file: pdf,
  })
  return { ok: true, prescriptionNo: number }
}

/**
 * A sample prescription with the doctor's own letterhead, registration and signature, so they can check their
 * template before seeing patients. Nothing is saved or sent.
 */
export async function prescriptionTemplatePdf(
  admin: Admin,
  doctor: { id: string; name: string; registrationNumber: string | null; registrationCouncil: string | null; hospital: { name: string; address: string | null; city: string | null } | null },
) {
  const sample = (m: Partial<Medicine>): Medicine => ({ ...blankMedicine(), ...m })
  return renderPrescriptionPdf({
    number: 'RX0000000000',
    code: 'SAMPLE',
    issuedAt: new Date(),
    doctor: { name: doctorName(doctor.name), registration: doctor.registrationNumber, council: doctor.registrationCouncil, signature: await loadSignature(admin, doctor.id) },
    clinic: { name: doctor.hospital?.name ?? 'Your clinic', lines: clinicLines(doctor.hospital) },
    patient: { name: 'Sample Patient', sex: 'Female', dateOfBirth: '1990-03-15', age: ageFrom('1990-03-15', Date.now()), phone: '+919876543210' },
    vitals: { bp: '120/80', hr: '76', rr: '16', spo2: '98', temp: '98.6', weight: '62', height: '160' },
    complaints: 'Fever since 2 days, Sore throat: painful swallowing',
    findings: null,
    diagnosis: 'Sample diagnosis (this is a template preview)',
    allergy: null,
    medicines: [
      sample({ name: 'Dolo 650', generic: 'Paracetamol', form: 'Tab.', dose: '650 mg', frequency: '1-1-1', duration: '3 days', timing: 'After food' }),
      sample({ name: 'Cetzine', generic: 'Cetirizine', form: 'Tab.', dose: '10 mg', frequency: '0-0-1', duration: '5 days', timing: 'At bedtime' }),
    ],
    medicinesText: null,
    investigations: [],
    advice: ['Drink plenty of fluids'],
    followUp: null,
    referral: null,
  })
}
