import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Verified badges (supabase/migrations/20261114_grow_and_manage.sql): a doctor or hospital pays for a badge, the
// Consult your Doctor team checks the requirements (/executive/badges), and the blue tick shows on public pages only
// while the badge is active. Paying never switches it on by itself.

export type BadgeSubject = 'doctor' | 'hospital'
export type BadgePlan = 'monthly' | 'yearly'
export type BadgeStatus = 'awaiting_payment' | 'in_review' | 'active' | 'rejected' | 'cancelled'

/** What each badge costs, in rupees. Hospitals buy monthly; doctors monthly or yearly. */
export const BADGE_PRICES: Record<BadgeSubject, Partial<Record<BadgePlan, number>>> = {
  hospital: { monthly: 1999 },
  doctor: { monthly: 499, yearly: 4999 },
}

export const PLAN_LABEL: Record<BadgePlan, string> = { monthly: 'Monthly', yearly: 'Yearly' }
export const PLAN_PER: Record<BadgePlan, string> = { monthly: 'per month', yearly: 'per year' }

export type Badge = {
  id: string
  subject: BadgeSubject
  doctorId: string | null
  hospitalId: string | null
  plan: BadgePlan
  amount: number
  status: BadgeStatus
  paidBy: 'doctor' | 'hospital'
  startsAt: string | null
  endsAt: string | null
  reviewNote: string | null
  createdAt: string
}

type Row = {
  id: string
  subject: BadgeSubject
  doctor_id: string | null
  hospital_id: string | null
  plan: BadgePlan
  amount: number | string
  status: BadgeStatus
  paid_by: 'doctor' | 'hospital'
  starts_at: string | null
  ends_at: string | null
  review_note: string | null
  created_at: string
}

export const BADGE_COLUMNS = 'id, subject, doctor_id, hospital_id, plan, amount, status, paid_by, starts_at, ends_at, review_note, created_at'

export const toBadge = (r: Row): Badge => ({
  id: r.id,
  subject: r.subject,
  doctorId: r.doctor_id,
  hospitalId: r.hospital_id,
  plan: r.plan,
  amount: Number(r.amount) || 0,
  status: r.status,
  paidBy: r.paid_by,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  reviewNote: r.review_note,
  createdAt: r.created_at,
})

/** True while the badge shows: checked by the team and inside its paid period. */
export const isLive = (b: Badge, now: number) => b.status === 'active' && !!b.endsAt && Date.parse(b.endsAt) > now && (!b.startsAt || Date.parse(b.startsAt) <= now)

/**
 * Badges for a hospital and/or some doctors, newest first. `ready` is false until the migration has run, so pages can
 * say the feature is being set up instead of failing.
 */
export async function loadBadges(admin: Admin, { hospitalId, doctorIds = [] }: { hospitalId?: string; doctorIds?: string[] }): Promise<{ ready: boolean; badges: Badge[] }> {
  const filters = [hospitalId ? `and(subject.eq.hospital,hospital_id.eq.${hospitalId})` : null, doctorIds.length ? `doctor_id.in.(${doctorIds.join(',')})` : null].filter(Boolean)
  if (!filters.length) return { ready: true, badges: [] }
  const { data, error } = await admin.from('verified_badges').select(BADGE_COLUMNS).or(filters.join(',')).order('created_at', { ascending: false }).limit(1000)
  if (error) return { ready: false, badges: [] }
  return { ready: true, badges: ((data ?? []) as Row[]).map(toBadge) }
}

/** One subject's badges at a glance: the live one, one being checked, and one waiting for payment. */
export function badgeState(badges: Badge[], now: number) {
  const live = badges.filter((b) => isLive(b, now)).sort((a, b) => (b.endsAt ?? '').localeCompare(a.endsAt ?? ''))[0] ?? null
  // Paid ahead of time: approved, starting when the live one ends.
  const upcoming = badges.find((b) => b.status === 'active' && !!b.startsAt && Date.parse(b.startsAt) > now) ?? null
  return {
    live,
    upcoming,
    inReview: badges.find((b) => b.status === 'in_review') ?? null,
    awaiting: badges.find((b) => b.status === 'awaiting_payment') ?? null,
    rejected: badges.find((b) => b.status === 'rejected') ?? null,
  }
}

/** The ids of every doctor and hospital whose badge is live, for the public blue tick. Empty until the migration runs. */
export async function liveBadgeIds(admin: Admin): Promise<{ doctors: string[]; hospitals: string[] }> {
  const nowIso = new Date().toISOString()
  const { data, error } = await admin
    .from('verified_badges')
    .select('subject, doctor_id, hospital_id')
    .eq('status', 'active')
    .gt('ends_at', nowIso)
    .lte('starts_at', nowIso)
    .limit(20000)
  if (error) return { doctors: [], hospitals: [] }
  const rows = (data ?? []) as { subject: BadgeSubject; doctor_id: string | null; hospital_id: string | null }[]
  return {
    doctors: [...new Set(rows.filter((r) => r.subject === 'doctor' && r.doctor_id).map((r) => r.doctor_id!))],
    hospitals: [...new Set(rows.filter((r) => r.subject === 'hospital' && r.hospital_id).map((r) => r.hospital_id!))],
  }
}

/** Whether one doctor or hospital has a live badge (staff pages' own tick). */
export async function hasLiveBadge(admin: Admin, subject: BadgeSubject, id: string): Promise<boolean> {
  const nowIso = new Date().toISOString()
  const { data, error } = await admin
    .from('verified_badges')
    .select('id')
    .eq('subject', subject)
    .eq(subject === 'doctor' ? 'doctor_id' : 'hospital_id', id)
    .eq('status', 'active')
    .gt('ends_at', nowIso)
    .lte('starts_at', nowIso)
    .limit(1)
  return !error && (data?.length ?? 0) > 0
}

const DAY = 86_400_000
export const ACTIVE_DAYS_NEEDED = 30

export type Requirement = { label: string; met: boolean | null; note?: string }

/**
 * What a doctor needs before the team will switch a badge on. The registration number, photo and 30 days on the
 * platform can be seen here; the registration and photo ID are checked by the team when they review (null).
 */
export function doctorRequirements(d: { registrationNumber: string | null; image: string | null; joined: string | null }, now: number): Requirement[] {
  const days = d.joined ? Math.floor((now - Date.parse(d.joined)) / DAY) : null
  return [
    { label: 'Medical registration number on your profile', met: !!d.registrationNumber?.trim(), note: 'Our team checks it with the medical council when they review' },
    { label: 'Government photo ID checked', met: null, note: 'Our team asks for it when they review, if it isn’t on file' },
    { label: 'Profile photo added', met: !!d.image },
    { label: `Active on Consult your Doctor for ${ACTIVE_DAYS_NEEDED} days`, met: days != null && days >= ACTIVE_DAYS_NEEDED, note: days != null && days < ACTIVE_DAYS_NEEDED ? `${ACTIVE_DAYS_NEEDED - days} more days to go` : undefined },
  ]
}

/** The requirements a doctor can be bought a badge with: everything that can be seen is met. */
export const meetsRequirements = (reqs: Requirement[]) => reqs.every((r) => r.met !== false)

/** When a badge approved now (or after the live one) would end. */
export function periodEnd(startIso: string, plan: BadgePlan) {
  const d = new Date(startIso)
  if (plan === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString()
}
