'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, X } from 'lucide-react'
import { saveProduct, saveSupplier, setOrderStatus, setProductActive, setSupplierActive } from '@/app/actions/equipment'
import { formatINR } from '@/components/patient/format'
import { stockLabel, type EquipmentCategory, type OrderStatus, type Product, type Supplier } from '@/lib/equipment'
import { DlgDone, DlgField, DlgForm, DlgGrid, DlgRupee, DlgSection, FormDialog, dlgBareInput, dlgBtnBlue, dlgBtnLine, dlgInput } from '@/components/portal/form-dialog'
import { EmptyState, Status, Table, segGroup, segTab, td, th } from './ui'

const field = 'w-full min-w-0 h-10 rounded-[10px] border border-[#D6DDE8] px-3 text-[13px] bg-white outline-none focus:border-[#2A4DD0] focus:shadow-[0_0_0_3px_rgba(42,77,208,0.12)]'
const outline = 'inline-flex items-center justify-center gap-2 h-9 px-3 rounded-[10px] border border-[#D6DDE8] bg-white text-[12.5px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA] disabled:opacity-60'

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

// Adding and editing products and suppliers use the portal's form dialog (components/portal/form-dialog.tsx), the same
// one as Add hospital and Add diagnostic centre (NetworkForms.tsx).

type DialogProps = { product?: Product; categories: Record<EquipmentCategory, string>; suppliers: Supplier[]; more: boolean; onClose: () => void }

const fileInput =
  'block w-full text-[13.5px] text-[#5B667A] file:mr-3 file:h-[40px] file:px-4 file:rounded-[10px] file:border-0 file:bg-[#EEF3FF] file:text-[#2A4DD0] file:text-[13.5px] file:font-extrabold file:cursor-pointer hover:file:bg-[#E2EAFF]'

