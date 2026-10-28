import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Languages, LogOut, Mail, MessageCircle, ShieldCheck, SquarePen, type LucideIcon } from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { AccountCard, AccountPage } from '@/components/patient/AccountPage'
import { ProfileEditButton } from '@/components/patient/ProfileEditButton'
import { btnOutline } from '@/components/patient/app-ui'

export const metadata: Metadata = { title: 'Settings | Consult Your Doctor' }

/** The patient's settings: their details, where updates go, the assistant's language, privacy and signing out. */
export default async function SettingsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login/patient?next=/patient/preferences')

  const [{ data: profile }, { data: details }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, phone_number').eq('id', user.id).maybeSingle(),
    supabase.from('patient_details').select('*').eq('id', user.id).maybeSingle(),
  ])
  const phone = profile?.phone_number || (user.phone ? `+${user.phone}` : null)
  const email = profile?.email || user.email || null
  const editDetails = {
    full_name: profile?.full_name ?? null,
    phone_number: phone,
    blood_group: details?.blood_group ?? null,
    date_of_birth: details?.date_of_birth ?? null,
    gender: details?.gender ?? null,
    address: details?.address ?? null,
    emergency_contact_name: details?.emergency_contact_name ?? null,
    emergency_contact_relation: details?.emergency_contact_relation ?? null,
    emergency_contact_phone: details?.emergency_contact_phone ?? null,
  }

  return (
    <AccountPage
      user={user}
      profile={profile}
      title="Settings"
      subtitle="Your details, updates and privacy."
      actions={
        <ProfileEditButton details={editDetails} className={btnOutline}>
          <SquarePen className="w-[15px] h-[15px]" /> Edit details
        </ProfileEditButton>
      }
    >
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3.5 lg:gap-5 lg:items-start">
        <AccountCard title="Updates about your visits" sub="Booking slips, prescriptions and lab reports are sent here.">
          <Line icon={MessageCircle} label="WhatsApp and text" value={phone ?? 'No mobile number yet'} muted={!phone} />
          <Line icon={Mail} label="Email" value={email ?? 'No email yet'} muted={!email} />
          <ProfileEditButton details={editDetails} className={`${btnOutline} w-full mt-3`}>
            <SquarePen className="w-[15px] h-[15px]" /> Change your details
          </ProfileEditButton>
        </AccountCard>

        <div className="flex flex-col gap-3.5 lg:gap-5">
          <AccountCard title="Language" sub="The Care Assistant answers in Hindi, Telugu, Tamil, Bengali and more.">
            <Link href="/ai" className="flex items-center gap-3 py-3 border-t border-[#EEF2F7] text-[14px] font-bold hover:text-[#2A4DD0]">
              <Languages className="w-[19px] h-[19px] text-[#4A5878]" />
              <span className="flex-1">Choose it at the top of the chat</span>
              <ChevronRight className="w-4 h-4 text-[#9AA4B5]" strokeWidth={2.4} />
            </Link>
          </AccountCard>

          <section className="rounded-[20px] lg:rounded-2xl bg-white shadow-[0_0_0_1px_#E6EBF3] lg:shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
            <Row href="/privacy-policy" icon={ShieldCheck} label="Privacy policy" />
            <Row href="/legal" icon={ShieldCheck} label="Consent forms and all policies" />
            <form action="/auth/signout" method="post">
              <button type="submit" className="w-full flex items-center gap-3 min-h-[52px] px-4 text-[14px] font-extrabold text-[#B42318] text-left hover:bg-[#FEF3F2] transition-colors">
                <LogOut className="w-[19px] h-[19px]" /> Log out
              </button>
            </form>
          </section>
        </div>
      </div>
    </AccountPage>
  )
}

function Line({ icon: Icon, label, value, muted }: { icon: LucideIcon; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 border-t border-[#EEF2F7]">
      <Icon className="w-[19px] h-[19px] text-[#4A5878] shrink-0" />
      <span className="min-w-0">
        <span className="block text-[12px] font-bold text-[#5B667A]">{label}</span>
        <span className={`block text-[14px] truncate ${muted ? 'font-semibold text-[#8A94A6]' : 'font-extrabold'}`}>{value}</span>
      </span>
    </div>
  )
}

function Row({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 min-h-[52px] px-4 border-b border-[#EEF2F7] text-[14px] font-bold hover:bg-[#F7F9FC] transition-colors">
      <Icon className="w-[19px] h-[19px] text-[#4A5878]" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-[#9AA4B5]" strokeWidth={2.4} />
    </Link>
  )
}
