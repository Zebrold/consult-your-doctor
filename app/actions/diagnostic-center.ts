'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { istDateKey } from '@/components/patient/format'
import { matchBookedTests } from '@/lib/pricing'
import { REPORT_BUCKET, REPORT_MAX_BYTES, REPORT_TYPES, reportPath } from '@/lib/lab-reports'

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
    .select('id, status')
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
  revalidateLabPages()
  revalidatePath('/patient/profile')
  return { success: true }
}

/** "98204 77210" / "+91 98204 77210" → "+919820477210" (numbers without a country code are taken as Indian). */
function toE164(raw: string) {
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  return cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`
}

/**
 * Books tests for a patient at the desk (or over the phone). The patient is found by mobile number, or given an
 * account on that number so they can sign in later with an OTP and see the booking and report. Paid at the center.
 */
export async function createLabBooking(formData: FormData): Promise<Result> {
  const ctx = await labContext()
  if (!ctx) return fail('Please sign in with your diagnostic center account.')

  const name = String(formData.get('name') || '').trim()
  const phone = toE164(String(formData.get('phone') || ''))
  const date = String(formData.get('date') || '')
  const selected = Array.from(new Set(formData.getAll('tests').map(String).filter(Boolean)))

  if (name.length < 2) return fail('Enter the patient’s full name.')
  if (!/^\+\d{10,15}$/.test(phone)) return fail('Enter a valid mobile number.')
  const today = istDateKey(Date.now())
  const latest = istDateKey(Date.now() + 90 * 86_400_000)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > latest) return fail('Choose a date between today and 90 days from now.')
  if (selected.length === 0) return fail('Select at least one test.')

  const { tests, prices } = await loadTestList(ctx.admin, ctx.centerId)
  const offered = new Map(tests.map((t) => [t.toLowerCase(), t]))
  const names = selected.map((t) => offered.get(t.toLowerCase()))
  if (names.some((t) => !t)) return fail('Some of these tests are no longer on your menu. Refresh and try again.')
  const testName = (names as string[]).join(', ')
  if (!matchBookedTests(testName, prices)) return fail('Every selected test needs a price on your test menu.')

  let patientId: string | null = null
  const { data: existing } = await ctx.admin.from('profiles').select('id').eq('phone_number', phone).limit(1).maybeSingle()
  if (existing) {
    patientId = existing.id
  } else {
    const { data: created, error: createError } = await ctx.admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { full_name: name, role: 'patient' },
    })
    if (!created?.user) {
      console.error('createLabBooking createUser:', createError)
      return fail('This number is already registered but has no patient profile. Ask the patient to sign in once, then book again.')
    }
    patientId = created.user.id
    const { error: profileError } = await ctx.admin.from('profiles').upsert({ id: patientId, full_name: name, phone_number: phone, role: 'patient' })
    if (profileError) {
      console.error('createLabBooking profile:', profileError)
      return fail('Could not create the patient’s profile. Please try again.')
    }
  }

  const { error } = await ctx.admin.from('diagnostic_bookings').insert({
    patient_id: patientId,
    center_id: ctx.centerId,
    test_name: testName,
    preferred_date: date,
    status: 'confirmed',
  })
  if (error) {
    console.error('createLabBooking insert:', error)
    return fail('Could not create the booking. Please try again.')
  }
  revalidateLabPages()
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
