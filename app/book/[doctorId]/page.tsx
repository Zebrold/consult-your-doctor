import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { FinalizeBookingClient, type BookingDoctor, type BookingSlot } from "@/components/FinalizeBookingClient";
import { currentTime, loadPatientDefaults, one } from "@/components/patient/data";
import { doctorName } from "@/components/patient/format";
import { getBookingFees } from "@/lib/booking-fees";

interface BookDoctorPageProps {
  params: Promise<{ doctorId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const DOCTOR_FIELDS = `
  id, specialty, experience_years, consultation_fee, image_url, bio, qualifications,
  profiles!doctors_profile_id_fkey ( full_name ),
  hospitals ( id, name, city, address )
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
  hospitals: BookingDoctor["hospital"] | NonNullable<BookingDoctor["hospital"]>[];
};

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
  const picked = (await searchParams)?.slot;
  const supabase = await createClient();
  const now = currentTime();

  const [{ data: row }, { data: schedules }, patient, fees] = await Promise.all([
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
  ]);

  if (!row) notFound();
  const d = row as unknown as DoctorRow;

  const doctor: BookingDoctor = {
    id: d.id,
    name: one(d.profiles)?.full_name ?? null,
    specialty: d.specialty,
    qualifications: d.qualifications,
    bio: d.bio,
    experience: d.experience_years,
    bookable: Number(d.consultation_fee) > 0,
    image: d.image_url,
    hospital: one(d.hospitals),
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
      bookingFee={fees.consultation}
      initialSlotId={typeof picked === 'string' ? picked : null}
      payuKey={process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY || "jwoG24"}
    />
  );
}
