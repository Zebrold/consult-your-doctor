'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { sendPartnerApplicationReceivedEmail } from '@/lib/notify/email'
import { collectDocuments, documentsReady, missingDocuments } from '@/lib/application-uploads'
import {
  CALL_TIMES,
  HOSPITAL_ACCREDITATIONS,
  HOSPITAL_DEPARTMENTS,
  HOSPITAL_FACILITIES,
  HOSPITAL_TYPES,
  INDIAN_STATES,
  LAB_SERVICES,
  LAB_TYPES,
  OWNERSHIP_TYPES,
  REPORT_FORMATS,
  REPORT_TIMES,
  WEEKDAYS,
  type PartnerDetails,
  type PartnerKind,
} from '@/lib/partner-applications'

// Hospitals and diagnostic centres apply to join from /signup/hospital and /signup/diagnostic-centre. Applicants
// aren't signed in, so the checks and the insert run here with the admin client; the executive portal reviews the
// applications, and approving one goes through createHospital / createDiagnosticCenter (app/actions/network.ts).
// Documents are uploaded first (app/actions/applicationUploads.ts); the form sends the upload's id.

type Result = { success: true } | { success: false; error: string }
const fail = (error: string): Result => ({ success: false, error })

const text = (max: number) => z.string().trim().max(max)
const optional = (max: number) => text(max).optional().default('')
const required = (max: number, message: string) => text(max).min(2, message)
const oneOf = (list: readonly string[], message: string) => z.string().refine((v) => list.includes(v), message)
const optionalOneOf = (list: readonly string[]) => z.union([z.literal(''), z.string().refine((v) => list.includes(v))]).optional().default('')
const someOf = (list: readonly string[], message: string) => z.array(z.string().refine((v) => list.includes(v))).min(1, message)
const count = (min: number, max: number, message: string) => z.coerce.number({ message }).int(message).min(min, message).max(max, message)
const optionalCount = (max: number) => z.union([z.literal(''), z.coerce.number().int().min(0).max(max)]).optional().default('')
const date = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message)
const optionalDate = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().default('')
const time = (message: string) => z.string().regex(/^\d{2}:\d{2}$/, message)
const phoneDigits = z.string().trim().regex(/^[0-9 ]{6,15}$/, 'Enter a valid phone number.')
const orgPhone = (message: string) => z.string().trim().regex(/^[0-9 +-]{6,16}$/, message)
const year = new Date().getFullYear()

