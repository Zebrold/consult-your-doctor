'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { doctorBookingFee, isFastTrack, labDoorstepFee, matchBookedTests, pricedTests, type BookedTest } from '@/lib/pricing'
import { patientServices } from '@/lib/hospital-services'
import { loadBookingFees } from '@/lib/booking-fees'
import { followUpBase } from '@/lib/follow-up'
import { isVisiting, slotHospitalId } from '@/lib/practices'
import { doctorPause } from '@/lib/doctor-pause'
import { loadLeaves } from '@/lib/leave'
import { WALK_IN, readWalkIn, walkInState } from '@/lib/walk-in'
import { istDateKey } from '@/components/patient/format'
import { notifyBookingConfirmed } from '@/lib/notify/patient'
import { redirect } from 'next/navigation'

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || preferredDate < today) {
      return { error: 'Please choose a visit date from today onwards.' }
    }

    let center: { test_prices?: Record<string, number | string> | null } | null = null
    const { data: cFull, error: cErr } = await supabase
      .from('diagnostic_centers')
      .select('test_prices, doorstep_enabled, doorstep_fee')
      .eq('id', centerId)
      .maybeSingle()
    if (!cErr && cFull) {
      center = cFull
    } else {
      const { data: cBasic } = await supabase
        .from('diagnostic_centers')
        .select('test_prices')
        .eq('id', centerId)
        .maybeSingle()
      center = cBasic
    }
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
    const { data: centerSettings, error: csErr } = await supabase
      .from('diagnostic_centers')
      .select('doorstep_enabled, doorstep_fee')
      .eq('id', centerId)
      .maybeSingle()

    if (!csErr && centerSettings && centerSettings.doorstep_enabled === false) {
      return { error: 'Doorstep home collection is currently unavailable at this diagnostic center.' }
    }
    doorstepFee = centerSettings ? labDoorstepFee(centerSettings) : 100
  }

  // 3. Insert Booking with doorstep details. The server writes it (patients can't insert booking rows themselves,
  // see supabase/migrations/20261016_audit_hardening.sql), after the checks above.
  const admin = createAdminClient()
  // The tests with the prices they are booked at, so a later price or name change can't alter what the patient owes.
  const { data: priceRow } = await admin.from('diagnostic_centers').select('test_prices').eq('id', centerId).maybeSingle()
  const pricedSnapshot = matchBookedTests(testName, priceRow?.test_prices)
  let { data: booking, error } = await admin
    .from('diagnostic_bookings')
    .insert({
      patient_id: user.id,
      center_id: centerId,
      test_name: testName,
      preferred_date: preferredDate,
      booking_type: reqBookingType,
      doorstep_fee: doorstepFee,
      priced_tests: pricedSnapshot,
      status: 'pending_payment'
    })
    .select('id')
    .single()

  // Fallback if DB columns haven't been migrated yet
  if (error && /booking_type|doorstep_fee|priced_tests/.test(error.message)) {
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
  await tagBookingMember(admin, 'diagnostic_bookings', booking.id as string, user.id, await bookingMember(admin, user.id, formData))

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
  // The admin client reads the signed-in patient's own row (their email and phone aren't readable through the session).
  const { data: current } = await createAdminClient().from('profiles').select('full_name, phone_number').eq('id', userId).maybeSingle()
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
    return { error: 'Please log in to book this appointment.' }
  }

  const doctorId = String(formData.get('doctor_id') || '')
  const scheduleId = String(formData.get('schedule_id') || '')
  if (!doctorId || !scheduleId) {
    return { error: 'Please choose an available time slot.' }
  }

  const detailsError = await savePatientBasics(supabase, user.id, formData)
  if (detailsError) return { error: detailsError }

  const options: BookingOptions = {
    fastTrack: isFastTrack(formData.get('booking_type')),
    services: Array.from(new Set(formData.getAll('services').map(String).filter(Boolean))),
    memberId: await bookingMember(createAdminClient(), user.id, formData),
    // A walk-in from the hospital's QR code: booked for now at that hospital, not on a published slot (lib/walk-in.ts).
    walkInHospitalId: scheduleId === WALK_IN ? String(formData.get('hospital_id') || '') : undefined,
  }
  const result = await claimSlotAndCreateAppointment(user.id, doctorId, scheduleId, options)
  if ('error' in result) return { error: result.error }
  // `confirmed`: a free follow-up, booked with no fee to pay, so the page goes straight to the booking.
  return { success: true, appointmentId: result.appointmentId, confirmed: result.confirmed }
}

