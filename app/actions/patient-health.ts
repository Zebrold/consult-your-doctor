'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RECORD_BUCKET, RECORD_MAX_BYTES, RECORD_TYPES } from '@/lib/records'
import { FAMILY_LIMIT, RELATIONS, missingTable, notMigrated, uploadPath } from '@/lib/patient-health'

// The patient's "My health" changes: medical details, meal times, emergency contacts, family members, uploaded records,
// doses marked as taken, insurance policy details and the claim tracker. Every action checks the signed-in user and
// only touches that patient's own rows (written with the service role, as the tables give the public API no access).

type Result = { ok: true; id?: string } | { ok: false; error: string }

const NOT_READY = 'This is still being set up. Please try again later.'
const fail = (error: string): Result => ({ ok: false, error })

async function patient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { id: user.id, admin: createAdminClient() } : null
}

const opt = (max: number) => z.string().trim().max(max).transform((s) => s || null).nullable().optional()
const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s()-]/g, ''))
  .refine((s) => /^\+?\d{10,13}$/.test(s), 'Enter a 10-digit mobile number.')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.')
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function touch(...paths: string[]) {
  for (const p of paths) revalidatePath(p)
}

// --- Medical details and meal times ----------------------------------------------------------------------------------

const Details = z.object({
  bloodGroup: z.string().trim().refine((v) => !v || BLOOD.includes(v), 'Choose a blood group.').optional(),
  allergies: opt(300),
  conditions: opt(300),
  currentMedicines: opt(300),
  heightCm: z.union([z.number().min(30).max(260), z.null()]).optional(),
})

export async function saveMedicalDetails(input: z.input<typeof Details>): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const parsed = Details.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const d = parsed.data
  const row = {
    id: me.id,
    ...(d.bloodGroup !== undefined ? { blood_group: d.bloodGroup || null } : {}),
    allergies: d.allergies ?? null,
    conditions: d.conditions ?? null,
    current_medicines: d.currentMedicines ?? null,
    height_cm: d.heightCm ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await me.admin.from('patient_details').upsert(row, { onConflict: 'id' })
  if (error) {
    if (notMigrated(error)) return fail(NOT_READY)
    console.error('saveMedicalDetails:', error)
    return fail('Could not save your details. Please try again.')
  }
  touch('/patient/profile', '/patient/emergency')
  return { ok: true }
}

const Meals = z.object({
  breakfast: z.number().int().min(0).max(1439),
  lunch: z.number().int().min(0).max(1439),
  dinner: z.number().int().min(0).max(1439),
})

export async function saveMealTimes(input: z.input<typeof Meals>): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const parsed = Meals.safeParse(input)
  if (!parsed.success) return fail('Choose times for your meals.')
  const { breakfast, lunch, dinner } = parsed.data
  const { error } = await me.admin
    .from('patient_details')
    .upsert({ id: me.id, breakfast_at: breakfast, lunch_at: lunch, dinner_at: dinner, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return fail(notMigrated(error) ? NOT_READY : 'Could not save your meal times.')
  touch('/patient/reminders')
  return { ok: true }
}

// --- Emergency contacts ----------------------------------------------------------------------------------------------

const Contact = z.object({ name: z.string().trim().min(2, 'Enter their name.').max(80), relation: opt(40), phone })

export async function addEmergencyContact(input: z.input<typeof Contact>): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const parsed = Contact.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the contact.')
  const { count } = await me.admin.from('emergency_contacts').select('id', { count: 'exact', head: true }).eq('patient_id', me.id)
  if ((count ?? 0) >= 5) return fail('You can keep up to 5 more emergency contacts.')
  const { data, error } = await me.admin
    .from('emergency_contacts')
    .insert({ patient_id: me.id, full_name: parsed.data.name, relation: parsed.data.relation ?? null, phone: parsed.data.phone })
    .select('id')
    .single()
  if (error) return fail(missingTable(error) ? NOT_READY : 'Could not add the contact.')
  touch('/patient/emergency')
  return { ok: true, id: data.id }
}

