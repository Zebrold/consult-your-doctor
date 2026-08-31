import { Header } from '@/components/Header'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Baby,
  BadgeCheck,
  Bone,
  Brain,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  Eye,
  HeartPulse,
  Microscope,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Waves,
  Zap,
} from 'lucide-react'

export const metadata = {
  title: 'Diagnostics | Consult Your Doctor',
  description:
    'Explore diagnostic services including X-Ray, CT Scan, MRI, Ultrasound, Blood Tests and more with Consult Your Doctor.',
}

const diagnosticServices = [
  {
    id: 'xray',
    name: 'X-Ray',
    category: 'Imaging',
    description:
      'Digital radiography for bones, chest and joints to help detect fractures, infections and other abnormalities.',
    icon: Bone,
    priceRange: '₹300 – ₹1,500',
    duration: '10–15 min',
    preparation:
      'Usually no special preparation is needed. Remove metal objects and jewellery before the scan.',
  },
  {
    id: 'ct-scan',
    name: 'CT Scan',
    category: 'Imaging',
    description:
      'Detailed cross-sectional imaging of internal organs, bones, soft tissue and blood vessels.',
    icon: ScanLine,
    priceRange: '₹2,000 – ₹8,000',
    duration: '15–30 min',
    preparation:
      'You may be asked to fast for 4–6 hours. Tell your healthcare team about allergies or contrast-related concerns.',
  },
  {
    id: 'mri',
    name: 'MRI Scan',
    category: 'Imaging',
    description:
      'High-detail imaging of the brain, spine, joints and soft tissue using magnetic resonance technology.',
    icon: Brain,
    priceRange: '₹4,000 – ₹15,000',
    duration: '30–60 min',
    preparation:
      'Remove metal objects and inform the facility about implants, pacemakers or claustrophobia before the scan.',
  },
  {
    id: 'ultrasound',
    name: 'Ultrasound',
    category: 'Imaging',
    description:
      'Non-invasive imaging using sound waves for abdominal organs, thyroid, pregnancy monitoring and more.',
    icon: Waves,
    priceRange: '₹800 – ₹3,000',
    duration: '15–30 min',
    preparation:
      'Preparation depends on the scan. Some abdominal scans may require fasting; pelvic scans may require a full bladder.',
  },
  {
    id: 'blood-test',
    name: 'Blood Tests',
    category: 'Laboratory',
    description:
      'Routine and advanced blood investigations including CBC, lipid profile, liver, kidney and thyroid panels.',
    icon: Droplets,
    priceRange: '₹200 – ₹3,500',
    duration: '5–10 min',
    preparation:
      'Some tests may require fasting for 8–12 hours. Follow the instructions provided for your specific test.',
  },
  {
    id: 'ecg',
    name: 'ECG / EKG',
    category: 'Cardiac',
    description:
      'A quick recording of the heart’s electrical activity to support assessment of rhythm and cardiac conditions.',
    icon: HeartPulse,
    priceRange: '₹300 – ₹800',
    duration: '5–10 min',
    preparation:
      'Usually no special preparation is needed. Wear comfortable clothing and follow any instructions from the facility.',
  },
  {
    id: 'echo',
    name: 'Echocardiogram',
    category: 'Cardiac',
    description:
      'Ultrasound imaging of the heart to assess valves, chambers, pumping function and structural changes.',
    icon: Activity,
    priceRange: '₹1,500 – ₹4,000',
    duration: '20–40 min',
    preparation:
      'Usually no special preparation is required. Wear comfortable, loose-fitting clothing.',
  },
  {
    id: 'eeg',
    name: 'EEG',
    category: 'Neurology',
    description:
      'A test that records brain-wave activity and can support assessment of seizures, sleep disorders and neurological conditions.',
    icon: Zap,
    priceRange: '₹1,500 – ₹3,500',
    duration: '30–60 min',
    preparation:
      'Wash your hair and avoid styling products. Follow any sleep or medication instructions given before the test.',
  },
  {
    id: 'eye-test',
    name: 'Eye Examination',
    category: 'Specialised',
    description:
      'Comprehensive vision and eye-health assessment including acuity, retinal examination and pressure checks.',
    icon: Eye,
    priceRange: '₹500 – ₹2,000',
    duration: '20–30 min',
    preparation:
      'Bring your current glasses or contact lenses. If dilation is planned, you may need help travelling home.',
  },
  {
    id: 'pathology',
    name: 'Pathology / Biopsy',
    category: 'Laboratory',
    description:
      'Laboratory examination of tissue or cell samples to support diagnosis of infections, inflammation and other conditions.',
    icon: Microscope,
    priceRange: '₹1,000 – ₹5,000',
    duration: 'Results in 3–7 days',
    preparation:
      'Preparation varies by procedure. Follow the instructions provided by your doctor or diagnostic centre.',
  },
  {
    id: 'dexa',
    name: 'DEXA Scan',
    category: 'Imaging',
    description:
      'A low-dose scan used to measure bone mineral density and support assessment of osteoporosis risk.',
    icon: ShieldCheck,
    priceRange: '₹1,500 – ₹3,500',
    duration: '15–20 min',
    preparation:
      'You may be asked to avoid calcium supplements for 24 hours and wear clothing without metal fasteners.',
  },
  {
    id: 'prenatal',
    name: 'Prenatal Screening',
    category: 'Women’s Health',
    description:
      'Pregnancy-related screening and imaging including NT, anomaly and growth scans where clinically appropriate.',
    icon: Baby,
    priceRange: '₹1,000 – ₹5,000',
    duration: '20–45 min',
    preparation:
      'Follow your obstetrician’s or diagnostic centre’s instructions. Some scans may require a full bladder.',
  },
]