/** Add a product to the catalogue, or edit one (`product`). */
function ProductDialog({ product, categories, suppliers, more, onClose }: DialogProps) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [added, setAdded] = useState<string | null>(null)
  // A new key after "Add another" gives an empty form.
  const [round, setRound] = useState(0)
  const [keep, setKeep] = useState<string[]>(product?.photos ?? [])

  const steps = [
    { label: 'Product', sub: 'Name and category' },
    { label: more ? 'Price & stock' : 'Price & delivery', sub: 'What hospitals pay' },
    ...(more ? [{ label: 'Photos', sub: 'Up to 3' }] : []),
  ]

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (more) for (const url of keep) form.append('keepPhoto', url)
    if (more && product?.photos.length && !keep.length) form.append('keepPhoto', '')
    setError('')
    start(async () => {
      const res = await saveProduct(form)
      if (!res.ok) return setError(res.error)
      router.refresh()
      if (product) onClose()
      else setAdded(String(form.get('name') || '').trim() || 'The product')
    })
  }

  const another = () => {
    setAdded(null)
    setError('')
    setKeep([])
    setRound((r) => r + 1)
  }

  return (
    <FormDialog
      title={product ? `Edit ${product.name}` : 'Add equipment'}
      subtitle={
        product
          ? 'Changes show on the hospitals’ Order equipment page straight away. Past orders keep their prices.'
          : 'It goes live on the hospitals’ Order equipment page straight away. Switch it off in the catalogue at any time.'
      }
      steps={steps}
      done={!!added}
      onClose={onClose}
    >
      {added ? (
        <DlgDone
          title="Added to the catalogue"
          actions={
            <>
              <button type="button" onClick={another} className={dlgBtnLine}>
                <Plus className="w-4 h-4" strokeWidth={2.6} /> Add another product
              </button>
              <button type="button" onClick={onClose} className={dlgBtnBlue}>
                Done
              </button>
            </>
          }
        >
          <p className="max-w-[460px] text-[14.5px] leading-relaxed text-[#5B667A]">
            <b className="text-[#0B1B3F]">{added}</b> is on the hospitals’ Order equipment page now.
          </p>
        </DlgDone>
      ) : (
        <DlgForm
          key={round}
          onSubmit={submit}
          onCancel={onClose}
          pending={pending}
          error={error}
          submitLabel={product ? 'Save changes' : 'Add to catalogue'}
          submitIcon={product ? undefined : <Plus className="w-4 h-4" strokeWidth={2.6} />}
        >
          {product && <input type="hidden" name="id" value={product.id} />}

          <DlgSection n={1} title="Product details" sub="What hospitals see on their Order equipment page.">
            <div className="flex flex-col gap-[18px]">
              <DlgField label="Product name" required>
                <input name="name" required defaultValue={product?.name} placeholder="e.g. Digital BP monitor" maxLength={120} className={dlgInput} />
              </DlgField>
              <DlgGrid>
                <DlgField label="Category" required>
                  <select name="category" required defaultValue={product?.category ?? 'devices'} className={dlgInput}>
                    {(Object.keys(categories) as EquipmentCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {categories[c]}
                      </option>
                    ))}
                  </select>
                </DlgField>
                <DlgField label="Sold as" required hint="How it’s priced, e.g. per unit or box of 100.">
                  <input name="unit" required defaultValue={product?.unit ?? 'per unit'} placeholder="per unit" maxLength={40} className={dlgInput} />
                </DlgField>
              </DlgGrid>
              <DlgField label="Short description" hint="One line under the name.">
                <input name="description" defaultValue={product?.description ?? ''} placeholder="e.g. Upper-arm monitor with a large display" maxLength={300} className={dlgInput} />
              </DlgField>
            </div>
          </DlgSection>

          <DlgSection n={2} title={more ? 'Price, stock and supplier' : 'Price and delivery'} sub="What the hospital pays, and how soon it arrives.">
            <div className="flex flex-col gap-[18px]">
              <DlgGrid>
                <DlgField label="Price" required hint="What the hospital pays for each one they order.">
                  <DlgRupee>
                    <input name="price" required type="number" inputMode="decimal" min={1} step="0.01" defaultValue={product?.price} placeholder="0" className={dlgBareInput} />
                  </DlgRupee>
                </DlgField>
                <DlgField label="Delivery" hint="Shown to the hospital before they order.">
                  <input name="deliveryDays" defaultValue={product?.deliveryDays ?? ''} placeholder="e.g. 2 to 4 days" maxLength={60} className={dlgInput} />
                </DlgField>
              </DlgGrid>
              {more && (
                <>
                  <DlgGrid>
                    <DlgField label="Supplier" hint={suppliers.length ? 'Who delivers it.' : 'Add suppliers in the Suppliers card first.'}>
                      <select name="supplierId" defaultValue={product?.supplierId ?? ''} className={dlgInput}>
                        <option value="">No supplier set</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {s.active ? '' : ' (switched off)'}
                          </option>
                        ))}
                      </select>
                    </DlgField>
                    <DlgField label="Units in stock" hint="Leave blank if you don’t track stock.">
                      <input name="stock" type="number" inputMode="numeric" min={0} step={1} defaultValue={product?.stock ?? ''} placeholder="Not tracked" className={dlgInput} />
                    </DlgField>
                  </DlgGrid>
                  <DlgGrid>
                    <DlgField label="Our cost" hint="What the supplier charges us. Only the team sees it; the commission is the price minus this.">
                      <DlgRupee>
                        <input name="costPrice" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={product?.costPrice ?? ''} placeholder="Optional" className={dlgBareInput} />
                      </DlgRupee>
                    </DlgField>
                  </DlgGrid>
                </>
              )}
            </div>
          </DlgSection>

          {more && (
            <DlgSection n={3} title="Photos" sub="JPG, PNG or WebP, up to 3. The first one shows in the catalogue.">
              {keep.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {keep.map((url) => (
                    <span key={url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover bg-[#F4F6FA] shadow-[0_0_0_1px_#E6EAF0]" />
                      <button
                        type="button"
                        onClick={() => setKeep((k) => k.filter((u) => u !== url))}
                        aria-label="Remove photo"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#B42318] text-white flex items-center justify-center shadow"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {keep.length < 3 ? (
                <DlgField label="Add photos" hint={keep.length ? `You can add ${3 - keep.length} more.` : 'Clear photos on a plain background work best.'}>
                  <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className={fileInput} />
                </DlgField>
              ) : (
                <p className="text-[13px] text-[#5B667A]">Three photos is the most. Remove one to add another.</p>
              )}
            </DlgSection>
          )}
        </DlgForm>
      )}
    </FormDialog>
  )
}

