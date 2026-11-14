'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/notify/email'
import { siteUrl } from '@/lib/site-url'
import { doctorName } from '@/components/patient/format'

// Doctors practising at more than one hospital (lib/practices.ts). The hospital invites, the doctor accepts, the
// Consult your Doctor team confirms; then the hospital publishes the doctor's slots at its address.

type Result = { ok: true } | { ok: false; error: string }
const NOT_SET_UP = 'Visiting doctors aren’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.'
const uuid = z.string().uuid()

async function hospitalCaller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  return { user, admin, hospitalId: profile.hospital_id as string }
}

async function doctorCaller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: doctor } = await admin.from('doctors').select('id, hospital_id').eq('profile_id', user.id).maybeSingle()
  return doctor ? { user, admin, doctorId: doctor.id as string } : null
}

async function executiveCaller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'executive' ? { user, admin } : null
}

function refresh() {
  for (const p of ['/hospital/doctors', '/doctor/practice', '/executive/branches']) revalidatePath(p)
}

/** The hospital invites a doctor from another hospital, found by the doctor's staff ID, to consult at its address. */
export async function inviteVisitingDoctor(rawStaffId: string, note: string): Promise<Result> {
  const ctx = await hospitalCaller()
  if (!ctx) return { ok: false, error: 'Please log in with your hospital account.' }
  const staffId = rawStaffId.trim().toUpperCase()
  if (!/^[A-Z0-9-]{4,24}$/.test(staffId)) return { ok: false, error: 'Enter the doctor’s staff ID, like CYDAR1234.' }
  const { data: profile } = await ctx.admin.from('profiles').select('id, role, full_name, email').eq('staff_id', staffId).maybeSingle()
  if (profile?.role !== 'doctor') return { ok: false, error: 'No doctor has that staff ID.' }
  const { data: doctor } = await ctx.admin.from('doctors').select('id, hospital_id').eq('profile_id', profile.id).maybeSingle()
  if (!doctor) return { ok: false, error: 'No doctor has that staff ID.' }
  if (doctor.hospital_id === ctx.hospitalId) return { ok: false, error: 'This doctor already works at your hospital.' }

  const { data: existing, error: readError } = await ctx.admin.from('doctor_practices').select('id, status').eq('doctor_id', doctor.id).eq('hospital_id', ctx.hospitalId).maybeSingle()
  if (readError) return { ok: false, error: NOT_SET_UP }
  if (existing && ['invited', 'accepted', 'confirmed'].includes(existing.status as string)) return { ok: false, error: 'This doctor is already invited or linked to your hospital.' }
  const row = { status: 'invited', note: note.trim().slice(0, 500) || null, invited_by: ctx.user.id, responded_at: null, reviewed_at: null, reviewed_by: null, review_note: null }
  const { error } = existing
    ? await ctx.admin.from('doctor_practices').update(row).eq('id', existing.id)
    : await ctx.admin.from('doctor_practices').insert({ ...row, doctor_id: doctor.id, hospital_id: ctx.hospitalId })
  if (error) return { ok: false, error: NOT_SET_UP }

  const { data: hospital } = await ctx.admin.from('hospitals').select('name').eq('id', ctx.hospitalId).maybeSingle()
  if (profile.email && !String(profile.email).endsWith('.internal')) {
    await sendEmail({
      to: profile.email,
      subject: `Consult Your Doctor: ${hospital?.name ?? 'A hospital'} invites you to consult there`,
      paragraphs: [
        `Dear ${doctorName(profile.full_name)},`,
        `${hospital?.name ?? 'A partner hospital'} has invited you to consult at their hospital too, on Consult Your Doctor.${row.note ? ` Their note: “${row.note}”` : ''}`,
        'If you accept, our team confirms the link, and the hospital publishes your slots at its address. Your own hospital’s slots don’t change.',
      ],
      button: { text: 'See the invitation', url: `${siteUrl()}/doctor/practice` },
    }).catch(() => false)
  }
  refresh()
  return { ok: true }
}

/** The doctor accepts or declines an invitation to consult at another hospital. */
export async function respondToPractice(practiceId: string, accept: boolean): Promise<Result> {
  const ctx = await doctorCaller()
  if (!ctx || !uuid.safeParse(practiceId).success) return { ok: false, error: 'Please log in with your doctor account.' }
  const { data, error } = await ctx.admin
    .from('doctor_practices')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', practiceId)
    .eq('doctor_id', ctx.doctorId)
    .eq('status', 'invited')
    .select('id')
  if (error) return { ok: false, error: NOT_SET_UP }
  if (!data?.length) return { ok: false, error: 'This invitation has already been answered.' }
  refresh()
  return { ok: true }
}

/** The Consult your Doctor team confirms (or turns down) a link the doctor accepted. */
export async function reviewPractice(practiceId: string, confirm: boolean, note = ''): Promise<Result> {
  const ctx = await executiveCaller()
  if (!ctx || !uuid.safeParse(practiceId).success) return { ok: false, error: 'Only the Consult your Doctor team can confirm practice links.' }
  const { data, error } = await ctx.admin
    .from('doctor_practices')
    .update({ status: confirm ? 'confirmed' : 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: ctx.user.id, review_note: note.trim().slice(0, 300) || null })
    .eq('id', practiceId)
    .eq('status', 'accepted')
    .select('id')
  if (error) return { ok: false, error: NOT_SET_UP }
  if (!data?.length) return { ok: false, error: 'This link isn’t waiting for review any more.' }
  refresh()
  return { ok: true }
}

/**
 * Ends a confirmed link, from the hospital or the doctor. Open slots the hospital published for the doctor are taken
 * down; booked ones stay, so nobody loses a visit.
 */
export async function endPractice(practiceId: string): Promise<Result> {
  if (!uuid.safeParse(practiceId).success) return { ok: false, error: 'Not found.' }
  const hospital = await hospitalCaller()
  const doctor = hospital ? null : await doctorCaller()
  const ctx = hospital ?? doctor
  if (!ctx) return { ok: false, error: 'Please log in.' }
  const { data: link, error } = await ctx.admin.from('doctor_practices').select('id, doctor_id, hospital_id, status').eq('id', practiceId).maybeSingle()
  if (error) return { ok: false, error: NOT_SET_UP }
  if (!link || (hospital && link.hospital_id !== hospital.hospitalId) || (doctor && link.doctor_id !== doctor.doctorId)) return { ok: false, error: 'Not found.' }
  if (!['invited', 'accepted', 'confirmed'].includes(link.status as string)) return { ok: false, error: 'This link has already ended.' }
  await ctx.admin.from('doctor_practices').update({ status: 'ended' }).eq('id', practiceId)
  await ctx.admin.from('schedules').delete().eq('doctor_id', link.doctor_id).eq('hospital_id', link.hospital_id).eq('is_booked', false).gt('start_time', new Date().toISOString())
  refresh()
  return { ok: true }
}