export async function removeEmergencyContact(id: string): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const { error } = await me.admin.from('emergency_contacts').delete().eq('id', id).eq('patient_id', me.id)
  if (error) return fail('Could not remove the contact.')
  touch('/patient/emergency')
  return { ok: true }
}

// --- Family members --------------------------------------------------------------------------------------------------

const Member = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Enter their full name.').max(80),
  relation: z.enum(Object.keys(RELATIONS) as [keyof typeof RELATIONS, ...(keyof typeof RELATIONS)[]]),
  dateOfBirth: isoDate.nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).nullable().optional(),
  bloodGroup: z.string().trim().refine((v) => !v || BLOOD.includes(v), 'Choose a blood group.').nullable().optional(),
  phone: z.union([phone, z.literal('').transform(() => null)]).nullable().optional(),
  allergies: opt(300),
  conditions: opt(300),
})

export async function saveFamilyMember(input: z.input<typeof Member>): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const parsed = Member.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const m = parsed.data
  if (m.dateOfBirth && m.dateOfBirth > new Date().toISOString().slice(0, 10)) return fail('The date of birth can’t be in the future.')
  const row = {
    full_name: m.name,
    relation: m.relation,
    date_of_birth: m.dateOfBirth ?? null,
    gender: m.gender ?? null,
    blood_group: m.bloodGroup || null,
    phone: m.phone ?? null,
    allergies: m.allergies ?? null,
    conditions: m.conditions ?? null,
    updated_at: new Date().toISOString(),
  }
  if (m.id) {
    const { error } = await me.admin.from('family_members').update(row).eq('id', m.id).eq('patient_id', me.id)
    if (error) return fail(missingTable(error) ? NOT_READY : 'Could not save the changes.')
    touch('/patient/family')
    return { ok: true, id: m.id }
  }
  const { count, error: countError } = await me.admin.from('family_members').select('id', { count: 'exact', head: true }).eq('patient_id', me.id)
  if (countError) return fail(missingTable(countError) ? NOT_READY : 'Could not add the family member.')
  if ((count ?? 0) >= FAMILY_LIMIT) return fail(`You can add up to ${FAMILY_LIMIT} family members.`)
  const { data, error } = await me.admin.from('family_members').insert({ patient_id: me.id, ...row }).select('id').single()
  if (error) return fail('Could not add the family member.')
  touch('/patient/family', '/patient/profile')
  return { ok: true, id: data.id }
}

export async function removeFamilyMember(id: string): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const { error } = await me.admin.from('family_members').delete().eq('id', id).eq('patient_id', me.id)
  if (error) return fail('Could not remove the family member.')
  touch('/patient/family', '/patient/profile')
  return { ok: true }
}

// --- Records the patient uploads -------------------------------------------------------------------------------------

const KINDS = ['prescription', 'lab_report', 'scan', 'vaccination', 'other'] as const

