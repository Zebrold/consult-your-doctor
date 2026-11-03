'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { missingInsuranceTable } from '@/lib/insurance'

// A patient's health insurance card on their profile (lib/insurance.ts): add or change it, or remove it.

type Result = { success: true } | { success: false; error: string }
const fail = (error: string): Result => ({ success: false, error })
const NEEDS_UPDATE = 'Insurance details open up after the latest database update (supabase/migrations/20261103_patient_insurance.sql).'

export type InsuranceInput = {
  insurer: string
  policyNumber: string
  holderName?: string | null
  memberId?: string | null
  /** yyyy-mm-dd, or empty */
  validUntil?: string | null
}

/** The signed-in patient, or null for a visitor or a staff account. */
async function patientId(): Promise<string | null> {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return null
  const { data: profile } = await createAdminClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return !profile?.role || profile.role === 'patient' ? user.id : null
}

function refresh() {
  for (const path of ['/patient/profile', '/patient/insurance', '/hospital/patients']) revalidatePath(path)
}

export async function savePatientInsurance(input: InsuranceInput): Promise<Result> {
  const id = await patientId()
  if (!id) return fail('Please log in to your patient account.')

  const clean = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max + 1)
  const insurer = clean(input?.insurer, 120)
  const policyNumber = clean(input?.policyNumber, 60).toUpperCase()
  const holderName = clean(input?.holderName, 120) || null
  const memberId = clean(input?.memberId, 60).toUpperCase() || null
  const validUntil = String(input?.validUntil ?? '').trim() || null

  if (insurer.length < 2 || insurer.length > 120) return fail('Enter your insurance company.')
  if (policyNumber.length < 3 || policyNumber.length > 60) return fail('Enter the policy number from your insurance card.')
  if (holderName && holderName.length > 120) return fail('Keep the name under 120 characters.')
  if (memberId && memberId.length > 60) return fail('Keep the member ID under 60 characters.')
  if (validUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || Number.isNaN(Date.parse(`${validUntil}T00:00:00Z`)))) {
    return fail('Enter the date the policy is valid until, or leave it blank.')
  }

  const now = new Date().toISOString()
  const { error } = await createAdminClient()
    .from('patient_insurance')
    .upsert({ patient_id: id, insurer, policy_number: policyNumber, holder_name: holderName, member_id: memberId, valid_until: validUntil, updated_at: now })
  if (error) {
    if (missingInsuranceTable(error)) return fail(NEEDS_UPDATE)
    console.error('savePatientInsurance:', error)
    return fail('Could not save your insurance details. Please try again.')
  }
  refresh()
  return { success: true }
}

export async function removePatientInsurance(): Promise<Result> {
  const id = await patientId()
  if (!id) return fail('Please log in to your patient account.')
  const { error } = await createAdminClient().from('patient_insurance').delete().eq('patient_id', id)
  if (error) {
    if (missingInsuranceTable(error)) return fail(NEEDS_UPDATE)
    console.error('removePatientInsurance:', error)
    return fail('Could not remove your insurance details. Please try again.')
  }
  refresh()
  return { success: true }
}
