import { Header } from '@/components/Header'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Globe2,
  HeartPulse,
  LockKeyhole,
  MessageCircleHeart,
  Microscope,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react'

export const metadata = {
  title: 'About Us | Consult Your Doctor',
  description:
    'Learn how Consult Your Doctor connects patients, doctors, hospitals and diagnostics through a more coordinated healthcare journey.',
}

const principles = [
  {
    title: 'Consult',
    description:
      'Connect patients with appropriate doctors, specialists and healthcare services.',
  },
  {
    title: 'Understand',
    description:
      'Help patients understand instructions, information and the next steps in their care journey.',
  },
  {
    title: 'Assess',
    description:
      'Use structured digital assessments and responsible AI systems to organize relevant patient information.',
  },
  {
    title: 'Follow Up',
    description:
      'Support reminders, investigations, appointments and post-consultation continuity.',
  },
  {
    title: 'Connect',
    description:
      'Guide patients toward the right healthcare professional or service when further support is required.',
  },
]

const journey = [
  'Doctor consultation',
  'Clinical instructions',
  'AI-assisted follow-up',
  'Diagnostics / investigations',
  'Patient updates',
  'Follow-up consultation',
  'Continuing care',
]

const trustPoints = [
  {
    icon: Stethoscope,
    title: 'Doctor-led care',
    description: 'Technology supports healthcare professionals; it does not replace clinical judgement.',
  },
  {
    icon: HeartPulse,
    title: 'Patient-first experience',
    description: 'Clear, guided journeys designed around patient needs before and after consultation.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy & trust',
    description: 'Secure handling, access control and responsible data practices are core to the platform.',
  },
  {
    icon: Building2,
    title: 'Connected ecosystem',
    description: 'Doctors, hospitals, diagnostics and patients connected through one coordinated layer.',
  },
]

const ecosystem = [
  {
    icon: Users,
    label: 'For Patients',
    title: 'Clarity after the consultation',
    description:
      'A structured journey that helps patients understand what comes next and access the right healthcare services.',
    points: [
      'Clear next-step guidance',
      'Appointment and follow-up support',
      'Investigation coordination',
      'Better continuity of care',
    ],
  },
  {
    icon: Stethoscope,
    label: 'For Doctors',
    title: 'A digital extension of care',
    description:
      'Tools that support organized communication and continuity without adding unnecessary administrative burden.',
    points: [
      'Structured patient follow-up',
      'Organized patient information',
      'Appointment coordination',
      'Administrative communication support',
    ],
  },
  {
    icon: Building2,
    label: 'For Hospitals',
    title: 'Stronger patient engagement',
    description:
      'Extend the hospital-patient relationship beyond a single consultation through coordinated digital workflows.',
    points: [
      'Post-consultation engagement',
      'Investigation coordination',
      'Appointment continuity',
      'Reduced operational friction',
    ],
  },
  {
    icon: Microscope,
    label: 'For Diagnostics',
    title: 'Connected testing pathways',
    description:
      'Create a smoother journey from recommended investigations to booking, results and professional follow-up.',
    points: [
      'Recommended investigation flow',
      'Booking support',
      'Result availability',
      'Follow-up doctor review',
    ],
  },
]

