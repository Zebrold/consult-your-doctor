'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrAssignDiagnosticCenterCode, getOrAssignHospitalCode } from '@/lib/organization-ids'
import { createStaffLogin, passwordProblem, provisionDoctor } from '@/lib/provisioning'
import { siteUrl } from '@/lib/site-url'
import { sendPartnerApprovedEmail } from '@/lib/notify/email'
import type { PartnerKind } from '@/lib/partner-applications'

// The executive portal runs the partner network: it adds hospitals and diagnostic centres (each with the sign-in its
// own staff use) and creates doctor accounts at any hospital.

type Fail = { success: false; error: string }
const fail = (error: string): Fail => ({ success: false, error })

/** The signed-in executive, checked against the database on every call (these are public endpoints). */
async function executiveCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'executive' ? { user, admin } : null
}

const NOT_ALLOWED = 'Only the operations team can manage the partner network. Please log in with your executive account.'

const text = (max: number) => z.string().trim().max(max)
const orgSchema = z.object({
  name: text(160).min(2, 'Enter the name.'),
  city: text(80).min(2, 'Enter the city.'),
  address: text(300).optional().default(''),
  contactEmail: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid contact email.')]).optional().default(''),
  adminName: text(120).optional().default(''),
  staffId: z.union([z.literal(''), z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,24}$/, 'A staff ID uses 4-24 letters, numbers or dashes.')]).optional().default(''),
  password: z.string().max(128),
})

const field = (form: FormData, name: string) => String(form.get(name) ?? '')

function readOrg(form: FormData) {
  return orgSchema.safeParse({
    name: field(form, 'name'),
    city: field(form, 'city'),
    address: field(form, 'address'),
    contactEmail: field(form, 'contactEmail'),
    adminName: field(form, 'adminName'),
    staffId: field(form, 'staffId'),
    password: field(form, 'password'),
  })
}

// The contact column is required; organisations without a public address get a placeholder on the internal domain.
const placeholderEmail = (name: string) => `info@${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40) || 'partner'}.internal`

export type CreatedOrg = { success: true; id: string; code: string; staffId: string }

/**
 * When the hospital or centre was added from a partner application (/signup/hospital, /signup/diagnostic-centre),
 * marks the application approved and tells the applicant their staff ID. Not exported: only the actions below call it.
 */
