import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronDown, HelpCircle, MessageCircleQuestion, PhoneCall, Stethoscope } from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { DeskTitle, PageBody, btnOutline, card } from '@/components/patient/app-ui'
import { PatientDock } from '@/components/PatientDock'
import { SupportTicketButton } from '@/components/patient/SupportTicket'
import { one } from '@/components/patient/data'
import { formatShortDate } from '@/components/patient/format'
import { COMPANY } from '@/lib/company'
import { formatPercent, type BookingFees } from '@/lib/pricing'
import { getBookingFees } from '@/lib/booking-fees'
import { formatINR } from '@/components/patient/format'

export const metadata: Metadata = { title: 'Help & Support | Consult Your Doctor' }

// Answers describe what the site really does today.
const faqs = (fees: BookingFees): { q: string; a: React.ReactNode }[] => [
  {
    q: 'How do I get my prescription?',
    a: (
      <>
        When your doctor finishes the consultation, a prescription PDF is added to{' '}
        <Link href="/patient/profile#records" className="font-extrabold text-[#2A4DD0] hover:underline">
          My Profile → Prescriptions &amp; Health Records
        </Link>
        . It is also sent to you on WhatsApp, and by email if you’ve given one.
      </>
    ),
  },
  {
    q: 'Where do my lab reports appear?',
    a: (
      <>
        As soon as the lab finishes your report it appears under{' '}
        <Link href="/patient/profile#labs" className="font-extrabold text-[#2A4DD0] hover:underline">
          Lab Tests &amp; Reports
        </Link>{' '}
        in your profile, and it is sent to you on WhatsApp and email.
      </>
    ),
  },
  {
    q: 'Can I reschedule or cancel an appointment?',
    a: 'You can’t change a booking yourself yet. Raise a ticket with the booking ID, or call the support desk, and the team will move or cancel it for you. Your booking fee is refunded in full if you cancel at least 2 hours before the slot, or if the doctor, hospital or lab cancels; refunds go back to your original payment method within 5–7 working days.',
  },
  {
    q: 'How do I pay, and is there a booking fee?',
    a: `Online you pay only the booking fee, through PayU (card, UPI or netbanking): ${formatINR(fees.consultation)} for a doctor appointment (${formatINR(fees.fastTrack)} for fast track), or ${formatPercent(fees.diagnosticPercent)} of each test's price for lab tests. The doctor's consultation fee is set by the hospital and paid at the hospital counter, and lab tests are paid at the lab. If you book at a hospital or lab desk, you pay there by scanning their UPI code or in cash.`,
  },
  {
    q: 'How do I log in?',
    a: 'Use your mobile number and the one-time code we text you. If a diagnostic centre registered you, you can also log in with the Patient ID and password they gave you.',
  },
  {
    q: 'Who can see my medical records?',
    a: 'Only you, and the doctors, hospitals and labs you book with. Prescriptions and reports are stored privately and open through secure links that expire after a short time.',
  },
]

