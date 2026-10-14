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

  // 1. Check if another profile already claims this phone number
  const { data: phoneConflict } = await admin
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('phone_number', cleanPhone)
    .neq('id', user.id)
    .maybeSingle()

  if (phoneConflict) {
    // If the conflicting profile is an unlinked phone profile (no email or same email) for a patient,
    // merge its records (appointments, bookings, details) into the current user's profile
    const canMerge = phoneConflict.role === 'patient' && (!phoneConflict.email || phoneConflict.email.toLowerCase() === (user.email || '').toLowerCase())
    if (canMerge) {
      console.log(`[updatePatientProfile] Merging unlinked phone profile ${phoneConflict.id} into ${user.id}`)
      // Reassign appointments
      await admin.from('appointments').update({ patient_id: user.id }).eq('patient_id', phoneConflict.id)
      // Reassign diagnostic bookings
      await admin.from('diagnostic_bookings').update({ patient_id: user.id }).eq('patient_id', phoneConflict.id)
      // Copy over patient_details if existing details had info and current doesn't
      const { data: oldDetails } = await admin.from('patient_details').select('*').eq('id', phoneConflict.id).maybeSingle()
      if (oldDetails) {
        await admin.from('patient_details').delete().eq('id', phoneConflict.id)
      }
      // Release phone from conflicting profile so unique constraint allows updating user.id
      await admin.from('profiles').update({ phone_number: null }).eq('id', phoneConflict.id)
      // Clean up the orphan phone auth user if it exists
      try {
        await admin.auth.admin.deleteUser(phoneConflict.id)
      } catch (delErr) {
        console.warn('Could not delete old phone auth user:', delErr)
      }
    } else {
      return { success: false, error: 'This mobile number is already registered to another account. Please use a different number or sign in with that account.' }
    }
  }

  // 2. Ensure current user's profile exists in profiles table
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({ 
        full_name: fullName,
        phone_number: cleanPhone,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return { 
        success: false, 
        error: profileError.code === '23505' ? 'This mobile number is already registered to another account.' : profileError.message 
      }
    }
  } else {
    // If another non-staff profile mistakenly holds this user's email, clear it
    if (user.email) {
      const emailLower = user.email.toLowerCase().trim()
      const { data: emailConflict } = await admin
        .from('profiles')
        .select('id, staff_id')
        .ilike('email', emailLower)
        .neq('id', user.id)
        .maybeSingle()

      if (emailConflict && !emailConflict.staff_id) {
        await admin.from('profiles').update({ email: null }).eq('id', emailConflict.id)
      }
    }

    const { error: insertError } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        phone_number: cleanPhone,
        email: user.email ? user.email.toLowerCase().trim() : null,
        role: 'patient',
      })

    if (insertError) {
      console.error('Error creating profile for user:', insertError)
      return { 
        success: false, 
        error: insertError.code === '23505' ? 'This mobile number or email is already registered.' : insertError.message 
      }
    }
  }

  // Also sync to auth.users metadata so session context stays up-to-date
  try {
    await admin.auth.admin.updateUserById(user.id, {
      ...(user.phone ? {} : { phone: cleanPhone }),
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
