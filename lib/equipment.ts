import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Order equipment (supabase/migrations/20261114_grow_and_manage.sql): the Consult your Doctor team keeps a catalogue
// (/executive/equipment), hospitals order from it and pay online, and the team confirms, ships and delivers.

export type EquipmentCategory = 'devices' | 'ppe' | 'furniture' | 'lab' | 'other'
export const CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  devices: 'Diagnostic devices',
  ppe: 'PPE and hygiene',
  furniture: 'Beds and furniture',
  lab: 'Lab supplies',
  other: 'Other',
}
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as EquipmentCategory[]

export type OrderStatus = 'awaiting_payment' | 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  awaiting_payment: { label: 'Not paid', color: '#B54708', bg: '#FFF6E8' },
  placed: { label: 'Placed', color: '#2A4DD0', bg: '#EEF3FF' },
  confirmed: { label: 'Packing', color: '#5B667A', bg: '#F1F4F9' },
  shipped: { label: 'Shipped', color: '#B54708', bg: '#FFF6E8' },
  delivered: { label: 'Delivered', color: '#067647', bg: '#ECFDF3' },
  cancelled: { label: 'Cancelled', color: '#98A2B3', bg: '#F1F4F9' },
}

/** Delivery is free from this order value; below it, DELIVERY_FEE is added. */
export const FREE_DELIVERY_FROM = 5000
export const DELIVERY_FEE = 150
export const deliveryFor = (subtotal: number) => (subtotal <= 0 || subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE)

export type Product = {
  id: string
  name: string
  category: EquipmentCategory
  description: string | null
  unit: string
  price: number
  deliveryDays: string | null
  active: boolean
  /** From 20261115_executive_workspace.sql; null/empty before it runs. */
  supplierId: string | null
  /** null: not tracked; 0: out of stock. */
  stock: number | null
  /** What the team pays the supplier, so price minus cost is the commission. */
  costPrice: number | null
  photos: string[]
}

export type Supplier = { id: string; name: string; categories: string | null; deliveryDays: string | null; phone: string | null; email: string | null; active: boolean }

export type OrderItem = { name: string; unit: string; price: number; quantity: number; supplierId?: string | null }
export type Order = {
  id: string
  code: string
  hospitalId: string
  status: OrderStatus
  subtotal: number
  deliveryFee: number
  total: number
  note: string | null
  teamNote: string | null
  paidAt: string | null
  createdAt: string
  items: OrderItem[]
  /** What the order cost from suppliers, when every item had a cost price. */
  costTotal: number | null
  /** The hospital's rating of the delivery, 1 to 5. */
  rating: number | null
  ratingNote: string | null
}

type ProductRow = {
  id: string
  name: string
  category: EquipmentCategory
  description: string | null
  unit: string
  price: number | string
  delivery_days: string | null
  is_active: boolean
  supplier_id?: string | null
  stock?: number | null
  cost_price?: number | string | null
  photos?: string[] | null
}
type OrderRow = {
  id: string
  code: string
  hospital_id: string
  status: OrderStatus
  subtotal: number | string
  delivery_fee: number | string
  total: number | string
  note: string | null
  team_note: string | null
  paid_at: string | null
  created_at: string
  cost_total?: number | string | null
  rating?: number | null
  rating_note?: string | null
  equipment_order_items: { name: string; unit: string; price: number | string; quantity: number; supplier_id?: string | null }[] | null
}

export const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  category: r.category,
  description: r.description,
  unit: r.unit,
  price: Number(r.price) || 0,
  deliveryDays: r.delivery_days,
  active: r.is_active,
  supplierId: r.supplier_id ?? null,
  stock: r.stock ?? null,
  costPrice: r.cost_price == null ? null : Number(r.cost_price),
  photos: r.photos ?? [],
})

export const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  code: r.code,
  hospitalId: r.hospital_id,
  status: r.status,
  subtotal: Number(r.subtotal) || 0,
  deliveryFee: Number(r.delivery_fee) || 0,
  total: Number(r.total) || 0,
  note: r.note,
  teamNote: r.team_note,
  paidAt: r.paid_at,
  createdAt: r.created_at,
  items: (r.equipment_order_items ?? []).map((i) => ({ name: i.name, unit: i.unit, price: Number(i.price) || 0, quantity: i.quantity, supplierId: i.supplier_id ?? null })),
  costTotal: r.cost_total == null ? null : Number(r.cost_total),
  rating: r.rating ?? null,
  ratingNote: r.rating_note ?? null,
})