async function completeApplication(
  caller: NonNullable<Awaited<ReturnType<typeof executiveCaller>>>,
  form: FormData,
  kind: PartnerKind,
  organizationId: string,
  staffId: string,
) {
  const applicationId = field(form, 'applicationId')
  if (!z.string().uuid().safeParse(applicationId).success) return
  const { data: app, error } = await caller.admin
    .from('partner_applications')
    .update({ status: 'approved', organization_id: organizationId, reviewed_by: caller.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', applicationId)
    .eq('kind', kind)
    .eq('status', 'pending')
    .select('email, contact_name, organization_name')
    .maybeSingle()
  if (error) return console.error('completeApplication:', error)
  if (!app) return
  await sendPartnerApprovedEmail({
    to: app.email,
    contactName: app.contact_name,
    organizationName: app.organization_name,
    kind,
    staffId,
    signInUrl: `${siteUrl()}/login/${kind === 'hospital' ? 'hospital' : 'diagnostic'}`,
  }).catch((err) => console.error('Failed to send partner approval email:', err))
}

export async function createHospital(form: FormData): Promise<CreatedOrg | Fail> {
  const caller = await executiveCaller()
  if (!caller) return fail(NOT_ALLOWED)
  const parsed = readOrg(form)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const org = parsed.data
  const weak = passwordProblem(org.password)
  if (weak) return fail(weak)
  const { admin } = caller

  const { data: hospital, error } = await admin
    .from('hospitals')
    .insert({ name: org.name, city: org.city, address: org.address || null, contact_email: org.contactEmail || placeholderEmail(org.name), status: 'active' })
    .select('id')
    .single()
  if (error || !hospital) {
    console.error('createHospital:', error)
    return fail('Could not add the hospital. Please try again.')
  }

  const login = await createStaffLogin(admin, {
    role: 'hospital_admin',
    fullName: org.adminName || `${org.name} Admin`,
    password: org.password,
    hospitalId: hospital.id,
    staffId: org.staffId || undefined,
  })
  if ('error' in login) {
    // Without its sign-in the hospital can't be managed, so take it back out and let the form be sent again.
    await admin.from('hospitals').delete().eq('id', hospital.id)
    return fail(login.error)
  }

  // The usual departments, so doctors can be added straight away.
  await admin.from('departments').insert(
    ['General Medicine', 'Cardiology', 'Neurology', 'Orthopaedics', 'Pediatrics'].map((name) => ({ hospital_id: hospital.id, name })),
  )
  const code = await getOrAssignHospitalCode(admin, hospital.id)
  await completeApplication(caller, form, 'hospital', hospital.id, login.staffId)
  for (const path of ['/executive/hospitals', '/executive/doctors', '/hospitals']) revalidatePath(path)
  return { success: true, id: hospital.id, code, staffId: login.staffId }
}

const priceListSchema = z
  .array(z.object({ name: text(80).min(2), price: z.coerce.number().min(0).max(1_000_000) }))
  .max(200)

export async function createDiagnosticCenter(form: FormData): Promise<CreatedOrg | Fail> {
  const caller = await executiveCaller()
  if (!caller) return fail(NOT_ALLOWED)
  const parsed = readOrg(form)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const org = parsed.data
  const weak = passwordProblem(org.password)
  if (weak) return fail(weak)

  let tests: z.infer<typeof priceListSchema> = []
  try {
    const list = priceListSchema.safeParse(JSON.parse(field(form, 'tests') || '[]'))
    if (!list.success) return fail('Check the test names and prices.')
    tests = list.data
  } catch {
    return fail('Check the test names and prices.')
  }
  const available = Array.from(new Map(tests.map((t) => [t.name.toLowerCase(), t])).values())
  const { admin } = caller

  const { data: center, error } = await admin
    .from('diagnostic_centers')
    .insert({
      name: org.name,
      city: org.city,
      address: org.address || null,
      contact_email: org.contactEmail || placeholderEmail(org.name),
      available_tests: available.map((t) => t.name),
      test_prices: Object.fromEntries(available.map((t) => [t.name, t.price])),
      status: 'active',
    })
    .select('id')
    .single()
  if (error || !center) {
    console.error('createDiagnosticCenter:', error)
    return fail('Could not add the diagnostic centre. Please try again.')
  }

  const login = await createStaffLogin(admin, {
    role: 'diagnostic_admin',
    fullName: org.adminName || `${org.name} Admin`,
    password: org.password,
    centerId: center.id,
    staffId: org.staffId || undefined,
  })
  if ('error' in login) {
    await admin.from('diagnostic_centers').delete().eq('id', center.id)
    return fail(login.error)
  }

  const code = await getOrAssignDiagnosticCenterCode(admin, center.id)
  await completeApplication(caller, form, 'diagnostic_center', center.id, login.staffId)
  for (const path of ['/executive/diagnostics', '/diagnostics']) revalidatePath(path)
  return { success: true, id: center.id, code, staffId: login.staffId }
}

/** A sign-in for a hospital or centre that doesn't have one yet (added before logins were created with them). */
export async function addOrganizationLogin(input: { kind: 'hospital' | 'lab'; id: string; password: string; staffId?: string }): Promise<{ success: true; staffId: string } | Fail> {
  const caller = await executiveCaller()
  if (!caller) return fail(NOT_ALLOWED)
  const weak = passwordProblem(input.password ?? '')
  if (weak) return fail(weak)
  const staffId = (input.staffId ?? '').trim().toUpperCase()
  if (staffId && !/^[A-Z0-9-]{4,24}$/.test(staffId)) return fail('A staff ID uses 4-24 letters, numbers or dashes.')
  const { admin } = caller

  const table = input.kind === 'hospital' ? 'hospitals' : 'diagnostic_centers'
  const { data: org } = await admin.from(table).select('id, name').eq('id', input.id).maybeSingle()
  if (!org) return fail('That organisation no longer exists.')

  const login = await createStaffLogin(admin, {
    role: input.kind === 'hospital' ? 'hospital_admin' : 'diagnostic_admin',
    fullName: `${org.name} Admin`,
    password: input.password,
    hospitalId: input.kind === 'hospital' ? org.id : null,
    centerId: input.kind === 'lab' ? org.id : null,
    staffId: staffId || undefined,
  })
  if ('error' in login) return fail(login.error)
  revalidatePath(input.kind === 'hospital' ? '/executive/hospitals' : '/executive/diagnostics')
  return { success: true, staffId: login.staffId }
}

const doctorSchema = z.object({
  hospitalId: z.string().uuid('Choose the hospital.'),
  fullName: text(120).min(2, "Enter the doctor's name."),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email.')]),
  specialty: text(80).min(2, 'Enter the specialty.'),
  experienceYears: z.coerce.number().int().min(0).max(70),
  consultationFee: z.coerce.number().min(0).max(100_000),
  password: z.string().max(128),
})

export async function createDoctorAccount(form: FormData): Promise<
  { success: true; staffId: string; email: string | null; invitationSent: boolean } | Fail
> {
  const caller = await executiveCaller()
  if (!caller) return fail(NOT_ALLOWED)
  const parsed = doctorSchema.safeParse({
    hospitalId: field(form, 'hospitalId'),
    fullName: field(form, 'fullName'),
    email: field(form, 'email'),
    specialty: field(form, 'specialty'),
    experienceYears: field(form, 'experienceYears') || 0,
    consultationFee: field(form, 'consultationFee') || 0,
    password: field(form, 'password'),
  })
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const d = parsed.data
  // With an email the doctor sets their own password from the activation link; without one, the executive sets it.
  if (!d.email) {
    const weak = passwordProblem(d.password)
    if (weak) return fail(`Without an email, set a password for the doctor. ${weak}`)
  }

  const { data: hospital } = await caller.admin.from('hospitals').select('id').eq('id', d.hospitalId).maybeSingle()
  if (!hospital) return fail('That hospital no longer exists.')

  const result = await provisionDoctor(caller.admin, { ...d, password: d.email ? null : d.password, invitedBy: caller.user.id })
  if ('error' in result) return fail(result.error)
  for (const path of ['/executive/doctors', '/executive/hospitals', '/hospital/doctors', '/doctors']) revalidatePath(path)
  return { success: true, staffId: result.staffId, email: result.email, invitationSent: result.invitationSent }
}
