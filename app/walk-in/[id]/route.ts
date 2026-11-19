import { NextResponse, type NextRequest } from 'next/server'

// The address in a hospital's walk-in QR code (lib/walk-in.ts walkInLink): opens the hospital's page with walk-in
// ready. A short link of its own, so printed codes keep working if the hospital page's address ever changes.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const target = /^[0-9a-f-]{36}$/i.test(id) ? `/hospitals/${id}?walkin=1#book` : '/hospitals'
  return NextResponse.redirect(new URL(target, request.url), 307)
}
