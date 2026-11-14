'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BedDouble, FlaskConical, Loader2, Minus, Package, Plus, Search, ShieldPlus, Stethoscope, type LucideIcon } from 'lucide-react'
import { cancelUnpaidOrder, placeEquipmentOrder, rateOrder } from '@/app/actions/equipment'
import { formatINR, formatShortDate } from '@/components/patient/format'
import { textarea } from '@/components/portal/form-ui'
import { CATEGORY_LABEL, FREE_DELIVERY_FROM, ORDER_STATUS, deliveryFor, itemsLine, stockLabel, type EquipmentCategory, type Order, type Product } from '@/lib/equipment'
import { startPurchase } from '@/lib/purchase-client'
import { Panel, PanelHead, btnPrimary } from './hos-ui'

const ICON: Record<EquipmentCategory, LucideIcon> = { devices: Stethoscope, ppe: ShieldPlus, furniture: BedDouble, lab: FlaskConical, other: Package }

type Payer = { name: string; email: string | null; phone: string | null }

/** The DeskHosEquipment page body: catalogue with search and categories on the left; the order and recent orders on the right. */
export function EquipmentShop({ products, orders, deliverTo, payer }: { products: Product[]; orders: Order[]; deliverTo: string; payer: Payer }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<EquipmentCategory | 'all'>('all')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const cats = (['all', ...new Set(products.map((p) => p.category))] as (EquipmentCategory | 'all')[]).map((c) => ({ key: c, label: c === 'all' ? 'All' : CATEGORY_LABEL[c] }))
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return products.filter((p) => (cat === 'all' || p.category === cat) && words.every((w) => `${p.name} ${p.description ?? ''}`.toLowerCase().includes(w)))
  }, [products, cat, q])
  const lines = products.filter((p) => cart[p.id]).map((p) => ({ p, q: cart[p.id] }))
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.q, 0)
  const delivery = deliveryFor(subtotal)
  const count = lines.reduce((s, l) => s + l.q, 0)
  // No more than the team has in stock, when it tracks stock for the product.
  const set = (id: string, n: number) => {
    const stock = products.find((p) => p.id === id)?.stock
    setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(stock ?? 1000, 1000, n)) }))
  }

  const pay = async (orderId: string, code: string) => {
    const paid = await startPurchase({ kind: 'equipment', id: orderId, description: code ? `Equipment order ${code}` : 'Equipment order', ...payer })
    if (paid.ok) setMessage({ ok: true, text: 'Paid. Our team confirms the order and lets you know when it ships.' })
    else setMessage({ ok: false, text: `${paid.error} The order is saved; you can pay for it from Recent orders.` })
    router.refresh()
  }

  const place = async () => {
    setBusy('place')
    setMessage(null)
    const res = await placeEquipmentOrder(
      lines.map((l) => ({ productId: l.p.id, quantity: l.q })),
      note,
    )
    if (!res.ok) {
      setMessage({ ok: false, text: res.error })
      setBusy(null)
      return
    }
    setCart({})
    setNote('')
    await pay(res.orderId, '')
    setBusy(null)
  }

  return (
    <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
      <div className="min-w-0">
        <label className="flex items-center gap-2.5 h-11 px-3.5 mb-3.5 rounded-xl bg-white shadow-[inset_0_0_0_1px_#E1E7F0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0]">
          <Search className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search equipment and supplies" placeholder="Search equipment and supplies" className="flex-1 min-w-0 bg-transparent outline-none text-[14px]" />
        </label>
        {cats.length > 2 && (
          <div role="tablist" aria-label="Category" className="flex flex-wrap gap-2 mb-4">
            {cats.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={cat === c.key}
                onClick={() => setCat(c.key)}
                className={`h-[38px] px-4 rounded-full border text-[13.5px] font-extrabold transition-colors ${cat === c.key ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#9DB4F5]'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <Panel>
            <p className="text-[14px] font-extrabold">The catalogue is being put together</p>
            <p className="mt-1 text-[13.5px] text-[#5B667A]">Our team is adding devices, supplies and furniture with prices. They’ll show here as soon as they’re ready to order.</p>
          </Panel>
        ) : shown.length === 0 ? (
          <p className="p-4 text-[13.5px] text-[#5B667A]">Nothing matches “{q}”.</p>
        ) : (
          <div className="grid gap-3 lg:gap-3.5 grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => {
              const Icon = ICON[p.category]
              const n = cart[p.id] ?? 0
              return (
                <div key={p.id} className="flex flex-col p-3 lg:p-4 rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0]">
                  <span className="flex items-center justify-center h-20 lg:h-24 rounded-xl bg-[#F4F6FA] overflow-hidden">
                    {p.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photos[0]} alt="" loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <Icon className="w-9 h-9 text-[#9DB0D6]" strokeWidth={1.6} aria-hidden />
                    )}
                  </span>
                  <span className="block mt-3 text-[14px] lg:text-[14.5px] font-extrabold leading-[1.3]">{p.name}</span>
                  {p.description && <span className="block mt-1 text-[12.5px] leading-[1.4] text-[#5B667A]">{p.description}</span>}
                  <span className="flex flex-wrap items-baseline gap-x-1.5 mt-2.5">
                    <span className="text-[17px] lg:text-[18px] font-extrabold">{formatINR(p.price)}</span>
                    <span className="text-[12px] text-[#5B667A]">{p.unit}</span>
                  </span>
                  {p.deliveryDays && <span className="block mt-0.5 text-[12px] text-[#5B667A]">Delivered in {p.deliveryDays}</span>}
                  {stockLabel(p.stock) && <span className={`block mt-0.5 text-[12px] font-extrabold ${p.stock === 0 ? 'text-[#B42318]' : 'text-[#B54708]'}`}>{stockLabel(p.stock)}</span>}
                  <span className="flex-1" />
                  <div className="mt-3">
                    {p.stock === 0 && n === 0 ? (
                      <button type="button" disabled className="w-full h-[38px] rounded-[11px] border border-[#D6DDE8] bg-[#F4F6FA] text-[13.5px] font-extrabold text-[#98A2B3]">
                        Out of stock
                      </button>
                    ) : n === 0 ? (
                      <button type="button" onClick={() => set(p.id, 1)} className="w-full h-[38px] rounded-[11px] border border-[#2A4DD0] bg-white text-[13.5px] font-extrabold text-[#2A4DD0] hover:bg-[#F5F8FF]">
                        Add to order
                      </button>
                    ) : (
                      <div className="flex items-center justify-between h-[38px] rounded-[11px] bg-[#EEF3FF] text-[#2A4DD0]">
                        <button type="button" onClick={() => set(p.id, n - 1)} aria-label={`Fewer ${p.name}`} className="w-[38px] h-[38px] flex items-center justify-center">
                          <Minus className="w-4 h-4" strokeWidth={2.8} />
                        </button>
                        <span className="text-[14px] font-extrabold">{n} in order</span>
                        <button type="button" onClick={() => set(p.id, n + 1)} aria-label={`More ${p.name}`} className="w-[38px] h-[38px] flex items-center justify-center">
                          <Plus className="w-4 h-4" strokeWidth={2.8} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5 lg:gap-4 lg:sticky lg:top-[96px]">
        {message && <p className={`p-3.5 rounded-[14px] text-[13px] font-bold ${message.ok ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#B42318]'}`}>{message.text}</p>}
        <Panel>
          <PanelHead title="Your order" sub={`${count} ${count === 1 ? 'item' : 'items'}`} />
          {lines.length === 0 ? (
            <p className="text-[13px] text-[#5B667A]">Nothing added yet.</p>
          ) : (
            <>
              {lines.map((l) => (
                <div key={l.p.id} className="flex justify-between gap-2.5 py-[9px] border-t border-[#EEF2F7] text-[13.5px]">
                  <span className="min-w-0">
                    {l.p.name} <span className="text-[#5B667A]">× {l.q}</span>
                  </span>
                  <span className="font-extrabold shrink-0">{formatINR(l.p.price * l.q)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 py-[11px] border-t border-[#EEF2F7] text-[13.5px]">
                <span className="text-[#5B667A]">Subtotal</span>
                <span className="font-extrabold">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3 py-[11px] border-t border-[#EEF2F7] text-[13.5px]">
                <span className="text-[#5B667A]">Delivery</span>
                <span className="font-extrabold">{delivery ? formatINR(delivery) : 'Free'}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#EEF2F7] text-[16px] font-extrabold">
                <span>Total</span>
                <span>{formatINR(subtotal + delivery)}</span>
              </div>
              <label className="block mt-3.5">
                <span className="block mb-1.5 text-[13px] font-extrabold text-[#27324A]">Note for our team</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className={textarea} placeholder="Delivery timings, who to call…" />
              </label>
              <span className="block mt-3.5 mb-2 text-[13px] font-extrabold text-[#27324A]">Pay with</span>
              <span className="inline-flex items-center h-6 px-[9px] rounded-full bg-[#2A4DD0] text-white text-[11.5px] font-extrabold">UPI or card, online</span>
              <button type="button" disabled={!!busy} onClick={place} className={`${btnPrimary} w-full !h-12 mt-4`}>
                {busy === 'place' && <Loader2 className="w-4 h-4 animate-spin" />}
                Place order · {formatINR(subtotal + delivery)}
              </button>
              <p className="mt-2.5 text-[12px] leading-[1.5] text-[#5B667A]">
                Free delivery on orders of {formatINR(FREE_DELIVERY_FROM)} or more. Delivered to {deliverTo}.
              </p>
            </>
          )}
        </Panel>

        <Panel>
          <PanelHead title="Recent orders" />
          {orders.length === 0 ? (
            <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">No orders yet.</p>
          ) : (
            <ul>
              {orders.map((o) => {
                const s = ORDER_STATUS[o.status]
                return (
                  <li key={o.id} className="py-[11px] border-t border-[#EEF2F7]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-extrabold">
                          {o.code} · {formatINR(o.total)}
                        </span>
                        <span className="block text-[12px] text-[#5B667A]">
                          {formatShortDate(o.createdAt)} · {itemsLine(o.items)}
                        </span>
                      </span>
                      <span className="inline-flex items-center h-6 px-[9px] rounded-full text-[11.5px] font-extrabold whitespace-nowrap" style={{ color: s.color, background: s.bg }}>
                        {s.label}
                      </span>
                    </div>
                    {o.teamNote && <p className="mt-1.5 text-[12px] text-[#27324A]">Our team: {o.teamNote}</p>}
                    {o.status === 'delivered' && <RateDelivery order={o} onRated={() => router.refresh()} />}
                    {o.status === 'awaiting_payment' && (
                      <div className="flex gap-3 mt-1.5">
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={async () => {
                            setBusy(o.id)
                            setMessage(null)
                            await pay(o.id, o.code)
                            setBusy(null)
                          }}
                          className="text-[13px] font-extrabold text-[#2A4DD0] hover:underline disabled:opacity-60"
                        >
                          {busy === o.id ? 'Opening…' : 'Pay now'}
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={async () => {
                            setBusy(o.id)
                            const res = await cancelUnpaidOrder(o.id)
                            setBusy(null)
                            if (!res.ok) setMessage({ ok: false, text: res.error })
                            router.refresh()
                          }}
                          className="text-[13px] font-extrabold text-[#5B667A] hover:underline disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/** Stars for a delivered order; the team sees them as the supplier's rating. */
function RateDelivery({ order, onRated }: { order: Order; onRated: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (order.rating) {
    return (
      <p className="mt-1.5 text-[12px] text-[#5B667A]">
        You rated this delivery <span className="text-[#F59E0B]">{'★'.repeat(order.rating)}</span>
        <span className="text-[#D6DDE8]">{'★'.repeat(5 - order.rating)}</span>
      </p>
    )
  }
  return (
    <div className="mt-1.5">
      <span className="flex items-center gap-1 text-[12px] text-[#5B667A]">
        Rate the delivery:
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={async () => {
              setBusy(true)
              setError(null)
              const res = await rateOrder(order.id, n, '')
              setBusy(false)
              if (!res.ok) setError(res.error)
              else onRated()
            }}
            className="text-[16px] leading-none text-[#D6DDE8] hover:text-[#F59E0B] disabled:opacity-60"
          >
            ★
          </button>
        ))}
      </span>
      {error && <span className="block text-[12px] font-bold text-[#B42318]">{error}</span>}
    </div>
  )
}
