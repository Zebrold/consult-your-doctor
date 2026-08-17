'use client'

import { useState } from 'react'
import { updateAppointmentStatus } from '@/app/actions/executive'
import { Loader2 } from 'lucide-react'

export function ExecutiveStatusSelect({ appointmentId, currentStatus }: { appointmentId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setIsUpdating(true)
    const result = await updateAppointmentStatus(appointmentId, newStatus)
    
    if (result.error) {
      alert(result.error)
      // Revert status on UI
      e.target.value = status
    } else {
      setStatus(newStatus)
    }
    setIsUpdating(false)
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'confirmed': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'visited': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        onChange={handleStatusChange}
        disabled={isUpdating || status === 'completed' || status === 'cancelled'}
        className={`appearance-none font-bold text-xs px-3 py-1.5 pr-8 rounded-full border outline-none cursor-pointer disabled:opacity-70 transition-colors ${getStatusColor(status)}`}
      >
        <option value="confirmed">Confirmed</option>
        <option value="visited">Checked In</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {isUpdating ? (
        <Loader2 className="w-3 h-3 animate-spin absolute right-2.5 text-current opacity-70" />
      ) : (
        <div className="pointer-events-none absolute right-2.5 text-current opacity-70">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      )}
    </div>
  )
}
