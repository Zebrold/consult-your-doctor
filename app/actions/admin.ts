'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createStaffAccount(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Forbidden. Super Admin only.' }

  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string
  const hospitalId = formData.get('hospitalId') as string

  if (!password || !fullName || !role || !hospitalId) {
    return { error: 'All fields are required.' }
  }

  // 2. Initialize Supabase Admin Client
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Generate Unique ID CYD-[Initials]-[4 digits]
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  let adminId = ''
  let emailForAuth = ''
  let isUnique = false

  while (!isUnique) {
    adminId = `CYD${initials}${Math.floor(1000 + Math.random() * 9000)}`
    emailForAuth = `${adminId.toLowerCase()}@cyd.internal`
    
    // Check if exists
    const { data: existing } = await adminAuthClient.auth.admin.listUsers()
    if (!existing.users.some(u => u.email === emailForAuth)) {
      isUnique = true
    }
  }

  // 3. Create Auth User
  const { data: newAuthUser, error: authError } = await adminAuthClient.auth.admin.createUser({
    email: emailForAuth,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullName }
  })

  if (authError) {
    console.error('Failed to create auth user:', authError)
    return { error: authError.message }
  }

  // 4. Insert the profile with role and hospital
  const { error: profileError } = await supabase.from('profiles').insert({
    id: newAuthUser.user.id,
    role: role,
    full_name: fullName,
    hospital_id: hospitalId,
    staff_id: adminId
  })

  if (profileError) {
    console.error('Failed to update profile:', profileError)
    // We should ideally rollback here, but for now we'll just log
    return { error: 'User created, but failed to assign role.' }
  }

  // 5. If it's a doctor, create the doctor row
  if (role === 'doctor') {
    const specialty = formData.get('specialty') as string || 'General Medicine'
    const fee = Number(formData.get('fee')) || 500
    const exp = Number(formData.get('experience')) || 5

    // Find the department ID for this specialty in this hospital
    const { data: dept } = await supabase.from('departments')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('name', specialty)
      .single()

    // If for some reason the department doesn't exist, create it on the fly
    let deptId = dept?.id
    if (!deptId) {
      const { data: newDept, error: deptError } = await supabase.from('departments').insert({
        hospital_id: hospitalId,
        name: specialty
      }).select().single()
      
      if (!deptError) deptId = newDept.id
    }

    await supabase.from('doctors').insert({
      profile_id: newAuthUser.user.id,
      hospital_id: hospitalId,
      department_id: deptId,
      specialty: specialty,
      consultation_fee: fee,
      experience_years: exp
    })
  }

  revalidatePath('/admin/staff')
  return { success: true, adminId, password }
}

export async function createHospital(formData: FormData) {
  const supabase = await createClient()
  
  // Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Forbidden. Super Admin only.' }

  const name = formData.get('name') as string
  const city = formData.get('city') as string
  const address = formData.get('address') as string

  if (!name || !city) return { error: 'Name and City are required.' }

  // Generate a dummy email since the DB column is NOT NULL
  const generatedEmail = `info@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.internal`

  const { data: newHospital, error } = await supabase.from('hospitals').insert({
    name,
    city,
    address,
    contact_email: generatedEmail,
    status: 'active'
  }).select().single()

  if (error) {
    console.error(error)
    return { error: 'Failed to create hospital' }
  }

  // Create default departments for this hospital
  const standardDepartments = ['Cardiology', 'Neurology', 'Orthopaedics', 'General Medicine', 'Pediatrics']
  const deptsInsert = standardDepartments.map(deptName => ({
    hospital_id: newHospital.id,
    name: deptName
  }))
  await supabase.from('departments').insert(deptsInsert)

  revalidatePath('/admin/hospitals')
  return { success: true }
}

