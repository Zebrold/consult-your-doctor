'use client'

import { useRouter } from 'next/navigation'

export function DatePicker({ selectedDate }: { selectedDate: string }) {
  const router = useRouter()

  return (
    <input 
      type="date" 
      name="date"
      value={selectedDate}
      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50"
      onChange={(e) => {
        router.push(`?date=${e.target.value}`)
      }}
    />
  )
}
