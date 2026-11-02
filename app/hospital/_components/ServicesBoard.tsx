'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LoaderCircle, Plus, Search, X } from 'lucide-react'
import { removeHospitalService, saveHospitalService, setHospitalServiceShown } from '@/app/actions/hospital-profile'
import { formatINR } from '@/components/patient/format'
import { SERVICE_TYPES, type HospitalService } from '@/lib/hospital-services'
import { HosBody, HosHeader, card, segGroup, segTab } from './hos-ui'

// Services & charges, after the user's desktop and phone designs: the tests, scans and procedures patients can add when
// they book a doctor, each with its price (paid at the hospital), department, type and whether patients see it.

const ALL = 'all'
const FOOTNOTE = 'Patients pick these when they book a doctor and pay for them at the hospital. Only the booking fee (with its payment convenience fee) is paid online.'

type Props = {
  hospitalName: string
  staff: { name: string }
  services: HospitalService[]
  /** False until 20261103_hospital_services.sql runs: only names and prices can be saved then. */
  detailsReady: boolean
}

export function ServicesBoard({ hospitalName, staff, services, detailsReady }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState(ALL)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<HospitalService | 'new' | null>(null)
  // Switches flipped here before the server answers, by service name.
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  const list = services.map((s) => (s.name in flipped ? { ...s, shown: flipped[s.name] } : s))
  const departments = useMemo(() => Array.from(new Set(services.map((s) => s.department).filter((d): d is string => !!d))), [services])
  const shownCount = list.filter((s) => s.shown && s.price != null).length
  const pricedDepartments = new Set(services.filter((s) => s.price != null).map((s) => s.department).filter(Boolean)).size
  const q = query.trim().toLowerCase()
  const visible = list.filter(
    (s) => (tab === ALL || s.department === tab) && (!q || [s.name, s.description, s.department, s.type].some((v) => v?.toLowerCase().includes(q))),
  )

  const toggle = (s: HospitalService) => {
    if (!detailsReady) return setError('Showing and hiding services needs the latest database update (supabase/migrations/20261103_hospital_services.sql).')
    const shown = !s.shown
    setError(null)
    setFlipped((f) => ({ ...f, [s.name]: shown }))
    start(async () => {
      const res = await setHospitalServiceShown(s.name, shown)
      if (res.success) {
        router.refresh()
        return
      }
      // Not saved: put the switch back.
      setError(res.error)
      setFlipped((f) => {
        const next = { ...f }
        delete next[s.name]
        return next
      })
    })
  }

  const tabs = [{ key: ALL, label: `All ${services.length}` }, ...departments.map((d) => ({ key: d, label: d }))]
  const addButton = (className: string) => (
    <button type="button" onClick={() => setEditing('new')} className={className}>
      <Plus className="w-[18px] h-[18px]" strokeWidth={2.6} /> Add service
    </button>
  )

  return (
    <>
      <HosHeader staff={staff} title="Services & charges" subtitle="Tests, scans and procedures patients can add when they book a doctor.">
        <label className="flex items-center gap-2.5 h-[46px] px-3.5 rounded-[14px] bg-white text-[#0B1B3F]">
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <span className="sr-only">Search services</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-[#7A8599] [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </HosHeader>

      <HosBody>
        {/* Desktops: back to the settings, the title and Add service */}
        <div className="hidden lg:block mb-[22px]">
          <Link href="/hospital/more" className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Account &amp; settings
          </Link>
          <div className="mt-3 flex items-end justify-between gap-5">
            <div className="min-w-0">
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight">Services &amp; charges</h1>
              <p className="mt-1 text-[14px] text-[#5B667A]">Tests, scans and procedures at {hospitalName}, with the price patients pay at the hospital</p>
            </div>
            {addButton('shrink-0 inline-flex items-center gap-2 h-[44px] px-[18px] rounded-xl bg-[#2A4DD0] hover:bg-[#2443B8] text-white text-[14.5px] font-extrabold shadow-[0_8px_16px_rgba(42,77,208,0.28)] transition-colors')}
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-3 gap-5 mb-5">
          <Stat label="Services" value={services.length} note="tests, scans and procedures" />
          <Stat label="Shown to patients" value={shownCount} note="bookable with a doctor" />
          <Stat label="Departments" value={pricedDepartments} note="with priced services" />
        </div>

        {/* Phones */}
        {/* The labels wrap here, as in the design, instead of being cut short */}
        <section className="lg:hidden mb-3.5 grid grid-cols-3 rounded-[18px] bg-white shadow-[0_0_0_1px_#E6EBF3] overflow-hidden">
          {[
            { label: 'Services', value: services.length },
            { label: 'Shown to patients', value: shownCount },
            { label: 'Departments', value: pricedDepartments },
          ].map((st, i) => (
            <div key={st.label} className={`min-w-0 px-3.5 py-3.5 ${i ? 'border-l border-[#EEF2F7]' : ''}`}>
              <span className="block text-[11.5px] leading-[1.3] font-bold text-[#5B667A]">{st.label}</span>
              <span className="block mt-1 text-[21px] font-extrabold tracking-[-0.02em] tabular-nums">{st.value}</span>
            </div>
          ))}
        </section>
        {addButton('lg:hidden w-full mb-3.5 inline-flex items-center justify-center gap-2 h-[48px] rounded-[14px] bg-[#2A4DD0] active:bg-[#2443B8] text-white text-[15px] font-extrabold shadow-[0_8px_16px_rgba(42,77,208,0.25)]')}
        {tabs.length > 1 && (
          <div className="lg:hidden -mx-4 px-4 mb-3.5 flex gap-2 overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 h-[38px] px-4 rounded-full text-[13.5px] font-extrabold whitespace-nowrap transition-colors ${
                  tab === t.key ? 'bg-[#2A4DD0] text-white' : 'bg-white text-[#27324A] shadow-[inset_0_0_0_1px_#DDE3EC]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mb-3.5 rounded-xl bg-[#FEF3F2] px-4 py-3 text-[13px] font-bold text-[#B42318]">
            {error}
          </p>
        )}

        {/* Desktops: the table */}
        <section aria-label="Services" className={`hidden lg:block ${card} p-[22px]`}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-[17px] font-extrabold">
              {visible.length} {visible.length === 1 ? 'service' : 'services'}
            </h2>
            {tabs.length > 1 && (
              <div className={`${segGroup} max-w-full overflow-x-auto no-scrollbar`}>
                {tabs.map((t) => (
                  <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)} className={segTab(tab === t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {visible.length === 0 ? (
            <Empty searching={!!q || tab !== ALL} />
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11.5px] font-extrabold tracking-[0.06em] text-[#5B667A] uppercase">
                  <th scope="col" className="py-3 pl-3.5 rounded-l-xl bg-[#F4F6FA]">Service</th>
                  <th scope="col" className="py-3 bg-[#F4F6FA]">Department</th>
                  <th scope="col" className="py-3 bg-[#F4F6FA]">Type</th>
                  <th scope="col" className="py-3 bg-[#F4F6FA]">Price</th>
                  <th scope="col" className="py-3 bg-[#F4F6FA]">On hospital page</th>
                  <th scope="col" className="py-3 pr-3.5 rounded-r-xl bg-[#F4F6FA]">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.name} className="border-b last:border-b-0 border-[#EEF2F7] text-[14px]">
                    <td className="py-3.5 pl-3.5 pr-4">
                      <span className="block font-extrabold">{s.name}</span>
                      {s.description && <span className="block text-[12.5px] text-[#5B667A]">{s.description}</span>}
                    </td>
                    <td className="py-3.5 pr-4 text-[#27324A]">{s.department ?? <Dash />}</td>
                    <td className="py-3.5 pr-4 text-[#5B667A]">{s.type ?? <Dash />}</td>
                    <td className="py-3.5 pr-4 font-extrabold tabular-nums whitespace-nowrap">{s.price != null ? formatINR(s.price) : <span className="text-[#B42318] text-[13px]">Add a price</span>}</td>
                    <td className="py-3.5 pr-4">
                      <ShownSwitch service={s} onToggle={() => toggle(s)} />
                    </td>
                    <td className="py-3.5 pr-3.5 text-right">
                      <button type="button" onClick={() => setEditing(s)} className="text-[14px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Phones: a card per service */}
        <section aria-label="Services" className="lg:hidden flex flex-col gap-3">
          {visible.length === 0 ? (
            <div className={`${card} px-4`}>
              <Empty searching={!!q || tab !== ALL} />
            </div>
          ) : (
            visible.map((s) => (
              <article key={s.name} className={`${card} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-extrabold">{s.name}</span>
                    {(s.description || s.department) && <span className="block mt-0.5 text-[13px] text-[#5B667A]">{[s.description, s.department].filter(Boolean).join(' · ')}</span>}
                  </span>
                  <span className="shrink-0 text-[15.5px] font-extrabold tabular-nums">{s.price != null ? formatINR(s.price) : <span className="text-[13px] text-[#B42318]">No price</span>}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#EEF2F7] flex items-center justify-between gap-3">
                  <ShownSwitch service={s} onToggle={() => toggle(s)} />
                  <button type="button" onClick={() => setEditing(s)} className="text-[14px] font-extrabold text-[#2A4DD0] px-1 py-1">
                    Edit
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <p className="mt-3.5 mx-1 text-[13px] leading-normal text-[#5B667A]">{FOOTNOTE}</p>
      </HosBody>

      {editing && (
        <ServiceDialog
          service={editing === 'new' ? null : editing}
          departments={departments}
          detailsReady={detailsReady}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setError(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className={`${card} px-5 py-[18px]`}>
      <span className="block text-[13px] font-bold text-[#5B667A]">{label}</span>
      <span className="block mt-2 text-[28px] font-extrabold tracking-[-0.03em] leading-[1.1] tabular-nums">{value}</span>
      <span className="block mt-1.5 text-[12.5px] font-bold text-[#5B667A]">{note}</span>
    </div>
  )
}

const Dash = () => <span className="text-[#98A2B3]">—</span>

function Empty({ searching }: { searching: boolean }) {
  return (
    <p className="py-6 text-center text-[13.5px] text-[#5B667A]">
      {searching ? 'No services match.' : 'No services yet. Add the tests, scans and procedures patients can book with a doctor.'}
    </p>
  )
}

/** The blue switch and its label: whether patients see the service on the hospital page and when booking. */
function ShownSwitch({ service, onToggle }: { service: HospitalService; onToggle: () => void }) {
  const on = service.shown
  return (
    <span className="inline-flex items-center gap-2.5">
      <Switch on={on} onClick={onToggle} label={`Show ${service.name} to patients`} />
      <span className={`text-[13.5px] font-extrabold whitespace-nowrap ${on ? 'text-[#067647]' : 'text-[#5B667A]'}`}>{on ? 'Shown to patients' : 'Hidden'}</span>
    </span>
  )
}

function Switch({ on, onClick, label, disabled = false }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative shrink-0 w-[42px] h-[25px] rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-[#2A4DD0]' : 'bg-[#C9D3E6]'}`}
    >
      <span aria-hidden className={`absolute top-[3px] left-[3px] w-[19px] h-[19px] rounded-full bg-white shadow-[0_1px_3px_rgba(11,27,63,0.3)] transition-transform ${on ? 'translate-x-[17px]' : ''}`} />
    </button>
  )
}

const field = 'w-full h-[46px] px-3.5 rounded-xl bg-white text-[15px] text-[#0B1B3F] shadow-[inset_0_0_0_1px_#D6DDE8] focus:shadow-[inset_0_0_0_1.5px_#2A4DD0] outline-none placeholder:text-[#8A94A6] disabled:bg-[#F4F6FA] disabled:text-[#8A94A6]'
const fieldLabel = 'block mb-1.5 text-[12.5px] font-extrabold text-[#27324A]'

/** Add a service, or edit or remove one. A sheet from the bottom on phones, a dialog on desktops. */
function ServiceDialog({ service, departments, detailsReady, onClose, onSaved }: {
  service: HospitalService | null
  departments: string[]
  detailsReady: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [shown, setShown] = useState(service?.shown ?? true)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [pending, start] = useTransition()

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError(null)
    start(async () => {
      const res = await saveHospitalService({
        originalName: service?.name ?? null,
        name: String(form.get('name') || ''),
        price: Number(form.get('price')),
        description: String(form.get('description') || ''),
        department: String(form.get('department') || ''),
        type: String(form.get('type') || ''),
        shown,
      })
      if (res.success) onSaved()
      else setError(res.error)
    })
  }

  const remove = () => {
    if (!service) return
    if (!confirmRemove) return setConfirmRemove(true)
    setError(null)
    start(async () => {
      const res = await removeHospitalService(service.name)
      if (res.success) onSaved()
      else setError(res.error)
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end lg:items-center justify-center bg-[#0B1B3F]/45 font-(family-name:--font-manrope)" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[540px] max-h-[92dvh] overflow-y-auto rounded-t-[24px] lg:rounded-2xl bg-white text-[#0B1B3F] px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] lg:p-6 shadow-[0_24px_60px_rgba(11,27,63,0.3)]"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="service-dialog-title" className="text-[19px] font-extrabold tracking-[-0.01em]">{service ? 'Edit service' : 'Add a service'}</h2>
            <p className="mt-0.5 text-[13px] text-[#5B667A]">Patients pay this price at the hospital, never online.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center hover:bg-[#F4F6FA]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="service-name" className={fieldLabel}>Service name</label>
            <input id="service-name" name="name" required minLength={2} maxLength={120} defaultValue={service?.name ?? ''} placeholder="e.g. ECG" className={field} autoFocus={!service} />
          </div>
          <div>
            <label htmlFor="service-description" className={fieldLabel}>Description <span className="font-bold text-[#8A94A6]">(optional)</span></label>
            <input id="service-description" name="description" maxLength={160} defaultValue={service?.description ?? ''} placeholder="e.g. Heart rhythm check" disabled={!detailsReady} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="service-department" className={fieldLabel}>Department</label>
              <input id="service-department" name="department" list="service-departments" maxLength={60} defaultValue={service?.department ?? ''} placeholder="e.g. Cardiology" disabled={!detailsReady} className={field} />
              <datalist id="service-departments">
                {departments.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="service-type" className={fieldLabel}>Type</label>
              <select id="service-type" name="type" defaultValue={service?.type ?? ''} disabled={!detailsReady} className={`${field} appearance-none`}>
                <option value="">Choose</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="service-price" className={fieldLabel}>Price at the hospital (₹)</label>
            <input id="service-price" name="price" type="number" inputMode="numeric" min={1} max={1000000} step={1} required defaultValue={service?.price ?? ''} placeholder="e.g. 300" className={field} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8FC] px-3.5 py-3">
            <span className="min-w-0">
              <span className="block text-[14px] font-extrabold">Shown to patients</span>
              <span className="block text-[12.5px] text-[#5B667A]">On your hospital page, and offered when booking a doctor</span>
            </span>
            <Switch on={shown} onClick={() => setShown((v) => !v)} label="Shown to patients" disabled={!detailsReady} />
          </div>
          {!detailsReady && (
            <p className="text-[12.5px] text-[#B54708]">
              The description, department, type and hiding open up after the database update (supabase/migrations/20261103_hospital_services.sql). Names and prices save now.
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-[#FEF3F2] px-3.5 py-2.5 text-[13px] font-bold text-[#B42318]">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse lg:flex-row lg:items-center gap-2.5 mt-1">
            {service && (
              <button type="button" onClick={remove} disabled={pending} className="lg:mr-auto h-[46px] px-4 rounded-xl text-[14px] font-extrabold text-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-60">
                {confirmRemove ? 'Tap again to remove' : 'Remove service'}
              </button>
            )}
            <button type="button" onClick={onClose} className="h-[46px] px-5 rounded-xl text-[14px] font-extrabold text-[#27324A] shadow-[inset_0_0_0_1px_#D6DDE8] hover:bg-[#F4F6FA]">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="h-[46px] px-6 rounded-xl bg-[#2A4DD0] hover:bg-[#2443B8] text-white text-[14.5px] font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-70">
              {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
              {service ? 'Save changes' : 'Add service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
