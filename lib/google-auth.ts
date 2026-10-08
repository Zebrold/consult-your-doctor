export function getGoogleClientId(): string {
  const envVal =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    ''
  return envVal.replace(/^https?:\/\//i, '').trim()
}

export function getGoogleClientSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET || '').trim()
}
