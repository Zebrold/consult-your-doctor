'use client'

import { Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { deleteDoctorSlot } from '@/app/actions/hospital'

export function DeleteSlotButton({ scheduleId, doctorId }: { scheduleId: string, doctorId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const formData = new FormData()
    formData.append('scheduleId', scheduleId)
    formData.append('doctorId', doctorId)
    await deleteDoctorSlot(formData)
    setIsDeleting(false)
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="w-6 h-6 flex items-center justify-center rounded-full bg-[#FEF3F2] text-[#B42318] hover:bg-[#FEE4E2] transition-colors"
      title="Delete slot"
      aria-label="Delete slot"
    >
      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
