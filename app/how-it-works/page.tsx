import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  BriefcaseMedical,
  Brain,
  ChevronDown,
  Clock,
  FileText,
  FolderLock,
  Heart,
  HeartPulse,
  HousePlus,
  Lock,
  Microscope,
  Pill,
  RefreshCw,
  Sparkles,
  Star,
  Thermometer,
  Truck,
  Video,
} from "lucide-react";
import { BookConsultationForm } from "@/components/BookConsultationForm";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "From preliminary symptoms to continuous recovery tracking: see how Consult Your Doctor delivers care in four simple steps, with 23 days of free follow-up.",
};

const heroAvatars = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBsGLEcXm1Qp7_HnkxgBWdac2I9AXTwMQoiZ3zBv9w93n7xzIuVgs7AM2B6MCLGyCddR1ZV6TM_t9BBw7LjiJfl3mtDemB5XM0PI52G3HpKex1OxFboToSFQTma4EfpvcnsQVQ3HTngj5kUoGydonuAUOeNI61DAk9Z7u_A947YZ-3ybo4JozAJCTtYLsU1HjSAp5N_53fbk9m5G859dQlhRHqFv4O8FYl83Nmjmla6Ap2Q5x2k0DDKeQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDyt-_9j5wb5Y7SP3BnsgqY7Yu0LCgBxVTHGM4tXDnQoIRYhdsOMkfyXROeK3pspOYTHrAnotLMaGKjsnJctUgiJa9RmAdtBsAXF-9Bmcn-HN3RXwyCS6iBwmAkugT1YL9L33BKcIuTPQ3FDicnSnsEXnjZRB_AxOX0Qa4IBsI-ZPsANdEY1aY0XxGSC8nHSReGG4-o1xm74Hp9hAzadqbFZi4_QlhD2Xji1rPk2DO067-4h0b5xuv0Og",
];

const featuredDoctorImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCUYU5-phm3CWzsSs5r_k9qEVb7l8ryizPtonzRo6BJ47R7yZLGm0yCtZsbyEhxFVVhND-beK33j_JYVJxFNvlxR7-2b0GFDJzGnRVDSb0N6dVSWU90EqW7CxYdf7hj2F-Si4_i2z4hKaeNnGulCoFyAEYtULXp2bGmYCP-SPjbPWWa4luncYmLby2acwm_Nj-AcTlyDDppCz-CR3eI-r_ZWGhoraXZHsNihD3sCc5SwD0AKkscKR3Law";

const steps = [
  {
    number: "01",
    tone: "text-vibrant-blue",
    footerTone: "text-primary",
    icon: BriefcaseMedical,
    title: "Choose Your Care Need",
    desc: "Select clinical specialty, preferred hospital, or type in current symptoms. Our smart triage sorts urgency in real-time.",
    footerIcon: Bolt,
    footer: "Instant triage powered by clinical AI",
  },
  {
    number: "02",
    tone: "text-fresh-teal",
    footerTone: "text-secondary",
    icon: Brain,
    title: "AI Triage & Smart Match",
    desc: "Share your medical history confidentially. Routing algorithms pair you with the best available physician in under 10 minutes.",
    footerIcon: BadgeCheck,
    footer: "1,700+ licensed state specialists",
  },
  {
    number: "03",
    tone: "text-vibrant-blue",
    footerTone: "text-primary",
    icon: Video,
    title: "HD Video Consultation",
    desc: "Meet your doctor on high-definition encrypted video or secure chat. Receive detailed diagnosis, treatment plan, and notes.",
    footerIcon: Lock,
    footer: "Encrypted end-to-end clinical room",
  },
  {
    number: "04",
    tone: "text-soft-coral",
    footerTone: "text-tertiary-container",
    icon: Pill,
    title: "Rx & 23 Days Support",
    desc: "Immediate e-prescriptions sent to your preferred pharmacy, followed by 23 continuous days of free chat and recovery guidance.",
    footerIcon: Heart,
    footer: "Complimentary recovery care window",
  },
];

