'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, Download, Mail, Phone, Search, Users } from 'lucide-react'
import { Avatar, Chip, EmptyState } from '@/components/portal/ui'
import { formatShortDate } from '@/components/patient/format'
import { EditDoctorButton, type EditableDoctor } from './DoctorDialogs'
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
  { key: 'all', label: 'All staff' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'executive', label: 'Front desk' },
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

export function StaffDirectory({ staff, departments }: { staff: StaffMember[]; departments: string[] }) {
  const [role, setRole] = useState<'all' | StaffRole>('all')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return staff.filter(
      (s) => (role === 'all' || s.role === role) && (!q || [s.name, s.staffId, s.department, s.phone, s.email].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [staff, role, query])

  const actions = (s: StaffMember) => (
    <>
      {s.doctor && <EditDoctorButton doctor={s.doctor} departments={departments} iconOnly className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-high" />}
      {s.role === 'doctor' && s.doctor && (
        <Link href={`/hospital/doctors/${s.doctor.id}/schedule`} title="Manage slots" aria-label={`Manage slots for ${s.name}`} className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container-high">
          <CalendarPlus className="w-4 h-4" />
        </Link>
      )}
      {s.phone && (
        <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} title={`Call ${s.name}`} aria-label={`Call ${s.name}`} className="w-8 h-8 rounded-full flex items-center justify-center text-vibrant-blue hover:bg-surface-container-high">
          <Phone className="w-4 h-4" />
        </a>
      )}
      {s.email && (
        <a href={`mailto:${s.email}`} title={`Email ${s.name}`} aria-label={`Email ${s.name}`} className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container-high">
          <Mail className="w-4 h-4" />
        </a>
      )}
    </>
  )

  return (
    <section className="bg-surface-container-lowest rounded-2xl md:rounded-xl shadow-sm border border-surface-container md:border-transparent overflow-hidden">
      <div className="p-4 md:p-stack-md flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-title-md text-[16px] md:text-title-md font-bold text-indigo-gray-900">Staff Directory</h2>
          <p className="text-[12px] text-indigo-gray-600">Everyone with a login at your hospital and what they can access</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="relative sm:w-64">
            <Search className="w-4 h-4 text-indigo-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, ID, department…"
              aria-label="Search staff"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-surface-container-low text-[13px] text-indigo-gray-900 placeholder:text-indigo-gray-600 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
            />
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {FILTERS.map((f) => {
              const count = f.key === 'all' ? staff.length : staff.filter((s) => s.role === f.key).length
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={role === f.key}
                  onClick={() => setRole(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${role === f.key ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-indigo-gray-600 hover:text-indigo-gray-900'}`}
                >
                  {f.label} {count}
                </button>
              )
            })}
            <button type="button" onClick={() => exportCsv(shown)} className="px-3 py-1.5 rounded-full text-vibrant-blue text-[12px] font-bold flex items-center gap-1 hover:bg-surface-container-low whitespace-nowrap">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="px-4 pb-4 md:px-stack-md md:pb-stack-md">
          <EmptyState icon={Users}>No staff match your search.</EmptyState>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-5">Staff member</th>
                  <th className="py-3 px-4">Role &amp; access</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {shown.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/50">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} image={s.image} className="w-10 h-10 text-sm" />
                        <div className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-title-md text-[15px] font-bold text-indigo-gray-900">{s.name}</span>
                            {s.isYou && <Chip tone="teal">You</Chip>}
                          </span>
                          <span className="block text-[12px] text-indigo-gray-600">
                            {s.staffId ? <span className="font-semibold text-primary">#{s.staffId}</span> : 'No staff ID'}
                            {s.phone ? ` • ${s.phone}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Chip tone={ROLE[s.role].tone}>{ROLE[s.role].label}</Chip>
                      <span className="block text-[12px] text-indigo-gray-600 mt-1 max-w-[240px]">{ROLE[s.role].access}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-indigo-gray-900">{s.department ?? '—'}</td>
                    <td className="py-3.5 px-4 text-[13px] text-indigo-gray-600">{s.activity ?? '—'}</td>
                    <td className="py-3.5 px-4 text-[13px] text-indigo-gray-600 whitespace-nowrap">{s.joined ? formatShortDate(s.joined) : '—'}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-end gap-1">{actions(s)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden flex flex-col gap-3 px-4 pb-4">
            {shown.map((s) => (
              <li key={s.id} className="p-3.5 rounded-xl bg-surface-container-low/70 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={s.name} image={s.image} className="w-11 h-11 text-sm" />
                    <div className="min-w-0">
                      <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{s.name}</span>
                      <span className="block text-[12px] text-indigo-gray-600 truncate">
                        {s.staffId ? `#${s.staffId}` : 'No staff ID'}
                        {s.department ? ` • ${s.department}` : ''}
                      </span>
                    </div>
                  </div>
                  <Chip tone={ROLE[s.role].tone}>{s.isYou ? 'You' : ROLE[s.role].label}</Chip>
                </div>
                <div className="px-3 py-2 rounded-lg bg-surface-container-lowest flex items-center justify-between gap-2">
                  <span className="text-[12px] text-indigo-gray-600 truncate">{s.activity ?? ROLE[s.role].access}</span>
                  <span className="flex items-center gap-0.5 shrink-0">{actions(s)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
