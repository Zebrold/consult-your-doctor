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
import { getBookingFees } from "@/lib/booking-fees";
import { doctorName, formatINR } from "@/components/patient/format";
import { FeatureCard, IconTile, PageHero, Section, SitePage, TextLink, btnBlue, btnGhost, btnWhite, card } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Book a Doctor Online",
  description:
    "Book an in-person consultation with a specialist at a partner hospital. See open times, pay a small booking fee online, and get your prescription in your account.",
};

// Consultations are in person at the doctor's hospital; only booking and payment happen online
// (see lib/assistant/knowledge.ts for what the site offers).
const afterBooking = [
  { icon: CalendarCheck, text: "Your booking slip and token number arrive on WhatsApp and email." },
  { icon: BadgeCheck, text: "Show the slip at the hospital reception and the desk checks you in." },
  { icon: FileText, text: "Your signed prescription is saved to your account as a PDF." },
];

const assurances = (bookingFee: string) => [
  {
    icon: BadgeCheck,
    title: "Doctors at partner hospitals",
    desc: "Every doctor is added by their hospital or approved by our team, and prints their registration number on each prescription.",
  },
  {
    icon: ReceiptIndianRupee,
    title: "The price before you pay",
    desc: `You pay a ${bookingFee} booking fee online, nothing more. The consultation fee is set by the hospital, shown on the doctor's profile and paid at the hospital counter.`,
  },
  {
    icon: FolderLock,
    title: "Your records stay with you",
    desc: "Prescriptions, lab reports and payments are kept in your account, ready to download or show at a pharmacy.",
  },
];

export default async function OnlineDoctorPage() {
  const supabase = await createClient();
  const bookingFee = formatINR((await getBookingFees()).consultation);
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
      hospitals!inner ( id, name, city, status )
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
    hospitals: Joined<{ id: string; name: string | null; city: string | null }>;
  };
  const one = <T,>(v: Joined<T>) => (Array.isArray(v) ? v[0] ?? null : v);

  const doctors: RosterDoctor[] = ((dbDoctors ?? []) as unknown as DoctorRow[]).map((doc) => {
    const hospital = one(doc.hospitals);
    return {
      id: doc.id,
      name: doctorName(one(doc.profiles)?.full_name),
      specialty: doc.specialty || null,
      experienceYears: doc.experience_years || null,
      image: doc.image_url || null,
      hospital: hospital?.name || null,
      hospitalId: hospital?.id ?? null,
      city: hospital?.city || null,
    };
  });

  return (
    <SitePage>
      <PageHero
        eyebrow="Book a doctor online"
        title="Book online, see your doctor in person"
        lead="Choose a specialist at a partner hospital, pick a time that suits you and pay online. No queue at the counter, and your prescription is waiting in your account afterwards."
        actions={
          <>
            <a href="#doctors" className={btnWhite}>
              Find a doctor <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </a>
            <Link href="/ai" className={btnGhost}>
              Not sure who to see?
            </Link>
          </>
        }
        aside={
          <div className={`${card} p-6 md:p-7 text-[#0B1B3F] shadow-[0_24px_50px_-20px_rgba(4,16,70,0.55)]`}>
            <h2 className="text-[17px] font-extrabold">After you book</h2>
            <ul className="mt-5 space-y-4">
              {afterBooking.map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-3.5">
                  <IconTile icon={icon} className="!w-11 !h-11" />
                  <p className="text-[14.5px] leading-[1.55] text-[#27324A]">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        }
      />

      <Section id="doctors" tint>
        <OnlineDoctorRoster doctors={doctors} bookingFee={bookingFee} />
        <div className="mt-8">
          <TextLink href="/find">See all doctors</TextLink>
        </div>
      </Section>

      <Section>
        <div className="grid lg:grid-cols-2 gap-4 md:gap-5 items-stretch">
          <div className={`${card} p-6 md:p-8`}>
            <IconTile icon={MessageCircleQuestion} />
            <h2 className="mt-5 text-[22px] md:text-[26px] font-extrabold tracking-[-0.02em]">Not sure which specialist you need?</h2>
            <p className="mt-2 text-[14.5px] md:text-[15px] leading-[1.6] text-[#4A5878]">
              Describe what&apos;s bothering you and our assistant tells you which kind of doctor usually sees it, then finds who has open times near you. It doesn&apos;t
              diagnose: a doctor will always assess you in person.
            </p>
            <Link href="/ai" className={`${btnBlue} mt-6`}>
              Ask the assistant <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
          </div>
          <div className="rounded-[20px] bg-[#FEF3F2] shadow-[0_0_0_1px_#FECDCA] p-6 md:p-8 flex flex-col">
            <span className="w-12 h-12 rounded-[14px] bg-[#D92D20] text-white flex items-center justify-center">
              <Siren className="w-6 h-6" />
            </span>
            <h3 className="mt-5 text-[20px] md:text-[22px] font-extrabold text-[#7A271A]">In an emergency, don&apos;t book online</h3>
            <p className="mt-2 text-[14.5px] md:text-[15px] leading-[1.6] text-[#4A5878]">
              For chest pain, trouble breathing, signs of a stroke, heavy bleeding or a serious injury, call 108 or go to the nearest emergency department now.
            </p>
            <a href="tel:108" className="mt-6 self-start inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-[#D92D20] text-white text-[15px] font-extrabold hover:bg-[#B42318] transition-colors">
              Call 108
            </a>
          </div>
        </div>
        <div className="mt-4 md:mt-5 grid md:grid-cols-3 gap-3.5 md:gap-5">
          {assurances(bookingFee).map((a) => (
            <FeatureCard key={a.title} icon={a.icon} title={a.title}>
              {a.desc}
            </FeatureCard>
          ))}
        </div>
      </Section>
    </SitePage>
  );
}
