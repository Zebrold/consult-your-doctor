'use client'

import { useRouter } from 'next/navigation'

export function DatePicker({ selectedDate }: { selectedDate: string }) {
  const router = useRouter()

  return (
    <input 
      type="date" 
      name="date"
      value={selectedDate}
      className="w-full rounded-lg p-3 bg-surface-container-low text-indigo-gray-900 outline-none focus:ring-2 focus:ring-vibrant-blue/30"
      onChange={(e) => {
        router.push(`?date=${e.target.value}`)
      }}
    />
  )
}
