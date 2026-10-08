'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { REPORT_BUCKET, REPORT_MAX_BYTES, REPORT_TYPES, reportPath } from '@/lib/lab-reports'
import { notifyReportReady } from '@/lib/notify/patient'

type Result = { success: true } | { success: false; error: string }

const fail = (error: string): Result => ({ success: false, error })

/** Every action works only on the center the signed-in diagnostic staff member belongs to. */
async function labContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, diagnostic_center_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'diagnostic_admin' || !profile.diagnostic_center_id) return null
  return { admin, centerId: profile.diagnostic_center_id as string }
}

function revalidateLabPages() {
  for (const path of ['/diagnostic-center/dashboard', '/diagnostic-center/schedule', '/diagnostic-center/patients', '/diagnostic-center/profile']) {
    revalidatePath(path)
  }
}

async function loadTestList(admin: ReturnType<typeof createAdminClient>, centerId: string) {
  const { data } = await admin.from('diagnostic_centers').select('available_tests, test_prices').eq('id', centerId).maybeSingle()
  return {
    tests: Array.isArray(data?.available_tests) ? [...(data.available_tests as string[])] : [],
    prices: { ...((data?.test_prices as Record<string, number> | null) ?? {}) },
  }
}

/** Adds a test to the center's menu, or updates its price (names match without regard to case). */
export async function saveLabTest(name: string, price: number): Promise<Result> {
  const ctx = await labContext()
  if (!ctx) return fail('Please sign in with your diagnostic center account.')

  const testName = name.trim().replace(/\s+/g, ' ')
  if (testName.length < 2 || testName.length > 120) return fail('Enter a test name (2 to 120 characters).')
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) return fail('Enter a price in rupees greater than zero.')

  const { tests, prices } = await loadTestList(ctx.admin, ctx.centerId)
  const existing = tests.find((t) => t.toLowerCase() === testName.toLowerCase())
  if (existing) {
    delete prices[existing]
    tests[tests.indexOf(existing)] = testName
  } else {
    tests.push(testName)
  }
  prices[testName] = Math.round(price)

  const { error } = await ctx.admin.from('diagnostic_centers').update({ available_tests: tests, test_prices: prices }).eq('id', ctx.centerId)
  if (error) {
    console.error('saveLabTest:', error)
    return fail('Could not save the test. Please try again.')
  }
  revalidateLabPages()
  revalidatePath('/find')
  return { success: true }
}

export async function removeLabTest(name: string): Promise<Result> {
  const ctx = await labContext()
  if (!ctx) return fail('Please sign in with your diagnostic center account.')

  const { tests, prices } = await loadTestList(ctx.admin, ctx.centerId)
  const key = name.toLowerCase()
  for (const t of Object.keys(prices)) if (t.toLowerCase() === key) delete prices[t]
  const remaining = tests.filter((t) => t.toLowerCase() !== key)

  const { error } = await ctx.admin.from('diagnostic_centers').update({ available_tests: remaining, test_prices: prices }).eq('id', ctx.centerId)
  if (error) {
    console.error('removeLabTest:', error)
    return fail('Could not remove the test. Please try again.')
  }
  revalidateLabPages()
  revalidatePath('/find')
  return { success: true }
}

/** Marks a paid booking as arrived with the sample taken. */
export async function checkInLabBooking(bookingId: string): Promise<Result> {
  const ctx = await labContext()
  if (!ctx) return fail('Please sign in with your diagnostic center account.')

  const { data, error } = await ctx.admin
    .from('diagnostic_bookings')
    .update({ status: 'visited' })
    .eq('id', bookingId)
    .eq('center_id', ctx.centerId)
    .eq('status', 'confirmed')
    .select('id')
  if (error) {
    console.error('checkInLabBooking:', error)
    return fail('Could not check the patient in. Please try again.')
  }
  if (!data?.length) return fail('Only paid bookings that haven’t been checked in can be checked in.')
  revalidateLabPages()
  return { success: true }
}

