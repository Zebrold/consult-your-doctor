'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ageFrom, istDateKey } from '@/components/patient/format'
import { DIAGNOSTIC_PLATFORM_FEE, matchBookedTests, sumPrices } from '@/lib/pricing'
import { REPORT_BUCKET, reportPath } from '@/lib/lab-reports'
import { renderClinicalPdf } from '@/lib/pdf/clinical'
import { issuePatientToken, readPatientToken } from '@/lib/desk-token'
import { ensurePatientProfile, indianMobile, issuePatientCredentials, sendPatientOtp, verifyPatientOtp } from '@/lib/patient-onboarding'
import { migrationHint, recordDeskPayment, upiQr, validUpiReference, type DeskMethod } from '@/lib/desk-payments'
import { notifyAccountCreated, notifyBookingConfirmed, notifyReportReady } from '@/lib/notify/patient'
import type { DeskPayment, DeskResult } from '@/components/portal/desk-types'

// The diagnostic centre desk: register a patient (one-time code, then a generated Patient ID and password), book their
// tests, take payment once the code is confirmed (PayU, the UPI scanner or cash), and produce the PDF report that goes
// to the patient's account, WhatsApp and email.

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null
const fail = (error: string) => ({ ok: false as const, error })
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOT_SIGNED_IN = 'Please sign in with your diagnostic center account.'

type Center = { id: string; name: string; address: string | null; city: string | null; available_tests: string[] | null; test_prices: Record<string, number | string> | null }

async function labContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, diagnostic_center_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'diagnostic_admin' || !profile.diagnostic_center_id) return null
  const { data: center } = await admin.from('diagnostic_centers').select('id, name, address, city, available_tests, test_prices').eq('id', profile.diagnostic_center_id).maybeSingle()
  if (!center) return null
  return { admin, center: center as Center, scope: `lab:${center.id}:${user.id}` }
}

function revalidateLabPages() {
  for (const path of ['/diagnostic-center/dashboard', '/diagnostic-center/schedule', '/diagnostic-center/patients', '/patient/profile', '/patient/appointments']) revalidatePath(path)
}

export async function sendLabPatientOtp(rawPhone: string): Promise<DeskResult> {
  const ctx = await labContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const phone = indianMobile(rawPhone)
  if (!phone) return fail('Enter the patient’s 10-digit Indian mobile number.')
  return sendPatientOtp(phone)
}

type Credentials = { patientCode: string; password: string | null }

/**
 * Confirms the patient's code, makes sure they have an account with a Patient ID (and, for a first registration, a
 * generated password), and books the tests unpaid. Payment can only be taken after this.
 */
export async function registerLabPatient(input: { name: string; phone: string; email: string; date: string; tests: string[]; code: string }): Promise<DeskResult<{ token: string; credentials: Credentials; payment: DeskPayment }>> {
  const ctx = await labContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const name = input.name.trim().replace(/\s+/g, ' ')
  const phone = indianMobile(input.phone)
  const email = input.email.trim()
  if (name.length < 2) return fail('Enter the patient’s full name.')
  if (!phone) return fail('Enter the patient’s 10-digit Indian mobile number.')
  if (email && !emailPattern.test(email)) return fail('Enter a valid email address, or leave it blank.')
  const today = istDateKey(Date.now())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date < today || input.date > istDateKey(Date.now() + 90 * 86_400_000)) return fail('Choose a date between today and 90 days from now.')

  const offered = new Map(Array.from(new Set([...(ctx.center.available_tests ?? []), ...Object.keys(ctx.center.test_prices ?? {})])).map((t) => [t.toLowerCase(), t]))
  const names = Array.from(new Set(input.tests.map((t) => offered.get(t.toLowerCase())).filter(Boolean) as string[]))
  if (names.length === 0 || names.length !== new Set(input.tests.map((t) => t.toLowerCase())).size) return fail('Select tests from your menu (refresh if the menu changed).')
  const testName = names.join(', ')
  if (!matchBookedTests(testName, ctx.center.test_prices)) return fail('Every selected test needs a price on your test menu.')

  const verified = await verifyPatientOtp(ctx.admin, phone, input.code)
  if (!verified.ok) return verified
  const profile = await ensurePatientProfile(ctx.admin, verified.userId, { name, phone, email })
  if (!profile.ok) return profile

  // A patient's first registration gets a Patient ID and password; later ones keep theirs.
  let credentials: Credentials
  const { data: existing } = await ctx.admin.from('profiles').select('patient_code').eq('id', verified.userId).maybeSingle()
  if (existing?.patient_code) {
    credentials = { patientCode: existing.patient_code, password: null }
  } else {
    const issued = await issuePatientCredentials(ctx.admin, verified.userId)
    if (!issued.ok) return issued
    credentials = { patientCode: issued.patientCode, password: issued.password }
    notifyAccountCreated({ patientId: verified.userId, patientCode: issued.patientCode, password: issued.password })
  }

  const { data: booking, error } = await ctx.admin
    .from('diagnostic_bookings')
    .insert({ patient_id: verified.userId, center_id: ctx.center.id, test_name: testName, preferred_date: input.date, status: 'pending_payment' })
    .select('id')
    .single()
  if (error || !booking) {
    console.error('registerLabPatient booking:', error)
    return fail('The patient is registered, but the booking could not be created. Please try again.')
  }
  revalidateLabPages()
  const payment = await labPayment(ctx.admin, ctx.center, booking.id)
  if (!payment) return fail('The booking was made but its payment details couldn’t be loaded. Find it under the patient’s bookings.')
  return { ok: true, token: issuePatientToken(verified.userId, ctx.scope), credentials, payment }
}

