'use client'

import { useState } from 'react'
import { generateDoctorSlots } from '@/app/actions/hospital'
import { Loader2 } from 'lucide-react'

export function SlotGeneratorForm({ doctorId, selectedDate }: { doctorId: string, selectedDate: string }) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.append('doctorId', doctorId)
    formData.append('date', selectedDate)

    const result = await generateDoctorSlots(formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      // Success, maybe show a toast
    }
    
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Start Time</label>
          <input 
            type="time" 
            name="startTime" 
            required 
            defaultValue="09:00"
            className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">End Time</label>
          <input 
            type="time" 
            name="endTime" 
            required 
            defaultValue="13:00"
            className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Duration (Mins)</label>
        <select 
          name="duration" 
          defaultValue="15"
          className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50"
        >
          <option value="10">10 Minutes</option>
          <option value="15">15 Minutes</option>
          <option value="20">20 Minutes</option>
          <option value="30">30 Minutes</option>
          <option value="45">45 Minutes</option>
          <option value="60">60 Minutes</option>
        </select>
      </div>

      <div className="pt-2">
        <button 
          type="submit" 
          disabled={isPending}
          className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Slots'}
        </button>
      </div>
    </form>
  )
}
