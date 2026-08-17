'use client'

import { useState } from 'react'
import { X, Key, ShieldCheck, Loader2 } from 'lucide-react'
import { createHospitalCredentials } from '@/app/actions/admin'

interface ManageHospitalCredentialsModalProps {
  hospitalId: string
  hospitalName: string
}

export function ManageHospitalCredentialsModal({ hospitalId, hospitalName }: ManageHospitalCredentialsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [generatedId, setGeneratedId] = useState('')
  const [password, setPassword] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')

  const handleGenerateId = () => {
    // Format: CYD + First 4 letters + DDMMYY
    const prefix = 'CYD'
    const shortName = hospitalName.replace(/\s/g, '').substring(0, 4).toUpperCase()
    
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yy = String(today.getFullYear()).slice(2)
    
    setGeneratedId(`${prefix}${shortName}${dd}${mm}${yy}`)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!generatedId || !password) return

    setIsPending(true)
    setError('')
    
    const formData = new FormData()
    formData.append('hospitalId', hospitalId)
    formData.append('hospitalName', hospitalName)
    formData.append('adminId', generatedId)
    formData.append('password', password)

    const result = await createHospitalCredentials(formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMessage('Credentials successfully generated and assigned to this hospital.')
    }
    
    setIsPending(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <Key className="w-4 h-4 text-gray-400" />
        Provision Admin
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                Hospital Credentials
              </h2>
              <button 
                onClick={() => { setIsOpen(false); setSuccessMessage(''); setError(''); setGeneratedId(''); setPassword(''); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMessage ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Access Granted</h3>
                  <p className="text-gray-500 text-sm">{successMessage}</p>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-6 text-left border border-gray-100 shadow-inner">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hospital Admin ID</p>
                      <p className="text-xl font-black text-indigo-600 font-mono tracking-wide">{generatedId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</p>
                      <p className="text-lg font-bold text-gray-900 font-mono">{password}</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => { setIsOpen(false); setSuccessMessage(''); setGeneratedId(''); setPassword(''); }}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4 border border-blue-100">
                  You are generating Master Administrator credentials for <strong>{hospitalName}</strong>.
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Hospital Admin ID</label>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={generatedId} 
                      className="flex-1 border border-gray-200 rounded-xl p-2.5 bg-gray-50 text-gray-900 font-mono font-bold outline-none" 
                      placeholder="Click Generate" 
                    />
                    <button 
                      type="button" 
                      onClick={handleGenerateId}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors whitespace-nowrap"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Format: CYD + First 4 letters + Date(DDMMYY)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Set Password</label>
                  <input 
                    required 
                    type="text" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400" 
                    placeholder="Enter strong password" 
                  />
                </div>

                <div className="pt-2">
                  <button 
                    disabled={isPending || !generatedId || !password}
                    type="submit" 
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Provision Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
