'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'
import { saveProduct, saveSupplier, setOrderStatus, setProductActive, setSupplierActive } from '@/app/actions/equipment'
import { formatINR } from '@/components/patient/format'
import { stockLabel, type EquipmentCategory, type OrderStatus, type Product, type Supplier } from '@/lib/equipment'
import { EmptyState, Status, Table, segGroup, segTab, td, th } from './ui'

const field = 'w-full min-w-0 h-10 rounded-[10px] border border-[#D6DDE8] px-3 text-[13px] bg-white outline-none focus:border-[#2A4DD0] focus:shadow-[0_0_0_3px_rgba(42,77,208,0.12)]'
const blue = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[11px] bg-[#2A4DD0] text-white text-[13px] font-extrabold hover:bg-[#2443B8] disabled:opacity-60'
const outline = 'inline-flex items-center justify-center gap-2 h-9 px-3 rounded-[10px] border border-[#D6DDE8] bg-white text-[12.5px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA] disabled:opacity-60'
const label = 'block mb-1 text-[12px] font-extrabold text-[#27324A]'

const STEPS: Partial<Record<OrderStatus, { to: OrderStatus; label: string; danger?: boolean }[]>> = {
  placed: [
    { to: 'confirmed', label: 'Confirm (packing)' },
    { to: 'cancelled', label: 'Cancel', danger: true },
  ],
  confirmed: [
    { to: 'shipped', label: 'Mark shipped' },
    { to: 'cancelled', label: 'Cancel', danger: true },
  ],
  shipped: [{ to: 'delivered', label: 'Mark delivered' }],
  awaiting_payment: [{ to: 'cancelled', label: 'Cancel unpaid', danger: true }],
}

/** The next steps for an order, with a note the hospital sees (tracking number, delivery date…). */
export function OrderSteps({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const steps = STEPS[status] ?? []
  if (!steps.length) return null
  return (
    <div className="flex flex-col gap-2 lg:w-[320px] shrink-0">
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note for the hospital (optional)" aria-label="Note for the hospital" className={field} />
      <div className="flex gap-2">
        {steps.map((s) => (
          <button
            key={s.to}
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                const res = await setOrderStatus(orderId, s.to, note)
                if (!res.ok) setError(res.error)
                else router.refresh()
              })
            }
            className={`flex-1 h-10 rounded-[11px] text-[13px] font-extrabold disabled:opacity-60 ${s.danger ? 'border border-[#FDA29B] bg-white text-[#B42318]' : 'bg-[#2A4DD0] text-white hover:bg-[#2443B8]'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {error && <p className="text-[13px] font-bold text-[#B42318]">{error}</p>}
    </div>
  )
}

export type OrderRow = {
  id: string
  code: string
  hospital: string
  status: OrderStatus
  statusLabel: string
  statusColor: string
  total: number
  items: string
  suppliers: string
  /** Dates, payment and delivery, one grey line. */
  meta: string
  /** The hospital's rating, note and our note. */
  rating: number | null
  notes: string[]
}

const ORDER_TABS: { key: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'new', label: 'New', match: (s) => s === 'placed' },
  { key: 'packing', label: 'Packing', match: (s) => s === 'confirmed' },
  { key: 'shipped', label: 'Shipped', match: (s) => s === 'shipped' },
  { key: 'delivered', label: 'Delivered', match: (s) => s === 'delivered' },
  { key: 'other', label: 'Other', match: (s) => s === 'cancelled' || s === 'awaiting_payment' },
]

/** Every order in one table, with tabs by stage and the next-step buttons on each row. */
export function OrderTable({ orders }: { orders: OrderRow[] }) {
  const [tab, setTab] = useState('all')
  const active = ORDER_TABS.find((t) => t.key === tab) ?? ORDER_TABS[0]
  const rows = orders.filter((o) => active.match(o.status))
  return (
    <div>
      <div role="tablist" aria-label="Orders" className={`${segGroup} mb-3.5 max-w-full overflow-x-auto`}>
        {ORDER_TABS.map((t) => {
          const n = orders.filter((o) => t.match(o.status)).length
          return (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={segTab(tab === t.key)}>
              {t.label} {n}
            </button>
          )
        })}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Package}>{orders.length === 0 ? 'No orders yet.' : 'No orders in this stage.'}</EmptyState>
      ) : (
        <Table min={1100}>
          <thead>
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Hospital</th>
              <th className={th}>Items</th>
              <th className={th}>Amount</th>
              <th className={th}>Supplier</th>
              <th className={th}>Status</th>
              <th className={th}>
                <span className="sr-only">Next step</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td className={`${td} align-top font-mono text-[12.5px] font-extrabold text-[#2A4DD0]`}>{o.code}</td>
                <td className={`${td} align-top font-extrabold`}>{o.hospital}</td>
                <td className={`${td} align-top text-[#27324A] max-w-[300px]`}>
                  {o.items}
                  <span className="block mt-0.5 text-[12px] text-[#5B667A]">{o.meta}</span>
                  {o.rating ? (
                    <span className="block text-[12px] text-[#5B667A]">
                      Hospital’s rating: <span className="text-[#F59E0B]">{'★'.repeat(o.rating)}</span>
                      <span className="text-[#D6DDE8]">{'★'.repeat(5 - o.rating)}</span>
                    </span>
                  ) : null}
                  {o.notes.map((n) => (
                    <span key={n} className="block text-[12px] text-[#5B667A]">
                      {n}
                    </span>
                  ))}
                </td>
                <td className={`${td} align-top font-extrabold whitespace-nowrap`}>{formatINR(o.total)}</td>
                <td className={`${td} align-top text-[#5B667A]`}>{o.suppliers || '—'}</td>
                <td className={`${td} align-top`}>
                  <Status label={o.statusLabel} color={o.statusColor} />
                </td>
                <td className={`${td} align-top`}>
                  <OrderSteps orderId={o.id} status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}

type FormProps = { product?: Product; categories: Record<EquipmentCategory, string>; suppliers: Supplier[]; more: boolean; onDone: () => void }

function ProductForm({ product, categories, suppliers, more, onDone }: FormProps) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [keep, setKeep] = useState<string[]>(product?.photos ?? [])
  return (
    <form
      action={(form) =>
        start(async () => {
          setError(null)
          if (more) for (const url of keep) form.append('keepPhoto', url)
          if (more && product?.photos.length && !keep.length) form.append('keepPhoto', '')
          const res = await saveProduct(form)
          if (!res.ok) setError(res.error)
          else {
            onDone()
            router.refresh()
          }
        })
      }
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-start p-4 rounded-xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]"
    >
      {product && <input type="hidden" name="id" value={product.id} />}
      <label className="sm:col-span-2">
        <span className={label}>Product name</span>
        <input name="name" required defaultValue={product?.name} placeholder="e.g. Digital BP monitor" maxLength={120} className={field} />
      </label>
      <label>
        <span className={label}>Category</span>
        <select name="category" defaultValue={product?.category ?? 'devices'} className={field}>
          {(Object.keys(categories) as EquipmentCategory[]).map((c) => (
            <option key={c} value={c}>
              {categories[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={label}>Price (₹)</span>
        <input name="price" required type="number" min={1} step="0.01" defaultValue={product?.price} className={field} />
      </label>
      <label>
        <span className={label}>Sold as</span>
        <input name="unit" required defaultValue={product?.unit ?? 'per unit'} placeholder="per unit / box of 100" maxLength={40} className={field} />
      </label>
      <label>
        <span className={label}>Delivery</span>
        <input name="deliveryDays" defaultValue={product?.deliveryDays ?? ''} placeholder="e.g. 2 to 4 days" maxLength={60} className={field} />
      </label>
      {more && (
        <>
          <label>
            <span className={label}>Supplier</span>
            <select name="supplierId" defaultValue={product?.supplierId ?? ''} className={field}>
              <option value="">No supplier set</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.active ? '' : ' (switched off)'}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Units in stock</span>
            <input name="stock" type="number" min={0} step={1} defaultValue={product?.stock ?? ''} placeholder="Blank: not tracked" className={field} />
          </label>
          <label>
            <span className={label}>Our cost (₹, for commission)</span>
            <input name="costPrice" type="number" min={0} step="0.01" defaultValue={product?.costPrice ?? ''} placeholder="What the supplier charges" className={field} />
          </label>
        </>
      )}
      <label className="sm:col-span-2 lg:col-span-4">
        <span className={label}>Short description</span>
        <input name="description" defaultValue={product?.description ?? ''} placeholder="One line about it" maxLength={300} className={field} />
      </label>
      {more && (
        <div className="sm:col-span-2 lg:col-span-4">
          <span className={label}>Photos (JPG, PNG or WebP, up to 3)</span>
          {keep.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {keep.map((url) => (
                <span key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover bg-white shadow-[0_0_0_1px_#E6EAF0]" />
                  <button type="button" onClick={() => setKeep((k) => k.filter((u) => u !== url))} aria-label="Remove photo" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#B42318] text-white text-[12px] leading-none">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {keep.length < 3 && <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className="block text-[12.5px]" />}
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={pending} className={blue}>
          {product ? 'Save' : 'Add to catalogue'}
        </button>
        <button type="button" onClick={onDone} className="h-10 px-3 text-[13px] font-extrabold text-[#5B667A]">
          {product ? 'Close' : 'Cancel'}
        </button>
      </div>
      {error && <p className="sm:col-span-2 lg:col-span-4 text-[13px] font-bold text-[#B42318]">{error}</p>}
    </form>
  )
}

/** The catalogue: what hospitals see on Order equipment, with stock, supplier and the commission per unit. */
export function ProductEditor({ products, categories, suppliers, more }: { products: Product[]; categories: Record<EquipmentCategory, string>; suppliers: Supplier[]; more: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]))

  if (products.length === 0) return <p className="text-[13px] text-[#5B667A]">No products yet. Hospitals see “The catalogue is being put together” until you add some.</p>
  return (
    <Table min={980}>
      <thead>
        <tr>
          <th className={th}>Product</th>
          <th className={th}>Category</th>
          <th className={th}>Price</th>
          <th className={th}>Supplier</th>
          <th className={th}>Stock</th>
          <th className={th}>On hospital page</th>
          <th className={th}>
            <span className="sr-only">Edit</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) =>
          editing === p.id ? (
            <tr key={p.id}>
              <td colSpan={7} className="py-3 border-b border-[#EEF2F7]">
                <ProductForm product={p} categories={categories} suppliers={suppliers} more={more} onDone={() => setEditing(null)} />
              </td>
            </tr>
          ) : (
            <tr key={p.id}>
              <td className={td}>
                <span className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center overflow-hidden shrink-0">
                    {p.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-[#9DB0D6]" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-extrabold ${p.active ? '' : 'text-[#98A2B3] line-through'}`}>{p.name}</span>
                    <span className="block text-[12px] text-[#5B667A]">
                      {[p.unit, p.deliveryDays, p.costPrice != null ? `commission ${formatINR(p.price - p.costPrice)} each` : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </span>
              </td>
              <td className={`${td} text-[#27324A]`}>{categories[p.category]}</td>
              <td className={`${td} font-extrabold whitespace-nowrap`}>{formatINR(p.price)}</td>
              <td className={`${td} text-[#5B667A]`}>{(p.supplierId && supplierName.get(p.supplierId)) || '—'}</td>
              <td className={`${td} text-[12.5px] ${more ? (p.stock === 0 ? 'font-extrabold text-[#B42318]' : stockLabel(p.stock) ? 'font-extrabold text-[#B54708]' : 'text-[#5B667A]') : 'text-[#5B667A]'}`}>
                {more ? (p.stock == null ? 'Not tracked' : stockLabel(p.stock) ?? `${p.stock} in stock`) : '—'}
              </td>
              <td className={td}>
                <span className="flex items-center gap-2.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.active}
                    aria-label={`${p.name} on hospital page`}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await setProductActive(p.id, !p.active)
                        router.refresh()
                      })
                    }
                    className={`relative w-11 h-[26px] rounded-full transition-colors disabled:opacity-60 ${p.active ? 'bg-[#2A4DD0]' : 'bg-[#C9D2E0]'}`}
                  >
                    <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform ${p.active ? 'translate-x-[18px]' : ''}`} />
                  </button>
                  <span className="text-[12.5px] font-extrabold" style={{ color: p.active ? '#2A4DD0' : '#98A2B3' }}>
                    {p.active ? 'Listed' : 'Hidden'}
                  </span>
                </span>
              </td>
              <td className={`${td} text-right`}>
                <button type="button" onClick={() => setEditing(p.id)} className="text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                  Edit
                </button>
              </td>
            </tr>
          ),
        )}
      </tbody>
    </Table>
  )
}

/** The "Add equipment" card's form: a new product that goes live for hospitals straight away. */
export function AddProductForm({ categories, suppliers, more }: { categories: Record<EquipmentCategory, string>; suppliers: Supplier[]; more: boolean }) {
  // A new key after each save clears the form.
  const [round, setRound] = useState(0)
  return <ProductForm key={round} categories={categories} suppliers={suppliers} more={more} onDone={() => setRound((r) => r + 1)} />
}

function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      action={(form) =>
        start(async () => {
          setError(null)
          const res = await saveSupplier(form)
          if (!res.ok) setError(res.error)
          else {
            onDone()
            router.refresh()
          }
        })
      }
      className="grid gap-2.5 p-3.5 rounded-xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]"
    >
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <input name="name" required defaultValue={supplier?.name} placeholder="Supplier name" aria-label="Supplier name" maxLength={120} className={field} />
      <input name="categories" defaultValue={supplier?.categories ?? ''} placeholder="What they supply, e.g. devices, PPE" aria-label="What they supply" maxLength={160} className={field} />
      <div className="grid grid-cols-2 gap-2.5">
        <input name="deliveryDays" defaultValue={supplier?.deliveryDays ?? ''} placeholder="Delivery, e.g. 2 days" aria-label="Delivery time" maxLength={60} className={field} />
        <input name="phone" defaultValue={supplier?.phone ?? ''} placeholder="Phone" aria-label="Phone" maxLength={30} className={field} />
      </div>
      <input name="email" type="email" defaultValue={supplier?.email ?? ''} placeholder="Email" aria-label="Email" className={field} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={blue}>
          {supplier ? 'Save' : 'Add supplier'}
        </button>
        <button type="button" onClick={onDone} className="h-10 px-3 text-[13px] font-extrabold text-[#5B667A]">
          Cancel
        </button>
      </div>
      {error && <p className="text-[13px] font-bold text-[#B42318]">{error}</p>}
    </form>
  )
}

/** Suppliers, with hospitals' average delivery rating for orders that had their items. */
export function SupplierList({ suppliers, ratings }: { suppliers: Supplier[]; ratings: Record<string, { average: number; count: number }> }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [pending, start] = useTransition()
  return (
    <div>
      {suppliers.length === 0 && editing !== 'new' && <p className="mb-3 text-[13px] text-[#5B667A]">No suppliers yet.</p>}
      <ul>
        {suppliers.map((s) =>
          editing === s.id ? (
            <li key={s.id} className="py-2.5">
              <SupplierForm supplier={s} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={s.id} className="flex items-start justify-between gap-3 py-3 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
              <span className="min-w-0">
                <span className={`block text-[13.5px] font-extrabold ${s.active ? '' : 'text-[#98A2B3] line-through'}`}>{s.name}</span>
                <span className="block text-[12px] text-[#5B667A]">{[s.categories, s.deliveryDays ? `${s.deliveryDays} delivery` : null, s.phone].filter(Boolean).join(' · ') || '—'}</span>
                <span className="flex gap-3 mt-1">
                  <button type="button" onClick={() => setEditing(s.id)} className="text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await setSupplierActive(s.id, !s.active)
                        router.refresh()
                      })
                    }
                    className="text-[12.5px] font-extrabold text-[#5B667A] hover:underline underline-offset-4"
                  >
                    {s.active ? 'Switch off' : 'Switch on'}
                  </button>
                </span>
              </span>
              <span className="shrink-0 text-right text-[13px] font-extrabold">
                {ratings[s.id] ? (
                  <>
                    {ratings[s.id].average.toFixed(1)} <span className="text-[#F59E0B]">★</span>
                    <span className="block text-[11.5px] font-bold text-[#5B667A]">{ratings[s.id].count} rated</span>
                  </>
                ) : (
                  <span className="text-[12px] font-bold text-[#98A2B3]">No ratings yet</span>
                )}
              </span>
            </li>
          ),
        )}
      </ul>
      {editing === 'new' ? (
        <div className="mt-3">
          <SupplierForm onDone={() => setEditing(null)} />
        </div>
      ) : (
        <button type="button" onClick={() => setEditing('new')} className={`${outline} mt-3`}>
          Add supplier
        </button>
      )}
    </div>
  )
}
