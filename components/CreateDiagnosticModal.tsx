'use client'

import { useState } from 'react'
import { createDiagnosticCenter } from '@/app/actions/admin'
import { Plus, X, Loader2 } from 'lucide-react'

const STANDARD_TESTS = [
  'X-Ray',
  'CT Scan',
  'MRI Scan',
  'Ultrasound',
  'Blood Tests',
  'ECG / EKG'
]

export function CreateDiagnosticModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedTests, setSelectedTests] = useState<string[]>(STANDARD_TESTS)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await createDiagnosticCenter(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Diagnostic Center
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Add Diagnostic Center</h3>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-6 p-4 bg-red-50 text-red-600 font-bold text-sm rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Center Name</label>
                <input required name="name" type="text" className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400" placeholder="e.g. City Diagnostics" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">City</label>
                <input required name="city" type="text" className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400" placeholder="e.g. Mumbai" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Address</label>
                <textarea required name="address" rows={3} className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400" placeholder="Full address..." />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Available Tests</label>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  {STANDARD_TESTS.map(test => {
                    const isSelected = selectedTests.includes(test)
                    return (
                      <div key={test} className="flex flex-col gap-2 p-3 bg-white border border-gray-100 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="tests" 
                            value={test} 
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTests([...selectedTests, test])
                              } else {
                                setSelectedTests(selectedTests.filter(t => t !== test))
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                          />
                          <span className="text-sm font-medium text-gray-700">{test}</span>
                        </label>
                        {isSelected && (
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-xs text-gray-500 font-bold">₹</span>
                            <input 
                              type="number" 
                              name={`price_${test}`} 
                              placeholder="Price" 
                              required 
                              min="0"
                              className="w-full text-sm border border-gray-200 rounded p-1.5 outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
