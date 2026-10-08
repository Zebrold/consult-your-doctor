'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { vitalsSentence } from '@/lib/vitals'
import { RECORD_BUCKET, RECORD_MAX_BYTES, RECORD_TYPES, storeRecordFile } from '@/lib/records'
import { issuePrescription, prescriptionTemplatePdf, signaturePath } from '@/lib/prescriptions'
import { z } from 'zod'
import { EducationSchema } from '@/lib/education'
import { RxSchema, filledMedicines, type RxData } from '@/lib/rx'
import { cleanList } from '@/lib/profile-lists'
import { migrationHint } from '@/lib/desk-payments'

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export async function addPrescription(formData: FormData) {
  const appointmentId = String(formData.get('appointmentId') || '')
  const field = (name: string) => String(formData.get(name) || '').trim()
  const file = formData.get('file') as File | null

  // The prescription writer sends everything as one JSON `payload`; older forms send plain fields.
  let rx: RxData
  if (formData.has('payload')) {
    let raw: unknown
    try {
      raw = JSON.parse(field('payload'))
    } catch {
      return { error: 'Could not read the prescription. Please try again.' }
    }
    const parsed = RxSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the prescription details.' }
    rx = parsed.data
  } else {
    rx = {
      complaints: '',
      findings: '',
      // `notes` is the form's older single box; it still counts as the diagnosis.
      diagnosis: field('diagnosis') || field('notes'),
      allergy: '',
      medicines: field('medicines')
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ form: 'Other' as const, name: name.slice(0, 120), generic: '', dose: '', frequency: '', timing: '', duration: '', instructions: '' })),
      investigations: '',
      advice: field('advice'),
      followUp: null,
      referral: '',
      vitals: { bp: field('bp'), spo2: field('spo2'), hr: field('hr'), rr: field('rr'), temp: field('temp'), weight: field('weight'), height: field('height') },
    }
  }
  const medicines = filledMedicines(rx.medicines)

  if (!appointmentId || !(rx.diagnosis || medicines.length)) return { error: 'Enter the diagnosis or at least one medicine.' }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify doctor owns the appointment
  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { error: 'Not a doctor' }

  const { data: appointment } = await supabase.from('appointments').select('doctor_id, status').eq('id', appointmentId).single()
  if (!appointment || appointment.doctor_id !== doctor.id) {
    return { error: 'Not authorized for this appointment' }
  }
  if (!['confirmed', 'visited', 'completed'].includes(appointment.status)) {
    return { error: 'Prescriptions can only be added to paid, active appointments.' }
  }

  let attachment: { ext: string } | null = null
  if (file && file.size > 0) {
    if (file.size > RECORD_MAX_BYTES) return { error: 'File size must be under 5MB' }
    const ext = RECORD_TYPES[file.type]
    if (!ext) return { error: 'Upload the attachment as a PDF, JPG, PNG or WebP file.' }
    attachment = { ext }
  }

  // The prescription PDF goes into the patient's records and to the patient on WhatsApp and email.
  const adminClient = createAdminClient()
  const issued = await issuePrescription(adminClient, {
    appointmentId,
    diagnosis: rx.diagnosis,
    medicines,
    advice: rx.advice,
    allergy: rx.allergy,
    complaints: rx.complaints,
    findings: rx.findings,
    investigations: rx.investigations,
    followUp: rx.followUp,
    referral: rx.referral,
    vitals: rx.vitals,
  })
  if (!issued.ok) return { error: issued.error }

  // A document the doctor attached (a scan, a referral letter) is kept on the visit alongside the PDF.
  if (file && attachment) {
    try {
      const path = await storeRecordFile(adminClient, `prescriptions/${appointmentId}/attachment-${Date.now()}.${attachment.ext}`, file, file.type)
      await adminClient.from('medical_records').insert({ appointment_id: appointmentId, document_type: 'prescription', notes: 'Attachment from the doctor.', file_url: path })
    } catch (err) {
      console.error('addPrescription attachment:', err)
      return { error: 'The prescription was saved, but the attachment could not be uploaded. Attach it again with a new prescription.' }
    }
  }

  // Writing the prescription completes the visit
  if (appointment.status !== 'completed') {
    await adminClient.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)
  }

  revalidateDoctorPages()
  revalidatePath('/patient/profile')
  return { success: true }
}

