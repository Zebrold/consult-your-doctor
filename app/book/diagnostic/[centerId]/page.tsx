import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { DiagnosticBookingClient } from "@/components/DiagnosticBookingClient";
import { currentTime, loadPatientDefaults } from "@/components/patient/data";
import { labDoorstepFee, pricedTests } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";

interface DiagnosticBookingPageProps {
  params: Promise<{ centerId: string }>;
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

export default async function DiagnosticBookingPage({ params }: DiagnosticBookingPageProps) {
  const { centerId } = await params;
  const supabase = await createClient();

  const [{ data: center }, patient, fees] = await Promise.all([
    supabase.from("diagnostic_centers").select("id, name, city, address, image_url, test_prices, doorstep_enabled, doorstep_fee").eq("id", centerId).maybeSingle(),
    loadPatientDefaults(supabase),
    getBookingFees(),
  ]);
  if (!center) notFound();

  return (
    <DiagnosticBookingClient
      center={{
        id: center.id,
        name: center.name,
        city: center.city,
        address: center.address,
        image: center.image_url,
        doorstepEnabled: (center as any).doorstep_enabled !== false,
        doorstepFee: labDoorstepFee(center),
      }}
      tests={pricedTests(center.test_prices)}
      patient={patient}
      now={currentTime()}
      bookingFeePercent={fees.diagnosticPercent}
      payuKey={process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY || "jwoG24"}
    />
  );
}
