import { jsonLd } from "@/lib/json-ld";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getBookingFees } from "@/lib/booking-fees";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { PatientDock } from "@/components/PatientDock";
import {
  DoctorProfileClient,
  ProfileDoctorData,
} from "@/components/DoctorProfileClient";
import { TopBar } from "@/components/portal/TopBar";
import { doctorName } from "@/components/patient/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEducation } from "@/lib/education";
import { loadDoctorReviews } from "@/lib/reviews";
import { currentTime } from "@/components/patient/data";
import { siteUrl } from "@/lib/site-url";
import { pausedDoctorIds } from "@/lib/doctor-pause";

export const revalidate = 0;

interface DoctorProfilePageProps {
  params: Promise<{ id: string }>;
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
    return { title: "Doctor Profile | Consult Your Doctor", robots: { index: false, follow: false } };
  }

  const profiles = doctor.profiles as { full_name?: string } | null;
  const departments = doctor.departments as { name?: string } | null;
  const name = profiles?.full_name || "Specialist Doctor";
  const spec = departments?.name || doctor.specialty || "Specialist";

  const title = `${name} - ${spec} | Consult Your Doctor`;
  const description = `See ${name}'s qualifications, consultation fee and open times (${spec}), and book a visit online.`;
  const url = `${siteUrl()}/doctors/${id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile" },
  };
}

export default async function DoctorProfilePage(props: DoctorProfilePageProps) {
  const { id } = await props.params;

  const supabase = await createClient();
  const user = await getSessionUser();
  const admin = createAdminClient();

  // Fetch full doctor data from DB. Registration, education and insurance arrive with the 20261009 migration.
  const selectDoctor = (withProfile: boolean) =>
    supabase
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
        ${withProfile ? "registration_number, registration_council, education, insurance_accepted," : ""}
        profiles!doctors_profile_id_fkey(full_name),
        hospitals(id, name, city, address, image_url, contact_email),
        departments(id, name)
      `)
      .eq("id", id)
      .maybeSingle();
  // Only times patients can still book: from now on and not taken. Past slots must never look bookable. Only the
  // doctor's own hospital's times here; hospitals they also visit list their slots on their own page (lib/practices.ts).
  const openSlots = (columns: string) =>
    supabase
      .from("schedules")
      .select(columns)
      .eq("doctor_id", id)
      .eq("is_booked", false)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true });

  // Everything that needs only the doctor's id, in one round (it used to be six rounds one after another).
  const [{ data: viewer }, firstDoctor, reviews, firstSlots, paused, { data: links }] = await Promise.all([
    // For the top bar: doctors open this page from their portal ("My public profile"); everyone else is a patient or visitor.
    user ? admin.from("profiles").select("full_name, email, role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    selectDoctor(true),
    // Reviews patients wrote after their visits (read on the server; only first names are shown).
    loadDoctorReviews(admin, id, 6),
    openSlots("id, start_time, end_time, is_booked, hospital_id"),
    pausedDoctorIds(),
    admin.from("doctor_practices").select("hospital_id").eq("doctor_id", id).eq("status", "confirmed").limit(20),
  ]);

  // Older databases lack some columns; then the same reads without them.
  let { data: doctor, error: doctorError } = firstDoctor;
  if (doctorError) ({ data: doctor, error: doctorError } = await selectDoctor(false));

  if (!doctor || doctorError) {
    notFound();
  }

  const doctorData: ProfileDoctorData = doctor as unknown as ProfileDoctorData;
  doctorData.education = parseEducation((doctor as { education?: unknown }).education);
  doctorData.reviews = reviews;

  const homeId = (doctor as { hospital_id?: string | null }).hospital_id ?? null;
  const alsoIds = ((links ?? []) as { hospital_id: string }[]).map((l) => l.hospital_id).filter((h) => h !== homeId);
  const [slotRows, { data: alsoRows }] = await Promise.all([
    (firstSlots.error ? openSlots("id, start_time, end_time, is_booked").then((r) => r.data) : Promise.resolve(firstSlots.data)) as Promise<unknown> as Promise<
      { id: string; start_time: string; end_time: string; is_booked: boolean; hospital_id?: string | null }[] | null
    >,
    alsoIds.length ? supabase.from("hospitals").select("id, name, city").in("id", alsoIds) : Promise.resolve({ data: [] }),
  ]);
  doctorData.schedules = (slotRows ?? []).filter((s) => !s.hospital_id || s.hospital_id === homeId);
  // A paused doctor stays reachable but shows no open times (the page's existing "no open times" state).
  if (paused.has(id)) doctorData.schedules = [];
  const alsoAt = (alsoRows ?? []) as { id: string; name: string; city: string | null }[];

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

  const isDoctor = viewer?.role === "doctor";
  const name = viewer?.full_name || user?.user_metadata?.full_name || null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      {/* Doctors open this page from their portal ("My public profile") and keep the portal's bar. */}
      {isDoctor && (
        <TopBar
          homeHref="/doctor/dashboard"
          section="Doctor Portal"
          person={{ name: doctorName(viewer.full_name), role: "Doctor" }}
          container="max-w-[1440px] px-margin-x-mobile lg:px-margin-x-desktop"
          className="hidden md:block"
        />
      )}
      <DoctorProfileClient
        doctor={doctorData}
        bookingFee={(await getBookingFees()).consultation}
        now={currentTime()}
        alsoAt={alsoAt}
        account={isDoctor ? null : { isSignedIn: !!user, name, email: viewer?.email || user?.email || null }}
      />
      {!isDoctor && (
        <PatientDock activeTab="find" isSignedIn={!!user} name={name} phoneBar={false} detail={user && (!viewer?.role || viewer.role === "patient") ? `UHID CYD-${user.id.slice(0, 8).toUpperCase()}` : null} />
      )}
    </>
  );
}
