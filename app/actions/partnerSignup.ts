'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { sendPartnerApplicationReceivedEmail } from '@/lib/notify/email'
import { LAB_SERVICES, type PartnerDetails, type PartnerKind } from '@/lib/partner-applications'

// Hospitals and diagnostic centres apply to join from /signup/hospital and /signup/diagnostic-centre. Applicants
// aren't signed in, so the checks and the insert run here with the admin client; the executive portal reviews the
// applications, and approving one goes through createHospital / createDiagnosticCenter (app/actions/network.ts).

type Result = { success: true } | { success: false; error: string }
const fail = (error: string): Result => ({ success: false, error })

const text = (max: number) => z.string().trim().max(max)
const optional = (max: number) => text(max).optional().default('')

const common = z.object({
  organizationName: text(160).min(2, 'Enter the name of your organisation.'),
  city: text(80).min(2, 'Enter the city.'),
  state: optional(80),
  address: text(300).min(5, 'Enter the full address.'),
  pincode: z.union([z.literal(''), z.string().trim().regex(/^[A-Za-z0-9 -]{3,12}$/, 'Check the PIN or postal code.')]).optional().default(''),
  website: z.union([z.literal(''), z.string().trim().max(200).url('Enter the website as a full address, starting with https://')]).optional().default(''),
  registrationNumber: text(80).min(2, 'Enter your registration or licence number.'),
  registrationAuthority: optional(120),
  contactName: text(120).min(2, 'Enter the contact person’s name.'),
  contactRole: text(80).min(2, 'Enter the contact person’s role.'),
  email: z.string().trim().toLowerCase().max(200).email('Enter a valid email address.'),
  countryCode: z.string().trim().regex(/^\+\d{1,4}$/, 'Choose the country code.'),
  phone: z.string().trim().regex(/^[0-9 ]{6,15}$/, 'Enter a valid phone number.'),
})

const hospitalSchema = common.extend({
  facilityType: text(60).min(2, 'Choose the type of facility.'),
  accreditation: optional(60),
  accreditationNumber: optional(80),
  beds: z.union([z.literal(''), z.coerce.number().int().min(0).max(20000)]).optional().default(''),
  specialties: optional(400),
})

const labSchema = common.extend({
  services: z.array(z.enum(LAB_SERVICES as [string, ...string[]])).min(1, 'Choose at least one service you offer.'),
  nablNumber: optional(80),
  responsibleName: text(120).min(2, 'Enter the name of the professional who signs your reports.'),
  responsibleRegistration: text(80).min(2, 'Enter their registration number.'),
  pcpndtNumber: optional(80),
  bmwAuthorisation: optional(80),
})

const field = (form: FormData, name: string) => String(form.get(name) ?? '')

export async function submitPartnerApplication(kind: PartnerKind, _prev: unknown, form: FormData): Promise<Result> {
  if (kind !== 'hospital' && kind !== 'diagnostic_center') return fail('Unknown application type.')
  if (form.get('authorised') !== 'on' || form.get('consentVerification') !== 'on') {
    return fail('Please confirm both declarations before submitting.')
  }

  const base = {
    organizationName: field(form, 'organizationName'),
    city: field(form, 'city'),
    state: field(form, 'state'),
    address: field(form, 'address'),
    pincode: field(form, 'pincode'),
    website: field(form, 'website'),
    registrationNumber: field(form, 'registrationNumber'),
    registrationAuthority: field(form, 'registrationAuthority'),
    contactName: field(form, 'contactName'),
    contactRole: field(form, 'contactRole'),
    email: field(form, 'email'),
    countryCode: field(form, 'countryCode'),
    phone: field(form, 'phone'),
  }

  let row: { details: PartnerDetails; data: z.infer<typeof common> }
  if (kind === 'hospital') {
    const parsed = hospitalSchema.safeParse({
      ...base,
      facilityType: field(form, 'facilityType'),
      accreditation: field(form, 'accreditation'),
      accreditationNumber: field(form, 'accreditationNumber'),
      beds: field(form, 'beds'),
      specialties: field(form, 'specialties'),
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const h = parsed.data
    row = {
      data: h,
      details: {
        facilityType: h.facilityType,
        accreditation: h.accreditation || undefined,
        accreditationNumber: h.accreditationNumber || undefined,
        beds: h.beds === '' ? null : h.beds,
        specialties: h.specialties || undefined,
      },
    }
  } else {
    const parsed = labSchema.safeParse({
      ...base,
      services: form.getAll('services').map(String),
      nablNumber: field(form, 'nablNumber'),
      responsibleName: field(form, 'responsibleName'),
      responsibleRegistration: field(form, 'responsibleRegistration'),
      pcpndtNumber: field(form, 'pcpndtNumber'),
      bmwAuthorisation: field(form, 'bmwAuthorisation'),
    })
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const l = parsed.data
    if (l.services.includes('Ultrasound') && !l.pcpndtNumber) {
      return fail('Centres that perform ultrasound need a PCPNDT registration number.')
    }
    row = {
      data: l,
      details: {
        services: l.services,
        nablNumber: l.nablNumber || undefined,
        responsibleName: l.responsibleName,
        responsibleRegistration: l.responsibleRegistration,
        pcpndtNumber: l.pcpndtNumber || undefined,
        bmwAuthorisation: l.bmwAuthorisation || undefined,
      },
    }
  }

  // Each application emails the address given, so limit how many one network can send.
  if (await overLimit(`partner-signup:${(await clientIp()) ?? 'unknown'}`, 5, 60 * 60_000)) {
    return fail('Several applications have been sent from this network. Please try again in an hour.')
  }

  const d = row.data
  const admin = createAdminClient()
  const { data: open } = await admin
    .from('partner_applications')
    .select('id')
    .eq('kind', kind)
    .eq('status', 'pending')
    .eq('email', d.email)
    .limit(1)
    .maybeSingle()
  if (open) return fail('An application from this email address is already waiting for review. Our team will be in touch.')

  const { error } = await admin.from('partner_applications').insert({
    kind,
    organization_name: d.organizationName,
    city: d.city,
    address: d.address,
    contact_name: d.contactName,
    contact_role: d.contactRole,
    email: d.email,
    phone: `${d.countryCode}${d.phone.replace(/\D/g, '')}`,
    registration_number: d.registrationNumber,
    details: {
      ...row.details,
      state: d.state || undefined,
      pincode: d.pincode || undefined,
      website: d.website || undefined,
      registrationAuthority: d.registrationAuthority || undefined,
    },
  })
  if (error) {
    if (error.code === '23505') return fail('An application from this email address is already waiting for review.')
    console.error('submitPartnerApplication:', error)
    return fail('We could not send your application. Please try again, or contact us.')
  }

  await sendPartnerApplicationReceivedEmail({ to: d.email, contactName: d.contactName, organizationName: d.organizationName, kind }).catch((err) =>
    console.error('Failed to send partner application email:', err),
  )
  revalidatePath(kind === 'hospital' ? '/executive/hospitals' : '/executive/diagnostics')
  return { success: true }
}

/** Declines a hospital or centre application. Executives only. */
export async function rejectPartnerApplication(id: string): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Please log in again.')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'executive') return fail('Only the operations team can review applications.')

  const { data: app, error } = await admin
    .from('partner_applications')
    .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('kind')
    .maybeSingle()
  if (error) {
    console.error('rejectPartnerApplication:', error)
    return fail('Could not update the application. Please try again.')
  }
  if (!app) return fail('This application has already been reviewed.')
  revalidatePath(app.kind === 'hospital' ? '/executive/hospitals' : '/executive/diagnostics')
  return { success: true }
}