export async function updateDoctorDetails(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'hospital_admin') {
    return { error: 'Forbidden. Admin only.' }
  }

  const doctorId = formData.get('doctorId') as string
  const profileId = formData.get('profileId') as string
  
  if (!doctorId || !profileId) return { error: 'Missing IDs' }

  // Verify authorization for hospital admins
  if (profile.role === 'hospital_admin') {
    const { data: doctor } = await supabase.from('doctors').select('hospital_id').eq('id', doctorId).single()
    if (doctor?.hospital_id !== profile.hospital_id) {
      return { error: 'Doctor not found in your hospital' }
    }
  }

  const phone = formData.get('phone') as string
  const specialty = formData.get('specialty') as string
  const experience = parseInt(formData.get('experience') as string, 10)
  const fee = parseFloat(formData.get('fee') as string)
  const address = formData.get('address') as string
  const qualifications = formData.get('qualifications') as string
  const bio = formData.get('bio') as string

  if (!specialty || isNaN(experience) || isNaN(fee)) {
    return { error: 'Specialty, experience, and fee are required.' }
  }

  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Update Profile (Phone Number)
  if (phone) {
    const { error: profileError } = await adminAuthClient
      .from('profiles')
      .update({ phone_number: phone })
      .eq('id', profileId)

    if (profileError) {
      // It might fail if phone number is not unique
      if (profileError.code === '23505') {
        return { error: 'This phone number is already in use by another account.' }
      }
      return { error: 'Failed to update phone number.' }
    }
  }

  // 2. Update Doctors Table
  const { error: doctorError } = await adminAuthClient
    .from('doctors')
    .update({ 
      specialty, 
      experience_years: experience, 
      consultation_fee: fee,
      address: address || null,
      qualifications: qualifications || null,
      bio: bio || null
    })
    .eq('id', doctorId)

  if (doctorError) return { error: 'Failed to update doctor details: ' + doctorError.message }

  revalidatePath('/admin/staff')
  revalidatePath('/hospital/doctors')
  return { success: true }
}

export async function superAdminLogin(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('adminId') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  redirect('/admin/dashboard')
}

export async function createHospitalCredentials(formData: FormData) {
  const supabase = await createClient()

  // Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

  const hospitalId = formData.get('hospitalId') as string
  const hospitalName = formData.get('hospitalName') as string
  const adminId = formData.get('adminId') as string
  const password = formData.get('password') as string

  if (!hospitalId || !adminId || !password) return { error: 'Missing required fields' }

  // Admin auth client to create users
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const emailForAuth = `${adminId.toLowerCase()}@cyd.internal`

  // 1. Check if auth user exists
  const { data: existing } = await adminAuthClient.auth.admin.listUsers()
  if (existing.users.some(u => u.email === emailForAuth)) {
    return { error: 'This Admin ID is already in use.' }
  }

  // 2. Create Auth User
  const { data: newAuthUser, error: authError } = await adminAuthClient.auth.admin.createUser({
    email: emailForAuth,
    password,
    email_confirm: true,
    user_metadata: { role: 'hospital_admin', full_name: `${hospitalName} Admin` }
  })

  if (authError) {
    console.error('Failed to create hospital admin auth user:', authError)
    return { error: authError.message }
  }

  // 3. Insert the profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: newAuthUser.user.id,
    role: 'hospital_admin',
    full_name: `${hospitalName} Admin`,
    hospital_id: hospitalId,
    staff_id: adminId
  })

  if (profileError) {
    console.error('Failed to create profile for hospital admin:', profileError)
    return { error: 'Failed to create profile.' }
  }

  return { success: true }
}

export async function updateDoctorEmail(doctorId: string, email: string) {
  const supabase = await createClient()

  // Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

  if (!email || !email.includes('@')) return { error: 'Valid email is required' }

  // We need to update auth.users.email AND profiles.email
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Get the profile_id for this doctor
  const { data: doctorData } = await supabase.from('doctors').select('profile_id').eq('id', doctorId).single()
  if (!doctorData) return { error: 'Doctor not found' }

  // Derive staffId from current auth.users email if possible
  const { data: authUserObj } = await adminAuthClient.auth.admin.getUserById(doctorData.profile_id)
  let staffId = null
  if (authUserObj.user && authUserObj.user.email?.endsWith('@cyd.internal')) {
    staffId = authUserObj.user.email.split('@')[0].toUpperCase()
  }

  // 2. Update Auth User
  const { error: authError } = await adminAuthClient.auth.admin.updateUserById(
    doctorData.profile_id,
    { email: email, email_confirm: true }
  )

  if (authError) {
    console.error('Failed to update auth email:', authError)
    return { error: authError.message }
  }

  // 3. Update Profiles Table
  const updateData: any = { email }
  if (staffId) updateData.staff_id = staffId
  
  const { error: profileError } = await adminAuthClient.from('profiles').update(updateData).eq('id', doctorData.profile_id)
  
  if (profileError) {
    console.error('Failed to update profile email:', profileError)
    return { error: 'Auth updated but profile update failed.' }
  }

  revalidatePath('/admin/dashboard/doctors')
  return { success: true }
}