const faqs = [
  {
    q: "How fast can I speak to a doctor?",
    a: "For urgent general consultations, our average connection time is under 10 minutes. For specialized doctors (such as cardiology, endocrinology, or dermatology), you can book same-day appointment slots or schedule anytime within the week.",
  },
  {
    q: "Are prescriptions valid at local pharmacies?",
    a: "Yes. All prescriptions issued by our board-certified doctors are fully accredited official e-prescriptions. They can be electronically routed directly to Walgreens, CVS, local chemists, or dispatched via our doorstep pharmacy delivery.",
  },
  {
    q: "How does the 23-day free post-consultation care work?",
    a: "Once your video consultation concludes, your dedicated clinical chat room remains active for 23 full days. You can ask follow-up questions, report side effects, share updated vitals, or seek dosage adjustments with zero additional consultation fees.",
  },
  {
    q: "Is my medical data confidential and secure?",
    a: "Absolutely. We strictly comply with HIPAA, GDPR, and ISO 27001 medical confidentiality benchmarks. All video calls are peer-to-peer encrypted, and health records are held in a bank-grade secured digital locker accessible solely by you and your authorized practitioner.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="w-full bg-indigo-gray-50">
      {/* Hero */}
      <section className="relative isolate w-full overflow-hidden bg-gradient-to-b from-surface-container-low/70 via-indigo-gray-50 to-indigo-gray-50 py-16 md:py-24">
        <div aria-hidden className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-vibrant-blue/5 blur-3xl -z-10" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-fresh-teal/10 blur-3xl -z-10" />

        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-gutter items-center">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <span className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm uppercase shadow-sm">
                <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse" />
                Seamless Telehealth &amp; Clinical Care
              </span>
              <div className="flex flex-col gap-3">
                <h1 className="font-display-lg text-4xl md:text-display-lg text-indigo-gray-900 tracking-tight">
                  Healthcare That Continues <br className="hidden sm:block" />
                  <span className="text-vibrant-blue">Beyond Your Consultation</span>
                </h1>
                <p className="font-body-lg text-base md:text-body-lg text-indigo-gray-600 max-w-xl">
                  Access board-certified medical professionals, AI-powered preliminary assessments, and complete prescription delivery in four simple steps. Care that stays with you.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 pt-2">
                <Link
                  href="/online-doctor"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-8 py-4 rounded-full bg-vibrant-blue text-on-primary font-title-md text-lg md:text-title-md shadow-lg shadow-vibrant-blue/20 hover:bg-primary transition-all duration-200"
                >
                  Start Your Online Consultation
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-lowest/80 backdrop-blur-sm shadow-sm">
                  <div className="flex -space-x-2">
                    {heroAvatars.map((src) => (
                      <img key={src} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-surface-container-lowest" src={src} />
                    ))}
                    <span className="w-8 h-8 rounded-full bg-fresh-teal/20 text-secondary flex items-center justify-center text-[11px] font-bold ring-2 ring-surface-container-lowest">
                      +1.7k
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-indigo-gray-900 font-bold">1,700+ Specialists</span>
                    <span className="font-label-sm text-[11px] text-indigo-gray-600">Available in &lt; 10 mins</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-outline-variant/30">
                <span className="flex items-center gap-2 font-label-sm text-label-sm text-indigo-gray-900">
                  <BadgeCheck className="w-5 h-5 text-fresh-teal shrink-0" /> 100% Board Certified
                </span>
                <span className="flex items-center gap-2 font-label-sm text-label-sm text-indigo-gray-900">
                  <Sparkles className="w-5 h-5 text-vibrant-blue shrink-0" /> AI-Guided Triage
                </span>
                <span className="flex items-center gap-2 font-label-sm text-label-sm text-indigo-gray-900">
                  <Clock className="w-5 h-5 text-fresh-teal shrink-0" /> 23 Days Free Follow-up
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <BookConsultationForm />
            </div>
          </div>
        </div>
      </section>

      {/* 4-step workflow */}
      <section id="workflow-steps" className="w-full py-20 bg-surface-container-lowest">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <span className="font-label-sm text-label-sm text-vibrant-blue uppercase tracking-widest font-bold">Step-by-Step Experience</span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900">How It Works in 4 Simple Steps</h2>
              <p className="font-body-md text-body-md text-indigo-gray-600">
                From preliminary symptoms to continuous recovery tracking, see how our unified clinical workflow delivers care with zero delays.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 self-start md:self-auto bg-surface-container-low px-4 py-2 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-vibrant-blue" />
              <span className="font-label-sm text-label-sm font-semibold text-indigo-gray-900">4-Stage Continuous Care Model</span>
            </div>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              const FooterIcon = step.footerIcon;
              return (
                <li
                  key={step.number}
                  className="group flex flex-col p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className={`font-headline-lg text-headline-lg font-bold ${step.tone}`}>{step.number}</span>
                    <div className={`w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${step.tone}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                  </div>
                  <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900 mb-2">{step.title}</h3>
                  <p className="font-body-md text-body-md text-indigo-gray-600 mb-6">{step.desc}</p>
                  <div className={`mt-auto pt-4 border-t border-outline-variant/30 flex items-center gap-2 font-label-sm text-label-sm ${step.footerTone}`}>
                    <FooterIcon className="w-4 h-4 shrink-0" />
                    {step.footer}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="w-full rounded-2xl bg-gradient-to-r from-primary to-vibrant-blue text-on-primary p-8 lg:p-12 shadow-xl shadow-vibrant-blue/15 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col gap-3 max-w-xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-on-primary/10 font-label-sm text-[12px] self-start">
                <RefreshCw className="w-4 h-4" /> Care Designed Around You
              </span>
              <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg">One consultation. 23 days of continued medical backing.</h3>
              <p className="font-body-md text-body-md text-on-primary/80">
                Most telehealth portals cut you off as soon as the video call ends. With Consult Your Doctor, your care team remains by your side to answer questions, monitor dosage changes, and ensure safe recovery.
              </p>
            </div>
            <div className="w-full lg:w-auto shrink-0 bg-surface-container-lowest/10 backdrop-blur-md rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-on-primary text-vibrant-blue flex items-center justify-center font-bold text-lg shrink-0">23d</div>
              <div>
                <div className="font-title-md text-title-md font-bold">Zero Extra Cost</div>
                <div className="font-label-sm text-label-sm text-on-primary/70">Unlimited follow-up text questions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology bento grid */}
      <section className="w-full py-20 bg-indigo-gray-50">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col gap-12">
          <div className="flex flex-col gap-2 max-w-2xl">
            <span className="font-label-sm text-label-sm text-vibrant-blue uppercase tracking-widest font-bold">Cutting-Edge Infrastructure</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900">Intelligent Telehealth Technology</h2>
            <p className="font-body-md text-body-md text-indigo-gray-600">
              Engineered to eliminate clinical bottlenecks, protect your sensitive health records, and deliver continuous care wherever you are.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AI Clinical Companion */}
            <div className="lg:col-span-7 rounded-2xl bg-surface-container-lowest p-8 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-container text-vibrant-blue flex items-center justify-center">
                  <Brain className="w-7 h-7" />
                </div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">AI Clinical Companion</h3>
                <p className="font-body-md text-body-md text-indigo-gray-600 max-w-md">
                  24/7 symptom monitoring, smart medication reminder notifications, and real-time vital sign checks. Get verified answers between clinical appointments.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                      <path className="text-surface-container-high" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      <path className="text-fresh-teal" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="88, 100" strokeLinecap="round" strokeWidth="3.2" />
                    </svg>
                    <span className="absolute font-label-sm text-[12px] font-bold text-indigo-gray-900">88%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">Daily Recovery Score</span>
                    <span className="font-label-sm text-[11px] text-fresh-teal font-semibold">Optimal biometric indicators</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-label-sm font-semibold flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4" /> Heart Rate: 72 bpm
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4" /> 98.6°F
                  </span>
                </div>
              </div>
            </div>

            {/* Verified doctors */}
            <div className="lg:col-span-5 rounded-2xl bg-surface-container-lowest p-8 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-fresh-teal/10 text-secondary flex items-center justify-center">
                  <BadgeCheck className="w-7 h-7" />
                </div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Verified Board-Certified Doctors</h3>
                <p className="font-body-md text-body-md text-indigo-gray-600">
                  Over 1,700 licensed specialists spanning 35+ clinical fields rigorously audited via state medical boards.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 bg-surface-container-low p-4 rounded-xl">
                <img alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" src={featuredDoctorImage} />
                <div className="flex flex-col flex-1">
                  <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">Dr. Emily Chen, MD</span>
                  <span className="font-label-sm text-[12px] text-indigo-gray-600">Cardiology • 14 Yrs Experience</span>
                </div>
                <span className="flex items-center gap-1 text-vibrant-blue font-label-sm text-label-sm font-bold">
                  <Star className="w-4 h-4 fill-current" /> 4.9
                </span>
              </div>
            </div>

            {/* Digital health locker */}
            <div className="lg:col-span-5 rounded-2xl bg-surface-container-lowest p-8 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center">
                  <FolderLock className="w-7 h-7" />
                </div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Digital Health Locker</h3>
                <p className="font-body-md text-body-md text-indigo-gray-600">
                  Integrated with international ABHA &amp; NHS digital health protocols. Secure 256-bit encrypted health records instantly shareable with your trusted providers.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                {[
                  { icon: FileText, name: "EHR_Cardiac_Summary.pdf" },
                  { icon: Microscope, name: "Lipid_Panel_Report.pdf" },
                ].map(({ icon: Icon, name }) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-vibrant-blue shrink-0" />
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="text-fresh-teal font-bold">Synced</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Doorstep pharmacy */}
            <div className="lg:col-span-7 rounded-2xl bg-surface-container-lowest p-8 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-fresh-teal/10 text-secondary flex items-center justify-center">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Doorstep Pharmacy &amp; Home Diagnostics</h3>
                <p className="font-body-md text-body-md text-indigo-gray-600 max-w-lg">
                  Never wait in a chemist line again. Digital prescriptions are dispatched automatically for home delivery, or samples collected right at your door by certified phlebotomists.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-container-low flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-vibrant-blue shadow-sm">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">Same-Day Rx Delivery</span>
                    <span className="font-label-sm text-[12px] text-indigo-gray-600">Free to your doorstep</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-fresh-teal shadow-sm">
                    <HousePlus className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">Home Sample Pickup</span>
                    <span className="font-label-sm text-[12px] text-indigo-gray-600">60-minute window</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="w-full py-20 bg-surface-container-lowest scroll-mt-20">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <span className="font-label-sm text-label-sm text-vibrant-blue uppercase tracking-widest font-bold">Frequently Asked Questions</span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900">Everything You Need to Know</h2>
              <p className="font-body-md text-body-md text-indigo-gray-600">
                Have questions about how your online doctor appointment, digital prescriptions, or post-consultation care works? Find answers below.
              </p>
            </div>
            <Link href="/contact" className="inline-flex items-center gap-2 text-vibrant-blue font-title-md text-lg font-semibold hover:underline">
              Visit Full Help Center
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {faqs.map((faq) => (
              <details key={faq.q} open className="group rounded-2xl bg-surface-container-low open:bg-surface-container p-6 transition-colors">
                <summary className="w-full flex items-center justify-between text-left gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-title-md text-lg md:text-title-md font-bold text-indigo-gray-900">{faq.q}</span>
                  <ChevronDown className="w-6 h-6 text-vibrant-blue shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-4 pt-4 border-t border-outline-variant/30 text-indigo-gray-600 font-body-md text-body-md">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom conversion banner */}
      <section className="w-full py-16 bg-indigo-gray-50">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <div className="w-full rounded-3xl bg-surface-container-lowest p-8 md:p-14 shadow-xl shadow-vibrant-blue/5 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="flex flex-col gap-3 max-w-xl">
              <span className="font-label-sm text-label-sm text-fresh-teal font-bold uppercase tracking-widest">Start Today</span>
              <h2 className="font-display-lg text-4xl md:text-display-lg text-indigo-gray-900 leading-tight">Ready to consult a top doctor today?</h2>
              <p className="font-body-md text-body-md text-indigo-gray-600">
                Join over 450,000 patients who enjoy rapid clinical consultations, automated prescriptions, and attentive recovery care.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
              <Link
                href="/search?type=doctor"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-vibrant-blue text-on-primary font-title-md text-lg font-bold shadow-lg shadow-vibrant-blue/20 hover:bg-primary transition-all"
              >
                Book Your Appointment
              </Link>
              <Link
                href="/what-we-treat"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-surface-container text-primary font-title-md text-lg font-bold hover:bg-surface-container-high transition-all"
              >
                Explore What We Treat
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
