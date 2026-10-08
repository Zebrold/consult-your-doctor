import Link from 'next/link'
import { ReceiptIndianRupee } from 'lucide-react'
import { formatINR } from '@/components/patient/format'
import { Card } from '@/components/portal/ui'
import type { LabBooking, LabTest } from '../_lib/lab'

type Row = { name: string; price: number | null; monthCount: number; monthAmount: number; allCount: number; allAmount: number }

/** Bookings and amounts per test, from paid bookings at today's prices. */
export function testWiseAmounts(tests: LabTest[], paid: LabBooking[], month: string): Row[] {
  const rows = new Map<string, Row>()
  const row = (name: string, price: number | null) => rows.get(name) ?? { name, price, monthCount: 0, monthAmount: 0, allCount: 0, allAmount: 0 }
  for (const t of tests) rows.set(t.name, row(t.name, t.price))
  for (const b of paid) {
    for (const t of b.tests) {
      const r = row(t.name, t.price)
      const amount = t.price ?? 0
      r.allCount++
      r.allAmount += amount
      if (b.date?.slice(0, 7) === month) {
        r.monthCount++
        r.monthAmount += amount
      }
      rows.set(t.name, r)
    }
  }
  return Array.from(rows.values()).sort((a, b) => b.allAmount - a.allAmount || b.allCount - a.allCount || a.name.localeCompare(b.name))
}

/** The test-wise amount segment: each test's price, how often it was booked and what it brought in. */
export function TestWiseAmount({ rows, className = '' }: { rows: Row[]; className?: string }) {
  const totals = rows.reduce((t, r) => ({ monthCount: t.monthCount + r.monthCount, monthAmount: t.monthAmount + r.monthAmount, allCount: t.allCount + r.allCount, allAmount: t.allAmount + r.allAmount }), {
    monthCount: 0,
    monthAmount: 0,
    allCount: 0,
    allAmount: 0,
  })
  return (
    <Card className={`min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3 md:mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <ReceiptIndianRupee className="w-[22px] h-[22px] text-vibrant-blue shrink-0" />
          <div className="min-w-0">
            <h3 className="font-title-md text-[16px] md:text-title-md text-on-surface font-bold">Test-wise Amount</h3>
            <p className="text-xs text-on-surface-variant">Price, bookings and amount for each test (paid bookings)</p>
          </div>
        </div>
        <Link href="/diagnostic-center/schedule#tests" className="font-label-sm text-label-sm text-primary font-semibold hover:underline shrink-0">
          Edit prices
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">Add tests with prices to see their amounts here.</p>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-[13px] min-w-[460px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-indigo-gray-600">
                <th className="py-2 pr-2 font-semibold">Test</th>
                <th className="py-2 px-2 font-semibold text-right">Price</th>
                <th className="py-2 px-2 font-semibold text-right">This month</th>
                <th className="py-2 pl-2 font-semibold text-right">All time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="py-2 pr-2 font-semibold text-on-surface">{r.name}</td>
                  <td className="py-2 px-2 text-right text-on-surface whitespace-nowrap">{r.price != null ? formatINR(r.price) : <span className="text-soft-coral">No price</span>}</td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <span className="font-semibold text-on-surface">{formatINR(r.monthAmount)}</span>
                    <span className="block text-[11px] text-indigo-gray-600">{r.monthCount}×</span>
                  </td>
                  <td className="py-2 pl-2 text-right whitespace-nowrap">
                    <span className="font-semibold text-on-surface">{formatINR(r.allAmount)}</span>
                    <span className="block text-[11px] text-indigo-gray-600">{r.allCount}×</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-surface-container-high">
                <td className="py-2.5 pr-2 font-bold text-on-surface" colSpan={2}>
                  Total
                </td>
                <td className="py-2.5 px-2 text-right font-bold text-primary whitespace-nowrap">
                  {formatINR(totals.monthAmount)}
                  <span className="block text-[11px] font-normal text-indigo-gray-600">{totals.monthCount} tests</span>
                </td>
                <td className="py-2.5 pl-2 text-right font-bold text-primary whitespace-nowrap">
                  {formatINR(totals.allAmount)}
                  <span className="block text-[11px] font-normal text-indigo-gray-600">{totals.allCount} tests</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}
