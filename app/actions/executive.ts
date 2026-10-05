'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/** "98204 77210" / "+91 98204 77210" → "+919820477210" (numbers without a country code are taken as Indian). */
function toE164(raw: string) {
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  return cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`
}

// The statuses the executive's status menu offers. Unpaid ('pending') bookings and finished ones can't be changed here.
const EXECUTIVE_STATUSES = ['confirmed', 'visited', 'completed', 'cancelled']
const FINAL_STATUSES = ['completed', 'cancelled']

export async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
  if (!EXECUTIVE_STATUSES.includes(newStatus)) return { error: 'That status change is not allowed.' }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // First, verify this executive owns this appointment
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('executive_id, status')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { error: 'Appointment not found' }
  }

  if (appointment.executive_id !== user.id) {
    return { error: 'Not authorized to update this appointment' }
  }
  if (appointment.status === 'pending' || FINAL_STATUSES.includes(appointment.status)) {
    return { error: 'This appointment is unpaid or already closed, so its status cannot be changed.' }
  }

  // Update status
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)
    .eq('executive_id', user.id)

  if (updateError) {
    console.error('Failed to update status:', updateError)
    return { error: 'Failed to update status' }
  }

  revalidatePath('/executive/dashboard')
  revalidatePath('/executive/today')
  return { success: true }
}

export async function verifyAndCheckInPatient(appointmentId: string, inputBookingId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  
  if (profile?.role !== 'executive') {
    return { error: 'Not authorized' }
  }

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('id, hospital_id, status')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { error: 'Appointment not found' }
  }

  // Ensure appointment belongs to executive's hospital
  if (appointment.hospital_id !== profile.hospital_id) {
    return { error: 'Not authorized for this hospital' }
  }

  // Verify Booking ID (first 8 chars, case insensitive)
  const actualBookingId = appointment.id.slice(0, 8).toUpperCase()
  if (inputBookingId.toUpperCase().trim() !== actualBookingId) {
    return { error: 'Invalid Booking ID' }
  }

  // Update status to 'visited' (checked in)
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ 
      status: 'visited',
      executive_id: user.id // assign this executive as the one who handled it
    })
    .eq('id', appointmentId)

  if (updateError) {
    return { error: 'Failed to update status' }
  }

  revalidatePath('/executive/today')
  revalidatePath('/executive/dashboard')
  return { success: true }
}

export async function createWalkInAppointment(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify caller is an Executive
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: executiveProfile } = await supabase
    .from('profiles')
    .select('role, hospital_id')
    .eq('id', user.id)
    .single()

  if (executiveProfile?.role !== 'executive') return { error: 'Forbidden' }

  const patientName = formData.get('patientName') as string
  const rawPatientPhone = formData.get('patientPhone') as string
  const doctorId = formData.get('doctorId') as string
  const scheduleId = formData.get('scheduleId') as string

  if (!patientName || !rawPatientPhone || !doctorId || !scheduleId) {
    return { error: 'All fields are required' }
  }
  if (rawPatientPhone.replace(/\D/g, '').length < 10) {
    return { error: 'Please enter a valid mobile number' }
  }
  const patientPhone = toE164(rawPatientPhone)

  try {
    // 2. Offline-to-Online: Check if patient exists or create them using Admin Client
    const adminAuthClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Look for an existing patient by phone. profiles.phone_number is stored in E.164;
    // this is an indexed lookup, unlike listUsers() which only returns the first page of users.
    const { data: existingProfile } = await adminAuthClient
      .from('profiles')
      .select('id')
      .in('phone_number', [patientPhone, patientPhone.replace('+', '')])
      .limit(1)
      .maybeSingle()
    let patientUserId: string | undefined = existingProfile?.id

    if (!patientUserId) {
      // Create new user silently
      const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
        phone: patientPhone,
        password: `CYD${randomBytes(18).toString('base64url')}!`, // never shown to anyone; patients sign in by OTP
        phone_confirm: true // Auto confirm so they can use OTP later
      })

      if (createError) throw new Error('Failed to provision patient account: ' + createError.message)
      patientUserId = newUser.user.id

      // Insert the profile since there is no automatic trigger
      await adminAuthClient.from('profiles').insert({ 
        id: patientUserId, 
        full_name: patientName,
        phone_number: patientPhone,
        role: 'patient'
      })
    }

    // 3. Create Appointment and Payment
    // Claim the slot only while it is still free, so two bookings can't take the same time.
    const { data: claimed } = await adminAuthClient
      .from('schedules')
      .update({ is_booked: true })
      .eq('id', scheduleId)
      .eq('doctor_id', doctorId)
      .eq('is_booked', false)
      .select('id')
    if (!claimed || claimed.length === 0) {
      return { error: 'This time slot is no longer available' }
    }

    // Get consultation fee
    const { data: doctorProfile } = await supabase.from('doctors').select('consultation_fee').eq('id', doctorId).single()
    const fee = doctorProfile?.consultation_fee || 500

    // Create appointment (executive_id = the executive making the booking)
    const { data: appointment, error: aptError } = await adminAuthClient.from('appointments').insert({
      patient_id: patientUserId,
      doctor_id: doctorId,
      hospital_id: executiveProfile.hospital_id,
      schedule_id: scheduleId,
      executive_id: user.id,
      status: 'confirmed'
    }).select('id').single()

    if (aptError) {
      // Rollback schedule
      await adminAuthClient.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
      throw new Error('Failed to create appointment')
    }

    // Create Cash Payment record
    await adminAuthClient.from('payments').insert({
      appointment_id: appointment.id,
      amount: fee,
      transaction_id: `CASH-${Date.now()}`,
      gateway: 'cash',
      status: 'success'
    })

    revalidatePath('/executive/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Walk-in booking error:', err)
    return { error: err.message || 'Failed to complete walk-in booking' }
  }
}
