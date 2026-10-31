import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CtaBand, SIDES, Section, SectionHead, SitePage, btnBlue, btnGhost, btnOutline, btnWhite, card } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Corporate: Partner With Us",
  description:
    "Doctors, hospitals and diagnostic centres join the Consult Your Doctor network to take online bookings, publish slots, send prescriptions and upload reports. See how registration and verification work.",
};

// Everything here is what the portals really do (see lib/assistant/knowledge.ts and the sign-up forms).
type Partner = {
  id: string;
  who: string;
  title: string;
  lead: string;
  /** The home page's picture for this kind of partner, placed in the card's top by `className`. */
  image: { src: string; width: number; height: number; className: string };
  apply: { href: string; label: string };
  login: { href: string; label: string; text: string };
};

const PARTNERS: Partner[] = [
  {
    id: "doctors",
    who: "For doctors",
    title: "Consult, prescribe and follow up",
    lead: "Patients book your published slots online, and your prescriptions reach their account as signed PDFs.",
    image: { src: "/images/home/doctor.webp", width: 376, height: 518, className: "bottom-0 h-[94%] w-auto" },
    apply: { href: "/signup/doctor", label: "Apply as a doctor" },
    login: { href: "/login/doctor", label: "Doctor login", text: "Your patients, schedule and prescriptions" },
  },
  {
    id: "hospitals",
    who: "For hospitals",
    title: "Your OPD, beds and desk in one place",
    lead: "Add your doctors and publish their slots, so patients can book a visit to your hospital online.",
    image: { src: "/images/home/hospital-building.webp", width: 787, height: 357, className: "bottom-5 w-[80%] h-auto" },
    apply: { href: "/signup/hospital", label: "Register your hospital" },
    login: { href: "/login/hospital", label: "Hospital login", text: "OPD, doctors' slots, desk and beds" },
  },
  {
    id: "diagnostics",
    who: "For diagnostic centres",
    title: "Bookings in, reports out",
    lead: "Price your test menu, take day-wise bookings and upload reports straight to each patient's account.",
    image: { src: "/images/home/lab-microscope.webp", width: 419, height: 395, className: "bottom-3 h-[84%] w-auto" },
    apply: { href: "/signup/diagnostic-centre", label: "Register your centre" },
    login: { href: "/login/diagnostic", label: "Diagnostic centre login", text: "Bookings, test menu and reports" },
  },
];

const HIGHLIGHTS = ["Verified network", "Your own portal", "Digital prescriptions and reports"];

const STEPS = [
  { title: "Apply online", text: "A short form with your registration or licence details and a contact person. It takes a few minutes." },
  { title: "We verify", text: "Our credentialing and operations team checks your registration with the issuing authority before anything goes live." },
  { title: "Get your login", text: "Once you're verified, we share your Staff ID and password for your portal." },
  { title: "Go live", text: "Your listing appears for patients. Publish slots or your test menu and start taking bookings." },
];

const POLICIES = [
  "Partner registration and accreditation checks",
  "Telemedicine standard operating procedure",
  "Information security and access control",
  "Adverse event and error reporting",
];

const eyebrow = "text-[12px] md:text-[13px] font-extrabold uppercase tracking-[0.1em] text-[#2A4DD0]";