export default async function PatientSupport() {
  const FAQS = faqs(await getBookingFees())
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login/patient?next=/patient/support')

  const [{ data: profile }, { data: appointments }, { data: labs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('appointments')
      .select('id, status, doctors ( profiles!doctors_profile_id_fkey ( full_name ) ), schedules ( start_time )')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('diagnostic_bookings').select('id, test_name, preferred_date').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(10),
  ])

  type Joined<T> = T | T[] | null
  const visits = (appointments ?? []) as unknown as { id: string; status: string; doctors: Joined<{ profiles: Joined<{ full_name: string | null }> }>; schedules: Joined<{ start_time: string }> }[]
  const bookings = [
    ...visits.map((v) => {
      const at = one(v.schedules)?.start_time
      return { id: v.id.slice(0, 8).toUpperCase(), label: `Consultation with ${one(one(v.doctors)?.profiles)?.full_name ?? 'doctor'}${at ? `, ${formatShortDate(at)}` : ''} (#${v.id.slice(0, 8).toUpperCase()})` }
    }),
    ...((labs ?? []) as { id: string; test_name: string; preferred_date: string | null }[]).map((b) => ({
      id: b.id.slice(0, 8).toUpperCase(),
      label: `Lab: ${b.test_name}${b.preferred_date ? `, ${formatShortDate(`${b.preferred_date}T12:00:00+05:30`)}` : ''} (#${b.id.slice(0, 8).toUpperCase()})`,
    })),
  ]

  const name = profile?.full_name || user.user_metadata?.full_name || 'Patient'
  const uhid = `CYD-${user.id.slice(0, 8).toUpperCase()}`

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen">
      <PatientNavHeader
        name={name}
        email={profile?.email || user.email}
        isSignedIn
        container="max-w-[900px] px-4 md:px-6"
        backHref="/patient/profile"
        eyebrow="My account"
        title="Help & support"
        subtitle="Answers to common questions, or reach our support desk."
        deskHidden
      />
      <PageBody>
        <div className="max-w-[900px] lg:max-w-[1080px] mx-auto lg:mx-0 px-4 md:px-6 lg:px-0 pt-4 lg:pt-0 flex flex-col gap-3.5 lg:gap-5">
          <DeskTitle title="Help & support" subtitle="Answers to common questions, or reach our support desk." />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
            <div className="rounded-[18px] lg:rounded-2xl bg-[#2A4DD0] text-white p-5 flex flex-col items-start gap-2.5">
              <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-[16px] font-extrabold">Support desk</span>
                <span className="block text-[12.5px] text-[#DCE6FF]">Bookings, payments and accounts</span>
              </span>
              <a href={COMPANY.phoneHref} className="mt-1 h-10 px-4 rounded-[11px] bg-white text-[#2A4DD0] text-[13.5px] font-extrabold flex items-center whitespace-nowrap hover:bg-white/90 transition-colors">
                Call {COMPANY.phone}
              </a>
            </div>
            <div className={`${card} p-5 flex flex-col items-start gap-2.5`}>
              <span className="w-11 h-11 rounded-full bg-[#ECFDF3] text-[#067647] flex items-center justify-center">
                <MessageCircleQuestion className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-[16px] font-extrabold">Support ticket</span>
                <span className="block text-[12.5px] text-[#5B667A]">For billing and technical issues</span>
              </span>
              <SupportTicketButton bookings={bookings} />
            </div>
            <div className={`${card} p-5 flex flex-col items-start gap-2.5`}>
              <span className="w-11 h-11 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-[16px] font-extrabold">Care Assistant</span>
                <span className="block text-[12.5px] text-[#5B667A]">Instant answers, any time</span>
              </span>
              <Link href="/ai" className={`${btnOutline} mt-1`}>
                Ask the assistant
              </Link>
            </div>
          </div>

          <section aria-labelledby="faq-title" className={`${card} rounded-[20px]! lg:rounded-2xl! p-4 lg:p-[22px]`}>
            <h2 id="faq-title" className="flex items-center gap-2 mb-3 text-[16px] font-extrabold">
              <HelpCircle className="w-[18px] h-[18px] text-[#2A4DD0]" /> Frequently asked questions
            </h2>
            {FAQS.map((f, i) => (
              <details key={f.q} open={i === 0} className="group border-t border-[#EEF2F7]">
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-3.5 flex justify-between items-center gap-3">
                  <h3 className="text-[14.5px] font-extrabold">{f.q}</h3>
                  <ChevronDown className="w-[18px] h-[18px] text-[#5B667A] shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 -mt-1 text-[14px] leading-relaxed text-[#4A5878]">{f.a}</p>
              </details>
            ))}
          </section>

          <div className={`${card} p-4 lg:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
            <span>
              <span className="block text-[15px] font-extrabold">Legal terms &amp; privacy</span>
              <span className="block mt-0.5 text-[12.5px] text-[#5B667A]">Consultation terms, refunds, record confidentiality and grievance contacts.</span>
            </span>
            <span className="flex items-center gap-3 shrink-0 text-[13px] font-extrabold text-[#2A4DD0]">
              <Link href="/terms-of-use" className="hover:underline">Terms</Link>
              <span className="text-[#B7C1D1]">·</span>
              <Link href="/privacy-policy" className="hover:underline">Privacy</Link>
              <span className="text-[#B7C1D1]">·</span>
              <Link href="/legal" className="hover:underline">All policies</Link>
            </span>
          </div>
        </div>
      </PageBody>
      <PatientDock activeTab="profile" name={name} detail={`UHID ${uhid}`} />
    </div>
  )
}