/** A new password for the patient registered in this session (when they've lost theirs). */
export async function resetLabPatientPassword(token: string): Promise<DeskResult<{ credentials: Credentials }>> {
  const ctx = await labContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const patientId = readPatientToken(token, ctx.scope)
  if (!patientId) return fail('This registration has expired. Verify the patient again to reset their password.')
  const issued = await issuePatientCredentials(ctx.admin, patientId)
  if (!issued.ok) return issued
  notifyAccountCreated({ patientId, patientCode: issued.patientCode, password: issued.password })
  return { ok: true, credentials: { patientCode: issued.patientCode, password: issued.password } }
}

type BookingRow = {
  id: string
  status: string
  center_id: string
  patient_id: string
  test_name: string
  preferred_date: string | null
  patient: Joined<{ full_name: string | null; phone_number: string | null; email: string | null }>
}

async function bookingAt(admin: Admin, centerId: string, bookingId: string) {
  const { data } = await admin
    .from('diagnostic_bookings')
    .select('id, status, center_id, patient_id, test_name, preferred_date, patient:profiles!diagnostic_bookings_patient_id_fkey ( full_name, phone_number, email )')
    .eq('id', bookingId)
    .maybeSingle()
  const row = data as unknown as BookingRow | null
  if (!row || row.center_id !== centerId) return null
  return { row, patient: one(row.patient) }
}

async function labPayment(admin: Admin, center: Center, bookingId: string): Promise<DeskPayment | null> {
  const found = await bookingAt(admin, center.id, bookingId)
  if (!found) return null
  const tests = matchBookedTests(found.row.test_name, center.test_prices)
  if (!tests) return null
  const amount = sumPrices(tests)
  const code = bookingId.slice(0, 8).toUpperCase()
  const email = found.patient?.email && !found.patient.email.endsWith('.internal') ? found.patient.email : null
  return {
    kind: 'diagnostic',
    id: bookingId,
    code,
    status: found.row.status,
    what: tests.map((t) => t.name).join(', '),
    patient: { name: found.patient?.full_name || 'Patient', phone: found.patient?.phone_number ?? null, email },
    amounts: { desk: amount, online: amount + DIAGNOSTIC_PLATFORM_FEE, platformFee: DIAGNOSTIC_PLATFORM_FEE },
    upi: await upiQr(amount, code, `Lab tests ${code}`),
    payuKey: process.env.PAYU_MERCHANT_KEY ?? null,
  }
}

export async function labPaymentInfo(bookingId: string): Promise<DeskResult<{ payment: DeskPayment }>> {
  const ctx = await labContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const payment = await labPayment(ctx.admin, ctx.center, bookingId)
  if (!payment) return fail('Booking not found.')
  if (payment.status !== 'pending_payment') return fail('This booking is already paid.')
  return { ok: true, payment }
}

/** Records a scanner (UPI) or cash payment for an unpaid booking and confirms it. */
export async function recordLabPayment(input: { bookingId: string; method: DeskMethod; reference: string }): Promise<DeskResult> {
  const ctx = await labContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  if (input.method !== 'upi_qr' && input.method !== 'cash') return fail('Choose how the patient paid.')
  const reference = input.reference.trim()
  if (input.method === 'upi_qr' && !validUpiReference(reference)) return fail('Enter the UPI reference (UTR) shown in the patient’s payment app.')

  const payment = await labPayment(ctx.admin, ctx.center, input.bookingId)
  if (!payment) return fail('Booking not found.')
  if (payment.status !== 'pending_payment') return fail('This booking is already paid.')
  const found = await bookingAt(ctx.admin, ctx.center.id, input.bookingId)

  try {
    const result = await recordDeskPayment(ctx.admin, { kind: 'diagnostic', id: input.bookingId }, {
      method: input.method,
      amount: payment.amounts.desk,
      reference: input.method === 'cash' ? `CASH-${Date.now()}` : `UPI-${reference.toUpperCase()}`,
    })
    if (!result.recorded) return fail('This booking is already paid.')
  } catch (err) {
    console.error('recordLabPayment:', err)
    const pgError = err as { code?: string; message?: string }
    if (pgError.code === '23505') return fail('That UPI reference has already been used for another payment.')
    return fail(migrationHint(pgError) ?? 'Could not record the payment. Please try again.')
  }

  if (found) {
    notifyBookingConfirmed({
      patientId: found.row.patient_id,
      what: `lab tests (${payment.what})`,
      where: ctx.center.name,
      bookingId: payment.code,
      amount: `₹${payment.amounts.desk.toLocaleString('en-IN')}`,
    })
  }
  revalidateLabPages()
  return { ok: true }
}

