import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, FlaskConical, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPercent, labTestBookingFee, pricedTests, type BookingFees } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { formatINR as inr } from "@/components/patient/format";

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
    price: `${inr(fees.consultation)} booking fee`,
    points: [
      "The booking fee is all you pay online",
      "The consultation fee is set by the hospital, shown on the doctor's profile and paid at the hospital counter",
      "In person, at the doctor's partner hospital",
      "Booking slip and token number on WhatsApp and email",
    ],
    cta: { label: "Find a doctor", href: "/online-doctor" },
  },
  {
    icon: FlaskConical,
    name: "Lab tests",
    price: `${formatPercent(fees.diagnosticPercent)} booking fee`,
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
    <div className="w-full bg-background">
      {/* Hero */}
      <section className="w-full border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-12 md:py-16">
          <p className="text-sm font-semibold text-vibrant-blue">Prices</p>
          <h1 className="mt-3 max-w-3xl font-display-lg text-4xl md:text-5xl font-bold tracking-tight text-indigo-gray-900">
            You pay a small booking fee online, and the rest at your visit
          </h1>
          <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-slate-600">
            Each hospital and lab sets its own prices, and you pay those at the counter. Online you pay only our booking
            fee. No subscriptions, no membership.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="w-full py-12 md:py-16">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 md:grid-cols-2 gap-5">
          {plans(fees).map(({ icon: Icon, name, price, points, cta }) => (
            <div key={name} className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 flex flex-col">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-semibold text-indigo-gray-900">{name}</h2>
              </div>
              <p className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">{price}</p>
              <ul className="mt-6 space-y-3 flex-1">
                {points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] text-slate-700">
                    <Check className="w-5 h-5 text-vibrant-blue shrink-0 mt-px" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={cta.href}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-vibrant-blue px-5 py-3 text-[15px] font-semibold text-white hover:bg-primary transition-colors"
              >
                {cta.label} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop mt-5">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-5 text-[15px] text-slate-700">
            <span className="font-semibold text-indigo-gray-900">Example:</span> booking a doctor costs{" "}
            <span className="font-semibold text-indigo-gray-900">{inr(fees.consultation)}</span> online, and you pay the consultation fee at the
            hospital counter. Fast track, where the booking page offers it, is{" "}
            <span className="font-semibold text-indigo-gray-900">{inr(fees.fastTrack)}</span> online and you are seen ahead of general patients once
            checked in. A {inr(exampleTest)} lab test costs{" "}
            <span className="font-semibold text-indigo-gray-900">{inr(labTestBookingFee(exampleTest, fees.diagnosticPercent))}</span> online, and{" "}
            {inr(exampleTest)} at the lab.
          </div>
        </div>
      </section>

      {/* Lab prices */}
      {commonTests.length > 0 && (
        <section className="w-full py-12 md:py-16 bg-slate-50 border-y border-slate-100">
          <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">Common lab tests</h2>
                <p className="mt-2 text-slate-600">
                  The lowest price at our partner labs today, which you pay at the lab, and the {formatPercent(fees.diagnosticPercent)} booking fee you pay online.
                </p>
              </div>
              <Link href="/diagnostics" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-vibrant-blue hover:underline shrink-0">
                See all labs <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-[15px]">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Test</th>
                    <th scope="col" className="px-5 py-3 font-medium hidden sm:table-cell">Available at</th>
                    <th scope="col" className="px-5 py-3 font-medium text-right">From, at the lab</th>
                    <th scope="col" className="px-5 py-3 font-medium text-right">Booking fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commonTests.map((t) => (
                    <tr key={t.name}>
                      <td className="px-5 py-3.5 text-indigo-gray-900">{t.name}</td>
                      <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                        {t.labs} {t.labs === 1 ? "lab" : "labs"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-indigo-gray-900 tabular-nums">{inr(t.from)}</td>
                      <td className="px-5 py-3.5 text-right text-slate-600 tabular-nums">{inr(labTestBookingFee(t.from, fees.diagnosticPercent))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="w-full py-12 md:py-16">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">Payment questions</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Something else?{" "}
              <Link href="/contact" className="font-semibold text-vibrant-blue hover:underline">
                Contact us
              </Link>
              .
            </p>
          </div>
          <div className="lg:col-span-8 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq) => (
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
    </div>
  );
}
