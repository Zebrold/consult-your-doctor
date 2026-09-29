import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Flame,
  HeartPulse,
  HousePlus,
  Lock,
  MessageSquare,
  MessagesSquare,
  Pill,
  QrCode,
  Receipt,
  RefreshCcw,
  Shield,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Truck,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CurrencyProvider, CurrencySwitcher, Price } from "@/components/PriceCurrency";
import { TrustedByPatients } from "@/components/TrustedByPatients";

export const metadata: Metadata = {
  title: "Prices",
  description:
    "Simple, transparent pricing for online doctor consultations and diagnostic tests. No subscriptions, and 23 days of free follow-up care with every visit.",
};

type Tier = {
  tag: string;
  tagTone: string;
  icon: LucideIcon;
  iconTone: string;
  title: string;
  desc: string;
  eur: number;
  unit: string;
  features: { text: string; strong?: boolean; chat?: boolean }[];
  cta: { label: string; href: string };
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    tag: "Primary Care",
    tagTone: "bg-surface-container text-primary",
    icon: Stethoscope,
    iconTone: "text-primary",
    title: "General Physician",
    desc: "For common conditions, colds, viral flu, standard prescriptions, and official digital sick notes.",
    eur: 20,
    unit: "/ one-time visit",
    features: [
      { text: "15–20 min HD video or audio consultation" },
      { text: "Official EU/State digital e-prescription" },
      { text: "Digital signed medical sick certificate" },
      { text: "23 days follow-up doctor messaging", chat: true },
    ],
    cta: { label: "Consult General Doctor", href: "/search?type=doctor&q=general" },
  },
  {
    tag: "Specialist Care",
    tagTone: "bg-primary-fixed text-on-primary-fixed",
    icon: HeartPulse,
    iconTone: "text-vibrant-blue",
    title: "Specialist Doctor",
    desc: "Dermatology, Cardiology, Pediatrics, Neurology, Gynecology, Mental Health & Orthopedics.",
    eur: 35,
    unit: "/ specialty visit",
    features: [
      { text: "Senior Board-Certified Specialist", strong: true },
      { text: "Personalized treatment & recovery protocol" },
      { text: "Diagnostic lab & imaging referrals" },
      { text: "Priority e-prescription dispatch" },
      { text: "23 days direct specialist follow-up chat", chat: true },
    ],
    cta: { label: "Find a Specialist", href: "/search?type=doctor" },
    featured: true,
  },
  {
    tag: "24/7 Rapid Care",
    tagTone: "bg-error-container text-on-error-container",
    icon: Zap,
    iconTone: "text-soft-coral",
    title: "Immediate Night Care",
    desc: "Connect under 5 minutes. Round-the-clock weekend, late night, and emergency triage consultations.",
    eur: 30,
    unit: "/ urgent session",
    features: [
      { text: "< 5 min guaranteed doctor connection", strong: true },
      { text: "Immediate clinical symptom triage" },
      { text: "Emergency care escalation & local hospital routing" },
      { text: "23 days recovery check-ins included", chat: true },
    ],
    cta: { label: "Get Immediate Care", href: "/online-doctor" },
  },
];

const inclusions = [
  { icon: MessagesSquare, tone: "bg-surface-container text-vibrant-blue", title: "23 Days Recovery Chat", desc: "Got a question two weeks later? Message your doctor directly for medication tweaks or checkups at zero extra charge." },
  { icon: Pill, tone: "bg-secondary-container/40 text-on-secondary-container", title: "Digital e-Prescriptions", desc: "Instant PDF and QR code e-Rx recognized by authorized pharmacies across Europe, the UK, USA, and internationally." },
  { icon: ClipboardList, tone: "bg-surface-container text-primary", title: "Official Sick Notes", desc: "Legally accredited medical certificates for employers, universities, and schools with verifiable QR validation." },
  { icon: RefreshCcw, tone: "bg-secondary-container/40 text-secondary", title: "100% Money-Back", desc: "If our medical staff determines your issue requires immediate in-person surgery or cannot be handled online, get a full refund." },
];

