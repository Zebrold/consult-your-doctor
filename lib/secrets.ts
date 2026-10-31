// The secret that signs one-time login codes and desk tokens (HMAC). Set CYD_AUTH_SECRET to a long random value of its own,
// so the Supabase service-role key can be rotated without invalidating codes or tokens in flight. Until it is set, the
// service-role key is used, as before.
export function authSecret(): string | null {
  return process.env.CYD_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}
