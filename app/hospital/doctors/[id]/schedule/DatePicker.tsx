'use client'

import { useRouter } from 'next/navigation'

export function DatePicker({ selectedDate }: { selectedDate: string }) {
  const router = useRouter()

  return (
    <input 
      type="date" 
      name="date"
      value={selectedDate}
      className="w-full h-12 rounded-xl px-3.5 bg-white border-[1.5px] border-[#D6DDE8] text-[14px] font-bold text-[#0B1B3F] outline-none focus:border-[#2A4DD0]"
      onChange={(e) => {
        router.push(`?date=${e.target.value}`)
      }}
    />
  )
}
