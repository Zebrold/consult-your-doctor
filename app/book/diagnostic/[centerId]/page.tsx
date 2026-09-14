import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import {
  DiagnosticBookingClient,
  DiagnosticCenterData,
  InitialPatientData,
} from "@/components/DiagnosticBookingClient";
import { createDiagnosticBooking } from "@/app/actions/booking";

interface DiagnosticBookingPageProps {
  params: Promise<{ centerId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: DiagnosticBookingPageProps): Promise<Metadata> {
  const { centerId } = await params;
  const supabase = await createClient();

  const { data: center } = await supabase
    .from("diagnostic_centers")
    .select("name")
    .eq("id", centerId)
    .maybeSingle();

  const centerName = center?.name || "Apex Diagnostics & Imaging";

  return {
    title: `Book Consultation | ${centerName} - Consult Your Doctor`,
    description: `Book diagnostic tests and appointments at ${centerName}. NABL & ICMR accredited.`,
  };
}

export default async function DiagnosticBookingPage({
  params,
  searchParams,
}: DiagnosticBookingPageProps) {
  const { centerId } = await params;
  const sParams = await searchParams;
  const isPreview = sParams?.preview === "patient";

  const supabase = await createClient();

  // 1. Fetch Diagnostic Center from DB
  const { data: center } = await supabase
    .from("diagnostic_centers")
    .select(`
      id,
      name,
      city,
      address,
      image_url,
      available_tests,
      test_prices
    `)
    .eq("id", centerId)
    .maybeSingle();

  // Center fallback if centerId is preview/mock
  const centerData: DiagnosticCenterData = center || {
    id: centerId || "apex-diagnostics",
    name: "Apex Diagnostics & Imaging",
    city: "Downtown Metro",
    address: "Pathology & Radiology Hub, Suite 402",
    image_url: null,
    available_tests: [
      "Complete Blood Count (CBC)",
      "Lipid Profile & Liver Function [LFT]",
      "Thyroid Profile (Total T3, T4, TSH)",
      "HbA1c & Fasting Blood Glucose",
    ],
    test_prices: {
      "Complete Blood Count (CBC)": 25,
      "Lipid Profile & Liver Function [LFT]": 55,
      "Thyroid Profile (Total T3, T4, TSH)": 35,
      "HbA1c & Fasting Blood Glucose": 20,
    },
  };

  // 2. Fetch User Profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialPatient: InitialPatientData = {
    full_name: "Alex Morgan",
    age: "28",
    gender: "Male",
    phone: "",
    email: "alex.morgan@example.com",
  };

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, age, gender")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      initialPatient = {
        full_name: profile.full_name || initialPatient.full_name,
        age: profile.age ? String(profile.age) : initialPatient.age,
        gender: profile.gender || initialPatient.gender,
        phone: profile.phone || "",
        email: profile.email || user.email || initialPatient.email,
      };
    }
  }

  return (
    <DiagnosticBookingClient
      center={centerData}
      initialPatient={initialPatient}
      isUserLoggedIn={!!user}
      createBookingAction={createDiagnosticBooking}
      payuKey={process.env.PAYU_MERCHANT_KEY || "99eKD4"}
    />
  );
}
