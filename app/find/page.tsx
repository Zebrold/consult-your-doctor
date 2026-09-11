import { createClient } from "@/lib/supabase/server";
import { FindCareClient, DoctorData } from "@/components/FindCareClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Doctors & Specialists | Consult Your Doctor",
  description: "Search and book verified specialists, view clinic locations on interactive map, and schedule consultations.",
};

export default async function FindPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();

  // 1. Fetch doctors from DB
  const { data: dbDoctors, error: docError } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty,
      experience_years,
      consultation_fee,
      image_url,
      bio,
      qualifications,
      profiles!doctors_profile_id_fkey (
        full_name,
        email
      ),
      hospitals (
        id,
        name,
        city,
        address,
        image_url
      )
    `)
    .order("image_url", { ascending: false, nullsFirst: false });

  if (docError) {
    console.error("Error fetching doctors in /find:", docError);
  }

  // 2. Fetch unique specialties from doctors
  const { data: specData } = await supabase
    .from("doctors")
    .select("specialty");

  const uniqueSpecialties = Array.from(
    new Set(
      (specData || [])
        .map((d) => d.specialty)
        .filter(Boolean)
    )
  );

  // Default common specialties if list is short
  const defaultSpecialties = [
    "Cardiology",
    "Neurology",
    "Orthopaedics",
    "Pediatrics",
    "Ophthalmology",
    "Dermatology",
    "General Medicine",
  ];
  const allSpecialties = Array.from(
    new Set([...uniqueSpecialties, ...defaultSpecialties])
  );

  // 3. Fetch unique cities from hospitals
  const { data: hospitalCities } = await supabase
    .from("hospitals")
    .select("city")
    .eq("status", "active");

  const uniqueCities = Array.from(
    new Set(
      (hospitalCities || [])
        .map((h) => h.city)
        .filter(Boolean)
    )
  );

  const initialDoctors: DoctorData[] = (dbDoctors as any[]) || [];

  return (
    <FindCareClient
      initialDoctors={initialDoctors}
      specialties={allSpecialties}
      cities={uniqueCities.length > 0 ? uniqueCities : ["Mumbai", "New Delhi", "Bengaluru", "Chennai"]}
    />
  );
}
