import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LogIn,
  Rocket,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatPercent } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { formatINR } from "@/components/patient/format";
import { CtaBand, IconTile, PageHero, Section, SectionHead, SitePage, Steps, btnBlue, btnGhost, btnOutline, btnWhite, card } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Corporate: Partner With Us",
  description:
    "Doctors, hospitals and diagnostic centres join the Consult Your Doctor network to take online bookings, publish slots, send prescriptions and upload reports. See how registration and verification work.",
};

// Everything here is what the portals really do (see lib/assistant/knowledge.ts and the sign-up forms).
type Partner = {
  id: string;
  icon: LucideIcon;
  who: string;
  title: string;
  lead: string;
  tools: string[];
  needs: string[];
  apply: { href: string; label: string };
  signIn: string;
};

const PARTNERS: Partner[] = [
  {
    id: "doctors",
    icon: Stethoscope,
    who: "For doctors",
    title: "Consult, prescribe and follow up",
    lead: "Patients book your published slots online. On the day, check them in and write a prescription that reaches their account as a signed PDF.",
    tools: [
      "Dashboard with your next patient and the waiting room",
      "Prescription writer with vitals, diagnosis and a live preview",
      "Your signature and registration number on every prescription",
      "Patient history, past notes and latest vitals",
      "Patient reviews on your public profile",
    ],
    needs: ["Medical council and registration number", "Primary qualification and years of experience", "Speciality and your primary hospital", "Your consultation fee"],
    apply: { href: "/signup/doctor", label: "Apply as a doctor" },
    signIn: "/login/doctor",
  },
  {
    id: "hospitals",
    icon: Building2,
    who: "For hospitals",
    title: "Your OPD, beds and desk in one place",
    lead: "List your hospital, add your doctors and publish their slots. Patients book online and pay the consultation fee at your counter.",
    tools: [
      "Patients and visits, with walk-in registration by one-time code",
      "Desk payments by UPI scanner or cash, itemised",
      "Duty roster and slot publishing for every doctor",
      "Inpatient beds: admit, move and discharge",
      "Finance, staff access and your public hospital page",
    ],
    needs: ["Registration or licence number and issuing authority", "Full address of the facility", "Accreditation, beds and specialities (optional)", "A contact person for your hospital"],
    apply: { href: "/signup/hospital", label: "Register your hospital" },
    signIn: "/login/hospital",
  },
  {
    id: "diagnostics",
    icon: FlaskConical,
    who: "For diagnostic centres",
    title: "Bookings in, reports out",
    lead: "Price your test menu and take day-wise bookings. Check samples in and upload reports straight to each patient's account.",
    tools: [
      "Test menu with your own prices",
      "Bookings by day, plus fast booking for walk-in patients",
      "Report upload (PDF or image, up to 5 MB) to the patient",
      "Test-wise amount for this month and overall",
      "Your centre's profile, address and photo",
    ],
    needs: ["Registration or licence number", "NABL accreditation number, if accredited", "The pathologist or radiologist who signs reports, with their registration number", "Biomedical waste authorisation (optional)"],
    apply: { href: "/signup/diagnostic-centre", label: "Register your centre" },
    signIn: "/login/diagnostic",
  },
];

const steps = [
  { icon: ClipboardList, title: "Apply online", text: "A short form with your registration or licence details and a contact person. It takes a few minutes." },
  { icon: ShieldCheck, title: "We verify", text: "Our credentialing and operations team checks your registration with the issuing authority before anything goes live." },
  { icon: KeyRound, title: "Get your login", text: "Once you're verified, we share your Staff ID and password for your portal." },
  { icon: Rocket, title: "Go live", text: "Your listing appears for patients. Publish slots or your test menu and start taking bookings." },
];

const SIGN_IN = [
  { href: "/login/doctor", icon: Stethoscope, title: "Doctor", text: "Clinician portal" },
  { href: "/login/hospital", icon: Building2, title: "Hospital", text: "Hospital admin portal" },
  { href: "/login/diagnostic", icon: FlaskConical, title: "Diagnostic centre", text: "Lab portal" },
  { href: "/login/executive", icon: UserRoundCheck, title: "Front desk", text: "Executive portal" },
];

