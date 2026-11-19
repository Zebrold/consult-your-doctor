'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { PHOTO_CACHE } from '@/lib/photos'
import { overLimit } from '@/lib/rate-limit'
import { passwordLink } from '@/lib/password-link'
import { sendEmail } from '@/lib/notify/email'

// What a hospital does for a doctor on its own roster: upload their profile photo and send them a password reset link.
// The reset link only ever goes to the doctor's own email; it is never returned to the browser, shown or logged.

const uuid = z.string().uuid()
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_PHOTO = 5 * 1024 * 1024

async function hospitalCaller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  return { admin, hospitalId: profile.hospital_id as string }
}
type Ctx = NonNullable<Awaited<ReturnType<typeof hospitalCaller>>>

/** The doctor's home hospital only (visiting doctors are managed by their own hospital). */
async function ownDoctor(ctx: Ctx, doctorId: string) {
  const { data } = await ctx.admin.from('doctors').select('id, profile_id, hospital_id').eq('id', doctorId).eq('hospital_id', ctx.hospitalId).maybeSingle()
  return data ? { id: data.id as string, profileId: data.profile_id as string | null } : null
}

export async function uploadDoctorPhoto(form: FormData): Promise<{ ok: true; image: string } | { ok: false; error: string }> {
  const ctx = await hospitalCaller()
  if (!ctx) return { ok: false, error: 'Please log in with your hospital account.' }
  const id = uuid.safeParse(String(form.get('doctorId') || ''))
  if (!id.success) return { ok: false, error: 'Doctor not found.' }
  const image = form.get('image')
  if (!(image instanceof File) || image.size === 0) return { ok: false, error: 'Choose a photo to upload.' }
  const ext = IMAGE_TYPES[image.type]
  if (!ext) return { ok: false, error: 'Use a JPG, PNG or WebP photo.' }
  if (image.size > MAX_PHOTO) return { ok: false, error: 'The photo must be under 5 MB.' }
  const doctor = await ownDoctor(ctx, id.data)
  if (!doctor) return { ok: false, error: 'Doctor not found.' }

  const fileName = `doctors/${doctor.profileId ?? doctor.id}-${Date.now()}.${ext}`
  const { data: uploaded, error: uploadError } = await ctx.admin.storage
    .from('avatars')
    .upload(fileName, image, { upsert: true, contentType: image.type, cacheControl: PHOTO_CACHE })
  if (uploadError) {
    console.error('uploadDoctorPhoto upload:', uploadError.message)
    return { ok: false, error: 'Could not upload the photo. Please try again.' }
  }
  const imageUrl = ctx.admin.storage.from('avatars').getPublicUrl(uploaded.path).data.publicUrl
  const { data, error } = await ctx.admin.from('doctors').update({ image_url: imageUrl }).eq('id', doctor.id).eq('hospital_id', ctx.hospitalId).select('id')
  if (error || !data?.length) {
    if (error) console.error('uploadDoctorPhoto update:', error.message)
    return { ok: false, error: 'Could not save the photo. Please try again.' }
  }
  for (const p of ['/hospital/doctors', '/hospital/staff', '/hospital/badges', `/doctors/${doctor.id}`, `/hospitals/${ctx.hospitalId}`]) revalidatePath(p)
  return { ok: true, image: imageUrl }
}

const maskEmail = (email: string) => {
  const [name, domain = ''] = email.split('@')
  return `${name.slice(0, 1)}•••@${domain}`
}

export async function sendDoctorPasswordLink(doctorId: string): Promise<{ ok: true; sentTo: string } | { ok: false; error: string }> {
  const ctx = await hospitalCaller()
  if (!ctx) return { ok: false, error: 'Please log in with your hospital account.' }
  const id = uuid.safeParse(doctorId)
  if (!id.success) return { ok: false, error: 'Doctor not found.' }
  const doctor = await ownDoctor(ctx, id.data)
  if (!doctor || !doctor.profileId) return { ok: false, error: 'Doctor not found.' }

  if (await overLimit(`doctor-reset:${doctor.id}`, 3, 60 * 60_000)) {
    return { ok: false, error: 'A link was sent recently. Ask the doctor to check their inbox and spam folder first.' }
  }

  const noEmail = 'This doctor has no sign-in email on file. Ask the Consult Your Doctor team to add one.'
  let email: string | null = null
  try {
    const { data } = await ctx.admin.auth.admin.getUserById(doctor.profileId)
    email = data?.user?.email ?? null
  } catch {
    email = null
  }
  const { data: profile } = await ctx.admin.from('profiles').select('email, staff_id').eq('id', doctor.profileId).maybeSingle()
  if (!email) email = (profile?.email as string | null) ?? null
  if (!email || email.toLowerCase().endsWith('.internal')) return { ok: false, error: noEmail }

  const { data: hospital } = await ctx.admin.from('hospitals').select('name').eq('id', ctx.hospitalId).maybeSingle()
  const link = await passwordLink(ctx.admin, email)
  if (!link) return { ok: false, error: 'Could not make a link. Please try again.' }

  const sent = await sendEmail({
    to: email,
    subject: 'Reset your Consult Your Doctor password',
    heading: 'Reset your password',
    paragraphs: [
      `${(hospital?.name as string | undefined) ?? 'Your hospital'} asked us to send you a link to set a new password for your doctor account.`,
      "The link is personal and works for a limited time. If you didn't ask for this, ignore this email; your password stays the same.",
      'We never send passwords by email.',
    ],
    facts: profile?.staff_id ? [['Staff ID', profile.staff_id as string]] : undefined,
    button: { text: 'Set a new password', url: link },
  })
  if (!sent) return { ok: false, error: 'The email could not be sent. Please try again in a moment.' }
  return { ok: true, sentTo: maskEmail(email) }
}
