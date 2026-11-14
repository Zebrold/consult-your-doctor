import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, FlaskConical, IndianRupee, Stethoscope, Users, type LucideIcon } from 'lucide-react'
import { IST, doctorName, istDateKey } from '@/components/patient/format'
import { itemsLine, loadOrders } from '@/lib/equipment'
import {
  buildAttentionItems,
  buildLedger,
  currentTime,
  formatINR,
  loadApplications,
  loadAppointments,
  loadLabBookings,
  loadNetworkCounts,
  loadPartnerApplications,
  loadPayments,
  requireExecutive,
  timeAgo,
} from '../_lib/ops'
import { Card, ExePage, Note, Stat, Stats, btnOutline, btnPrimary, card, count, plural } from '../_components/ui'
import { PAGE_LABEL, isPageKey } from '../_lib/access'
import { AttentionBoard } from '../_components/AttentionBoard'

export const metadata: Metadata = { title: 'Command' }

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

/** The executive home after DeskExeHome: what needs action today, the network in four numbers, and recent activity. */
export default async function ExecutiveCommandPage(props: { searchParams?: Promise<{ denied?: string }> }) {
  const { admin, profile } = await requireExecutive()
  const denied = (await props.searchParams)?.denied
  const deniedLabel = denied === 'staff' ? 'Staff & access' : isPageKey(denied) ? PAGE_LABEL[denied] : null
  const [appointments, labBookings, applications, payments, network, hospitalApplications, labApplications, payouts, orders, badges] = await Promise.all([
    loadAppointments(admin),
    loadLabBookings(admin),
    loadApplications(admin),
    loadPayments(admin),
    loadNetworkCounts(admin),
    loadPartnerApplications(admin, 'hospital'),
    loadPartnerApplications(admin, 'diagnostic_center'),
    admin.from('hospital_payouts').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
    loadOrders(admin, undefined, 6),
    admin
      .from('verified_badges')
      .select('id, subject, amount, status, created_at, doctors ( profiles!doctors_profile_id_fkey ( full_name ) ), hospitals ( name )')
      .in('status', ['in_review', 'active'])
      .order('created_at', { ascending: false })
      .limit(6),
  ])
  const partnerApplications = [...hospitalApplications, ...labApplications]

  const now = currentTime()
  const todayKey = istDateKey(now)
  const isToday = (iso: string | null) => !!iso && istDateKey(iso) === todayKey

  const attention = buildAttentionItems({ appointments, labBookings, applications, partnerApplications }, now)
  const highCount = attention.filter((i) => i.severity === 'high').length

  const todaysAppointments = appointments.filter((a) => isToday(a.startTime) && a.status !== 'cancelled')
  const todaysLab = labBookings.filter((b) => isToday(b.preferredDate) && b.status !== 'cancelled')

  const ledger = buildLedger(appointments, labBookings, payments)
  const paidToday = ledger.filter((r) => isToday(r.createdAt))
  const revenueToday = paidToday.reduce((sum, r) => sum + r.amount, 0)

  const pendingDoctors = applications.filter((a) => a.status === 'pending').length
  const pendingPartners = partnerApplications.filter((a) => a.status === 'pending').length
  const labAttention = attention.filter((i) => i.category === 'diagnostics').length
  const patientAttention = attention.filter((i) => i.category === 'consultations').length
  const withdrawals = payouts.count ?? 0

  type BadgeRow = { id: string; subject: string; amount: number | string; created_at: string; doctors: Joined<{ profiles: Joined<{ full_name: string | null }> }>; hospitals: Joined<{ name: string | null }> }
  const hospitalName = new Map<string, string>()
  if (orders.length) {
    const { data } = await admin.from('hospitals').select('id, name').in('id', [...new Set(orders.map((o) => o.hospitalId))])
    for (const h of (data ?? []) as { id: string; name: string | null }[]) hospitalName.set(h.id, h.name ?? 'A hospital')
  }

  // Latest events across the network, newest first.
  const activity = [
    ...appointments.slice(0, 8).map((a) => ({
      id: `a-${a.id}`,
      at: a.createdAt,
      label: 'Consultation booked',
      text: `${a.patient?.name ?? 'A patient'} booked ${a.doctor ? doctorName(a.doctor.name) : 'a doctor'}${a.hospital ? ` at ${a.hospital.name}` : ''}.`,
    })),
    ...labBookings.slice(0, 8).map((b) => ({
      id: `l-${b.id}`,
      at: b.createdAt,
      label: 'Lab test booked',
      text: `${b.patient?.name ?? 'A patient'} booked ${b.testName}${b.center ? ` at ${b.center.name}` : ''}.`,
    })),
    ...((badges.data ?? []) as unknown as BadgeRow[]).map((b) => {
      const who = b.subject === 'hospital' ? one(b.hospitals)?.name ?? 'A hospital' : doctorName(one(one(b.doctors)?.profiles)?.full_name ?? 'A doctor')
      return { id: `b-${b.id}`, at: b.created_at, label: 'Badge payment', text: `${who} paid ${formatINR(Number(b.amount))} for a verified badge.` }
    }),
    ...orders
      .filter((o) => o.paidAt)
      .map((o) => ({ id: `o-${o.id}`, at: o.paidAt!, label: 'Equipment order', text: `${hospitalName.get(o.hospitalId) ?? 'A hospital'} ordered ${itemsLine(o.items)} (${formatINR(o.total)}).` })),
    ...partnerApplications.slice(0, 8).map((a) => ({
      id: `p-${a.id}`,
      at: a.createdAt,
      label: a.kind === 'hospital' ? 'Hospital application' : 'Diagnostic centre application',
      text: `${a.organizationName}${a.city ? `, ${a.city}` : ''} applied to join.`,
    })),
    ...applications.slice(0, 8).map((a) => ({
      id: `d-${a.id}`,
      at: a.createdAt,
      label: 'Doctor application',
      text: `${a.name}${a.specialty ? ` (${a.specialty})` : ''} applied to join.`,
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 6)

  const areas: { href: string; icon: LucideIcon; title: string; text: string; flag: { label: string; color: string }; cta: string }[] = [
    {
      href: '/executive/doctors',
      icon: Stethoscope,
      title: 'Doctor network',
      text: `${plural(network.doctors, 'doctor')} on the network. ${pendingDoctors ? `${plural(pendingDoctors, 'application')} waiting.` : 'No applications waiting.'}`,
      flag: pendingDoctors ? { label: `${pendingDoctors} ${pendingDoctors === 1 ? 'needs' : 'need'} review`, color: '#B54708' } : { label: 'Up to date', color: '#067647' },
      cta: 'Open credentialing',
    },
    {
      href: '/executive/diagnostics',
      icon: FlaskConical,
      title: 'Diagnostics & labs',
      text: `${plural(network.labs, 'partner lab')}. ${plural(todaysLab.length, 'lab visit')} today.`,
      flag: labAttention ? { label: `${labAttention} ${labAttention === 1 ? 'needs' : 'need'} attention`, color: '#B42318' } : { label: 'On track', color: '#067647' },
      cta: 'Open lab operations',
    },
    {
      href: '/executive/patients',
      icon: Users,
      title: 'Patient care',
      text: `${count(network.patients)} registered patients across ${plural(network.hospitals, 'hospital')}.`,
      flag: patientAttention ? { label: `${patientAttention} ${patientAttention === 1 ? 'needs' : 'need'} follow-up`, color: '#B42318' } : { label: 'On track', color: '#067647' },
      cta: 'Open patient queue',
    },
    {
      href: '/executive/revenue',
      icon: IndianRupee,
      title: 'Revenue & billing',
      text: `${plural(paidToday.length, 'paid booking')} today, worth ${formatINR(revenueToday)}.`,
      flag: { label: 'Live', color: '#2A4DD0' },
      cta: 'Open revenue',
    },
  ]

  const hour = Number(new Date(now).toLocaleString('en-GB', { timeZone: IST, hour: '2-digit', hour12: false }))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile.fullName.split(/\s+/)[0] || profile.fullName
  const dateLine = new Date(now).toLocaleDateString('en-GB', { timeZone: IST, weekday: 'long', day: 'numeric', month: 'long' })
  const summary = [
    attention.length ? `${plural(attention.length, 'item')} ${attention.length === 1 ? 'needs' : 'need'} action today.` : 'Nothing needs action right now.',
    withdrawals ? `${plural(withdrawals, 'withdrawal')} ${withdrawals === 1 ? 'is' : 'are'} waiting to be paid.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ExePage
      name={profile.fullName}
      eyebrow={dateLine}
      title={`${greeting}, ${firstName}`}
      subtitle={summary}
      actions={
        <>
          <Link href="/executive/today" className={btnOutline}>
            Today’s check-ins
          </Link>
          <Link href={pendingPartners ? '/executive/hospitals#applications' : '/executive/doctors#applications'} className={btnPrimary}>
            {pendingPartners ? 'Review hospital applications' : 'Review doctor applications'}
          </Link>
        </>
      }
    >
      {deniedLabel && (
        <Note tone="amber">
          Your team can’t open {deniedLabel}. Ask someone in Management to give your team access in Staff &amp; access.
        </Note>
      )}
      <Stats>
        <Stat label="Needs attention" value={attention.length} note={`${highCount} high · ${attention.length - highCount} medium`} tone={highCount ? 'high' : undefined} />
        <Stat label="Care network" value={network.doctors} note={`doctors · ${plural(network.hospitals, 'hospital')} · ${plural(network.labs, 'lab')}`} />
        <Stat label="Today’s visits" value={todaysAppointments.length + todaysLab.length} note={`${plural(todaysAppointments.length, 'consultation')} · ${todaysLab.length} lab`} />
        <Stat label="Revenue today" value={formatINR(revenueToday)} note={plural(paidToday.length, 'paid booking')} tone="blue" />
      </Stats>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
        {areas.map(({ href, icon: Icon, title, text, flag, cta }) => (
          <Link key={href} href={href} className={`${card} p-4 lg:p-[22px] flex flex-col gap-1.5 hover:shadow-[0_0_0_1px_#C9D5F2,0_4px_14px_rgba(11,27,63,0.06)] transition-shadow`}>
            <span className="flex items-center justify-between gap-2">
              <span className="w-10 h-10 rounded-[11px] bg-[#F4F6FA] flex items-center justify-center text-[#2A4DD0]">
                <Icon className="w-5 h-5" strokeWidth={2.1} aria-hidden />
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold whitespace-nowrap" style={{ color: flag.color }}>
                <span aria-hidden className="w-[7px] h-[7px] rounded-full" style={{ background: flag.color }} />
                {flag.label}
              </span>
            </span>
            <span className="mt-2.5 text-[16.5px] font-extrabold">{title}</span>
            <span className="text-[13px] leading-normal text-[#5B667A]">{text}</span>
            <span className="mt-auto pt-3 border-t border-[#EEF2F7] flex items-center justify-between text-[13px] font-extrabold text-[#2A4DD0]">
              {cta}
              <ChevronRight className="w-4 h-4" strokeWidth={2.6} aria-hidden />
            </span>
          </Link>
        ))}
      </section>

      <Card id="attention" title="Needs attention" sub="Unpaid bookings, missed check-ins, overdue reports and applications waiting">
        <AttentionBoard items={attention} />
      </Card>

      <Card title="Recent activity" sub="Across the network">
        {activity.length === 0 ? (
          <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">No activity yet.</p>
        ) : (
          <ul>
            {activity.map((event) => (
              <li key={event.id} className="flex gap-3.5 py-3 border-t border-[#EEF2F7]">
                <span aria-hidden className="shrink-0 w-[9px] h-[9px] mt-[5px] rounded-full bg-[#2A4DD0]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[11.5px] font-extrabold tracking-[0.06em] uppercase text-[#2A4DD0]">{event.label}</span>
                  <span className="block mt-0.5 text-[13.5px]">{event.text}</span>
                </span>
                <span className="shrink-0 text-[12px] text-[#5B667A] whitespace-nowrap">{timeAgo(event.at, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </ExePage>
  )
}