function revalidateDoctorPages() {
  for (const path of ['/doctor/dashboard', '/doctor/schedule', '/doctor/patients', '/doctor/profile']) revalidatePath(path)
}

export async function blockScheduleSlot(scheduleId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { error: 'Not a doctor' }

  // Must only delete if it belongs to the doctor AND is_booked = false
  const { error } = await supabase
    .from('schedules')
    .delete()
    .match({ id: scheduleId, doctor_id: doctor.id, is_booked: false })

  if (error) {
    console.error('Failed to block schedule:', error)
    return { error: 'Failed to block the slot. It might be already booked.' }
  }

  revalidateDoctorPages()
  return { success: true }
}

export async function updateDoctorProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Writes below use the admin client, so check here that the caller really is a doctor.
  const adminClient = createAdminClient()
  const { data: doctor } = await adminClient.from('doctors').select('id').eq('profile_id', user.id).maybeSingle()
  if (!doctor) return { success: false, error: 'Not a doctor' }

  const fullName = formData.get('full_name') as string
  const phoneNumber = formData.get('phone_number') as string
  const specialty = formData.get('specialty') as string
  const experienceYears = formData.get('experience_years') ? Number(formData.get('experience_years')) : null
  const consultationFee = formData.get('consultation_fee') ? Number(formData.get('consultation_fee')) : null
  const bio = formData.get('bio') as string
  const qualifications = formData.get('qualifications') as string
  const address = formData.get('address') as string

  const image = formData.get('image') as File | null
  if (image && image.size > 0 && !IMAGE_TYPES[image.type]) {
    return { success: false, error: 'The photo must be a JPG, PNG or WebP image.' }
  }

  // Education & training arrives as JSON from the editor's list; registration and insurance as plain fields.
  let education: z.infer<typeof EducationSchema> | null = null
  if (formData.has('education')) {
    let raw: unknown
    try {
      raw = JSON.parse(String(formData.get('education') || '[]'))
    } catch {
      return { success: false, error: 'Could not read the education entries. Please try again.' }
    }
    const parsed = EducationSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the education entries.' }
    education = parsed.data
  }
  const extras: Record<string, unknown> = {}
  if (education) extras.education = education
  if (formData.has('registration_number')) {
    extras.registration_number = String(formData.get('registration_number') || '').trim().slice(0, 40) || null
    extras.registration_council = String(formData.get('registration_council') || '').trim().slice(0, 80) || null
  }
  if (formData.has('insurance_present')) extras.insurance_accepted = cleanList(formData.getAll('insurance').map(String), 60)

  // Update profile
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ 
      full_name: fullName,
      phone_number: phoneNumber || null
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Profile update error:', profileError)
    return { success: false, error: profileError.message }
  }

  let imageUrl: string | undefined = undefined

  if (image && image.size > 0) {
    if (image.size > 5242880) return { success: false, error: 'Image size must be under 5MB' }
    
    const fileName = `doctors/${user.id}-${Date.now()}.${IMAGE_TYPES[image.type]}`
    
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(fileName, image, { upsert: true, contentType: image.type })

    if (uploadError) {
      console.error('Image upload error:', uploadError)
      return { success: false, error: 'Failed to upload profile image' }
    }
    
    const { data: publicUrlData } = adminClient.storage
      .from('avatars')
      .getPublicUrl(uploadData.path)
      
    imageUrl = publicUrlData.publicUrl
  }

  // Update doctor
  const doctorUpdates: Record<string, string | number | null> = {
    specialty: specialty || 'General Physician',
    experience_years: experienceYears,
    consultation_fee: consultationFee,
    bio: bio || null,
    qualifications: qualifications || null,
    address: address || null
  }
  
  if (imageUrl) {
    doctorUpdates.image_url = imageUrl
  }

  const { error: doctorError } = await adminClient
    .from('doctors')
    .update(doctorUpdates)
    .eq('profile_id', user.id)

  if (doctorError) {
    console.error('Doctor update error:', doctorError)
    return { success: false, error: doctorError.message }
  }

  if (Object.keys(extras).length) {
    const { error: extrasError } = await adminClient.from('doctors').update(extras).eq('profile_id', user.id)
    if (extrasError) {
      console.error('Doctor profile extras update error:', extrasError)
      revalidateDoctorPages()
      const hint = migrationHint(extrasError)
      return {
        success: false,
        error: hint
          ? `Your details were saved, but education, insurance and registration need a database update first. ${hint}`
          : 'Your details were saved, but education, insurance and registration could not be saved. Please try again.',
      }
    }
  }

  revalidateDoctorPages()
  revalidatePath(`/doctors/${doctor.id}`)
  return { success: true }
}

