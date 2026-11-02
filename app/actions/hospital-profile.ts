'use server'

import { parseLatLng } from '@/lib/geo'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrationHint } from '@/lib/desk-payments'
import { cleanList } from '@/lib/profile-lists'
import { PHOTO_CACHE } from '@/lib/photos'
import { SERVICE_TYPES, serviceDetails, type ServiceType } from '@/lib/hospital-services'

// The hospital profile page (the details patients see on the hospital's public page) and Services & charges.

type Result = { success: true } | { success: false; error: string }
const fail = (error: string): Result => ({ success: false, error })
const NOT_SIGNED_IN = 'Please log in with your hospital account.'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function hospitalContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  return { admin, hospitalId: profile.hospital_id as string }
}

function revalidateHospitalPages(hospitalId: string) {
  for (const path of ['/hospital/profile', '/hospital/dashboard', `/hospitals/${hospitalId}`, '/hospitals', '/']) revalidatePath(path)
}

/** Saves the hospital's public details and, optionally, a new photo. */
export async function updateHospitalProfile(formData: FormData): Promise<Result> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)

  const field = (name: string, max: number) => String(formData.get(name) || '').trim().replace(/\s+/g, ' ').slice(0, max)
  const name = field('name', 120)
  const city = field('city', 80)
  const address = field('address', 300)
  const email = field('email', 200)
  const website = field('website', 200)
  const year = field('established_year', 4)
  if (name.length < 2) return fail('Enter the hospital’s name.')
  if (city.length < 2) return fail('Enter the city.')
  if (address.length < 3) return fail('Enter the street address.')
  if (email && !emailPattern.test(email)) return fail('Enter a valid email address.')
  if (website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(website)) return fail('Enter the website starting with https://, or leave it blank.')
  const established = year ? Number(year) : null
  if (established != null && (!Number.isInteger(established) || established < 1800 || established > new Date().getFullYear())) return fail('Enter the year the hospital was founded, e.g. 1998.')

  const updates: Record<string, unknown> = {
    name,
    city,
    address,
    phone: field('phone', 30) || null,
    emergency_phone: field('emergency_phone', 30) || null,
    website: website || null,
    about: String(formData.get('about') || '').trim().slice(0, 2000) || null,
    established_year: established,
    facilities: cleanList(formData.getAll('facilities').map(String), 40),
    accreditations: cleanList(formData.getAll('accreditations').map(String), 20),
    insurance_accepted: cleanList(formData.getAll('insurance').map(String), 60),
  }
  // contact_email is required on the table, so it only changes when a new one is given.
  if (email) updates.contact_email = email

  // The map pin patients' distances are measured from; blank clears it.
  const pin = parseLatLng(formData.get('latitude'), formData.get('longitude'))
  if (pin === 'invalid') return fail('That map pin is not a valid location. Place it again on the map.')
  const hasPinFields = formData.has('latitude')
  if (hasPinFields) {
    updates.latitude = pin?.lat ?? null
    updates.longitude = pin?.lng ?? null
  }

  const image = formData.get('image')
  if (image instanceof File && image.size > 0) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) return fail('The photo must be a JPG, PNG or WebP image.')
    if (image.size > 5 * 1024 * 1024) return fail('The photo must be under 5 MB.')
    const ext = image.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `hospitals/${ctx.hospitalId}-${Date.now()}.${ext}`
    const { error: uploadError } = await ctx.admin.storage.from('avatars').upload(path, image, { upsert: true, contentType: image.type, cacheControl: PHOTO_CACHE })
    if (uploadError) {
      console.error('updateHospitalProfile image:', uploadError)
      return fail('Could not upload the photo. Please try again.')
    }
    updates.image_url = ctx.admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  const { error } = await ctx.admin.from('hospitals').update(updates).eq('id', ctx.hospitalId)
  if (error && hasPinFields && /latitude|longitude/.test(error.message ?? '')) {
    // The location columns aren't in the database yet: save everything else, and say why the pin wasn't kept.
    delete updates.latitude
    delete updates.longitude
    const retry = await ctx.admin.from('hospitals').update(updates).eq('id', ctx.hospitalId)
    if (retry.error) return fail(migrationHint(retry.error) ?? 'Could not save the hospital details. Please try again.')
    revalidateHospitalPages(ctx.hospitalId)
    return fail('Your details were saved, but the map pin needs the latest database update (supabase/migrations/20261014_facility_locations.sql).')
  }
  if (error) {
    console.error('updateHospitalProfile:', error)
    return fail(migrationHint(error) ?? 'Could not save the hospital details. Please try again.')
  }
  revalidateHospitalPages(ctx.hospitalId)
  revalidatePath('/')
  return { success: true }
}

// ─── Services & charges (/hospital/settings/services) ─────────────────────────────────────────────────────────────
// Names and prices go to available_tests / test_prices, which bookings read. The description, department, type and
// "shown to patients" go to service_details (20261103_hospital_services.sql); until that runs, only names and prices save.

const SERVICES_UPDATE = 'The description, department, type and hiding need the latest database update (supabase/migrations/20261103_hospital_services.sql).'

type Detail = { description?: string; department?: string; type?: ServiceType; hidden?: boolean }

