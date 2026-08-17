'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { staffLogin } from '@/app/actions/auth'
import { Building2, ArrowLeft, Loader2 } from 'lucide-react'

export default function HospitalLoginPage() {
  const [state, formAction, isPending] = useActionState(staffLogin, null)

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </Link>
      
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Hospital Admin Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in with your Staff ID to manage your facility</p>
      </div>

      {state?.error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-center font-medium">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="role" value="hospital_admin" />
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Staff ID</label>
          <input required name="staffId" type="text" placeholder="e.g. CYDAB1234" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
          <input required name="password" type="password" placeholder="••••••••" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900" />
        </div>
        <button disabled={isPending} type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors mt-2 disabled:opacity-50 flex justify-center items-center gap-2">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
