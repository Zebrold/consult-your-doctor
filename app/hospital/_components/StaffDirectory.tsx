'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { CalendarPlus, Download, Mail, Phone, Search } from 'lucide-react'
import { formatShortDate } from '@/components/patient/format'
import { AddDoctorButton, EditDoctorButton, type EditableDoctor } from './DoctorDialogs'
import { DeskHead, HosBody, HosHeader, Initials, PhoneStats, btnOutline, btnPrimary, card, lineTab, segGroup, segTab, telHref, type PhoneStat } from './hos-ui'
import { ROLE, type StaffRole } from '../_lib/roles'

export type { StaffRole }

export type StaffMember = {
  id: string
  name: string
  image: string | null
  staffId: string | null
  role: StaffRole
  department: string | null
  phone: string | null
  email: string | null
  joined: string | null
  /** Consultations this month (doctors) or bookings handled this month (front desk). */
  activity: string | null
  isYou: boolean
  doctor: EditableDoctor | null
}

const FILTERS: { key: 'all' | StaffRole; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'executive', label: 'Desk' },
  { key: 'hospital_admin', label: 'Admins' },
]

function exportCsv(rows: StaffMember[]) {
  const header = ['Name', 'Staff ID', 'Role', 'Department', 'Phone', 'Email', 'Joined']
  const lines = rows.map((s) => [s.name, s.staffId ?? '', ROLE[s.role].label, s.department ?? '', s.phone ?? '', s.email ?? '', s.joined ? s.joined.slice(0, 10) : ''])
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'hospital-staff.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const iconBtn = 'w-[34px] h-[34px] rounded-[10px] border border-[#D6DDE8] bg-white flex items-center justify-center text-[#27324A] hover:bg-[#F4F6FA] shrink-0'
const tableGrid = 'grid grid-cols-[minmax(0,1.5fr)_120px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_96px_150px] gap-3.5'

/**
 * Staff & access after the HosStaff export: everyone with a login at the hospital, by role, with what each role can
 * reach. Desktops get the same as a table.
 */
export function StaffDirectory({
  staff,
  departments,
  viewer,
  hospitalName,
  stats,
  deskStats,
  children,
}: {
  staff: StaffMember[]
  departments: string[]
  viewer: { name: string }
  hospitalName: string
  stats: PhoneStat[]
  /** The desktop stat cards. */
  deskStats: ReactNode
  /** The cards under the directory: doctors by department, what each role can access. */
  children: ReactNode
}) {
  const [role, setRole] = useState<'all' | StaffRole>('all')
  const [query, setQuery] = useState('')

  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, f.key === 'all' ? staff.length : staff.filter((s) => s.role === f.key).length])) as Record<'all' | StaffRole, number>
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return staff.filter((s) => (role === 'all' || s.role === role) && (!q || [s.name, s.staffId, s.department, s.phone, s.email].some((v) => v?.toLowerCase().includes(q))))
  }, [staff, role, query])

  const subtitle = `Everyone who signs in for ${hospitalName}, their role and what each role can see.`
  const empty = staff.length ? 'No staff match your search.' : 'No staff yet.'
  const roleLabel = (s: StaffMember) => `${s.role === 'hospital_admin' ? 'Admin' : ROLE[s.role].label}${s.isYou ? ' · You' : ''}`
  const accessLine = (s: StaffMember) => (s.activity ? `${s.activity} · ${ROLE[s.role].short}` : ROLE[s.role].scope)

  const actions = (s: StaffMember) => (
    <>
      {s.phone && (
        <a href={telHref(s.phone)} title={`Call ${s.name}`} aria-label={`Call ${s.name}`} className={iconBtn}>
          <Phone className="w-3.5 h-3.5" />
        </a>
      )}
      {s.email && (
        <a href={`mailto:${s.email}`} title={`Email ${s.name}`} aria-label={`Email ${s.name}`} className={iconBtn}>
          <Mail className="w-3.5 h-3.5" />
        </a>
      )}
      {s.doctor && (
        <>
          <EditDoctorButton doctor={s.doctor} departments={departments} iconOnly className={iconBtn} />
          <Link href={`/hospital/doctors/${s.doctor.id}/schedule`} title="Manage slots" aria-label={`Manage slots for ${s.name}`} className={iconBtn}>
            <CalendarPlus className="w-3.5 h-3.5" />
          </Link>
        </>
      )}
    </>
  )

  return (
    <>
      <HosHeader staff={viewer} title="Staff & access" subtitle={subtitle}>
        <label className="flex items-center gap-2.5 h-12 px-3.5 rounded-[14px] bg-white text-[#0B1B3F]">
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <span className="sr-only">Search staff</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID or department" className="flex-1 min-w-0 bg-transparent outline-none text-[14px] placeholder:text-[#7A8599]" />
        </label>
      </HosHeader>
      <HosBody>
        <DeskHead
          title="Staff & access"
          subtitle={subtitle}
          actions={
            <>
              <button type="button" onClick={() => exportCsv(shown)} disabled={!shown.length} className={`${btnOutline} disabled:opacity-50`}>
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <AddDoctorButton departments={departments} label="Add doctor" className={btnPrimary} />
            </>
          }
        />

        <PhoneStats stats={stats} />
        <div className="lg:hidden mt-3.5">
          <AddDoctorButton departments={departments} label="Add doctor" className={`${btnPrimary} w-full !h-[46px] !shadow-none`} />
        </div>
        {deskStats}

        {/* Phones */}
        <section className="lg:hidden mt-3.5">
          <div role="tablist" aria-label="Role" className="flex border-b border-[#E1E7F0]">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" role="tab" aria-selected={role === f.key} onClick={() => setRole(f.key)} className={lineTab(role === f.key)}>
                {f.label} {counts[f.key]}
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="mt-4 text-center text-[13px] text-[#5B667A]">{empty}</p>}
          {shown.map((s) => (
            <article key={s.id} className={`${card} mt-2.5 p-3.5`}>
              <div className="flex items-center gap-3">
                <Initials name={s.name} image={s.image} className="w-[42px] h-[42px] text-[13px]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-extrabold truncate">{s.name}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{[s.staffId ?? 'No staff ID', s.department].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-[12px] font-extrabold" style={{ color: ROLE[s.role].color }}>
                  {roleLabel(s)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-[#EEF2F7]">
                <p className="min-w-0 text-[12.5px] text-[#27324A]">{accessLine(s)}</p>
                <span className="flex items-center gap-1.5 shrink-0">{actions(s)}</span>
              </div>
            </article>
          ))}
        </section>

        {/* Desktops */}
        <section className={`hidden lg:block ${card} p-[22px] min-w-0`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">Staff directory</h2>
              <p className="mt-[3px] text-[13px] text-[#5B667A]">Everyone with a login at your hospital and what they can access</p>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-2 h-[42px] px-3 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] w-[240px]">
                <Search className="w-4 h-4 text-[#5B667A] shrink-0" />
                <span className="sr-only">Search staff</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, ID or department" className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] placeholder:text-[#7A8599]" />
              </label>
              <div role="tablist" aria-label="Role" className={segGroup}>
                {FILTERS.map((f) => (
                  <button key={f.key} type="button" role="tab" aria-selected={role === f.key} onClick={() => setRole(f.key)} className={segTab(role === f.key)}>
                    {f.label} <span className={role === f.key ? '' : 'text-[#8A94A6]'}>{counts[f.key]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div role="table" aria-label="Staff directory">
            <div role="row" className={`${tableGrid} px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]`}>
              {['Staff member', 'Role', 'Access', 'Department', 'Activity', 'Joined', 'Actions'].map((h) => (
                <span key={h} role="columnheader" className={h === 'Actions' ? 'text-right' : ''}>
                  {h}
                </span>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="py-5 text-center text-[13.5px] text-[#5B667A]">{empty}</p>
            ) : (
              shown.map((s) => (
                <div key={s.id} role="row" className={`${tableGrid} items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px]`}>
                  <span role="cell" className="flex items-center gap-2.5 min-w-0">
                    <Initials name={s.name} image={s.image} />
                    <span className="min-w-0">
                      <span className="block font-extrabold truncate">{s.name}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">{[s.staffId ? `#${s.staffId}` : 'No staff ID', s.phone].filter(Boolean).join(' · ')}</span>
                    </span>
                  </span>
                  <span role="cell" className="text-[12.5px] font-extrabold" style={{ color: ROLE[s.role].color }}>
                    {roleLabel(s)}
                  </span>
                  <span role="cell" className="text-[12.5px] text-[#5B667A]">
                    {ROLE[s.role].scope}
                  </span>
                  <span role="cell" className="text-[#27324A] truncate">
                    {s.department ?? '—'}
                  </span>
                  <span role="cell" className="text-[12.5px] text-[#5B667A]">
                    {s.activity ?? '—'}
                  </span>
                  <span role="cell" className="text-[12.5px] text-[#5B667A] whitespace-nowrap">
                    {s.joined ? formatShortDate(s.joined) : '—'}
                  </span>
                  <span role="cell" className="flex items-center justify-end gap-1.5">
                    {actions(s)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {children}
      </HosBody>
    </>
  )
}