export default function CorporatePage() {
  return (
    <SitePage>
      {/* The blue hero: what partnering is, then the three portals' logins beside it */}
      <section className="relative isolate overflow-hidden bg-[#1D4ED8] text-white">
        <span aria-hidden className="absolute -z-10 -right-32 -top-40 w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(169,203,255,0.32),rgba(169,203,255,0)_62%)]" />
        <span aria-hidden className="absolute -z-10 -left-40 -bottom-56 w-[520px] h-[520px] rounded-full border-[70px] border-white/[0.05]" />
        <div className={`${SIDES} pt-10 pb-14 md:pt-16 md:pb-20 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px] lg:gap-14 xl:gap-20 lg:items-center`}>
          <div className="max-w-[680px]">
            <p className="inline-flex items-center h-7 px-3 rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/25 text-[12px] font-extrabold uppercase tracking-[0.08em]">Partner with us</p>
            <h1 className="mt-5 text-[34px] md:text-[48px] lg:text-[54px] leading-[1.06] font-extrabold tracking-[-0.03em] text-balance">Grow your practice with Consult your Doctor</h1>
            <p className="mt-5 max-w-[580px] text-[16px] md:text-[18px] leading-[1.6] text-[#DCE7FF] text-pretty">
              Join our verified network of doctors, hospitals and diagnostic centres. Take bookings online and send prescriptions and reports straight to your
              patients&apos; accounts.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="#join" className={btnWhite}>
                Become a partner <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
              </Link>
              <Link href="/contact" className={btnGhost}>
                Talk to our team
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[14px] md:text-[15px] font-semibold text-white/90">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3.2} />
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div id="login" className="scroll-mt-28 mt-12 lg:mt-0 rounded-[24px] bg-white text-[#0B1B3F] p-6 md:p-8 shadow-[0_30px_60px_-24px_rgba(4,16,70,0.55)]">
            <p className={eyebrow}>Already a partner?</p>
            <h2 className="mt-1.5 text-[22px] md:text-[24px] font-extrabold tracking-[-0.02em]">Log in to your portal</h2>
            <p className="mt-1.5 text-[14px] md:text-[14.5px] leading-[1.55] text-[#5B667A]">Use the Staff ID and password our team shared with you.</p>
            <ul className="mt-5 -mx-3">
              {PARTNERS.map((p, i) => (
                <li key={p.id} className={i ? "border-t border-[#EEF2F7]" : ""}>
                  <Link href={p.login.href} className="group flex items-center gap-4 px-3 py-4 rounded-[14px] hover:bg-[#F5F8FF] transition-colors">
                    <span className="flex-1 min-w-0">
                      <span className="block text-[16px] font-extrabold group-hover:text-[#1D4ED8] transition-colors">{p.login.label}</span>
                      <span className="block mt-0.5 text-[13.5px] text-[#5B667A] truncate">{p.login.text}</span>
                    </span>
                    <span className="w-10 h-10 rounded-full bg-[#EEF3FF] text-[#1D4ED8] flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#1D4ED8] group-hover:text-white">
                      <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.4} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 pt-4 border-t border-[#EEF2F7] text-[13.5px] text-[#5B667A]">
              Can&apos;t log in?{" "}
              <Link href="/contact" className="font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                Contact our team
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Who we work with */}
      <Section id="join">
        <SectionHead
          eyebrow="Who we work with"
          title="Built for every part of care"
          lead="Each partner gets their own portal. Doctors, hospitals and labs work from the same bookings, so patients get one smooth experience."
        />
        <div className="mt-8 md:mt-12 grid lg:grid-cols-3 gap-5 xl:gap-6">
          {PARTNERS.map((p) => (
            <article
              key={p.id}
              id={p.id}
              className="group scroll-mt-28 flex flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_#E6EBF3,0_24px_48px_-32px_rgba(11,27,63,0.35)] transition-shadow duration-300 hover:shadow-[0_0_0_1px_#D6E0F5,0_32px_56px_-30px_rgba(11,27,63,0.45)]"
            >
              <div className="relative h-[200px] md:h-[220px] overflow-hidden bg-[linear-gradient(160deg,#F3F7FF_0%,#DFE9FF_100%)]">
                <span aria-hidden className="absolute left-1/2 -translate-x-1/2 -bottom-[150px] w-[380px] h-[380px] rounded-full bg-white/60" />
                <Image
                  src={p.image.src}
                  alt=""
                  width={p.image.width}
                  height={p.image.height}
                  sizes="(min-width: 1024px) 400px, 90vw"
                  className={`absolute left-1/2 -translate-x-1/2 origin-bottom transition-transform duration-500 ease-out group-hover:scale-[1.03] ${p.image.className}`}
                />
              </div>
              <div className="flex flex-col flex-1 p-6 md:p-7">
                <p className={eyebrow}>{p.who}</p>
                <h3 className="mt-2 text-[20px] md:text-[22px] font-extrabold leading-[1.2] tracking-[-0.015em]">{p.title}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#4A5878]">{p.lead}</p>
                <div className="mt-auto pt-7">
                  <Link href={p.apply.href} className={`${btnBlue} w-full`}>
                    {p.apply.label} <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Registration */}
      <Section tint id="registration">
        <SectionHead
          eyebrow="Registration"
          title="How joining works"
          lead="Every application is reviewed by a person before it goes live, so patients only ever see verified doctors, hospitals and labs."
        />
        <ol className="mt-10 md:mt-14 grid gap-9 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <div className="flex items-center gap-4">
                <span className="w-11 h-11 rounded-full bg-[#1D4ED8] text-white text-[15px] font-extrabold flex items-center justify-center shrink-0 shadow-[0_8px_18px_-8px_rgba(29,78,216,0.7)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden className="hidden lg:block flex-1 h-px bg-[linear-gradient(90deg,#AFC4F5,rgba(175,196,245,0))]" />}
              </div>
              <h3 className="mt-5 text-[18px] font-extrabold">{s.title}</h3>
              <p className="mt-2 max-w-[340px] text-[15px] leading-[1.6] text-[#4A5878]">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Compliance: the signed policies, in one strip */}
      <Section>
        <div className={`${card} rounded-[24px]! p-6 md:p-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14 lg:items-center`}>
          <div>
            <p className={eyebrow}>Compliance</p>
            <h2 className="mt-2 text-[24px] md:text-[30px] font-extrabold tracking-[-0.02em]">Trust and compliance</h2>
            <p className="mt-2.5 max-w-[520px] text-[15px] leading-[1.6] text-[#4A5878]">
              Our signed policies cover how we check partners, handle patient data and keep information secure. Read them online or download them as PDF.
            </p>
            <Link href="/legal" className={`${btnOutline} mt-6`}>
              Read our policies <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
          </div>
          <ul className="mt-8 lg:mt-0 grid sm:grid-cols-2 gap-3">
            {POLICIES.map((text) => (
              <li key={text} className="flex items-start gap-3 p-4 rounded-2xl bg-[#F6F8FC] text-[14.5px] font-bold leading-[1.45]">
                <span className="mt-px w-5 h-5 rounded-full bg-[#E7F7EE] text-[#067647] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3.2} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CtaBand
        title="Ready to partner with us?"
        lead="Apply in a few minutes. Our team verifies every application before your listing goes live."
        actions={
          <>
            <Link href="#join" className={btnWhite}>
              Become a partner <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
            <Link href="/contact" className={btnGhost}>
              Talk to our team
            </Link>
          </>
        }
      />
    </SitePage>
  );
}