export async function uploadPatientRecord(form: FormData): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return fail('Choose a file to upload.')
  if (file.size > RECORD_MAX_BYTES) return fail('The file must be under 5 MB.')
  if (!RECORD_TYPES[file.type]) return fail('Upload a PDF, JPG, PNG or WEBP file.')
  const title = String(form.get('title') ?? '').trim().slice(0, 120)
  if (title.length < 2) return fail('Give the record a name, e.g. “Blood test, March”.')
  const kind = String(form.get('kind') ?? '')
  if (!(KINDS as readonly string[]).includes(kind)) return fail('Choose what kind of record it is.')
  const date = String(form.get('date') ?? '')
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Enter a valid date.')
  const provider = String(form.get('provider') ?? '').trim().slice(0, 120) || null
  const memberId = String(form.get('member') ?? '') || null

  if (memberId) {
    const { data: member } = await me.admin.from('family_members').select('id').eq('id', memberId).eq('patient_id', me.id).maybeSingle()
    if (!member) return fail('Choose who the record is for.')
  }

  const id = crypto.randomUUID()
  const path = uploadPath(me.id, id)
  const { error: upError } = await me.admin.storage.from(RECORD_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (upError) {
    console.error('uploadPatientRecord storage:', upError)
    return fail('Could not upload the file. Please try again.')
  }
  const { error } = await me.admin.from('patient_records').insert({
    id,
    patient_id: me.id,
    family_member_id: memberId,
    title,
    record_type: kind,
    record_date: date || null,
    provider,
    file_path: path,
    file_type: file.type,
  })
  if (error) {
    await me.admin.storage.from(RECORD_BUCKET).remove([path])
    return fail(missingTable(error) ? NOT_READY : 'Could not save the record.')
  }
  touch('/patient/records')
  return { ok: true, id }
}

export async function removePatientRecord(id: string): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const { data } = await me.admin.from('patient_records').select('file_path').eq('id', id).eq('patient_id', me.id).maybeSingle()
  if (!data) return fail('Record not found.')
  const { error } = await me.admin.from('patient_records').delete().eq('id', id).eq('patient_id', me.id)
  if (error) return fail('Could not remove the record.')
  await me.admin.storage.from(RECORD_BUCKET).remove([data.file_path])
  touch('/patient/records')
  return { ok: true }
}

// --- Doses marked as taken -------------------------------------------------------------------------------------------

const Dose = z.object({ key: z.string().regex(/^[0-9a-f-]{36}:\d{1,2}:(morning|afternoon|evening|night)$/), date: isoDate, taken: z.boolean() })

export async function markDose(input: z.input<typeof Dose>): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const parsed = Dose.safeParse(input)
  if (!parsed.success) return fail('Something went wrong. Please refresh the page.')
  const { key, date, taken } = parsed.data
  const recordId = key.split(':')[0]
  // The prescription must be from one of this patient's own visits.
  const { data: rec } = await me.admin.from('medical_records').select('id, appointments!inner ( patient_id )').eq('id', recordId).maybeSingle()
  const owner = rec ? (Array.isArray(rec.appointments) ? rec.appointments[0] : rec.appointments) as { patient_id: string } | null : null
  if (!owner || owner.patient_id !== me.id) return fail('Medicine not found.')
  const { error } = taken
    ? await me.admin.from('medicine_doses').upsert({ patient_id: me.id, dose_key: key, dose_date: date, taken_at: new Date().toISOString() }, { onConflict: 'patient_id,dose_key,dose_date' })
    : await me.admin.from('medicine_doses').delete().eq('patient_id', me.id).eq('dose_key', key).eq('dose_date', date)
  if (error) return fail(missingTable(error) ? NOT_READY : 'Could not save that. Please try again.')
  touch('/patient/reminders')
  return { ok: true }
}

// --- Insurance policy details and claims ------------------------------------------------------------------------------

const Policy = z.object({
  planType: z.enum(['individual', 'family_floater', 'group', 'government']).nullable(),
  sumInsured: z.number().min(0).max(100_000_000).nullable(),
  tpaName: opt(120),
  tpaPhone: z.union([phone, z.literal('').transform(() => null)]).nullable().optional(),
  roomRent: opt(80),
  coPayment: opt(80),
  coveredMemberIds: z.array(z.string().uuid()).max(FAMILY_LIMIT),
})

