'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createAppointment(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Verify User Authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // If not logged in, redirect to login page.
    redirect('/login/patient')
  }

  // 2. Parse form data
  const hospitalId = formData.get('hospital_id') as string
  const doctorId = formData.get('doctor_id') as string
  const scheduleId = formData.get('schedule_id') as string

  if (!hospitalId || !doctorId || !scheduleId) {
    return { error: 'Please select a hospital, doctor, and an available time slot.' }
  }

  // 3. Insert Appointment
  // RLS ensures they can only insert for their own patient_id
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: user.id,
      doctor_id: doctorId,
      hospital_id: hospitalId,
      schedule_id: scheduleId,
      status: 'pending_payment'
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating appointment:', error)
    return { error: 'Failed to book appointment. The time slot might have just been taken.' }
  }

  // 4. Return URL to redirect on the client
  return { success: true, url: `/patient/checkout/${appointment.id}` }
}

export async function createDiagnosticBooking(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Verify User Authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // If not logged in, redirect to login page.
    redirect('/login/patient')
  }

  // 2. Parse form data
  const centerId = formData.get('center_id') as string
  const testName = formData.get('test_name') as string
  const preferredDate = formData.get('preferred_date') as string

  if (!centerId || !testName || !preferredDate) {
    return { error: 'Please select a center, a test, and a preferred date.' }
  }

  // 3. Insert Booking
  const { data: booking, error } = await supabase
    .from('diagnostic_bookings')
    .insert({
      patient_id: user.id,
      center_id: centerId,
      test_name: testName,
      preferred_date: preferredDate,
      status: 'pending_payment'
    })
    .select('id')
    .single()

  if (error || !booking) {
    console.error('Error creating diagnostic booking:', error)
    return { error: 'Failed to book diagnostic test.' }
  }

  // 4. Return URL to redirect on the client
  return { success: true, url: `/patient/checkout/diagnostic/${booking.id}` }
}

export async function updateDiagnosticBookingStatus(bookingId: string, status: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('diagnostic_bookings')
    .update({ status })
    .eq('id', bookingId)

  if (error) {
    console.error('Error updating status:', error)
    return { error: 'Failed to update status' }
  }

  return { success: true }
}

export async function verifyAndCheckInDiagnostic(bookingId: string, inputId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // We are expecting the inputId to be the first 8 chars of the bookingId (case-insensitive)
  if (bookingId.slice(0, 8).toUpperCase() !== inputId.toUpperCase()) {
    return { error: 'Invalid Booking ID.' }
  }

  // Update the booking status to visited
  const { error } = await supabase
    .from('diagnostic_bookings')
    .update({ status: 'visited' })
    .eq('id', bookingId)

  if (error) {
    console.error('Error checking in:', error)
    return { error: 'Failed to check in patient.' }
  }

  return { success: true }
}
