'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { collectDocuments, documentsReady } from '@/lib/application-uploads'
import { HOSPITAL_DEPARTMENTS } from '@/lib/partner-applications'
import { sendPartnerApplicationReceivedEmail } from '@/lib/notify/email'

// Partner enquiries (supabase/migrations/20261115_executive_workspace.sql): "Talk to our team" on the Partner with us
// page, and the Support desk's joining pipeline, where the team calls each one and can fill the application in for
// them during the call.

type Result = { ok: true } | { ok: false; error: string }
const NOT_SET_UP = 'Partner enquiries aren’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.'

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d+]/g, ''))
  .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v) || /^\+?\d{10,13}$/.test(v), 'Enter a phone number we can call.')

const Enquiry = z.object({
  kind: z.enum(['hospital', 'diagnostic_center']).default('hospital'),
  organizationName: z.string().trim().min(2, 'Enter the name of the hospital or centre.').max(160),
  city: z.string().trim().min(2, 'Enter the city.').max(80),
  beds: z.union([z.literal(''), z.coerce.number().int().min(0).max(100000)]).optional().default(''),
  contactName: z.string().trim().min(2, 'Enter your name.').max(120),
  contactRole: z.string().trim().max(80).optional().default(''),
  phone,
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Check the email address.')]).optional().default(''),
  message: z.string().trim().max(1000).optional().default(''),
})

/** A hospital or centre asks the team to call them about joining. Public, so it is rate limited. */
export async function submitPartnerEnquiry(_prev: unknown, form: FormData): Promise<Result | null> {
  if (String(form.get('website') ?? '')) return { ok: true } // a bot filled the hidden field
  const parsed = Enquiry.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const ip = (await clientIp()) ?? 'unknown'
  if (await overLimit(`partner-enquiry:${ip}`, 5, 60 * 60_000)) return { ok: false, error: 'Several enquiries have been sent from this network. Please try again in an hour.' }
  const d = parsed.data
  const admin = createAdminClient()
  const { error } = await admin.from('partner_enquiries').insert({
    kind: d.kind,
    organization_name: d.organizationName,
    city: d.city,
    beds: d.beds === '' ? null : d.beds,
    contact_name: d.contactName,
    contact_role: d.contactRole || null,
    phone: d.phone,
    email: d.email || null,
    message: d.message || null,
  })
  if (error) {
    console.error('submitPartnerEnquiry:', error)
    return { ok: false, error: 'We could not send this just now. Please apply with the form instead, or try again later.' }
  }
  revalidatePath('/executive/support')
  return { ok: true }
}

async function executive() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  return me?.role === 'executive' ? { user, admin, name: (me.full_name as string | null) ?? 'Executive' } : null
}

const STAGES = ['new', 'called', 'interested', 'applied', 'not_interested'] as const

/** After a call: no answer (call again), interested or not interested, with the call notes. */
export async function updateEnquiry(id: string, input: { stage?: string; notes?: string; called?: boolean }): Promise<Result> {
  const ctx = await executive()
  if (!ctx) return { ok: false, error: 'Please log in with your executive account.' }
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'Not found.' }
  if (input.stage && !(STAGES as readonly string[]).includes(input.stage)) return { ok: false, error: 'Unknown stage.' }
  const now = new Date().toISOString()
  const { error } = await ctx.admin
    .from('partner_enquiries')
    .update({
      ...(input.stage ? { stage: input.stage } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim().slice(0, 2000) || null } : {}),
      ...(input.called ? { last_called_at: now } : {}),
      handled_by: ctx.user.id,
      updated_at: now,
    })
    .eq('id', id)
  if (error) return { ok: false, error: NOT_SET_UP }
  revalidatePath('/executive/support')
  return { ok: true }
}

const Filed = z.object({
  organizationName: z.string().trim().min(2, 'Enter the hospital’s name.').max(160),
  registrationNumber: z.string().trim().min(2, 'Enter the registration number.').max(80),
  city: z.string().trim().min(2, 'Enter the city.').max(80),
  beds: z.coerce.number({ message: 'Enter the number of beds.' }).int().min(0).max(20000),
  address: z.string().trim().min(5, 'Enter the full address.').max(300),
  departments: z.array(z.string().refine((v) => HOSPITAL_DEPARTMENTS.includes(v))).min(1, 'Choose at least one speciality.'),
  contactName: z.string().trim().min(2, 'Enter the admin’s name.').max(120),
  phone,
  email: z.string().trim().toLowerCase().email('Enter the admin’s email.'),
  payout: z.string().trim().max(120).optional().default(''),
  agreed: z.literal('on', { message: 'The hospital needs to agree to the partner terms on the call.' }),
})

/**
 * Fills the hospital's application in for them during the call. It goes to Hospitals › Applications like any other,
 * marked as filled in by the team; documents uploaded here (the join pages' upload flow) come with it.
 */
export async function fileApplicationForEnquiry(enquiryId: string, form: FormData): Promise<Result> {
  const ctx = await executive()
  if (!ctx) return { ok: false, error: 'Please log in with your executive account.' }
  if (!z.string().uuid().safeParse(enquiryId).success) return { ok: false, error: 'Not found.' }
  const parsed = Filed.safeParse({ ...Object.fromEntries(form), departments: form.getAll('departments').map(String) })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const { data: enquiry, error: enquiryError } = await ctx.admin.from('partner_enquiries').select('id, contact_role, application_id').eq('id', enquiryId).maybeSingle()
  if (enquiryError) return { ok: false, error: NOT_SET_UP }
  if (!enquiry) return { ok: false, error: 'Not found.' }
  if (enquiry.application_id) return { ok: false, error: 'An application was already sent for this enquiry.' }

  const uploads = await documentsReady(ctx.admin)
  const uploadId = String(form.get('uploadId') ?? '') || null
  const documents = uploads && uploadId ? await collectDocuments(ctx.admin, 'hospital', uploadId) : {}
  const { data: app, error } = await ctx.admin
    .from('partner_applications')
    .insert({
      kind: 'hospital',
      organization_name: d.organizationName,
      city: d.city,
      address: d.address,
      contact_name: d.contactName,
      contact_role: (enquiry.contact_role as string | null) || 'Administrator',
      email: d.email,
      phone: d.phone,
      registration_number: d.registrationNumber,
      details: {
        beds: d.beds,
        departments: d.departments,
        ...(d.payout ? { payoutNote: d.payout } : {}),
        ...(Object.keys(documents).length ? { documents } : { documentsByEmail: true }),
        filedBy: { name: ctx.name, enquiryId },
      },
    })
    .select('id')
    .single()
  if (error || !app) {
    if (error?.code === '23505') return { ok: false, error: 'An application from this email address is already waiting for review.' }
    console.error('fileApplicationForEnquiry:', error)
    return { ok: false, error: 'Could not send the application. Please try again.' }
  }
  await ctx.admin.from('partner_enquiries').update({ stage: 'applied', application_id: app.id, handled_by: ctx.user.id, updated_at: new Date().toISOString() }).eq('id', enquiryId)
  await sendPartnerApplicationReceivedEmail({ to: d.email, contactName: d.contactName, organizationName: d.organizationName, kind: 'hospital' }).catch(() => null)
  revalidatePath('/executive/support')
  revalidatePath('/executive/hospitals')
  return { ok: true }
}
