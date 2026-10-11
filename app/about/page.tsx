import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderLock, Mail, MapPin, Navigation, Phone, ReceiptIndianRupee, Stethoscope } from "lucide-react";
import { GoogleMap } from "@/components/GoogleMap";
import { COMPANY, directionsUrl } from "@/lib/company";
import { LEGAL_ENTITY } from "@/lib/legal";

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
    <div className="w-full bg-background">
      {/* Intro */}
      <section className="w-full border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <p className="text-sm font-semibold text-vibrant-blue">About us</p>
            <h1 className="mt-3 font-display-lg text-4xl md:text-5xl font-bold tracking-tight text-indigo-gray-900">
              Making it simple to see the right doctor
            </h1>
            <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-slate-600">
              Consult Your Doctor is built by {LEGAL_ENTITY}. We work with hospitals and diagnostic labs in India so
              patients can find the right specialist, book and pay online, and keep every prescription and report in one
              place. Hospitals and labs use the same platform to run their front desk, schedules and records.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="w-full py-16 md:py-20">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">How we work</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {principles.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
                <Icon className="w-6 h-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold text-indigo-gray-900">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="w-full pb-16 md:pb-20">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-indigo-gray-900">For doctors, hospitals and labs</h2>
              <p className="mt-2 text-slate-600 leading-relaxed">
                Publish your schedule, take bookings and payments, and send prescriptions and reports to patients from one
                portal.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/signup/doctor"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-vibrant-blue px-5 py-3 text-[15px] font-semibold text-white hover:bg-primary transition-colors"
              >
                Join as a doctor <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Partner as a hospital or lab
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location Map */}
      <section className="w-full py-16 md:py-20 border-t border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-1/3 flex flex-col justify-center">
            <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">Our office</h2>
            <p className="mt-3 mb-6 text-slate-600 leading-relaxed">
              Our company is based in Frankfurt. Write to us or call during office hours.
            </p>
            <div className="flex flex-col gap-3 text-[15px] text-indigo-gray-900">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-vibrant-blue shrink-0 mt-[3px]" />
                <span>{COMPANY.address}</span>
              </div>
              <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-3 hover:text-vibrant-blue transition-colors">
                <Mail className="w-5 h-5 text-vibrant-blue shrink-0" />
                <span>{COMPANY.email}</span>
              </a>
              <a href={COMPANY.phoneHref} className="flex items-center gap-3 hover:text-vibrant-blue transition-colors">
                <Phone className="w-5 h-5 text-vibrant-blue shrink-0" />
                <span>{COMPANY.phone}</span>
              </a>
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 self-start rounded-lg bg-vibrant-blue px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-primary transition-colors"
            >
              <Navigation className="w-4 h-4" /> Get directions
            </a>
          </div>
          <GoogleMap
            query={COMPANY.address}
            title="Consult Your Doctor office on Google Maps"
            className="w-full md:w-2/3 h-[400px] md:h-[440px] rounded-xl border border-slate-200"
          />
        </div>
      </section>
    </div>
  );
}