const process = [
  {
    step: '01',
    title: 'Choose a test',
    description: 'Select the diagnostic service recommended for you.',
  },
  {
    step: '02',
    title: 'Book a slot',
    description: 'Choose a convenient hospital, diagnostic centre, date and time.',
  },
  {
    step: '03',
    title: 'Get tested',
    description: 'Visit the selected centre with your prescription or required documents.',
  },
  {
    step: '04',
    title: 'Receive reports',
    description: 'Access reports and continue with your doctor for interpretation and next steps.',
  },
]

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Trusted providers',
    description: 'Connect with hospitals and diagnostic centres through a guided booking journey.',
  },
  {
    icon: Clock3,
    title: 'Convenient booking',
    description: 'Choose services, locations and time slots that work for your schedule.',
  },
  {
    icon: BadgeCheck,
    title: 'Clear preparation',
    description: 'See common preparation guidance before your scheduled test.',
  },
  {
    icon: Stethoscope,
    title: 'Connected follow-up',
    description: 'Continue your care journey with the appropriate healthcare professional after testing.',
  },
]

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:52px_52px] opacity-50 [mask-image:linear-gradient(to_bottom,#000,transparent_82%)]" />
          <div className="absolute -right-24 top-8 h-80 w-80 rounded-full bg-red-100/70 blur-3xl" />

          <div className="relative mx-auto grid max-w-[1200px] gap-12 px-6 py-20 md:px-10 md:py-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-5xl md:text-6xl md:leading-[1.08]">
                Diagnostic care made{' '}
                <span className="text-[#E31E24]">simpler and easier to navigate.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                Explore imaging, laboratory, cardiac and specialised diagnostic services,
                understand common preparation requirements and book through a connected healthcare journey.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#book-consultation-form"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E24] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  Book a Diagnostic Test
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="#diagnostic-services"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Explore Services
                </a>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                Test availability, preparation requirements and pricing may vary by provider, location and clinical need.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] sm:p-7">
              <div className="rounded-2xl bg-slate-950 p-7 text-white">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">
                      Diagnostic journey
                    </p>
                    <h2 className="mt-3 text-2xl font-bold leading-tight">
                      From recommended test to follow-up care.
                    </h2>
                  </div>
                </div>

                <p className="mt-5 leading-7 text-slate-300">
                  Keep testing, reports and next steps connected instead of managing every part of the process separately.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Imaging', 'X-Ray, MRI, CT, Ultrasound'],
                  ['Laboratory', 'Blood tests & pathology'],
                  ['Cardiac', 'ECG & Echocardiogram'],
                  ['Specialised', 'Eye, EEG, DEXA & more'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{text}</p>
                  </div>
                ))}
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
                  <div>
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section id="diagnostic-services" className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                  Diagnostic services
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  Find the test you need.
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Browse common diagnostic services with estimated duration, preparation information and indicative pricing.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Indicative prices only • Final cost depends on provider
              </div>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {diagnosticServices.map((service) => {
                const Icon = service.icon

                return (
                  <article
                    key={service.id}
                    className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-slate-200/60 md:p-7"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#E31E24]">
                        <Icon className="h-6 w-6" />
                      </div>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                        {service.category}
                      </span>
                    </div>

                    <div className="mt-6 flex-1">
                      <h3 className="text-xl font-bold text-slate-950">{service.name}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>

                      <div className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-500">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        {service.duration}
                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          Common preparation
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{service.preparation}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          Estimated price
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-slate-950">{service.priceRange}</p>
                      </div>

                      <Link
                        href="/#book-consultation-form"
                        aria-label={`Book ${service.name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition group-hover:border-[#E31E24] group-hover:bg-[#E31E24] group-hover:text-white"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-y border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                A simpler diagnostic booking journey.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                From choosing a test to receiving reports, each step is designed to be clear and easy to follow.
              </p>
            </div>

            <div className="relative mt-12 grid gap-5 md:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-slate-200 md:block" />

              {process.map((item) => (
                <div key={item.step} className="relative z-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-50 bg-slate-950 text-sm font-bold text-white shadow-sm">
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PREPARATION / SAFETY */}
        <section className="bg-white py-20 md:py-24">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-6 md:px-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#E31E24]">
                Before your test
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Preparation can vary by test and by patient.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Some investigations require fasting, medication instructions, a full bladder or information about implants and allergies.
                Always follow the instructions provided by your doctor or diagnostic centre.
              </p>

              <div className="mt-7 rounded-2xl border border-red-100 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <p className="text-sm leading-6 text-slate-700">
                    The preparation information shown on this page is general guidance and should not replace provider-specific or medical instructions.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 md:p-9">
              <h3 className="text-xl font-bold text-slate-950">A good pre-test checklist</h3>

              <div className="mt-6 space-y-4">
                {[
                  'Carry your doctor’s prescription or referral if required.',
                  'Confirm whether fasting or medication changes are needed.',
                  'Tell the centre about allergies, pregnancy or implanted devices when relevant.',
                  'Carry previous reports if your doctor has asked for comparison.',
                  'Ask when and how your report will be available.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <p className="leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOLLOW-UP */}
        <section className="border-y border-slate-100 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="rounded-[30px] bg-slate-950 p-7 text-white md:p-10 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-red-300">
                    Reports are part of the journey
                  </div>

                  <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
                    Diagnostic reports should lead to the right next step.
                  </h2>

                  <p className="mt-5 leading-7 text-slate-300">
                    A report by itself may not answer what you should do next. Continue with the doctor or healthcare professional
                    who recommended the investigation for interpretation, diagnosis and treatment decisions.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['1', 'Complete test'],
                    ['2', 'Receive report'],
                    ['3', 'Doctor review'],
                    ['4', 'Next care step'],
                  ].map(([number, label]) => (
                    <div key={number} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-bold text-red-300">STEP {number}</p>
                      <p className="mt-2 font-semibold text-white">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <div className="rounded-[30px] border border-slate-200 bg-slate-50 px-7 py-12 text-center md:px-12 md:py-16">
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Need help booking the right diagnostic test?
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                If a healthcare professional has recommended an investigation, we can help you navigate available diagnostic services and booking options.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/#book-consultation-form"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E24] px-6 py-3.5 font-semibold text-white transition hover:bg-red-700"
                >
                  Book a Diagnostic Test
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Consult a Doctor
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
