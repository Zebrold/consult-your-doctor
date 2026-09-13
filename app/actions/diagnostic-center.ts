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
