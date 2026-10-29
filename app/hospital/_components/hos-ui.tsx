import type { ComponentProps } from 'react'
import { WorkHeader } from '@/components/portal/workspace-ui'

// The hospital workspace's pieces, after the Hos*/DeskHos* design exports: the shared staff workspace kit
// (components/portal/workspace-ui.tsx), the phone header branded for the hospital, and the phone's grid of numbers.

export * from '@/components/portal/workspace-ui'
export { WorkBody as HosBody, WorkBackHeader as HosBackHeader } from '@/components/portal/workspace-ui'

/** The phone's blue header for hospital pages: the admin's initials open More (account and the other sections). */
export function HosHeader({ staff, ...props }: Omit<ComponentProps<typeof WorkHeader>, 'brand'> & { staff: { name: string } }) {
  return <WorkHeader brand={{ home: '/hospital/dashboard', workspace: 'Hospital workspace', account: { href: '/hospital/more', label: 'Account and more', name: staff.name, image: null } }} {...props} />
}

export type PhoneStat = { label: string; value: string | number; note?: string; color?: string }

/** The phone's card of numbers: two (or `cols`) to a row, hairlines between them. Desktops show StatCards instead. */
export function PhoneStats({ stats, cols = 2, className = '' }: { stats: PhoneStat[]; cols?: 2 | 3 | 4; className?: string }) {
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[cols]
  return (
    <section className={`lg:hidden rounded-[18px] bg-white shadow-[0_0_0_1px_#E6EBF3] overflow-hidden ${className}`}>
      <div className={`grid ${grid}`}>
        {stats.map((s) => (
          <div key={s.label} className={`min-w-0 ${cols === 4 ? 'px-3' : 'px-4'} py-3.5 shadow-[inset_-1px_-1px_0_#EEF2F7]`}>
            <span className="block text-[11.5px] font-bold text-[#5B667A] truncate">{s.label}</span>
            <span className="block mt-1 text-[21px] font-extrabold tracking-[-0.02em] tabular-nums truncate">{s.value}</span>
            {s.note && (
              <span className="block text-[12px] font-bold truncate" style={{ color: s.color ?? '#5B667A' }}>
                {s.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/** "3 doctors", "1 doctor" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** A phone number as a tel: link target. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
