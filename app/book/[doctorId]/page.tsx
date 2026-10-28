import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { FinalizeBookingClient, type BookingDoctor, type BookingSlot } from "@/components/FinalizeBookingClient";
import { currentTime, loadPatientDefaults, one } from "@/components/patient/data";
import { doctorName } from "@/components/patient/format";
import { getBookingFees } from "@/lib/booking-fees";
import { bookingOptionsReady } from "@/lib/booking-options";
import { isFastTrack, testList, type BookedTest } from "@/lib/pricing";

interface BookDoctorPageProps {
  params: Promise<{ doctorId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const DOCTOR_FIELDS = `
  id, specialty, experience_years, consultation_fee, image_url, bio, qualifications,
  profiles!doctors_profile_id_fkey ( full_name ),
  hospitals ( * )
`;

type DoctorRow = {
  id: string;
  specialty: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  image_url: string | null;
  bio: string | null;
  qualifications: string | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  hospitals: HospitalRow | HospitalRow[] | null;
};

// The whole row: available_tests and test_prices come from a later migration, and naming them would fail the query
// on a database without it.
type HospitalRow = NonNullable<BookingDoctor["hospital"]> & { available_tests?: string[] | null; test_prices?: Record<string, number | string> | null };

export async function generateMetadata({ params }: BookDoctorPageProps): Promise<Metadata> {
  const { doctorId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("doctors").select("profiles!doctors_profile_id_fkey ( full_name )").eq("id", doctorId).maybeSingle();
  const name = doctorName(one((data as { profiles: { full_name: string | null } | null } | null)?.profiles)?.full_name);
  return {
    title: `Book a Consultation with ${name} | Consult Your Doctor`,
    description: `Choose an open slot and book an in-person consultation with ${name}.`,
  };
}

export default async function BookDoctorPage({ params, searchParams }: BookDoctorPageProps) {
  const { doctorId } = await params;
  const query = (await searchParams) ?? {};
  const picked = query.slot;
  const supabase = await createClient();
  const now = currentTime();

  const [{ data: row }, { data: schedules }, patient, fees, choices] = await Promise.all([
    supabase.from("doctors").select(DOCTOR_FIELDS).eq("id", doctorId).maybeSingle(),
    supabase
      .from("schedules")
      .select("id, start_time, is_booked")
      .eq("doctor_id", doctorId)
      .gt("start_time", new Date(now).toISOString())
      .lt("start_time", new Date(now + 60 * 86_400_000).toISOString())
      .order("start_time", { ascending: true }),
    loadPatientDefaults(supabase),
    getBookingFees(),
    bookingOptionsReady(),
  ]);

  if (!row) notFound();
  const d = row as unknown as DoctorRow;
  const hospital = one(d.hospitals);
  // The hospital's priced services, in its own order, as on the hospital page.
  const services = choices
    ? testList(hospital?.available_tests, hospital?.test_prices).filter((t): t is BookedTest => !!t.price && t.price > 0)
    : [];
  const asked = ([] as string[]).concat(query.service ?? []);

  const doctor: BookingDoctor = {
    id: d.id,
    name: one(d.profiles)?.full_name ?? null,
    specialty: d.specialty,
    qualifications: d.qualifications,
    bio: d.bio,
    experience: d.experience_years,
    bookable: Number(d.consultation_fee) > 0,
    image: d.image_url,
    hospital: hospital && { id: hospital.id, name: hospital.name, city: hospital.city, address: hospital.address },
  };

  const slots: BookingSlot[] = ((schedules ?? []) as { id: string; start_time: string; is_booked: boolean }[]).map((s) => ({
    id: s.id,
    start: s.start_time,
    booked: s.is_booked,
  }));

  return (
    <FinalizeBookingClient
      doctor={doctor}
      slots={slots}
      patient={patient}
      now={now}
      fees={fees}
      choices={choices}
      services={services}
      initialSlotId={typeof picked === 'string' ? picked : null}
      initialFastTrack={choices && isFastTrack(query.type)}
      initialServices={services.filter((s) => asked.includes(s.name)).map((s) => s.name)}
      payuKey={process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY || "jwoG24"}
    />
  );
}
