import type { Metadata } from 'next'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { HospitalPageView } from '@/app/hospitals/[id]/HospitalPageView'
import { requireHospital } from '../_lib/hospital'
import { HosBackHeader, HosBody } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Patient page preview | Hospital Portal' }
export const dynamic = 'force-dynamic'

/** The hospital's own public page as patients see it, with booking turned off. (An iframe is blocked by the site's frame headers.) */
export default async function HospitalPreviewPage() {
  const { hospital } = await requireHospital()
  const live = hospital.status === 'active'

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Patient page preview" />
      <HosBody>
        <section className="mb-3.5 lg:mb-5 p-4 lg:px-[22px] lg:py-[18px] rounded-[18px] bg-[#2A4DD0] text-white flex flex-col lg:flex-row lg:items-center gap-3.5 lg:gap-5">
          <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[16px] font-extrabold">Patient view preview</span>
            <span className="block text-[13px] text-[#DCE6FF]">This is your hospital page as patients see it. Booking is turned off here.</span>
          </span>
          <span className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
            <Link href="/hospital/profile" className="h-[42px] px-3.5 rounded-[11px] border border-white/40 text-white text-[13.5px] font-extrabold flex items-center justify-center">
              Back to profile
            </Link>
            <Link href="/hospital/profile" className="h-[42px] px-3.5 rounded-[11px] bg-white text-[#2A4DD0] text-[13.5px] font-extrabold flex items-center justify-center">
              Edit profile
            </Link>
          </span>
        </section>

        {live ? (
          <HospitalPageView id={hospital.id} query={{}} preview />
        ) : (
          <p role="status" className="p-4 rounded-[14px] bg-[#FFF6E5] text-[#B54708] text-[13.5px] font-bold">
            Your hospital isn&apos;t listed yet, so patients can&apos;t open this page.
          </p>
        )}
      </HosBody>
    </>
  )
}