const privacyPoints = [
  'Privacy by design',
  'Secure information handling',
  'Access controls',
  'Consent-based sharing',
  'Responsible AI practices',
  'Appropriate data governance',
  'Interoperability',
  'Regulatory awareness',
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:52px_52px] opacity-50 [mask-image:linear-gradient(to_bottom,#000,transparent_82%)]" />
          <div className="absolute -right-32 top-8 h-96 w-96 rounded-full bg-red-100/70 blur-3xl" />

          <div className="relative mx-auto grid max-w-[1200px] gap-12 px-6 py-20 md:px-10 md:py-28 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-[#E31E24]">
                About Consult Your Doctor
              </div>

              <h1 className="max-w-4xl text-4xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-5xl md:text-6xl md:leading-[1.08]">
                Healthcare should continue{' '}
                <span className="text-[#E31E24]">after the consultation ends.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                Consult Your Doctor is building a connected healthcare platform that helps patients move
                from consultation to follow-up with greater clarity, continuity and confidence.
              </p>

              <p className="mt-4 max-w-2xl leading-7 text-slate-500">
                We connect patients, doctors, hospitals, diagnostics and intelligent digital systems through
                a coordinated care journey designed around what happens next.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/book-appointment"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E24] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  Book Appointment
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Find a Doctor
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] sm:p-7">
                <div className="rounded-2xl bg-slate-950 p-7 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">
                        Our purpose
                      </p>
                      <h2 className="mt-3 text-2xl font-bold leading-tight">
                        From consultation to continuity.
                      </h2>
                    </div>
                  </div>

                  <p className="mt-5 leading-7 text-slate-300">
                    We aim to make healthcare easier to navigate by creating a structured digital layer
                    between a consultation and the patient&apos;s next healthcare decision.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Consultation', 'Connect with care'],
                    ['Follow-up', 'Stay on track'],
                    ['Diagnostics', 'Coordinate next steps'],
                    ['Continuity', 'Keep the journey connected'],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-sm text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto grid max-w-[1200px] gap-px px-6 py-8 sm:grid-cols-2 md:px-10 lg:grid-cols-4">
            {trustPoints.map(({ icon: Icon, title, description }) => (
              <div key={title} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl border border-red-100 bg-white p-2.5 text-[#E31E24] shadow-sm">
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* VISION + PROBLEM */}
        <section className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">Our Vision</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  A healthcare journey that feels connected.
                </h2>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  A consultation may last only a few minutes, but a patient&apos;s healthcare journey often
                  continues for days or weeks. Questions arise, investigations are needed, instructions can
                  be forgotten and follow-up may be delayed.
                </p>
                <p className="mt-5 leading-7 text-slate-600">
                  Our vision is to create a structured digital layer that helps patients understand, follow,
                  monitor and continue their healthcare journey responsibly.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 md:p-9">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                  The gap we are solving
                </p>
                <h3 className="mt-3 text-2xl font-bold text-slate-950">What happens after the consultation?</h3>

                <div className="mt-6 space-y-4">
                  {[
                    'Understanding the diagnosis or clinical assessment',
                    'Remembering medication and care instructions',
                    'Booking laboratory tests or imaging',
                    'Keeping track of follow-up requirements',
                    'Managing questions that appear later',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <p className="leading-6 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRINCIPLES */}
        <section className="border-y border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                How the platform works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Five principles guide the patient journey.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The platform is designed to make healthcare navigation more structured, understandable and
                continuous.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-5">
              {principles.map((item, index) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg hover:shadow-slate-200/60"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-sm font-extrabold text-[#E31E24]">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CARE JOURNEY */}
        <section className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                  Post-consultation continuity
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  The consultation is only the beginning.
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  After a consultation, the platform can help create a more structured path for instructions,
                  investigations, communication and follow-up.
                </p>

                <div className="mt-7 rounded-2xl border border-red-100 bg-red-50 p-5">
                  <div className="flex items-start gap-3">
                    <p className="text-sm leading-6 text-slate-700">
                      Our objective is simple: make the patient&apos;s next healthcare decision easier to navigate.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute bottom-8 left-[19px] top-8 w-px bg-slate-200" />
                <div className="space-y-3">
                  {journey.map((step, index) => (
                    <div key={step} className="relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <p className="font-semibold text-slate-800">{step}</p>
                        {index < journey.length - 1 && (
                          <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI */}
        <section className="border-y border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="grid gap-10 rounded-[30px] bg-slate-950 p-7 text-white md:p-10 lg:grid-cols-[.9fr_1.1fr] lg:p-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-red-300">
                  AI-assisted support
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                  Technology around the doctor, not instead of the doctor.
                </h2>
                <p className="mt-5 leading-7 text-slate-300">
                  Our AI-integrated assistance layer can help organize information, support structured
                  follow-up and improve patient communication after a consultation.
                </p>

                <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start gap-3">
                    <p className="text-sm leading-6 text-slate-300">
                      AI is not positioned as a replacement for a doctor. Clinical decisions remain within
                      the appropriate professional healthcare framework.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  'AI-assisted questionnaires',
                  'Post-consultation follow-ups',
                  'Patient instruction reminders',
                  'Investigation guidance',
                  'Follow-up scheduling',
                  'Information organization',
                  'Automated communication',
                  'Professional escalation pathways',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-slate-200">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM */}
        <section className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                Healthcare ecosystem
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Designed to work alongside healthcare providers.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Consult Your Doctor is designed as a coordinated layer that connects the people and services
                already involved in a patient&apos;s care.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {ecosystem.map(({ icon: Icon, label, title, description, points }) => (
                <div key={label} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#E31E24]">{label}</p>
                      <h3 className="mt-1 text-xl font-bold text-slate-950">{title}</h3>
                    </div>
                  </div>

                  <p className="mt-5 leading-7 text-slate-600">{description}</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {points.map((point) => (
                      <div key={point} className="flex items-start gap-2">
                        <p className="text-sm leading-6 text-slate-600">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GLOBAL */}
        <section className="border-y border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-6 md:px-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">Global vision</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                A common technology foundation, adapted to local healthcare systems.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Consult Your Doctor is being developed with a strong foundation in Germany and a long-term
                ambition to expand across Asian healthcare markets.
              </p>
              <p className="mt-5 leading-7 text-slate-600">
                Every market has its own regulations, languages, patient behaviours, infrastructure and
                clinical workflows. Our approach is based on local adaptation rather than one-size-fits-all
                healthcare.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-9">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-bold text-slate-950">Expansion vision</p>
                  <p className="text-sm text-slate-500">Germany → selected Asian markets</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  'India',
                  'Singapore',
                  'Malaysia',
                  'Indonesia',
                  'Thailand',
                  'Vietnam',
                  'Philippines',
                  'Bangladesh',
                  'Sri Lanka',
                  'Nepal',
                ].map((country) => (
                  <span
                    key={country}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700"
                  >
                    {country}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PRIVACY */}
        <section className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-7 md:p-10 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
                <div>
                  <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                    Data privacy & trust
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                    Trust is part of the product.
                  </h2>
                  <p className="mt-5 leading-7 text-slate-600">
                    Healthcare information is highly sensitive. Our platform philosophy is built around
                    responsible data practices, security and transparent patient communication.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {privacyPoints.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-slate-950">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-16 md:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-300">Your next step</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Find the right care, with a clearer path forward.
              </h2>
              <p className="mt-4 leading-7 text-slate-300">
                Search doctors, explore healthcare services or book an appointment through Consult Your Doctor.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Find a Doctor
              </Link>
              <Link
                href="/book-appointment"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E24] px-6 py-3.5 font-semibold text-white transition hover:bg-red-700"
              >
                Book Appointment
                <CalendarCheck2 className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
