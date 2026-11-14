'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { BADGE_COLUMNS, BADGE_PRICES, badgeState, doctorRequirements, meetsRequirements, periodEnd, toBadge, type Badge, type BadgePlan } from '@/lib/badges'

// Verified badges. A doctor (or their hospital) buys a badge: a badge_payments row with the price fixed here, and a
// verified_badges row waiting for that payment. Paying (lib/purchase-client.ts → lib/purchases.ts) sends it to the team,
// who check the requirements and switch it on (/executive/badges) or reject and refund it. Paying never shows a tick.

type Started = { ok: true; paymentId: string | null } | { ok: false; error: string }
type Result = { ok: true } | { ok: false; error: string }
const NOT_SET_UP = 'Verified badges are being set up. Please try again later.'
const uuid = z.string().uuid()
const DAY = 86_400_000

type Admin = ReturnType<typeof createAdminClient>

/** A doctor row with what the requirements need (registration_number arrives with an earlier migration). */
async function doctorFacts(admin: Admin, doctorId: string) {
  const { data } = await admin.from('doctors').select('*').eq('id', doctorId).maybeSingle()
  if (!data) return null
  const d = data as { id: string; profile_id: string; hospital_id: string | null; image_url: string | null; registration_number?: string | null }
  const { data: profile } = await admin.from('profiles').select('created_at').eq('id', d.profile_id).maybeSingle()
  return { id: d.id, profileId: d.profile_id, hospitalId: d.hospital_id, registrationNumber: d.registration_number ?? null, image: d.image_url, joined: (profile?.created_at as string | null) ?? null }
}

async function subjectBadges(admin: Admin, column: 'doctor_id' | 'hospital_id', id: string, subject: 'doctor' | 'hospital') {
  const { data, error } = await admin.from('verified_badges').select(BADGE_COLUMNS).eq('subject', subject).eq(column, id).limit(200)
  if (error) return null
  return ((data ?? []) as Parameters<typeof toBadge>[0][]).map(toBadge)
}

/** Can another badge be bought for this subject now? One being checked, or paid ahead, is enough. */
function blocker(badges: Badge[], now: number): string | null {
  const s = badgeState(badges, now)
  if (s.inReview) return 'A badge is already being checked by our team.'
  if (s.upcoming) return 'The next period is already paid.'
  // Renewing is allowed in the last 7 days of a live badge.
  if (s.live?.endsAt && Date.parse(s.live.endsAt) - now > 7 * DAY) return 'Your badge is active. You can renew it in its last 7 days.'
  return null
}

/** The doctor buys their own badge, or asks their hospital to pay for it. */
export async function startDoctorBadge(plan: BadgePlan, payBy: 'self' | 'hospital'): Promise<Started> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in.' }
  const admin = createAdminClient()
  const { data: row } = await admin.from('doctors').select('id').eq('profile_id', user.id).maybeSingle()
  if (!row) return { ok: false, error: 'Please log in with your doctor account.' }
  const d = await doctorFacts(admin, row.id)
  if (!d) return { ok: false, error: 'Please log in with your doctor account.' }
  const price = BADGE_PRICES.doctor[plan]
  if (!price) return { ok: false, error: 'Choose a plan.' }
  const now = Date.now()
  if (!meetsRequirements(doctorRequirements(d, now))) return { ok: false, error: 'Your profile doesn’t meet the requirements yet.' }
  if (payBy === 'hospital' && !d.hospitalId) return { ok: false, error: 'You aren’t linked to a hospital.' }

  const badges = await subjectBadges(admin, 'doctor_id', d.id, 'doctor')
  if (!badges) return { ok: false, error: NOT_SET_UP }
  const blocked = blocker(badges, now)
  if (blocked) return { ok: false, error: blocked }
  // Drop an earlier unpaid request, so only one waits at a time.
  await admin.from('verified_badges').update({ status: 'cancelled' }).eq('subject', 'doctor').eq('doctor_id', d.id).eq('status', 'awaiting_payment')

  if (payBy === 'hospital') {
    const { error } = await admin.from('verified_badges').insert({ subject: 'doctor', doctor_id: d.id, plan, amount: price, paid_by: 'hospital', requested_by: user.id })
    if (error) return { ok: false, error: NOT_SET_UP }
    revalidatePath('/doctor/badge')
    return { ok: true, paymentId: null }
  }

  const { data: payment, error } = await admin.from('badge_payments').insert({ payer_id: user.id, amount: price }).select('id').single()
  if (error || !payment) return { ok: false, error: NOT_SET_UP }
  const { error: badgeError } = await admin.from('verified_badges').insert({ subject: 'doctor', doctor_id: d.id, plan, amount: price, paid_by: 'doctor', requested_by: user.id, payment_id: payment.id })
  if (badgeError) return { ok: false, error: NOT_SET_UP }
  return { ok: true, paymentId: payment.id }
}