/**
 * What the patient picked on the hospital page: fast track, hospital services by name, who the visit is for, and, for
 * a walk-in, the hospital they are at.
 */
type BookingOptions = { fastTrack: boolean; services: string[]; memberId?: string | null; walkInHospitalId?: string }

/**
 * Why this doctor can't take a walk-in at this hospital right now, or null when they can: the doctor must work there
 * (or visit as a confirmed consultant), the hospital must be in its walk-in hours, and the doctor not on leave today.
 */
async function walkInProblem(admin: ReturnType<typeof createAdminClient>, hospitalId: string, doctor: { id: string; hospital_id: string | null }): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(hospitalId)) return 'Open the hospital’s page again from its QR code to book a walk-in.'
  if (doctor.hospital_id !== hospitalId && !(await isVisiting(admin, doctor.id, hospitalId))) return 'This doctor doesn’t see patients at this hospital. Please choose another doctor.'
  const { data: hospital } = await admin.from('hospitals').select('*').eq('id', hospitalId).maybeSingle()
  const state = walkInState(readWalkIn(hospital as Record<string, unknown> | null).hours, Date.now())
  if (!state) return 'This hospital isn’t taking walk-in bookings. Please pick a time instead.'
  if (!state.open) return `Walk-ins here are ${state.hours}. ${state.note}. You can pick a time instead.`
  const today = istDateKey(Date.now())
  const { leaves } = await loadLeaves(admin, { doctorIds: [doctor.id] })
  const away = leaves.some((l) => l.status === 'approved' && l.startsOn <= today && today <= l.endsOn && (!l.hospitalId || l.hospitalId === hospitalId))
  return away ? 'This doctor is on leave today. Please choose another doctor.' : null
}

/** A slot for right now, already taken, for a walk-in (the front desk's walk-ins are booked the same way). */
async function createWalkInSlot(admin: ReturnType<typeof createAdminClient>, doctorId: string, hospitalId: string): Promise<string | null> {
  const start = new Date()
  const row = { doctor_id: doctorId, start_time: start.toISOString(), end_time: new Date(start.getTime() + 15 * 60_000).toISOString(), is_booked: true }
  let res = await admin.from('schedules').insert({ ...row, hospital_id: hospitalId }).select('id').single()
  // Before 20261115_executive_workspace.sql slots have no hospital_id: the slot is then at the doctor's own hospital.
  if (res.error && /hospital_id/.test(res.error.message)) res = await admin.from('schedules').insert(row).select('id').single()
  if (res.error || !res.data) {
    console.error('createWalkInSlot:', res.error)
    return null
  }
  return res.data.id as string
}

/**
 * The family member a booking is for (form field `family_member_id`), when it is one of this patient's own, else null.
 * Before 20261116 there is no family_members table, so nothing can be picked.
 */
async function bookingMember(admin: ReturnType<typeof createAdminClient>, patientId: string, formData: FormData): Promise<string | null> {
  const id = String(formData.get('family_member_id') || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await admin.from('family_members').select('id').eq('id', id).eq('patient_id', patientId).maybeSingle()
  return data?.id ?? null
}

/** Names the family member on a booking just made (the column arrives with 20261116; without it nothing is written). */
async function tagBookingMember(admin: ReturnType<typeof createAdminClient>, table: 'appointments' | 'diagnostic_bookings', bookingId: string, patientId: string, memberId: string | null) {
  if (!memberId) return
  const { error } = await admin.from(table).update({ family_member_id: memberId }).eq('id', bookingId).eq('patient_id', patientId)
  if (error) console.error(`tagBookingMember ${table}:`, error.message)
}

// An unpaid booking holds its slot until it is paid. Without a cap, one account could hold every open slot of every
// doctor. Patients can cancel an unpaid booking themselves, but an abandoned checkout never does, so their own holds older than STALE_HOLD_MS are
// released to make room for a new one.
const HOLD_LIMIT = 3
const STALE_HOLD_MS = 30 * 60_000

type Hold = { id: string; schedule_id: string | null; created_at: string }

/** Cancels an unpaid booking (only while it is still unpaid) and frees its slot. True when it was released. */
async function releaseHold(admin: ReturnType<typeof createAdminClient>, hold: Hold): Promise<boolean> {
  const { data: released } = await admin.from('appointments').update({ status: 'cancelled' }).eq('id', hold.id).eq('status', 'pending_payment').select('id')
  if (!released?.length) return false
  if (hold.schedule_id) await admin.from('schedules').update({ is_booked: false }).eq('id', hold.schedule_id)
  return true
}

/**
 * True when the patient may hold one more unpaid slot. Holds that are older than STALE_HOLD_MS are released first, whatever
 * the count, so an abandoned checkout never keeps a slot.
 */
async function makeRoomForHold(admin: ReturnType<typeof createAdminClient>, patientId: string): Promise<boolean> {
  const { data } = await admin
    .from('appointments')
    .select('id, schedule_id, created_at')
    .eq('patient_id', patientId)
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true })
  const holds = (data ?? []) as Hold[]
  const cutoff = Date.now() - STALE_HOLD_MS
  for (const hold of holds.filter((h) => Date.parse(h.created_at) < cutoff)) await releaseHold(admin, hold)
  return holds.filter((h) => Date.parse(h.created_at) >= cutoff).length < HOLD_LIMIT
}

