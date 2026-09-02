'use client'

import { useState } from 'react'
import { updateDiagnosticTestsAndPrices } from '@/app/actions/admin'
import { X, Loader2, Activity } from 'lucide-react'

const STANDARD_TESTS = [
  'X-Ray',
  'CT Scan',
  'MRI Scan',
  'Ultrasound',
  'Blood Tests',
  'ECG / EKG'
]

export function EditDiagnosticTestsModal({ 
  centerId, 
  centerName, 
  initialTests = [],
  initialPrices = {},
  isOpen, 
  onClose 
}: { 
  centerId: string, 
  centerName: string, 
  initialTests?: string[],
  initialPrices?: Record<string, number>,
  isOpen: boolean, 
  onClose: () => void 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedTests, setSelectedTests] = useState<string[]>(initialTests)
  const [prices, setPrices] = useState<Record<string, number>>(initialPrices)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    // Construct prices object only for selected tests
    const finalPrices: Record<string, number> = {}
    selectedTests.forEach(test => {
      finalPrices[test] = prices[test] || 0
    })

    try {
      const res = await updateDiagnosticTestsAndPrices(centerId, selectedTests, finalPrices)
      if (res.error) {
        setError(res.error)
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePriceChange = (test: string, val: string) => {
    const num = parseFloat(val)
    setPrices(prev => ({ ...prev, [test]: isNaN(num) ? 0 : num }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">Edit Tests & Prices</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 text-red-600 font-bold text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Manage the available tests and their prices for <strong>{centerName}</strong>.
          </p>

          <div className="space-y-3">
            {STANDARD_TESTS.map(test => {
              const isSelected = selectedTests.includes(test)
              return (
                <div key={test} className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl transition-all">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
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
                    <span className="font-bold text-gray-700">{test}</span>
                  </label>
                  
                  {isSelected && (
                    <div className="flex items-center gap-2 pl-6 mt-1">
                      <span className="text-sm font-bold text-gray-500">₹</span>
                      <input 
                        type="number" 
                        value={prices[test] || ''}
                        onChange={(e) => handlePriceChange(test, e.target.value)}
                        placeholder="Price" 
                        required 
                        min="0"
                        className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
