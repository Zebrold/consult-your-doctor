import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Finding a sign-in account by email or phone. auth.admin.listUsers() returns one page (50 accounts by default), so
// matching against a single call stops finding people once the project has more accounts than that: their next
// Google or OTP sign-in then tries to create a second account and fails.
//
// The database function public.cyd_find_auth_user (supabase/migrations/20261016_audit_hardening.sql) is one indexed
// lookup. Until it exists, every page of accounts is read.

const PER_PAGE = 1000
const MAX_PAGES = 200

export const phoneDigits = (phone: string) => phone.replace(/\D/g, '')

type Lookup = { email: string } | { phone: string }

/** The id of the sign-in account with this email (any case) or phone number (any format), or null. */
export async function findAuthUserId(admin: Admin, by: Lookup): Promise<string | null> {
  const email = 'email' in by ? by.email.trim().toLowerCase() : null
  const phone = 'phone' in by ? phoneDigits(by.phone) : null
  if (!email && !phone) return null

  const { data, error } = await admin.rpc('cyd_find_auth_user', { p_email: email, p_phone: phone })
  if (!error) return typeof data === 'string' ? data : null

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (listError) throw listError
    const users = list?.users ?? []
    const found = users.find((u) => (email ? u.email?.toLowerCase() === email : !!u.phone && phoneDigits(u.phone) === phone))
    if (found) return found.id
    if (users.length < PER_PAGE) return null
  }
  return null
}
