import { redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HomePage } from '@/components/home/HomePage';
import { loadHospitals } from '@/components/home/data';
import type { HomeAccount, HomeDoctor, NextVisit } from '@/components/home/types';
import { currentTime, loadAvailability, one } from '@/components/patient/data';
import { getBookingFees } from '@/lib/booking-fees';
import { PatientDock } from '@/components/PatientDock';
import { Footer } from '@/components/Footer';

/** Each staff account's own portal, for the header's Dashboard link. */
const PORTAL_HOME: Record<string, string> = {
  doctor: '/doctor/dashboard',
  hospital_admin: '/hospital/dashboard',
  diagnostic_admin: '/diagnostic-center/dashboard',
  executive: '/executive/dashboard',
};

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  // Older links opened a booking form on the home page; send them to the booking pages instead.
  if (searchParams?.booking === 'diagnostics') {
    const centerId = typeof searchParams.center_id === 'string' ? searchParams.center_id : null;
    redirect(centerId ? `/book/diagnostic/${encodeURIComponent(centerId)}` : '/diagnostics');
  }
  if (searchParams?.booking === 'consultation') redirect('/find');

  const supabase = await createClient();
  const user = await getCurrentUser();

  let profile: { role?: string | null; full_name?: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
    profile = data;
  }
  const role = profile?.role ?? (user?.user_metadata?.role as string | undefined) ?? null;
  const isPatient = !!user && (!role || role === 'patient');
  const account: HomeAccount = !user
    ? { kind: 'guest' }
    : isPatient
      ? { kind: 'patient', name: profile?.full_name || user.user_metadata?.full_name || null, email: user.email ?? null }
      : { kind: 'staff', href: PORTAL_HOME[role ?? ''] ?? '/login' };

  const now = currentTime();
  const [{ data: dbDoctors }, hospitals, { data: labCities }, availability, { data: myVisits }, fees] = await Promise.all([
    supabase
      .from('doctors')
      .select(`
        id, specialty, experience_years, consultation_fee, image_url, qualifications,
        profiles!doctors_profile_id_fkey ( full_name ),
        hospitals ( id, name, city )
      `)
      .limit(500),
    loadHospitals(supabase),
    supabase.from('diagnostic_centers').select('city').eq('status', 'active'),
    loadAvailability(supabase, now),
    isPatient
      ? supabase
        .from('appointments')
        .select('id, status, schedules ( start_time ), doctors ( specialty, profiles!doctors_profile_id_fkey ( full_name ) )')
        .eq('patient_id', user!.id)
        .in('status', ['confirmed', 'pending_payment'])
      : Promise.resolve({ data: [] }),
    getBookingFees(),
  ]);

  // Doctors are seen at their hospital, so they are as near as its pin.
  const hospitalPins = new Map(hospitals.map((h) => [h.id, h.lat != null && h.lng != null ? { lat: h.lat, lng: h.lng } : null]));

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
      bookable: Number(d.consultation_fee) > 0,
      image: d.image_url,
      nextSlot: availability[d.id]?.nextSlot ?? null,
      openToday: availability[d.id]?.openToday ?? 0,
      rating: null,
      reviewCount: 0,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
    };
  });

  // Every bookable doctor, soonest available first (photos break ties); the page narrows them to the patient's area.
  const bookable = doctors
    .filter((d) => d.bookable)
    .sort((a, b) => (a.nextSlot ?? '￿').localeCompare(b.nextSlot ?? '￿') || Number(!!b.image) - Number(!!a.image))
    .slice(0, 150);

  // Published patient ratings; doctors without any show none.
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

  const cities = Array.from(
    new Set([...hospitals.map((h) => h.city), ...((labCities ?? []) as { city: string | null }[]).map((l) => l.city)].filter(Boolean) as string[]),
  ).sort();

  type VisitRow = {
    status: string;
    schedules: { start_time: string } | { start_time: string }[] | null;
    doctors: { specialty: string | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null } | { specialty: string | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null }[] | null;
  };
  const nextVisit: NextVisit | null = ((myVisits ?? []) as VisitRow[])
    .map((v) => ({ status: v.status, at: one(v.schedules)?.start_time ?? '', doctor: one(one(v.doctors)?.profiles)?.full_name ?? null }))
    .filter((v) => v.at && Date.parse(v.at) > now)
    .sort((a, b) => a.at.localeCompare(b.at))[0] ?? null;

  return (
    <>
      <HomePage
        account={account}
        now={now}
        nextVisit={nextVisit}
        doctors={bookable}
        hospitals={hospitals.filter((h) => h.doctors > 0)}
        cities={cities}
        bookingFee={fees.consultation}
      />
      <Footer dockRoom={isPatient} />
      {isPatient && <PatientDock activeTab="home" isSignedIn name={account.kind === 'patient' ? account.name : null} />}
    </>
  );
}
