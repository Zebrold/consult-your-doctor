import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderLock, Mail, MapPin, Navigation, Phone, ReceiptIndianRupee, Stethoscope } from "lucide-react";
import { GoogleMap } from "@/components/GoogleMap";
import { COMPANY, directionsUrl } from "@/lib/company";
import { LEGAL_ENTITY } from "@/lib/legal";
import { CtaBand, FeatureCard, IconTile, PageHero, Section, SectionHead, SitePage, btnBlue, btnGhost, btnWhite, card } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Consult Your Doctor helps patients find doctors at partner hospitals and diagnostic labs, book and pay online, and keep their prescriptions and reports in one place.",
};

const principles = [
  {
    icon: ReceiptIndianRupee,
    title: "Prices you can see",
    desc: "Doctors and labs set their own fees. We add one booking fee and show the total before anyone pays.",
  },
  {
    icon: Stethoscope,
    title: "Care stays with your doctor",
    desc: "We handle booking, payments and records. Diagnosis and treatment come from the doctors and hospitals you choose.",
  },
  {
    icon: FolderLock,
    title: "Your records are yours",
    desc: "Prescriptions and reports are kept in your account for you to download and share. We never sell health information.",
  },
];

export default function AboutPage() {
  return (
    <SitePage>
      <PageHero
        eyebrow="About us"
        title="Making it simple to see the right doctor"
        lead={`Consult Your Doctor is built by ${LEGAL_ENTITY}. We work with hospitals and diagnostic labs in India so patients can find the right specialist, book and pay online, and keep every prescription and report in one place. Hospitals and labs use the same platform to run their front desk, schedules and records.`}
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

      <Section>
        <SectionHead eyebrow="How we work" title="Three things we never compromise on" />
        <div className="mt-8 md:mt-12 grid md:grid-cols-3 gap-3.5 md:gap-5">
          {principles.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title}>
              {p.desc}
            </FeatureCard>
          ))}
        </div>
      </Section>

      <Section tint>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12 lg:items-center">
          <div>
            <SectionHead eyebrow="Our office" title="Where to find us" lead="Our company is based in Frankfurt. Write to us or call during office hours." />
            <div className={`${card} mt-6 p-2`}>
              {[
                { icon: MapPin, value: COMPANY.address, href: directionsUrl },
                { icon: Mail, value: COMPANY.email, href: `mailto:${COMPANY.email}` },
                { icon: Phone, value: COMPANY.phone, href: COMPANY.phoneHref },
              ].map((c) => (
                <a
                  key={c.value}
                  href={c.href}
                  {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#F4F7FE] transition-colors"
                >
                  <IconTile icon={c.icon} className="!w-11 !h-11" />
                  <span className="text-[15px] font-bold break-words min-w-0">{c.value}</span>
                </a>
              ))}
            </div>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={`${btnBlue} mt-5`}>
              <Navigation className="w-4 h-4" /> Get directions
            </a>
          </div>
          <GoogleMap
            query={COMPANY.address}
            title="Consult Your Doctor office on Google Maps"
            className="mt-8 lg:mt-0 w-full h-[300px] md:h-[440px] rounded-[20px] shadow-[0_0_0_1px_#E6EBF3]"
          />
        </div>
      </Section>

      <div className="pt-12 md:pt-20">
        <CtaBand
          title="For doctors, hospitals and labs"
          lead="Publish your schedule, take bookings and payments, and send prescriptions and reports to patients from one portal."
          actions={
            <>
              <Link href="/corporate" className={btnWhite}>
                Partner with us <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
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
