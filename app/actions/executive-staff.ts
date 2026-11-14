'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createStaffLogin, randomPassword } from '@/lib/provisioning'
import { sendExecutiveLoginEmail } from '@/lib/notify/email'
import { siteUrl } from '@/lib/site-url'
import { PAGE_LABEL, TEAM_LABEL, isPageKey, isTeam, type Team } from '@/app/executive/_lib/access'

// Staff & access (/executive/staff): which pages each team opens, executives' teams, new executive logins and
// removing access. Only Management can change any of it; every change goes into the access log.

type Result = { ok: true } | { ok: false; error: string }
const NOT_SET_UP = 'Staff & access isn’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.'
const ONLY_MANAGEMENT = 'Only Management can change staff and access.'

/** The signed-in executive, if they are in Management (or have no team yet, which counts as Management). */
async function management() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  if (me?.role !== 'executive') return null
  const { data: team, error } = await admin.from('profiles').select('executive_team').eq('id', user.id).maybeSingle()
  if (error) return { user, admin, name: (me.full_name as string | null) ?? 'Executive', ready: false }
  const t = (team as { executive_team?: string | null } | null)?.executive_team
  if (t && t !== 'management') return null
  return { user, admin, name: (me.full_name as string | null) ?? 'Executive', ready: true }
}

async function log(admin: ReturnType<typeof createAdminClient>, actor: { id: string; name: string }, action: string) {
  const { error } = await admin.from('executive_access_log').insert({ actor_id: actor.id, actor_name: actor.name, action })
  if (error) console.error('executive access log:', error)
}

/** Lets a team open a page, or stops it. Management always opens every page. */
export async function setTeamAccess(team: string, page: string, allowed: boolean): Promise<Result> {
  const ctx = await management()
  if (!ctx) return { ok: false, error: ONLY_MANAGEMENT }
  if (!ctx.ready) return { ok: false, error: NOT_SET_UP }
  if (!isTeam(team) || team === 'management' || !isPageKey(page)) return { ok: false, error: 'Not found.' }
  const { error } = allowed
    ? await ctx.admin.from('executive_page_access').upsert({ team, page }, { onConflict: 'team,page' })
    : await ctx.admin.from('executive_page_access').delete().eq('team', team).eq('page', page)
  if (error) return { ok: false, error: NOT_SET_UP }
  await log(ctx.admin, { id: ctx.user.id, name: ctx.name }, `${allowed ? 'gave' : 'took away'} ${TEAM_LABEL[team]} access to ${PAGE_LABEL[page]}`)
  revalidatePath('/executive', 'layout')
  return { ok: true }
}

/** How many active Management members there are (executives without a team count). */
async function managementCount(admin: ReturnType<typeof createAdminClient>, except?: string) {
  const { data } = await admin.from('profiles').select('id, executive_team').eq('role', 'executive').limit(500)
  const rows = ((data ?? []) as { id: string; executive_team: string | null }[]).filter((r) => r.id !== except && (!r.executive_team || r.executive_team === 'management'))
  let active = 0
  for (const r of rows) {
    const { data: u } = await admin.auth.admin.getUserById(r.id)
    const banned = u?.user?.banned_until && Date.parse(u.user.banned_until) > Date.now()
    if (!banned) active++
  }
  return active
}

/** Moves an executive to another team. Management can't leave itself with nobody in it. */
export async function setMemberTeam(profileId: string, team: string): Promise<Result> {
  const ctx = await management()
  if (!ctx) return { ok: false, error: ONLY_MANAGEMENT }
  if (!ctx.ready) return { ok: false, error: NOT_SET_UP }
  if (!z.string().uuid().safeParse(profileId).success || !isTeam(team)) return { ok: false, error: 'Not found.' }
  const { data: member } = await ctx.admin.from('profiles').select('role, full_name, executive_team').eq('id', profileId).maybeSingle()
  if (member?.role !== 'executive') return { ok: false, error: 'Not found.' }
  if (team !== 'management' && (await managementCount(ctx.admin, profileId)) === 0) return { ok: false, error: 'Keep at least one person in Management.' }
  const { error } = await ctx.admin.from('profiles').update({ executive_team: team }).eq('id', profileId)
  if (error) return { ok: false, error: NOT_SET_UP }
  await log(ctx.admin, { id: ctx.user.id, name: ctx.name }, `moved ${member.full_name ?? 'an executive'} to ${TEAM_LABEL[team]}`)
  revalidatePath('/executive', 'layout')
  return { ok: true }
}

const NewLogin = z.object({
  fullName: z.string().trim().min(2, 'Enter their full name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter their work email.'),
  team: z.enum(['management', 'operations', 'finance', 'support']),
})

