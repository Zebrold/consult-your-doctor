'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { indianMobile } from '@/lib/patient-onboarding'
import { migrationHint } from '@/lib/desk-payments'
import { BED_STATUS, BED_TYPES } from '@/lib/beds'
import type { DeskResult } from '@/components/portal/desk-types'

// The hospital's inpatient beds: add and edit beds by ward, admit a patient to a bed under a doctor, move them to
// another bed and discharge them. Every change shows up on the doctor's and the patient's pages as well.

const fail = (error: string) => ({ ok: false as const, error })
const NOT_SIGNED_IN = 'Please sign in with your hospital account.'

async function hospitalContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  return { admin, hospitalId: profile.hospital_id as string, userId: user.id }
}

function revalidateBedPages() {
  for (const path of ['/hospital/beds', '/hospital/dashboard', '/hospital/profile', '/doctor/dashboard', '/doctor/patients', '/doctor/profile', '/patient/profile']) {
    revalidatePath(path)
  }
}

function saveError(error: { code?: string; message?: string }, fallback: string) {
  if (error.code === '23505') return 'A bed with that ward and label already exists, or the patient already has a bed.'
  return migrationHint(error) ?? fallback
}

const text = (max: number) => z.string().trim().max(max)

const AddBeds = z.object({
  ward: text(60).min(1, 'Enter the ward name, e.g. General Ward or ICU.'),
  type: z.enum(Object.keys(BED_TYPES) as [string, ...string[]]),
  prefix: text(20),
  start: z.number().int().min(0).max(9999),
  count: z.number().int().min(1, 'Add at least one bed.').max(200, 'Add up to 200 beds at a time.'),
  dailyRate: z.number().min(0).max(10_000_000).nullable(),
})

/** Adds `count` beds to a ward, labelled prefix + number ("Bed 1", "Bed 2", …). */
export async function addBeds(input: z.input<typeof AddBeds>): Promise<DeskResult<{ added: number }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const parsed = AddBeds.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the bed details.')
  const { ward, type, prefix, start, count, dailyRate } = parsed.data

  const { data: existing } = await ctx.admin.from('hospital_beds').select('label').eq('hospital_id', ctx.hospitalId).eq('ward', ward)
  const taken = new Set(((existing ?? []) as { label: string }[]).map((b) => b.label.toLowerCase()))
  const rows: Record<string, unknown>[] = []
  for (let n = start; rows.length < count && n < start + count + taken.size + 1; n++) {
    const label = `${prefix ? `${prefix} ` : ''}${n}`.trim().slice(0, 30)
    if (taken.has(label.toLowerCase())) continue
    rows.push({ hospital_id: ctx.hospitalId, ward, label, bed_type: type, daily_rate: dailyRate, status: 'available' })
  }
  if (!rows.length) return fail('Those bed labels already exist in this ward.')

  const { error } = await ctx.admin.from('hospital_beds').insert(rows)
  if (error) {
    console.error('addBeds:', error)
    return fail(saveError(error, 'Could not add the beds. Please try again.'))
  }
  revalidateBedPages()
  return { ok: true, added: rows.length }
}

const UpdateBed = z.object({
  bedId: z.guid(),
  ward: text(60).min(1, 'Enter the ward name.'),
  label: text(30).min(1, 'Enter the bed label.'),
  type: z.enum(Object.keys(BED_TYPES) as [string, ...string[]]),
  dailyRate: z.number().min(0).max(10_000_000).nullable(),
  status: z.enum(BED_STATUS),
})

/** Renames a bed, moves it to another ward or changes its type, charge or availability. */
export async function updateBed(input: z.input<typeof UpdateBed>): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const parsed = UpdateBed.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the bed details.')
  const { bedId, ward, label, type, dailyRate, status } = parsed.data

  const { data, error } = await ctx.admin
    .from('hospital_beds')
    .update({ ward, label, bed_type: type, daily_rate: dailyRate, status })
    .eq('id', bedId)
    .eq('hospital_id', ctx.hospitalId)
    .select('id')
  if (error) {
    console.error('updateBed:', error)
    return fail(saveError(error, 'Could not save the bed. Please try again.'))
  }
  if (!data?.length) return fail('Bed not found.')
  revalidateBedPages()
  return { ok: true }
}

