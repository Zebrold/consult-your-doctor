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
      setSuccess(`Published ${result.count} slots${result.skipped ? ` (${result.skipped} skipped: those times are already covered)` : ''}.`)
    }
    
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-error-container text-on-error-container text-sm rounded-lg font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-secondary-container/60 text-on-secondary-container text-sm rounded-lg font-medium">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-label-sm text-label-sm text-indigo-gray-600 mb-1">Start Date</label>
          <input 
            type="date" 
            name="startDate" 
            required 
            defaultValue={selectedDate}
            className="w-full rounded-lg p-2.5 bg-surface-container-low text-indigo-gray-900 outline-none focus:ring-2 focus:ring-vibrant-blue/30"
          />
        </div>
        <div>
          <label className="block font-label-sm text-label-sm text-indigo-gray-600 mb-1">End Date</label>
          <input 
            type="date" 
            name="endDate" 
            required 
            defaultValue={selectedDate}
            className="w-full rounded-lg p-2.5 bg-surface-container-low text-indigo-gray-900 outline-none focus:ring-2 focus:ring-vibrant-blue/30"
          />
        </div>
      </div>

      <div>
        <label className="block font-label-sm text-label-sm text-indigo-gray-600 mb-2">Active Days</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition-colors ${
                activeDays.includes(day.value) 
                  ? 'bg-vibrant-blue border-vibrant-blue text-on-primary' 
                  : 'bg-surface-container-low border-transparent text-indigo-gray-600 hover:bg-surface-container'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-label-sm text-label-sm text-indigo-gray-600 mb-1">Start Time</label>
          <input 
            type="time" 
            name="startTime" 
            required 
            defaultValue="09:00"
            className="w-full rounded-lg p-2.5 bg-surface-container-low text-indigo-gray-900 outline-none focus:ring-2 focus:ring-vibrant-blue/30"
          />
        </div>
        <div>
          <label className="block font-label-sm text-label-sm text-indigo-gray-600 mb-1">End Time</label>
          <input 
            type="time" 
            name="endTime" 
            required 
            defaultValue="17:00"
            className="w-full rounded-lg p-2.5 bg-surface-container-low text-indigo-gray-900 outline-none focus:ring-2 focus:ring-vibrant-blue/30"
          />
        </div>
      </div>
      
      <div>
        <label className="block font-label-sm text-label-sm text-indigo-gray-600 mb-1">Slot Duration (Mins)</label>
        <select 
          name="duration" 
          defaultValue="15"
          className="w-full rounded-lg p-2.5 bg-surface-container-low text-indigo-gray-900 outline-none focus:ring-2 focus:ring-vibrant-blue/30"
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
          className="w-full py-3 bg-vibrant-blue hover:bg-primary text-on-primary font-bold rounded-full transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publish Slots'}
        </button>
      </div>
    </form>
  )
}
