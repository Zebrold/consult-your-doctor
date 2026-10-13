'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updatePatientProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const fullName = (formData.get('full_name') as string)?.trim()
  const rawPhone = (formData.get('phone_number') as string)?.trim()
  const bloodGroup = (formData.get('blood_group') as string)?.trim() || null
  const dateOfBirth = (formData.get('date_of_birth') as string)?.trim() || null
  const gender = (formData.get('gender') as string)?.trim() || null
  const address = (formData.get('address') as string)?.trim() || null
  const emergencyContactName = (formData.get('emergency_contact_name') as string)?.trim() || null
  const emergencyContactRelation = (formData.get('emergency_contact_relation') as string)?.trim() || null
  const emergencyContactPhone = (formData.get('emergency_contact_phone') as string)?.trim() || null

  if (!fullName) {
    return { success: false, error: 'Full legal name is required.' }
  }

  // Phone number is strictly mandatory
  if (!rawPhone) {
    return { success: false, error: 'Phone number is mandatory to receive booking and medical updates.' }
  }

  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
  }

  // Format as standard E.164 (+91XXXXXXXXXX for 10-digit Indian numbers)
  const cleanPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`

  const admin = createAdminClient()

  // Update full name and phone number in profiles table
  const { error: profileError } = await admin
    .from('profiles')
    .update({ 
      full_name: fullName,
      phone_number: cleanPhone,
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
    return { success: false, error: profileError.message }
  }

  // Also sync to auth.users metadata so session context stays up-to-date
  try {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: fullName,
        phone_number: cleanPhone,
        phone: cleanPhone,
      },
    })
  } catch (authErr) {
    console.warn('Could not update user metadata:', authErr)
  }

  // Upsert patient details
  const { error: detailsError } = await admin
    .from('patient_details')
    .upsert({
      id: user.id,
      blood_group: bloodGroup,
      date_of_birth: dateOfBirth,
      gender: gender,
      address: address,
      emergency_contact_name: emergencyContactName,
      emergency_contact_relation: emergencyContactRelation,
      emergency_contact_phone: emergencyContactPhone,
      updated_at: new Date().toISOString(),
    })

  if (detailsError) {
    console.error('Error updating patient details:', detailsError)
    return { success: false, error: detailsError.message }
  }

  revalidatePath('/patient/profile')
  revalidatePath('/patient/appointments')
  
  return { success: true }
}
