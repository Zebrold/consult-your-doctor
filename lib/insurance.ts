import type { createAdminClient } from '@/lib/supabase/admin'

// A patient's health insurance policy, kept as a digital card on their profile (patient_insurance,
// supabase/migrations/20261103_patient_insurance.sql). The hospitals they book see it on their patient list. Claims and
// cashless approval are between the hospital and the insurer: the site never files a claim. The patient can keep track of
// their own claims on the Insurance page (insurance_claims, 20261116).

type Admin = ReturnType<typeof createAdminClient>

export type InsurancePolicy = {
  insurer: string
  policyNumber: string
  holderName: string | null
  memberId: string | null
  /** yyyy-mm-dd */
  validUntil: string | null
  // Policy details the patient adds on the Insurance page (20261116); null until then.
  planType: 'individual' | 'family_floater' | 'group' | 'government' | null
  sumInsured: number | null
  tpaName: string | null
  tpaPhone: string | null
  roomRent: string | null
  coPayment: string | null
  /** Family members (family_members ids) the policy covers besides the patient. */
  coveredMemberIds: string[]
  /** False until the 20261116 policy detail columns exist. */
  extended: boolean
}

type Row = {
  patient_id: string
  insurer: string
  policy_number: string
  holder_name: string | null
  member_id: string | null
  valid_until: string | null
  plan_type?: InsurancePolicy['planType']
  sum_insured?: number | string | null
  tpa_name?: string | null
  tpa_phone?: string | null
  room_rent?: string | null
  co_payment?: string | null
  covered_member_ids?: string[] | null
}

// `*` so the policy details added by 20261116 come through once they exist, and nothing breaks before.
const COLUMNS = '*'

const toPolicy = (r: Row): InsurancePolicy => ({
  insurer: r.insurer,
  policyNumber: r.policy_number,
  holderName: r.holder_name,
  memberId: r.member_id,
  validUntil: r.valid_until,
  planType: r.plan_type ?? null,
  sumInsured: r.sum_insured == null || r.sum_insured === '' ? null : Number(r.sum_insured),
  tpaName: r.tpa_name ?? null,
  tpaPhone: r.tpa_phone ?? null,
  roomRent: r.room_rent ?? null,
  coPayment: r.co_payment ?? null,
  coveredMemberIds: Array.isArray(r.covered_member_ids) ? r.covered_member_ids : [],
  extended: 'plan_type' in r,
})

// 42P01 / PGRST205: the table hasn't been created yet.
export const missingInsuranceTable = (error: { code?: string } | null | undefined) => ['42P01', 'PGRST205'].includes(error?.code ?? '')

/** The patient's saved policy. `ready` is false until the migration has run, so the profile can say so. */
export async function loadInsurance(admin: Admin, patientId: string): Promise<{ ready: boolean; policy: InsurancePolicy | null }> {
  const { data, error } = await admin.from('patient_insurance').select(COLUMNS).eq('patient_id', patientId).maybeSingle()
  if (error) {
    if (!missingInsuranceTable(error)) console.error('loadInsurance:', error)
    return { ready: !missingInsuranceTable(error), policy: null }
  }
  return { ready: true, policy: data ? toPolicy(data as Row) : null }
}

/** Saved policies for these patients, by patient id (the hospital's patient list). Empty before the migration. */
export async function loadInsuranceFor(admin: Admin, patientIds: string[]): Promise<Record<string, InsurancePolicy>> {
  if (patientIds.length === 0) return {}
  const { data, error } = await admin.from('patient_insurance').select(COLUMNS).in('patient_id', patientIds)
  if (error) {
    if (!missingInsuranceTable(error)) console.error('loadInsuranceFor:', error)
    return {}
  }
  return Object.fromEntries(((data ?? []) as Row[]).map((r) => [r.patient_id, toPolicy(r)]))
}

/** The policy has a validity date in the past (`today` as yyyy-mm-dd, IST). */
export const policyExpired = (p: InsurancePolicy, today: string) => !!p.validUntil && p.validUntil < today

/** "Star Health · Policy 1234 5678", for one-line lists. */
export const insuranceLine = (p: InsurancePolicy) => `${p.insurer} · Policy ${p.policyNumber}`

/** Insurer names the partner hospitals list, to suggest while typing. */
export async function knownInsurers(admin: Admin): Promise<string[]> {
  const { data, error } = await admin.from('hospitals').select('insurance_accepted').eq('status', 'active')
  if (error) return []
  const names = new Map<string, string>()
  for (const row of (data ?? []) as { insurance_accepted: unknown }[]) {
    if (!Array.isArray(row.insurance_accepted)) continue
    for (const n of row.insurance_accepted) {
      const name = typeof n === 'string' ? n.trim() : ''
      if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name)
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b))
}

/** The kinds of plan a patient can say their policy is. */
export const PLAN_LABEL: Record<NonNullable<InsurancePolicy['planType']>, string> = {
  individual: 'Individual',
  family_floater: 'Family floater',
  group: 'Group (employer)',
  government: 'Government scheme',
}
