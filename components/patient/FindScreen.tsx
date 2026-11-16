import { createClient, getSessionUser } from "@/lib/supabase/server";
import { FindClient, type FindDoctor, type FindLab, type FindMode } from "@/components/patient/FindClient";
import { currentTime, one } from "@/components/patient/data";
import { pricedTests } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { toLatLng } from "@/lib/geo";
import { pausedDoctorIds } from "@/lib/doctor-pause";
import { loadDoctorRatings, loadPublicAvailability, loadPublicDoctorRows, loadPublicHospitals, loadPublicLabs } from "@/lib/public-directory";
import { PatientDock } from "@/components/PatientDock";

export type FindData = Awaited<ReturnType<typeof loadFindData>>;
export type FindInitial = { mode: FindMode; q?: string; specialty?: string; city?: string; availableToday?: boolean };

/** Everything the Find screen lists: doctors with their next slot and rating, bookable hospitals and partner labs. */
export async function loadFindData() {
  const supabase = await createClient();
  const now = currentTime();
  const user = await getSessionUser();

  // The lists are shared by every visitor and kept for a minute or two (lib/public-directory.ts), so this is one round
  // of reads at most, and usually only the viewer's name.
  const [dbDoctors, availability, allHospitals, labRows, fees, viewer, paused] = await Promise.all([
    loadPublicDoctorRows(),
    loadPublicAvailability(),
    loadPublicHospitals(),
    loadPublicLabs(),
    getBookingFees(),
    user ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    // Doctors whose bookings are paused are hidden from patients.
    pausedDoctorIds(),
  ]);

  // Doctors are seen at their hospital, so they are as near as its pin.
  const pins = new Map(allHospitals.map((h) => [h.id, h.lat != null && h.lng != null ? { lat: h.lat, lng: h.lng } : null]));
  const doctors: FindDoctor[] = dbDoctors.filter((d) => !paused.has(d.id)).map((d) => {
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
  const ratings = await loadDoctorRatings(doctors.map((d) => d.id));
  for (const d of doctors) {
    const r = ratings.get(d.id);
    if (r) {
      d.reviewCount = r.count;
      d.rating = r.rating;
    }
  }

  const labs: FindLab[] = labRows.map((l) => {
    const pin = toLatLng(l.latitude, l.longitude);
    const priced = pricedTests(l.test_prices as Parameters<typeof pricedTests>[0]);
    return { id: l.id, name: l.name, city: l.city, address: l.address, image: l.image_url, tests: priced.length, testNames: priced.map((t) => t.name), lat: pin?.lat ?? null, lng: pin?.lng ?? null };
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
      <PatientDock activeTab="find" isSignedIn={!!user} name={user?.name} detail={user ? `UHID CYD-${user.id.slice(0, 8).toUpperCase()}` : null} />
    </div>
  );
}