async function loadServices(admin: ReturnType<typeof createAdminClient>, hospitalId: string) {
  // `*`: service_details is missing until the migration runs, and naming it would fail the read.
  const { data, error } = await admin.from('hospitals').select('*').eq('id', hospitalId).maybeSingle()
  const row = (data ?? {}) as { available_tests?: unknown; test_prices?: unknown; service_details?: unknown }
  return {
    error,
    tests: Array.isArray(row.available_tests) ? [...(row.available_tests as string[])] : [],
    prices: { ...((row.test_prices as Record<string, number> | null) ?? {}) },
    // null: the column isn't there yet.
    details: data && 'service_details' in data ? ({ ...serviceDetails(row.service_details) } as Record<string, Detail>) : null,
  }
}

async function writeServices(
  ctx: NonNullable<Awaited<ReturnType<typeof hospitalContext>>>,
  update: { available_tests?: string[]; test_prices?: Record<string, number>; service_details?: Record<string, Detail> },
  what: string,
): Promise<Result> {
  const { error } = await ctx.admin.from('hospitals').update(update).eq('id', ctx.hospitalId)
  if (error) {
    console.error(`${what}:`, error)
    return fail(migrationHint(error) ?? 'Could not save your services. Please try again.')
  }
  revalidateHospitalPages(ctx.hospitalId)
  revalidatePath('/hospital/settings/services')
  return { success: true }
}

const keyOf = (name: string) => name.trim().toLowerCase()
const findName = (tests: string[], prices: Record<string, number>, name: string) =>
  [...tests, ...Object.keys(prices)].find((t) => keyOf(t) === keyOf(name)) ?? null

export type ServiceInput = {
  /** The service being edited; empty to add a new one. */
  originalName?: string | null
  name: string
  price: number
  description?: string | null
  department?: string | null
  type?: string | null
  shown: boolean
}

/** Adds a service to the hospital's services and charges, or saves changes to one (names match without regard to case). */
export async function saveHospitalService(input: ServiceInput): Promise<Result> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const clean = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
  const name = clean(input?.name, 200)
  const price = Number(input?.price)
  const description = clean(input?.description, 200)
  const department = clean(input?.department, 100)
  const type = clean(input?.type, 20)
  const shown = input?.shown !== false
  if (name.length < 2 || name.length > 120) return fail('Enter the service name (2 to 120 characters).')
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) return fail('Enter a price in rupees greater than zero.')
  if (description.length > 160) return fail('Keep the description under 160 characters.')
  if (department.length > 60) return fail('Keep the department name under 60 characters.')
  if (type && !SERVICE_TYPES.includes(type as ServiceType)) return fail('Pick the type: test, scan, lab test or procedure.')

  const { error: loadError, tests, prices, details } = await loadServices(ctx.admin, ctx.hospitalId)
  if (loadError) return fail(migrationHint(loadError) ?? 'Could not load your services. Please try again.')

  const original = input?.originalName ? findName(tests, prices, input.originalName) : null
  if (input?.originalName && !original) return fail('This service was removed. Add it again.')
  const clash = findName(tests, prices, name)
  if (clash && clash !== original) return fail(`“${clash}” is already on your list.`)

  if (original) {
    delete prices[original]
    const at = tests.indexOf(original)
    if (at >= 0) tests[at] = name
    else tests.push(name)
    if (details) delete details[original]
  } else {
    tests.push(name)
  }
  prices[name] = Math.round(price)

  const detail: Detail = {
    ...(description ? { description } : {}),
    ...(department ? { department } : {}),
    ...(type ? { type: type as ServiceType } : {}),
    ...(shown ? {} : { hidden: true }),
  }
  if (details) {
    if (Object.keys(detail).length) details[name] = detail
    else delete details[name]
  }

  const saved = await writeServices(ctx, { available_tests: tests, test_prices: prices, ...(details ? { service_details: details } : {}) }, 'saveHospitalService')
  if (!saved.success) return saved
  return !details && Object.keys(detail).length ? fail(`The name and price were saved. ${SERVICES_UPDATE}`) : saved
}

/** Shows a service to patients (on the hospital page and when booking a doctor) or hides it. */
export async function setHospitalServiceShown(name: string, shown: boolean): Promise<Result> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { error: loadError, tests, prices, details } = await loadServices(ctx.admin, ctx.hospitalId)
  if (loadError) return fail(migrationHint(loadError) ?? 'Could not load your services. Please try again.')
  if (!details) return fail(SERVICES_UPDATE)
  const found = findName(tests, prices, String(name ?? ''))
  if (!found) return fail('This service was removed.')
  const next: Detail = { ...(details[found] ?? {}) }
  if (shown) delete next.hidden
  else next.hidden = true
  if (Object.keys(next).length) details[found] = next
  else delete details[found]
  return writeServices(ctx, { service_details: details }, 'setHospitalServiceShown')
}

export async function removeHospitalService(name: string): Promise<Result> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { error: loadError, tests, prices, details } = await loadServices(ctx.admin, ctx.hospitalId)
  if (loadError) return fail(migrationHint(loadError) ?? 'Could not load your services. Please try again.')
  const key = keyOf(String(name ?? ''))
  for (const t of Object.keys(prices)) if (keyOf(t) === key) delete prices[t]
  if (details) for (const t of Object.keys(details)) if (keyOf(t) === key) delete details[t]
  return writeServices(
    ctx,
    { available_tests: tests.filter((t) => keyOf(t) !== key), test_prices: prices, ...(details ? { service_details: details } : {}) },
    'removeHospitalService',
  )
}
