'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// A staff member's own sign-in details: their name and phone, their Staff ID and their password.
//
// Staff sign in with their Staff ID: the login page turns it into the account's address "<id>@cyd.internal" (unless
// an administrator gave them a real email). So a new Staff ID also moves that internal address, or they couldn't
// sign in with it.

type Result = { ok: true; staffId?: string } | { ok: false; error: string }
const fail = (error: string): Result => ({ ok: false, error })

const STAFF_ROLES = ['hospital_admin', 'executive', 'doctor', 'diagnostic_admin']
const PORTAL_PATHS: Record<string, string> = { hospital_admin: '/hospital', executive: '/executive', doctor: '/doctor', diagnostic_admin: '/diagnostic-center' }

async function staffContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, staff_id, email').eq('id', user.id).maybeSingle()
  if (!profile || !STAFF_ROLES.includes(profile.role)) return null
  return { admin, user, profile: profile as { role: string; staff_id: string | null; email: string | null } }
}

const refresh = (role: string) => revalidatePath(PORTAL_PATHS[role] ?? '/', 'layout')

export async function updateMyStaffDetails(input: { name: string; phone: string }): Promise<Result> {
  const ctx = await staffContext()
  if (!ctx) return fail('Please sign in with your staff account.')
  const name = input.name.trim().replace(/\s+/g, ' ')
  const phone = input.phone.trim()
  if (name.length < 2 || name.length > 80) return fail('Enter your full name.')
  if (phone && !/^\+?[\d\s-]{10,16}$/.test(phone)) return fail('Enter a valid phone number, or leave it blank.')
  const { error } = await ctx.admin.from('profiles').update({ full_name: name, phone_number: phone || null }).eq('id', ctx.user.id)
  if (error) return fail(error.code === '23505' ? 'That phone number is already in use.' : 'Could not save your details.')
  refresh(ctx.profile.role)
  return { ok: true }
}

export async function updateMyStaffId(rawId: string): Promise<Result> {
  const ctx = await staffContext()
  if (!ctx) return fail('Please sign in with your staff account.')
  const staffId = rawId.trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(staffId)) return fail('Use 4 to 20 letters, numbers or hyphens.')
  if (staffId === ctx.profile.staff_id) return fail('That is already your Staff ID.')

  const { data: taken } = await ctx.admin.from('profiles').select('id').eq('staff_id', staffId).maybeSingle()
  if (taken) return fail('That Staff ID is taken. Choose another.')

  // Move the internal sign-in address with the ID. A real email (set by an administrator) stays as it is.
  const { data: auth } = await ctx.admin.auth.admin.getUserById(ctx.user.id)
  const oldEmail = auth.user?.email ?? ''
  const moveEmail = oldEmail.endsWith('@cyd.internal')
  if (moveEmail) {
    const { error } = await ctx.admin.auth.admin.updateUserById(ctx.user.id, { email: `${staffId.toLowerCase()}@cyd.internal`, email_confirm: true })
    if (error) {
      console.error('updateMyStaffId email:', error)
      return fail(/already|registered|exists/i.test(error.message) ? 'That Staff ID is taken. Choose another.' : 'Could not change your Staff ID. Please try again.')
    }
  }

  // The login page prefers the profile's email when there is one, so an internal one there moves too.
  const internalProfileEmail = ctx.profile.email?.endsWith('@cyd.internal')
  const { error } = await ctx.admin
    .from('profiles')
    .update({ staff_id: staffId, ...(internalProfileEmail ? { email: `${staffId.toLowerCase()}@cyd.internal` } : {}) })
    .eq('id', ctx.user.id)
  if (error) {
    if (moveEmail) await ctx.admin.auth.admin.updateUserById(ctx.user.id, { email: oldEmail, email_confirm: true })
    console.error('updateMyStaffId profile:', error)
    return fail(error.code === '23505' ? 'That Staff ID is taken. Choose another.' : 'Could not change your Staff ID. Please try again.')
  }
  refresh(ctx.profile.role)
  return { ok: true, staffId }
}

export async function changeMyPassword(input: { current: string; next: string }): Promise<Result> {
  const ctx = await staffContext()
  if (!ctx) return fail('Please sign in with your staff account.')
  if (input.next.length < 8) return fail('Use a new password of at least 8 characters.')
  if (!/[A-Za-z]/.test(input.next) || !/\d/.test(input.next)) return fail('Use letters and at least one number in the new password.')
  if (input.next === input.current) return fail('The new password must be different from the current one.')

  const { data: auth } = await ctx.admin.auth.admin.getUserById(ctx.user.id)
  const email = auth.user?.email
  if (!email) return fail('Your account has no sign-in address. Ask the Consult Your Doctor team to reset your password.')

  // Check the current password on a throwaway client, so this request's own session is untouched.
  const check = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: wrong } = await check.auth.signInWithPassword({ email, password: input.current })
  if (wrong) return fail('Your current password is incorrect.')
  await check.auth.signOut({ scope: 'local' }).catch(() => {})

  const { error } = await ctx.admin.auth.admin.updateUserById(ctx.user.id, { password: input.next })
  if (error) {
    console.error('changeMyPassword:', error)
    return fail(/weak|short|password/i.test(error.message) ? error.message : 'Could not change your password. Please try again.')
  }
  return { ok: true }
}