const labTests = [
  { name: "Complete Blood Count (CBC)", sub: "Essential baseline screening", params: "Hemoglobin, Platelets, RBC, WBC & differentials (24 parameters)", turnaround: "Within 12 hours", eur: 15 },
  { name: "Lipid Profile", sub: "Cardiovascular health indicator", params: "Total Cholesterol, HDL, LDL, Triglycerides, VLDL", turnaround: "Within 14 hours", eur: 20 },
  { name: "Liver Function Test (LFT)", sub: "Organ wellness screening", params: "SGOT, SGPT, Bilirubin, Alkaline Phosphatase, Total Proteins", turnaround: "Within 18 hours", eur: 25 },
  { name: "HbA1c (Diabetes Screen)", sub: "3-month glycemic average", params: "Glycated hemoglobin level with calculated estimated average glucose", turnaround: "Within 8 hours", eur: 18 },
  { name: "Thyroid Panel Complete", sub: "Metabolic regulatory test", params: "Total T3, Total T4, Ultra-sensitive Thyroid Stimulating Hormone (TSH)", turnaround: "Within 16 hours", eur: 22 },
];

const paymentMethods = [
  { icon: CreditCard, label: "Visa / Mastercard" },
  { icon: Smartphone, label: "Apple Pay" },
  { icon: Wallet, label: "Google Pay" },
  { icon: QrCode, label: "UPI / NetBanking" },
];

const faqs = [
  {
    q: "Are there monthly subscription or membership fees?",
    a: "No, absolutely not. Consult Your Doctor operates strictly on a pay-as-you-go model. You only pay for individual consultations or diagnostic tests when you actually need medical care.",
  },
  {
    q: "Can I get reimbursed through my health insurance?",
    a: "Yes! Every appointment comes with an official, itemized receipt containing your doctor's official registration, ICD-10 clinical diagnosis code, and payment proof. Patients regularly claim full or partial reimbursements from European private insurers, UK health plans, and US out-of-network benefits.",
  },
  {
    q: "What happens if I have follow-up questions after the call?",
    a: "Every consultation includes 23 days of complimentary follow-up messaging in your patient dashboard. You can ask clarifying questions, report how you're feeling on your medication, or share new symptoms with the same doctor at no additional fee.",
  },
  {
    q: "What if my medical issue cannot be resolved online?",
    a: "We stand by our 100% Care Guarantee. If our doctor determines during triage that your condition requires immediate urgent physical care, hospitalization, or an in-person procedure, your consultation fee is fully refunded or credited towards partner clinical facilities.",
  },
];

