import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { AccountCard, AccountPage } from '@/components/patient/AccountPage'

export const metadata: Metadata = { title: 'Family | Consult Your Doctor' }

/** Family members. Linked family accounts don't exist yet, so the page says how to book for someone else today. */
export default async function FamilyPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login/patient?next=/patient/family')
  const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle()

  return (
    <AccountPage user={user} profile={profile} title="Family" subtitle="Booking for the people you care for.">
      <AccountCard>
        <div className="py-3 text-center">
          <span className="inline-flex w-12 h-12 rounded-full bg-[#EEF3FF] text-[#2A4DD0] items-center justify-center">
            <Users className="w-[22px] h-[22px]" />
          </span>
          <p className="mt-2.5 text-[15px] font-extrabold">Family accounts aren&apos;t available yet</p>
          <p className="mt-1 max-w-md mx-auto text-[13px] leading-relaxed text-[#5B667A]">
            Bookings, prescriptions and reports belong to the account that books them. Each family member can sign in with their own mobile number to book and keep their records.
          </p>
          <Link href="/patient/support" className="inline-block mt-3.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
            Questions? Contact support
          </Link>
        </div>
      </AccountCard>
    </AccountPage>
  )
}
