import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FindClient, type FindDoctor, type FindLab, type FindMode } from "@/components/patient/FindClient";
import { loadHospitals } from "@/components/home/data";
import { currentTime, loadAvailability, one } from "@/components/patient/data";
import { pricedTests } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { toLatLng } from "@/lib/geo";
import { PatientDock } from "@/components/PatientDock";
import { PatientFooter } from "@/components/AppFooter";

type DoctorRow = {
  id: string;
  specialty: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  image_url: string | null;
  qualifications: string | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  hospitals: FindDoctor["hospital"] | NonNullable<FindDoctor["hospital"]>[];
};

type LabRow = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image_url: string | null;
  test_prices: Parameters<typeof pricedTests>[0];
  latitude?: unknown;
  longitude?: unknown;
};

export type FindData = Awaited<ReturnType<typeof loadFindData>>;
export type FindInitial = { mode: FindMode; q?: string; specialty?: string; city?: string; availableToday?: boolean };

/** Everything the Find screen lists: doctors with their next slot and rating, bookable hospitals and partner labs. */
export async function loadFindData() {
  const supabase = await createClient();
  const now = currentTime();
  const user = await getCurrentUser();

  const [{ data: dbDoctors, error }, availability, allHospitals, labsResult, fees, viewer] = await Promise.all([
    supabase.from("doctors").select(`
      id, specialty, experience_years, consultation_fee, image_url, qualifications,
      profiles!doctors_profile_id_fkey ( full_name ),
      hospitals ( id, name, city, address )
    `),
    loadAvailability(supabase, now),
    loadHospitals(supabase),
    // Map pins come from a later migration; without them the labs still list, ordered by city.
    supabase
      .from("diagnostic_centers")
      .select("id, name, city, address, image_url, test_prices, latitude, longitude")
      .eq("status", "active")
      .then((res) => (res.error ? supabase.from("diagnostic_centers").select("id, name, city, address, image_url, test_prices").eq("status", "active") : res)),
    getBookingFees(),
    user ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (error) console.error("Error fetching doctors for the Find screen:", error);

  // Doctors are seen at their hospital, so they are as near as its pin.
  const pins = new Map(allHospitals.map((h) => [h.id, h.lat != null && h.lng != null ? { lat: h.lat, lng: h.lng } : null]));
  const doctors: FindDoctor[] = ((dbDoctors ?? []) as DoctorRow[]).map((d) => {
    const hospital = one(d.hospitals);
    const pin = hospital ? pins.get(hospital.id) ?? null : null;
    return {
      id: d.id,
      name: one(d.profiles)?.full_name ?? null,
      specialty: d.specialty,
      qualifications: d.qualifications?.trim() || null,
      experience: d.experience_years,
      bookable: Number(d.consultation_fee) > 0,
      image: d.image_url,
      hospital,
      nextSlot: availability[d.id]?.nextSlot ?? null,
      openToday: availability[d.id]?.openToday ?? 0,
      rating: null,
      reviewCount: 0,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
      city: hospital?.city ?? null,
    };
  });

  // Published patient ratings; doctors without any show none.
  if (doctors.length) {
    const { data: ratingRows } = await createAdminClient()
      .from("doctor_reviews")
      .select("doctor_id, rating")
      .in("doctor_id", doctors.map((d) => d.id))
      .eq("is_published", true);
    const byDoctor = new Map<string, number[]>();
    for (const r of (ratingRows ?? []) as { doctor_id: string; rating: number }[]) byDoctor.set(r.doctor_id, [...(byDoctor.get(r.doctor_id) ?? []), r.rating]);
    for (const d of doctors) {
      const ratings = byDoctor.get(d.id);
      if (ratings?.length) {
        d.reviewCount = ratings.length;
        d.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    }
  }

  const labs: FindLab[] = ((labsResult.data ?? []) as LabRow[]).map((l) => {
    const pin = toLatLng(l.latitude, l.longitude);
    return { id: l.id, name: l.name, city: l.city, address: l.address, image: l.image_url, tests: pricedTests(l.test_prices).length, lat: pin?.lat ?? null, lng: pin?.lng ?? null };
  });

  return {
    doctors,
    // Only hospitals with doctors on the platform can be booked.
    hospitals: allHospitals.filter((h) => h.doctors > 0),
    labs,
    now,
    fees: { consultation: fees.consultation, diagnosticPercent: fees.diagnosticPercent },
    user: user ? { id: user.id, email: user.email ?? null, name: viewer.data?.full_name ?? user.user_metadata?.full_name ?? null } : null,
  };
}

/** The Find screen (/find, and the doctor, hospital and lab directories), opened on one list. */
export function FindScreen({ data, initial }: { data: FindData; initial: FindInitial }) {
  const { user } = data;
  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen">
      <FindClient
        doctors={data.doctors}
        hospitals={data.hospitals}
        labs={data.labs}
        now={data.now}
        initial={{ q: "", specialty: "", city: "", availableToday: false, ...initial }}
        account={{ isSignedIn: !!user, name: user?.name ?? null, email: user?.email ?? null }}
        fees={data.fees}
      />
      <PatientFooter isSignedIn={!!user} />
      <PatientDock activeTab="find" isSignedIn={!!user} name={user?.name} detail={user ? `UHID CYD-${user.id.slice(0, 8).toUpperCase()}` : null} />
    </div>
  );
}
