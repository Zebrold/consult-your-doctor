import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  DoctorProfileClient,
  ProfileDoctorData,
} from "@/components/DoctorProfileClient";

export const revalidate = 0;

interface DoctorProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(
  props: DoctorProfilePageProps
): Promise<Metadata> {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select(`
      specialty,
      profiles!doctors_profile_id_fkey(full_name),
      departments(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!doctor) {
    return { title: "Doctor Profile | Consult Your Doctor" };
  }

  const profiles = doctor.profiles as { full_name?: string } | null;
  const departments = doctor.departments as { name?: string } | null;
  const name = profiles?.full_name || "Specialist Doctor";
  const spec = departments?.name || doctor.specialty || "Specialist";

  return {
    title: `${name} - ${spec} | Consult Your Doctor`,
    description: `View clinical profile, credentials, practice hours, and book consultations with ${name} (${spec}). ABDM M3 verified.`,
  };
}

export default async function DoctorProfilePage(props: DoctorProfilePageProps) {
  const { id } = await props.params;
  const sParams = await props.searchParams;
  const isPreview = sParams?.preview === "patient";

  const supabase = await createClient();

  // Fetch full doctor data from DB
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty,
      experience_years,
      consultation_fee,
      image_url,
      bio,
      qualifications,
      hospital_id,
      department_id,
      profiles!doctors_profile_id_fkey(full_name, email, phone_number, staff_id),
      hospitals(id, name, city, address, image_url, contact_email),
      departments(id, name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!doctor || doctorError) {
    notFound();
  }

  const doctorData: ProfileDoctorData = doctor as unknown as ProfileDoctorData;

  // Fetch upcoming live schedules from today onwards (Asia/Kolkata timezone aware)
  const now = new Date();
  const todayIST = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todayStart = new Date(`${todayIST}T00:00:00+05:30`);

  let { data: schedules } = await supabase
    .from("schedules")
    .select("id, start_time, end_time, is_booked")
    .eq("doctor_id", id)
    .gte("start_time", todayStart.toISOString())
    .order("start_time", { ascending: true });

  // If no upcoming schedules from today onwards, load recent generated schedules for this doctor
  if (!schedules || schedules.length === 0) {
    const { data: recentSchedules } = await supabase
      .from("schedules")
      .select("id, start_time, end_time, is_booked")
      .eq("doctor_id", id)
      .order("start_time", { ascending: false })
      .limit(64);
    if (recentSchedules && recentSchedules.length > 0) {
      schedules = [...recentSchedules].reverse();
    }
  }

  if (schedules) {
    doctorData.schedules = schedules;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctorData.profiles?.full_name || "Specialist Doctor",
    image: doctorData.image_url || "",
    medicalSpecialty: doctorData.specialty || doctorData.departments?.name || "",
    address: {
      "@type": "PostalAddress",
      streetAddress: doctorData.hospitals?.address || "",
      addressLocality: doctorData.hospitals?.city || "",
    },
    url: `https://consultyourdoctor.de/doctors/${id}`,
    priceRange: doctorData.consultation_fee ? `₹${doctorData.consultation_fee}` : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <DoctorProfileClient doctor={doctorData} />
    </>
  );
}
