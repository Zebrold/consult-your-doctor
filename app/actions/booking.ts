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

  // 4. Redirect to the checkout page
  redirect(`/patient/checkout/${appointment.id}`)
}
