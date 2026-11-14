import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Hospital branches under one login (hospital_admin_access, supabase/migrations/20261114_grow_and_manage.sql). The
// hospital an admin is signed in to stays profiles.hospital_id; the access table lists the others they may switch to.

/**
 * The hospitals this admin may switch between, the current one first. `ready` is false until the migration has run;
 * the current hospital is always included.
 */
export async function accessibleHospitals(admin: Admin, profileId: string, currentId: string): Promise<{ ready: boolean; ids: string[] }> {
  const { data, error } = await admin.from('hospital_admin_access').select('hospital_id').eq('profile_id', profileId).limit(200)
  if (error) return { ready: false, ids: [currentId] }
  const ids = ((data ?? []) as { hospital_id: string }[]).map((r) => r.hospital_id)
  return { ready: true, ids: [currentId, ...ids.filter((id) => id !== currentId)] }
}

/** Whether this admin may act on (or switch to) this hospital. */
export async function canReach(admin: Admin, profileId: string, hospitalId: string): Promise<boolean> {
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', profileId).maybeSingle()
  if (profile?.role !== 'hospital_admin') return false
  if (profile.hospital_id === hospitalId) return true
  const { data } = await admin.from('hospital_admin_access').select('hospital_id').eq('profile_id', profileId).eq('hospital_id', hospitalId).maybeSingle()
  return !!data
}

export type BranchPerson = { id: string; name: string; staffId: string | null; signedInTo: string | null; hospitalIds: string[] }

/** Every hospital admin who can reach any of these hospitals, with the ones (of these) they can reach. */
export async function branchPeople(admin: Admin, hospitalIds: string[]): Promise<BranchPerson[]> {
  if (!hospitalIds.length) return []
  const [{ data: rows }, { data: signedIn }] = await Promise.all([
    admin.from('hospital_admin_access').select('profile_id, hospital_id').in('hospital_id', hospitalIds).limit(2000),
    admin.from('profiles').select('id').eq('role', 'hospital_admin').in('hospital_id', hospitalIds).limit(2000),
  ])
  const access = new Map<string, Set<string>>()
  for (const r of (rows ?? []) as { profile_id: string; hospital_id: string }[]) access.set(r.profile_id, (access.get(r.profile_id) ?? new Set()).add(r.hospital_id))
  const ids = [...new Set([...access.keys(), ...((signedIn ?? []) as { id: string }[]).map((p) => p.id)])]
  if (!ids.length) return []
  const { data: profiles } = await admin.from('profiles').select('id, full_name, staff_id, hospital_id, role').in('id', ids).limit(2000)
  return ((profiles ?? []) as { id: string; full_name: string | null; staff_id: string | null; hospital_id: string | null; role: string }[])
    .filter((p) => p.role === 'hospital_admin')
    .map((p) => {
      const reach = new Set(access.get(p.id) ?? [])
      if (p.hospital_id && hospitalIds.includes(p.hospital_id)) reach.add(p.hospital_id)
      return { id: p.id, name: p.full_name || 'Hospital admin', staffId: p.staff_id, signedInTo: p.hospital_id, hospitalIds: [...reach] }
    })
    .sort((a, b) => b.hospitalIds.length - a.hospitalIds.length || a.name.localeCompare(b.name))
}
