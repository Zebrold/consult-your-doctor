'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { CATEGORIES, deliveryFor, type OrderStatus } from '@/lib/equipment'

// Order equipment. A hospital places an order from the team's catalogue: prices and delivery are worked out here from
// the catalogue, never taken from the browser, and the order waits for its online payment (lib/purchase-client.ts).
// The team keeps the catalogue and moves paid orders along (/executive/equipment).

type Result = { ok: true } | { ok: false; error: string }
const NOT_SET_UP = 'Equipment ordering is being set up. Please try again later.'
const uuid = z.string().uuid()

async function hospitalCaller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  return { user, admin, hospitalId: profile.hospital_id as string }
}

const lineSchema = z.array(z.object({ productId: uuid, quantity: z.number().int().min(1).max(1000) })).min(1, 'Add something to the order.').max(100)

export async function placeEquipmentOrder(lines: { productId: string; quantity: number }[], note: string): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const ctx = await hospitalCaller()
  if (!ctx) return { ok: false, error: 'Please log in with your hospital account.' }
  const parsed = lineSchema.safeParse(lines)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const qty = new Map<string, number>()
  for (const l of parsed.data) qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.quantity)

  type Row = { id: string; name: string; unit: string; price: number | string; is_active: boolean; stock?: number | null; cost_price?: number | string | null; supplier_id?: string | null }
  // Stock, cost and supplier come with 20261115_executive_workspace.sql; before it, orders work as they did.
  const ids = [...qty.keys()]
  const full = await ctx.admin.from('equipment_products').select('id, name, unit, price, is_active, stock, cost_price, supplier_id').in('id', ids)
  const more = !full.error
  const res = more ? { data: full.data as unknown, error: null } : await ctx.admin.from('equipment_products').select('id, name, unit, price, is_active').in('id', ids)
  if (res.error) return { ok: false, error: NOT_SET_UP }
  const list = (res.data ?? []) as unknown as Row[]
  if (list.length !== qty.size || list.some((p) => !p.is_active)) return { ok: false, error: 'Something in your order is no longer available. Please check the order.' }
  const short = list.find((p) => p.stock != null && qty.get(p.id)! > p.stock)
  if (short) return { ok: false, error: short.stock ? `Only ${short.stock} of ${short.name} left. Please lower the quantity.` : `${short.name} is out of stock. Please remove it.` }

  const items = list.map((p) => ({ product_id: p.id, name: p.name, unit: p.unit, price: Number(p.price), quantity: qty.get(p.id)!, ...(more ? { supplier_id: p.supplier_id ?? null } : {}) }))
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100
  const deliveryFee = deliveryFor(subtotal)
  // The commission is the price over what the team pays the supplier; only known when every item has a cost price.
  const costTotal = more && list.every((p) => p.cost_price != null) ? Math.round(list.reduce((s, p) => s + Number(p.cost_price) * qty.get(p.id)!, 0) * 100) / 100 : null
  const { data: order, error: orderError } = await ctx.admin
    .from('equipment_orders')
    .insert({ hospital_id: ctx.hospitalId, placed_by: ctx.user.id, subtotal, delivery_fee: deliveryFee, total: subtotal + deliveryFee, note: note.trim().slice(0, 500) || null, ...(costTotal != null ? { cost_total: costTotal } : {}) })
    .select('id')
    .single()
  if (orderError || !order) return { ok: false, error: NOT_SET_UP }
  const { error: itemsError } = await ctx.admin.from('equipment_order_items').insert(items.map((i) => ({ ...i, order_id: order.id })))
  if (itemsError) {
    await ctx.admin.from('equipment_orders').delete().eq('id', order.id)
    return { ok: false, error: 'Could not place the order. Please try again.' }
  }
  revalidatePath('/hospital/equipment')
  return { ok: true, orderId: order.id }
}

