'use client'

import { useState } from 'react'
import { generateDoctorSlots } from '@/app/actions/hospital'
import { Loader2 } from 'lucide-react'

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 }
]

export function SlotGeneratorForm({ doctorId, selectedDate }: { doctorId: string, selectedDate: string }) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default

  const toggleDay = (dayValue: number) => {
    setActiveDays(prev => 
      prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')
    setSuccess('')

    if (activeDays.length === 0) {
      setError('Please select at least one active day of the week.')
      setIsPending(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.append('doctorId', doctorId)
    formData.append('activeDays', JSON.stringify(activeDays))

    const result = await generateDoctorSlots(formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Successfully generated ${result.count} slots!`)
    }
    
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 font-medium">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Start Date</label>
          <input 
            type="date" 
            name="startDate" 
            required 
            defaultValue={selectedDate}
            className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">End Date</label>
          <input 
            type="date" 
            name="endDate" 
            required 
            defaultValue={selectedDate}
            className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Active Days</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                activeDays.includes(day.value) 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

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
            defaultValue="17:00"
            className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Slot Duration (Mins)</label>
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