/** Withdraws a badge request that hasn't been paid. */
export async function cancelBadgeRequest(badgeId: string): Promise<Result> {
  const user = await getCurrentUser()
  if (!user || !uuid.safeParse(badgeId).success) return { ok: false, error: 'Not found.' }
  const admin = createAdminClient()
  const { data: badge } = await admin.from('verified_badges').select('subject, doctor_id, hospital_id, status').eq('id', badgeId).maybeSingle()
  if (!badge || badge.status !== 'awaiting_payment') return { ok: false, error: 'This request can’t be withdrawn.' }
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  let mine = false
  if (profile?.role === 'doctor' && badge.doctor_id) {
    const { data: d } = await admin.from('doctors').select('id').eq('id', badge.doctor_id).eq('profile_id', user.id).maybeSingle()
    mine = !!d
  } else if (profile?.role === 'hospital_admin' && profile.hospital_id) {
    if (badge.subject === 'hospital') mine = badge.hospital_id === profile.hospital_id
    else if (badge.doctor_id) {
      const { data: d } = await admin.from('doctors').select('id').eq('id', badge.doctor_id).eq('hospital_id', profile.hospital_id).maybeSingle()
      mine = !!d
    }
  }
  if (!mine) return { ok: false, error: 'Not found.' }
  await admin.from('verified_badges').update({ status: 'cancelled' }).eq('id', badgeId).eq('status', 'awaiting_payment')
  revalidatePath('/doctor/badge')
  revalidatePath('/hospital/badges')
  return { ok: true }
}

/** The hospital pays, in one payment, for its own badge and/or badges for some of its doctors. */
export async function startHospitalBadges(input: { hospital: boolean; doctorIds: string[] }): Promise<Started> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in.' }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { ok: false, error: 'Please log in with your hospital account.' }
  const hospitalId = profile.hospital_id as string
  const doctorIds = [...new Set(input.doctorIds)].filter((id) => uuid.safeParse(id).success).slice(0, 100)
  if (!input.hospital && !doctorIds.length) return { ok: false, error: 'Choose what to verify.' }
  const now = Date.now()
  const lines: { subject: 'doctor' | 'hospital'; doctorId: string | null; amount: number; reuse: string | null }[] = []

  if (input.hospital) {
    const { data: h } = await admin.from('hospitals').select('status, created_at').eq('id', hospitalId).maybeSingle()
    if (h?.status !== 'active') return { ok: false, error: 'Your hospital needs to be live on Consult your Doctor first.' }
    const badges = await subjectBadges(admin, 'hospital_id', hospitalId, 'hospital')
    if (!badges) return { ok: false, error: NOT_SET_UP }
    const blocked = blocker(badges, now)
    if (blocked) return { ok: false, error: `Hospital badge: ${blocked}` }
    lines.push({ subject: 'hospital', doctorId: null, amount: BADGE_PRICES.hospital.monthly!, reuse: null })
  }

  for (const id of doctorIds) {
    const d = await doctorFacts(admin, id)
    if (!d || d.hospitalId !== hospitalId) return { ok: false, error: 'One of the doctors isn’t on your roster.' }
    if (!meetsRequirements(doctorRequirements(d, now))) return { ok: false, error: 'One of the doctors doesn’t meet the requirements yet.' }
    const badges = await subjectBadges(admin, 'doctor_id', id, 'doctor')
    if (!badges) return { ok: false, error: NOT_SET_UP }
    const blocked = blocker(badges, now)
    if (blocked) return { ok: false, error: blocked }
    // A doctor's own "ask my hospital to pay" request is paid as asked (their plan); otherwise monthly.
    const asked = badges.find((b) => b.status === 'awaiting_payment' && b.paidBy === 'hospital') ?? null
    lines.push({ subject: 'doctor', doctorId: id, amount: asked?.amount ?? BADGE_PRICES.doctor.monthly!, reuse: asked?.id ?? null })
  }

  const total = lines.reduce((s, l) => s + l.amount, 0)
  const { data: payment, error } = await admin.from('badge_payments').insert({ payer_id: user.id, hospital_id: hospitalId, amount: total }).select('id').single()
  if (error || !payment) return { ok: false, error: NOT_SET_UP }

  for (const l of lines) {
    if (l.reuse) {
      await admin.from('verified_badges').update({ payment_id: payment.id }).eq('id', l.reuse)
      continue
    }
    // An earlier unpaid hospital-paid line for the same subject is replaced by this one.
    await admin
      .from('verified_badges')
      .update({ status: 'cancelled' })
      .eq('subject', l.subject)
      .eq(l.subject === 'doctor' ? 'doctor_id' : 'hospital_id', l.doctorId ?? hospitalId)
      .eq('status', 'awaiting_payment')
    const { error: e } = await admin.from('verified_badges').insert({
      subject: l.subject,
      doctor_id: l.doctorId,
      hospital_id: l.subject === 'hospital' ? hospitalId : null,
      plan: 'monthly',
      amount: l.amount,
      paid_by: 'hospital',
      requested_by: user.id,
      payment_id: payment.id,
    })
    if (e) return { ok: false, error: NOT_SET_UP }
  }
  return { ok: true, paymentId: payment.id }
}