/** Cancels an order that hasn't been paid. */
export async function cancelUnpaidOrder(orderId: string): Promise<Result> {
  const ctx = await hospitalCaller()
  if (!ctx || !uuid.safeParse(orderId).success) return { ok: false, error: 'Order not found.' }
  const { error } = await ctx.admin
    .from('equipment_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('hospital_id', ctx.hospitalId)
    .eq('status', 'awaiting_payment')
  if (error) return { ok: false, error: 'Could not cancel it. Please try again.' }
  revalidatePath('/hospital/equipment')
  return { ok: true }
}

/** The hospital rates a delivered order (1 to 5); the ratings make up each supplier's rating for the team. */
export async function rateOrder(orderId: string, rating: number, note: string): Promise<Result> {
  const ctx = await hospitalCaller()
  if (!ctx || !uuid.safeParse(orderId).success) return { ok: false, error: 'Order not found.' }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Choose 1 to 5 stars.' }
  const { data, error } = await ctx.admin
    .from('equipment_orders')
    .update({ rating, rating_note: note.trim().slice(0, 500) || null, rated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('hospital_id', ctx.hospitalId)
    .eq('status', 'delivered')
    .select('id')
  if (error) return { ok: false, error: 'Rating deliveries is being set up. Please try again later.' }
  if (!data?.length) return { ok: false, error: 'Only delivered orders can be rated.' }
  revalidatePath('/hospital/equipment')
  revalidatePath('/executive/equipment')
  return { ok: true }
}

// --- The team (/executive/equipment) ------------------------------------------------------------------------------

async function executive() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'executive' ? { user, admin } : null
}

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Add the product name.').max(120),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  description: z.string().trim().max(300).optional(),
  unit: z.string().trim().min(2, 'Add the unit, e.g. "per unit" or "box of 100".').max(40),
  price: z.coerce.number().positive('Add a price.').max(10_000_000),
  deliveryDays: z.string().trim().max(60).optional(),
  supplierId: z.string().uuid().optional().or(z.literal('')),
  stock: z.union([z.literal(''), z.coerce.number().int().min(0).max(1_000_000)]).optional(),
  costPrice: z.union([z.literal(''), z.coerce.number().min(0).max(10_000_000)]).optional(),
})

const PHOTO_BUCKET = 'equipment-photos'
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Uploads up to three photos for a product to the public equipment-photos bucket; returns their public URLs. */
async function uploadPhotos(admin: ReturnType<typeof createAdminClient>, productId: string, files: File[]): Promise<string[] | { error: string }> {
  const urls: string[] = []
  for (const file of files) {
    const ext = PHOTO_TYPES[file.type]
    if (!ext) return { error: 'Photos must be JPG, PNG or WebP.' }
    if (file.size > 3 * 1024 * 1024) return { error: 'Each photo must be 3 MB or smaller.' }
    const path = `products/${productId}/${randomUUID()}.${ext}`
    const { error } = await admin.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type })
    if (error) return { error: 'Product photos aren’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.' }
    urls.push(admin.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl)
  }
  return urls
}

export async function saveProduct(form: FormData): Promise<Result> {
  const ctx = await executive()
  if (!ctx) return { ok: false, error: 'Only the operations team can edit the catalogue.' }
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'))
  const parsed = productSchema.safeParse(fields)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const photos = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  const keep = form.getAll('keepPhoto').map(String)
  const row = { name: d.name, category: d.category, description: d.description || null, unit: d.unit, price: d.price, delivery_days: d.deliveryDays || null, updated_at: new Date().toISOString() }
  const extra = {
    supplier_id: d.supplierId || null,
    stock: d.stock === '' || d.stock === undefined ? null : d.stock,
    cost_price: d.costPrice === '' || d.costPrice === undefined ? null : d.costPrice,
  }
  const wantsMore = form.has('supplierId') || form.has('stock') || form.has('costPrice') || photos.length > 0
  // Save with suppliers, stock and cost when the 20261115 migration has run; the plain product otherwise.
  const save = async (values: Record<string, unknown>) =>
    d.id ? ctx.admin.from('equipment_products').update(values).eq('id', d.id).select('id').single() : ctx.admin.from('equipment_products').insert(values).select('id').single()
  let saved = await save(wantsMore ? { ...row, ...extra } : row)
  if (saved.error && wantsMore) saved = await save(row)
  if (saved.error || !saved.data) return { ok: false, error: NOT_SET_UP }
  const id = (saved.data as { id: string }).id

  if (wantsMore && (photos.length || form.has('keepPhoto') || d.id)) {
    const { data: current } = await ctx.admin.from('equipment_products').select('photos').eq('id', id).maybeSingle()
    const existing = ((current as { photos?: string[] | null } | null)?.photos ?? []).filter((url) => !form.has('keepPhoto') || keep.includes(url))
    if (photos.length) {
      if (existing.length + photos.length > 3) return { ok: false, error: 'Up to 3 photos per product.' }
      const uploaded = await uploadPhotos(ctx.admin, id, photos)
      if ('error' in uploaded) return { ok: false, error: uploaded.error }
      existing.push(...uploaded)
    }
    await ctx.admin.from('equipment_products').update({ photos: existing }).eq('id', id)
  }
  revalidatePath('/executive/equipment')
  revalidatePath('/hospital/equipment')
  return { ok: true }
}

