import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toLatLng } from '@/lib/geo';
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
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const stats = [
  { value: "60,000+", label: "Patients treated" },
  { value: "1,700+", label: "Licensed doctors" },
  { value: "30,000+", label: "AI-assisted cases" },
  { value: "4.9 / 5", label: "Trustpilot score" },
];

const conditionGroups = [
  { title: "Acute and general", items: ["Cough, Cold & Flu", "Urinary Tract Infections", "Food Poisoning & GI", "Sinusitis & Rhinitis", "Ear Infections (Otitis)", "Fever Management"] },
  { title: "Skin and allergies", items: ["Rash, Eczema & Psoriasis", "Severe Acne & Rosacea", "Bug Bites & Cellulitis", "Hives & Contact Allergies", "Cold Sores & Shingles", "Fungal Skin Infections"] },
  { title: "Long-term care", items: ["Asthma & Inhaler Refills", "Acid Reflux & GERD", "Hypertension Follow-Up", "Lab Orders & Blood Tests", "Men's & Women's Health", "Mental Health & Sleep"] },
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
  const user = await getCurrentUser();

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

    // Map pins arrive with supabase/migrations/20261014_facility_locations.sql; until then the same lists load without them.
    const withPins = async <T extends { error: { message?: string } | null }>(query: (pin: string) => PromiseLike<T>): Promise<T> => {
      const result = await query(', latitude, longitude');
      return result.error && /latitude|longitude/.test(result.error.message ?? '') ? query('') : result;
    };

    const [{ data: dbDoctors }, { data: dbHospitals }, { data: dbLabs }, availability, { data: myVisits }] = await Promise.all([
      supabase
        .from('doctors')
        .select(`
          id, specialty, experience_years, consultation_fee, image_url, qualifications,
          profiles!doctors_profile_id_fkey ( full_name ),
          hospitals ( id, name, city )
        `)
        .limit(500),
      withPins((pin) =>
        supabase
          .from('hospitals')
          .select(`id, name, city, address, image_url, doctors ( id )${pin}`)
          .eq('status', 'active')
          .order('image_url', { ascending: false, nullsFirst: false }),
      ),
      withPins((pin) =>
        supabase
          .from('diagnostic_centers')
          .select(`id, name, city, address, image_url, test_prices${pin}`)
          .eq('status', 'active')
          .order('image_url', { ascending: false, nullsFirst: false }),
      ),
      loadAvailability(supabase, now),
      user
        ? supabase
          .from('appointments')
          .select('id, status, schedules ( start_time ), doctors ( specialty, profiles!doctors_profile_id_fkey ( full_name ) )')
          .eq('patient_id', user.id)
          .in('status', ['confirmed', 'pending_payment'])
        : Promise.resolve({ data: [] }),
    ]);

    type Pin = { latitude?: number | null; longitude?: number | null };
    type HospitalRow = { id: string; name: string; city: string | null; address: string | null; image_url: string | null; doctors: { id: string }[] | null } & Pin;
    type LabRow = { id: string; name: string; city: string | null; address: string | null; image_url: string | null; test_prices: Record<string, number> | null } & Pin;
    const hospitals = (dbHospitals ?? []) as unknown as HospitalRow[];
    const labs = (dbLabs ?? []) as unknown as LabRow[];
    const pinOf = (p: Pin) => {
      const pin = toLatLng(p.latitude, p.longitude);
      return { lat: pin?.lat ?? null, lng: pin?.lng ?? null };
    };
    // Doctors are seen at their hospital, so they are as near as its pin.
    const hospitalPins = new Map(hospitals.map((h) => [h.id, toLatLng(h.latitude, h.longitude)]));

    type DoctorRow = {
      id: string; specialty: string | null; experience_years: number | null; consultation_fee: number | null; image_url: string | null; qualifications: string | null;
      profiles: { full_name: string | null } | { full_name: string | null }[] | null;
      hospitals: { id: string; name: string; city: string | null } | { id: string; name: string; city: string | null }[] | null;
    };
    const doctors: HomeDoctor[] = ((dbDoctors ?? []) as DoctorRow[]).map((d) => {
      const hospital = one(d.hospitals);
      const pin = hospital ? hospitalPins.get(hospital.id) ?? null : null;
      return {
        id: d.id,
        name: one(d.profiles)?.full_name ?? null,
        specialty: d.specialty,
        hospital: hospital?.name ?? null,
        city: hospital?.city ?? null,
        experience: d.experience_years,
        qualifications: d.qualifications?.trim() || null,
        fee: d.consultation_fee,
        image: d.image_url,
        nextSlot: availability[d.id]?.nextSlot ?? null,
        openToday: availability[d.id]?.openToday ?? 0,
        rating: null,
        reviewCount: 0,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
      };
    });

    // Real doctor counts per specialty, most-staffed first.
    const specialtyCounts = new Map<string, number>();
    for (const d of doctors) if (d.specialty) specialtyCounts.set(d.specialty, (specialtyCounts.get(d.specialty) ?? 0) + 1);
    const specialties = Array.from(specialtyCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // Every bookable doctor, soonest available first (photos break ties). Wide screens show the first eight; phones
    // re-order the whole list by distance once the patient shares a location.
    const bookable = doctors
      .filter((d) => d.fee)
      .sort((a, b) => (a.nextSlot ?? '￿').localeCompare(b.nextSlot ?? '￿') || Number(!!b.image) - Number(!!a.image))
      .slice(0, 150);
    const recommended = bookable.slice(0, 8);

    // Published patient ratings; doctors without any show their availability instead.
    if (bookable.length) {
      const { data: ratingRows } = await createAdminClient()
        .from('doctor_reviews')
        .select('doctor_id, rating')
        .in('doctor_id', bookable.map((d) => d.id))
        .eq('is_published', true);
      const byDoctor = new Map<string, number[]>();
      for (const r of (ratingRows ?? []) as { doctor_id: string; rating: number }[]) byDoctor.set(r.doctor_id, [...(byDoctor.get(r.doctor_id) ?? []), r.rating]);
      for (const d of bookable) {
        const ratings = byDoctor.get(d.id);
        if (ratings?.length) {
          d.reviewCount = ratings.length;
          d.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        }
      }
    }

    // All partner hospitals and labs (PatientHome picks which to show: nearest first when it knows where the patient is).
    const facilities: HomeFacility[] = [
      ...hospitals.slice(0, 60).map((h) => ({
        id: h.id, kind: 'hospital' as const, name: h.name, city: h.city, address: h.address, image: h.image_url, count: h.doctors?.length ?? 0,
        ...pinOf(h),
      })),
      ...labs.slice(0, 60).map((l) => ({
        id: l.id, kind: 'lab' as const, name: l.name, city: l.city, address: l.address, image: l.image_url, count: pricedTests(l.test_prices).length,
        ...pinOf(l),
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
        nearbyDoctors={bookable}
        specialties={specialties}
        facilities={facilities}
        cities={cities}
        reviews={<TrustedByPatients compact />}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col pt-(--header-h)">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-white border-b border-slate-100">
          <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-10 pb-4 md:pt-14 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center">
            <div className="lg:col-span-6 flex flex-col gap-6 md:gap-8">
              <h1 className="font-display-lg text-[44px] leading-[1.06] sm:text-6xl lg:text-[76px] lg:leading-[1.04] font-extrabold tracking-tight text-indigo-gray-900">
                Healthcare <br />
                <span className="text-vibrant-blue">made simple,</span>
                <br />
                for everyone.
              </h1>
              <p className="font-body-lg text-base md:text-[19px] md:leading-relaxed text-slate-600 max-w-xl">
                Find the right doctor, book a hospital visit or lab test in minutes, and keep every prescription and report in one place.
              </p>
              <HomeHeroActions initial={heroBooking} />
              <div className="flex items-center gap-3.5 pt-1">
                <div className="flex -space-x-2.5 shrink-0" aria-hidden>
                  {heroTrustAvatars.map((avatar, i) => (
                    <div
                      key={i}
                      className="relative w-10 h-10 md:w-11 md:h-11 rounded-full ring-[2.5px] ring-white overflow-hidden bg-slate-100 shrink-0"
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
                  <span className="font-bold text-vibrant-blue mr-1.5">2M+</span>
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
          <dl className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-2 md:grid-cols-4 gap-y-8 md:divide-x md:divide-slate-200">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center px-4">
                <dt className="order-2 mt-1 text-sm text-slate-600">{stat.label}</dt>
                <dd className="order-1 font-display-lg text-3xl md:text-4xl font-bold tracking-tight text-indigo-gray-900">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* App Preview & Conditions Treated */}
        <section className="relative isolate overflow-hidden py-16 bg-white">
          <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <HomePhoneMockup />
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-vibrant-blue">What we treat</p>
                <h2 className="font-headline-lg text-2xl md:text-4xl font-bold text-indigo-gray-900 tracking-tight leading-tight">
                  Care for everyday and long-term conditions
                </h2>
                <p className="font-body-lg text-base text-slate-600 max-w-2xl leading-relaxed">
                  Book a specialist for anything from a fever to a follow-up for blood pressure. Your prescriptions and lab reports are saved to your account, ready to download or show at the pharmacy.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-6 pt-2">
                {conditionGroups.map((group) => (
                  <div key={group.title} className="space-y-2.5">
                    <h3 className="font-semibold text-sm text-indigo-gray-900 border-b border-slate-200 pb-2">{group.title}</h3>
                    <ul className="space-y-2.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <CircleCheck aria-hidden className="w-4 h-4 text-vibrant-blue shrink-0" />
                          <span className="text-slate-700 text-sm">{item}</span>
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
      </main>
      <Footer />
    </div>
  );
}
