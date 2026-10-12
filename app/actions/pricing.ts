'use server'

import { revalidatePath } from 'next/cache'
import { requireExecutive } from '@/app/executive/_lib/ops'
import { getPlatformFees, savePlatformFees, type PlatformFees } from '@/lib/platform-fees'

export async function getPlatformFeesAction(): Promise<PlatformFees> {
  await requireExecutive()
  return await getPlatformFees()
}

export async function updatePlatformFeesAction(formData: FormData): Promise<{
  success: boolean
  fees?: PlatformFees
  error?: string
}> {
  try {
    await requireExecutive()
    const consultation = Number(formData.get('consultation'))
    const diagnostic = Number(formData.get('diagnostic'))

    if (!Number.isFinite(consultation) || consultation < 0) {
      return { success: false, error: 'Please enter a valid consultation platform fee (0 or greater).' }
    }
    if (!Number.isFinite(diagnostic) || diagnostic < 0) {
      return { success: false, error: 'Please enter a valid diagnostic lab platform fee (0 or greater).' }
    }

    const updated = await savePlatformFees({
      consultation,
      diagnostic,
    })

    // Revalidate relevant pages
    revalidatePath('/executive/payments')
    revalidatePath('/executive/revenue')
    revalidatePath('/doctor/schedule')
    revalidatePath('/prices')

    return { success: true, fees: updated }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update platform fees'
    return { success: false, error: message }
  }
}