export async function setProductActive(productId: string, active: boolean): Promise<Result> {
  const ctx = await executive()
  if (!ctx || !uuid.safeParse(productId).success) return { ok: false, error: 'Not allowed.' }
  const { error } = await ctx.admin.from('equipment_products').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', productId)
  if (error) return { ok: false, error: NOT_SET_UP }
  revalidatePath('/executive/equipment')
  revalidatePath('/hospital/equipment')
  return { ok: true }
}

/** Paid orders move forward one step at a time; any order not yet delivered can be cancelled (refund from Razorpay). */
const NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  awaiting_payment: ['cancelled'],
}

export async function setOrderStatus(orderId: string, status: OrderStatus, teamNote: string): Promise<Result> {
  const ctx = await executive()
  if (!ctx || !uuid.safeParse(orderId).success) return { ok: false, error: 'Not allowed.' }
  const { data: order } = await ctx.admin.from('equipment_orders').select('status').eq('id', orderId).maybeSingle()
  if (!order) return { ok: false, error: 'Order not found.' }
  if (!NEXT[order.status as OrderStatus]?.includes(status)) return { ok: false, error: 'That step isn’t possible for this order.' }
  const { error } = await ctx.admin
    .from('equipment_orders')
    .update({ status, team_note: teamNote.trim().slice(0, 500) || null, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', order.status)
  if (error) return { ok: false, error: 'Could not update the order. Please try again.' }
  revalidatePath('/executive/equipment')
  return { ok: true }
}

const supplierSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Add the supplier’s name.').max(120),
  categories: z.string().trim().max(160).optional(),
  deliveryDays: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Check the email address.')]).optional(),
})

/** Adds or edits a supplier the team buys equipment from. */
export async function saveSupplier(form: FormData): Promise<Result> {
  const ctx = await executive()
  if (!ctx) return { ok: false, error: 'Only the operations team can edit suppliers.' }
  const parsed = supplierSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const row = { name: d.name, categories: d.categories || null, delivery_days: d.deliveryDays || null, phone: d.phone || null, email: d.email || null }
  const { error } = d.id ? await ctx.admin.from('equipment_suppliers').update(row).eq('id', d.id) : await ctx.admin.from('equipment_suppliers').insert(row)
  if (error) return { ok: false, error: 'Suppliers aren’t switched on yet. Run supabase/migrations/20261115_executive_workspace.sql.' }
  revalidatePath('/executive/equipment')
  return { ok: true }
}

export async function setSupplierActive(supplierId: string, active: boolean): Promise<Result> {
  const ctx = await executive()
  if (!ctx || !uuid.safeParse(supplierId).success) return { ok: false, error: 'Not allowed.' }
  const { error } = await ctx.admin.from('equipment_suppliers').update({ is_active: active }).eq('id', supplierId)
  if (error) return { ok: false, error: 'Could not change the supplier.' }
  revalidatePath('/executive/equipment')
  return { ok: true }
}