export default async function CorporatePage() {
  const fees = await getBookingFees();

  return (
    <SitePage>
      <PageHero
        eyebrow="Corporate · Partner with us"
        title="Grow your practice with Consult your Doctor"
        lead="Doctors, hospitals and diagnostic centres join our verified network to take online bookings, publish slots, and send prescriptions and reports to patients' accounts."
        actions={
          <>
            <Link href="#join" className={btnWhite}>
              Become a partner <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
            <Link href="#login" className={btnGhost}>
              <LogIn className="w-4 h-4" /> Partner login
            </Link>
          </>
        }
        aside={
          <div className="grid gap-3">
            {PARTNERS.map((p) => (
              <Link key={p.id} href={`#${p.id}`} className="group flex items-center gap-4 p-4 rounded-[18px] bg-white/[0.1] ring-1 ring-inset ring-white/20 hover:bg-white/[0.16] transition-colors">
                <span className="w-12 h-12 rounded-[14px] bg-white text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <p.icon className="w-[22px] h-[22px]" strokeWidth={2.1} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#BFD2FF]">{p.who}</span>
                  <span className="block text-[16px] font-extrabold">{p.title}</span>
                </span>
                <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        }
      />

      {/* Who we work with */}
      <Section id="join">
        <SectionHead
          eyebrow="Who we work with"
          title="Built for every part of care"
          lead="Each partner gets their own portal. Doctors, hospitals and labs work from the same bookings, so patients get one smooth experience."
        />
        <div className="mt-8 md:mt-12 grid lg:grid-cols-3 gap-4 md:gap-5">
          {PARTNERS.map((p) => (
            <article key={p.id} id={p.id} className={`${card} scroll-mt-24 p-5 md:p-7 flex flex-col`}>
              <div className="flex items-center gap-3.5">
                <IconTile icon={p.icon} />
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#2A4DD0]">{p.who}</p>
                  <h3 className="text-[19px] md:text-[20px] font-extrabold leading-tight">{p.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-[14.5px] md:text-[15px] leading-[1.6] text-[#4A5878]">{p.lead}</p>

              <p className="mt-5 text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-[#5B667A]">Your portal</p>
              <ul className="mt-2.5 space-y-2.5">
                {p.tools.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[14.5px] leading-[1.5]">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#E7F7EE] text-[#067647] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" strokeWidth={3.2} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <div className="mt-5 p-4 rounded-2xl bg-[#F6F8FC]">
                <p className="flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-[#5B667A]">
                  <FileCheck2 className="w-4 h-4 text-[#2A4DD0]" /> To register you&apos;ll need
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {p.needs.map((n) => (
                    <li key={n} className="flex gap-2 text-[13.5px] leading-[1.5] text-[#27324A]">
                      <span aria-hidden className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#2A4DD0] shrink-0" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
                <Link href={p.apply.href} className={`${btnBlue} !px-4`}>
                  {p.apply.label}
                </Link>
                <Link href={p.signIn} className={`${btnOutline} !px-4`}>
                  Login
                </Link>
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
        <Steps steps={steps} />
      </Section>

      {/* Payments and compliance */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-4 md:gap-5">
          <div className={`${card} p-6 md:p-8`}>
            <IconTile icon={Wallet} />
            <h2 className="mt-5 text-[22px] md:text-[26px] font-extrabold tracking-[-0.02em]">How patients pay</h2>
            <p className="mt-2 text-[14.5px] md:text-[15px] leading-[1.6] text-[#4A5878]">
              Patients pay only a booking fee online, to Consult your Doctor. Everything for the care itself is paid to you at your counter.
            </p>
            <div className="mt-5 grid gap-2.5">
              {[
                { label: "Doctor booking fee", value: `${formatINR(fees.consultation)} general · ${formatINR(fees.fastTrack)} fast track`, note: "Paid online by the patient" },
                { label: "Lab test booking fee", value: `${formatPercent(fees.diagnosticPercent)} of each test`, note: "Paid online by the patient" },
                { label: "Consultation fee, services and tests", value: "Your prices", note: "Paid to you at your counter or lab" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#F6F8FC]">
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-extrabold">{r.label}</span>
                    <span className="block text-[12.5px] text-[#5B667A]">{r.note}</span>
                  </span>
                  <span className="shrink-0 text-right text-[14px] font-extrabold text-[#2A4DD0]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} p-6 md:p-8 flex flex-col`}>
            <IconTile icon={ScrollText} />
            <h2 className="mt-5 text-[22px] md:text-[26px] font-extrabold tracking-[-0.02em]">Trust and compliance</h2>
            <p className="mt-2 text-[14.5px] md:text-[15px] leading-[1.6] text-[#4A5878]">
              Our signed policies cover how we check partners, handle patient data and keep information secure. Read them online or download them as PDF.
            </p>
            <ul className="mt-5 grid sm:grid-cols-2 gap-2.5">
              {[
                { icon: BadgeCheck, text: "Partner registration and accreditation checks" },
                { icon: FileText, text: "Telemedicine standard operating procedure" },
                { icon: ShieldCheck, text: "Information security and access control" },
                { icon: ClipboardCheck, text: "Adverse event and error reporting" },
              ].map((r) => (
                <li key={r.text} className="flex items-start gap-3 p-4 rounded-2xl bg-[#F6F8FC] text-[14px] font-bold leading-[1.45]">
                  <r.icon className="w-[18px] h-[18px] text-[#2A4DD0] shrink-0 mt-px" />
                  {r.text}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link href="/legal" className={btnOutline}>
                Read our policies <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Sign in */}
      <Section tint id="login">
        <SectionHead eyebrow="Already a partner?" title="Log in to your portal" lead="Use the Staff ID and password our team shared with you." />
        <div className="mt-8 md:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {SIGN_IN.map((s) => (
            <Link key={s.href} href={s.href} className={`${card} group p-4 md:p-5 flex flex-col gap-3 hover:shadow-[0_0_0_1.5px_#2A4DD0,0_10px_24px_-12px_rgba(42,77,208,0.4)] transition-shadow`}>
              <span className="flex items-center justify-between">
                <IconTile icon={s.icon} className="!w-11 !h-11" />
                <LayoutDashboard className="w-4 h-4 text-[#9AA4B5] group-hover:text-[#2A4DD0] transition-colors" />
              </span>
              <span>
                <span className="block text-[15.5px] md:text-[16.5px] font-extrabold">{s.title}</span>
                <span className="block text-[12.5px] md:text-[13.5px] text-[#5B667A]">{s.text}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-5 flex items-center gap-2 text-[13.5px] text-[#5B667A]">
          <CalendarClock className="w-4 h-4 text-[#2A4DD0] shrink-0" /> Can&apos;t log in or need a new staff login? Our team can help.{" "}
          <Link href="/contact" className="font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            Contact us
          </Link>
        </p>
      </Section>

      <div className="pt-12 md:pt-20">
        <CtaBand
          title="Ready to partner with us?"
          lead="Apply in a few minutes. Our team verifies every application before your listing goes live."
          actions={
            <>
              <Link href="#join" className={btnWhite}>
                Choose how to join <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
              </Link>
              <Link href="/contact" className={btnGhost}>
                Talk to our team
              </Link>
            </>
          }
        />
      </div>
    </SitePage>
  );
}
