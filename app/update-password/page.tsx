'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [password, setPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    // When landing here from the email link, Supabase will parse the URL fragment (#access_token=...)
    // and establish the session automatically.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // We wait a tiny bit to see if the hash is still processing
        setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabase.auth.getSession()
          if (!delayedSession) {
            setError('Link is invalid or has expired. Please request a new password reset.')
          }
          setIsCheckingSession(false)
        }, 500)
      } else {
        setIsCheckingSession(false)
      }
    }
    
    checkSession()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setError('')
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    
    setIsUpdating(false)
    
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Sign them out so they can log back in via the standard portal with their Staff ID
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        
        {isCheckingSession ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500 font-medium">Verifying reset link...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h1>
            <p className="text-gray-500 text-center mb-8">
              Your password has been successfully reset. You can now return to the login portal.
            </p>
            <Link 
              href="/login" 
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <KeyRound className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
              <p className="text-gray-500 text-sm mt-1 text-center">
                Please enter your new password below.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-center font-medium">
                {error}
              </div>
            )}

            {!error.includes('expired') && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                  <input 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900" 
                  />
                </div>
                <button 
                  disabled={isUpdating || !password} 
                  type="submit" 
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                </button>
              </form>
            )}
            
            {error.includes('expired') && (
               <Link 
                 href="/login" 
                 className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors mt-4 block text-center"
               >
                 Return to Login
               </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
