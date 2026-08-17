'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
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

  // Update status
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)

  if (updateError) {
    console.error('Failed to update status:', updateError)
    return { error: 'Failed to update status' }
  }

  revalidatePath('/executive/dashboard')
  return { success: true }
}
