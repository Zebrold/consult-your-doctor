import { createClient } from '@/lib/supabase/server';
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CircleCheck } from "lucide-react";
import { HomeHeroActions } from "@/components/HomeHeroActions";
import { HomeHeroArt } from "@/components/HomeHeroArt";
import QuickSearch from '@/components/QuickSearch';
import { PatientHome, type HomeDoctor, type HomeFacility } from '@/components/PatientHome';
import { currentTime, loadAvailability, one } from '@/components/patient/data';
import { pricedTests } from '@/lib/pricing';
import { HomePhoneMockup } from '@/components/HomePhoneMockup';
import { TrustedByPatients } from '@/components/TrustedByPatients';

const stats = [
  { value: "60,000+", label: "Patients treated" },
  { value: "1,700+", label: "Licensed MDs" },
  { value: "30,000+", label: "AI-assisted cases" },
  { value: "4.9 / 5", label: "Trustpilot score" },
];

const conditionGroups = [
  { title: "Acute & General", items: ["Cough, Cold & Flu", "Urinary Tract Infections", "Food Poisoning & GI", "Sinusitis & Rhinitis", "Ear Infections (Otitis)", "Fever Management"] },
  { title: "Skin & Allergies", items: ["Rash, Eczema & Psoriasis", "Severe Acne & Rosacea", "Bug Bites & Cellulitis", "Hives & Contact Allergies", "Cold Sores & Shingles", "Fungal Skin Infections"] },
  { title: "Chronic & Wellness", items: ["Asthma & Inhaler Refills", "Acid Reflux & GERD", "Hypertension Follow-Up", "Lab Orders & Blood Tests", "Men's & Women's Health", "Mental Health & Sleep"] },
];

