'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function addDiagnosticTest(centerId: string, testName: string, fee: number) {
  try {
    if (!centerId) {
      return { error: 'Center ID is required.' }
    }
    const cleanTestName = testName.trim()
    if (!cleanTestName) {
      return { error: 'Diagnostic test name is required.' }
    }
    if (isNaN(fee) || fee < 0) {
      return { error: 'A valid test amount in ₹ INR is required.' }
    }

    const admin = createAdminClient()

    // 1. Fetch current center data
    const { data: center, error: fetchErr } = await admin
      .from('diagnostic_centers')
      .select('available_tests, test_prices')
      .eq('id', centerId)
      .maybeSingle()

    if (fetchErr) {
      console.error('Error fetching center:', fetchErr)
      return { error: 'Diagnostic center not found.' }
    }

    const currentTests: string[] = Array.isArray(center?.available_tests)
      ? [...center.available_tests]
      : []
    const currentPrices: Record<string, number> = center?.test_prices
      ? { ...center.test_prices }
      : {}

    // Check if test already exists (case-insensitive)
    const existingIndex = currentTests.findIndex(
      (t) => t.toLowerCase() === cleanTestName.toLowerCase()
    )

    if (existingIndex >= 0) {
      const existingName = currentTests[existingIndex]
      delete currentPrices[existingName]
      currentTests[existingIndex] = cleanTestName
      currentPrices[cleanTestName] = Number(fee)
    } else {
      currentTests.push(cleanTestName)
      currentPrices[cleanTestName] = Number(fee)
    }

    const { error: updateErr } = await admin
      .from('diagnostic_centers')
      .update({
        available_tests: currentTests,
        test_prices: currentPrices,
      })
      .eq('id', centerId)

    if (updateErr) {
      console.error('Error updating diagnostic test:', updateErr)
      return { error: 'Failed to save test in database.' }
    }

    revalidatePath('/diagnostic-center/tests')
    revalidatePath('/diagnostic-center/tests/add')
    revalidatePath('/diagnostic-center/dashboard')
    revalidatePath('/diagnostic-center/reports')
    revalidatePath('/find')

    return {
      success: true,
      available_tests: currentTests,
      test_prices: currentPrices,
    }
  } catch (err: any) {
    console.error('addDiagnosticTest exception:', err)
    return { error: err.message || 'An unexpected error occurred.' }
  }
}

export async function deleteDiagnosticTest(centerId: string, testName: string) {
  try {
    if (!centerId || !testName) return { error: 'Missing parameters.' }

    const admin = createAdminClient()
    const { data: center } = await admin
      .from('diagnostic_centers')
      .select('available_tests, test_prices')
      .eq('id', centerId)
      .maybeSingle()

    if (!center) return { error: 'Center not found.' }

    const currentTests: string[] = (center.available_tests || []).filter(
      (t: string) => t.toLowerCase() !== testName.toLowerCase()
    )
    const currentPrices: Record<string, number> = { ...(center.test_prices || {}) }
    delete currentPrices[testName]

    await admin
      .from('diagnostic_centers')
      .update({
        available_tests: currentTests,
        test_prices: currentPrices,
      })
      .eq('id', centerId)

    revalidatePath('/diagnostic-center/tests')
    revalidatePath('/diagnostic-center/tests/add')
    revalidatePath('/diagnostic-center/dashboard')
    revalidatePath('/find')

    return { success: true, available_tests: currentTests, test_prices: currentPrices }
  } catch (err: any) {
    console.error('deleteDiagnosticTest exception:', err)
    return { error: err.message || 'Failed to delete test.' }
  }
}

export async function updateDiagnosticBookingStatus(
  bookingId: string,
  newStatus: string,
  reportUrl?: string
) {
  try {
    if (!bookingId) return { error: 'Booking ID is required.' }

    const admin = createAdminClient()
    const updatePayload: Record<string, any> = {
      status: newStatus,
    }

    const { error } = await admin
      .from('diagnostic_bookings')
      .update(updatePayload)
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking status:', error)
      return { error: 'Failed to update booking status.' }
    }

    revalidatePath('/diagnostic-center/dashboard')
    revalidatePath('/diagnostic-center/reports')
    revalidatePath('/diagnostic-center/patients')

    return { success: true }
  } catch (err: any) {
    console.error('updateDiagnosticBookingStatus exception:', err)
    return { error: err.message || 'Failed to update booking status.' }
  }
}

export async function createWalkinBooking(formData: {
  centerId: string
  patientName: string
  phoneNumber: string
  testName: string
  isHomeCollect?: boolean
}) {
  try {
    const { centerId, patientName, phoneNumber, testName } = formData
    if (!centerId || !patientName || !phoneNumber || !testName) {
      return { error: 'All fields are required.' }
    }

    const admin = createAdminClient()

    // 1. Check or create a profile for the patient
    let patientId: string | null = null
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneNumber.trim())
      .maybeSingle()

    if (existingProfile) {
      patientId = existingProfile.id
    } else {
      // Create new profile record
      const { data: newProfile, error: profileErr } = await admin
        .from('profiles')
        .insert({
          full_name: patientName.trim(),
          phone_number: phoneNumber.trim(),
          role: 'patient',
        })
        .select('id')
        .single()

      if (profileErr) {
        console.error('Error creating profile:', profileErr)
        return { error: 'Failed to register patient profile.' }
      }
      patientId = newProfile.id
    }

    // 2. Insert booking
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: booking, error: bookErr } = await admin
      .from('diagnostic_bookings')
      .insert({
        center_id: centerId,
        patient_id: patientId,
        test_name: testName,
        preferred_date: todayStr,
        status: 'confirmed',
      })
      .select('*, profiles(*)')
      .single()

    if (bookErr) {
      console.error('Error inserting booking:', bookErr)
      return { error: 'Failed to create booking in database.' }
    }

    revalidatePath('/diagnostic-center/dashboard')
    revalidatePath('/diagnostic-center/patients')
    revalidatePath('/diagnostic-center/reports')

    return { success: true, booking }
  } catch (err: any) {
    console.error('createWalkinBooking exception:', err)
    return { error: err.message || 'Failed to register walk-in booking.' }
  }
}

