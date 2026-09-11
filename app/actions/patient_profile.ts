'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePatientProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const fullName = formData.get('full_name') as string
  const bloodGroup = formData.get('blood_group') as string
  const dateOfBirth = formData.get('date_of_birth') as string
  const gender = formData.get('gender') as string
  const address = formData.get('address') as string
  const emergencyContactName = formData.get('emergency_contact_name') as string
  const emergencyContactRelation = formData.get('emergency_contact_relation') as string
  const emergencyContactPhone = formData.get('emergency_contact_phone') as string

  // Update full name in profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
    return { success: false, error: profileError.message }
  }

  // Upsert patient details
  const { error: detailsError } = await supabase
    .from('patient_details')
    .upsert({
      id: user.id,
      blood_group: bloodGroup,
      date_of_birth: dateOfBirth || null,
      gender: gender,
      address: address,
      emergency_contact_name: emergencyContactName,
      emergency_contact_relation: emergencyContactRelation,
      emergency_contact_phone: emergencyContactPhone,
      updated_at: new Date().toISOString()
    })

  if (detailsError) {
    console.error('Error updating patient details:', detailsError)
    return { success: false, error: detailsError.message }
  }

  revalidatePath('/patient/profile')
  
  return { success: true }
}
