import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPercent, type BookingFees } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { formatINR } from "@/components/patient/format";
import { Faq, PageHero, Section, SitePage, btnGhost, btnWhite } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers about the booking fee, in-person consultations, lab test bookings and who can see your medical records on Consult Your Doctor.",
};

// Keep this in line with what the site really does (see lib/assistant/knowledge.ts).
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

export default async function FaqPage() {
  const fees = await getBookingFees();
  return (
    <SitePage>
      <PageHero
        eyebrow="Help & FAQ"
        title="Common questions"
        lead="Answers about bookings, prescriptions, reports and payments."
        actions={
          <>
            <Link href="/find" className={btnWhite}>
              Find a doctor <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
            <Link href="/contact" className={btnGhost}>
              Contact us
            </Link>
          </>
        }
      />

      <Section id="faq">
        <div className="max-w-[860px]">
          <Faq items={faqs(fees)} />
          <p className="mt-6 text-[15px] leading-[1.6] text-[#4A5878]">
            Can&apos;t find your answer?{" "}
            <Link href="/contact" className="font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
              Contact us
            </Link>
            .
          </p>
        </div>
      </Section>
    </SitePage>
  );
}
