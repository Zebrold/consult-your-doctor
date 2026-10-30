import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPercent, labTestBookingFee, pricedTests, type BookingFees } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { formatINR as inr } from "@/components/patient/format";
import { Faq, IconTile, PageHero, Section, SectionHead, SitePage, TextLink, btnBlue, card } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  const fees = await getBookingFees();
  return {
    title: "Prices",
    description: `Book a doctor for a ${inr(fees.consultation)} booking fee, or lab tests for ${formatPercent(fees.diagnosticPercent)} of the test price. The consultation fee and test prices are paid at the hospital or lab. No subscriptions.`,
  };
}

// The fees are the ones checkout and PayU charge (lib/booking-fees.ts), so this page can't drift from them.
const plans = (fees: BookingFees) => [
  {
    icon: Stethoscope,
    name: "Doctor consultation",
    price: inr(fees.consultation),
    unit: "booking fee",
    points: [
      "The booking fee is all you pay online",
      "The consultation fee is set by the hospital, shown on the doctor's profile and paid at the hospital counter",
      "In person, at the doctor's partner hospital",
      "Booking slip and token number on WhatsApp and email",
    ],
    cta: { label: "Find a doctor", href: "/find" },
  },
  {
    icon: FlaskConical,
    name: "Lab tests",
    price: formatPercent(fees.diagnosticPercent),
    unit: "of each test",
    points: [
      `${formatPercent(fees.diagnosticPercent)} of each test's price, paid online to book`,
      "The test prices themselves, and any home collection, are paid at the lab",
      "Choose your tests and the day you'll visit",
      "Your report appears in your account when it's ready",
    ],
    cta: { label: "Book a lab test", href: "/diagnostics" },
  },
];

const faqs = [
  {
    q: "How can I pay?",
    a: "The booking fee is paid online through PayU, by UPI, debit or credit card, or net banking. The doctor's consultation fee is paid at the hospital counter and lab tests at the lab. If you book at a hospital or lab front desk, you pay there by UPI or cash.",
  },
  {
    q: "Are there subscriptions or membership fees?",
    a: "No. You only pay when you book a consultation or a test.",
  },
  {
    q: "Can I claim the cost on my health insurance?",
    a: "We don't file insurance claims. Your payment receipt and prescription are in your account, and you can send them to your insurer if your policy covers outpatient visits.",
  },
  {
    q: "How do cancellations and refunds work?",
    a: "Your booking fee is refunded in full if you cancel at least 2 hours before the slot, or if the doctor, hospital or lab cancels. Refunds go back to your original payment method within 5–7 working days. To cancel, contact our support team from your account or the contact page with your booking ID.",
  },
];

/** Live figures from the listings, so the examples on this page match what patients will see. */
async function loadPriceExamples() {
  const supabase = await createClient();
  const { data: labs } = await supabase.from("diagnostic_centers").select("test_prices").eq("status", "active");

  // Each test's lowest price across labs, for the tests most labs offer.
  const tests = new Map<string, { name: string; from: number; labs: number }>();
  for (const lab of labs ?? []) {
    for (const t of pricedTests(lab.test_prices as Record<string, number> | null)) {
      const key = t.name.trim().toLowerCase();
      const seen = tests.get(key);
      if (!seen) tests.set(key, { name: t.name.trim(), from: t.price, labs: 1 });
      else tests.set(key, { ...seen, from: Math.min(seen.from, t.price), labs: seen.labs + 1 });
    }
  }
  const commonTests = Array.from(tests.values())
    .sort((a, b) => b.labs - a.labs || a.from - b.from)
    .slice(0, 8);

  return { commonTests };
}