// Doctors move a paid visit between booked → checked in → completed. Unpaid or cancelled
// bookings are left to the payment flow and the operations team.
const DOCTOR_STATUSES = ['confirmed', 'visited', 'completed']

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  if (!DOCTOR_STATUSES.includes(status)) return { success: false, error: 'That status change is not allowed.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { success: false, error: 'Not a doctor' }

  const adminClient = createAdminClient()
  const { data: updated, error } = await adminClient
    .from('appointments')
    .update({ status })
    .match({ id: appointmentId, doctor_id: doctor.id })
    .in('status', DOCTOR_STATUSES)
    .select('id')

  if (error) {
    console.error('Error updating appointment status:', error)
    return { success: false, error: error.message }
  }
  if (!updated || updated.length === 0) {
    return { success: false, error: 'This appointment is unpaid or cancelled, so its status cannot be changed here.' }
  }

  revalidateDoctorPages()
  return { success: true }
}

export async function addNewPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: doctor } = await supabase.from('doctors').select('id, hospital_id').eq('profile_id', user.id).single()
  if (!doctor) return { success: false, error: 'Not a doctor' }

  const fullName = formData.get('full_name') as string
  const phoneNumber = formData.get('phone_number') as string
  const rawEmail = formData.get('email') as string
  const email = rawEmail && rawEmail.includes('@') ? rawEmail : `patient-${Date.now()}@consultyourdoctor.internal`
  // Only what the doctor actually entered is recorded; nothing clinical is filled in by default.
  const field = (name: string) => String(formData.get(name) || '').trim()
  const diagnosis = field('diagnosis')
  const allergy = field('allergy')
  const medications = field('medications')

  if (!fullName) return { success: false, error: 'Patient name is required' }

  const adminClient = createAdminClient()

  // Create auth user or use existing
  let patientId: string | null = null
  let created = false
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'patient' }
  })

  if (authUser?.user?.id) {
    patientId = authUser.user.id
    created = true
  } else {
    // If user exists or failed, find profile
    const { data: existingProfile } = await adminClient.from('profiles').select('id, role').eq('email', email).maybeSingle()
    if (existingProfile && existingProfile.role && existingProfile.role !== 'patient') {
      return { success: false, error: 'That email belongs to a staff account. Use the patient’s own email, or leave it blank.' }
    }
    if (existingProfile) {
      patientId = existingProfile.id
    } else {
      return { success: false, error: authError?.message || 'Failed to create patient account' }
    }
  }

  // Fill in the profile only for an account created just now; an existing patient's details stay as they are.
  if (created) await adminClient.from('profiles').upsert({
    id: patientId,
    full_name: fullName,
    phone_number: phoneNumber || null,
    email: email,
    role: 'patient',
    hospital_id: doctor.hospital_id || null
  })

  // The walk-in is seen now: give the visit a 30-minute slot starting now
  const startTime = new Date(Date.now()).toISOString()
  const endTime = new Date(Date.now() + 1800000).toISOString()
  const { data: newSchedule } = await adminClient.from('schedules').insert({
    doctor_id: doctor.id,
    start_time: startTime,
    end_time: endTime,
    is_booked: true
  }).select('id').single()

  if (newSchedule) {
    // Create appointment
    const { data: newApt } = await adminClient.from('appointments').insert({
      patient_id: patientId,
      doctor_id: doctor.id,
      schedule_id: newSchedule.id,
      hospital_id: doctor.hospital_id || null,
      status: 'confirmed'
    }).select('id').single()

    const vitals = { bp: field('bp'), spo2: field('spo2'), hr: field('hr') }
    if (newApt && (diagnosis || medications)) {
      // A diagnosis or medicines make a prescription: a PDF in the patient's records, sent to the patient.
      const issued = await issuePrescription(adminClient, { appointmentId: newApt.id, diagnosis, medicines: medications, advice: '', allergy, vitals })
      if (!issued.ok) return { success: false, error: `The patient was added, but ${issued.error.charAt(0).toLowerCase()}${issued.error.slice(1)}` }
    } else if (newApt) {
      const notes = [vitalsSentence(vitals), allergy && `Allergy: ${allergy}.`].filter(Boolean).join(' ')
      if (notes) await adminClient.from('medical_records').insert({ appointment_id: newApt.id, document_type: 'prescription', notes, file_url: 'none' })
    }
  }

  revalidateDoctorPages()
  return { success: true }
}