export async function saveInsuranceDetails(input: z.input<typeof Policy>): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const parsed = Policy.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the policy details.')
  const p = parsed.data
  if (p.coveredMemberIds.length) {
    const { data: members } = await me.admin.from('family_members').select('id').eq('patient_id', me.id).in('id', p.coveredMemberIds)
    if ((members ?? []).length !== p.coveredMemberIds.length) return fail('Choose family members from your account.')
  }
  const { data, error } = await me.admin
    .from('patient_insurance')
    .update({
      plan_type: p.planType,
      sum_insured: p.sumInsured,
      tpa_name: p.tpaName ?? null,
      tpa_phone: p.tpaPhone ?? null,
      room_rent: p.roomRent ?? null,
      co_payment: p.coPayment ?? null,
      covered_member_ids: p.coveredMemberIds,
      updated_at: new Date().toISOString(),
    })
    .eq('patient_id', me.id)
    .select('patient_id')
  if (error) return fail(notMigrated(error) ? NOT_READY : 'Could not save the policy details.')
  if (!data?.length) return fail('Add your insurance card first.')
  touch('/patient/insurance', '/patient/profile')
  return { ok: true }
}

const CLAIM_STATUSES = ['preparing', 'submitted', 'in_review', 'documents_needed', 'approved', 'settled', 'rejected'] as const
const CLAIM_DOCS_MAX = 12
const claimDocPath =(patientId: string, claimId: string, name: string) => `claims/${patientId}/${claimId}/${crypto.randomUUID()}-${name.replace(/[^\w.-]+/g, '_').slice(-60)}`

/** Starts a claim to keep track of, with the documents for it. Nothing is sent to an insurer. */
export async function startClaim(form: FormData): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const type = String(form.get('type') ?? '')
  if (type !== 'cashless' && type !== 'reimbursement') return fail('Choose how you were treated.')
  const hospital = String(form.get('hospital') ?? '').trim().slice(0, 120)
  if (hospital.length < 2) return fail('Enter the hospital or lab.')
  const treatedOn = String(form.get('treatedOn') ?? '')
  if (treatedOn && !/^\d{4}-\d{2}-\d{2}$/.test(treatedOn)) return fail('Enter a valid date.')
  const amountRaw = String(form.get('amount') ?? '').replace(/,/g, '').trim()
  const amount = amountRaw ? Number(amountRaw) : null
  if (amount != null && !(amount >= 0 && amount < 100_000_000)) return fail('Enter the claim amount in rupees.')
  const claimNumber = String(form.get('claimNumber') ?? '').trim().slice(0, 60) || null

  // One request carries at most 5 MB of files (next.config.ts); more documents are added one at a time afterwards.
  const files = form.getAll('documents').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > CLAIM_DOCS_MAX) return fail(`Attach up to ${CLAIM_DOCS_MAX} documents.`)
  if (files.reduce((s, f) => s + f.size, 0) > RECORD_MAX_BYTES) return fail('Attach up to 5 MB now. You can add more documents to the claim afterwards.')
  for (const f of files) {
    if (!RECORD_TYPES[f.type]) return fail(`${f.name}: upload a PDF, JPG, PNG or WEBP file.`)
  }

  const id = crypto.randomUUID()
  const documents: { name: string; path: string }[] = []
  for (const f of files) {
    const path = claimDocPath(me.id, id, f.name)
    const { error } = await me.admin.storage.from(RECORD_BUCKET).upload(path, f, { contentType: f.type })
    if (error) {
      if (documents.length) await me.admin.storage.from(RECORD_BUCKET).remove(documents.map((d) => d.path))
      return fail('Could not upload the documents. Please try again.')
    }
    documents.push({ name: f.name.slice(0, 80), path })
  }
  const { error } = await me.admin.from('insurance_claims').insert({
    id,
    patient_id: me.id,
    claim_type: type,
    claim_number: claimNumber,
    hospital_name: hospital,
    treated_on: treatedOn || null,
    amount,
    status: claimNumber ? 'submitted' : 'preparing',
    documents,
  })
  if (error) {
    if (documents.length) await me.admin.storage.from(RECORD_BUCKET).remove(documents.map((d) => d.path))
    return fail(missingTable(error) ? NOT_READY : 'Could not save the claim.')
  }
  touch('/patient/insurance')
  return { ok: true, id }
}

