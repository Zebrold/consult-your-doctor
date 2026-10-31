'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ensurePatientProfile, indianMobile, sendPatientOtp, verifyPatientOtp } from '@/lib/patient-onboarding'

// The statuses the executive's status menu offers. A paid booking is cancelled by refunding it from Payments, which also
// frees its slot; it can't be cancelled from this menu.
const EXECUTIVE_STATUSES = ['confirmed', 'visited', 'completed']
// The status a booking may move to from each status here. A booking is confirmed by its payment, never by this menu.
const NEXT_STATUSES: Record<string, string[]> = { confirmed: ['visited', 'completed'], visited: ['completed'] }

/** The signed-in executive, or null. */
async function executiveSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'executive') return null
  return { user, supabase, hospitalId: (profile.hospital_id as string | null) ?? null }
}

export async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
  if (newStatus === 'cancelled') return { error: 'To cancel a paid booking, refund it from Payments. That cancels the booking and frees its slot.' }
  if (!EXECUTIVE_STATUSES.includes(newStatus)) return { error: 'That status change is not allowed.' }

  const session = await executiveSession()
  if (!session) return { error: 'Unauthorized' }
  const { user, supabase } = session

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
  if (!(NEXT_STATUSES[appointment.status] ?? []).includes(newStatus)) {
    return { error: 'This appointment can’t move to that status from here.' }
  }

  // Update status, only if it is still the status just checked
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)
    .eq('executive_id', user.id)
    .eq('status', appointment.status)

  if (updateError) {
    console.error('Failed to update status:', updateError)
    return { error: 'Failed to update status' }
  }

  revalidatePath('/executive/dashboard')
  revalidatePath('/executive/today')
  return { success: true }
}

export async function verifyAndCheckInPatient(appointmentId: string, inputBookingId: string) {
  const session = await executiveSession()
  if (!session) return { error: 'Not authorized' }
  const { user, supabase, hospitalId } = session

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('id, hospital_id, status')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { error: 'Appointment not found' }
  }

  // Ensure appointment belongs to executive's hospital
  if (!hospitalId || appointment.hospital_id !== hospitalId) {
    return { error: 'Not authorized for this hospital' }
  }

  // Only a booking that has been paid (its booking fee, or the desk's payment) can be checked in.
  if (appointment.status !== 'confirmed') {
    return {
      error: appointment.status === 'pending_payment'
        ? 'This booking is unpaid. The patient pays the booking fee before they can be checked in.'
        : 'This booking is already checked in or closed.',
    }
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
    .eq('status', 'confirmed')

  if (updateError) {
    return { error: 'Failed to update status' }
  }

  revalidatePath('/executive/today')
  revalidatePath('/executive/dashboard')
  return { success: true }
}

/** Texts a walk-in patient the code their visit needs (see createWalkInAppointment). */
export async function sendExecutivePatientOtp(rawPhone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await executiveSession()
  if (!session) return { ok: false, error: 'Forbidden' }
  const phone = indianMobile(rawPhone)
  if (!phone) return { ok: false, error: 'Enter the patient’s 10-digit Indian mobile number.' }
  return sendPatientOtp(createAdminClient(), phone, `exec:${session.user.id}`)
}

export async function createWalkInAppointment(formData: FormData) {
  const session = await executiveSession()
  if (!session) return { error: 'Forbidden' }
  const { hospitalId } = session

  const patientName = String(formData.get('patientName') || '').trim().replace(/\s+/g, ' ')
  const phone = indianMobile(String(formData.get('patientPhone') || ''))
  const doctorId = String(formData.get('doctorId') || '')
  const scheduleId = String(formData.get('scheduleId') || '')

  if (!patientName || !doctorId || !scheduleId) return { error: 'All fields are required' }
  if (!phone) return { error: 'Please enter a valid mobile number' }
  if (!hospitalId) return { error: 'Your account isn’t linked to a hospital, so it can’t take walk-ins.' }

  try {
    const admin = createAdminClient()

    // The patient confirms their number with the code texted to it before a visit is booked to their account.
    const verified = await verifyPatientOtp(admin, phone, String(formData.get('code') || ''))
    if (!verified.ok) return { error: verified.error }
    const details = await ensurePatientProfile(admin, verified.userId, { name: patientName, phone })
    if (!details.ok) return { error: details.error }
    const patientUserId = verified.userId

    // The doctor must work at this executive's hospital, and must have a fee: the walk-in is charged at that fee.
    const { data: doctor } = await admin.from('doctors').select('consultation_fee, hospital_id').eq('id', doctorId).maybeSingle()
    if (!doctor || doctor.hospital_id !== hospitalId) return { error: 'That doctor is not at your hospital.' }
    const fee = Number(doctor.consultation_fee) || 0
    if (!fee) return { error: 'Set this doctor’s consultation fee before booking walk-ins.' }

    // Claim the slot only while it is still free, so two bookings can't take the same time.
    const { data: claimed } = await admin
      .from('schedules')
      .update({ is_booked: true })
      .eq('id', scheduleId)
      .eq('doctor_id', doctorId)
      .eq('is_booked', false)
      .select('id')
    if (!claimed || claimed.length === 0) {
      return { error: 'This time slot is no longer available' }
    }

    // Create appointment (executive_id = the executive making the booking)
    const { data: appointment, error: aptError } = await admin.from('appointments').insert({
      patient_id: patientUserId,
      doctor_id: doctorId,
      hospital_id: hospitalId,
      schedule_id: scheduleId,
      executive_id: session.user.id,
      status: 'confirmed'
    }).select('id').single()

    if (aptError || !appointment) {
      await admin.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
      throw new Error('Failed to create appointment')
    }

    // The desk takes the consultation fee now. If that record can't be saved, the visit is undone rather than left
    // confirmed with no payment behind it.
    const { error: payError } = await admin.from('payments').insert({
      appointment_id: appointment.id,
      amount: fee,
      transaction_id: `CASH-${Date.now()}`,
      gateway: 'cash',
      status: 'success'
    })
    if (payError) {
      console.error('Walk-in payment record:', payError)
      await admin.from('appointments').update({ status: 'cancelled' }).eq('id', appointment.id)
      await admin.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
      return { error: 'The walk-in could not be recorded. Please try again.' }
    }

    revalidatePath('/executive/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Walk-in booking error:', err)
    return { error: err.message || 'Failed to complete walk-in booking' }
  }
}