/**
 * A new executive login: an employee ID and a temporary password made here, and an email with a link to set their own
 * password (we never email passwords). Returns the ID for the screen.
 */
export async function createExecutiveLogin(input: { fullName: string; email: string; team: string }): Promise<{ ok: true; staffId: string; emailed: boolean } | { ok: false; error: string }> {
  const ctx = await management()
  if (!ctx) return { ok: false, error: ONLY_MANAGEMENT }
  if (!ctx.ready) return { ok: false, error: NOT_SET_UP }
  const parsed = NewLogin.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const { fullName, email, team } = parsed.data

  const login = await createStaffLogin(ctx.admin, { role: 'executive', fullName, email, password: randomPassword() })
  if ('error' in login) return { ok: false, error: login.error }
  await ctx.admin.from('profiles').update({ executive_team: team }).eq('id', login.userId)

  const base = siteUrl()
  let link: string | null = null
  try {
    const { data } = await ctx.admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${base}/update-password` } })
    link = data?.properties?.action_link ?? null
  } catch (err) {
    console.error('createExecutiveLogin generateLink:', err)
  }
  const emailed = link
    ? await sendExecutiveLoginEmail({ to: email, name: fullName, staffId: login.staffId, team: TEAM_LABEL[team as Team], setPasswordLink: link, signInUrl: `${base}/login/executive` }).catch(() => false)
    : false
  await log(ctx.admin, { id: ctx.user.id, name: ctx.name }, `created a login for ${fullName} in ${TEAM_LABEL[team as Team]}`)
  revalidatePath('/executive/staff')
  return { ok: true, staffId: login.staffId, emailed }
}

/** Sends a fresh set-password link to an executive who hasn't signed in (or lost theirs). */
export async function resendExecutiveInvite(profileId: string): Promise<Result> {
  const ctx = await management()
  if (!ctx) return { ok: false, error: ONLY_MANAGEMENT }
  if (!z.string().uuid().safeParse(profileId).success) return { ok: false, error: 'Not found.' }
  const { data: member } = await ctx.admin.from('profiles').select('role, full_name, email, staff_id').eq('id', profileId).maybeSingle()
  if (member?.role !== 'executive' || !member.email) return { ok: false, error: 'They have no email address on file.' }
  const base = siteUrl()
  const { data } = await ctx.admin.auth.admin.generateLink({ type: 'recovery', email: member.email, options: { redirectTo: `${base}/update-password` } })
  const link = data?.properties?.action_link
  if (!link) return { ok: false, error: 'Could not make a new link. Please try again.' }
  const { data: t } = await ctx.admin.from('profiles').select('executive_team').eq('id', profileId).maybeSingle()
  const team = (t as { executive_team?: string | null } | null)?.executive_team
  const sent = await sendExecutiveLoginEmail({ to: member.email, name: member.full_name ?? 'there', staffId: member.staff_id ?? '', team: isTeam(team) ? TEAM_LABEL[team] : 'Management', setPasswordLink: link, signInUrl: `${base}/login/executive` }).catch(() => false)
  if (!sent) return { ok: false, error: 'The email could not be sent. Check the mail settings.' }
  await log(ctx.admin, { id: ctx.user.id, name: ctx.name }, `sent a new set-password link to ${member.full_name ?? 'an executive'}`)
  return { ok: true }
}

/** Stops an executive signing in (or lets them back in). Their history stays. */
export async function setMemberRemoved(profileId: string, removed: boolean): Promise<Result> {
  const ctx = await management()
  if (!ctx) return { ok: false, error: ONLY_MANAGEMENT }
  if (!z.string().uuid().safeParse(profileId).success) return { ok: false, error: 'Not found.' }
  if (profileId === ctx.user.id) return { ok: false, error: 'You can’t remove yourself.' }
  const { data: member } = await ctx.admin.from('profiles').select('role, full_name').eq('id', profileId).maybeSingle()
  if (member?.role !== 'executive') return { ok: false, error: 'Not found.' }
  if (removed && (await managementCount(ctx.admin, profileId)) === 0) return { ok: false, error: 'Keep at least one person in Management.' }
  const { error } = await ctx.admin.auth.admin.updateUserById(profileId, { ban_duration: removed ? '876000h' : 'none' })
  if (error) return { ok: false, error: 'Could not change their access. Please try again.' }
  await log(ctx.admin, { id: ctx.user.id, name: ctx.name }, `${removed ? 'removed' : 'restored'} ${member.full_name ?? 'an executive'}`)
  revalidatePath('/executive/staff')
  return { ok: true }
}