/** The catalogue: what hospitals see on Order equipment, with stock, supplier and the commission per unit. */
export function ProductEditor({ products, categories, suppliers, more }: { products: Product[]; categories: Record<EquipmentCategory, string>; suppliers: Supplier[]; more: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]))
  const editingProduct = products.find((p) => p.id === editing)

  if (products.length === 0) return <p className="text-[13px] text-[#5B667A]">No products yet. Hospitals see “The catalogue is being put together” until you add some with Add equipment.</p>
  return (
    <>
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
          {products.map((p) => (
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
          ))}
        </tbody>
      </Table>
      {editingProduct && <ProductDialog product={editingProduct} categories={categories} suppliers={suppliers} more={more} onClose={() => setEditing(null)} />}
    </>
  )
}

/** The page's "Add equipment" button: a new product, live for hospitals straight away. */
export function AddProductButton({ categories, suppliers, more }: { categories: Record<EquipmentCategory, string>; suppliers: Supplier[]; more: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8] active:scale-[0.98] transition-all"
      >
        <Plus className="w-4 h-4" strokeWidth={2.4} aria-hidden /> Add equipment
      </button>
      {open && <ProductDialog categories={categories} suppliers={suppliers} more={more} onClose={() => setOpen(false)} />}
    </>
  )
}

/** Add a supplier, or edit one (`supplier`). */
function SupplierDialog({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    start(async () => {
      const res = await saveSupplier(form)
      if (!res.ok) return setError(res.error)
      router.refresh()
      onClose()
    })
  }
  return (
    <FormDialog
      title={supplier ? `Edit ${supplier.name}` : 'Add supplier'}
      subtitle="Who delivers the products. Choose them on each product; hospitals’ ratings of delivered orders show beside them."
      width={640}
      onClose={onClose}
    >
      <DlgForm onSubmit={submit} onCancel={onClose} pending={pending} error={error} submitLabel={supplier ? 'Save changes' : 'Add supplier'} submitIcon={supplier ? undefined : <Plus className="w-4 h-4" strokeWidth={2.6} />}>
        {supplier && <input type="hidden" name="id" value={supplier.id} />}
        <DlgSection n={1} title="Supplier details" sub="Their name, what they supply and how to reach them.">
          <div className="flex flex-col gap-[18px]">
            <DlgField label="Supplier name" required>
              <input name="name" required defaultValue={supplier?.name} placeholder="e.g. MedEquip Distributors" maxLength={120} className={dlgInput} />
            </DlgField>
            <DlgField label="What they supply">
              <input name="categories" defaultValue={supplier?.categories ?? ''} placeholder="e.g. devices, PPE" maxLength={160} className={dlgInput} />
            </DlgField>
            <DlgGrid>
              <DlgField label="Delivery time">
                <input name="deliveryDays" defaultValue={supplier?.deliveryDays ?? ''} placeholder="e.g. 2 days" maxLength={60} className={dlgInput} />
              </DlgField>
              <DlgField label="Phone">
                <input name="phone" type="tel" inputMode="tel" defaultValue={supplier?.phone ?? ''} placeholder="e.g. 98765 43210" maxLength={30} className={dlgInput} />
              </DlgField>
            </DlgGrid>
            <DlgField label="Email">
              <input name="email" type="email" defaultValue={supplier?.email ?? ''} placeholder="orders@supplier.com" className={dlgInput} />
            </DlgField>
          </div>
        </DlgSection>
      </DlgForm>
    </FormDialog>
  )
}

/** Suppliers, with hospitals' average delivery rating for orders that had their items. */
export function SupplierList({ suppliers, ratings }: { suppliers: Supplier[]; ratings: Record<string, { average: number; count: number }> }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [pending, start] = useTransition()
  const editingSupplier = suppliers.find((s) => s.id === editing)
  return (
    <div>
      {suppliers.length === 0 && <p className="mb-3 text-[13px] text-[#5B667A]">No suppliers yet.</p>}
      <ul>
        {suppliers.map((s) => (
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
        ))}
      </ul>
      <button type="button" onClick={() => setEditing('new')} className={`${outline} mt-3`}>
        <Plus className="w-4 h-4" strokeWidth={2.4} aria-hidden /> Add supplier
      </button>
      {editing === 'new' && <SupplierDialog onClose={() => setEditing(null)} />}
      {editingSupplier && <SupplierDialog supplier={editingSupplier} onClose={() => setEditing(null)} />}
    </div>
  )
}
