import type { Metadata } from 'next'
import QRCode from 'qrcode'
import { siteUrl } from '@/lib/site-url'
import { readWalkIn, walkInLink, walkInState } from '@/lib/walk-in'
import { currentTime } from '@/components/patient/data'
import { requireHospital } from '../_lib/hospital'
import { WalkInBoard } from '../_components/WalkInBoard'

export const metadata: Metadata = { title: 'Walk-in & QR | Hospital Portal' }
export const dynamic = 'force-dynamic'

/** Walk-in & QR: the hours the hospital takes walk-ins, and its own QR code patients scan to book one (lib/walk-in.ts). */
export default async function HospitalWalkInPage() {
  const { admin, hospital, staff } = await requireHospital()
  // `*`: the walk-in columns arrive with 20261122_hospital_walk_in.sql.
  const { data } = await admin.from('hospitals').select('*').eq('id', hospital.id).maybeSingle()
  const { ready, saved, hours } = readWalkIn(data as Record<string, unknown> | null)
  const link = walkInLink(siteUrl(), hospital.id)
  const qr = await QRCode.toDataURL(link, { errorCorrectionLevel: 'M', margin: 2, width: 720, color: { dark: '#0B1B3F', light: '#FFFFFF' } })

  return <WalkInBoard hospitalName={hospital.name} staff={staff} ready={ready} saved={saved} state={walkInState(hours, currentTime())} link={link} qr={qr} />
}
