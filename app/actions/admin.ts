'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function superAdminLogin(prevState: any, formData: FormData) {
  const adminId = formData.get('adminId')
  const password = formData.get('password')

  const validId = process.env.SUPER_ADMIN_ID
  const validPassword = process.env.SUPER_ADMIN_PASSWORD

  if (!validId || !validPassword) {
    return { error: 'Server configuration error. Admin credentials not set.' }
  }

  if (adminId === validId && password === validPassword) {
    // Set secure HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('super_admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    })
    redirect('/admin/dashboard')
  } else {
    return { error: 'Invalid admin credentials.' }
  }
}

export async function superAdminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete('super_admin_session')
  redirect('/admin')
}
