import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, Mail, MapPin, Navigation, Phone, Stethoscope } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { GoogleMap } from "@/components/GoogleMap";
import { COMPANY, directionsUrl } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Consult Your Doctor. We are here to help you with your healthcare needs.",
};

const channels = [
  { icon: Phone, title: "Phone Support", detail: "Available 24/7 for urgent queries", value: COMPANY.phone, href: COMPANY.phoneHref },
  { icon: Mail, title: "Email Us", detail: "For general inquiries and partnerships", value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { icon: MapPin, title: "Headquarters", detail: "Visit us at our corporate office", value: COMPANY.address, href: directionsUrl },
];

const quickLinks = [
  { icon: CircleHelp, title: "Help & FAQ", detail: "Answers about consultations, prescriptions, reports and payments.", href: "/how-it-works#faq" },
  { icon: Stethoscope, title: "Need a doctor now?", detail: "Start an online consultation with a licensed doctor in minutes.", href: "/online-doctor" },
];

export default function ContactPage() {
  return (
    <div className="w-full bg-indigo-gray-50">
      {/* Hero: contact channels and message form */}
      <section className="relative isolate w-full overflow-hidden bg-gradient-to-b from-surface-container-low/70 via-indigo-gray-50 to-indigo-gray-50 py-14 md:py-20">
        <div aria-hidden className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-vibrant-blue/5 blur-3xl -z-10" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-fresh-teal/10 blur-3xl -z-10" />

        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <span className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm uppercase shadow-sm">
                <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse" />
                Contact Us
              </span>
              <h1 className="font-display-lg text-[44px] leading-[1.06] md:text-[60px] font-extrabold tracking-tight text-indigo-gray-900">
                Get in <span className="text-vibrant-blue">Touch</span>
              </h1>
              <p className="font-body-lg text-base md:text-body-lg text-indigo-gray-600 max-w-lg">
                Our dedicated support team is available 24/7 to help with bookings, payments, reports or anything else about your care.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {channels.map(({ icon: Icon, title, detail, value, href }) => (
                <li key={title}>
                  <a
                    href={href}
                    {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-start gap-4 p-4 rounded-2xl bg-surface-container-lowest border border-slate-200 card-shadow hover:border-vibrant-blue/50 transition-colors"
                  >
                    <span className="w-12 h-12 rounded-xl bg-primary-fixed text-vibrant-blue flex items-center justify-center shrink-0 group-hover:bg-vibrant-blue group-hover:text-on-primary transition-colors">
                      <Icon className="w-6 h-6" />
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="font-bold text-indigo-gray-900">{title}</span>
                      <span className="text-sm text-on-surface-variant">{detail}</span>
                      <span className="mt-1.5 font-semibold text-vibrant-blue break-words">{value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Headquarters map */}
      <section className="w-full py-16 md:py-20 bg-surface-container-lowest border-t border-slate-100">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="font-headline-lg text-2xl md:text-4xl font-extrabold text-indigo-gray-900 tracking-tight">
                Visit Our <span className="text-vibrant-blue">Headquarters</span>
              </h2>
              <p className="flex items-start gap-2 text-indigo-gray-600">
                <MapPin className="w-5 h-5 text-vibrant-blue shrink-0 mt-0.5" />
                {COMPANY.address}
              </p>
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 self-start md:self-auto px-6 py-3 rounded-full bg-vibrant-blue text-on-primary font-semibold text-sm shadow-[0_4px_12px_rgba(0,102,255,0.2)] hover:bg-primary transition-all shrink-0"
            >
              <Navigation className="w-4 h-4" /> Get Directions
            </a>
          </div>

          <GoogleMap
            query={COMPANY.address}
            title="Consult Your Doctor headquarters on Google Maps"
            className="w-full h-[360px] md:h-[460px] rounded-2xl border border-slate-200 card-shadow"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map(({ icon: Icon, title, detail, href }) => (
              <Link
                key={title}
                href={href}
                className="group flex items-center gap-4 p-5 rounded-2xl bg-surface-container-low border border-slate-200 hover:border-vibrant-blue/50 hover:bg-surface-container-lowest transition-colors"
              >
                <span className="w-12 h-12 rounded-full bg-surface-container-lowest text-vibrant-blue flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className="w-6 h-6" />
                </span>
                <span className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-indigo-gray-900">{title}</span>
                  <span className="text-sm text-on-surface-variant">{detail}</span>
                </span>
                <ArrowRight className="w-5 h-5 text-vibrant-blue shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