/**
 * After a hold is created, counts the patient's live holds again. Parallel requests can each pass the check in
 * makeRoomForHold, so a hold that takes the count past the limit is undone. Returns false when it was undone.
 */
async function keepWithinHoldLimit(admin: ReturnType<typeof createAdminClient>, patientId: string, hold: Hold): Promise<boolean> {
  const cutoff = Date.now() - STALE_HOLD_MS
  const { data } = await admin.from('appointments').select('id, schedule_id, created_at').eq('patient_id', patientId).eq('status', 'pending_payment')
  const live = ((data ?? []) as Hold[]).filter((h) => Date.parse(h.created_at) >= cutoff)
  if (live.length <= HOLD_LIMIT) return true
  await releaseHold(admin, hold)
  return false
}

/** Claims a slot that is still free and in the future for this doctor. */
async function claimSlot(admin: ReturnType<typeof createAdminClient>, doctorId: string, scheduleId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('schedules')
    .update({ is_booked: true })
    .eq('id', scheduleId)
    .eq('doctor_id', doctorId)
    .eq('is_booked', false)
    .gt('start_time', new Date().toISOString())
    .select('id')
  return !error && !!data?.length
}

/** Releases the unpaid hold, older than STALE_HOLD_MS, that is keeping this slot booked. True when one was released. */
async function releaseStaleHoldOn(admin: ReturnType<typeof createAdminClient>, scheduleId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - STALE_HOLD_MS).toISOString()
  const { data } = await admin
    .from('appointments')
    .select('id, schedule_id, created_at')
    .eq('schedule_id', scheduleId)
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .limit(1)
  const hold = ((data ?? []) as Hold[])[0]
  return hold ? releaseHold(admin, hold) : false
}

/**
 * Claims a free, future slot for the doctor and creates a pending-payment appointment for the patient.
 * The slot is released again if the appointment can't be created.
 */
