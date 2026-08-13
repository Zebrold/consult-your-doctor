'use client'

import { useActionState } from 'react'
import { superAdminLogin } from '@/app/actions/admin'
import { ShieldAlert } from 'lucide-react'

export default function SuperAdminLogin() {
  const [state, formAction, isPending] = useActionState(superAdminLogin, null)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-md w-full relative overflow-hidden">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#E31E24]" />
        
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-red-50 rounded-full text-[#E31E24]">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Super Admin Portal</h1>
          <p className="text-gray-500 text-sm">Restricted access. Please log in with your administrative credentials.</p>
        </div>

        {state?.error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 text-center font-medium">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin ID</label>
            <input 
              type="text" 
              name="adminId" 
              required
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
              placeholder="Enter your Admin ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              required
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
              placeholder="••••••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full py-2.5 mt-2 bg-[#E31E24] text-white font-semibold rounded-full cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isPending ? 'Authenticating...' : 'Access Portal'}
          </button>
        </form>
      </div>
    </div>
  )
}
