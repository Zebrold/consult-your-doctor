// The `user-role` cookie lets the middleware send a signed-in user to their portal without a database query on
// every request. It only steers navigation (pages and actions check the role themselves). The value carries the
// user id, so a cookie left behind by another account on the same browser is ignored instead of routing this
// user into a portal that then sends them back: that ping-pong showed up as "too many redirects".

export const ROLE_COOKIE = 'user-role'
export const ROLE_COOKIE_OPTIONS = { maxAge: 7200, path: '/', sameSite: 'lax' as const, httpOnly: true }

export const roleCookieValue = (userId: string, role: string) => `${userId}:${role}`

/** The role stored for this user, or null when the cookie is missing, malformed, or belongs to someone else. */
export function readRoleCookie(value: string | undefined, userId: string): string | null {
  if (!value) return null
  const sep = value.lastIndexOf(':')
  if (sep < 0 || value.slice(0, sep) !== userId) return null
  return value.slice(sep + 1) || null
}
