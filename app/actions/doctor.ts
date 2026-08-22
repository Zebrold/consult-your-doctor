'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function addPrescription(formData: FormData) {
  const appointmentId = formData.get('appointmentId') as string
  const notes = formData.get('notes') as string
  const file = formData.get('file') as File | null

  if (!appointmentId || !notes) return { error: 'Missing required fields' }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify doctor owns the appointment
  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { error: 'Not a doctor' }

  const { data: appointment } = await supabase.from('appointments').select('doctor_id').eq('id', appointmentId).single()
  if (!appointment || appointment.doctor_id !== doctor.id) {
    return { error: 'Not authorized for this appointment' }
  }

  let fileUrl = 'none'

  if (file && file.size > 0) {
    // Basic validation
    if (file.size > 5242880) return { error: 'File size must be under 5MB' }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${appointmentId}-${Date.now()}.${fileExt}`
    
    // Upload to supabase storage using admin client to bypass Storage RLS
    const adminClient = createAdminClient()
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('medical_records')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { error: 'Failed to upload document' }
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('medical_records')
      .getPublicUrl(uploadData.path)
      
    fileUrl = publicUrl
  }

  // Insert medical record
  const { error: insertError } = await supabase.from('medical_records').insert({
    appointment_id: appointmentId,
    document_type: 'prescription',
    notes: notes,
    file_url: fileUrl
  })

  if (insertError) {
    console.error(insertError)
    return { error: 'Failed to add prescription' }
  }

  // Auto-complete the appointment
  await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)

  revalidatePath('/doctor/dashboard')
  return { success: true }
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

  revalidatePath('/doctor/dashboard/schedules')
  return { success: true }
}