export default async function PricesPage() {
  const [{ commonTests }, fees] = await Promise.all([loadPriceExamples(), getBookingFees()]);
  const exampleTest = 350;

  return (
    <SitePage>
      <PageHero
        eyebrow="Prices"
        title="A small booking fee online, the rest at your visit"
        lead="Each hospital and lab sets its own prices, and you pay those at the counter. Online you pay only our booking fee. No subscriptions, no membership."
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-4 md:gap-5">
          {plans(fees).map(({ icon, name, price, unit, points, cta }) => (
            <div key={name} className={`${card} p-6 md:p-8 flex flex-col`}>
              <div className="flex items-center gap-3.5">
                <IconTile icon={icon} />
                <h2 className="text-[18px] font-extrabold">{name}</h2>
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="text-[40px] md:text-[46px] leading-none font-extrabold tracking-[-0.03em]">{price}</span>
                <span className="text-[15px] font-bold text-[#5B667A]">{unit}</span>
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {points.map((p) => (
                  <li key={p} className="flex gap-3 text-[14.5px] md:text-[15px] leading-[1.55] text-[#27324A]">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#E7F7EE] text-[#067647] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" strokeWidth={3.2} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link href={cta.href} className={`${btnBlue} mt-8`}>
                {cta.label} <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-4 md:mt-5 p-5 md:p-6 rounded-[20px] bg-[#F6F8FC] text-[14.5px] md:text-[15px] leading-[1.65] text-[#27324A]">
          <span className="font-extrabold text-[#0B1B3F]">Example:</span> booking a doctor costs <strong className="text-[#0B1B3F]">{inr(fees.consultation)}</strong> online, and you
          pay the consultation fee at the hospital counter. Fast track, where the booking page offers it, is <strong className="text-[#0B1B3F]">{inr(fees.fastTrack)}</strong> online and
          you are seen ahead of general patients once checked in. A {inr(exampleTest)} lab test costs{" "}
          <strong className="text-[#0B1B3F]">{inr(labTestBookingFee(exampleTest, fees.diagnosticPercent))}</strong> online, and {inr(exampleTest)} at the lab.
        </div>
      </Section>

      {commonTests.length > 0 && (
        <Section tint>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <SectionHead
              eyebrow="Lab tests"
              title="Common lab tests"
              lead={`The lowest price at our partner labs today, which you pay at the lab, and the ${formatPercent(fees.diagnosticPercent)} booking fee you pay online.`}
            />
            <TextLink href="/diagnostics">See all labs</TextLink>
          </div>

          <div className={`${card} mt-8 overflow-hidden`}>
            <table className="w-full text-left text-[14.5px] md:text-[15px]">
              <thead className="bg-[#F7F9FC] text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#5B667A]">
                <tr>
                  <th scope="col" className="px-4 md:px-6 py-3.5">Test</th>
                  <th scope="col" className="px-4 md:px-6 py-3.5 hidden sm:table-cell">Available at</th>
                  <th scope="col" className="px-4 md:px-6 py-3.5 text-right">From, at the lab</th>
                  <th scope="col" className="px-4 md:px-6 py-3.5 text-right">Booking fee</th>
                </tr>
              </thead>
              <tbody>
                {commonTests.map((t) => (
                  <tr key={t.name} className="border-t border-[#EEF2F7]">
                    <td className="px-4 md:px-6 py-4 font-bold">{t.name}</td>
                    <td className="px-4 md:px-6 py-4 text-[#5B667A] hidden sm:table-cell">
                      {t.labs} {t.labs === 1 ? "lab" : "labs"}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right font-extrabold tabular-nums">{inr(t.from)}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-[#2A4DD0] font-bold tabular-nums">{inr(labTestBookingFee(t.from, fees.diagnosticPercent))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-14">
          <SectionHead
            eyebrow="Payments"
            title="Payment questions"
            lead={
              <>
                Something else?{" "}
                <Link href="/contact" className="font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                  Contact us
                </Link>
                .
              </>
            }
          />
          <div className="mt-8 lg:mt-0">
            <Faq items={faqs} />
          </div>
        </div>
      </Section>
    </SitePage>
  );
}
