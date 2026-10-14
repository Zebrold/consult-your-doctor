'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { labDoorstepFee, matchBookedTests, pricedTests } from '@/lib/pricing'
import { redirect } from 'next/navigation'

export async function createAppointment(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Verify User Authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // If not logged in, redirect to login page.
    redirect('/login/patient')
  }

  // 2. Parse form data
  const doctorId = formData.get('doctor_id') as string
  const scheduleId = formData.get('schedule_id') as string

  if (!doctorId || !scheduleId) {
    return { error: 'Please select a hospital, doctor, and an available time slot.' }
  }

  // 3. Claim the slot and create the appointment (same path as the detailed booking page)
  const result = await claimSlotAndCreateAppointment(user.id, doctorId, scheduleId)
  if ('error' in result) return { error: result.error }

  // 4. Return URL to redirect on the client
  return { success: true, url: `/patient/checkout/${result.appointmentId}` }
}

export async function createDiagnosticBooking(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Verify User Authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // If not logged in, redirect to login page.
    redirect('/login/patient')
  }

  // 2. Parse form data
  const centerId = formData.get('center_id') as string
  let testName = formData.get('test_name') as string
  const preferredDate = formData.get('preferred_date') as string

  // The lab booking page sends one `test_names` entry per selected test, plus the patient's details.
  const selectedTests = formData.getAll('test_names').map(String).filter(Boolean)
  if (selectedTests.length > 0) {
    if (!centerId || !preferredDate) {
      return { error: 'Please select at least one test and a visit date.' }
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    if (preferredDate < today) {
      return { error: 'Please choose a visit date from today onwards.' }
    }

    const { data: center } = await supabase
      .from('diagnostic_centers')
      .select('test_prices, doorstep_enabled, doorstep_fee')
      .eq('id', centerId)
      .maybeSingle()
    const offered = new Set(pricedTests(center?.test_prices).map((t) => t.name))
    if (selectedTests.some((name) => !offered.has(name))) {
      return { error: 'Some of the selected tests are no longer offered by this lab. Please review your selection.' }
    }
    testName = Array.from(new Set(selectedTests)).join(', ')
    if (!matchBookedTests(testName, center?.test_prices)) {
      return { error: 'These tests could not be priced together. Please book them separately.' }
    }

    const detailsError = await savePatientBasics(supabase, user.id, formData)
    if (detailsError) return { error: detailsError }
  }

  if (!centerId || !testName || !preferredDate) {
    return { error: 'Please select a center, a test, and a preferred date.' }
  }
  // The older single-test form sends test_name directly; hold it to the same checks as the lab booking page.
  if (selectedTests.length === 0) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || preferredDate < today) {
      return { error: 'Please choose a visit date from today onwards.' }
    }
    const { data: center } = await supabase.from('diagnostic_centers').select('test_prices').eq('id', centerId).maybeSingle()
    if (!center || !matchBookedTests(testName, center.test_prices)) {
      return { error: 'This test is not offered by the selected lab. Please choose another.' }
    }
  }

  const reqBookingType = (formData.get('booking_type') as string) === 'doorstep' ? 'doorstep' : 'walk_in'
  let doorstepFee = 0

  if (reqBookingType === 'doorstep') {
    const { data: centerSettings } = await supabase
      .from('diagnostic_centers')
      .select('doorstep_enabled, doorstep_fee')
      .eq('id', centerId)
      .maybeSingle()

    if (!centerSettings || centerSettings.doorstep_enabled === false) {
      return { error: 'Doorstep home collection is currently unavailable at this diagnostic center.' }
    }
    doorstepFee = labDoorstepFee(centerSettings)
  }

  // 3. Insert Booking with doorstep details. The server writes it (patients can't insert booking rows themselves,
  // see supabase/migrations/20261016_audit_hardening.sql), after the checks above.
  const admin = createAdminClient()
  let { data: booking, error } = await admin
    .from('diagnostic_bookings')
    .insert({
      patient_id: user.id,
      center_id: centerId,
      test_name: testName,
      preferred_date: preferredDate,
      booking_type: reqBookingType,
      doorstep_fee: doorstepFee,
      status: 'pending_payment'
    })
    .select('id')
    .single()

  // Fallback if DB columns haven't been migrated yet
  if (error && /booking_type|doorstep_fee/.test(error.message)) {
    const fallbackRes = await admin
      .from('diagnostic_bookings')
      .insert({
        patient_id: user.id,
        center_id: centerId,
        test_name: testName,
        preferred_date: preferredDate,
        status: 'pending_payment'
      })
      .select('id')
      .single()
    booking = fallbackRes.data
    error = fallbackRes.error
  }

  if (error || !booking) {
    console.error('Error creating diagnostic booking:', error)
    return { error: 'Failed to book diagnostic test.' }
  }

  // 4. Return URL to redirect on the client
  return { success: true, bookingId: booking.id as string, url: `/patient/checkout/diagnostic/${booking.id}` }
}

