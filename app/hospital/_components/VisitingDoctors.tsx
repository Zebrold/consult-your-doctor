'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { endPractice, inviteVisitingDoctor } from '@/app/actions/practices'
import { PRACTICE_STATUS, type PracticeStatus } from '@/lib/practices'
import { Panel, PanelHead, btnPrimary, btnSmall } from './hos-ui'

export type VisitingLink = { id: string; doctorId: string; name: string; specialty: string | null; home: string | null; status: PracticeStatus }

/**
 * Visiting doctors: doctors from other hospitals who also consult here. Invite one by their staff ID; once they accept
 * and the Consult your Doctor team confirms, publish their slots here like your own doctors'.
 */
export function VisitingDoctors({ links, ready }: { links: VisitingLink[]; ready: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [staffId, setStaffId] = useState('')
  const [note, setNote] = useState('')
  const shown = links.filter((l) => l.status !== 'ended' && l.status !== 'declined' && l.status !== 'rejected')

  const invite = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      setMsg(null)
      const res = await inviteVisitingDoctor(staffId, note)
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      setMsg({ ok: true, text: 'Invitation sent. The doctor accepts it from their workspace; then our team confirms.' })
      setStaffId('')
      setNote('')
      router.refresh()
    })
  }

  const end = (id: string, name: string) => {
    if (!window.confirm(`Stop ${name} consulting here? Open slots you published for them are taken down; booked ones stay.`)) return
    start(async () => {
      setMsg(null)
      const res = await endPractice(id)
      if (!res.ok) setMsg({ ok: false, text: res.error })
      router.refresh()
    })
  }

  return (
    <Panel className="mt-3.5 lg:mt-5">
      <PanelHead title="Visiting doctors" sub="Doctors from other hospitals who also consult here" />
      {!ready ? (
        <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">Visiting doctors are being set up. Please check back soon.</p>
      ) : (
        <>
          {shown.length === 0 ? (
            <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">No visiting doctors yet.</p>
          ) : (
            <ul>
              {shown.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-3 border-t border-[#EEF2F7]">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-extrabold truncate">{l.name}</span>
                    <span className="block text-[12.5px] text-[#5B667A] truncate">{[l.specialty, l.home ? `from ${l.home}` : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="text-[12.5px] font-extrabold" style={{ color: PRACTICE_STATUS[l.status].color }}>
                    {PRACTICE_STATUS[l.status].label}
                  </span>
                  {l.status === 'confirmed' && (
                    <Link href={`/hospital/doctors/${l.doctorId}/schedule`} className={btnSmall}>
                      Slots
                    </Link>
                  )}
                  <button type="button" disabled={pending} onClick={() => end(l.id, l.name)} className="text-[12.5px] font-extrabold text-[#B42318] hover:underline underline-offset-4">
                    {l.status === 'confirmed' ? 'End' : 'Withdraw'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={invite} className="flex flex-wrap items-end gap-2.5 pt-3.5 mt-1 border-t border-[#EEF2F7]">
            <label className="min-w-[180px] flex-1">
              <span className="block mb-1 text-[12.5px] font-extrabold text-[#27324A]">Doctor’s staff ID</span>
              <input value={staffId} onChange={(e) => setStaffId(e.target.value)} required placeholder="e.g. CYDAR1234" className="w-full h-[42px] px-3.5 rounded-[11px] border border-[#D6DDE8] bg-white text-[14px] uppercase outline-none focus:border-[#2A4DD0]" />
            </label>
            <label className="min-w-[220px] flex-[2]">
              <span className="block mb-1 text-[12.5px] font-extrabold text-[#27324A]">Note for the doctor (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Days you’d like them, the department…" className="w-full h-[42px] px-3.5 rounded-[11px] border border-[#D6DDE8] bg-white text-[14px] outline-none focus:border-[#2A4DD0]" />
            </label>
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Invite
            </button>
          </form>
          {msg && <p className={`mt-2.5 text-[13px] font-bold ${msg.ok ? 'text-[#067647]' : 'text-[#B42318]'}`}>{msg.text}</p>}
        </>
      )}
    </Panel>
  )
}
