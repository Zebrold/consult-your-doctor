import { createClient } from '@/lib/supabase/server';
import Link from "next/link";
import { ArrowRight, Bot, BriefcaseMedical, CircleCheck, Headset, Heart, HeartPulse, Pill, ShieldCheck, ShieldPlus, Stethoscope } from "lucide-react";
import { BookConsultationForm } from "@/components/BookConsultationForm";
import QuickSearch from '@/components/QuickSearch';
import { PatientHome, type HomeDoctor, type HomeFacility } from '@/components/PatientHome';
import { currentTime, loadAvailability, one } from '@/components/patient/data';
import { pricedTests } from '@/lib/pricing';
import { HomePhoneMockup } from '@/components/HomePhoneMockup';
import { TrustedByPatients } from '@/components/TrustedByPatients';

const careFeatures = [
  { icon: BriefcaseMedical, title: "Expert Medical Consultation", desc: "Connect directly with licensed specialists across 35+ branches of modern medicine for thorough clinical diagnostic discussions." },
  { icon: Bot, title: "AI Doctor & Vitals Support", desc: "24/7 intelligent health triage answering dosage queries, symptom checks, and monitoring bio-markers around the clock." },
  { icon: ShieldCheck, title: "23 Days Complimentary Recovery", desc: "Continuous messaging, dose adjustment checks, and recovery tracking for 23 days post-visit at no added expense." },
  { icon: Pill, title: "Digital Rx & Same-Day Dispatch", desc: "Instant e-prescriptions sent directly to national partner pharmacies with door-step delivery available within 2 hours." },
  { icon: HeartPulse, title: "Continuous Health Tracking", desc: "Sync wearable data, lab results, and blood pressure graphs directly into your private encrypted medical record vault." },
  { icon: Headset, title: "24/7 Care Concierge", desc: "Dedicated clinical coordinators to book lab work, coordinate hospital admissions, and arrange second medical opinions." },
];

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

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isPreviewPatient = searchParams?.preview === "patient";

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
      />
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="w-full bg-white border-b border-slate-100">
        <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-display-lg text-4xl md:text-display-lg text-indigo-gray-900 font-extrabold tracking-tight">
              Healthcare That Continues <br className="hidden sm:block" />
              <span className="text-vibrant-blue">Beyond Your Consultation</span>
            </h1>
            <p className="font-body-lg text-base md:text-body-lg text-on-surface-variant max-w-3xl">
              Expert care doesn&apos;t end when your appointment concludes. Experience an integrated clinical ecosystem combining board-certified physicians, AI-assisted symptom triage, 23 days of complimentary post-consultation follow-up, rapid digital prescriptions, and continuous vitals oversight designed for your lifelong wellness.
            </p>

            <div className="pt-4 space-y-4">
              <h2 className="font-title-md text-lg text-primary font-bold flex items-center gap-2">
                <ShieldPlus className="w-5 h-5 text-vibrant-blue" /> Care Designed Around You &amp; Your Family
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {careFeatures.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="p-4 rounded-xl border border-slate-100 bg-surface-container-lowest hover:border-blue-200 transition-all flex items-start gap-3">
                    <Icon className="w-5 h-5 text-vibrant-blue mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-on-surface">{title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3">
                  <Heart className="w-7 h-7 text-vibrant-blue shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-on-surface">Consult. Connect. Continue Your Care.</p>
                    <p className="text-xs text-on-surface-variant">One consultation. 23 days of physician-monitored recovery support.</p>
                  </div>
                </div>
                <a href="#book-visit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-vibrant-blue text-white rounded-lg text-xs font-bold hover:bg-primary transition-colors shrink-0">
                  Book Appointment <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div id="book-visit" className="lg:col-span-5 scroll-mt-28">
            <BookConsultationForm />
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
          <div className="col-span-2 md:col-span-1 flex items-center gap-2 justify-center md:justify-start">
            <Stethoscope className="w-9 h-9 text-vibrant-blue shrink-0" />
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
