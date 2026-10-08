'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { doctorName } from '@/components/patient/format'
import { renderWelcomeLetter, type PartnerType, type WelcomeLetter } from '@/lib/pdf/welcome-letter'

// The welcome letter for a partner whose login was just created: the partner's details come from the database; the
// temporary password is only printed on the letter (it is never stored or logged here).

type Result = { success: true; pdf: string; filename: string } | { success: false; error: string }
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null
const realEmail = (email: string | null | undefined) => (email && !email.endsWith('.internal') ? email : null)
const join = (...parts: (string | null | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join(', ') || null

const LOGIN_PATH: Record<PartnerType, string> = { doctor: '/login/doctor', hospital: '/login/hospital', diagnostic: '/login/diagnostic' }

/** PARTNER_PORTAL_URL when set; otherwise the site's own sign-in page for this kind of partner. */
function loginUrl(type: PartnerType) {
  if (process.env.PARTNER_PORTAL_URL) return process.env.PARTNER_PORTAL_URL
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || ''
  const base = site && !/localhost|127\.0\.0\.1/.test(site) ? site.replace(/\/$/, '') : 'https://consultyourdoctor.de'
  return `${base}${LOGIN_PATH[type]}`
}

export async function welcomeLetterPdf(input: { username: string; password: string }): Promise<Result> {
  const username = String(input.username ?? '').trim()
  const password = String(input.password ?? '')
  if (!username || !password || password.length > 100) return { success: false, error: 'The login details are missing.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in.' }
  const admin = createAdminClient()
  const { data: caller } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (caller?.role !== 'super_admin' && caller?.role !== 'hospital_admin') return { success: false, error: 'Only administrators can print welcome letters.' }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name, phone_number, email, staff_id, hospital_id, diagnostic_center_id, created_at')
    .in('staff_id', [username, username.toUpperCase()])
    .limit(1)
    .maybeSingle()
  if (!profile) return { success: false, error: 'No account uses that login ID.' }
  // A hospital admin can only print letters for the doctors of their own hospital.
  if (caller.role === 'hospital_admin' && (profile.role !== 'doctor' || profile.hospital_id !== caller.hospital_id)) {
    return { success: false, error: 'You can only print letters for your hospital’s doctors.' }
  }

  const base = { partnerId: '', onboardedAt: new Date(profile.created_at ?? Date.now()), loginUrl: '', username: profile.staff_id ?? username, password }
  let letter: WelcomeLetter

  if (profile.role === 'doctor') {
    const select = (withRegistration: boolean) =>
      admin
        .from('doctors')
        .select(`id, specialty, qualifications, address, ${withRegistration ? 'registration_number, registration_council,' : ''} hospitals ( name, address, city )`)
        .eq('profile_id', profile.id)
        .maybeSingle()
    let { data, error } = await select(true)
    if (error) ({ data, error } = await select(false))
    const doctor = data as unknown as {
      id: string
      specialty: string | null
      qualifications: string | null
      address: string | null
      registration_number?: string | null
      registration_council?: string | null
      hospitals: Joined<{ name: string; address: string | null; city: string | null }>
    } | null
    if (!doctor) return { success: false, error: 'This doctor’s details weren’t found.' }
    const hospital = one(doctor.hospitals)
    const name = doctorName(profile.full_name)
    letter = {
      ...base,
      type: 'doctor',
      name,
      registration: doctor.registration_number ? join(doctor.registration_number, doctor.registration_council) : null,
      services: join(doctor.specialty, doctor.qualifications),
      address: join(hospital?.name, doctor.address || hospital?.address, hospital?.city),
      contact: [name, profile.phone_number, realEmail(profile.email)].filter(Boolean).join(' • '),
      partnerId: `DR-${doctor.id.slice(0, 8).toUpperCase()}`,
      loginUrl: loginUrl('doctor'),
    }
  } else if (profile.role === 'hospital_admin' && profile.hospital_id) {
    const [{ data: hospital }, { data: departments }] = await Promise.all([
      admin.from('hospitals').select('*').eq('id', profile.hospital_id).maybeSingle(),
      admin.from('departments').select('name').eq('hospital_id', profile.hospital_id),
    ])
    if (!hospital) return { success: false, error: 'This hospital wasn’t found.' }
    const names = ((departments ?? []) as { name: string }[]).map((d) => d.name).filter(Boolean)
    letter = {
      ...base,
      type: 'hospital',
      name: hospital.name,
      registration: null,
      services: names.length ? names.slice(0, 8).join(', ') + (names.length > 8 ? ', …' : '') : 'Hospital consultations',
      address: join(hospital.address, hospital.city),
      contact: [profile.full_name, hospital.phone ?? profile.phone_number, realEmail(hospital.contact_email)].filter(Boolean).join(' • '),
      partnerId: `HS-${String(hospital.id).slice(0, 8).toUpperCase()}`,
      loginUrl: loginUrl('hospital'),
    }
  } else if (profile.role === 'diagnostic_admin' && profile.diagnostic_center_id) {
    const { data: center } = await admin.from('diagnostic_centers').select('id, name, address, city, contact_email, available_tests').eq('id', profile.diagnostic_center_id).maybeSingle()
    if (!center) return { success: false, error: 'This diagnostic centre wasn’t found.' }
    const tests = (center.available_tests as string[] | null) ?? []
    letter = {
      ...base,
      type: 'diagnostic',
      name: center.name,
      registration: null,
      services: tests.length ? tests.slice(0, 6).join(', ') + (tests.length > 6 ? ', …' : '') : 'Diagnostic tests',
      address: join(center.address, center.city),
      contact: [profile.full_name, profile.phone_number, realEmail(center.contact_email)].filter(Boolean).join(' • '),
      partnerId: `DC-${String(center.id).slice(0, 8).toUpperCase()}`,
      loginUrl: loginUrl('diagnostic'),
    }
  } else {
    return { success: false, error: 'Welcome letters are for doctors, hospitals and diagnostic centres.' }
  }

  try {
    const pdf = await renderWelcomeLetter(letter)
    return { success: true, pdf: Buffer.from(pdf).toString('base64'), filename: `Welcome-Letter-${letter.partnerId}.pdf` }
  } catch (err) {
    console.error('welcomeLetterPdf:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Could not create the letter. Please try again.' }
  }
}