const common = z.object({
  organizationName: text(160).min(2, 'Enter the name of your organisation.'),
  ownership: oneOf(OWNERSHIP_TYPES, 'Choose the ownership.'),
  yearEstablished: z.union([z.literal(''), z.coerce.number().int().min(1800).max(year)], { message: 'Check the year established.' }).optional().default(''),
  address: text(300).min(5, 'Enter the full address.'),
  landmark: optional(120),
  city: text(80).min(2, 'Enter the city.'),
  state: oneOf(INDIAN_STATES, 'Choose the state.'),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter the 6-digit PIN code.'),
  orgPhone: orgPhone('Enter the phone number patients call.'),
  orgEmail: z.string().trim().toLowerCase().max(200).email('Enter the organisation’s email address.'),
  website: z.union([z.literal(''), z.string().trim().max(200).url('Enter the website as a full address, starting with https://')]).optional().default(''),
  registrationNumber: required(80, 'Enter your registration or licence number.'),
  registrationValidUntil: date('Enter the date your registration is valid until.'),
  registrationAuthority: required(120, 'Enter the authority that issued your registration.'),
  bmwAuthorisation: required(80, 'Enter your biomedical waste authorisation.'),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Check the PAN: 10 characters, like ABCDE1234F.'),
  gstin: z.union([z.literal(''), z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Check the GSTIN: 15 characters.')]).optional().default(''),
  bankHolder: required(120, 'Enter the bank account holder’s name.'),
  bankAccount: z.string().trim().regex(/^[0-9]{9,18}$/, 'Check the bank account number: 9 to 18 digits.'),
  bankIfsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Check the IFSC code: 11 characters, like HDFC0001234.'),
  upiId: z.union([z.literal(''), z.string().trim().max(120).regex(/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9]{2,}$/, 'Check the UPI ID, like name@bank.')]).optional().default(''),
  contactName: text(120).min(2, 'Enter the contact person’s name.'),
  contactRole: text(80).min(2, 'Enter the contact person’s role.'),
  email: z.string().trim().toLowerCase().max(200).email('Enter a valid work email address.'),
  countryCode: z.string().trim().regex(/^\+\d{1,4}$/, 'Choose the country code.'),
  phone: phoneDigits,
  bestTimeToCall: optionalOneOf(CALL_TIMES),
  secondName: optional(120),
  secondCountryCode: z.union([z.literal(''), z.string().trim().regex(/^\+\d{1,4}$/)]).optional().default(''),
  secondPhone: z.union([z.literal(''), phoneDigits]).optional().default(''),
  secondEmail: z.union([z.literal(''), z.string().trim().toLowerCase().max(200).email('Check the second contact’s email address.')]).optional().default(''),
})

const hospitalSchema = common.extend({
  facilityType: oneOf(HOSPITAL_TYPES, 'Choose the type of facility.'),
  doctorsOnStaff: count(1, 5000, 'Enter how many doctors are on staff.'),
  emergencyPhone: z.union([z.literal(''), orgPhone('Check the emergency phone number.')]).optional().default(''),
  accreditation: oneOf(HOSPITAL_ACCREDITATIONS, 'Choose your accreditation, or None yet.'),
  accreditationNumber: optional(80),
  accreditationValidUntil: optionalDate,
  fireNoc: optional(80),
  beds: count(0, 20000, 'Enter the number of beds.'),
  icuBeds: optionalCount(5000),
  emergency24h: z.enum(['yes', 'no'], { message: 'Say whether you run a 24-hour emergency.' }),
  departments: someOf(HOSPITAL_DEPARTMENTS, 'Choose at least one department.'),
  facilities: z.array(z.string().refine((v) => HOSPITAL_FACILITIES.includes(v))).default([]),
  openDays: someOf(WEEKDAYS, 'Choose your OPD days.'),
  openFrom: time('Enter when your OPD opens.'),
  openTo: time('Enter when your OPD closes.'),
  insurers: optional(400),
})

const labSchema = common.extend({
  centreType: oneOf(LAB_TYPES, 'Choose the type of centre.'),
  branches: optionalCount(2000),
  services: someOf(LAB_SERVICES, 'Choose at least one service you offer.'),
  openDays: someOf(WEEKDAYS, 'Choose the days you are open.'),
  openFrom: time('Enter when you open.'),
  openTo: time('Enter when you close.'),
  nablNumber: optional(80),
  nablValidUntil: optionalDate,
  responsibleName: required(120, 'Enter the name of the pathologist who signs your reports.'),
  responsibleRegistration: required(80, 'Enter the pathologist’s registration number.'),
  radiologistName: optional(120),
  radiologistRegistration: optional(80),
  pcpndtNumber: optional(80),
  pcpndtValidUntil: optionalDate,
  aerbNumber: optional(80),
  testsOffered: count(1, 20000, 'Enter how many tests you offer.'),
  reportTime: oneOf(REPORT_TIMES, 'Choose your usual report time.'),
  reportFormat: oneOf(REPORT_FORMATS, 'Choose how you share reports.'),
})

const LISTS = ['departments', 'facilities', 'openDays', 'services']

/** The form's answers as a plain object: lists for the checkbox groups, strings for the rest. */
function formValues(form: FormData) {
  const values: Record<string, string | string[]> = {}
  for (const key of new Set(form.keys())) {
    if (key.startsWith('$ACTION')) continue
    values[key] = LISTS.includes(key) ? form.getAll(key).map(String) : String(form.get(key) ?? '')
  }
  for (const key of LISTS) values[key] ??= []
  return values
}

const num = (v: number | '') => (v === '' ? null : v)
const opt = (v: string) => v || undefined

export async function submitPartnerApplication(kind: PartnerKind, _prev: unknown, form: FormData): Promise<Result> {
  if (kind !== 'hospital' && kind !== 'diagnostic_center') return fail('Unknown application type.')
  const second = kind === 'hospital' ? 'keepUpdated' : 'reportsSigned'
  if (form.get('authorised') !== 'on' || form.get(second) !== 'on' || form.get('consentVerification') !== 'on') {
    return fail('Please confirm all three declarations before sending.')
  }

  const parsed = (kind === 'hospital' ? hospitalSchema : labSchema).safeParse(formValues(form))
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const d = parsed.data

  let details: PartnerDetails
  if (kind === 'hospital') {
    const h = d as z.infer<typeof hospitalSchema>
    details = {
      facilityType: h.facilityType,
      doctorsOnStaff: h.doctorsOnStaff,
      emergencyPhone: opt(h.emergencyPhone),
      accreditation: h.accreditation,
      accreditationNumber: opt(h.accreditationNumber),
      accreditationValidUntil: opt(h.accreditationValidUntil),
      fireNoc: opt(h.fireNoc),
      beds: h.beds,
      icuBeds: num(h.icuBeds),
      emergency24h: h.emergency24h === 'yes',
      departments: h.departments,
      facilities: h.facilities,
      openDays: h.openDays,
      openFrom: h.openFrom,
      openTo: h.openTo,
      insurers: opt(h.insurers),
    }
  } else {
    const l = d as z.infer<typeof labSchema>
    if (l.services.includes('Ultrasound') && !l.pcpndtNumber) return fail('Centres that perform ultrasound need a PCPNDT registration number.')
    details = {
      centreType: l.centreType,
      branches: num(l.branches),
      services: l.services,
      openDays: l.openDays,
      openFrom: l.openFrom,
      openTo: l.openTo,
      nablNumber: opt(l.nablNumber),
      nablValidUntil: opt(l.nablValidUntil),
      responsibleName: l.responsibleName,
      responsibleRegistration: l.responsibleRegistration,
      radiologistName: opt(l.radiologistName),
      radiologistRegistration: opt(l.radiologistRegistration),
      pcpndtNumber: opt(l.pcpndtNumber),
      pcpndtValidUntil: opt(l.pcpndtValidUntil),
      aerbNumber: opt(l.aerbNumber),
      testsOffered: l.testsOffered,
      reportTime: l.reportTime,
      reportFormat: l.reportFormat,
    }
  }

  // Each application emails the address given, so limit how many one network can send.
  if (await overLimit(`partner-signup:${(await clientIp()) ?? 'unknown'}`, 5, 60 * 60_000)) {
    return fail('Several applications have been sent from this network. Please try again in an hour.')
  }

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

  // The documents uploaded under this form's upload id. Before the documents bucket exists, they come by email.
  const uploads = await documentsReady(admin)
  const documents = uploads ? await collectDocuments(admin, kind, String(form.get('uploadId') ?? '') || null) : {}
  const missing = uploads ? missingDocuments(kind, documents) : []
  if (missing.length > 0) return fail(`Please add the ${missing.join(', ').toLowerCase()}.`)

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
      ...details,
      ownership: d.ownership,
      yearEstablished: num(d.yearEstablished),
      landmark: opt(d.landmark),
      state: d.state,
      pincode: d.pincode,
      orgPhone: d.orgPhone,
      orgEmail: d.orgEmail,
      website: opt(d.website),
      registrationAuthority: d.registrationAuthority,
      registrationValidUntil: d.registrationValidUntil,
      bmwAuthorisation: d.bmwAuthorisation,
      pan: d.pan,
      gstin: opt(d.gstin),
      bank: { holder: d.bankHolder, account: d.bankAccount, ifsc: d.bankIfsc, upi: opt(d.upiId) },
      bestTimeToCall: opt(d.bestTimeToCall),
      secondContact:
        d.secondName || d.secondPhone || d.secondEmail
          ? {
              name: opt(d.secondName),
              phone: d.secondPhone ? `${d.secondCountryCode || '+91'}${d.secondPhone.replace(/\D/g, '')}` : undefined,
              email: opt(d.secondEmail),
            }
          : undefined,
      documents: Object.keys(documents).length > 0 ? documents : undefined,
      documentsByEmail: uploads ? undefined : true,
    } satisfies PartnerDetails,
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
