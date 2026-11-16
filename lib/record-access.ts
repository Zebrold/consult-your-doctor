import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// "Who can see your records → Remove" (record_access_blocks, supabase/migrations/20261118_self_service_features.sql).
// A doctor stops seeing the patient's visits whose slot began before the patient removed them; a visit booked with that
// doctor later is shared again. Until the migration has run there are no blocks and nothing is hidden.

/** Patient id to the time (ms) they removed this doctor's access. An error, or a missing table, gives no blocks. */
export async function loadRecordBlocks(admin: Admin, doctorId: string): Promise<Map<string, number>> {
  const blocks = new Map<string, number>()
  const { data, error } = await admin.from('record_access_blocks').select('patient_id, blocked_at').eq('doctor_id', doctorId)
  if (error) return blocks
  for (const b of (data ?? []) as { patient_id: string; blocked_at: string }[]) {
    const at = Date.parse(b.blocked_at)
    if (Number.isFinite(at)) blocks.set(b.patient_id, at)
  }
  return blocks
}

/** True when the patient removed the doctor after this visit's slot (or its booking time, with no slot) began. */
export function hiddenByBlock(blocks: Map<string, number>, patientId: string | null | undefined, slotStartOrCreatedAt: string | null | undefined): boolean {
  if (!patientId || !slotStartOrCreatedAt) return false
  const blockedAt = blocks.get(patientId)
  if (blockedAt == null) return false
  const at = Date.parse(slotStartOrCreatedAt)
  return Number.isFinite(at) && at < blockedAt
}
