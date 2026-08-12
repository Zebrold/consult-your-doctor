'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phoneNumber = formData.get('phoneNumber') as string
  const role = (formData.get('role') as string) || 'patient'
  const hospitalId = formData.get('hospitalId') as string | null

  if (!email || !password || !fullName) {
    return { error: 'Email, password, and full name are required.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Note: To successfully insert into 'profiles', the RLS policy must either 
    // allow inserts for the authenticated user (e.g. `auth.uid() = id`), 
    // or this needs to be done via a service role key.
    // Ensure you add an INSERT policy to profiles:
    // CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = (SELECT auth.uid()));
    
    const profileData: any = {
      id: data.user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      role: role,
    }

    if (hospitalId) {
      profileData.hospital_id = hospitalId
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)

    if (profileError) {
      return { error: `Profile creation failed: ${profileError.message}` }
    }
  }

  redirect('/')
}

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }
  
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