async function claimSlotAndCreateAppointment(
  patientId: string,
  doctorId: string,
  scheduleId: string,
  options: BookingOptions = { fastTrack: false, services: [] },
): Promise<{ appointmentId: string; confirmed: boolean } | { error: string }> {
  try {
    const admin = createAdminClient()

    let fees
    try {
      fees = await loadBookingFees()
    } catch (err) {
      console.error(err)
      return { error: "We couldn't load the booking fee. Please try again in a moment." }
    }

    const { data: doctor } = await admin
      .from('doctors')
      .select('id, hospital_id, consultation_fee')
      .eq('id', doctorId)
      .maybeSingle()
    if (!doctor) return { error: 'This doctor is no longer available for booking.' }
    // A paused doctor takes no new online bookings, free follow-ups included (before the migration nobody is paused).
    if ((await doctorPause(admin, doctorId)).paused) {
      return { error: "This doctor isn't taking new bookings right now. Please choose another doctor." }
    }
    if (!Number(doctor.consultation_fee)) {
      return { error: "This doctor's consultation fee hasn't been set yet, so they can't be booked online." }
    }

    // A walk-in is booked for now at the hospital the patient is at, during its walk-in hours.
    const walkInAt = options.walkInHospitalId
    if (walkInAt !== undefined) {
      const problem = await walkInProblem(admin, walkInAt, { id: doctor.id as string, hospital_id: (doctor.hospital_id as string | null) ?? null })
      if (problem) return { error: problem }
    }

    // The booking belongs to the slot's hospital: the doctor's own, or one they visit (lib/practices.ts).
    const hospitalId = walkInAt !== undefined ? walkInAt : await slotHospitalId(admin, scheduleId, doctor.hospital_id ?? null)

    // Services are stored with the hospital's own prices at booking time, never prices from the browser.
    let services: BookedTest[] = []
    if (options.services.length > 0) {
      const { data: hospital } = hospitalId
        ? await admin.from('hospitals').select('*').eq('id', hospitalId).maybeSingle()
        : { data: null }
      // Only services the hospital shows patients can be booked (`*`: service_details arrives with 20261103_hospital_services.sql).
      const offered = new Map(patientServices(hospital).map((t) => [t.name, t]))
      services = options.services.map((name) => offered.get(name)).filter((t): t is BookedTest => !!t)
      if (services.length !== options.services.length) {
        return { error: 'Some of the services you picked are no longer offered by this hospital. Please review your selection.' }
      }
    }
    // Only a booking with a choice writes the new columns, so general bookings still work before the migration.
    const choices = options.fastTrack || services.length ? { booking_type: options.fastTrack ? 'fast_track' : 'general', services } : {}

    // A general booking with a doctor seen in the last 12 days is a free follow-up (lib/follow-up.ts): no booking fee,
    // confirmed straight away. It holds no unpaid slot, so the hold cap doesn't apply to it.
    const followUpOf = options.fastTrack ? null : await followUpBase(admin, patientId, doctorId, Date.now(), options.memberId ?? null)

    if (!followUpOf && !(await makeRoomForHold(admin, patientId))) {
      return { error: 'You already have unpaid bookings waiting. Please pay for one of them from My Appointments, or try again in 30 minutes.' }
    }

    let slotId = scheduleId
    if (walkInAt !== undefined) {
      const made = await createWalkInSlot(admin, doctorId, walkInAt)
      if (!made) return { error: 'Could not start the walk-in. Please try again.' }
      slotId = made
    } else {
      // Claim the slot only while it is still free and in the future, so two patients can't book the same time.
      let claimed = await claimSlot(admin, doctorId, scheduleId)
      // A slot kept by an unpaid booking that was never paid for is free again: release that hold and try once more.
      if (!claimed && (await releaseStaleHoldOn(admin, scheduleId))) claimed = await claimSlot(admin, doctorId, scheduleId)
      if (!claimed) {
        return { error: 'That time slot was just taken. Please pick another one.' }
      }
    }
    // A walk-in's slot exists only for this booking, so it goes when the booking can't be made.
    const releaseSlot = () =>
      walkInAt !== undefined ? admin.from('schedules').delete().eq('id', slotId) : admin.from('schedules').update({ is_booked: false }).eq('id', slotId)

    // The booking keeps the fee it was made at, so a later change to the fees can't change what this patient pays.
    const row = { patient_id: patientId, doctor_id: doctorId, hospital_id: hospitalId, schedule_id: slotId, ...choices, ...(walkInAt !== undefined ? { is_walk_in: true } : {}) }
    const paid = { ...row, status: 'pending_payment', booking_fee: doctorBookingFee(fees, options.fastTrack ? 'fast_track' : 'general') }
    const insert = (values: Record<string, unknown>) => admin.from('appointments').insert(values).select('id').single()

    let confirmed = !!followUpOf
    let { data: appointment, error: aptError } = await insert(followUpOf ? { ...row, status: 'confirmed', booking_fee: 0, follow_up_of: followUpOf } : paid)
    // Another booking took this visit's follow-up a moment ago: book it as an ordinary paid booking.
    if (aptError && followUpOf && /follow_up/.test(aptError.message)) {
      confirmed = false
      ;({ data: appointment, error: aptError } = await insert(paid))
    }
    // A database without the 20261102 columns: no stored fee and no free follow-ups yet.
    if (aptError && /booking_fee|follow_up_of|schema cache/.test(aptError.message)) {
      confirmed = false
      ;({ data: appointment, error: aptError } = await insert({ ...row, status: 'pending_payment' }))
    }

    if (aptError || !appointment) {
      console.error('Error finalizing appointment:', aptError)
      await releaseSlot()
      return { error: 'Could not create the appointment. Please try again.' }
    }
    await tagBookingMember(admin, 'appointments', appointment.id as string, patientId, options.memberId ?? null)

    if (confirmed) {
      notifyBookingConfirmed(appointment.id as string)
      return { appointmentId: appointment.id as string, confirmed: true }
    }

    if (!(await keepWithinHoldLimit(admin, patientId, { id: appointment.id as string, schedule_id: slotId, created_at: '' }))) {
      return { error: 'You already have unpaid bookings waiting. Please pay for one of them from My Appointments, or try again in 30 minutes.' }
    }

    return { appointmentId: appointment.id as string, confirmed: false }
  } catch (err) {
    console.error('Error in claimSlotAndCreateAppointment:', err)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