type Supabase = Awaited<ReturnType<typeof createClient>>

const PATIENT_GENDERS = ['Male', 'Female', 'Non-binary', 'Other']

/** "+91 98204 77210" / "9820477210" → "+919820477210" (numbers without a country code are taken as Indian). */
function toE164(raw: string) {
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  return cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`
}

/**
 * Saves the patient details entered on a booking page to the patient's own profile,
 * which is what hospitals, labs and the operations team see for the booking.
 */
async function savePatientBasics(supabase: Supabase, userId: string, formData: FormData): Promise<string | null> {
  const { data: current } = await supabase.from('profiles').select('full_name, phone_number').eq('id', userId).maybeSingle()
  let fullName = String(formData.get('patient_name') || '').trim().slice(0, 120)
  let rawPhone = String(formData.get('patient_phone') || '').trim()
  const dateOfBirth = String(formData.get('date_of_birth') || '')
  const gender = String(formData.get('gender') || '')

  if (!fullName && current?.full_name) {
    fullName = current.full_name
  }
  if (!rawPhone && current?.phone_number) {
    rawPhone = current.phone_number
  }

  if (!fullName) return "Please enter the patient's full name."
  if (rawPhone.replace(/\D/g, '').length < 10) return 'Please enter a valid mobile number so the hospital can reach you.'
  if (dateOfBirth && (Number.isNaN(Date.parse(dateOfBirth)) || Date.parse(dateOfBirth) > Date.now())) {
    return 'Please enter a valid date of birth.'
  }

  const phone = toE164(rawPhone)
  const updates: Record<string, string> = {}
  if (current?.full_name !== fullName) updates.full_name = fullName
  if (current?.phone_number !== phone) updates.phone_number = phone
  if (Object.keys(updates).length > 0) {
    if (!current) {
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        full_name: fullName,
        phone_number: phone,
        role: 'patient',
      })
      if (error) {
        console.error('Error creating patient profile:', error)
        return error.code === '23505' ? 'This mobile number is already registered to another account.' : 'Could not save your details. Please try again.'
      }
    } else {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) {
        console.error('Error saving patient profile:', error)
        return error.code === '23505' ? 'This mobile number is already registered to another account.' : 'Could not save your details. Please try again.'
      }
    }
  }

  const details: Record<string, string> = {}
  if (dateOfBirth) details.date_of_birth = dateOfBirth
  if (PATIENT_GENDERS.includes(gender)) details.gender = gender
  if (Object.keys(details).length > 0) {
    // Only the columns sent are written, so the rest of the medical profile is left as it was.
    const { error } = await supabase.from('patient_details').upsert({ id: userId, ...details, updated_at: new Date().toISOString() })
    if (error) {
      console.error('Error saving patient details:', error)
      return 'Could not save your details. Please try again.'
    }
  }
  return null
}

export async function finalizeConsultationAppointment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Please sign in to book this appointment.' }
  }

  const doctorId = String(formData.get('doctor_id') || '')
  const scheduleId = String(formData.get('schedule_id') || '')
  if (!doctorId || !scheduleId) {
    return { error: 'Please choose an available time slot.' }
  }

  const detailsError = await savePatientBasics(supabase, user.id, formData)
  if (detailsError) return { error: detailsError }

  const result = await claimSlotAndCreateAppointment(user.id, doctorId, scheduleId)
  if ('error' in result) return { error: result.error }
  return { success: true, appointmentId: result.appointmentId }
}

// An unpaid booking holds its slot until it is paid. Without a cap, one account could hold every open slot of every
// doctor. Patients can't cancel an unpaid booking themselves, so their own holds older than STALE_HOLD_MS are
// released to make room for a new one.
const HOLD_LIMIT = 3
const STALE_HOLD_MS = 30 * 60_000

/** True when the patient may hold one more unpaid slot (after releasing their own stale holds if needed). */
async function makeRoomForHold(admin: ReturnType<typeof createAdminClient>, patientId: string): Promise<boolean> {
  const { data } = await admin
    .from('appointments')
    .select('id, schedule_id, created_at')
    .eq('patient_id', patientId)
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true })
  const holds = (data ?? []) as { id: string; schedule_id: string | null; created_at: string }[]
  if (holds.length < HOLD_LIMIT) return true

  const cutoff = Date.now() - STALE_HOLD_MS
  const stale = holds.filter((h) => Date.parse(h.created_at) < cutoff).slice(0, holds.length - HOLD_LIMIT + 1)
  if (holds.length - stale.length >= HOLD_LIMIT) return false
  for (const hold of stale) {
    const { data: released } = await admin.from('appointments').update({ status: 'cancelled' }).eq('id', hold.id).eq('status', 'pending_payment').select('id')
    if (released?.length && hold.schedule_id) await admin.from('schedules').update({ is_booked: false }).eq('id', hold.schedule_id)
  }
  return true
}

/**
 * Claims a free, future slot for the doctor and creates a pending-payment appointment for the patient.
 * The slot is released again if the appointment can't be created.
 */
async function claimSlotAndCreateAppointment(
  patientId: string,
  doctorId: string,
  scheduleId: string,
): Promise<{ appointmentId: string } | { error: string }> {
  try {
    const admin = createAdminClient()

    const { data: doctor } = await admin
      .from('doctors')
      .select('id, hospital_id, consultation_fee')
      .eq('id', doctorId)
      .maybeSingle()
    if (!doctor) return { error: 'This doctor is no longer available for booking.' }
    if (!Number(doctor.consultation_fee)) {
      return { error: "This doctor's consultation fee hasn't been set yet, so they can't be booked online." }
    }
    if (!(await makeRoomForHold(admin, patientId))) {
      return { error: 'You already have unpaid bookings waiting. Please pay for one of them from My Appointments, or try again in 30 minutes.' }
    }

    // Claim the slot only while it is still free and in the future, so two patients can't book the same time.
    const { data: claimed, error: claimError } = await admin
      .from('schedules')
      .update({ is_booked: true })
      .eq('id', scheduleId)
      .eq('doctor_id', doctorId)
      .eq('is_booked', false)
      .gt('start_time', new Date().toISOString())
      .select('id')
    if (claimError || !claimed || claimed.length === 0) {
      return { error: 'That time slot was just taken. Please pick another one.' }
    }

    const { data: appointment, error: aptError } = await admin
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        hospital_id: doctor.hospital_id ?? null,
        schedule_id: scheduleId,
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (aptError || !appointment) {
      console.error('Error finalizing appointment:', aptError)
      await admin.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
      return { error: 'Could not create the appointment. Please try again.' }
    }

    return { appointmentId: appointment.id as string }
  } catch (err) {
    console.error('Error in claimSlotAndCreateAppointment:', err)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

