import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChartLine, CreditCard, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";
import { Footer } from "@/components/Footer";
import { SitePage } from "@/components/site/ui";
import { PartnerEnquiry } from "./PartnerEnquiry";
import { PortalPreview } from "./PortalPreview";

export const metadata: Metadata = {
  title: "Partner with us",
  description:
    "Hospitals, diagnostic centres and doctors join the Consult your Doctor network to take bookings online, run the front desk and send prescriptions and reports. See how joining, the portal and payments work.",
};

// The user's PartnerDesk / PartnerMobile designs. The copy describes what the portals really do
// (lib/assistant/knowledge.ts; payments and wallets: lib/wallet.ts).

const SIDES = "px-4 md:px-[max(24px,10%)]";

/** The partner cards' heavy, rounded display face (titles, subtitles and tags). */
const outfit = Outfit({ subsets: ["latin"], display: "swap" });

const PARTNERS = [
  {
    id: "hospitals",
    title: "Hospitals",
    sub: "OPD & in-patient care",
    chip: "Online OPD bookings",
    href: "/signup/hospital",
    image: { src: "/images/home/hospital-building.webp", width: 787, height: 357, className: "-right-2 bottom-2 w-[200px] lg:w-[240px] h-auto" },
  },
  {
    id: "diagnostics",
    title: "Diagnostic centres",
    sub: "Pathology & imaging labs",
    chip: "Online test bookings",
    href: "/signup/diagnostic-centre",
    image: { src: "/images/home/lab-microscope.webp", width: 419, height: 395, className: "right-1 bottom-1 h-[136px] lg:h-[160px] w-auto" },
  },
  {
    id: "doctors",
    title: "Doctors",
    sub: "Verified specialists",
    chip: "Digital prescriptions",
    href: "/signup/doctor",
    image: { src: "/images/home/doctor.webp", width: 376, height: 518, className: "right-3 bottom-0 h-[168px] lg:h-[200px] w-auto" },
  },
];

const STEPS = [
  { title: "Apply", text: "Fill in the short form with your details." },
  { title: "Get verified", text: "We check your registration and licences before you go live." },
  { title: "Set up", text: "Add doctors, fees, slots and tests in your portal." },
  { title: "Go live", text: "Patients find you and book you online." },
];

const PAYMENT_STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CreditCard, title: "Patients book and pay online", text: "UPI, cards and net banking at checkout, with a booking slip sent on WhatsApp and by text." },
  { icon: ShieldCheck, title: "Consult your Doctor collects the payment", text: "Online booking fees and your desk’s UPI scanner pay into our account. Refunds of online payments are handled by us, not your front desk." },
  { icon: ChartLine, title: "Your share shows in your wallet", text: "Every payment is split into your part and ours, so your balance and every line are on your Payouts page." },
  { icon: Landmark, title: "Withdraw to bank or UPI", text: "Ask for a withdrawal whenever you have a balance, and our team pays it to your account." },
];

// The example statement adds up: 1,42,600 + 38,900 − 4,200 − 9,065 = 1,68,235.
const STATEMENT = [
  ["Consultation fees (UPI at your desk)", "₹1,42,600"],
  ["Services (UPI at your desk)", "₹38,900"],
  ["Booking fees on cash payments", "− ₹4,200"],
  ["Withdrawn earlier this month", "− ₹9,065"],
];

const WHY = [
  [
    "A verified network.",
    "Consult your Doctor brings together hospitals, diagnostic centres and doctors that are checked before they go live, so patients book with confidence. Patients pick a slot and pay a booking fee online to confirm it.",
  ],
  ["One portal for your team.", "Manage doctors, slots, beds, walk-ins, staff access and reports in one place, from a desktop at reception or a phone on the go."],
  ["Payments handled for you.", "Patients pay the booking fee online when they book. Hospitals see every payment on Finance and withdraw their balance to a bank account or UPI ID."],
  ["Slips and support.", "Patients get their booking slip with their token on WhatsApp and by text. Our partner team is a call or message away."],
];