/** The signed-in doctor with what their prescription letterhead needs. */
async function doctorForTemplate() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const select = (withRegistration: boolean) =>
    admin
      .from('doctors')
      .select(`id, ${withRegistration ? 'registration_number, registration_council,' : ''} profiles!doctors_profile_id_fkey ( full_name ), hospitals ( name, address, city )`)
      .eq('profile_id', user.id)
      .maybeSingle()
  let { data, error } = await select(true)
  if (error) ({ data, error } = await select(false))
  if (!data) return null
  type Row = {
    id: string
    registration_number?: string | null
    registration_council?: string | null
    profiles: { full_name: string | null } | { full_name: string | null }[] | null
    hospitals: { name: string; address: string | null; city: string | null } | { name: string; address: string | null; city: string | null }[] | null
  }
  const row = data as unknown as Row
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? null
  return {
    admin,
    doctor: {
      id: row.id,
      name: one(row.profiles)?.full_name ?? 'Doctor',
      registrationNumber: row.registration_number ?? null,
      registrationCouncil: row.registration_council ?? null,
      hospital: one(row.hospitals),
    },
  }
}

const SIGNATURE_TYPES = ['image/png', 'image/jpeg']

/** Saves the doctor's signature (a PNG or JPG, ideally on a white or clear background). It prints on every prescription. */
export async function uploadSignature(formData: FormData): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await doctorForTemplate()
  if (!ctx) return { success: false, error: 'Please sign in with your doctor account.' }
  const file = formData.get('signature')
  if (!(file instanceof File) || file.size === 0) return { success: false, error: 'Choose an image of your signature.' }
  if (!SIGNATURE_TYPES.includes(file.type)) return { success: false, error: 'Upload the signature as a PNG or JPG image.' }
  if (file.size > 1024 * 1024) return { success: false, error: 'The signature image must be under 1 MB.' }
  try {
    await storeRecordFile(ctx.admin, signaturePath(ctx.doctor.id), file, file.type)
  } catch (err) {
    console.error('uploadSignature:', err)
    return { success: false, error: 'Could not save your signature. Please try again.' }
  }
  revalidatePath('/doctor/profile')
  return { success: true }
}

export async function removeSignature(): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await doctorForTemplate()
  if (!ctx) return { success: false, error: 'Please sign in with your doctor account.' }
  const { error } = await ctx.admin.storage.from(RECORD_BUCKET).remove([signaturePath(ctx.doctor.id)])
  if (error) return { success: false, error: 'Could not remove your signature. Please try again.' }
  revalidatePath('/doctor/profile')
  return { success: true }
}

/** A sample prescription with the doctor's letterhead, registration and signature, as base64, to download and check. */
export async function prescriptionTemplatePreview(): Promise<{ success: true; pdf: string } | { success: false; error: string }> {
  const ctx = await doctorForTemplate()
  if (!ctx) return { success: false, error: 'Please sign in with your doctor account.' }
  try {
    const pdf = await prescriptionTemplatePdf(ctx.admin, ctx.doctor)
    return { success: true, pdf: Buffer.from(pdf).toString('base64') }
  } catch (err) {
    console.error('prescriptionTemplatePreview:', err)
    return { success: false, error: 'Could not create the preview. Please try again.' }
  }
}
