'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { canReach } from '@/lib/branches'

// Accounts & branches (/hospital/branches). Switching changes profiles.hospital_id, the hospital the admin is signed in
// to, after checking hospital_admin_access, so every hospital page, action and policy follows the switch. A new branch
// goes into the team's partner application queue like any hospital, marked as a branch; approving it gives the admin
// who asked access to it (app/actions/network.ts).

type Result = { ok: true } | { ok: false; error: string }
const NOT_SET_UP = 'Branches are being set up. Please try again later.'
const uuid = z.string().uuid()

async function caller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id, full_name').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  return { user, admin, hospitalId: profile.hospital_id as string, name: (profile.full_name as string | null) || 'Hospital admin' }
}

export async function switchBranch(hospitalId: string): Promise<Result> {
  const ctx = await caller()
  if (!ctx) return { ok: false, error: 'Please log in with your hospital account.' }
  if (!uuid.safeParse(hospitalId).success) return { ok: false, error: 'Branch not found.' }
  if (hospitalId === ctx.hospitalId) return { ok: true }
  const { data: access, error } = await ctx.admin.from('hospital_admin_access').select('hospital_id').eq('profile_id', ctx.user.id).eq('hospital_id', hospitalId).maybeSingle()
  if (error) return { ok: false, error: NOT_SET_UP }
  if (!access) return { ok: false, error: 'You don’t have access to that branch.' }
  const { data: hospital } = await ctx.admin.from('hospitals').select('id').eq('id', hospitalId).maybeSingle()
  if (!hospital) return { ok: false, error: 'Branch not found.' }

  const { error: updateError } = await ctx.admin.from('profiles').update({ hospital_id: hospitalId }).eq('id', ctx.user.id).eq('role', 'hospital_admin')
  if (updateError) {
    console.error('switchBranch:', updateError)
    return { ok: false, error: 'Could not switch branch. Please try again.' }
  }
  revalidatePath('/hospital', 'layout')
  return { ok: true }
}

const branchSchema = z.object({
  name: z.string().trim().min(2, 'Add the branch name.').max(120),
  city: z.string().trim().min(2, 'Add the city.').max(60),
  address: z.string().trim().min(5, 'Add the address.').max(300),
  contactName: z.string().trim().min(2, 'Add a contact person.').max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ''))
    .refine((v) => /^\+?\d{10,13}$/.test(v), 'Add a valid phone number.'),
  email: z.string().trim().toLowerCase().email('Add a valid email address.').max(120),
  registrationNumber: z.string().trim().max(80).optional(),
  beds: z.coerce.number().int().min(0).max(5000).optional(),
  note: z.string().trim().max(500).optional(),
})

export async function requestBranch(form: FormData): Promise<Result> {
  const ctx = await caller()
  if (!ctx) return { ok: false, error: 'Please log in with your hospital account.' }
  const parsed = branchSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const { data: current } = await ctx.admin.from('hospitals').select('name').eq('id', ctx.hospitalId).maybeSingle()

  const { data: open } = await ctx.admin.from('partner_applications').select('id').eq('kind', 'hospital').eq('status', 'pending').ilike('email', d.email).limit(1).maybeSingle()
  if (open) return { ok: false, error: 'An application with this email address is already waiting for review. Use the branch’s own email address.' }

  const { error } = await ctx.admin.from('partner_applications').insert({
    kind: 'hospital',
    organization_name: d.name,
    city: d.city,
    address: d.address,
    contact_name: d.contactName,
    contact_role: 'Branch contact',
    email: d.email,
    phone: d.phone,
    registration_number: d.registrationNumber || null,
    details: {
      branchOf: { hospitalId: ctx.hospitalId, hospitalName: current?.name ?? 'Hospital', requestedBy: ctx.user.id, requestedByName: ctx.name },
      ...(d.beds != null ? { beds: d.beds } : {}),
      ...(d.note ? { note: d.note } : {}),
    },
  })
  if (error) {
    console.error('requestBranch:', error)
    return { ok: false, error: 'Could not send the branch for review. Please try again.' }
  }
  revalidatePath('/hospital/branches')
  return { ok: true }
}

/** Gives or takes away another admin's access to one of your branches. */
export async function setBranchAccess(profileId: string, hospitalId: string, grant: boolean): Promise<Result> {
  const ctx = await caller()
  if (!ctx) return { ok: false, error: 'Please log in with your hospital account.' }
  if (!uuid.safeParse(profileId).success || !uuid.safeParse(hospitalId).success) return { ok: false, error: 'Not found.' }
  if (profileId === ctx.user.id) return { ok: false, error: 'You can’t change your own access.' }
  if (!(await canReach(ctx.admin, ctx.user.id, hospitalId))) return { ok: false, error: 'You don’t have access to that branch.' }

  const { data: person } = await ctx.admin.from('profiles').select('role, hospital_id').eq('id', profileId).maybeSingle()
  if (person?.role !== 'hospital_admin') return { ok: false, error: 'Only hospital admins can be given branch access.' }
  // Only people already working in one of your branches.
  const { data: theirs } = await ctx.admin.from('hospital_admin_access').select('hospital_id').eq('profile_id', profileId).limit(200)
  const { data: mine } = await ctx.admin.from('hospital_admin_access').select('hospital_id').eq('profile_id', ctx.user.id).limit(200)
  const myIds = new Set([ctx.hospitalId, ...((mine ?? []) as { hospital_id: string }[]).map((r) => r.hospital_id)])
  const sharesBranch = (person.hospital_id && myIds.has(person.hospital_id)) || ((theirs ?? []) as { hospital_id: string }[]).some((r) => myIds.has(r.hospital_id))
  if (!sharesBranch) return { ok: false, error: 'You can only manage people who work in one of your branches.' }

  if (grant) {
    const { error } = await ctx.admin.from('hospital_admin_access').upsert({ profile_id: profileId, hospital_id: hospitalId, granted_by: ctx.user.id }, { onConflict: 'profile_id,hospital_id' })
    if (error) return { ok: false, error: NOT_SET_UP }
  } else {
    if (person.hospital_id === hospitalId) return { ok: false, error: 'They are signed in to that branch. They need to switch to another branch first.' }
    const { error } = await ctx.admin.from('hospital_admin_access').delete().eq('profile_id', profileId).eq('hospital_id', hospitalId)
    if (error) return { ok: false, error: NOT_SET_UP }
  }
  revalidatePath('/hospital/branches')
  return { ok: true }
}
