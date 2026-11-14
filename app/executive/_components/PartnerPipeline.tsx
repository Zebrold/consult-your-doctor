'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleCheck, Loader2, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { startDocumentUploads } from '@/app/actions/applicationUploads'
import { fileApplicationForEnquiry, updateEnquiry } from '@/app/actions/partner-enquiries'
import { APPLICATION_DOCS, DOC_BUCKET, acceptAttr } from '@/lib/application-documents'
import { HOSPITAL_DEPARTMENTS } from '@/lib/partner-applications'
import { EmptyState, btnOutline, btnPrimary, btnSmall, card, telHref } from './ui'

export type Enquiry = {
  id: string
  kind: 'hospital' | 'diagnostic_center'
  name: string
  city: string
  beds: number | null
  contact: string
  role: string | null
  phone: string
  email: string | null
  message: string | null
  stage: 'new' | 'called' | 'interested' | 'applied' | 'not_interested'
  notes: string | null
  when: string
  lastCalled: string | null
}

const COLUMNS: { stage: Enquiry['stage']; label: string }[] = [
  { stage: 'new', label: 'New enquiry' },
  { stage: 'called', label: 'Called' },
  { stage: 'interested', label: 'Interested' },
  { stage: 'applied', label: 'Application submitted' },
]
const STAGE_LABEL: Record<Enquiry['stage'], string> = { new: 'New enquiry', called: 'Called, no answer yet', interested: 'Interested', applied: 'Application submitted', not_interested: 'Not interested' }
const field = 'w-full min-w-0 h-[42px] px-3.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[14px] outline-none focus:border-[#2A4DD0] focus:shadow-[0_0_0_3px_rgba(42,77,208,0.12)]'
const label = 'block mb-1.5 text-[12.5px] font-extrabold text-[#27324A]'

