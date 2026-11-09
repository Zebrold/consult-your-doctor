import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { loadHospitalWallet } from '@/lib/wallet'
import { requireHospital } from '../_lib/hospital'
import { PayoutsView } from '../_components/PayoutsView'

export const metadata: Metadata = { title: 'Payouts | Hospital Portal' }
export const dynamic = 'force-dynamic'

export default async function HospitalPayoutsPage() {
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const wallet = await loadHospitalWallet(admin, hospital.id, 2000)
  return <PayoutsView wallet={wallet} now={now} />
}
