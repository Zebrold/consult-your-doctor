'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileDown, FileSignature, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { prescriptionTemplatePreview, removeSignature, uploadSignature } from '@/app/actions/doctor'
import { Card } from '@/components/portal/ui'

/**
 * The doctor's prescription template: their signature (printed on every prescription) and a sample PDF to check their
 * name, registration number, clinic and signature before seeing patients.
 */
export function PrescriptionTemplate({ signatureUrl, registration }: { signatureUrl: string | null; registration: string | null }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [previewing, startPreview] = useTransition()

  const upload = (file: File | undefined) => {
    if (!file) return
    if (file.size > 1024 * 1024) return setError('The signature image must be under 1 MB.')
    const form = new FormData()
    form.append('signature', file)
    start(async () => {
      const res = await uploadSignature(form)
      setError(res.success ? null : res.error)
      if (res.success) router.refresh()
      if (input.current) input.current.value = ''
    })
  }

  const remove = () => {
    if (!window.confirm('Remove your signature? Prescriptions will show your name in its place.')) return
    start(async () => {
      const res = await removeSignature()
      setError(res.success ? null : res.error)
      if (res.success) router.refresh()
    })
  }

  const preview = () =>
    startPreview(async () => {
      const res = await prescriptionTemplatePreview()
      if (!res.success) return setError(res.error)
      setError(null)
      const bytes = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'Prescription-template-preview.pdf'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    })

  return (
    <Card>
      <div className="flex items-center gap-2 text-fresh-teal mb-1">
        <FileSignature className="w-5 h-5" />
        <h2 className="font-title-md text-[16px] md:text-title-md text-on-surface font-semibold">Prescription Template</h2>
      </div>
      <p className="text-label-sm text-on-surface-variant mb-3">Your name, clinic, registration number and signature print on every prescription.</p>

      <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Signature</span>
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link to a private file
          <img src={signatureUrl} alt="Your signature" className="h-16 max-w-full object-contain object-left bg-white rounded-lg border border-outline-variant/40 p-1.5" />
        ) : (
          <p className="text-[13px] text-on-surface-variant">No signature yet. Prescriptions show your name in its place until you add one.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" onClick={() => input.current?.click()} disabled={pending} className="px-3.5 py-2 rounded-full bg-surface-container-lowest border border-outline-variant/60 hover:border-vibrant-blue/50 text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
            {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {signatureUrl ? 'Replace signature' : 'Upload signature'}
          </button>
          {signatureUrl && (
            <button type="button" onClick={remove} disabled={pending} className="px-3 py-2 rounded-full text-[13px] font-semibold text-error hover:bg-error-container/50 inline-flex items-center gap-1.5 disabled:opacity-60">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
        </div>
        <span className="text-[11px] text-on-surface-variant">PNG or JPG, under 1 MB. Sign on white paper and photograph it, or use a transparent PNG.</span>
      </div>

      {!registration && <p className="mt-3 p-2.5 rounded-lg bg-error-container/50 text-[12.5px] text-on-error-container">Add your registration number (Edit Public Profile → Registration) so it prints on your prescriptions.</p>}
      {error && (
        <p role="alert" className="mt-3 p-2.5 rounded-lg bg-error-container text-on-error-container text-[13px]">
          {error}
        </p>
      )}

      <button type="button" onClick={preview} disabled={previewing} className="mt-3 w-full px-4 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-[13px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {previewing ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        Download a sample prescription
      </button>
    </Card>
  )
}
