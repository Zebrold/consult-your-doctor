'use server'

import { revalidatePath } from 'next/cache'
import { requireExecutive } from '@/app/executive/_lib/ops'
import { getPlatformFees, savePlatformFees, type PlatformFees, type PlatformFeeItem } from '@/lib/platform-fees'

export async function getPlatformFeesAction(): Promise<PlatformFees> {
  await requireExecutive()
  return await getPlatformFees()
}

export type UpdatePlatformFeesPayload =
  | FormData
  | {
      items?: PlatformFeeItem[]
      consultation?: number
      diagnostic?: number
    }

export async function updatePlatformFeesAction(payload: UpdatePlatformFeesPayload): Promise<{
  success: boolean
  fees?: PlatformFees
  error?: string
}> {
  try {
    await requireExecutive()

    let items: PlatformFeeItem[] | undefined
    let consultation: number | undefined
    let diagnostic: number | undefined

    if (payload instanceof FormData) {
      const itemsRaw = payload.get('items')
      if (typeof itemsRaw === 'string' && itemsRaw.trim()) {
        try {
          items = JSON.parse(itemsRaw)
        } catch {
          return { success: false, error: 'Invalid items payload JSON.' }
        }
      }
      const c = payload.get('consultation')
      const d = payload.get('diagnostic')
      if (c !== null) consultation = Number(c)
      if (d !== null) diagnostic = Number(d)
    } else {
      items = payload.items
      consultation = payload.consultation
      diagnostic = payload.diagnostic
    }

    if (items) {
      if (!Array.isArray(items)) {
        return { success: false, error: 'Platform fee items must be a list.' }
      }
      for (const item of items) {
        if (!item.name || !item.name.trim()) {
          return { success: false, error: 'All platform fees must have a valid name.' }
        }
        if (!Number.isFinite(Number(item.amount)) || Number(item.amount) < 0) {
          return {
            success: false,
            error: `Platform fee "${item.name}" must have a valid non-negative amount (₹0 or more).`,
          }
        }
      }
    } else {
      if (consultation !== undefined && (!Number.isFinite(consultation) || consultation < 0)) {
        return { success: false, error: 'Please enter a valid consultation platform fee (0 or greater).' }
      }
      if (diagnostic !== undefined && (!Number.isFinite(diagnostic) || diagnostic < 0)) {
        return { success: false, error: 'Please enter a valid diagnostic lab platform fee (0 or greater).' }
      }
    }

    const updated = await savePlatformFees({
      items,
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
