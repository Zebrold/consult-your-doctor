'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executiveFor } from '@/app/executive/_lib/ops'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { sendApplicationRejectedEmail, sendPartnerApplicationReceivedEmail } from '@/lib/notify/email'
import { alertTeamLater } from '@/lib/notify/team'
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
import {
  ACCOUNT_MESSAGE,
  EMAIL_MESSAGE,
  GSTIN_MESSAGE,
  GSTIN_PAN_MESSAGE,
  IFSC_MESSAGE,
  LANDLINE_MESSAGE,
  LATER_TIME_MESSAGE,
  PAN_MESSAGE,
  PINCODE_MESSAGE,
  UPI_MESSAGE,
  gstinMatchesPan,
  isEmail,
  isLaterTime,
  phoneProblem,
} from '@/lib/join-rules'
import { APPLICATION_DOCS } from '@/lib/application-documents'

// Hospitals and diagnostic centres apply to join from /signup/hospital and /signup/diagnostic-centre. Applicants
// aren't signed in, so the checks and the insert run here with the admin client; the executive portal reviews the
// applications, and approving one goes through createHospital / createDiagnosticCenter (app/actions/network.ts).
// Documents are uploaded first (app/actions/applicationUploads.ts); the form sends the upload's id.

// `field` names the input to fix: the form opens its step and shows the message under it (app/(auth)/signup/join-ui.tsx).
type Result = { success: true } | { success: false; error: string; field?: string }
const fail = (error: string, field?: string): Result => ({ success: false, error, field })

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
const orgPhone = () => z.string().trim().regex(/^[0-9 +-]{6,16}$/, LANDLINE_MESSAGE)
const emailField = z.string().trim().toLowerCase().max(200).refine(isEmail, EMAIL_MESSAGE)
const year = new Date().getFullYear()

const common = z.object({
  organizationName: text(160).min(2, 'Enter the name of your organisation.'),
  ownership: oneOf(OWNERSHIP_TYPES, 'Choose the ownership.'),
  yearEstablished: z.union([z.literal(''), z.coerce.number().int().min(1800).max(year)], { message: 'Check the year established.' }).optional().default(''),
  address: text(300).min(5, 'Enter the full address.'),
  landmark: optional(120),
  city: text(80).min(2, 'Enter the city.'),
  state: oneOf(INDIAN_STATES, 'Choose the state.'),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, PINCODE_MESSAGE),
  orgPhone: orgPhone(),
  orgEmail: emailField,
  website: z.union([z.literal(''), z.string().trim().max(200).url('Enter the website as a full address, starting with https://')]).optional().default(''),
  registrationNumber: required(80, 'Enter your registration or licence number.'),
  registrationValidUntil: date('Enter the date your registration is valid until.'),
  registrationAuthority: required(120, 'Enter the authority that issued your registration.'),
  bmwAuthorisation: required(80, 'Enter your biomedical waste authorisation.'),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, PAN_MESSAGE),
  gstin: z.union([z.literal(''), z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, GSTIN_MESSAGE)]).optional().default(''),
  bankHolder: required(120, 'Enter the bank account holder’s name.'),
  bankAccount: z.string().trim().regex(/^[0-9]{9,18}$/, ACCOUNT_MESSAGE),
  bankIfsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, IFSC_MESSAGE),
  upiId: z.union([z.literal(''), z.string().trim().max(120).regex(/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9]{2,}$/, UPI_MESSAGE)]).optional().default(''),
  contactName: text(120).min(2, 'Enter the contact person’s name.'),
  contactRole: text(80).min(2, 'Enter the contact person’s role.'),
  email: emailField,
  countryCode: z.string().trim().regex(/^\+\d{1,4}$/, 'Choose the country code.'),
  // Checked against its country code below (crossChecks).
  phone: z.string().trim(),
  bestTimeToCall: optionalOneOf(CALL_TIMES),
  secondName: optional(120),
  secondCountryCode: z.union([z.literal(''), z.string().trim().regex(/^\+\d{1,4}$/)]).optional().default(''),
  secondPhone: z.string().trim().optional().default(''),
  secondEmail: z.union([z.literal(''), emailField]).optional().default(''),
})

/** The checks that compare fields: each phone against its country code, the GSTIN against the PAN, and the hours. */
type Crossed = { countryCode: string; phone: string; secondCountryCode: string; secondPhone: string; pan: string; gstin: string; openFrom: string; openTo: string }
function crossChecks(d: Crossed, ctx: z.RefinementCtx) {
  const phone = phoneProblem(d.countryCode, d.phone.replace(/\D/g, ''))
  if (phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: phone })
  if (d.secondPhone) {
    const second = phoneProblem(d.secondCountryCode || '+91', d.secondPhone.replace(/\D/g, ''))
    if (second) ctx.addIssue({ code: 'custom', path: ['secondPhone'], message: second })
  }
  if (!gstinMatchesPan(d.gstin, d.pan)) ctx.addIssue({ code: 'custom', path: ['gstin'], message: GSTIN_PAN_MESSAGE })
  if (!isLaterTime(d.openFrom, d.openTo)) ctx.addIssue({ code: 'custom', path: ['openTo'], message: LATER_TIME_MESSAGE })
}

