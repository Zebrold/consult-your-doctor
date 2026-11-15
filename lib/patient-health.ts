import type { createAdminClient } from '@/lib/supabase/admin'

// The patient's "My health" data: medical details, family members, emergency contacts and their own uploaded records
// (supabase/migrations/20261116_patient_health.sql). Each loader says `ready: false` until the migration has run, so
// the pages can say a feature is being set up instead of failing.

type Admin = ReturnType<typeof createAdminClient>

// 42P01 / PGRST205: no such table. 42703 / PGRST204: no such column.
export const missingTable = (error: { code?: string } | null | undefined) => ['42P01', 'PGRST205'].includes(error?.code ?? '')
export const missingColumn = (error: { code?: string; message?: string } | null | undefined) =>
  ['42703', 'PGRST204'].includes(error?.code ?? '') || /column .* does not exist|Could not find the .* column/i.test(error?.message ?? '')
export const notMigrated = (error: { code?: string; message?: string } | null | undefined) => missingTable(error) || missingColumn(error)

/** Meal times (minutes after midnight, IST) used until the patient sets their own. */
export const MEAL_DEFAULTS = { breakfast: 8 * 60, lunch: 13 * 60 + 30, dinner: 20 * 60 + 30 }
export type Meals = typeof MEAL_DEFAULTS

export type HealthDetails = {
  bloodGroup: string | null
  dateOfBirth: string | null
  gender: string | null
  address: string | null
  allergies: string | null
  conditions: string | null
  currentMedicines: string | null
  heightCm: number | null
  /** The emergency contact saved with the patient's details. */
  emergency: { name: string; relation: string | null; phone: string | null } | null
  meals: Meals
  /** False until the 20261116 columns exist (allergies, conditions, meal times). */
  extended: boolean
}

type DetailsRow = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

export async function loadHealthDetails(admin: Admin, patientId: string): Promise<HealthDetails> {
  // `*` so the page works whether or not the new columns exist yet.
  const { data } = await admin.from('patient_details').select('*').eq('id', patientId).maybeSingle()
  const r = (data ?? {}) as DetailsRow
  const name = str(r.emergency_contact_name)
  return {
    bloodGroup: str(r.blood_group),
    dateOfBirth: str(r.date_of_birth),
    gender: str(r.gender),
    address: str(r.address),
    allergies: str(r.allergies),
    conditions: str(r.conditions),
    currentMedicines: str(r.current_medicines),
    heightCm: num(r.height_cm),
    emergency: name ? { name, relation: str(r.emergency_contact_relation), phone: str(r.emergency_contact_phone) } : null,
    meals: {
      breakfast: num(r.breakfast_at) ?? MEAL_DEFAULTS.breakfast,
      lunch: num(r.lunch_at) ?? MEAL_DEFAULTS.lunch,
      dinner: num(r.dinner_at) ?? MEAL_DEFAULTS.dinner,
    },
    extended: data ? 'allergies' in r : true,
  }
}

// --- Family members ------------------------------------------------------------------------------------------------

export const RELATIONS = { spouse: 'Spouse', child: 'Child', parent: 'Parent', sibling: 'Sibling', other: 'Other' } as const
export type Relation = keyof typeof RELATIONS
/** The account holder plus up to this many people. */
export const FAMILY_LIMIT = 6

export type FamilyMember = {
  id: string
  name: string
  relation: Relation
  dateOfBirth: string | null
  gender: string | null
  bloodGroup: string | null
  phone: string | null
  allergies: string | null
  conditions: string | null
}

type FamilyRow = {
  id: string
  full_name: string
  relation: Relation
  date_of_birth: string | null
  gender: string | null
  blood_group: string | null
  phone: string | null
  allergies: string | null
  conditions: string | null
}

const toMember = (r: FamilyRow): FamilyMember => ({
  id: r.id,
  name: r.full_name,
  relation: r.relation,
  dateOfBirth: r.date_of_birth,
  gender: r.gender,
  bloodGroup: r.blood_group,
  phone: r.phone,
  allergies: r.allergies,
  conditions: r.conditions,
})

