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
      className="p-1.5 bg-error-container text-error rounded-full hover:bg-error/20 transition-colors"
      title="Delete Slot"
    >
      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