/** Removes a bed that nobody is in. Its past admissions go with it. */
export async function removeBed(bedId: string): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { data: active } = await ctx.admin.from('bed_allocations').select('id').eq('bed_id', bedId).is('discharged_at', null).limit(1)
  if (active?.length) return fail('Discharge or move the patient in this bed first.')
  const { data, error } = await ctx.admin.from('hospital_beds').delete().eq('id', bedId).eq('hospital_id', ctx.hospitalId).select('id')
  if (error) {
    console.error('removeBed:', error)
    return fail(saveError(error, 'Could not remove the bed. Please try again.'))
  }
  if (!data?.length) return fail('Bed not found.')
  revalidateBedPages()
  return { ok: true }
}

/** Patients for the admit dialog: everyone with a visit at this hospital, most recent first. */
export async function hospitalPatientOptions(): Promise<DeskResult<{ patients: { id: string; name: string; phone: string | null; doctorId: string | null }[] }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { data: doctors } = await ctx.admin.from('doctors').select('id').eq('hospital_id', ctx.hospitalId)
  const ids = ((doctors ?? []) as { id: string }[]).map((d) => d.id)
  const scope = ids.length ? `hospital_id.eq.${ctx.hospitalId},doctor_id.in.(${ids.join(',')})` : `hospital_id.eq.${ctx.hospitalId}`
  const { data } = await ctx.admin
    .from('appointments')
    .select('doctor_id, created_at, patient:profiles!appointments_patient_id_fkey ( id, full_name, phone_number )')
    .or(scope)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1000)
  const seen = new Map<string, { id: string; name: string; phone: string | null; doctorId: string | null }>()
  for (const row of (data ?? []) as unknown as { doctor_id: string | null; patient: { id: string; full_name: string | null; phone_number: string | null } | { id: string; full_name: string | null; phone_number: string | null }[] | null }[]) {
    const p = Array.isArray(row.patient) ? row.patient[0] : row.patient
    if (p && !seen.has(p.id)) seen.set(p.id, { id: p.id, name: p.full_name || 'Patient', phone: p.phone_number, doctorId: row.doctor_id })
  }
  return { ok: true, patients: Array.from(seen.values()).slice(0, 400) }
}

/** Finds a registered patient by mobile number, for admitting someone who hasn't had a visit here yet. */
export async function findPatientByPhone(rawPhone: string): Promise<DeskResult<{ patient: { id: string; name: string; phone: string } }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const phone = indianMobile(rawPhone)
  if (!phone) return fail('Enter a 10-digit Indian mobile number.')
  const digits = phone.slice(3)
  const { data } = await ctx.admin
    .from('profiles')
    .select('id, full_name, phone_number, role')
    .in('phone_number', [phone, digits, `91${digits}`, `0${digits}`])
    .eq('role', 'patient')
    .limit(1)
  const p = (data ?? [])[0] as { id: string; full_name: string | null; phone_number: string } | undefined
  if (!p) return fail('No patient account uses that number. Register them first with Add Patient on the Patients page.')
  return { ok: true, patient: { id: p.id, name: p.full_name || 'Patient', phone } }
}