/** Support's Hospital interest after DeskExeSupportLeads: the joining pipeline, and the enquiry being worked on. */
export function PartnerPipeline({ enquiries, ready }: { enquiries: Enquiry[]; ready: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(enquiries.find((e) => e.stage !== 'applied' && e.stage !== 'not_interested')?.id ?? enquiries[0]?.id ?? null)
  const selected = enquiries.find((e) => e.id === selectedId) ?? null
  const closed = enquiries.filter((e) => e.stage === 'not_interested')

  if (!ready) return <EmptyState icon={Phone}>Hospital enquiries start once supabase/migrations/20261115_executive_workspace.sql has run.</EmptyState>

  return (
    <div className="flex flex-col gap-3.5 lg:gap-5">
      <section className={`${card} p-4 lg:p-[22px]`}>
        <h2 className="text-[16px] font-extrabold">Joining pipeline</h2>
        <p className="mt-[3px] mb-4 text-[13px] text-[#5B667A]">Enquiries from “Talk to our team” on the Partner with us page. Call each hospital and help them apply.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const list = enquiries.filter((e) => e.stage === col.stage)
            return (
              <div key={col.stage} className="rounded-[14px] bg-[#F7F9FC] p-2.5 min-w-0">
                <span className="flex items-center justify-between px-1.5 pb-2 text-[12.5px] font-extrabold text-[#27324A]">
                  {col.label}
                  <span className="text-[#5B667A]">{list.length}</span>
                </span>
                <div className="flex flex-col gap-2">
                  {list.length === 0 && <span className="px-1.5 pb-1 text-[12px] text-[#98A2B3]">None</span>}
                  {list.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      className={`text-left px-3 py-2.5 rounded-xl bg-white ${e.id === selectedId ? 'shadow-[0_0_0_1.5px_#2A4DD0]' : 'shadow-[0_0_0_1px_#E6EAF0] hover:shadow-[0_0_0_1px_#C9D5F2]'}`}
                    >
                      <span className="block text-[13.5px] font-extrabold truncate">{e.name}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">{e.city}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">
                        {[e.beds != null ? `${e.beds} beds` : null, e.when].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {closed.length > 0 && (
          <p className="mt-3 text-[12.5px] text-[#5B667A]">
            Not interested: {closed.map((e) => e.name).join(', ')}
          </p>
        )}
      </section>

      {selected ? <EnquiryDetail key={selected.id} e={selected} /> : <EmptyState icon={Phone}>No enquiries yet.</EmptyState>}
    </div>
  )
}

function EnquiryDetail({ e }: { e: Enquiry }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [notes, setNotes] = useState(e.notes ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [filing, setFiling] = useState(false)

  const update = (input: { stage?: Enquiry['stage']; called?: boolean }, ok: string) =>
    start(async () => {
      setMsg(null)
      const res = await updateEnquiry(e.id, { ...input, notes })
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      setMsg({ ok: true, text: ok })
      router.refresh()
    })

  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <span className="block text-[12px] font-extrabold text-[#5B667A]">
        {STAGE_LABEL[e.stage]} · enquiry {e.when}
        {e.lastCalled ? ` · last called ${e.lastCalled}` : ''}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
        <span className="min-w-0">
          <span className="block text-[19px] font-extrabold tracking-[-0.01em]">{e.name}</span>
          <span className="block text-[13px] text-[#5B667A]">
            {[e.kind === 'hospital' ? 'Hospital' : 'Diagnostic centre', e.city, e.beds != null ? `${e.beds} beds` : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <a href={telHref(e.phone)} className={btnPrimary}>
          <Phone className="w-4 h-4" /> Call {e.phone}
        </a>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-[18px] gap-y-3 mt-4 px-4 py-3.5 rounded-xl bg-[#F7F9FC] text-[13.5px]">
        <div>
          <dt className="text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">Contact</dt>
          <dd className="mt-[3px] font-bold">{e.contact}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">Role</dt>
          <dd className="mt-[3px] font-bold">{e.role ?? '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">Email</dt>
          <dd className="mt-[3px] font-bold break-words">{e.email ?? '—'}</dd>
        </div>
      </dl>
      {e.message && (
        <p className="mt-3 text-[13.5px]">
          <strong>What they asked:</strong> {e.message}
        </p>
      )}

      {e.stage !== 'applied' && (
        <>
          <h3 className="mt-5 mb-2 text-[12px] font-extrabold tracking-[0.06em] uppercase text-[#5B667A]">After the call</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => update({ stage: 'called', called: true }, 'Saved. Call them again later.')} className={btnSmall}>
              No answer, call again
            </button>
            <button type="button" disabled={pending} onClick={() => update({ stage: 'interested', called: true }, 'Marked interested.')} className={btnSmall}>
              Interested
            </button>
            <button type="button" disabled={pending} onClick={() => update({ stage: 'not_interested', called: true }, 'Marked not interested.')} className={`${btnSmall} !text-[#B42318]`}>
              Not interested
            </button>
          </div>
        </>
      )}
      <label className="block mt-3.5">
        <span className={label}>Call notes</span>
        <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} maxLength={2000} className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[13.5px] outline-none focus:border-[#2A4DD0]" />
      </label>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <button type="button" disabled={pending} onClick={() => update({}, 'Notes saved.')} className={btnOutline}>
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save notes
        </button>
        {msg && <span className={`text-[13px] font-bold ${msg.ok ? 'text-[#067647]' : 'text-[#B42318]'}`}>{msg.text}</span>}
      </div>

      {e.stage === 'applied' ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#ECFDF3] px-4 py-3.5 text-[13.5px] text-[#05603A]">
          <CircleCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            <strong className="block">Application submitted for approval</strong>
            It is in Hospitals › Applications. Once approved, the admin gets their staff ID and a link to set their password by email.{' '}
            <Link href="/executive/hospitals#applications" className="font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
              Open hospital applications
            </Link>
          </span>
        </div>
      ) : e.kind === 'hospital' ? (
        filing ? (
          <FileApplication e={e} onDone={() => router.refresh()} />
        ) : (
          <button type="button" onClick={() => setFiling(true)} className={`${btnPrimary} mt-5`}>
            Fill the application for them
          </button>
        )
      ) : (
        <p className="mt-5 text-[13px] text-[#5B667A]">Diagnostic centres apply with the form at /signup/diagnostic-centre; send them the link.</p>
      )}
    </section>
  )
}

function FileApplication({ e, onDone }: { e: Enquiry; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const docs = APPLICATION_DOCS.hospital

  const submit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const form = ev.currentTarget
    setError(null)
    const files = new Map<string, File>()
    form.querySelectorAll<HTMLInputElement>('input[type="file"][data-doc]').forEach((input) => {
      const file = input.files?.[0]
      if (file) files.set(input.dataset.doc!, file)
    })
    const data = new FormData(form)
    for (const key of files.keys()) data.delete(`file-${key}`)
    try {
      if (files.size) {
        setBusy('Uploading documents…')
        const startRes = await startDocumentUploads('hospital', [...files].map(([key, file]) => ({ key, name: file.name, size: file.size })))
        if (!startRes.ok) throw new Error(startRes.error)
        const storage = createClient().storage.from(DOC_BUCKET)
        for (const u of startRes.uploads) {
          const { error: upErr } = await storage.uploadToSignedUrl(u.path, u.token, files.get(u.key)!, { contentType: u.contentType })
          if (upErr) throw new Error('A document could not be uploaded. Check the connection and try again.')
        }
        data.set('uploadId', startRes.uploadId)
      }
      setBusy('Sending…')
      const res = await fileApplicationForEnquiry(e.id, data)
      if (!res.ok) throw new Error(res.error)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the application.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 pt-5 border-t border-[#EEF2F7]">
      <h3 className="text-[16px] font-extrabold">Fill the application for them</h3>
      <p className="mt-[3px] mb-4 text-[13px] text-[#5B667A]">Fill it in during the call. It goes to Hospitals › Applications for approval.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="lg:col-span-2">
          <span className={label}>Hospital name</span>
          <input name="organizationName" required defaultValue={e.name} className={field} />
        </label>
        <label>
          <span className={label}>Registration number</span>
          <input name="registrationNumber" required className={field} />
        </label>
        <label>
          <span className={label}>City</span>
          <input name="city" required defaultValue={e.city} className={field} />
        </label>
        <label>
          <span className={label}>Number of beds</span>
          <input name="beds" type="number" min={0} required defaultValue={e.beds ?? ''} className={field} />
        </label>
        <label className="sm:col-span-2 lg:col-span-3">
          <span className={label}>Full address</span>
          <input name="address" required minLength={5} className={field} />
        </label>
      </div>
      <fieldset className="mt-3.5">
        <legend className={label}>Specialities</legend>
        <div className="flex flex-wrap gap-2">
          {HOSPITAL_DEPARTMENTS.map((d) => (
            <label key={d} className="inline-flex items-center gap-2 h-9 px-3 rounded-[10px] bg-white shadow-[inset_0_0_0_1px_#D6DDE8] text-[13px] font-bold cursor-pointer has-[:checked]:bg-[#EEF3FF] has-[:checked]:text-[#2A4DD0] has-[:checked]:shadow-[inset_0_0_0_1.5px_#2A4DD0]">
              <input type="checkbox" name="departments" value={d} className="accent-[#2A4DD0]" />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
        <label>
          <span className={label}>Admin name</span>
          <input name="contactName" required defaultValue={e.contact} className={field} />
        </label>
        <label>
          <span className={label}>Admin phone</span>
          <input name="phone" required defaultValue={e.phone} className={field} />
        </label>
        <label>
          <span className={label}>Admin email</span>
          <input name="email" type="email" required defaultValue={e.email ?? ''} className={field} />
        </label>
        <label>
          <span className={label}>Bank account or UPI for payouts</span>
          <input name="payout" maxLength={120} className={field} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3.5">
        {docs.map((d) => (
          <label key={d.key} className="block rounded-xl px-3.5 py-3 shadow-[inset_0_0_0_1px_#D6DDE8]">
            <span className="block text-[13px] font-extrabold">
              {d.label}
              {d.required ? '' : ' (optional)'}
            </span>
            <span className="block mb-2 text-[11.5px] text-[#5B667A]">{d.hint}</span>
            <input type="file" name={`file-${d.key}`} data-doc={d.key} accept={acceptAttr(d.accept)} className="block w-full text-[12.5px]" />
          </label>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[#5B667A]">Without the documents, the hospital is asked to email them; the reviewer sees that on the application.</p>
      <label className="flex items-start gap-2.5 mt-3.5 text-[13.5px] font-bold">
        <input type="checkbox" name="agreed" required className="mt-1 accent-[#2A4DD0]" />
        The hospital agreed to the partner terms on the call
      </label>
      {error && <p className="mt-3 text-[13px] font-bold text-[#B42318]">{error}</p>}
      <button type="submit" disabled={!!busy} className={`${btnPrimary} mt-4`}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {busy ?? 'Submit application for approval'}
      </button>
    </form>
  )
}
