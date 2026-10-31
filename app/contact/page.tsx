import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CircleHelp, Mail, MapPin, Navigation, Phone, Stethoscope } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { GoogleMap } from "@/components/GoogleMap";
import { COMPANY, directionsUrl } from "@/lib/company";
import { IconTile, PageHero, Section, SectionHead, SitePage, btnBlue, card } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Consult Your Doctor. We are here to help you with your healthcare needs.",
};

const channels = [
  { icon: Phone, title: "Phone support", detail: "Available 24/7 for urgent queries", value: COMPANY.phone, href: COMPANY.phoneHref },
  { icon: Mail, title: "Email us", detail: "For general enquiries and partnerships", value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { icon: MapPin, title: "Headquarters", detail: "Visit us at our corporate office", value: COMPANY.address, href: directionsUrl },
];

const quickLinks = [
  { icon: CircleHelp, title: "Help & FAQ", detail: "Answers about bookings, prescriptions, reports and payments.", href: "/faq" },
  { icon: Stethoscope, title: "Book a doctor", detail: "Find a specialist with open times this week at a partner hospital.", href: "/find" },
  { icon: Building2, title: "For doctors, hospitals and labs", detail: "How partners join, and where to log in.", href: "/corporate" },
];

export default function ContactPage() {
  return (
    <SitePage>
      <PageHero
        eyebrow="Contact us"
        title="Get in touch"
        lead="Our dedicated support team is available 24/7 to help with bookings, payments, reports or anything else about your care."
      />

      <Section>
        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 lg:items-start">
          <ul className="flex flex-col gap-3 md:gap-4">
            {channels.map(({ icon, title, detail, value, href }) => (
              <li key={title}>
                <a
                  href={href}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`${card} group flex items-start gap-4 p-5 hover:shadow-[0_0_0_1.5px_#2A4DD0,0_10px_24px_-14px_rgba(42,77,208,0.45)] transition-shadow`}
                >
                  <IconTile icon={icon} />
                  <span className="min-w-0">
                    <span className="block text-[16px] font-extrabold">{title}</span>
                    <span className="block text-[13.5px] text-[#5B667A]">{detail}</span>
                    <span className="block mt-1.5 text-[15px] font-extrabold text-[#2A4DD0] break-words">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 lg:mt-0">
            <ContactForm />
          </div>
        </div>
      </Section>

      <Section tint>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <SectionHead eyebrow="Headquarters" title="Visit our office" lead={COMPANY.address} />
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={`${btnBlue} self-start md:self-auto shrink-0`}>
            <Navigation className="w-4 h-4" /> Get directions
          </a>
        </div>
        <GoogleMap
          query={COMPANY.address}
          title="Consult Your Doctor headquarters on Google Maps"
          className="mt-8 w-full h-[300px] md:h-[440px] rounded-[20px] shadow-[0_0_0_1px_#E6EBF3]"
        />
        <div className="mt-6 grid md:grid-cols-3 gap-3.5 md:gap-4">
          {quickLinks.map(({ icon, title, detail, href }) => (
            <Link key={title} href={href} className={`${card} group flex items-center gap-4 p-5 hover:shadow-[0_0_0_1.5px_#2A4DD0] transition-shadow`}>
              <IconTile icon={icon} />
              <span className="flex-1 min-w-0">
                <span className="block text-[15.5px] font-extrabold">{title}</span>
                <span className="block text-[13.5px] leading-[1.5] text-[#5B667A]">{detail}</span>
              </span>
              <ArrowRight className="w-5 h-5 text-[#2A4DD0] shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </Section>
    </SitePage>
  );
}