export default function CorporatePage() {
  return (
    <SitePage>
      {/* The blue hero with the three kinds of partner */}
      <section className={`relative overflow-hidden bg-[#1D4ED8] text-white ${SIDES} pt-6 pb-7 lg:pt-[30px] lg:pb-16`}>
        <div className="lg:max-w-[1000px] lg:mx-auto lg:flex lg:flex-col lg:items-center lg:text-center lg:gap-3.5">
          <p className="text-[12.5px] lg:text-[14px] font-extrabold tracking-[0.08em] text-[#A9CBFF]">PARTNER WITH US</p>
          <h1 className="mt-2 lg:mt-0 text-[31px] lg:text-[50px] leading-[1.12] lg:leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
            Bring more patients <span className="text-[#A9CBFF]">to your door,</span>
            <br className="hidden lg:block" /> without the paperwork.
          </h1>
          <p className="mt-3 lg:mt-0 max-w-[700px] text-[15px] lg:text-[18px] leading-[1.5] text-[#DCE7FF]">
            <span className="lg:hidden">Join as a hospital, diagnostic centre or doctor. Patients find you, book a slot and pay online.</span>
            <span className="hidden lg:inline">Join the Consult your Doctor network as a hospital, diagnostic centre or doctor. Patients find you, book a slot and pay online.</span>
          </p>
          <div className="grid grid-cols-2 gap-2.5 mt-5 lg:flex lg:flex-wrap lg:justify-center lg:gap-3.5 lg:mt-2.5">
            <Link href="/signup" className="flex items-center justify-center h-[50px] lg:h-[54px] lg:px-7 rounded-xl lg:rounded-[14px] bg-white text-[#1D4ED8] text-[14.5px] lg:text-[16px] font-extrabold hover:bg-[#F2F6FF] transition-colors">
              Apply to partner
            </Link>
            <Link href="/contact" className="flex items-center justify-center h-[50px] lg:h-[54px] lg:px-[26px] rounded-xl lg:rounded-[14px] border-[1.5px] border-white/85 text-white text-[14.5px] lg:text-[16px] font-extrabold hover:bg-white/10 transition-colors">
              Talk to our team
            </Link>
          </div>
        </div>

        {/* The three kinds of partner, each card a link to its application: a heavy uppercase title, a grey subtitle,
            a fading tag, the round arrow and a large picture in the corner. */}
        <div id="join" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 mt-[26px] lg:mt-12 lg:max-w-[1100px] lg:mx-auto">
          {PARTNERS.map((p) => (
            <Link
              key={p.id}
              id={p.id}
              href={p.href}
              aria-label={`${p.title}: ${p.sub}. ${p.chip}. Apply now`}
              className="group scroll-mt-24 relative overflow-hidden flex flex-col min-h-[208px] lg:min-h-[360px] p-6 lg:p-8 rounded-[28px] lg:rounded-[36px] bg-white text-[#0B1B3F] shadow-[0_14px_28px_rgba(11,27,63,0.20)] lg:shadow-[0_20px_40px_rgba(11,27,63,0.22)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            >
              <h2 className={`${outfit.className} relative z-[1] text-[25px] lg:text-[30px] font-extrabold leading-none tracking-[-0.01em] uppercase`}>{p.title}</h2>
              <p className={`${outfit.className} relative z-[1] mt-2 text-[15px] lg:text-[18px] font-bold leading-[1.15] uppercase text-[#0B1B3F]/55`}>{p.sub}</p>
              <span className={`${outfit.className} relative z-[1] mt-3.5 lg:mt-5 self-start pl-2.5 pr-8 py-1 lg:py-1.5 rounded-lg bg-gradient-to-r from-[#DCE7FF] via-[#EEF3FF] to-transparent text-[13px] lg:text-[16px] font-extrabold uppercase text-[#1D4ED8]`}>
                {p.chip}
              </span>
              <span
                aria-hidden
                className="relative z-[1] mt-auto flex items-center justify-center w-11 h-11 lg:w-14 lg:h-14 rounded-full bg-[#1D4ED8] text-white shadow-[0_8px_18px_rgba(29,78,216,0.35)] transition-transform duration-200 group-hover:translate-x-1"
              >
                <ArrowRight className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={2.6} />
              </span>
              <Image src={p.image.src} alt="" width={p.image.width} height={p.image.height} sizes="(min-width: 1024px) 260px, 200px" className={`absolute pointer-events-none select-none ${p.image.className}`} />
            </Link>
          ))}
        </div>
      </section>

      {/* Four steps to go live */}
      <section id="registration" className={`scroll-mt-24 ${SIDES} pt-[30px] pb-2.5 lg:py-16 bg-white lg:border-t lg:border-[#EEF2F7]`}>
        <h2 className="mb-[18px] lg:mb-0 text-[23px] lg:text-[32px] font-extrabold tracking-[-0.02em]">
          Live in <span className="text-[#1D4ED8]">four simple steps</span>
        </h2>
        <ol className="relative lg:mt-9 lg:grid lg:grid-cols-4 lg:gap-6">
          <span aria-hidden className="lg:hidden absolute left-[17px] top-[18px] bottom-[18px] w-0.5 bg-[#DCE7FF]" />
          <span aria-hidden className="hidden lg:block absolute left-[22px] right-[12%] top-[26px] h-0.5 bg-[#DCE7FF]" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0 lg:block lg:pb-0 lg:pt-1">
              <span className="relative z-[1] shrink-0 flex w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-[#1D4ED8] text-white items-center justify-center text-[15px] lg:text-[17px] font-extrabold lg:shadow-[0_0_0_6px_#fff]">
                {i + 1}
              </span>
              <span className="block">
                <span className="block mt-1.5 lg:mt-4 lg:mb-1.5 text-[15.5px] lg:text-[17px] font-extrabold">{s.title}</span>
                <span className="block mt-[3px] lg:mt-0 lg:max-w-[230px] text-[13.5px] lg:text-[14.5px] leading-[1.5] lg:leading-[1.55] text-[#4A5878]">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* The portal, with a sample screen for each kind of partner */}
      <section className={`mt-[30px] lg:mt-0 ${SIDES} py-[30px] lg:py-20 bg-[#F6F8FC] lg:border-t lg:border-[#EEF2F7]`}>
        <PortalPreview />
      </section>

      {/* How payments work */}
      <section className={`${SIDES} py-[30px] lg:py-20 bg-white`}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16 lg:items-center">
          <div>
            <span className="block mb-2.5 text-[12.5px] font-extrabold tracking-[0.12em] text-[#1D4ED8]">HOW PAYMENTS WORK</span>
            <h2 className="text-[24px] lg:text-[34px] font-extrabold tracking-[-0.02em] leading-[1.2] lg:leading-[1.15]">
              Get paid without <span className="text-[#1D4ED8]">chasing anyone</span>
            </h2>
            <p className="mt-2 lg:mt-2.5 mb-5 lg:mb-[30px] max-w-[620px] text-[14.5px] lg:text-[16px] leading-[1.55] lg:leading-[1.6] text-[#5B667A]">
              For hospitals, Consult your Doctor collects online and UPI payments and keeps a clear record of what is yours.
            </p>
            <ol className="mb-[22px] lg:mb-0">
              {PAYMENT_STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative flex gap-3.5 lg:gap-[18px] pb-5 lg:pb-[26px] last:pb-0">
                  {i < PAYMENT_STEPS.length - 1 && <span aria-hidden className="absolute left-[18px] lg:left-[21px] top-10 lg:top-[46px] bottom-0.5 lg:bottom-1 w-0.5 bg-[#DCE5FF]" />}
                  <span className="shrink-0 w-[38px] h-[38px] lg:w-11 lg:h-11 rounded-xl bg-[#EEF3FF] flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] lg:w-5 lg:h-5 text-[#1D4ED8]" strokeWidth={2} />
                  </span>
                  <span className="lg:pt-0.5">
                    <span className="block text-[15px] lg:text-[16px] font-extrabold">{title}</span>
                    <span className="block mt-[3px] lg:mt-1 text-[13px] lg:text-[14px] leading-[1.5] lg:leading-[1.55] text-[#5B667A]">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div aria-label="Example payouts statement" className="rounded-[18px] bg-white p-[18px] lg:p-6 shadow-[0_24px_50px_rgba(11,27,63,0.10),0_0_0_1px_#E6EAF0]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[13px] font-extrabold text-[#5B667A]">Payouts · monthly statement</span>
              <span className="px-[9px] py-1 rounded-full bg-[#F4F6FA] text-[11px] font-extrabold text-[#5B667A]">Example</span>
            </div>
            <span className="block mt-1.5 text-[12.5px] font-bold text-[#5B667A]">Available to withdraw</span>
            <span className="block mb-3 text-[30px] lg:text-[36px] font-extrabold tracking-[-0.03em]">₹1,68,235</span>
            {STATEMENT.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2.5 py-[11px] border-t border-[#EEF2F7] text-[14px]">
                <span className="text-[#5B667A]">{k}</span>
                <span className="font-extrabold whitespace-nowrap">{v}</span>
              </div>
            ))}
            <div aria-hidden className="grid grid-cols-2 gap-2.5 mt-4">
              <span className="flex items-center justify-center gap-2 h-[46px] rounded-xl bg-[#1D4ED8] text-white text-[14px] font-extrabold">
                <Landmark className="w-[17px] h-[17px]" strokeWidth={2} /> To bank
              </span>
              <span className="flex items-center justify-center h-[46px] rounded-xl border border-[#D6DDE8] text-[14px] font-extrabold text-[#27324A]">To UPI</span>
            </div>
            <span className="block mt-3 text-[12px] text-[#5B667A]">Withdrawals are paid by the Consult your Doctor team.</span>
          </div>
        </div>
      </section>

      {/* Talk to our team: an enquiry the operations team calls back (Support › Hospital interest) */}
      <section id="talk" className={`scroll-mt-24 ${SIDES} pt-8 pb-9 lg:pt-[72px] lg:pb-20 bg-[#F6F8FC] border-t border-[#EEF2F7]`}>
        <div className="lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="mb-5 lg:mb-0">
            <h2 className="text-[24px] lg:text-[30px] font-extrabold tracking-[-0.02em] leading-[1.2]">
              Rather talk first? <span className="text-[#1D4ED8]">We’ll call you</span>
            </h2>
            <p className="mt-2 text-[14.5px] lg:text-[16px] leading-[1.55] text-[#5B667A]">
              Leave your details and our team will call, answer your questions and can fill the application in with you on the call.
            </p>
          </div>
          <PartnerEnquiry />
        </div>
      </section>

      {/* Why partners choose us. (Partners sign in from the header's Login menu.) */}
      <section aria-label="Why partners choose Consult your Doctor" className={`${SIDES} pt-8 pb-9 lg:pt-16 lg:pb-[72px] bg-white border-t border-[#EEF2F7]`}>
        <h2 className="mb-4 lg:mb-[22px] text-[22px] lg:text-[26px] font-extrabold tracking-[-0.02em] leading-[1.2]">
          Why partners choose <span className="text-[#1D4ED8]">Consult your Doctor</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-x-14 lg:gap-y-[18px]">
          {WHY.map(([lead, text]) => (
            <p key={lead} className="text-[14.5px] lg:text-[15.5px] leading-[1.7] text-[#4A5878]">
              <strong className="font-extrabold text-[#0B1B3F]">{lead}</strong> {text}
            </p>
          ))}
        </div>
      </section>

      <Footer />
    </SitePage>
  );
}
