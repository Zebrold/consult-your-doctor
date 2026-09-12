import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  FinalizeBookingClient,
  BookingDoctor,
  InitialPatientData,
} from "@/components/FinalizeBookingClient";
import { finalizeConsultationAppointment } from "@/app/actions/booking";

interface BookDoctorPageProps {
  params: Promise<{ doctorId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: BookDoctorPageProps): Promise<Metadata> {
  const { doctorId } = await params;
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("profiles!doctors_profile_id_fkey(full_name)")
    .eq("id", doctorId)
    .maybeSingle();

  const doctorProfile = doctor?.profiles as { full_name?: string } | null;
  const doctorName = doctorProfile?.full_name || "Specialist";

  return {
    title: `Book Consultation with ${doctorName} | Consult Your Doctor`,
    description: `Finalize consultation and secure appointment with ${doctorName}. ABDM M3 verified, instant confirmation.`,
  };
}

export default async function BookDoctorPage({
  params,
  searchParams,
}: BookDoctorPageProps) {
  const { doctorId } = await params;
  const sParams = await searchParams;
  const isPreview = sParams?.preview === "patient";

  const supabase = await createClient();

  // Fetch doctor data with profile and hospital relations
  const { data: doctor } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty,
      experience_years,
      consultation_fee,
      image_url,
      bio,
      qualifications,
      profiles!doctors_profile_id_fkey(full_name, email),
      hospitals(id, name, city, address, image_url)
    `)
    .eq("id", doctorId)
    .maybeSingle();

  if (!doctor && !isPreview) {
    notFound();
  }

  // Fallback doctor object if preview mode or doctor not found
  const doctorData: BookingDoctor = (doctor as unknown as BookingDoctor) || {
    id: doctorId,
    specialty: "Senior Cardiologist",
    experience_years: 14,
    consultation_fee: 150,
    image_url: null,
    bio: "Specialist in Preventive Cardiology & Arrhythmia Disorders",
    qualifications: "MD, FACC",
    profiles: {
      full_name: "Dr. Sarah Jenkins, MD, FACC",
      email: "sarah.jenkins@hospital.org",
    },
    hospitals: {
      id: "hospital-default",
      name: "City of Hope Medical Center",
      city: "New Delhi",
      address: "Pavilion 4, Suite 302",
      image_url: null,
    },
  };

  // Fetch upcoming schedules for doctor from start of today onwards
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, start_time, end_time, is_booked")
    .eq("doctor_id", doctorId)
    .gte("start_time", todayStart.toISOString())
    .order("start_time", { ascending: true });

  if (schedules) {
    doctorData.schedules = schedules;
  }

  // Fetch current user / patient details
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialPatient: InitialPatientData = {
    full_name: "",
    age: "",
    gender: "Male",
    phone: "",
    email: "",
  };

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, age, gender")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      initialPatient = {
        full_name: profile.full_name || "",
        age: profile.age || "",
        gender: profile.gender || "Male",
        phone: profile.phone || "",
        email: profile.email || user.email || "",
      };
    }
  }

  return (
    <FinalizeBookingClient
      doctor={doctorData}
      initialPatient={initialPatient}
      isUserLoggedIn={!!user}
      createAppointmentAction={finalizeConsultationAppointment}
      payuKey={process.env.PAYU_MERCHANT_KEY || "99eKD4"}
    />
  );
}