export type ResultRow = { test: string; value: string; unit: string; range: string; flag: string }
const FLAGS = ['', 'Low', 'High', 'Abnormal', 'Critical']

/**
 * Generates the PDF report from the results the lab entered, puts it in the patient's account and sends it on
 * WhatsApp and by email. Generating it again replaces the previous report.
 */
export async function createLabReport(input: { bookingId: string; rows: ResultRow[]; remarks: string; authorisedBy: string }): Promise<DeskResult> {
  const ctx = await labContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const found = await bookingAt(ctx.admin, ctx.center.id, input.bookingId)
  if (!found) return fail('Booking not found.')
  if (!['confirmed', 'visited', 'completed', 'report_sent'].includes(found.row.status)) return fail('Reports can only be made for paid bookings.')

  const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)
  const rows = input.rows
    .map((r) => ({ test: clip(r.test, 120), value: clip(r.value, 40), unit: clip(r.unit, 24), range: clip(r.range, 60), flag: FLAGS.includes(r.flag) ? r.flag : '' }))
    .filter((r) => r.test && r.value)
  if (rows.length === 0) return fail('Enter at least one result (a test and its value).')
  if (rows.length > 80) return fail('A report can have up to 80 results.')
  const authorisedBy = clip(input.authorisedBy, 80)
  if (authorisedBy.length < 2) return fail('Enter who authorised the report.')
  const remarks = clip(input.remarks, 2000)

  const { data: extra } = await ctx.admin.from('profiles').select('patient_code').eq('id', found.row.patient_id).maybeSingle()
  const { data: facts } = await ctx.admin.from('patient_details').select('date_of_birth, gender').eq('id', found.row.patient_id).maybeSingle()
  const age = ageFrom(facts?.date_of_birth ?? null, Date.now())
  const code = input.bookingId.slice(0, 8).toUpperCase()
  const now = new Date()
  const dateText = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })

  const pdf = await renderClinicalPdf({
    title: 'DIAGNOSTIC REPORT',
    reference: `#${code}`,
    issuedAt: now,
    organisation: { name: ctx.center.name, lines: [ctx.center.address, ctx.center.city] },
    panels: [
      {
        title: 'Patient',
        rows: [
          ['Name', found.patient?.full_name ?? 'Patient'],
          ['Patient ID', extra?.patient_code ?? `CYD-${found.row.patient_id.slice(0, 8).toUpperCase()}`],
          ['Age / Sex', [age != null ? `${age} years` : null, facts?.gender].filter(Boolean).join(' / ') || null],
          ['Phone', found.patient?.phone_number],
        ],
      },
      {
        title: 'Sample',
        rows: [
          ['Tests', found.row.test_name],
          ['Booked for', found.row.preferred_date ? dateText(new Date(`${found.row.preferred_date}T12:00:00+05:30`)) : null],
          ['Reported', `${dateText(now)}, ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })}`],
        ],
      },
    ],
    table: { title: 'Results', columns: ['Test', 'Result', 'Unit', 'Reference range', 'Flag'], widths: [34, 14, 12, 26, 10], flagColumn: 4, rows: rows.map((r) => [r.test, r.value, r.unit, r.range, r.flag]) },
    sections: [{ heading: 'Remarks', body: remarks }],
    signature: { name: authorisedBy, lines: [ctx.center.name, 'Authorised signatory'] },
    note: `Generated through Consult Your Doctor for booking #${code}. Results must be interpreted by a doctor together with your symptoms and history.`,
  })

  const path = reportPath(ctx.center.id, input.bookingId)
  const { error: uploadError } = await ctx.admin.storage.from(REPORT_BUCKET).upload(path, pdf, { upsert: true, contentType: 'application/pdf' })
  if (uploadError) {
    console.error('createLabReport upload:', uploadError)
    return fail('Could not save the report. Please try again.')
  }

  // Keep the entered results with the booking (needs the 20261008 migration; the report works without it).
  const results = { rows, remarks, authorisedBy, reportedAt: now.toISOString() }
  let { error } = await ctx.admin.from('diagnostic_bookings').update({ status: 'report_sent', results }).eq('id', input.bookingId)
  if (error && /results/.test(error.message)) ({ error } = await ctx.admin.from('diagnostic_bookings').update({ status: 'report_sent' }).eq('id', input.bookingId))
  if (error) {
    console.error('createLabReport status:', error)
    return fail('The report was saved but the booking could not be updated. Please try again.')
  }

  notifyReportReady({ patientId: found.row.patient_id, what: 'lab report', from: ctx.center.name, path, filename: `Lab-Report-${code}.pdf`, contentType: 'application/pdf', file: pdf })
  revalidateLabPages()
  return { ok: true }
}
