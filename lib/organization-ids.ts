import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Returns or generates a readable unique Hospital Code: "CYD-HOSP-1042".
 */
export async function getOrAssignHospitalCode(admin: Admin, hospitalId: string): Promise<string> {
  try {
    const { data: hosp } = await admin
      .from('hospitals')
      .select('hospital_code')
      .eq('id', hospitalId)
      .maybeSingle()

    if (hosp?.hospital_code) return hosp.hospital_code

    // Generate next code
    const { count } = await admin.from('hospitals').select('*', { count: 'exact', head: true })
    const code = `CYD-HOSP-${String(1000 + (count ?? 0) + 1)}`

    // Try saving code if column exists
    await admin.from('hospitals').update({ hospital_code: code }).eq('id', hospitalId)
    return code
  } catch {
    return `CYD-HOSP-${hospitalId.slice(0, 4).toUpperCase()}`
  }
}

/**
 * Returns or generates a readable unique Diagnostic Centre Code: "CYD-DIAG-1015".
 */
export async function getOrAssignDiagnosticCenterCode(admin: Admin, centerId: string): Promise<string> {
  try {
    const { data: center } = await admin
      .from('diagnostic_centers')
      .select('center_code')
      .eq('id', centerId)
      .maybeSingle()

    if (center?.center_code) return center.center_code

    const { count } = await admin.from('diagnostic_centers').select('*', { count: 'exact', head: true })
    const code = `CYD-DIAG-${String(1000 + (count ?? 0) + 1)}`

    await admin.from('diagnostic_centers').update({ center_code: code }).eq('id', centerId)
    return code
  } catch {
    return `CYD-DIAG-${centerId.slice(0, 4).toUpperCase()}`
  }
}

export function displayOrgCode(code: string | null | undefined, fallbackId?: string, prefix = 'CYD-ORG'): string {
  if (code && code.trim().length > 0) return code.trim()
  if (fallbackId) return `${prefix}-${fallbackId.slice(0, 4).toUpperCase()}`
  return '—'
}
