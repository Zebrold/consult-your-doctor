'use client'

import { useState } from 'react'
import { blockScheduleSlot } from '@/app/actions/doctor'
import { ShieldAlert, Loader2 } from 'lucide-react'

export function BlockSlotButton({ scheduleId }: { scheduleId: string }) {
  const [isPending, setIsPending] = useState(false)
  
  async function handleBlock() {
    if (!window.confirm("Are you sure you want to block this time slot? Patients will not be able to book it.")) {
      return
    }
    
    setIsPending(true)
    const result = await blockScheduleSlot(scheduleId)
    if (result.error) {
      alert(result.error)
    }
    setIsPending(false)
  }
  
  return (
    <button 
      onClick={handleBlock}
      disabled={isPending}
      title="Block this slot"
      className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 bg-white hover:bg-red-50 text-emerald-700 hover:text-red-700 hover:border-red-200 border border-transparent transition-all px-2 py-1 rounded-md"
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <>
          <ShieldAlert className="w-3 h-3" />
          Block
        </>
      )}
    </button>
  )
}
