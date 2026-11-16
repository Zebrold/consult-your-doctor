import QRCode from 'qrcode'
import { siteUrl } from '@/lib/site-url'

// The QR code in booking emails, at /api/booking-qr/<booking id>.png. It holds only the booking page's address (the
// same one the email links to), so it is drawn from the id alone, with no database read. Emails link it instead of
// attaching it, so inboxes don't list it as an attachment. The .png ending keeps the proxy (session refresh) off it.

const FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.png$/i

export async function GET(_request: Request, props: { params: Promise<{ file: string }> }) {
  const { file } = await props.params
  const id = FILE.exec(file)?.[1]?.toLowerCase()
  if (!id) return new Response('Not found', { status: 404 })
  const png = await QRCode.toBuffer(`${siteUrl()}/book/confirmation/${id}`, { margin: 1, width: 240 })
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
