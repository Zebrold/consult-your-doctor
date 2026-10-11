import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  FileText,
  FolderLock,
  MessageCircleQuestion,
  ReceiptIndianRupee,
  Siren,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OnlineDoctorRoster, type RosterDoctor } from "@/components/OnlineDoctorRoster";
import { CONSULTATION_PLATFORM_FEE } from "@/lib/pricing";
import { doctorName } from "@/components/patient/format";

export const metadata: Metadata = {
  title: "Book a Doctor Online",
  description:
    "Book an in-person consultation with a specialist at a partner hospital. Compare fees and open times, pay online, and get your prescription in your account.",
};

// Consultations are in person at the doctor's hospital; only booking and payment happen online
// (see lib/assistant/knowledge.ts for what the site offers).
const afterBooking = [
  { icon: CalendarCheck, text: "Your booking slip and token number arrive on WhatsApp and email." },
  { icon: BadgeCheck, text: "Show the slip at the hospital reception and the desk checks you in." },
  { icon: FileText, text: "Your signed prescription is saved to your account as a PDF." },
];

const assurances = [
  {
    icon: BadgeCheck,
    title: "Doctors at partner hospitals",
    desc: "Every doctor is added by their hospital or approved by our team, and prints their registration number on each prescription.",
  },
  {
    icon: ReceiptIndianRupee,
    title: "The price before you pay",
    desc: `The doctor's consultation fee plus a ₹${CONSULTATION_PLATFORM_FEE} booking fee, with the full amount shown before you pay.`,
  },
  {
    icon: FolderLock,
    title: "Your records stay with you",
    desc: "Prescriptions, lab reports and payments are kept in your account, ready to download or show at a pharmacy.",
  },
];

export default async function OnlineDoctorPage() {
  const supabase = await createClient();
  // Only doctors patients can actually book: a fee is set and their hospital is listed.
  const { data: dbDoctors } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty,
      experience_years,
      consultation_fee,
      image_url,
      profiles!doctors_profile_id_fkey ( full_name ),
      hospitals!inner ( name, city, status )
    `)
    .eq("hospitals.status", "active")
    .gt("consultation_fee", 0)
    .order("image_url", { ascending: false, nullsFirst: false })
    .limit(8);

  type Joined<T> = T | T[] | null;
  type DoctorRow = {
    id: string;
    specialty: string | null;
    experience_years: number | null;
    consultation_fee: number | null;
    image_url: string | null;
    profiles: Joined<{ full_name: string | null }>;
    hospitals: Joined<{ name: string | null; city: string | null }>;
  };
  const one = <T,>(v: Joined<T>) => (Array.isArray(v) ? v[0] ?? null : v);

  const doctors: RosterDoctor[] = ((dbDoctors ?? []) as unknown as DoctorRow[]).map((doc) => {
    const hospital = one(doc.hospitals);
    return {
      id: doc.id,
      name: doctorName(one(doc.profiles)?.full_name),
      specialty: doc.specialty || null,
      experienceYears: doc.experience_years || null,
      fee: doc.consultation_fee ? `₹${doc.consultation_fee.toLocaleString("en-IN")}` : null,
      image: doc.image_url || null,
      hospital: hospital?.name || null,
      city: hospital?.city || null,
    };
  });

  return (
    <div className="w-full bg-background">
      {/* Hero */}
      <section className="w-full border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <p className="text-sm font-semibold text-vibrant-blue">Book a doctor online</p>
            <h1 className="font-display-lg text-4xl md:text-5xl lg:text-[56px] lg:leading-[1.08] font-bold tracking-tight text-indigo-gray-900">
              Book online, see your doctor in person
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-slate-600 max-w-xl">
              Choose a specialist at a partner hospital, pick a time that suits you and pay online. No queue at the
              counter, and your prescription is waiting in your account afterwards.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/doctors"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-vibrant-blue px-6 py-3 text-[15px] font-semibold text-white hover:bg-primary transition-colors"
              >
                Find a doctor <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/ai"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Not sure who to see?
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-7">
              <h2 className="text-base font-semibold text-indigo-gray-900">After you book</h2>
              <ul className="mt-5 space-y-5">
                {afterBooking.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3.5">
                    <span className="w-9 h-9 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <p className="text-[15px] leading-relaxed text-slate-700 pt-1.5">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className="w-full py-16 md:py-20 bg-slate-50 border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <OnlineDoctorRoster doctors={doctors} />
          <div className="mt-8">
            <Link href="/doctors" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-vibrant-blue hover:underline">
              See all doctors <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Assistant */}
      <section className="w-full py-16 md:py-20">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6">
            <span className="w-11 h-11 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center">
              <MessageCircleQuestion className="w-5 h-5" />
            </span>
            <h2 className="mt-5 font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">Not sure which specialist you need?</h2>
            <p className="mt-3 text-slate-600 leading-relaxed max-w-xl">
              Describe what&apos;s bothering you and our assistant tells you which kind of doctor usually sees it, then finds
              who has open times near you. It doesn&apos;t diagnose: a doctor will always assess you in person.
            </p>
            <Link
              href="/ai"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-gray-900 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Ask the assistant <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-6 rounded-xl border border-soft-coral/30 bg-soft-coral/5 p-6 flex gap-4">
            <Siren className="w-6 h-6 text-soft-coral shrink-0" />
            <div>
              <h3 className="font-semibold text-indigo-gray-900">In an emergency, don&apos;t book online</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">
                For chest pain, trouble breathing, signs of a stroke, heavy bleeding or a serious injury, call{" "}
                <a href="tel:112" className="font-semibold text-soft-coral underline">112</a> or go to the nearest emergency department now.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Assurances */}
      <section className="w-full pb-16 md:pb-20">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 md:grid-cols-3 gap-5">
          {assurances.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
              <Icon className="w-6 h-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-indigo-gray-900">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
