import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StaffAccount } from '@/components/portal/StaffAccount'
import { requireHospital } from '../../_lib/hospital'
import { HosBackHeader, HosBody } from '../../_components/hos-ui'

export const metadata: Metadata = { title: 'Login details | Hospital Portal' }
export const dynamic = 'force-dynamic'

/** The signed-in admin's own login: name, mobile number, Staff ID and password. Kept apart from the hospital profile. */
export default async function HospitalAccountPage() {
  const { admin, user } = await requireHospital()
  const { data: me } = await admin.from('profiles').select('full_name, phone_number, staff_id').eq('id', user.id).maybeSingle()

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to settings" title="Login details" />
      <HosBody>
        {/* Desktops: back to the settings and the title */}
        <div className="hidden lg:block mb-[22px]">
          <Link href="/hospital/more" className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Account &amp; settings
          </Link>
          <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em] leading-tight">Login details</h1>
          <p className="mt-1 text-[14px] text-[#5B667A]">Your name, mobile number, Staff ID and password</p>
        </div>
        <StaffAccount name={me?.full_name ?? ''} phone={me?.phone_number ?? null} staffId={me?.staff_id ?? null} roleLabel="Hospital admin" />
      </HosBody>
    </>
  )
}
