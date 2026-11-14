'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { createExecutiveLogin, resendExecutiveInvite, setMemberRemoved, setMemberTeam, setTeamAccess } from '@/app/actions/executive-staff'
import { PAGES, TEAMS, TEAM_LABEL, type PageKey, type Team } from '../_lib/access'
import { Table, btnPrimary, btnSmall, segGroup, segTab, td, th } from './ui'

const field = 'w-full min-w-0 h-[42px] px-3.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[14px] outline-none focus:border-[#2A4DD0] focus:shadow-[0_0_0_3px_rgba(42,77,208,0.12)]'
const label = 'block mb-1.5 text-[12.5px] font-extrabold text-[#27324A]'

type Grid = Record<Exclude<Team, 'management'>, PageKey[]>

/** "Page access by team": tick a box to let a team open a page. Management always opens everything. */
export function AccessMatrix({ grid, canEdit }: { grid: Grid; canEdit: boolean }) {
  const router = useRouter()
  const [state, setState] = useState(grid)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()
  const teams = TEAMS.filter((t) => t.id !== 'management') as { id: Exclude<Team, 'management'>; label: string }[]

  const toggle = (team: Exclude<Team, 'management'>, page: PageKey) => {
    const on = !state[team].includes(page)
    const key = `${team}:${page}`
    setBusy(key)
    setError(null)
    setState((s) => ({ ...s, [team]: on ? [...s[team], page] : s[team].filter((p) => p !== page) }))
    start(async () => {
      const res = await setTeamAccess(team, page, on)
      setBusy(null)
      if (!res.ok) {
        setError(res.error)
        setState((s) => ({ ...s, [team]: on ? s[team].filter((p) => p !== page) : [...s[team], page] }))
      } else router.refresh()
    })
  }

  const box = (on: boolean, disabled: boolean, onClick?: () => void, name?: string) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={name}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex w-[22px] h-[22px] rounded-md items-center justify-center ${on ? 'bg-[#2A4DD0] text-white' : 'bg-white shadow-[inset_0_0_0_1.5px_#C3CCDA]'} ${disabled ? 'opacity-60 cursor-default' : 'hover:shadow-[inset_0_0_0_1.5px_#2A4DD0]'}`}
    >
      {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </button>
  )

  return (
    <div>
      <Table min={560}>
        <thead>
          <tr>
            <th className={th}>Page</th>
            <th className={`${th} text-center`}>Management {PAGES.length}</th>
            {teams.map((t) => (
              <th key={t.id} className={`${th} text-center`}>
                {t.label} {state[t.id].length}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAGES.map((p) => (
            <tr key={p.key}>
              <td className={`${td} font-bold`}>{p.label}</td>
              <td className={`${td} text-center`}>{box(true, true, undefined, `Management: ${p.label}`)}</td>
              {teams.map((t) => (
                <td key={t.id} className={`${td} text-center`}>
                  {busy === `${t.id}:${p.key}` ? <Loader2 className="inline w-4 h-4 animate-spin text-[#2A4DD0]" /> : box(state[t.id].includes(p.key), !canEdit, () => toggle(t.id, p.key), `${t.label}: ${p.label}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      {error && <p className="mt-3 text-[13px] font-bold text-[#B42318]">{error}</p>}
    </div>
  )
}