// --- The team (/executive/badges) ---------------------------------------------------------------------------------

async function executive() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'executive' ? { user, admin } : null
}

/** Switches a paid badge on after checking the requirements. It runs on from the end of a live one, if any. */
export async function approveBadge(badgeId: string): Promise<Result> {
  const ctx = await executive()
  if (!ctx) return { ok: false, error: 'Only the operations team can review badges.' }
  if (!uuid.safeParse(badgeId).success) return { ok: false, error: 'Not found.' }
  const { data } = await ctx.admin.from('verified_badges').select(BADGE_COLUMNS).eq('id', badgeId).maybeSingle()
  if (!data) return { ok: false, error: 'Not found.' }
  const badge = toBadge(data as Parameters<typeof toBadge>[0])
  if (badge.status !== 'in_review') return { ok: false, error: 'Only paid badges waiting for review can be approved.' }
  const column = badge.subject === 'doctor' ? 'doctor_id' : 'hospital_id'
  const others = (await subjectBadges(ctx.admin, column, (badge.doctorId ?? badge.hospitalId)!, badge.subject)) ?? []
  const now = new Date()
  const lastEnd = others.filter((b) => b.status === 'active' && b.endsAt && Date.parse(b.endsAt) > now.getTime()).map((b) => b.endsAt!).sort().pop()
  const startsAt = lastEnd ?? now.toISOString()
  const { error } = await ctx.admin
    .from('verified_badges')
    .update({ status: 'active', starts_at: startsAt, ends_at: periodEnd(startsAt, badge.plan), reviewed_by: ctx.user.id, reviewed_at: now.toISOString(), review_note: null })
    .eq('id', badgeId)
    .eq('status', 'in_review')
  if (error) return { ok: false, error: 'Could not approve it. Please try again.' }
  revalidatePath('/executive/badges')
  return { ok: true }
}

/** Turns a paid badge down; the payment is refunded from the Razorpay dashboard. */
export async function rejectBadge(badgeId: string, note: string): Promise<Result> {
  const ctx = await executive()
  if (!ctx) return { ok: false, error: 'Only the operations team can review badges.' }
  const reason = note.trim().slice(0, 300)
  if (!uuid.safeParse(badgeId).success) return { ok: false, error: 'Not found.' }
  if (reason.length < 5) return { ok: false, error: 'Say why, so the doctor or hospital knows what to fix.' }
  const { error } = await ctx.admin
    .from('verified_badges')
    .update({ status: 'rejected', review_note: reason, reviewed_by: ctx.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', badgeId)
    .eq('status', 'in_review')
  if (error) return { ok: false, error: 'Could not reject it. Please try again.' }
  revalidatePath('/executive/badges')
  return { ok: true }
}
