import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  History,
  IndianRupee,
  LayoutGrid,
  Microscope,
  Network,
  Stethoscope,
  Users,
} from 'lucide-react'
import {
  buildAttentionItems,
  buildLedger,
  currentTime,
  formatINR,
  loadApplications,
  loadAppointments,
  loadLabBookings,
  loadNetworkCounts,
  loadPayments,
  requireExecutive,
  timeAgo,
} from '../_lib/ops'
import { Chip, MetricCard, PageHeader, Panel } from '../_components/ui'
import { AttentionBoard } from '../_components/AttentionBoard'

export default async function ExecutiveCommandPage() {
  const { admin } = await requireExecutive()
  const [appointments, labBookings, applications, payments, network] = await Promise.all([
    loadAppointments(admin),
    loadLabBookings(admin),
    loadApplications(admin),
    loadPayments(admin),
    loadNetworkCounts(admin),
  ])

  const now = currentTime()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const isToday = (iso: string | null) => Boolean(iso) && new Date(iso!) >= today && new Date(iso!).getTime() < today.getTime() + 86_400_000

  const attention = buildAttentionItems({ appointments, labBookings, applications }, now)
  const highCount = attention.filter((i) => i.severity === 'high').length

  const todaysAppointments = appointments.filter((a) => isToday(a.startTime) && a.status !== 'cancelled')
  const todaysLab = labBookings.filter((b) => b.preferredDate && isToday(b.preferredDate) && b.status !== 'cancelled')
  const checkedIn = todaysAppointments.filter((a) => a.status === 'visited' || a.status === 'completed').length

  const ledger = buildLedger(appointments, labBookings, payments)
  const revenueToday = ledger.filter((r) => isToday(r.createdAt)).reduce((sum, r) => sum + r.amount, 0)
  const bookingsToday = ledger.filter((r) => isToday(r.createdAt)).length

  const pendingApplications = applications.filter((a) => a.status === 'pending')
  const labAttention = attention.filter((i) => i.category === 'diagnostics').length
  const patientAttention = attention.filter((i) => i.category === 'consultations').length

  // Latest platform events, newest first.
  const activity = [
    ...appointments.slice(0, 8).map((a) => ({
      id: `a-${a.id}`,
      at: a.createdAt,
      tone: 'blue' as const,
      label: 'CONSULTATION BOOKED',
      text: `${a.patient?.name ?? 'A patient'} booked ${a.doctor ? `Dr. ${a.doctor.name}` : 'a doctor'}${a.hospital ? ` at ${a.hospital.name}` : ''}.`,
    })),
    ...labBookings.slice(0, 8).map((b) => ({
      id: `l-${b.id}`,
      at: b.createdAt,
      tone: 'teal' as const,
      label: 'LAB TEST BOOKED',
      text: `${b.patient?.name ?? 'A patient'} booked ${b.testName}${b.center ? ` at ${b.center.name}` : ''}.`,
    })),
    ...applications.slice(0, 8).map((a) => ({
      id: `d-${a.id}`,
      at: a.createdAt,
      tone: 'neutral' as const,
      label: `DOCTOR APPLICATION · ${a.status.toUpperCase()}`,
      text: `${a.name}${a.specialty ? ` (${a.specialty})` : ''} applied to join the network.`,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6)

  const portals = [
    {
      href: '/executive/doctors',
      icon: Stethoscope,
      title: 'Doctor Network',
      text: `${network.doctors} doctors on the network. ${pendingApplications.length} application${pendingApplications.length === 1 ? '' : 's'} awaiting review.`,
      chip: pendingApplications.length ? { tone: 'coral' as const, label: `${pendingApplications.length} to review` } : { tone: 'teal' as const, label: 'Up to date' },
      cta: 'Open credentialing',
    },
    {
      href: '/executive/diagnostics',
      icon: Microscope,
      title: 'Diagnostics & Labs',
      text: `${network.labs} active partner labs. ${todaysLab.length} lab visit${todaysLab.length === 1 ? '' : 's'} booked for today.`,
      chip: labAttention ? { tone: 'coral' as const, label: `${labAttention} need attention` } : { tone: 'teal' as const, label: 'On track' },
      cta: 'Open lab operations',
    },
    {
      href: '/executive/patients',
      icon: Users,
      title: 'Patient Care',
      text: `${network.patients} registered patients across ${network.hospitals} active hospitals.`,
      chip: patientAttention ? { tone: 'coral' as const, label: `${patientAttention} need attention` } : { tone: 'teal' as const, label: 'On track' },
      cta: 'Open patient queue',
    },
    {
      href: '/executive/revenue',
      icon: IndianRupee,
      title: 'Revenue & Billing',
      text: `${bookingsToday} paid booking${bookingsToday === 1 ? '' : 's'} today, worth ${formatINR(revenueToday)}.`,
      chip: { tone: 'teal' as const, label: 'Live data' },
      cta: 'Open revenue ledger',
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Operations Console"
        title="Executive Operations Command"
        description="A platform-wide view of doctors, hospitals, diagnostic labs and patient bookings, with the items that need someone to act on them first."
        actions={
          <>
            <Link
              href="/executive/today"
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-surface-container-lowest text-indigo-gray-900 hover:bg-surface-container shadow-sm font-label-sm text-label-sm transition-all"
            >
              <CalendarCheck className="w-5 h-5 text-vibrant-blue" /> Today&apos;s check-ins
            </Link>
            <Link
              href="/executive/doctors#applications"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-vibrant-blue text-on-primary hover:bg-primary shadow-sm hover:scale-[1.02] font-label-sm text-label-sm transition-all"
            >
              <ClipboardList className="w-5 h-5" /> Review doctor applications
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <MetricCard
          label="Needs attention"
          value={attention.length}
          icon={AlertTriangle}
          tone="coral"
          badge={highCount > 0 ? <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-soft-coral opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-soft-coral" /></span> : undefined}
          footer={
            <>
              <span className="flex gap-2"><Chip tone="coral">{highCount} high</Chip><Chip>{attention.length - highCount} medium</Chip></span>
            </>
          }
        />
        <MetricCard
          label="Care network"
          value={network.doctors}
          icon={Network}
          tone="blue"
          badge={<span className="font-label-sm text-label-sm text-indigo-gray-600">doctors</span>}
          footer={<span className="truncate">Hospitals: {network.hospitals} • Labs: {network.labs} • Patients: {network.patients.toLocaleString('en-IN')}</span>}
        />
        <MetricCard
          label="Today's visits"
          value={todaysAppointments.length + todaysLab.length}
          icon={CalendarCheck}
          tone="teal"
          progress={todaysAppointments.length ? (checkedIn / todaysAppointments.length) * 100 : 0}
          footer={
            <>
              <span>{todaysAppointments.length} consults • {todaysLab.length} lab</span>
              <span className="text-secondary font-medium">{checkedIn} checked in</span>
            </>
          }
        />
        <MetricCard
          label="Revenue today"
          value={formatINR(revenueToday)}
          icon={IndianRupee}
          tone="primary"
          footer={<span>{bookingsToday} paid booking{bookingsToday === 1 ? '' : 's'} today</span>}
        />
      </section>

      <section className="flex flex-col gap-stack-sm">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-vibrant-blue" />
          <h2 className="font-title-md text-title-md text-indigo-gray-900">Operations Areas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {portals.map(({ href, icon: Icon, title, text, chip, cta }) => (
            <div key={href} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4 gap-2">
                  <span className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-vibrant-blue">
                    <Icon className="w-6 h-6" />
                  </span>
                  <Chip tone={chip.tone} dot>{chip.label}</Chip>
                </div>
                <h3 className="font-title-md text-title-md text-indigo-gray-900 group-hover:text-vibrant-blue transition-colors">{title}</h3>
                <p className="font-body-md text-[15px] text-indigo-gray-600 mt-2">{text}</p>
              </div>
              <Link
                href={href}
                className="mt-6 inline-flex items-center justify-between w-full px-4 py-2.5 rounded-full bg-surface-container-low text-indigo-gray-900 hover:bg-vibrant-blue hover:text-on-primary transition-all font-label-sm text-label-sm"
              >
                {cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Panel
        title="Needs Attention"
        icon={AlertTriangle}
        description="Unpaid bookings older than a day, appointments never checked in, overdue lab visits, reports not sent, and doctor applications awaiting review."
      >
        <AttentionBoard items={attention} />
      </Panel>

      <Panel title="Recent Platform Activity" icon={History} description="The latest bookings and doctor applications across the network.">
        {activity.length === 0 ? (
          <p className="text-sm text-indigo-gray-600">No activity yet.</p>
        ) : (
          <ol className="relative pl-6 space-y-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
            {activity.map((event) => (
              <li key={event.id} className="relative">
                <span
                  className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full shadow-[0_0_0_4px_#ffffff] ${
                    event.tone === 'blue' ? 'bg-vibrant-blue' : event.tone === 'teal' ? 'bg-fresh-teal' : 'bg-indigo-gray-600'
                  }`}
                />
                <div className="bg-surface-container-low p-4 rounded-xl">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-label-sm text-label-sm font-semibold ${event.tone === 'blue' ? 'text-vibrant-blue' : event.tone === 'teal' ? 'text-secondary' : 'text-indigo-gray-900'}`}>
                      {event.label}
                    </span>
                    <span className="font-label-sm text-[11px] text-indigo-gray-600 whitespace-nowrap">{timeAgo(event.at, now)}</span>
                  </div>
                  <p className="font-body-md text-[15px] text-indigo-gray-900 mt-1">{event.text}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  )
}