export async function loadFamily(admin: Admin, patientId: string): Promise<{ ready: boolean; members: FamilyMember[] }> {
  const { data, error } = await admin
    .from('family_members')
    .select('id, full_name, relation, date_of_birth, gender, blood_group, phone, allergies, conditions')
    .eq('patient_id', patientId)
    .order('created_at')
  if (error) {
    if (!missingTable(error)) console.error('loadFamily:', error)
    return { ready: !missingTable(error), members: [] }
  }
  return { ready: true, members: ((data ?? []) as FamilyRow[]).map(toMember) }
}

/** Family members by id, for naming who a booking is for (staff lists, slips). Empty before the migration. */
export async function familyNames(admin: Admin, ids: (string | null | undefined)[]): Promise<Record<string, { name: string; relation: Relation }>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))]
  if (wanted.length === 0) return {}
  const { data, error } = await admin.from('family_members').select('id, full_name, relation').in('id', wanted)
  if (error) return {}
  return Object.fromEntries(((data ?? []) as { id: string; full_name: string; relation: Relation }[]).map((r) => [r.id, { name: r.full_name, relation: r.relation }]))
}

// --- Emergency contacts ----------------------------------------------------------------------------------------------

export type EmergencyContact = {
  /** Null for the contact saved with the patient's details (edited from the profile). */
  id: string | null
  name: string
  relation: string | null
  phone: string | null
}

export async function loadContacts(admin: Admin, patientId: string, details: HealthDetails): Promise<{ ready: boolean; contacts: EmergencyContact[] }> {
  const primary: EmergencyContact[] = details.emergency ? [{ id: null, ...details.emergency }] : []
  const { data, error } = await admin.from('emergency_contacts').select('id, full_name, relation, phone').eq('patient_id', patientId).order('created_at')
  if (error) {
    if (!missingTable(error)) console.error('loadContacts:', error)
    return { ready: !missingTable(error), contacts: primary }
  }
  const more = ((data ?? []) as { id: string; full_name: string; relation: string | null; phone: string }[]).map((r) => ({ id: r.id, name: r.full_name, relation: r.relation, phone: r.phone }))
  return { ready: true, contacts: [...primary, ...more] }
}

// --- Records the patient uploads --------------------------------------------------------------------------------------

export const RECORD_KINDS = {
  prescription: 'Prescription',
  lab_report: 'Lab report',
  scan: 'Scan',
  vaccination: 'Vaccination',
  other: 'Other',
} as const
export type RecordKind = keyof typeof RECORD_KINDS

export const uploadPath = (patientId: string, recordId: string) => `patient-uploads/${patientId}/${recordId}`

export type UploadedRecord = {
  id: string
  title: string
  kind: RecordKind
  date: string | null
  provider: string | null
  path: string
  familyMemberId: string | null
  createdAt: string
}

export async function loadUploads(admin: Admin, patientId: string): Promise<{ ready: boolean; records: UploadedRecord[] }> {
  const { data, error } = await admin
    .from('patient_records')
    .select('id, title, record_type, record_date, provider, file_path, family_member_id, created_at')
    .eq('patient_id', patientId)
    .order('record_date', { ascending: false, nullsFirst: false })
  if (error) {
    if (!missingTable(error)) console.error('loadUploads:', error)
    return { ready: !missingTable(error), records: [] }
  }
  type Row = { id: string; title: string; record_type: RecordKind; record_date: string | null; provider: string | null; file_path: string; family_member_id: string | null; created_at: string }
  return {
    ready: true,
    records: ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.record_type,
      date: r.record_date,
      provider: r.provider,
      path: r.file_path,
      familyMemberId: r.family_member_id,
      createdAt: r.created_at,
    })),
  }
}

/** "8:00 AM" for minutes after midnight. */
export function clockTime(minutes: number) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
