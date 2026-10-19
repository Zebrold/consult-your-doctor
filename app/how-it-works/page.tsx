import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileText,
  FlaskConical,
  FolderLock,
  Hospital,
  MessageCircleQuestion,
  Search,
} from "lucide-react";
import { BookConsultationForm } from "@/components/BookConsultationForm";
import { formatPercent, type BookingFees } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { formatINR } from "@/components/patient/format";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Find a doctor at a partner hospital, book a time for a small booking fee, then get your prescription and lab reports in your account. Here is how Consult Your Doctor works.",
};

// Keep this in line with what the site really does (see lib/assistant/knowledge.ts).
const steps = [
  {
    icon: Search,
    title: "Find the right doctor",
    desc: "Search by specialty, hospital or city. Every profile shows the doctor's experience, next open time and the consultation fee the hospital has set.",
  },
  {
    icon: CalendarCheck,
    title: "Book a time and pay the booking fee",
    desc: "Pick a slot, sign in with your mobile number and pay the booking fee securely through PayU by UPI, card or net banking.",
  },
  {
    icon: Hospital,
    title: "Visit the hospital",
    desc: "Your booking slip and token number arrive on WhatsApp and email. Show it at reception, pay the consultation fee at the counter, and the desk checks you in.",
  },
  {
    icon: FileText,
    title: "Keep your prescription",
    desc: "Your doctor's signed prescription is sent to your account, WhatsApp and email as a PDF, ready for any pharmacy.",
  },
];

const features = [
  {
    icon: BadgeCheck,
    title: "Verified doctors",
    desc: "Doctors are added by their partner hospital or approved by our team before they can take bookings, and their registration number is printed on every prescription.",
  },
  {
    icon: FlaskConical,
    title: "Lab tests at partner centres",
    desc: "Choose your tests and a day, pay the booking fee online and pay for the tests at the lab. When the report is ready it appears in your account straight away.",
  },
  {
    icon: FolderLock,
    title: "Your records in one place",
    desc: "Prescriptions, lab reports, payments and past visits stay in your account, so you can download them whenever you need them.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Help when you need it",
    desc: "Our assistant answers questions about bookings, payments and reports at any hour, and our support team takes over when a person is needed.",
  },
];

const faqs = (fees: BookingFees) => [
  {
    q: "What does a consultation cost?",
    a: `Online you pay only a ${formatINR(fees.consultation)} booking fee. The consultation fee is set by the hospital, shown on the doctor's profile, and paid at the hospital counter when you visit. It is never added to the online payment.`,
  },
  {
    q: "Are consultations online or in person?",
    a: "Consultations take place in person at the doctor's hospital. You book online and pay the booking fee, so your slot is held when you arrive.",
  },
  {
    q: "How do lab test bookings work?",
    a: `Pick a partner lab, choose your tests and the day you'll visit. Online you pay a booking fee of ${formatPercent(fees.diagnosticPercent)} of each test's price; the tests themselves are paid at the lab. Labs book by day rather than by exact time.`,
  },
  {
    q: "Who can see my medical records?",
    a: "You, and the doctors, hospitals and labs you book with. Everything you send us travels over an encrypted connection, and we never sell your health information. Our privacy policy has the details.",
  },
];

export default async function HowItWorksPage() {
  const fees = await getBookingFees();
  return (
    <div className="w-full bg-background">
      {/* Hero */}
      <section className="w-full border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6 lg:pt-6">
            <p className="text-sm font-semibold text-vibrant-blue">How it works</p>
            <h1 className="font-display-lg text-4xl md:text-5xl lg:text-[56px] lg:leading-[1.08] font-bold tracking-tight text-indigo-gray-900">
              From finding a doctor to your prescription, in one place
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-slate-600 max-w-xl">
              Book a specialist at a partner hospital or a test at a nearby lab for a small booking fee, and keep every
              prescription and report in your account.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/online-doctor"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-vibrant-blue px-6 py-3 text-[15px] font-semibold text-white hover:bg-primary transition-colors"
              >
                Find a doctor <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/diagnostics"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Book a lab test
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <BookConsultationForm />
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="workflow-steps" className="w-full py-16 md:py-20">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <div className="max-w-2xl">
            <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">Booking a consultation</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">Four steps, and most people finish the first two in a few minutes.</p>
          </div>

          <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="relative flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-500">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-indigo-gray-900">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What you get */}
      <section className="w-full py-16 md:py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <div className="max-w-2xl">
            <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">What you get</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">The same account covers doctor visits, lab tests and everything that comes out of them.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 md:p-7 flex gap-4">
                <span className="w-11 h-11 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-indigo-gray-900">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
            <div className="flex items-center gap-4">
              <span className="w-11 h-11 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold text-indigo-gray-900">Clear prices</h3>
            </div>
            <p className="text-[15px] leading-relaxed text-slate-600 flex-1">
              Online you pay only a booking fee: {formatINR(fees.consultation)} for a consultation, or {formatPercent(fees.diagnosticPercent)} of the test price for lab tests. The consultation fee is paid at the hospital counter and the tests at the lab.
            </p>
            <Link href="/prices" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-vibrant-blue hover:underline shrink-0">
              See prices <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="w-full py-16 md:py-20 scroll-mt-20">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">Common questions</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Can&apos;t find your answer?{" "}
              <Link href="/contact" className="font-semibold text-vibrant-blue hover:underline">
                Contact us
              </Link>
              .
            </p>
          </div>
          <div className="lg:col-span-8 divide-y divide-slate-200 border-y border-slate-200">
            {faqs(fees).map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-base md:text-lg font-semibold text-indigo-gray-900">{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-slate-500 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600 max-w-2xl">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="w-full pb-16 md:pb-20">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <div className="rounded-2xl bg-primary px-6 py-10 md:px-12 md:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-white">Ready to book?</h2>
              <p className="mt-2 text-white/80 leading-relaxed">See which doctors have open times this week at hospitals near you.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/doctors"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-primary hover:bg-slate-100 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" /> Find a doctor
              </Link>
              <Link
                href="/what-we-treat"
                className="inline-flex items-center justify-center rounded-lg border border-white/40 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors"
              >
                What we treat
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