const Admit = z.object({
  bedId: z.guid(),
  patientId: z.guid({ message: 'Choose the patient.' }),
  doctorId: z.guid({ message: 'Choose the attending doctor.' }),
  reason: text(500),
  notes: text(2000),
  expectedDischarge: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

/** Admits a patient to a free bed under one of the hospital's doctors. */
export async function admitPatient(input: z.input<typeof Admit>): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const parsed = Admit.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the admission details.')
  const v = parsed.data

  const [{ data: bed }, { data: doctor }, { data: patient }] = await Promise.all([
    ctx.admin.from('hospital_beds').select('id, status').eq('id', v.bedId).eq('hospital_id', ctx.hospitalId).maybeSingle(),
    ctx.admin.from('doctors').select('id').eq('id', v.doctorId).eq('hospital_id', ctx.hospitalId).maybeSingle(),
    ctx.admin.from('profiles').select('id, role').eq('id', v.patientId).maybeSingle(),
  ])
  if (!bed) return fail('Bed not found.')
  if (bed.status !== 'available') return fail('This bed is marked for cleaning or maintenance. Make it available first.')
  if (!doctor) return fail('Choose one of your hospital’s doctors.')
  if (!patient || patient.role !== 'patient') return fail('Patient not found.')

  const { error } = await ctx.admin.from('bed_allocations').insert({
    bed_id: v.bedId,
    hospital_id: ctx.hospitalId,
    patient_id: v.patientId,
    doctor_id: v.doctorId,
    reason: v.reason || null,
    notes: v.notes || null,
    expected_discharge: v.expectedDischarge,
    created_by: ctx.userId,
  })
  if (error) {
    console.error('admitPatient:', error)
    if (error.code === '23505') return fail('That bed was just taken, or this patient already has a bed. Refresh and check the board.')
    return fail(saveError(error, 'Could not admit the patient. Please try again.'))
  }
  revalidateBedPages()
  return { ok: true }
}

/** Moves an admitted patient to another free bed: the old stay ends and a new one begins with the same details. */
export async function transferPatient(input: { allocationId: string; bedId: string }): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const [{ data: current }, { data: bed }] = await Promise.all([
    ctx.admin
      .from('bed_allocations')
      .select('id, bed_id, patient_id, doctor_id, appointment_id, reason, notes, expected_discharge')
      .eq('id', input.allocationId)
      .eq('hospital_id', ctx.hospitalId)
      .is('discharged_at', null)
      .maybeSingle(),
    ctx.admin.from('hospital_beds').select('id, status').eq('id', input.bedId).eq('hospital_id', ctx.hospitalId).maybeSingle(),
  ])
  if (!current) return fail('This admission has already ended.')
  if (!bed) return fail('Bed not found.')
  if (bed.id === current.bed_id) return fail('Choose a different bed.')
  if (bed.status !== 'available') return fail('That bed isn’t available.')
  const { data: busy } = await ctx.admin.from('bed_allocations').select('id').eq('bed_id', bed.id).is('discharged_at', null).limit(1)
  if (busy?.length) return fail('That bed was just taken. Choose another.')

  const now = new Date().toISOString()
  const { error: endError } = await ctx.admin.from('bed_allocations').update({ discharged_at: now, notes: [current.notes, 'Moved to another bed.'].filter(Boolean).join(' ') }).eq('id', current.id).is('discharged_at', null)
  if (endError) return fail(saveError(endError, 'Could not move the patient. Please try again.'))
  const { error } = await ctx.admin.from('bed_allocations').insert({
    bed_id: bed.id,
    hospital_id: ctx.hospitalId,
    patient_id: current.patient_id,
    doctor_id: current.doctor_id,
    appointment_id: current.appointment_id,
    reason: current.reason,
    notes: current.notes,
    expected_discharge: current.expected_discharge,
    admitted_at: now,
    created_by: ctx.userId,
  })
  if (error) {
    console.error('transferPatient:', error)
    // Put the patient back in the old bed rather than leave them without one.
    await ctx.admin.from('bed_allocations').update({ discharged_at: null, notes: current.notes }).eq('id', current.id)
    return fail(saveError(error, 'Could not move the patient. Please try again.'))
  }
  revalidateBedPages()
  return { ok: true }
}

/** Discharges the patient. The bed goes to cleaning, or straight back to available. */
export async function dischargePatient(input: { allocationId: string; nextStatus: 'available' | 'cleaning'; notes: string }): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { data: current } = await ctx.admin
    .from('bed_allocations')
    .select('id, bed_id, notes')
    .eq('id', input.allocationId)
    .eq('hospital_id', ctx.hospitalId)
    .is('discharged_at', null)
    .maybeSingle()
  if (!current) return fail('This patient has already been discharged.')
  const notes = [current.notes, input.notes.trim().slice(0, 1000)].filter(Boolean).join(' ').slice(0, 2000) || null
  const { error } = await ctx.admin.from('bed_allocations').update({ discharged_at: new Date().toISOString(), notes }).eq('id', current.id).is('discharged_at', null)
  if (error) {
    console.error('dischargePatient:', error)
    return fail(saveError(error, 'Could not discharge the patient. Please try again.'))
  }
  await ctx.admin.from('hospital_beds').update({ status: input.nextStatus === 'cleaning' ? 'cleaning' : 'available' }).eq('id', current.bed_id).eq('hospital_id', ctx.hospitalId)
  revalidateBedPages()
  return { ok: true }
}
