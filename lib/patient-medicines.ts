import type { createAdminClient } from '@/lib/supabase/admin'
import { doctorName } from '@/components/patient/format'
import { loadPatientVisits, type PatientVisit, type VisitRecord } from '@/lib/patient-visits'
import { courseDay, finished, prescribedMedicines, slotMinutes, slotsToday, SLOT_LABEL, type PrescribedMedicine, type Slot } from '@/lib/medicine-schedule'
import type { Meals } from '@/lib/patient-health'

type Admin = ReturnType<typeof createAdminClient>

export type Prescription = { visit: PatientVisit; record: VisitRecord; medicines: PrescribedMedicine[] }

/** The patient's prescriptions with their medicines, newest first, and the visits they came from. */
export async function loadPrescriptions(admin: Admin, patientId: string): Promise<{ visits: PatientVisit[]; prescriptions: Prescription[] }> {
  const visits = await loadPatientVisits(admin, patientId)
  const prescriptions: Prescription[] = []
  for (const visit of visits) {
    for (const record of visit.records) {
      if (record.kind !== 'prescription') continue
      const medicines = prescribedMedicines(
        { id: record.id, notes: record.notes, medicines: record.medicines, prescription_no: record.prescriptionNo },
        { id: visit.id, date: visit.date, doctor: visit.doctor ? doctorName(visit.doctor.name) : null, hospital: visit.hospital?.name ?? null },
      )
      if (medicines.length) prescriptions.push({ visit, record, medicines })
    }
  }
  return { visits, prescriptions }
}

/** Medicines whose course runs today (or that are taken when needed and were prescribed in the last 30 days). */
export function activeMedicines(prescriptions: Prescription[], today: string) {
  return prescriptions.flatMap((p) => p.medicines.filter((m) => courseDay(m, today) != null))
}

export function finishedMedicines(prescriptions: Prescription[], today: string) {
  return prescriptions.flatMap((p) => p.medicines.filter((m) => finished(m, today)))
}

export type DoseSlot = { key: string; slot: Slot; minutes: number; medicine: PrescribedMedicine }

/** Today's doses, in time order. */
export function dosesToday(medicines: PrescribedMedicine[], today: string, meals: Meals): DoseSlot[] {
  return medicines
    .flatMap((m) => slotsToday(m, today).map((slot) => ({ key: `${m.key}:${slot}`, slot, minutes: slotMinutes(slot, m.timing, meals), medicine: m })))
    .sort((a, b) => a.minutes - b.minutes || a.medicine.name.localeCompare(b.medicine.name))
}

export const slotLabel = (slot: Slot) => SLOT_LABEL[slot]

/** The tests the doctor advised in a prescription's notes ("Tests: CBC, Lipid profile."). */
export function advisedTests(notes: string | null | undefined): string[] {
  const m = /Tests: (.*?)\.(?= [A-Z][a-z-]+: |$)/.exec(notes ?? '')
  return m ? m[1].split(/,\s*/).map((t) => t.trim()).filter(Boolean) : []
}

/** When the doctor asked to see the patient again ("Follow-up: after 2 weeks."). */
export function followUpNote(notes: string | null | undefined): string | null {
  return /Follow-up: (.*?)\.(?= [A-Z][a-z-]+: |$)/.exec(notes ?? '')?.[1]?.trim() || null
}
