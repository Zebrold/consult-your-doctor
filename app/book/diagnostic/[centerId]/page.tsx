import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { DiagnosticBookingClient } from "@/components/DiagnosticBookingClient";
import { currentTime, loadPatientDefaults } from "@/components/patient/data";
import { pricedTests } from "@/lib/pricing";

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

  const [{ data: center }, patient] = await Promise.all([
    supabase.from("diagnostic_centers").select("id, name, city, address, image_url, test_prices").eq("id", centerId).maybeSingle(),
    loadPatientDefaults(supabase),
  ]);
  if (!center) notFound();

  return (
    <DiagnosticBookingClient
      center={{ id: center.id, name: center.name, city: center.city, address: center.address, image: center.image_url }}
      tests={pricedTests(center.test_prices)}
      patient={patient}
      now={currentTime()}
      payuKey={process.env.PAYU_MERCHANT_KEY || "99eKD4"}
    />
  );
}
