import { ageFrom } from '@/components/patient/format'
import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

export type PatientFacts = {
  bloodGroup: string | null
  dateOfBirth: string | null
  gender: string | null
  address: string | null
  emergencyName: string | null
  emergencyRelation: string | null
  emergencyPhone: string | null
}

/** Details patients keep on their own profile (blood group, date of birth, emergency contact, …). */
export async function loadPatientFacts(admin: Admin, patientIds: string[]): Promise<Record<string, PatientFacts>> {
  if (patientIds.length === 0) return {}
  const { data } = await admin
    .from('patient_details')
    .select('id, blood_group, date_of_birth, gender, address, emergency_contact_name, emergency_contact_relation, emergency_contact_phone')
    .in('id', patientIds)
  const facts: Record<string, PatientFacts> = {}
  for (const d of (data ?? []) as Record<string, string | null>[]) {
    facts[d.id as string] = {
      bloodGroup: d.blood_group,
      dateOfBirth: d.date_of_birth,
      gender: d.gender,
      address: d.address,
      emergencyName: d.emergency_contact_name,
      emergencyRelation: d.emergency_contact_relation,
      emergencyPhone: d.emergency_contact_phone,
    }
  }
  return facts
}

/** "58y • F" from the patient's own profile, or null when they haven't filled it in. */
export function ageSex(facts: PatientFacts | undefined, now: number) {
  if (!facts) return null
  const age = ageFrom(facts.dateOfBirth, now)
  const sex = facts.gender ? facts.gender[0].toUpperCase() : null
  return [age != null ? `${age}y` : null, sex].filter(Boolean).join(' • ') || null
}