export const PRODUCT_COLUMNS = 'id, name, category, description, unit, price, delivery_days, is_active'
// With 20261115_executive_workspace.sql: suppliers, stock, cost and photos; ratings and cost on orders.
const PRODUCT_COLUMNS_MORE = `${PRODUCT_COLUMNS}, supplier_id, stock, cost_price, photos`
export const ORDER_COLUMNS = 'id, code, hospital_id, status, subtotal, delivery_fee, total, note, team_note, paid_at, created_at, equipment_order_items ( name, unit, price, quantity )'
const ORDER_COLUMNS_MORE = 'id, code, hospital_id, status, subtotal, delivery_fee, total, note, team_note, paid_at, created_at, cost_total, rating, rating_note, equipment_order_items ( name, unit, price, quantity, supplier_id )'

/**
 * The catalogue (only what's on sale unless `all`). `ready` is false until the 20261114 migration has run; `more` is
 * false until 20261115 adds suppliers, stock, cost and photos.
 */
export async function loadProducts(admin: Admin, { all = false } = {}): Promise<{ ready: boolean; more: boolean; products: Product[] }> {
  const run = (columns: string) => {
    let q = admin.from('equipment_products').select(columns).order('category').order('name').limit(1000)
    if (!all) q = q.eq('is_active', true)
    return q
  }
  const first = await run(PRODUCT_COLUMNS_MORE)
  if (!first.error) return { ready: true, more: true, products: ((first.data ?? []) as unknown as ProductRow[]).map(toProduct) }
  const { data, error } = await run(PRODUCT_COLUMNS)
  if (error) return { ready: false, more: false, products: [] }
  return { ready: true, more: false, products: ((data ?? []) as unknown as ProductRow[]).map(toProduct) }
}

/** A hospital's orders (or everyone's, for the team), newest first. */
export async function loadOrders(admin: Admin, hospitalId?: string, limit = 50): Promise<Order[]> {
  const run = (columns: string) => {
    let q = admin.from('equipment_orders').select(columns).order('created_at', { ascending: false }).limit(limit)
    if (hospitalId) q = q.eq('hospital_id', hospitalId)
    return q
  }
  const first = await run(ORDER_COLUMNS_MORE)
  if (!first.error) return ((first.data ?? []) as unknown as OrderRow[]).map(toOrder)
  const { data, error } = await run(ORDER_COLUMNS)
  if (error) return []
  return ((data ?? []) as unknown as OrderRow[]).map(toOrder)
}

/** The team's suppliers. `ready` is false until 20261115_executive_workspace.sql has run. */
export async function loadSuppliers(admin: Admin): Promise<{ ready: boolean; suppliers: Supplier[] }> {
  const { data, error } = await admin.from('equipment_suppliers').select('id, name, categories, delivery_days, phone, email, is_active').order('name').limit(500)
  if (error) return { ready: false, suppliers: [] }
  return {
    ready: true,
    suppliers: ((data ?? []) as { id: string; name: string; categories: string | null; delivery_days: string | null; phone: string | null; email: string | null; is_active: boolean }[]).map((r) => ({
      id: r.id,
      name: r.name,
      categories: r.categories,
      deliveryDays: r.delivery_days,
      phone: r.phone,
      email: r.email,
      active: r.is_active,
    })),
  }
}

/** Each supplier's average delivery rating from hospitals' ratings of orders that had their items. */
export function supplierRatings(orders: Order[]): Map<string, { average: number; count: number }> {
  const sums = new Map<string, { total: number; count: number }>()
  for (const o of orders) {
    if (!o.rating) continue
    for (const id of new Set(o.items.map((i) => i.supplierId).filter(Boolean) as string[])) {
      const s = sums.get(id) ?? { total: 0, count: 0 }
      s.total += o.rating
      s.count++
      sums.set(id, s)
    }
  }
  return new Map([...sums].map(([id, s]) => [id, { average: Math.round((s.total / s.count) * 10) / 10, count: s.count }]))
}

/** "Out of stock", "Only 3 left", or nothing while there's plenty (or stock isn't tracked). */
export function stockLabel(stock: number | null): string | null {
  if (stock == null) return null
  if (stock <= 0) return 'Out of stock'
  if (stock <= 5) return `Only ${stock} left`
  return null
}

/** "12 items", "1 hospital bed" */
export function itemsLine(items: OrderItem[]) {
  if (items.length === 1 && items[0].quantity === 1) return `1 ${items[0].name.toLowerCase()}`
  const n = items.reduce((s, i) => s + i.quantity, 0)
  return `${n} ${n === 1 ? 'item' : 'items'}`
}