/** Adds one document (up to 5 MB) to a claim the patient keeps track of. */
export async function addClaimDocument(form: FormData): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const claimId = String(form.get('claim') ?? '')
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return fail('Choose a file to add.')
  if (file.size > RECORD_MAX_BYTES) return fail('The file must be under 5 MB.')
  if (!RECORD_TYPES[file.type]) return fail('Upload a PDF, JPG, PNG or WEBP file.')
  const { data: claim } = await me.admin.from('insurance_claims').select('id, documents').eq('id', claimId).eq('patient_id', me.id).maybeSingle()
  if (!claim) return fail('Claim not found.')
  const documents = (Array.isArray(claim.documents) ? claim.documents : []) as { name: string; path: string }[]
  if (documents.length >= CLAIM_DOCS_MAX) return fail(`A claim can keep up to ${CLAIM_DOCS_MAX} documents.`)
  const path = claimDocPath(me.id, claim.id, file.name)
  const { error: upError } = await me.admin.storage.from(RECORD_BUCKET).upload(path, file, { contentType: file.type })
  if (upError) return fail('Could not upload the document. Please try again.')
  const { error } = await me.admin
    .from('insurance_claims')
    .update({ documents: [...documents, { name: file.name.slice(0, 80), path }], updated_at: new Date().toISOString() })
    .eq('id', claim.id)
    .eq('patient_id', me.id)
  if (error) {
    await me.admin.storage.from(RECORD_BUCKET).remove([path])
    return fail('Could not save the document.')
  }
  touch('/patient/insurance')
  return { ok: true }
}

const ClaimUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(CLAIM_STATUSES),
  claimNumber: opt(60),
  settledAmount: z.number().min(0).max(100_000_000).nullable().optional(),
})

export async function updateClaim(input: z.input<typeof ClaimUpdate>): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const parsed = ClaimUpdate.safeParse(input)
  if (!parsed.success) return fail('Check the claim details.')
  const c = parsed.data
  const { data, error } = await me.admin
    .from('insurance_claims')
    .update({
      status: c.status,
      ...(c.claimNumber !== undefined ? { claim_number: c.claimNumber } : {}),
      settled_amount: c.status === 'settled' || c.status === 'approved' ? c.settledAmount ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', c.id)
    .eq('patient_id', me.id)
    .select('id')
  if (error || !data?.length) return fail('Could not update the claim.')
  touch('/patient/insurance')
  return { ok: true }
}

export async function removeClaim(id: string): Promise<Result> {
  const me = await patient()
  if (!me) return fail('Please log in again.')
  const { data } = await me.admin.from('insurance_claims').select('documents').eq('id', id).eq('patient_id', me.id).maybeSingle()
  if (!data) return fail('Claim not found.')
  const { error } = await me.admin.from('insurance_claims').delete().eq('id', id).eq('patient_id', me.id)
  if (error) return fail('Could not remove the claim.')
  const paths = (Array.isArray(data.documents) ? data.documents : []).map((d: { path?: string }) => d.path).filter((p): p is string => !!p)
  if (paths.length) await me.admin.storage.from(RECORD_BUCKET).remove(paths)
  touch('/patient/insurance')
  return { ok: true }
}

// --- Who a booking is for -----------------------------------------------------------------------------------------------

/** The signed-in patient's family members, for the "Who is this for?" choice on the booking pages. Empty when none. */
export async function familyForBooking(): Promise<{ id: string; name: string; relation: string }[]> {
  const me = await patient()
  if (!me) return []
  const { data, error } = await me.admin.from('family_members').select('id, full_name, relation').eq('patient_id', me.id).order('created_at')
  if (error) return []
  return ((data ?? []) as { id: string; full_name: string; relation: string }[]).map((m) => ({ id: m.id, name: m.full_name, relation: RELATIONS[m.relation as keyof typeof RELATIONS] ?? 'Family' }))
}
