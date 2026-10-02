import { createClient } from "@/lib/supabase/server";
import { FindCareClient, type FindDoctor } from "@/components/FindCareClient";
import { currentTime, loadAvailability, one } from "@/components/patient/data";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Doctors & Specialists | Consult Your Doctor",
  description: "Search verified doctors by specialty and city, see their next open appointment slot, and book a visit.",
};

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

export default async function FindPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = (await props.searchParams) ?? {};
  const param = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  const supabase = await createClient();
  const now = currentTime();

  const [{ data: dbDoctors, error }, availability, { data: { user } }] = await Promise.all([
    supabase
      .from("doctors")
      .select(`
        id, specialty, experience_years, consultation_fee, image_url, qualifications,
        profiles!doctors_profile_id_fkey ( full_name ),
        hospitals ( id, name, city, address )
      `),
    loadAvailability(supabase, now),
    supabase.auth.getUser(),
  ]);

  if (error) {
    console.error("Error fetching doctors in /find:", error);
  }

  let profileName: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    profileName = profile?.full_name ?? user.user_metadata?.full_name ?? null;
  }

  const doctors: FindDoctor[] = ((dbDoctors ?? []) as DoctorRow[]).map((d) => ({
    id: d.id,
    name: one(d.profiles)?.full_name ?? null,
    specialty: d.specialty,
    qualifications: d.qualifications,
    experience: d.experience_years,
    fee: d.consultation_fee,
    image: d.image_url,
    hospital: one(d.hospitals),
    nextSlot: availability[d.id]?.nextSlot ?? null,
    openToday: availability[d.id]?.openToday ?? 0,
  }));

  return (
    <FindCareClient
      doctors={doctors}
      now={now}
      initial={{ q: param("q"), specialty: param("specialty"), city: param("city"), availableToday: param("available") === "today" }}
      account={{ isSignedIn: !!user, name: profileName, email: user?.email ?? null }}
    />
  );
}