const hospitalSchema = common.extend({
  facilityType: oneOf(HOSPITAL_TYPES, 'Choose the type of facility.'),
  doctorsOnStaff: count(1, 5000, 'Enter how many doctors are on staff.'),
  emergencyPhone: z.union([z.literal(''), orgPhone()]).optional().default(''),
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
}).superRefine(crossChecks)

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
}).superRefine(crossChecks)

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
  const parsed = (kind === 'hospital' ? hospitalSchema : labSchema).safeParse(formValues(form))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(issue.message, typeof issue.path[0] === 'string' ? issue.path[0] : undefined)
  }
  const second = kind === 'hospital' ? 'keepUpdated' : 'reportsSigned'
  for (const name of ['authorised', second, 'consentVerification']) {
    if (form.get(name) !== 'on') return fail('Tick this to continue.', name)
  }
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
    if (l.services.includes('Ultrasound') && !l.pcpndtNumber) return fail('Centres that perform ultrasound need a PCPNDT registration number.', 'pcpndtNumber')
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

  const admin = createAdminClient()
  const { data: open } = await admin
    .from('partner_applications')
    .select('id')
    .eq('kind', kind)
    .eq('status', 'pending')
    .eq('email', d.email)
    .limit(1)
    .maybeSingle()
  if (open) return fail('An application from this email address is already waiting for review. Our team will be in touch.', 'email')

  // The documents uploaded under this form's upload id. Before the documents bucket exists, they come by email.
  const uploads = await documentsReady(admin)
  const documents = uploads ? await collectDocuments(admin, kind, String(form.get('uploadId') ?? '') || null) : {}
  const missing = uploads ? missingDocuments(kind, documents) : []
  if (missing.length > 0) {
    const firstMissing = APPLICATION_DOCS[kind].find((doc) => doc.required && !documents[doc.key])
    return fail(`Please add the ${missing.join(', ').toLowerCase()}.`, firstMissing ? `doc:${firstMissing.key}` : undefined)
  }

  // Each application emails the address given, so limit how many one network can send. Counted only now, when the
  // application is about to be saved: corrections after a message above don't use up the network's attempts.
  if (await overLimit(`partner-signup:${(await clientIp()) ?? 'unknown'}`, 5, 60 * 60_000)) {
    return fail('Several applications have been sent from this network. Please try again in an hour.')
  }

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
    if (error.code === '23505') return fail('An application from this email address is already waiting for review.', 'email')
    console.error('submitPartnerApplication:', error)
    return fail('We could not send your application. Please try again, or contact us.')
  }

  await sendPartnerApplicationReceivedEmail({ to: d.email, contactName: d.contactName, organizationName: d.organizationName, kind }).catch((err) =>
    console.error('Failed to send partner application email:', err),
  )
  const noun = kind === 'hospital' ? 'hospital' : 'diagnostic centre'
  alertTeamLater('partner-application', {
    subject: `New ${noun} application: ${d.organizationName}, ${d.city}`,
    heading: `New ${noun} application`,
    lines: [`${d.organizationName} in ${d.city} applied to join as a partner ${noun}. Check the registration and accreditation details, then approve or decline it.`],
    facts: [['Name', d.organizationName], ['City', d.city], ['Contact', d.contactName], ['Email', d.email], ['Phone', `${d.countryCode}${d.phone.replace(/\D/g, '')}`]],
    page: kind === 'hospital' ? '/executive/hospitals' : '/executive/diagnostics',
    button: 'Review applications',
  })
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
  // Which team may review depends on the kind of application, so read the kind first.
  const { data: pending } = await admin.from('partner_applications').select('kind').eq('id', id).maybeSingle()
  const page = pending?.kind === 'hospital' ? 'hospitals' : pending?.kind === 'doctor' ? 'doctors' : 'diagnostics'
  // Hospital applications also show in the Branches queue, so that team may reject them too.
  const allowed = (await executiveFor(page)) || (pending?.kind === 'hospital' && (await executiveFor('branches')))
  if (!allowed) return fail('Your team doesn’t have access to this.')

  const { data: app, error } = await admin
    .from('partner_applications')
    .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('kind, email, contact_name, organization_name')
    .maybeSingle()
  if (error) {
    console.error('rejectPartnerApplication:', error)
    return fail('Could not update the application. Please try again.')
  }
  if (!app) return fail('This application has already been reviewed.')
  if (app.email && (app.kind === 'hospital' || app.kind === 'diagnostic_center' || app.kind === 'doctor')) {
    await sendApplicationRejectedEmail({
      to: app.email,
      name: app.contact_name || 'there',
      kind: app.kind,
      organizationName: app.kind === 'doctor' ? null : app.organization_name,
    }).catch(() => false)
  }
  revalidatePath(app.kind === 'hospital' ? '/executive/hospitals' : '/executive/diagnostics')
  return { success: true }
}
