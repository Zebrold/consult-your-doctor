import type { createAdminClient } from '@/lib/supabase/admin'
import { istDateKey } from '@/components/patient/format'
import { monthName, noShowRate } from '@/lib/report-stats'

type Admin = ReturnType<typeof createAdminClient>

// The monthly platform report the Reports page can email (supabase/migrations/20261115_executive_workspace.sql,
// report_subscriptions; sent by app/api/cron/monthly-report on the 1st for the month before).

type Cell = string | number | null

/** A CSV Excel opens: the byte-order mark keeps ₹ and Indian scripts readable; formula-like cells stay text. */
export function toCsv(rows: Cell[][]) {
  const safe = (v: Cell) => {
    const s = v == null ? '' : String(v)
    const text = typeof v === 'string' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return '﻿' + rows.map((r) => r.map(safe).join(',')).join('\r\n')
}

const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

/** Last month's numbers and files, from the database. `month` is "YYYY-MM" in India time. */
export async function buildMonthlyReport(admin: Admin, month: string, now = Date.now()) {
  const from = new Date(`${month}-01T00:00:00+05:30`).toISOString()
  const next = new Date(Date.parse(`${month}-01T00:00:00+05:30`) + 32 * 86_400_000)
  const nextKey = istDateKey(next).slice(0, 7)
  const to = new Date(`${nextKey}-01T00:00:00+05:30`).toISOString()

  const [appts, labs, pays, patients, doctors, hospitals, badges, orders, tickets] = await Promise.all([
    admin
      .from('appointments')
      .select('id, status, created_at, patient:profiles!appointments_patient_id_fkey ( full_name ), hospital:hospitals ( name ), schedule:schedules ( start_time )')
      .gte('created_at', from)
      .lt('created_at', to)
      .limit(20000),
    admin.from('diagnostic_bookings').select('id, status, test_name, created_at, diagnostic_centers ( name )').gte('created_at', from).lt('created_at', to).limit(20000),
    admin.from('payments').select('transaction_id, amount, gateway, status, created_at').gte('created_at', from).lt('created_at', to).limit(20000),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'patient').gte('created_at', from).lt('created_at', to),
    admin.from('doctors').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
    admin.from('hospitals').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
    admin.from('verified_badges').select('id', { count: 'exact', head: true }).in('status', ['in_review', 'active']).gte('created_at', from).lt('created_at', to),
    admin.from('equipment_orders').select('id', { count: 'exact', head: true }).not('paid_at', 'is', null).gte('paid_at', from).lt('paid_at', to),
    admin.from('tickets').select('ticket_code, requester_role, category, subject, priority, status, created_at').gte('created_at', from).lt('created_at', to).limit(5000),
  ])

  type A = { id: string; status: string; created_at: string; patient: unknown; hospital: unknown; schedule: unknown }
  const apptRows = (appts.data ?? []) as A[]
  const labRows = (labs.data ?? []) as { id: string; status: string; test_name: string | null; created_at: string; diagnostic_centers: unknown }[]
  const payRows = (pays.data ?? []) as { transaction_id: string | null; amount: number | string; gateway: string; status: string; created_at: string }[]
  const booked = (s: string) => s !== 'pending_payment' && s !== 'cancelled'
  const consultations = apptRows.filter((a) => booked(a.status)).length
  const labVisits = labRows.filter((b) => booked(b.status)).length
  const visits = apptRows.map((a) => ({ status: a.status, start: (one(a.schedule as { start_time: string } | null) as { start_time: string } | null)?.start_time ?? null, end: null }))
  const ns = noShowRate(
    visits.map((v) => ({ ...v, end: v.start })),
    now,
  )
  const settled = payRows.filter((p) => p.status === 'success' || p.status === 'refunded')
  const refunded = payRows.filter((p) => p.status === 'refunded')
  const collected = payRows.filter((p) => p.status === 'success').reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const summary: [string, string][] = [
    ['Consultations booked', consultations.toLocaleString('en-IN')],
    ['Lab visits booked', labVisits.toLocaleString('en-IN')],
    ['Check-in rate', ns.rate == null ? '—' : `${Math.round(100 - ns.rate)}%`],
    ['Payments collected', `₹${Math.round(collected).toLocaleString('en-IN')}`],
    ['Refund rate', settled.length ? `${((refunded.length / settled.length) * 100).toFixed(1)}%` : '—'],
    ['New patients', String(patients.count ?? 0)],
    ['New doctors', String(doctors.count ?? 0)],
    ['New hospitals and branches', String(hospitals.count ?? 0)],
    ...(badges.error ? [] : ([['Badge sign-ups', String(badges.count ?? 0)]] as [string, string][])),
    ...(orders.error ? [] : ([['Equipment orders', String(orders.count ?? 0)]] as [string, string][])),
    ['Support tickets', String((tickets.data ?? []).length)],
  ]

  const files = [
    {
      filename: `bookings-${month}.csv`,
      content: toCsv([
        ['Booked on', 'Type', 'Patient', 'Hospital or lab', 'Status'],
        ...apptRows.map((a) => [istDateKey(a.created_at), 'Consultation', (one(a.patient as { full_name: string | null } | null) as { full_name: string | null } | null)?.full_name ?? '', (one(a.hospital as { name: string | null } | null) as { name: string | null } | null)?.name ?? '', a.status]),
        ...labRows.map((b) => [istDateKey(b.created_at), 'Lab test', b.test_name ?? '', (one(b.diagnostic_centers as { name: string | null } | null) as { name: string | null } | null)?.name ?? '', b.status]),
      ]),
    },
    {
      filename: `payments-${month}.csv`,
      content: toCsv([['Date', 'Transaction', 'Method', 'Amount (INR)', 'Status'], ...payRows.map((p) => [istDateKey(p.created_at), p.transaction_id, p.gateway, Number(p.amount) || 0, p.status])]),
    },
    {
      filename: `tickets-${month}.csv`,
      content: toCsv([
        ['Raised on', 'Ticket', 'From', 'Category', 'Subject', 'Priority', 'Status'],
        ...((tickets.data ?? []) as { ticket_code: string; requester_role: string; category: string; subject: string; priority: string; status: string; created_at: string }[]).map((t) => [
          istDateKey(t.created_at),
          t.ticket_code,
          t.requester_role,
          t.category,
          t.subject,
          t.priority,
          t.status,
        ]),
      ]),
    },
  ]
  return { title: monthName(month, 'year'), summary, files }
}
