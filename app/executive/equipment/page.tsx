import type { Metadata } from 'next'
import { Boxes, PackageCheck, Truck } from 'lucide-react'
import { formatINR, formatShortDate, istDateKey } from '@/components/patient/format'
import { CATEGORY_LABEL, ORDER_STATUS, loadOrders, loadProducts, loadSuppliers, supplierRatings, type Order } from '@/lib/equipment'
import { currentTime, requireExecutivePage } from '../_lib/ops'
import { Card, EmptyState, ExePage, Note, Stat, Stats, Status, plural } from '../_components/ui'
import { OrderSteps, ProductEditor, SupplierList } from '../_components/EquipmentDesk'

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
  const open = orders.filter((o) => ['placed', 'confirmed', 'shipped'].includes(o.status))
  const done = orders.filter((o) => !open.includes(o)).slice(0, 30)
  const placed = orders.filter((o) => o.status === 'placed').length
  const moving = orders.filter((o) => o.status === 'confirmed' || o.status === 'shipped').length
  // Delivered orders don't carry a delivery date, so this counts orders placed this month that are delivered.
  const deliveredThisMonth = orders.filter((o) => o.status === 'delivered' && istDateKey(o.createdAt).slice(0, 7) === month).length
  const onSale = products.filter((p) => p.active).length
  const outOfStock = products.filter((p) => p.active && p.stock === 0).length
  const rated = orders.filter((o) => o.rating)

  const orderRow = (o: Order, actions: boolean) => (
    <li key={o.id} className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-6 py-4 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[12.5px] font-bold text-[#2A4DD0]">{o.code}</span>
          <span className="text-[14px] font-extrabold">{nameOf.get(o.hospitalId) ?? 'Hospital'}</span>
          <Status label={ORDER_STATUS[o.status].label} color={ORDER_STATUS[o.status].color} />
        </p>
        <p className="mt-0.5 text-[12.5px] text-[#5B667A]">
          {formatINR(o.total)} · {formatShortDate(o.createdAt)}
          {o.paidAt ? ` · paid ${formatShortDate(o.paidAt)}` : ' · not paid'}
          {o.deliveryFee ? ` · delivery ${formatINR(o.deliveryFee)}` : ' · free delivery'}
        </p>
        <ul className="mt-1.5 text-[13px]">
          {o.items.map((i) => (
            <li key={i.name}>
              {i.quantity} × {i.name}{' '}
              <span className="text-[#5B667A]">
                ({i.unit}, {formatINR(i.price)}
                {i.supplierId && supplierName.get(i.supplierId) ? `, from ${supplierName.get(i.supplierId)}` : ''})
              </span>
            </li>
          ))}
        </ul>
        {o.rating && (
          <p className="mt-1 text-[12.5px] text-[#5B667A]">
            Hospital’s rating: <span className="text-[#F59E0B]">{'★'.repeat(o.rating)}</span>
            <span className="text-[#D6DDE8]">{'★'.repeat(5 - o.rating)}</span>
            {o.ratingNote ? ` · ${o.ratingNote}` : ''}
          </p>
        )}
        {o.note && <p className="mt-1 text-[12.5px] text-[#5B667A]">Hospital’s note: {o.note}</p>}
        {o.teamNote && <p className="mt-1 text-[12.5px] text-[#5B667A]">Our note: {o.teamNote}</p>}
      </div>
      {actions && <OrderSteps orderId={o.id} status={o.status} />}
    </li>
  )

  return (
    <ExePage name={profile.fullName} title="Equipment orders" subtitle="Add equipment hospitals can buy, and follow every order from payment to delivery">
      <Stats>
        <Stat label="New orders" value={placed} note="Paid, need confirming" tone={placed ? 'warn' : undefined} />
        <Stat label="In transit" value={moving} note="Packing or shipped" />
        <Stat label="Delivered" value={deliveredThisMonth} note="Of this month’s orders" />
        <Stat label="Products listed" value={onSale} note={more ? `${outOfStock} out of stock · ${products.length - onSale} switched off` : `${products.length - onSale} switched off`} tone={outOfStock ? 'warn' : undefined} />
      </Stats>

      <Card title="Orders to handle" sub="Confirm each paid order, then mark it shipped and delivered. Oldest at the bottom.">
        {open.length === 0 ? <EmptyState icon={Truck}>Nothing to handle.</EmptyState> : <ul>{open.map((o) => orderRow(o, true))}</ul>}
        <div className="mt-4">
          <Note>Cancelling a paid order means refunding it from the Razorpay dashboard.</Note>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <Card title="Catalogue" sub={`${plural(products.length, 'product')} · what hospitals see on their Order equipment page. Switch a product off to stop new orders; past orders keep their prices.`}>
          <ProductEditor products={products} categories={CATEGORY_LABEL} suppliers={suppliers} more={more} />
          {!more && (
            <div className="mt-4">
              <Note tone="amber">Suppliers, stock, cost prices and photos start once supabase/migrations/20261115_executive_workspace.sql has run.</Note>
            </div>
          )}
        </Card>
        <Card title="Suppliers" sub={rated.length ? `Ratings from ${rated.length} delivered ${rated.length === 1 ? 'order' : 'orders'} that hospitals rated` : 'Hospitals rate each delivered order; the ratings show here'}>
          {supplierRes.ready ? <SupplierList suppliers={suppliers} ratings={ratings} /> : <p className="text-[13px] text-[#5B667A]">Starts once the 20261115 migration has run.</p>}
        </Card>
      </div>

      <Card title="Recent orders" sub="Delivered, cancelled and unpaid">
        {done.length === 0 ? <EmptyState icon={PackageCheck}>No orders yet.</EmptyState> : <ul>{done.map((o) => orderRow(o, o.status === 'awaiting_payment'))}</ul>}
      </Card>
    </ExePage>
  )
}