/** Stores the report for a booking and marks it sent, which makes it available to the patient. */
export async function uploadLabReport(formData: FormData): Promise<Result> {
  const ctx = await labContext()
  if (!ctx) return fail('Please sign in with your diagnostic center account.')

  const bookingId = String(formData.get('bookingId') || '')
  const file = formData.get('report')
  if (!(file instanceof File) || file.size === 0) return fail('Choose the report file to upload.')
  if (!REPORT_TYPES.includes(file.type)) return fail('Upload the report as a PDF, JPG, PNG or WebP file.')
  if (file.size > REPORT_MAX_BYTES) return fail('The report must be under 5 MB.')

  const { data: booking } = await ctx.admin
    .from('diagnostic_bookings')
    .select('id, status, patient_id, diagnostic_centers ( name )')
    .eq('id', bookingId)
    .eq('center_id', ctx.centerId)
    .maybeSingle()
  if (!booking) return fail('Booking not found.')
  if (!['confirmed', 'visited', 'completed', 'report_sent'].includes(booking.status)) {
    return fail('Reports can only be added to paid bookings.')
  }

  const { error: uploadError } = await ctx.admin.storage
    .from(REPORT_BUCKET)
    .upload(reportPath(ctx.centerId, bookingId), file, { upsert: true, contentType: file.type })
  if (uploadError) {
    console.error('uploadLabReport storage:', uploadError)
    return fail('Could not upload the report. Please try again.')
  }

  const { error } = await ctx.admin.from('diagnostic_bookings').update({ status: 'report_sent' }).eq('id', bookingId).eq('center_id', ctx.centerId)
  if (error) {
    console.error('uploadLabReport status:', error)
    return fail('The report was uploaded but the booking could not be updated. Please try again.')
  }

  // Send the report to the patient on WhatsApp, and by email when they gave an address.
  const center = (Array.isArray(booking.diagnostic_centers) ? booking.diagnostic_centers[0] : booking.diagnostic_centers) as { name: string } | null
  const ext = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type] ?? 'pdf'
  notifyReportReady({
    patientId: booking.patient_id,
    what: 'lab report',
    from: center?.name ?? 'your diagnostic centre',
    path: reportPath(ctx.centerId, bookingId),
    filename: `Lab-Report-${bookingId.slice(0, 8).toUpperCase()}.${ext}`,
    contentType: file.type,
    file: new Uint8Array(await file.arrayBuffer()),
  })
  revalidateLabPages()
  revalidatePath('/patient/profile')
  return { success: true }
}

/** Updates the details patients see when they find and book the center. */
export async function updateLabProfile(formData: FormData): Promise<Result> {
  const ctx = await labContext()
  if (!ctx) return fail('Please sign in with your diagnostic center account.')

  const name = String(formData.get('name') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const address = String(formData.get('address') || '').trim()
  if (name.length < 2) return fail('Enter the center’s name.')
  if (city.length < 2) return fail('Enter the city.')

  const updates: Record<string, string | null> = { name, city, address: address || null }

  const image = formData.get('image')
  if (image instanceof File && image.size > 0) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) return fail('The photo must be a JPG, PNG or WebP image.')
    if (image.size > 5 * 1024 * 1024) return fail('The photo must be under 5 MB.')
    const ext = image.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `diagnostic-centers/${ctx.centerId}-${Date.now()}.${ext}`
    const { error: uploadError } = await ctx.admin.storage.from('avatars').upload(path, image, { upsert: true, contentType: image.type })
    if (uploadError) {
      console.error('updateLabProfile image:', uploadError)
      return fail('Could not upload the photo. Please try again.')
    }
    updates.image_url = ctx.admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  const { error } = await ctx.admin.from('diagnostic_centers').update(updates).eq('id', ctx.centerId)
  if (error) {
    console.error('updateLabProfile:', error)
    return fail('Could not save your details. Please try again.')
  }
  revalidateLabPages()
  revalidatePath('/find')
  return { success: true }
}
