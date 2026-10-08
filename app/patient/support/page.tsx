import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BrainCircuit, ChevronDown, HelpCircle, MessageCircleQuestion, PhoneCall } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PatientSidebar } from '@/components/PatientSidebar'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { SupportTicketButton } from '@/components/patient/SupportTicket'
import { currentTime, one } from '@/components/patient/data'
import { formatShortDate } from '@/components/patient/format'
import { COMPANY } from '@/lib/company'
import { CONSULTATION_PLATFORM_FEE, DIAGNOSTIC_PLATFORM_FEE } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Help & Support | Consult Your Doctor' }

// Answers describe what the site really does today.
const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'How do I get my prescription?',
    a: (
      <>
        When your doctor finishes the consultation, a prescription PDF is added to{' '}
        <Link href="/patient/profile#records" className="text-primary font-semibold hover:underline">
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
        <Link href="/patient/profile#labs" className="text-primary font-semibold hover:underline">
          Lab Tests &amp; Reports
        </Link>{' '}
        in your profile, and it is sent to you on WhatsApp and email.
      </>
    ),
  },
  {
    q: 'Can I reschedule or cancel an appointment?',
    a: 'You can’t change a booking yourself yet. Raise a ticket with the booking ID, or call the support desk, and the team will move or cancel it for you.',
  },
  {
    q: 'How do I pay, and is there a booking fee?',
    a: `Online bookings are paid through PayU (card, UPI or netbanking) and include a small platform fee: ₹${CONSULTATION_PLATFORM_FEE} for a consultation and ₹${DIAGNOSTIC_PLATFORM_FEE} for lab tests. At a hospital or lab desk you can pay by scanning their UPI code, through PayU, or in cash.`,
  },
  {
    q: 'How do I sign in?',
    a: 'Use your mobile number and the one-time code we text you. If a diagnostic centre registered you, you can also sign in with the Patient ID and password they gave you.',
  },
  {
    q: 'Who can see my medical records?',
    a: 'Only you, and the doctors, hospitals and labs you book with. Prescriptions and reports are stored privately and open through secure links that expire after a short time.',
  },
]

export default async function PatientSupport() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/patient?next=/patient/support')

  const [{ data: patientDetails }, { data: profile }, { data: appointments }, { data: labs }] = await Promise.all([
    supabase.from('patient_details').select('*').eq('id', user.id).maybeSingle(),
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
  // Counted as on the profile page: booked or awaiting payment, still ahead.
  const now = currentTime()
  const upcomingAppointments = visits.filter((a) => (a.status === 'confirmed' || a.status === 'pending_payment') && Date.parse(one(a.schedules)?.start_time ?? '') > now)
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

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <PatientNavHeader name={profile?.full_name} email={profile?.email || user.email} isSignedIn container="max-w-[1440px] px-margin-x-mobile lg:px-margin-x-desktop" />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-28 md:pb-32">
        <div className="relative w-full overflow-hidden">
          <div aria-hidden className="absolute -top-32 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute top-80 -left-20 w-80 h-80 bg-fresh-teal/5 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1440px] mx-auto">
              <PatientSidebar user={user} profile={profile} patientDetails={patientDetails} activeAppointmentsCount={upcomingAppointments.length} />

              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="mb-2">
                  <h1 className="font-display-lg text-headline-lg font-bold text-on-surface">Help, Support &amp; FAQs</h1>
                  <p className="font-body-md text-body-lg text-on-surface-variant mt-2">Get answers to common questions or reach our support desk.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-vibrant-blue text-on-primary rounded-xl p-5 shadow-sm flex flex-col items-center text-center gap-2.5">
                    <span className="w-11 h-11 bg-on-primary/10 rounded-full flex items-center justify-center">
                      <PhoneCall className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="font-title-md text-[17px] font-bold">Support Desk</h2>
                      <p className="font-label-sm text-label-sm text-on-primary/80 mt-1">Bookings, payments and accounts</p>
                    </div>
                    <a href={COMPANY.phoneHref} className="mt-1 py-2 px-5 rounded-full bg-on-primary text-vibrant-blue font-bold text-label-sm whitespace-nowrap">
                      Call {COMPANY.phone}
                    </a>
                  </div>

                  <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col items-center text-center gap-2.5">
                    <span className="w-11 h-11 bg-fresh-teal/10 text-fresh-teal rounded-full flex items-center justify-center">
                      <MessageCircleQuestion className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="font-title-md text-[17px] font-bold text-on-surface">Support Ticket</h2>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">For billing and technical issues</p>
                    </div>
                    <SupportTicketButton bookings={bookings} />
                  </div>

                  <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col items-center text-center gap-2.5">
                    <span className="w-11 h-11 bg-primary/10 text-vibrant-blue rounded-full flex items-center justify-center">
                      <BrainCircuit className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="font-title-md text-[17px] font-bold text-on-surface">Zebrold AI</h2>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Instant answers, any time</p>
                    </div>
                    <Link href="/ai" className="mt-2 py-2 px-6 rounded-full bg-surface-container-low text-on-surface font-bold text-label-sm border border-outline-variant/50 hover:bg-surface-container-high transition-colors">
                      Ask Zebrold AI
                    </Link>
                  </div>
                </div>

                <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                  <h2 className="font-title-md text-title-md font-bold text-on-surface mb-5 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-vibrant-blue" /> Frequently Asked Questions
                  </h2>
                  <div className="flex flex-col gap-3">
                    {FAQS.map((f, i) => (
                      <details key={f.q} open={i === 0} className="group border border-surface-variant rounded-xl open:bg-surface-container-low/60 transition-colors">
                        <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer p-4 flex justify-between items-center gap-3 rounded-xl hover:bg-surface-container-low">
                          <h3 className="font-title-md text-[15px] font-bold text-on-surface">{f.q}</h3>
                          <ChevronDown className="w-5 h-5 text-on-surface-variant shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="px-4 pb-4 -mt-1 text-[15px] leading-relaxed text-on-surface-variant">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </section>

                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-title-md text-[16px] font-bold text-on-surface">Platform Legal Terms &amp; Privacy</h3>
                    <p className="font-body-md text-label-sm text-on-surface-variant mt-0.5">
                      Consultation terms, refund criteria, health record confidentiality, and grievance contacts.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link href="/terms-of-use" className="font-label-sm text-xs font-bold text-vibrant-blue hover:underline">
                      Terms &amp; Conditions
                    </Link>
                    <span className="text-outline-variant">•</span>
                    <Link href="/privacy-policy" className="font-label-sm text-xs font-bold text-vibrant-blue hover:underline">
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <PatientDock activeTab="profile" name={profile?.full_name} />
    </div>
  )
}