export async function updateStaffEmail(profileId: string, email: string, staffId: string) {
  const supabase = await createClient()

  // Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

  if (!email || !email.includes('@')) return { error: 'Valid email is required' }

  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Update Auth User directly using profileId
  const { error: authError } = await adminAuthClient.auth.admin.updateUserById(
    profileId,
    { email: email, email_confirm: true }
  )

  if (authError) {
    console.error('Failed to update auth email:', authError)
    return { error: authError.message }
  }

  // 2. Update Profiles Table
  // We also save staff_id just in case it was NULL for legacy users
  const { error: profileError } = await adminAuthClient.from('profiles').update({ email, staff_id: staffId }).eq('id', profileId)
  
  if (profileError) {
    console.error('Failed to update profile email:', profileError)
    return { error: 'Auth updated but profile update failed.' }
  }

  revalidatePath('/admin/staff')
  return { success: true }
}

export async function deleteHospital(hospitalId: string) {
  const supabase = await createClient()
  
  // 1. Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'super_admin') return { error: 'Forbidden. Super Admin only.' }

  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 2. Find all hospital_admin profiles for this hospital
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('hospital_id', hospitalId)

    // 3. Delete those auth users (this cascades to their profiles)
    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await adminAuthClient.auth.admin.deleteUser(admin.id)
      }
    }

    // 4. Delete the hospital itself (cascades to doctors, appointments, etc)
    const { error: deleteError } = await supabase
      .from('hospitals')
      .delete()
      .eq('id', hospitalId)

    if (deleteError) throw deleteError

    revalidatePath('/admin/hospitals')
    return { success: true }
  } catch (err: any) {
    console.error('Delete hospital error:', err)
    return { error: err.message || 'Failed to delete hospital.' }
  }
}

export async function deleteStaffAccount(profileId: string) {
  const supabase = await createClient()

  // 1. Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'super_admin') return { error: 'Forbidden. Super Admin only.' }

  if (!profileId) return { error: 'Profile ID is required.' }

  try {
    // 2. Initialize Supabase Admin Client
    const adminAuthClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Delete from auth.users (cascades to profiles, doctors, executives, etc)
    const { error: authError } = await adminAuthClient.auth.admin.deleteUser(profileId)

    if (authError) {
      console.error('Failed to delete user from Auth:', authError)
      return { error: 'Failed to delete user.' }
    }

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (err: any) {
    console.error('Delete staff error:', err)
    return { error: 'Failed to delete staff account.' }
  }
}

export async function uploadHospitalImage(hospitalId: string, formData: FormData) {
  const supabase = await createClient()

  // 1. Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'super_admin') return { error: 'Forbidden. Super Admin only.' }

  const file = formData.get('image') as File
  if (!file || file.size === 0) return { error: 'No image provided' }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext = file.name.split('.').pop()
  const filePath = `hospitals/${hospitalId}-${Date.now()}.${ext}`

  const { error: uploadError } = await adminClient.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    console.error('Failed to upload hospital image:', uploadError)
    return { error: 'Failed to upload image' }
  }

  const { data: publicUrlData } = adminClient.storage
    .from('avatars')
    .getPublicUrl(filePath)

  const imageUrl = publicUrlData.publicUrl

  const { error: updateError } = await adminClient
    .from('hospitals')
    .update({ image_url: imageUrl })
    .eq('id', hospitalId)

  if (updateError) {
    console.error('Failed to update hospital with image URL:', updateError)
    return { error: 'Failed to link image to hospital' }
  }

  revalidatePath('/admin/hospitals')
  revalidatePath('/')
  return { success: true, imageUrl }
}

export async function uploadDoctorImage(doctorId: string, formData: FormData) {
  const supabase = await createClient()

  // 1. Verify caller is Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'super_admin') return { error: 'Forbidden. Super Admin only.' }

  const file = formData.get('image') as File
  if (!file || file.size === 0) return { error: 'No image provided' }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext = file.name.split('.').pop()
  const filePath = `doctors/${doctorId}-${Date.now()}.${ext}`

  const { error: uploadError } = await adminClient.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    console.error('Failed to upload doctor image:', uploadError)
    return { error: 'Failed to upload image' }
  }

  const { data: publicUrlData } = adminClient.storage
    .from('avatars')
    .getPublicUrl(filePath)

  const imageUrl = publicUrlData.publicUrl

  const { error: updateError } = await adminClient
    .from('doctors')
    .update({ image_url: imageUrl })
    .eq('id', doctorId)

  if (updateError) {
    console.error('Failed to update doctor with image URL:', updateError)
    return { error: 'Failed to link image to doctor' }
  }

  revalidatePath('/admin/staff')
  revalidatePath('/admin/dashboard/doctors')
  revalidatePath('/')
  return { success: true, imageUrl }
}
