import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  FileText,
  FlaskConical,
  FolderLock,
  Hospital,
  MessageCircleQuestion,
  Search,
  Stethoscope,
} from "lucide-react";
import { formatPercent, type BookingFees } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { formatINR } from "@/components/patient/format";
import { CtaBand, Faq, FeatureCard, IconTile, PageHero, Section, SectionHead, SitePage, Steps, TextLink, btnGhost, btnWhite, card } from "@/components/site/ui";

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
    text: "Search by specialty, hospital or city. Every profile shows the doctor's experience, next open time and the consultation fee the hospital has set.",
  },
  {
    icon: CalendarCheck,
    title: "Book a time",
    text: "Pick a slot, log in with your mobile number and pay the booking fee securely online by UPI, card or net banking.",
  },
  {
    icon: Hospital,
    title: "Visit the hospital",
    text: "Your booking slip and token number arrive on WhatsApp and email. Show it at reception, pay the consultation fee at the counter, and the desk checks you in.",
  },
  {
    icon: FileText,
    title: "Keep your prescription",
    text: "Your doctor's signed prescription is sent to your account, WhatsApp and email as a PDF, ready for any pharmacy.",
  },
];

const features = [
  {
    icon: BadgeCheck,
    title: "Verified doctors",
    text: "Doctors are added by their partner hospital or approved by our team before they can take bookings, and their registration number is printed on every prescription.",
  },
  {
    icon: FlaskConical,
    title: "Lab tests at partner centres",
    text: "Choose your tests and a day, pay the booking fee online and pay for the tests at the lab. When the report is ready it appears in your account straight away.",
  },
  {
    icon: FolderLock,
    title: "Your records in one place",
    text: "Prescriptions, lab reports, payments and past visits stay in your account, so you can download them whenever you need them.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Help when you need it",
    text: "Our assistant answers questions about bookings, payments and reports at any hour, and our support team takes over when a person is needed.",
  },
];

const faqs = (fees: BookingFees) => [
  {
    q: "What does a consultation cost?",
    a: `Online you pay only a ${formatINR(fees.consultation)} booking fee, or ${formatINR(fees.fastTrack)} if you choose fast track where it's offered (you're seen ahead of general patients once checked in). The consultation fee is set by the hospital, shown on the doctor's profile, and paid at the hospital counter when you visit. It is never added to the online payment.`,
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

const starts = [
  { href: "/find", icon: Stethoscope, title: "Book a doctor", text: "Specialists with open times this week" },
  { href: "/hospitals", icon: Building2, title: "Hospitals", text: "Partner hospitals and their doctors" },
  { href: "/diagnostics", icon: FlaskConical, title: "Lab tests", text: "Verified labs, reports in your account" },
];

export default async function HowItWorksPage() {
  const fees = await getBookingFees();
  return (
    <SitePage>
      <PageHero
        eyebrow="How it works"
        title="From finding a doctor to your prescription, in one place"
        lead="Book a specialist at a partner hospital or a test at a nearby lab for a small booking fee, and keep every prescription and report in your account."
        actions={
          <>
            <Link href="/find" className={btnWhite}>
              Find a doctor <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
            <Link href="/diagnostics" className={btnGhost}>
              Book a lab test
            </Link>
          </>
        }
        aside={
          <div className={`${card} p-2 text-[#0B1B3F] shadow-[0_24px_50px_-20px_rgba(4,16,70,0.55)]`}>
            <p className="px-4 pt-4 pb-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#5B667A]">Start here</p>
            {starts.map((s) => (
              <Link key={s.href} href={s.href} className="group flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-[#F4F7FE] transition-colors">
                <IconTile icon={s.icon} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-extrabold">{s.title}</span>
                  <span className="block text-[13.5px] text-[#5B667A]">{s.text}</span>
                </span>
                <ChevronRight className="w-5 h-5 text-[#9AA4B5] group-hover:text-[#2A4DD0] group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
            <p className="mx-2 mt-1 mb-2 px-3 py-3 rounded-xl bg-[#F6F8FC] text-[13px] text-[#4A5878]">
              Booking fee <strong className="text-[#0B1B3F]">{formatINR(fees.consultation)}</strong>, paid online. The consultation fee is paid at the hospital.
            </p>
          </div>
        }
      />

      <Section id="workflow-steps">
        <SectionHead eyebrow="Booking a consultation" title="Four simple steps" lead="Most people finish the first two in a few minutes." />
        <Steps steps={steps} />
      </Section>

      <Section tint>
        <SectionHead eyebrow="What you get" title="One account for doctor visits and lab tests" lead="The same account covers your bookings and everything that comes out of them." />
        <div className="mt-8 md:mt-12 grid md:grid-cols-2 gap-3.5 md:gap-5">
          {features.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title}>
              {f.text}
            </FeatureCard>
          ))}
        </div>
        <div className={`${card} mt-3.5 md:mt-5 p-5 md:p-7 flex flex-col md:flex-row md:items-center gap-4 md:gap-8`}>
          <div className="flex items-center gap-4">
            <IconTile icon={CreditCard} />
            <h3 className="text-[17px] font-extrabold">Clear prices</h3>
          </div>
          <p className="flex-1 text-[14.5px] md:text-[15px] leading-[1.6] text-[#4A5878]">
            Online you pay only a booking fee: {formatINR(fees.consultation)} for a consultation, or {formatPercent(fees.diagnosticPercent)} of the test price for lab tests. The
            consultation fee is paid at the hospital counter and the tests at the lab.
          </p>
          <TextLink href="/prices">See prices</TextLink>
        </div>
      </Section>

      <Section id="faq">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-14">
          <div>
            <SectionHead
              eyebrow="Help & FAQ"
              title="Common questions"
              lead={
                <>
                  Can&apos;t find your answer?{" "}
                  <Link href="/contact" className="font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                    Contact us
                  </Link>
                  .
                </>
              }
            />
          </div>
          <div className="mt-8 lg:mt-0">
            <Faq items={faqs(fees)} />
          </div>
        </div>
      </Section>

      <CtaBand
        title="Ready to book?"
        lead="See which doctors have open times this week at hospitals near you."
        actions={
          <>
            <Link href="/find" className={btnWhite}>
              Find a doctor <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
            <Link href="/what-we-treat" className={btnGhost}>
              What we treat
            </Link>
          </>
        }
      />
    </SitePage>
  );
}
