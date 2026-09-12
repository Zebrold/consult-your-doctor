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

export async function finalizeConsultationAppointment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const doctorId = formData.get('doctor_id') as string
  const hospitalId = formData.get('hospital_id') as string
  const appointmentDate = formData.get('appointment_date') as string
  const appointmentTime = formData.get('appointment_time') as string
  const consultationMode = formData.get('consultation_mode') as string
  const patientName = formData.get('patient_name') as string
  const explicitScheduleId = formData.get('schedule_id') as string
  const patientPhone = formData.get('patient_phone') as string
  const patientEmail = formData.get('patient_email') as string
  const reason = formData.get('reason') as string

  if (!doctorId) {
    return { error: 'Doctor ID is required.' }
  }

  // If user is not logged in, allow instant preview success
  if (!user) {
    return { success: true, isPreview: true }
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    let scheduleId: string | null = explicitScheduleId || null

    if (scheduleId) {
      // Mark the selected hospital-generated slot as booked
      await adminClient.from('schedules').update({ is_booked: true }).eq('id', scheduleId)
    } else {
      // Find unbooked schedule or create if none exists
      const { data: existingSchedule } = await adminClient
        .from('schedules')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('is_booked', false)
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existingSchedule) {
        scheduleId = existingSchedule.id
        await adminClient.from('schedules').update({ is_booked: true }).eq('id', scheduleId)
      } else {
        const datePart = appointmentDate || new Date().toISOString().split('T')[0]
        const startTime = new Date(`${datePart}T10:00:00Z`).toISOString()
        const endTime = new Date(`${datePart}T10:30:00Z`).toISOString()
        const { data: newSchedule } = await adminClient
          .from('schedules')
          .insert({
            doctor_id: doctorId,
            start_time: startTime,
            end_time: endTime,
            is_booked: true,
          })
          .select('id')
          .maybeSingle()

        if (newSchedule) {
          scheduleId = newSchedule.id
        }
      }
    }

    let resolvedHospitalId = hospitalId
    if (!resolvedHospitalId) {
      const { data: docData } = await adminClient
        .from('doctors')
        .select('hospital_id')
        .eq('id', doctorId)
        .maybeSingle()
      if (docData?.hospital_id) {
        resolvedHospitalId = docData.hospital_id
      }
    }

    const { data: appointment, error: aptError } = await adminClient
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: doctorId,
        hospital_id: resolvedHospitalId || null,
        schedule_id: scheduleId,
        status: 'pending_payment',
      })
      .select('id')
      .maybeSingle()

    if (aptError || !appointment) {
      console.error('Error finalizing appointment:', aptError)
      return { error: 'Failed to create appointment in database.' }
    }

    return { success: true, appointmentId: appointment.id, isPreview: false }
  } catch (err: any) {
    console.error('Error in finalizeConsultationAppointment:', err)
    return { error: err.message || 'An unexpected error occurred.' }
  }
}