/** "Preview a team's sidebar": what each team sees. */
export function SidebarPreview({ grid }: { grid: Grid }) {
  const [team, setTeam] = useState<Team>('operations')
  const pages = team === 'management' ? PAGES.map((p) => p.key) : grid[team]
  return (
    <div>
      <div className="mb-3 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Team" className={segGroup}>
          {TEAMS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={team === t.id} onClick={() => setTeam(t.id)} className={segTab(team === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[14px] bg-[#2A4DD0] p-3 text-white">
        <span className="block px-2 pb-1.5 text-[10.5px] font-extrabold tracking-[0.1em] text-[#AFC2FF]">{TEAM_LABEL[team].toUpperCase()} SIDEBAR</span>
        <span className="block px-2 py-1.5 text-[13px] font-bold">Command</span>
        {PAGES.filter((p) => pages.includes(p.key)).map((p) => (
          <span key={p.key} className="block px-2 py-1.5 text-[13px] font-bold text-[#E3EAFF]">
            {p.label}
          </span>
        ))}
        {team === 'management' && <span className="block px-2 py-1.5 text-[13px] font-bold text-[#E3EAFF]">Staff &amp; access</span>}
      </div>
    </div>
  )
}

/** "Create a staff login": the employee ID and temporary password are made on the server; they set their own password. */
export function CreateLoginForm() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [team, setTeam] = useState<Team>('operations')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ staffId: string; emailed: boolean; name: string } | null>(null)

  if (done) {
    return (
      <div className="rounded-xl bg-[#ECFDF3] px-4 py-3.5 text-[13.5px] text-[#05603A]">
        <strong className="block">Login created for {done.name}</strong>
        Employee ID <span className="font-mono font-bold">{done.staffId}</span>.{' '}
        {done.emailed ? 'We emailed them a link to set their own password.' : 'The email could not be sent; use “Send a new link” in Members once mail is working.'}
        <button type="button" onClick={() => setDone(null)} className="block mt-2 font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
          Create another login
        </button>
      </div>
    )
  }

  return (
    <form
      action={(form) =>
        start(async () => {
          setError(null)
          const name = String(form.get('fullName') ?? '')
          const res = await createExecutiveLogin({ fullName: name, email: String(form.get('email') ?? ''), team })
          if (!res.ok) return setError(res.error)
          setDone({ staffId: res.staffId, emailed: res.emailed, name })
          router.refresh()
        })
      }
      className="flex flex-col gap-3"
    >
      <label>
        <span className={label}>Full name</span>
        <input name="fullName" required minLength={2} maxLength={120} className={field} />
      </label>
      <label>
        <span className={label}>Work email</span>
        <input name="email" type="email" required className={field} />
      </label>
      <fieldset>
        <legend className={label}>Team</legend>
        <div className="grid grid-cols-2 gap-2">
          {TEAMS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={team === t.id}
              onClick={() => setTeam(t.id)}
              className={`h-10 rounded-[10px] text-[13px] font-extrabold ${team === t.id ? 'bg-[#EEF3FF] text-[#2A4DD0] shadow-[inset_0_0_0_1.5px_#2A4DD0]' : 'bg-white text-[#27324A] shadow-[inset_0_0_0_1px_#D6DDE8]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="block mt-1.5 text-[12px] text-[#5B667A]">They will see only the pages ticked for {TEAM_LABEL[team]}.</span>
      </fieldset>
      <p className="rounded-xl bg-[#F7F9FC] px-3.5 py-2.5 text-[12.5px] text-[#27324A] shadow-[inset_0_0_0_1px_#E6EAF0]">
        The employee ID and a temporary password are created automatically. We email them a link to set their own password at first sign-in; passwords are never sent by email.
      </p>
      {error && <p className="text-[13px] font-bold text-[#B42318]">{error}</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Create login and send email
      </button>
    </form>
  )
}

/** A member's team picker and Remove / Restore / Send a new link, for Management. */
export function MemberActions({ id, team, removed, invited, isMe }: { id: string; team: Team; removed: boolean; invited: boolean; isMe: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      setNote(null)
      const res = await fn()
      if (!res.ok) setNote({ ok: false, text: res.error ?? 'Something went wrong.' })
      else {
        setNote({ ok: true, text: ok })
        router.refresh()
      }
    })

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <select
          aria-label="Team"
          defaultValue={team}
          disabled={pending || removed}
          onChange={(e) => run(() => setMemberTeam(id, e.target.value), 'Team changed.')}
          className="h-[34px] px-2 rounded-[10px] border border-[#D6DDE8] bg-white text-[12.5px] font-bold outline-none focus:border-[#2A4DD0]"
        >
          {TEAMS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {invited && !removed && (
          <button type="button" disabled={pending} onClick={() => run(() => resendExecutiveInvite(id), 'New link sent.')} className={btnSmall}>
            Send a new link
          </button>
        )}
        {!isMe && (
          <button type="button" disabled={pending} onClick={() => run(() => setMemberRemoved(id, !removed), removed ? 'Restored.' : 'Removed.')} className={`${btnSmall} ${removed ? '' : '!text-[#B42318]'}`}>
            {removed ? 'Restore' : 'Remove'}
          </button>
        )}
      </div>
      {note && <span className={`text-[12px] font-bold ${note.ok ? 'text-[#067647]' : 'text-[#B42318]'}`}>{note.text}</span>}
    </div>
  )
}
