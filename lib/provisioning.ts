import crypto from 'crypto'
import type { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'
import { sendDoctorActivationEmail } from '@/lib/notify/email'

type Admin = ReturnType<typeof createAdminClient>

export type StaffRole = 'doctor' | 'hospital_admin' | 'diagnostic_admin'

/** Staff sign in with an ID like "CYDPS4821"; their auth email is that ID at cyd.internal unless they have a real one. */
export async function newStaffId(admin: Admin, fullName: string): Promise<string> {
  const initials = fullName.split(/\s+/).filter(Boolean).map((n) => n[0]).join('').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'CY'
  for (let i = 0; i < 20; i++) {
    const id = `CYD${initials}${crypto.randomInt(1000, 10000)}`
    const { data: taken } = await admin.from('profiles').select('id').eq('staff_id', id).maybeSingle()
    if (!taken) return id
  }
  throw new Error('Could not generate a free staff ID. Please try again.')
}

/** A strong one-time password for an account whose owner will set their own through the activation link. */
export const randomPassword = () => `Cyd-${crypto.randomBytes(9).toString('base64url')}`

/** Staff passwords chosen by the person creating the account. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'Use a password of at least 10 characters.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letters and numbers in the password.'
  return null
}

/**
 * Creates a staff sign-in (auth user and profile) tied to a hospital or diagnostic centre. If the profile can't be
 * written, the auth user is removed again so no half-made account is left behind.
 */
export async function createStaffLogin(
  admin: Admin,
  input: { role: StaffRole; fullName: string; password: string; email?: string | null; hospitalId?: string | null; centerId?: string | null; staffId?: string },
): Promise<{ userId: string; staffId: string } | { error: string }> {
  const staffId = (input.staffId?.trim().toUpperCase()) || (await newStaffId(admin, input.fullName))
  if (input.staffId) {
    const { data: taken } = await admin.from('profiles').select('id').eq('staff_id', staffId).maybeSingle()
    if (taken) return { error: 'This staff ID is already in use.' }
  }
  const email = input.email?.trim().toLowerCase() || null
  if (email) {
    const { data: taken } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (taken) return { error: 'An account with this email address already exists.' }
  }

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: email || `${staffId.toLowerCase()}@cyd.internal`,
    password: input.password,
    email_confirm: true,
    user_metadata: { role: input.role, full_name: input.fullName },
  })
  if (authError || !created?.user) return { error: authError?.message || 'Could not create the login.' }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    role: input.role,
    full_name: input.fullName,
    email,
    hospital_id: input.hospitalId ?? null,
    diagnostic_center_id: input.centerId ?? null,
    staff_id: staffId,
  })
  if (profileError) {
    console.error('createStaffLogin profile:', profileError)
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: 'Could not save the account. Nothing was created; please try again.' }
  }
  return { userId: created.user.id, staffId }
}

/**
 * A doctor at a hospital: their sign-in, the department for their specialty, the doctor record, and (when an email
 * is given) an activation link so they set their own password.
 */
export async function provisionDoctor(
  admin: Admin,
  input: { hospitalId: string; fullName: string; email?: string | null; specialty: string; experienceYears: number; consultationFee: number; password?: string | null; invitedBy: string },
): Promise<{ success: true; doctorId: string; staffId: string; email: string | null; activationLink: string | null; invitationSent: boolean } | { error: string }> {
  const email = input.email?.trim().toLowerCase() || null
  const login = await createStaffLogin(admin, {
    role: 'doctor',
    fullName: input.fullName,
    email,
    hospitalId: input.hospitalId,
    password: input.password && input.password.length >= 8 ? input.password : randomPassword(),
  })
  if ('error' in login) return login

  const undo = async (message: string) => {
    await admin.auth.admin.deleteUser(login.userId)
    return { error: message }
  }

  let departmentId: string | null = null
  const { data: existingDept } = await admin.from('departments').select('id').eq('hospital_id', input.hospitalId).eq('name', input.specialty).maybeSingle()
  if (existingDept) departmentId = existingDept.id
  else {
    const { data: newDept } = await admin.from('departments').insert({ hospital_id: input.hospitalId, name: input.specialty }).select('id').single()
    departmentId = newDept?.id ?? null
  }
  if (!departmentId) return undo('Could not set up the department for this specialty.')

  const { data: doctor, error: doctorError } = await admin
    .from('doctors')
    .insert({
      profile_id: login.userId,
      hospital_id: input.hospitalId,
      department_id: departmentId,
      specialty: input.specialty,
      experience_years: input.experienceYears,
      consultation_fee: input.consultationFee,
    })
    .select('id')
    .single()
  if (doctorError || !doctor) {
    console.error('provisionDoctor doctor row:', doctorError)
    return undo('Could not finish registering the doctor. Nothing was created; please try again.')
  }

  let activationLink: string | null = null
  let invitationSent = false
  if (email) {
    const base = siteUrl()
    activationLink = `${base}/login/doctor`
    try {
      const { data: link } = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${base}/update-password` } })
      if (link?.properties?.action_link) activationLink = link.properties.action_link
    } catch (err) {
      console.warn('provisionDoctor generateLink:', err)
    }
    const { data: hospital } = await admin.from('hospitals').select('name').eq('id', input.hospitalId).maybeSingle()
    invitationSent = await sendDoctorActivationEmail({ to: email, doctorName: input.fullName, activationLink, hospitalName: hospital?.name ?? undefined })
    try {
      await admin.from('doctor_invitations').insert({
        hospital_id: input.hospitalId,
        doctor_id: doctor.id,
        email,
        full_name: input.fullName,
        specialty: input.specialty,
        status: 'invitation_pending',
        invited_by: input.invitedBy,
      })
    } catch {}
  }

  return { success: true, doctorId: doctor.id, staffId: login.staffId, email, activationLink, invitationSent }
}
