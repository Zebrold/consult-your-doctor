import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AccountCard, AccountPage } from '@/components/patient/AccountPage'
import { one } from '@/components/patient/data'
import { doctorName, formatINR, formatShortDate } from '@/components/patient/format'

export const metadata: Metadata = { title: 'Payments & billing | Consult Your Doctor' }

type Rel<T> = T | T[] | null
type PaymentRow = { appointment_id: string | null; diagnostic_booking_id: string | null; amount: number | string | null; gateway: string | null; created_at: string | null }

/** What the patient has paid: booking fees online, and bookings settled at a hospital or lab desk. */
export default async function BillingPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login/patient?next=/patient/insurance')

  const [{ data: profile }, { data: visits }, { data: labs }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    supabase.from('appointments').select('id, status, doctors ( profiles!doctors_profile_id_fkey ( full_name ) )').eq('patient_id', user.id),
    supabase.from('diagnostic_bookings').select('id, status, test_name').eq('patient_id', user.id),
  ])
  type Visit = { id: string; status: string; doctors: Rel<{ profiles: Rel<{ full_name: string | null }> }> }
  type Lab = { id: string; status: string; test_name: string | null }
  const visitRows = (visits ?? []) as Visit[]
  const labRows = (labs ?? []) as Lab[]

  // Payments are read with the service role, limited to this patient's own bookings.
  const admin = createAdminClient()
  const [a, b] = await Promise.all([
    visitRows.length ? admin.from('payments').select('appointment_id, diagnostic_booking_id, amount, gateway, created_at').in('appointment_id', visitRows.map((v) => v.id)).eq('status', 'success') : Promise.resolve({ data: [] }),
    labRows.length ? admin.from('payments').select('appointment_id, diagnostic_booking_id, amount, gateway, created_at').in('diagnostic_booking_id', labRows.map((l) => l.id)).eq('status', 'success') : Promise.resolve({ data: [] }),
  ])
  const payments = [...((a.data ?? []) as PaymentRow[]), ...((b.data ?? []) as PaymentRow[])].sort((x, y) => (y.created_at ?? '').localeCompare(x.created_at ?? ''))
  const online = payments.filter((p) => p.gateway === 'payu')
  const total = online.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const unpaid = [
    ...visitRows.filter((v) => v.status === 'pending_payment').map((v) => ({ id: v.id, label: `Consultation · ${doctorName(one(one(v.doctors)?.profiles)?.full_name)}`, href: `/patient/checkout/${v.id}` })),
    ...labRows.filter((l) => l.status === 'pending_payment').map((l) => ({ id: l.id, label: `Lab test · ${(l.test_name || 'Tests').replace(/-/g, ' ')}`, href: `/patient/checkout/diagnostic/${l.id}` })),
  ]
  const describe = (p: PaymentRow) => {
    if (p.appointment_id) {
      const v = visitRows.find((x) => x.id === p.appointment_id)
      return `Consultation · ${doctorName(one(one(v?.doctors)?.profiles)?.full_name)}`
    }
    const l = labRows.find((x) => x.id === p.diagnostic_booking_id)
    return `Lab test · ${(l?.test_name || 'Tests').replace(/-/g, ' ')}`
  }

  return (
    <AccountPage user={user} profile={profile} title="Payments & billing" subtitle="Booking fees you paid online, and bookings paid at the desk.">
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <div className="rounded-[18px] lg:rounded-2xl bg-white shadow-[0_0_0_1px_#E6EBF3] px-4 lg:px-5 py-4">
          <span className="block text-[12.5px] font-bold text-[#5B667A]">Paid online</span>
          <span className="block mt-1.5 text-[24px] lg:text-[28px] font-extrabold tracking-[-0.03em] tabular-nums">{formatINR(total)}</span>
          <span className="block mt-1 text-[12px] text-[#5B667A]">Booking fees, all time</span>
        </div>
        <div className="rounded-[18px] lg:rounded-2xl bg-white shadow-[0_0_0_1px_#E6EBF3] px-4 lg:px-5 py-4">
          <span className="block text-[12.5px] font-bold text-[#5B667A]">Payments</span>
          <span className="block mt-1.5 text-[24px] lg:text-[28px] font-extrabold tracking-[-0.03em] tabular-nums">{payments.length}</span>
          <span className="block mt-1 text-[12px] text-[#5B667A]">Online and at the desk</span>
        </div>
      </div>

      {unpaid.length > 0 && (
        <div role="alert" className="p-3.5 rounded-2xl bg-[#FEF3F2] shadow-[0_0_0_1px_#FBD5D1] flex flex-col gap-2">
          <span className="text-[13.5px] font-extrabold text-[#912018]">Waiting for payment ({unpaid.length})</span>
          {unpaid.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="truncate capitalize text-[#27324A]">{u.label}</span>
              <Link href={u.href} className="shrink-0 font-extrabold text-[#B42318] hover:underline">
                Pay now
              </Link>
            </div>
          ))}
        </div>
      )}

      <AccountCard title="Payment history" sub="Online you pay only the booking fee. Consultation fees and test charges are paid at the hospital or lab.">
        {payments.length === 0 ? (
          <p className="py-3 border-t border-[#EEF2F7] text-[13px] text-[#5B667A]">No payments yet.</p>
        ) : (
          payments.map((p, i) => (
            <div key={`${p.appointment_id ?? p.diagnostic_booking_id}-${i}`} className="flex justify-between gap-3 py-[11px] border-t border-[#EEF2F7] text-[13.5px]">
              <span className="min-w-0">
                <span className="block font-bold truncate capitalize">{describe(p)}</span>
                <span className="block text-[12px] text-[#5B667A]">
                  {[p.created_at ? formatShortDate(p.created_at) : null, p.gateway === 'payu' ? 'Booking fee, paid online' : 'Paid at the desk'].filter(Boolean).join(' · ')}
                </span>
              </span>
              {p.gateway === 'payu' ? <span className="shrink-0 font-extrabold">{formatINR(Number(p.amount) || 0)}</span> : <span className="shrink-0 text-[12px] text-[#5B667A]">At the counter</span>}
            </div>
          ))
        )}
      </AccountCard>

      <AccountCard>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-full bg-[#ECFDF3] text-[#067647] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <span>
            <span className="block text-[15px] font-extrabold">Health insurance</span>
            <span className="block mt-0.5 text-[13px] leading-relaxed text-[#4A5878]">
              Insurance claims aren&apos;t handled through Consult your Doctor. Each hospital&apos;s page lists the insurers it works with; check cover with the hospital&apos;s insurance desk.{' '}
              <Link href="/hospitals" className="font-extrabold text-[#2A4DD0] hover:underline">
                See hospitals
              </Link>
            </span>
          </span>
        </div>
      </AccountCard>
    </AccountPage>
  )
}
