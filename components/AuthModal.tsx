'use client'

import { useState, useActionState } from 'react'
import { X } from 'lucide-react'
import { login, signUp } from '@/app/actions/auth'

type AuthModalProps = {
  isOpen: boolean
  onClose: () => void
  initialType?: 'login' | 'signup'
}

export function AuthModal({ isOpen, onClose, initialType = 'login' }: AuthModalProps) {
  const [type, setType] = useState<'login' | 'signup'>(initialType)
  
  const [loginState, loginAction, isLoginPending] = useActionState(login, null)
  const [signupState, signupAction, isSignupPending] = useActionState(signUp, null)
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'login' ? (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-500 text-sm mt-2">Log in to your Consult Your Doctor account.</p>
            </div>

            {loginState?.error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                {loginState.error}
              </div>
            )}

            <form action={loginAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  name="password" 
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                />
              </div>
              
              <button 
                type="submit"
                disabled={isLoginPending}
                className="w-full py-2.5 bg-[#E31E24] text-white rounded-md font-semibold hover:bg-red-700 transition-colors mt-4 disabled:opacity-50"
              >
                {isLoginPending ? 'Logging In...' : 'Log In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button onClick={() => setType('signup')} className="text-[#E31E24] font-semibold hover:underline">
                Register here
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
              <p className="text-gray-500 text-sm mt-2">Join Consult Your Doctor today.</p>
            </div>

            {signupState?.error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                {signupState.error}
              </div>
            )}

            <form action={signupAction} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="fullName" 
                  required
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    name="phoneNumber" 
                    placeholder="+1 234 567 8900"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                  <select 
                    name="role" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none bg-white transition-all"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="executive">Executive</option>
                    <option value="hospital_admin">Hospital Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  name="password" 
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                />
              </div>
              
              <button 
                type="submit"
                disabled={isSignupPending}
                className="w-full py-2.5 bg-[#E31E24] text-white rounded-md font-semibold hover:bg-red-700 transition-colors mt-2 disabled:opacity-50"
              >
                {isSignupPending ? 'Registering...' : 'Register'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button onClick={() => setType('login')} className="text-[#E31E24] font-semibold hover:underline">
                Log in here
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
