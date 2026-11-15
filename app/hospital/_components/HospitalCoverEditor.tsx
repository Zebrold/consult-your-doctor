'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { removeHospitalCover, updateHospitalCover } from '@/app/actions/hospital-profile'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** "Change cover" over the profile banner: picks a photo and uploads it at once, with Remove when there is one. */
export function HospitalCoverEditor({ hasCover, className = '' }: { hasCover: boolean; className?: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const upload = (file: File | undefined) => {
    if (!file) return
    if (!TYPES.includes(file.type)) return setError('The cover must be a JPG, PNG or WebP image.')
    if (file.size > 5 * 1024 * 1024) return setError('The cover must be under 5 MB.')
    setError(null)
    const form = new FormData()
    form.set('cover', file)
    start(async () => {
      const res = await updateHospitalCover(form)
      if (!res.success) return setError(res.error)
      router.refresh()
    })
  }

  const remove = () => {
    setError(null)
    start(async () => {
      const res = await removeHospitalCover()
      if (!res.success) return setError(res.error)
      router.refresh()
    })
  }

  const pill = 'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur-sm text-white text-[13px] font-extrabold transition-colors disabled:opacity-60'

  return (
    <div className={`flex flex-col items-end gap-1.5 ${className}`}>
      <div className="flex gap-2">
        {hasCover && (
          <button type="button" onClick={remove} disabled={pending} aria-label="Remove cover photo" className={pill}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={() => input.current?.click()} disabled={pending} className={pill}>
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {pending ? 'Saving…' : hasCover ? 'Change cover' : 'Add cover photo'}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error && (
        <p role="alert" className="max-w-[320px] px-3 py-2 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[12.5px] font-bold text-right">
          {error}
        </p>
      )}
    </div>
  )
}
