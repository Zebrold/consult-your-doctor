'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrationHint } from '@/lib/desk-payments'
import { cleanList } from '@/lib/profile-lists'

// The hospital profile page: the details patients see on the hospital's public page, and its test charges.

type Result = { success: true } | { success: false; error: string }
const fail = (error: string): Result => ({ success: false, error })
const NOT_SIGNED_IN = 'Please sign in with your hospital account.'
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

  const image = formData.get('image')
  if (image instanceof File && image.size > 0) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) return fail('The photo must be a JPG, PNG or WebP image.')
    if (image.size > 5 * 1024 * 1024) return fail('The photo must be under 5 MB.')
    const ext = image.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `hospitals/${ctx.hospitalId}-${Date.now()}.${ext}`
    const { error: uploadError } = await ctx.admin.storage.from('avatars').upload(path, image, { upsert: true, contentType: image.type })
    if (uploadError) {
      console.error('updateHospitalProfile image:', uploadError)
      return fail('Could not upload the photo. Please try again.')
    }
    updates.image_url = ctx.admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  const { error } = await ctx.admin.from('hospitals').update(updates).eq('id', ctx.hospitalId)
  if (error) {
    console.error('updateHospitalProfile:', error)
    return fail(migrationHint(error) ?? 'Could not save the hospital details. Please try again.')
  }
  revalidateHospitalPages(ctx.hospitalId)
  return { success: true }
}

async function loadTests(admin: ReturnType<typeof createAdminClient>, hospitalId: string) {
  const { data, error } = await admin.from('hospitals').select('available_tests, test_prices').eq('id', hospitalId).maybeSingle()
  return {
    error,
    tests: Array.isArray(data?.available_tests) ? [...(data.available_tests as string[])] : [],
    prices: { ...((data?.test_prices as Record<string, number> | null) ?? {}) },
  }
}

/** Adds a test to the hospital's test charges, or changes its amount (names match without regard to case). */
export async function saveHospitalTest(name: string, price: number): Promise<Result> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const testName = name.trim().replace(/\s+/g, ' ')
  if (testName.length < 2 || testName.length > 120) return fail('Enter a test name (2 to 120 characters).')
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) return fail('Enter an amount in rupees greater than zero.')

  const { error: loadError, tests, prices } = await loadTests(ctx.admin, ctx.hospitalId)
  if (loadError) return fail(migrationHint(loadError) ?? 'Could not load your test charges. Please try again.')
  const existing = tests.find((t) => t.toLowerCase() === testName.toLowerCase())
  if (existing) {
    delete prices[existing]
    tests[tests.indexOf(existing)] = testName
  } else {
    tests.push(testName)
  }
  prices[testName] = Math.round(price)

  const { error } = await ctx.admin.from('hospitals').update({ available_tests: tests, test_prices: prices }).eq('id', ctx.hospitalId)
  if (error) {
    console.error('saveHospitalTest:', error)
    return fail(migrationHint(error) ?? 'Could not save the test. Please try again.')
  }
  revalidateHospitalPages(ctx.hospitalId)
  return { success: true }
}

export async function removeHospitalTest(name: string): Promise<Result> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { error: loadError, tests, prices } = await loadTests(ctx.admin, ctx.hospitalId)
  if (loadError) return fail(migrationHint(loadError) ?? 'Could not load your test charges. Please try again.')
  const key = name.toLowerCase()
  for (const t of Object.keys(prices)) if (t.toLowerCase() === key) delete prices[t]
  const { error } = await ctx.admin
    .from('hospitals')
    .update({ available_tests: tests.filter((t) => t.toLowerCase() !== key), test_prices: prices })
    .eq('id', ctx.hospitalId)
  if (error) {
    console.error('removeHospitalTest:', error)
    return fail(migrationHint(error) ?? 'Could not remove the test. Please try again.')
  }
  revalidateHospitalPages(ctx.hospitalId)
  return { success: true }
}