export default function PricesPage() {
  return (
    <CurrencyProvider>
      <div className="w-full bg-indigo-gray-50">
        <div className="relative isolate w-full overflow-hidden">
          <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[840px] h-[520px] bg-gradient-to-b from-surface-container via-surface-container-low to-transparent rounded-full blur-3xl pointer-events-none -z-10 opacity-70" />
          <div aria-hidden className="absolute top-96 -right-32 w-[420px] h-[420px] bg-secondary-container/20 rounded-full blur-3xl pointer-events-none -z-10" />
          <div aria-hidden className="absolute top-[1100px] -left-32 w-[480px] h-[480px] bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Hero */}
          <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-12 pb-16 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm tracking-wider uppercase mb-6 shadow-sm">
              <BadgeCheck className="w-4 h-4 text-vibrant-blue" />
              Transparent, No Hidden Fees Healthcare
            </span>
            <h1 className="font-display-lg text-4xl md:text-display-lg text-on-surface max-w-4xl mx-auto tracking-tight mb-6">
              Simple, Affordable Pricing for <span className="text-vibrant-blue">Quality Care</span>
            </h1>
            <p className="font-body-lg text-base md:text-body-lg text-indigo-gray-600 max-w-3xl mx-auto mb-10">
              Know exactly what you pay before every consultation. No subscriptions required, instant insurance-ready receipts, and 23 days of free post-consultation recovery care included with every visit.
            </p>
            <CurrencySwitcher />
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-indigo-gray-600 font-label-sm text-label-sm">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-fresh-teal" /> Zero Subscription Commitments
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-fresh-teal" /> Licensed European &amp; Board Doctors
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-fresh-teal" /> HIPAA &amp; GDPR Compliant
              </span>
            </div>
          </section>

          {/* Consultation tiers */}
          <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-gutter items-stretch">
              {tiers.map((tier) => {
                const Icon = tier.icon;
                return (
                  <div
                    key={tier.title}
                    className={`relative flex flex-col justify-between rounded-xl p-8 transition-all duration-300 ${
                      tier.featured
                        ? "shadow-xl hover:shadow-2xl md:-translate-y-3 bg-gradient-to-b from-white via-surface-container-lowest to-surface-container-low/40"
                        : "bg-surface-container-lowest shadow-sm hover:shadow-xl"
                    }`}
                  >
                    {tier.featured && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-vibrant-blue text-on-primary font-label-sm text-label-sm uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                        <Flame className="w-3.5 h-3.5" /> Most Popular Choice
                      </span>
                    )}
                    <div>
                      <div className={`flex items-center justify-between mb-4 ${tier.featured ? "mt-2" : ""}`}>
                        <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm uppercase tracking-wider font-semibold ${tier.tagTone}`}>{tier.tag}</span>
                        <Icon className={`w-7 h-7 ${tier.iconTone}`} />
                      </div>
                      <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">{tier.title}</h2>
                      <p className="font-body-md text-body-md text-indigo-gray-600 mb-6 md:min-h-[78px]">{tier.desc}</p>
                      <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-surface-container">
                        <span className={`font-display-lg text-display-lg ${tier.featured ? "text-vibrant-blue" : "text-on-surface"}`}>
                          <Price eur={tier.eur} />
                        </span>
                        <span className="font-body-md text-body-md text-indigo-gray-600 ml-1">{tier.unit}</span>
                      </div>
                      <ul className="space-y-3.5 mb-8">
                        {tier.features.map((feature) => (
                          <li key={feature.text} className="flex items-start gap-3">
                            {feature.chat ? (
                              <MessageSquare className="w-5 h-5 text-vibrant-blue mt-0.5 shrink-0" />
                            ) : (
                              <Check className="w-5 h-5 text-fresh-teal mt-0.5 shrink-0" />
                            )}
                            <span className={`font-body-md text-body-md text-on-surface ${feature.strong || feature.chat ? "font-semibold" : ""}`}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      href={tier.cta.href}
                      className={`w-full inline-flex items-center justify-center gap-2 px-6 rounded-full font-title-md text-lg transition-all duration-200 ${
                        tier.featured
                          ? "py-4 bg-vibrant-blue text-on-primary shadow-lg shadow-vibrant-blue/20 hover:bg-primary hover:scale-[1.02]"
                          : "py-3.5 bg-surface-container-high text-on-surface hover:bg-vibrant-blue hover:text-on-primary"
                      }`}
                    >
                      {tier.cta.label} <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Always included */}
          <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pb-24">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-vibrant-blue font-label-sm text-label-sm uppercase tracking-wider font-semibold">The CYD Guarantee</span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mt-2 mb-3">Every Single Consult Includes Free</h2>
              <p className="font-body-md text-body-md text-indigo-gray-600">
                No surprise add-ons. The quoted consultation rate covers your complete recovery cycle from diagnosis to recovery.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {inclusions.map(({ icon: Icon, tone, title, desc }) => (
                <div key={title} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${tone}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-title-md text-title-md text-on-surface mb-2">{title}</h3>
                  <p className="font-body-md text-body-md text-indigo-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Lab pricing */}
          <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pb-24">
            <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 lg:p-12 shadow-md">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                  <span className="text-fresh-teal font-label-sm text-label-sm uppercase tracking-wider font-semibold">At-Home &amp; Lab Partner Diagnostics</span>
                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mt-1">Diagnostic Tests &amp; Lab Pricing</h2>
                  <p className="font-body-md text-body-md text-indigo-gray-600 mt-2 max-w-xl">
                    Order tests directly through your consultation. Free certified phlebotomist home sample collection on test packages over <Price eur={30} />.
                  </p>
                </div>
                <span className="flex items-center gap-2 self-start md:self-auto px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                  <HousePlus className="w-4 h-4 text-fresh-teal" />
                  Home sample collection included over <Price eur={30} />
                </span>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-4 px-6 rounded-l-lg font-semibold">Diagnostic Test</th>
                      <th className="py-4 px-6 font-semibold">Parameters Tested</th>
                      <th className="py-4 px-6 font-semibold">Report Turnaround</th>
                      <th className="py-4 px-6 text-right rounded-r-lg font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {labTests.map((test) => (
                      <tr key={test.name} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-title-md text-lg text-on-surface font-semibold">{test.name}</div>
                          <div className="font-label-sm text-label-sm text-indigo-gray-600">{test.sub}</div>
                        </td>
                        <td className="py-4 px-6 font-body-md text-[15px] text-indigo-gray-600">{test.params}</td>
                        <td className="py-4 px-6 font-body-md text-[15px] text-indigo-gray-600 whitespace-nowrap">{test.turnaround}</td>
                        <td className="py-4 px-6 text-right font-headline-lg text-2xl font-bold text-on-surface whitespace-nowrap">
                          <Price eur={test.eur} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 pt-6 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4 text-indigo-gray-600 font-label-sm text-label-sm">
                <span className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary shrink-0" />
                  <span>
                    Home Sample Collection: <strong>Free</strong> for tests over <Price eur={30} /> (otherwise <Price eur={8} /> fee applies).
                  </span>
                </span>
                <Link href="/search?type=diagnostic" className="text-vibrant-blue font-semibold hover:underline inline-flex items-center gap-1">
                  Browse all diagnostic profiles <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Insurance & payments */}
          <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm mb-4">
                    <Receipt className="w-4 h-4" /> 100% Insurance Ready
                  </span>
                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">Claim 80% to 100% Back via Insurance</h2>
                  <p className="font-body-md text-body-md text-indigo-gray-600 mb-6">
                    After every appointment, our platform generates an official, itemized receipt containing your doctor&apos;s medical registration number, diagnosis ICD-10 codes, and clinical treatment notes.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-low">
                      <FileText className="w-5 h-5 text-vibrant-blue mt-0.5 shrink-0" />
                      <div>
                        <div className="font-body-md text-body-md font-semibold text-on-surface">Itemized PDF Invoices</div>
                        <div className="font-label-sm text-label-sm text-indigo-gray-600">Accepted by Allianz, AXA, Cigna, Bupa, Aetna, DKV, and national private funds.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-low">
                      <BadgeCheck className="w-5 h-5 text-vibrant-blue mt-0.5 shrink-0" />
                      <div>
                        <div className="font-body-md text-body-md font-semibold text-on-surface">Physician Registration Included</div>
                        <div className="font-label-sm text-label-sm text-indigo-gray-600">Shows doctor&apos;s national license number and digital clinical signature.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-surface-container flex items-center justify-between gap-4 text-indigo-gray-600 font-label-sm text-label-sm">
                  <span>Average claim reimbursement speed:</span>
                  <span className="font-semibold text-on-surface whitespace-nowrap">48 - 72 Hours</span>
                </div>
              </div>

              <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm mb-4">
                    <Shield className="w-4 h-4" /> Encrypted Checkout
                  </span>
                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">Accepted Payments</h2>
                  <p className="font-body-md text-body-md text-indigo-gray-600 mb-6">
                    Pay seamlessly in your local currency. Zero foreign exchange transaction penalties or hidden credit card fees.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {paymentMethods.map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-container-low">
                        <Icon className="w-5 h-5 text-primary shrink-0" />
                        <span className="font-body-md text-[15px] font-medium text-on-surface">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-surface-container flex items-center gap-3">
                  <Lock className="w-6 h-6 text-vibrant-blue shrink-0" />
                  <p className="font-label-sm text-label-sm text-indigo-gray-600">
                    256-bit bank-grade TLS encryption. Your payment credentials are never saved on CYD servers.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <TrustedByPatients />

        {/* FAQ */}
        <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-24">
          <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 lg:p-12 shadow-sm">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <span className="text-vibrant-blue font-label-sm text-label-sm uppercase tracking-wider font-semibold">Got Questions?</span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mt-1">Frequently Asked Questions</h2>
              <p className="font-body-md text-body-md text-indigo-gray-600 mt-2">Everything you need to know about our honest, upfront pricing structure.</p>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq) => (
                <details key={faq.q} className="group bg-surface-container-low p-5 rounded-lg open:bg-surface-container-lowest open:shadow-md transition-all">
                  <summary className="flex items-center justify-between gap-4 font-title-md text-lg text-on-surface font-semibold cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDown className="w-5 h-5 text-vibrant-blue shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="font-body-md text-body-md text-indigo-gray-600 mt-3 pt-3 border-t border-surface-container">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pb-24">
          <div className="relative bg-gradient-to-r from-primary to-vibrant-blue text-on-primary rounded-xl p-8 md:p-10 lg:p-14 overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 font-label-sm text-label-sm uppercase tracking-wider mb-4">
                <Clock className="w-4 h-4" /> Average wait time &lt; 4 minutes
              </span>
              <h2 className="font-display-lg text-4xl md:text-display-lg text-white mb-4">Ready to speak with a licensed doctor today?</h2>
              <p className="font-body-lg text-base md:text-body-lg text-white/90 mb-8">
                Experience healthcare that works around your schedule. No waiting rooms, no hidden insurance paperwork, and 23 days of free post-consultation care.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/search?type=doctor"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-primary font-title-md text-lg font-bold shadow-lg hover:bg-surface-container-low hover:scale-[1.02] transition-all"
                >
                  Book Doctor Visit Now <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/what-we-treat"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-title-md text-lg transition-all"
                >
                  Explore Our Medical Specialties
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </CurrencyProvider>
  );
}
