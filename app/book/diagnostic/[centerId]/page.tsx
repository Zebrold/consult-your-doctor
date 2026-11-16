import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { DiagnosticBookingClient } from "@/components/DiagnosticBookingClient";
import { currentTime, loadPatientDefaults } from "@/components/patient/data";
import { labDoorstepFee, pricedTests } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";

interface DiagnosticBookingPageProps {
  params: Promise<{ centerId: string }>;
  /** ?test=<name> (repeatable) starts with those tests picked; ?home=1 with home sample collection. */
  searchParams: Promise<{ test?: string | string[]; home?: string }>;
}

export async function generateMetadata({ params }: DiagnosticBookingPageProps): Promise<Metadata> {
  const { centerId } = await params;
  const supabase = await createClient();
  const { data: center } = await supabase.from("diagnostic_centers").select("name").eq("id", centerId).maybeSingle();
  const centerName = center?.name || "Diagnostic Lab";
  return {
    title: `Book a Lab Test at ${centerName} | Consult Your Doctor`,
    description: `Choose tests, pick a visit date and book at ${centerName}.`,
  };
}

/** The columns this page reads; the doorstep ones are missing until their migration is applied. */
type CenterRow = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image_url: string | null;
  test_prices: Record<string, number | string> | null;
  doorstep_enabled?: boolean | null;
  doorstep_fee?: number | string | null;
};

export default async function DiagnosticBookingPage({ params, searchParams }: DiagnosticBookingPageProps) {
  const { centerId } = await params;
  const query = await searchParams;
  const initialTests = (Array.isArray(query.test) ? query.test : query.test ? [query.test] : []).slice(0, 10);
  const supabase = await createClient();

  // The lab (with the doorstep columns; on an older database without them, the core fields), the patient's details and
  // the fees, in one round.
  let center: CenterRow | null = null;
  const [{ data: centerFull, error: centerErr }, patient, fees] = await Promise.all([
    supabase
      .from("diagnostic_centers")
      .select("id, name, city, address, image_url, test_prices, doorstep_enabled, doorstep_fee")
      .eq("id", centerId)
      .maybeSingle(),
    loadPatientDefaults(supabase, createAdminClient()),
    getBookingFees(),
  ]);

  if (!centerErr && centerFull) {
    center = centerFull;
  } else {
    const { data: centerBasic } = await supabase
      .from("diagnostic_centers")
      .select("id, name, city, address, image_url, test_prices")
      .eq("id", centerId)
      .maybeSingle();
    center = centerBasic;
  }

  if (!center) notFound();

  return (
    <DiagnosticBookingClient
      center={{
        id: center.id,
        name: center.name,
        city: center.city,
        address: center.address,
        image: center.image_url,
        doorstepEnabled: center.doorstep_enabled !== false,
        doorstepFee: labDoorstepFee(center),
      }}
      tests={pricedTests(center.test_prices)}
      patient={patient}
      now={currentTime()}
      bookingFeePercent={fees.diagnosticPercent}
      conveniencePercent={fees.conveniencePercent}
      initialTests={initialTests}
      initialDoorstep={query.home === "1"}
    />
  );
}
