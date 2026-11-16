import type { Metadata } from 'next'
import { Boxes, Plus } from 'lucide-react'
import { formatINR, formatShortDate, istDateKey } from '@/components/patient/format'
import { CATEGORY_LABEL, ORDER_STATUS, loadOrders, loadProducts, loadSuppliers, supplierRatings, type Order } from '@/lib/equipment'
import { currentTime, requireExecutivePage } from '../_lib/ops'
import { Card, EmptyState, ExePage, Note, Stat, Stats, btnPrimary, plural } from '../_components/ui'
import { AddProductForm, OrderTable, ProductEditor, SupplierList, type OrderRow } from '../_components/EquipmentDesk'

export const metadata: Metadata = { title: 'Equipment orders' }
export const dynamic = 'force-dynamic'

/** Equipment orders after DeskExeOrders: hospitals' orders from payment to delivery, and the catalogue they order from. */
export default async function ExecutiveEquipmentPage() {
  const { admin, profile } = await requireExecutivePage('equipment')
  const [{ ready, more, products }, orders, { data: hospitals }, supplierRes] = await Promise.all([
    loadProducts(admin, { all: true }),
    loadOrders(admin, undefined, 200),
    admin.from('hospitals').select('id, name, city'),
    loadSuppliers(admin),
  ])
  const suppliers = supplierRes.suppliers
  const supplierName = new Map(suppliers.map((x) => [x.id, x.name]))
  const ratings = Object.fromEntries(supplierRatings(orders))
  const nameOf = new Map(((hospitals ?? []) as { id: string; name: string | null; city: string | null }[]).map((h) => [h.id, [h.name, h.city].filter(Boolean).join(', ')]))

  if (!ready) {
    return (
      <ExePage name={profile.fullName} title="Equipment orders" subtitle="The catalogue hospitals order from, and their orders">
        <Card title="Equipment ordering isn’t switched on yet">
          <EmptyState icon={Boxes}>Run supabase/migrations/20261114_grow_and_manage.sql to start equipment ordering.</EmptyState>
        </Card>
      </ExePage>
    )
  }

  const month = istDateKey(currentTime()).slice(0, 7)
  const placed = orders.filter((o) => o.status === 'placed').length
  const moving = orders.filter((o) => o.status === 'confirmed' || o.status === 'shipped').length
  // Delivered orders don't carry a delivery date, so this counts orders placed this month that are delivered.
  const deliveredThisMonth = orders.filter((o) => o.status === 'delivered' && istDateKey(o.createdAt).slice(0, 7) === month).length
  const onSale = products.filter((p) => p.active).length
  const outOfStock = products.filter((p) => p.active && p.stock === 0).length
  const rated = orders.filter((o) => o.rating)

  const orderRows: OrderRow[] = orders.map((o: Order) => {
    const units = o.items.reduce((n, i) => n + i.quantity, 0)
    const names = o.items.map((i) => i.name)
    const supplierNames = [...new Set(o.items.map((i) => (i.supplierId ? supplierName.get(i.supplierId) : undefined)).filter((x): x is string => !!x))]
    return {
      id: o.id,
      code: o.code,
      hospital: nameOf.get(o.hospitalId) || 'Hospital',
      status: o.status,
      statusLabel: ORDER_STATUS[o.status].label,
      statusColor: ORDER_STATUS[o.status].color,
      total: o.total,
      items: `${plural(units, 'item')} · ${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}`,
      suppliers: supplierNames.join(', '),
      meta: [
        formatShortDate(o.createdAt),
        o.paidAt ? `paid ${formatShortDate(o.paidAt)}` : 'not paid',
        o.deliveryFee ? `delivery ${formatINR(o.deliveryFee)}` : 'free delivery',
      ].join(' · '),
      rating: o.rating ?? null,
      notes: [o.ratingNote ? `Rating note: ${o.ratingNote}` : '', o.note ? `Hospital’s note: ${o.note}` : '', o.teamNote ? `Our note: ${o.teamNote}` : ''].filter(Boolean),
    }
  })

  return (
    <ExePage
      name={profile.fullName}
      title="Equipment orders"
      subtitle="Add equipment hospitals can buy, and follow every order from payment to delivery"
      actions={
        <a href="#add-equipment" className={btnPrimary}>
          <Plus className="w-4 h-4" strokeWidth={2.4} aria-hidden /> Add equipment
        </a>
      }
    >
      <Stats>
        <Stat label="New orders" value={placed} note="Paid, need confirming" tone={placed ? 'warn' : undefined} />
        <Stat label="In transit" value={moving} note="Packing or shipped" />
        <Stat label="Delivered" value={deliveredThisMonth} note="Of this month’s orders" />
        <Stat label="Products listed" value={onSale} note={more ? `${outOfStock} out of stock · ${products.length - onSale} switched off` : `${products.length - onSale} switched off`} tone={outOfStock ? 'warn' : undefined} />
      </Stats>

      <Card title="Orders from hospitals" sub="Confirm each paid order, then mark it shipped and delivered.">
        <OrderTable orders={orderRows} />
        <div className="mt-4">
          <Note>Cancelling a paid order means refunding it from the Razorpay dashboard.</Note>
        </div>
      </Card>

      <Card title="Catalogue" sub={`${plural(products.length, 'product')} · what hospitals see on their Order equipment page. Switch a product off to stop new orders; past orders keep their prices.`}>
        <ProductEditor products={products} categories={CATEGORY_LABEL} suppliers={suppliers} more={more} />
        {!more && (
          <div className="mt-4">
            <Note tone="amber">Suppliers, stock, cost prices and photos start once supabase/migrations/20261115_executive_workspace.sql has run.</Note>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-5 items-start">
        <Card id="add-equipment" title="Add equipment" sub="New products go live for hospitals straight away">
          <AddProductForm categories={CATEGORY_LABEL} suppliers={suppliers} more={more} />
        </Card>
        <Card title="Suppliers" sub={rated.length ? `Ratings from ${rated.length} delivered ${rated.length === 1 ? 'order' : 'orders'} that hospitals rated` : 'Hospitals rate each delivered order; the ratings show here'}>
          {supplierRes.ready ? <SupplierList suppliers={suppliers} ratings={ratings} /> : <p className="text-[13px] text-[#5B667A]">Starts once the 20261115 migration has run.</p>}
        </Card>
      </div>
    </ExePage>
  )
}
