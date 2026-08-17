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
    hospital_id: hospitalId
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
    hospital_id: hospitalId
  })

  if (profileError) {
    console.error('Failed to create profile for hospital admin:', profileError)
    return { error: 'Failed to create profile.' }
  }

  return { success: true }
}
