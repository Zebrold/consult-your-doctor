import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { serverFetch } from './fetch'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // A stalled request gives up instead of hanging the page (lib/supabase/fetch.ts).
      global: { fetch: serverFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * The signed-in user, verified with Supabase Auth (a network request). Server actions, API routes and the staff portals
 * use this: it notices at once when a session was ended elsewhere or an account was removed (banned). Pages for
 * patients and visitors use getSessionUser instead, which needs no request. cache() makes repeated calls on one request
 * a single network call.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** What a page needs to know about the signed-in person. */
export type SessionUser = Pick<User, 'id' | 'email' | 'phone' | 'user_metadata' | 'app_metadata'>

/**
 * The signed-in user for drawing a page: the claims in the session token, whose signature is checked on this server
 * against the project's published signing key (fetched once and kept). Unlike getCurrentUser this makes no request to
 * Supabase Auth, so every signed-in page starts its queries one round trip sooner. Reads through the session client are
 * held to the same token by row level security. A session ended elsewhere, or a removed account, stays valid here
 * until its token expires (an hour at most), which is why anything that changes data, and the staff portals, keep
 * using getCurrentUser.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub || claims.role !== 'authenticated') return null
  return {
    id: claims.sub,
    email: claims.email || undefined,
    phone: claims.phone || undefined,
    user_metadata: claims.user_metadata ?? {},
    app_metadata: claims.app_metadata ?? {},
  }
})