const heroTrustAvatars = [
  { src: "/images/avatars/doctor-1.webp", alt: "Verified Doctor" },
  { src: "/images/avatars/doctor-2.webp", alt: "Verified Doctor" },
  { src: "/images/avatars/doctor-3.webp", alt: "Verified Doctor" },
  { src: "/images/avatars/doctor-4.webp", alt: "Verified Doctor" },
];

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isPreviewPatient = searchParams?.preview === "patient";
  // Links such as /?booking=diagnostics open the booking form straight away.
  const heroBooking = searchParams?.booking === "diagnostics" ? "diagnostics" : searchParams?.booking === "consultation" ? "consultation" : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = p;
  }

  const isPatient =
    (user && (profile?.role === 'patient' || !profile?.role)) ||
    isPreviewPatient;

  if (isPatient) {
    const now = currentTime();

    const [{ data: dbDoctors }, { data: dbHospitals }, { data: dbLabs }, availability, { data: myVisits }] = await Promise.all([
      supabase
        .from('doctors')
        .select(`
          id, specialty, experience_years, consultation_fee, image_url,
          profiles!doctors_profile_id_fkey ( full_name ),
          hospitals ( id, name, city )
        `)
        .limit(500),
      supabase
        .from('hospitals')
        .select('id, name, city, address, image_url, doctors ( id )')
        .eq('status', 'active')
        .order('image_url', { ascending: false, nullsFirst: false }),
      supabase
        .from('diagnostic_centers')
        .select('id, name, city, address, image_url, test_prices')
        .eq('status', 'active')
        .order('image_url', { ascending: false, nullsFirst: false }),
      loadAvailability(supabase, now),
      user
        ? supabase
            .from('appointments')
            .select('id, status, schedules ( start_time ), doctors ( specialty, profiles!doctors_profile_id_fkey ( full_name ) )')
            .eq('patient_id', user.id)
            .in('status', ['confirmed', 'pending_payment'])
        : Promise.resolve({ data: [] }),
    ]);

    type DoctorRow = {
      id: string; specialty: string | null; experience_years: number | null; consultation_fee: number | null; image_url: string | null;
      profiles: { full_name: string | null } | { full_name: string | null }[] | null;
      hospitals: { id: string; name: string; city: string | null } | { id: string; name: string; city: string | null }[] | null;
    };
    const doctors: HomeDoctor[] = ((dbDoctors ?? []) as DoctorRow[]).map((d) => {
      const hospital = one(d.hospitals);
      return {
        id: d.id,
        name: one(d.profiles)?.full_name ?? null,
        specialty: d.specialty,
        hospital: hospital?.name ?? null,
        city: hospital?.city ?? null,
        experience: d.experience_years,
        fee: d.consultation_fee,
        image: d.image_url,
        nextSlot: availability[d.id]?.nextSlot ?? null,
        openToday: availability[d.id]?.openToday ?? 0,
      };
    });

    // Real doctor counts per specialty, most-staffed first.
    const specialtyCounts = new Map<string, number>();
    for (const d of doctors) if (d.specialty) specialtyCounts.set(d.specialty, (specialtyCounts.get(d.specialty) ?? 0) + 1);
    const specialties = Array.from(specialtyCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // Doctors who can be booked soonest come first; photos break ties.
    const recommended = doctors
      .filter((d) => d.fee)
      .sort((a, b) => (a.nextSlot ?? '￿').localeCompare(b.nextSlot ?? '￿') || Number(!!b.image) - Number(!!a.image))
      .slice(0, 8);

    type HospitalRow = { id: string; name: string; city: string | null; address: string | null; image_url: string | null; doctors: { id: string }[] | null };
    type LabRow = { id: string; name: string; city: string | null; address: string | null; image_url: string | null; test_prices: Record<string, number> | null };
    const hospitals = (dbHospitals ?? []) as HospitalRow[];
    const labs = (dbLabs ?? []) as LabRow[];
    const facilities: HomeFacility[] = [
      ...hospitals.slice(0, labs.length ? 4 : 6).map((h) => ({
        id: h.id, kind: 'hospital' as const, name: h.name, city: h.city, address: h.address, image: h.image_url, count: h.doctors?.length ?? 0,
      })),
      ...labs.slice(0, 2).map((l) => ({
        id: l.id, kind: 'lab' as const, name: l.name, city: l.city, address: l.address, image: l.image_url, count: pricedTests(l.test_prices).length,
      })),
    ];

    const cities = Array.from(new Set([...hospitals, ...labs].map((f) => f.city).filter(Boolean) as string[])).sort();

    type VisitRow = {
      status: string;
      schedules: { start_time: string } | { start_time: string }[] | null;
      doctors: { specialty: string | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null } | { specialty: string | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null }[] | null;
    };
    const nextVisit = ((myVisits ?? []) as VisitRow[])
      .map((v) => ({ status: v.status, at: one(v.schedules)?.start_time ?? '', doctor: one(one(v.doctors)?.profiles)?.full_name ?? null }))
      .filter((v) => v.at && Date.parse(v.at) > now)
      .sort((a, b) => a.at.localeCompare(b.at))[0] ?? null;

    return (
      <PatientHome
        name={profile?.full_name || user?.user_metadata?.full_name || null}
        email={user?.email ?? null}
        isSignedIn={!!user}
        now={now}
        nextVisit={nextVisit}
        doctors={recommended}
        specialties={specialties}
        facilities={facilities}
        cities={cities}
        reviews={<TrustedByPatients />}
      />
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden bg-[#FAFBFD] border-b border-slate-100">
        <div aria-hidden className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-blue-100/40 blur-3xl pointer-events-none -z-10" />
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-10 pb-4 md:pt-14 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center">
          <div className="lg:col-span-6 flex flex-col gap-6 md:gap-8">
            <h1 className="font-display-lg text-[44px] leading-[1.06] sm:text-6xl lg:text-[76px] lg:leading-[1.04] font-extrabold tracking-tight text-indigo-gray-900">
              Healthcare <br />
              <span className="text-vibrant-blue">Made Simple,</span>
              <br />
              For Everyone.
            </h1>
            <p className="font-body-lg text-base md:text-[19px] md:leading-relaxed text-slate-600 max-w-xl">
              AI-powered technology that connects you with the right doctors, makes booking a visit quick, and simplifies diagnostics.
            </p>
            <HomeHeroActions initial={heroBooking} />
            <div className="flex items-center gap-3.5 pt-1">
              <div className="flex -space-x-2.5 shrink-0" aria-hidden>
                {heroTrustAvatars.map((avatar, i) => (
                  <div
                    key={i}
                    className="relative w-10 h-10 md:w-11 md:h-11 rounded-full ring-[2.5px] ring-[#FAFBFD] shadow-sm overflow-hidden bg-slate-100 shrink-0"
                  >
                    <Image
                      src={avatar.src}
                      alt={avatar.alt}
                      width={88}
                      height={88}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm md:text-base text-slate-600 font-medium leading-snug">
                <span className="font-bold text-vibrant-blue mr-1.5">26M+</span>
                People trust Consult Your Doctor for their healthcare needs
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <HomeHeroArt />
          </div>
        </div>
      </section>

      {/* Quick Medical Search */}
      <section className="py-10 bg-surface-container-low border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <QuickSearch />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
          <div className="col-span-2 md:col-span-1 flex items-center gap-2.5 justify-center md:justify-start">
            <Image src="/logo-icon.png" alt="Consult your Doctor" width={36} height={36} className="w-9 h-9 object-contain shrink-0" />
            <span className="font-display-lg text-lg text-primary font-bold tracking-tight">Consult your Doctor</span>
          </div>
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-200 bg-surface-container-lowest shadow-sm">
              <span className="font-display-lg text-2xl md:text-3xl font-extrabold text-primary mb-0.5">{stat.value}</span>
              <span className="text-xs text-on-surface-variant font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* App Preview & Conditions Treated */}
      <section className="relative isolate overflow-hidden py-16 bg-white">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div aria-hidden className="absolute -left-12 -top-12 w-96 h-96 rounded-full bg-blue-100/60 blur-2xl pointer-events-none -z-10" />
            <div aria-hidden className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-surface-variant/70 blur-xl pointer-events-none -z-10" />
            <HomePhoneMockup />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                <CircleCheck className="w-4 h-4" /> 100+ Common Medical Indications
              </span>
              <h2 className="font-headline-lg text-2xl md:text-4xl font-extrabold text-indigo-gray-900 tracking-tight leading-tight">
                Comprehensive Conditions <span className="text-vibrant-blue">Treated Online</span>
              </h2>
              <p className="font-body-lg text-base text-slate-600 max-w-2xl leading-relaxed">
                Receive clinical diagnosis, personalized care plans, digital sick notes, and immediate pharmacy prescription routing for acute and recurring conditions from your smartphone or tablet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-6 pt-2">
              {conditionGroups.map((group) => (
                <div key={group.title} className="space-y-2.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-vibrant-blue border-b border-blue-100 pb-1">{group.title}</h3>
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-vibrant-blue flex items-center justify-center shrink-0 text-xs font-bold">✓</span>
                        <span className="text-slate-800 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Link href="/what-we-treat" className="inline-flex items-center gap-1.5 text-vibrant-blue font-bold text-sm hover:underline">
              See everything we treat <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <TrustedByPatients />
    </>
  );
}
