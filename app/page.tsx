import type { Viewport } from 'next';
import { redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HomePage } from '@/components/home/HomePage';
import { loadHospitals } from '@/components/home/data';
import type { HomeAccount, HomeDoctor } from '@/components/home/types';
import { currentTime, loadAvailability, one } from '@/components/patient/data';
import { getBookingFees } from '@/lib/booking-fees';
import { PatientDock } from '@/components/PatientDock';
import { Footer } from '@/components/Footer';
import { PatientAppHome, type PatientRecord, type PatientVisit } from '@/components/home/PatientAppHome';
import { IST, doctorName, formatShortDate, visitToken } from '@/components/patient/format';
import { parseVitals, vitalsList } from '@/lib/vitals';
import { matchBookedTests } from '@/lib/pricing';
import QRCode from 'qrcode';
import { siteUrl } from '@/lib/site-url';
import { formatCityName } from '@/lib/geo';

// The app banner's QR code: the site's address, made once per server.
let siteQr: Promise<string> | null = null;
const siteQrSvg = () => (siteQr ??= QRCode.toString(siteUrl(), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B1B3F', light: '#FFFFFF' } }));

// Phones open on the dark app strip, tablets and desktops on the blue header: the browser's bars take the same colour.
export const viewport: Viewport = {
  themeColor: [{ media: '(max-width: 767px)', color: '#0A1022' }, { color: '#1D4ED8' }],
};

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
  // Patients get their own home (?preview=patient shows it to a visitor, without personal details).
  if (isPatient || (!user && searchParams?.preview === 'patient')) {
    return <PatientHome userId={user?.id ?? null} name={account.kind === 'patient' ? account.name : null} now={now} />;
  }

  const [{ data: dbDoctors }, hospitals, { data: labCities }, availability, fees, appQr] = await Promise.all([
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
    getBookingFees(),
    siteQrSvg(),
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
      hospitalId: hospital?.id ?? null,
      city: formatCityName(hospital?.city) || null,
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
    new Set([...hospitals.map((h) => formatCityName(h.city)), ...((labCities ?? []) as { city: string | null }[]).map((l) => formatCityName(l.city))].filter(Boolean) as string[]),
  ).sort();

  return (
    <>
      <HomePage
        account={account}
        now={now}
        nextVisit={null}
        doctors={bookable}
        hospitals={hospitals.filter((h) => h.doctors > 0)}
        cities={cities}
        bookingFee={fees.consultation}
        appQr={appQr}
      />
      <Footer cities={cities} />
    </>
  );
}

type Rel<T> = T | T[] | null;
type HomeVisitRow = {
  id: string;
  status: string;
  schedules: Rel<{ start_time: string }>;
  doctors: Rel<{ specialty: string | null; image_url: string | null; profiles: Rel<{ full_name: string | null }> }>;
  hospitals: Rel<{ name: string; address: string | null; city: string | null }>;
  medical_records: { id: string; document_type: string | null; notes: string | null; file_url: string | null }[] | null;
};
type HomeLabRow = {
  id: string;
  status: string;
  test_name: string | null;
  preferred_date: string | null;
  created_at: string | null;
  diagnostic_centers: Rel<{ name: string; test_prices: unknown }>;
};

/** "Good morning" / "Good afternoon" / "Good evening" in India time. */
function greetingAt(now: number) {
  const hour = Number(new Date(now).toLocaleString('en-US', { timeZone: IST, hour: 'numeric', hourCycle: 'h23' }));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** The signed-in patient's home: partner hospitals, their next visit, latest vitals and newest records. */
async function PatientHome({ userId, name, now }: { userId: string | null; name: string | null; now: number }) {
  const supabase = await createClient();
  const [hospitals, { data: labCities }, { data: visitRows }, { data: labRows }] = await Promise.all([
    loadHospitals(supabase),
    supabase.from('diagnostic_centers').select('city').eq('status', 'active'),
    userId
      ? supabase
        .from('appointments')
        .select(`
          id, status,
          schedules ( start_time ),
          doctors ( specialty, image_url, profiles!doctors_profile_id_fkey ( full_name ) ),
          hospitals ( name, address, city ),
          medical_records ( id, document_type, notes, file_url )
        `)
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(60)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase
        .from('diagnostic_bookings')
        .select('id, status, test_name, preferred_date, created_at, diagnostic_centers ( name, test_prices )')
        .eq('patient_id', userId)
        .eq('status', 'report_sent')
        .order('created_at', { ascending: false })
        .limit(6)
      : Promise.resolve({ data: [] }),
  ]);

  const visits = ((visitRows ?? []) as HomeVisitRow[]).map((v) => {
    const doctor = one(v.doctors);
    const hospital = one(v.hospitals);
    return {
      id: v.id,
      status: v.status,
      at: one(v.schedules)?.start_time ?? '',
      doctor: one(doctor?.profiles)?.full_name ?? null,
      doctorImage: doctor?.image_url ?? null,
      specialty: doctor?.specialty ?? null,
      hospital: hospital?.name ?? null,
      address: hospital?.address ?? null,
      city: formatCityName(hospital?.city) || null,
      records: v.medical_records ?? [],
    };
  });

  const next: PatientVisit | null =
    visits
      .filter((v) => (v.status === 'confirmed' || v.status === 'pending_payment') && v.at && Date.parse(v.at) > now)
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((v): PatientVisit => ({ id: v.id, status: v.status, at: v.at, doctor: v.doctor, doctorImage: v.doctorImage, specialty: v.specialty, hospital: v.hospital, address: v.address, city: v.city, token: visitToken(v.id) }))[0] ?? null;

  // The newest visit with vitals the doctor recorded, and the newest prescriptions and lab reports.
  const withRecords = visits.filter((v) => v.records.length && v.at).sort((a, b) => b.at.localeCompare(a.at));
  const vitalsVisit = withRecords.find((v) => v.records.some((r) => parseVitals(r.notes)));
  const vitals = vitalsVisit ? vitalsList(vitalsVisit.records.map((r) => parseVitals(r.notes)).find(Boolean) ?? null) : [];
  const records: (PatientRecord & { at: string })[] = [
    ...withRecords.flatMap((v) =>
      v.records
        .filter((r) => r.document_type === 'prescription' && r.file_url && r.file_url !== 'none')
        .map((r) => ({ id: r.id, at: v.at, title: 'Prescription', sub: [doctorName(v.doctor), formatShortDate(v.at)].join(' · '), href: '/patient/profile#records' })),
    ),
    ...((labRows ?? []) as HomeLabRow[]).map((b) => {
      const center = one(b.diagnostic_centers);
      const tests = matchBookedTests(b.test_name || '', center?.test_prices as Parameters<typeof matchBookedTests>[1]);
      const at = b.preferred_date ? `${b.preferred_date}T12:00:00+05:30` : b.created_at ?? '';
      return {
        id: b.id,
        at,
        title: tests ? tests.map((t) => t.name).join(', ') : (b.test_name || 'Lab report').replace(/-/g, ' '),
        sub: [center?.name, at ? formatShortDate(at) : null].filter(Boolean).join(' · '),
        href: '/patient/profile#labs',
      };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const cities = Array.from(
    new Set([...hospitals.map((h) => formatCityName(h.city)), ...((labCities ?? []) as { city: string | null }[]).map((l) => formatCityName(l.city))].filter(Boolean) as string[]),
  ).sort();

  return (
    <>
      <PatientAppHome
        greeting={greetingAt(now)}
        name={name}
        isSignedIn={!!userId}
        hospitals={hospitals.filter((h) => h.doctors > 0)}
        cities={cities}
        next={next}
        vitals={vitals}
        vitalsAt={vitalsVisit ? formatShortDate(vitalsVisit.at) : null}
        records={records.map((r) => ({ id: r.id, title: r.title, sub: r.sub, href: r.href }))}
      />
      <PatientDock activeTab="home" isSignedIn={!!userId} name={name} detail={userId ? `UHID CYD-${userId.slice(0, 8).toUpperCase()}` : null} />
    </>
  );
}
