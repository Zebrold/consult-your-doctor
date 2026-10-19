import { jsonLd } from "@/lib/json-ld";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { PatientDock } from "@/components/PatientDock";
import { PatientFooter } from "@/components/AppFooter";
import { DoctorsDirectoryClient, DirectoryDoctor } from "@/components/DoctorsDirectoryClient";
import { doctorName } from "@/components/patient/format";
import { getBookingFees } from "@/lib/booking-fees";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top Doctors & Medical Specialists | Consult Your Doctor",
  description: "Browse our comprehensive directory of top-rated doctors and medical specialists. Book consultations and view patient reviews.",
};

type Joined<T> = T | T[] | null;
type RawDoctor = {
  id: string;
  specialty: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  image_url: string | null;
  profiles: Joined<{ full_name: string | null }>;
  hospitals: Joined<{ name: string | null; city: string | null; address: string | null }>;
  departments: Joined<{ name: string | null }>;
};

const one = <T,>(v: Joined<T>) => (Array.isArray(v) ? v[0] ?? null : v);

export default async function DoctorsDirectoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  let viewer = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, email")
      .eq("id", user.id)
      .maybeSingle();
    viewer = profile;
  }
  const isLoggedIn = !!user;

  const { data: rawDoctors } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty,
      experience_years,
      consultation_fee,
      image_url,
      profiles!inner(full_name),
      hospitals!inner(name, city, address),
      departments(name)
    `)
    .limit(100);

  const doctors: DirectoryDoctor[] = ((rawDoctors ?? []) as unknown as RawDoctor[]).map((d) => {
    const profile = one(d.profiles);
    const hospital = one(d.hospitals);
    const department = one(d.departments);
    return {
      id: d.id,
      name: doctorName(profile?.full_name),
      specialty: department?.name || d.specialty || null,
      experienceYears: d.experience_years,
      bookable: Number(d.consultation_fee) > 0,
      image: d.image_url,
      hospital: hospital?.name || null,
      city: hospital?.city || null,
      address: hospital?.address || null,
    };
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": doctors.map((doc, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/doctors/${doc.id}`,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      {isLoggedIn ? (
        <PatientNavHeader
          isSignedIn={isLoggedIn}
          name={viewer?.full_name || user?.user_metadata?.full_name}
          email={viewer?.email || user?.email}
          container="max-w-7xl px-4 sm:px-6 lg:px-8"
        />
      ) : (
        <Header />
      )}

      <main className="flex-1 pt-[calc(var(--header-h)+2rem)] md:pt-[calc(var(--header-h)+3rem)] pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-sm font-semibold text-vibrant-blue mb-2">Medical Specialists</p>
            <h1 className="font-display-lg text-3xl md:text-5xl font-bold tracking-tight text-indigo-gray-900 mb-3 md:mb-4">
              Find the Right Doctor
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Browse verified specialists across partner hospitals. See where they practise and book a visit online for a flat booking fee.
            </p>
          </div>

          <DoctorsDirectoryClient doctors={doctors} bookingFee={(await getBookingFees()).consultation} />
        </div>
      </main>

      {isLoggedIn ? (
        <>
          <PatientFooter isSignedIn />
          <PatientDock activeTab="find" isSignedIn={isLoggedIn} name={viewer?.full_name || user?.user_metadata?.full_name} />
        </>
      ) : (
        <Footer />
      )}
    </div>
  );
}
