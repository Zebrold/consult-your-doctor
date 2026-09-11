import { createClient } from '@/lib/supabase/server';
import Image from "next/image";
import Link from "next/link";
import { ShieldPlus, Award, MonitorSmartphone, User, Building2, BriefcaseMedical, MapPin, Stethoscope, Info, Star, ClipboardList, ChevronRight, Heart, Brain, Bone, Baby, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { BookConsultationForm } from "@/components/BookConsultationForm";
import { FeaturedHospitalsClient } from "@/components/FeaturedHospitalsClient";
import QuickSearch from '@/components/QuickSearch';
import { PatientHome } from '@/components/PatientHome';

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isPreviewPatient = searchParams?.preview === "patient";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = p;
  }

  const isPatient =
    (user && (profile?.role === 'patient' || !profile?.role)) ||
    isPreviewPatient;

  if (isPatient) {
    // 1. Fetch real doctors from DB (limit to 7)
    const { data: dbDoctors } = await supabase
      .from('doctors')
      .select(`
        id,
        specialty,
        experience_years,
        consultation_fee,
        image_url,
        profiles!doctors_profile_id_fkey ( full_name ),
        hospitals ( id, name, city )
      `)
      .order('image_url', { ascending: false, nullsFirst: false })
      .limit(7);

    // 2. Fetch real hospitals from DB including attending doctors count
    const { data: dbHospitals } = await supabase
      .from('hospitals')
      .select(`
        id,
        name,
        city,
        address,
        image_url,
        status,
        doctors ( id )
      `)
      .eq('status', 'active')
      .order('image_url', { ascending: false, nullsFirst: false })
      .limit(7);

    // 3. Fetch real diagnostic centers from DB including available tests
    const { data: dbDiagnostics } = await supabase
      .from('diagnostic_centers')
      .select('id, name, city, address, image_url, status, available_tests')
      .eq('status', 'active')
      .order('image_url', { ascending: false, nullsFirst: false })
      .limit(3);

    // 4. Fetch all doctor specialties to compute dynamic doctor counts
    const { data: allDoctorSpecialties } = await supabase
      .from('doctors')
      .select('specialty');

    const specialtyCounts: Record<string, number> = {};
    allDoctorSpecialties?.forEach((d) => {
      if (d.specialty) {
        specialtyCounts[d.specialty] = (specialtyCounts[d.specialty] || 0) + 1;
      }
    });

    const badges = ["Today 2:30 PM", "Tomorrow", "Today 4:00 PM", "Video Now"];
    const badgeIcons = ["bolt", "calendar_today", "bolt", "videocam"];

    // Format 6-7 doctors strictly using DB images (null if not uploaded)
    const formattedDoctors = (dbDoctors || []).slice(0, 7).map((doc: any, i: number) => ({
      id: doc.id,
      name: doc.profiles?.full_name || "Specialist Doctor",
      specialty: doc.specialty || "Senior Clinician",
      hospital: `${doc.hospitals?.name || "Premier Healthcare Network"}${doc.hospitals?.city ? ` • ${doc.hospitals.city}` : ""} • ${doc.experience_years || 5} yrs exp`,
      hospitalCity: doc.hospitals?.city,
      experience_years: doc.experience_years || 5,
      fee: doc.consultation_fee ? `₹${doc.consultation_fee}` : "₹500",
      image: doc.image_url || null, // STRICTLY from DB
      rating: (4.8 + ((i % 3) * 0.1)).toFixed(1),
      reviews: String(90 + (i * 38)),
      badge: badges[i % badges.length],
      badgeIcon: badgeIcons[i % badgeIcons.length],
      badgeColor: i % 2 === 0 ? "text-secondary" : "text-indigo-gray-900",
    }));

    const facilityBadges = [
      { badge: "JCI Accredited", icon: "check_circle", color: "text-fresh-teal" },
      { badge: "NABH Accredited", icon: "emergency", color: "text-soft-coral" },
      { badge: "NABL Certified", icon: "biotech", color: "text-vibrant-blue" },
    ];

    // Combine hospitals and diagnostic centers up to 7 items with exact DB counts
    const allFacilities = [
      ...(dbHospitals || []).map((h: any) => ({
        ...h,
        type: "hospital" as const,
        doctorCount: Array.isArray(h.doctors) ? h.doctors.length : 0,
      })),
      ...(dbDiagnostics || []).map((d: any) => ({
        ...d,
        type: "diagnostic" as const,
        testCount: Array.isArray(d.available_tests) ? d.available_tests.length : 0,
      })),
    ].slice(0, 7);

    const formattedFacilities = allFacilities.map((fac: any, i: number) => {
      // Calculate exact count fetched from DB
      const doctorCountText = fac.type === "diagnostic"
        ? (fac.testCount > 0 ? `${fac.testCount} Available Tests` : "Diagnostic Hub")
        : (fac.doctorCount === 1 ? "1 Attending Doctor" : `${fac.doctorCount} Attending Doctors`);

      return {
        id: fac.id,
        name: fac.name,
        city: fac.city,
        location: `${fac.city || "Metro Center"} • Open 24/7`,
        rating: (4.8 + ((i % 2) * 0.1)).toFixed(1),
        badge: facilityBadges[i % facilityBadges.length].badge,
        badgeIcon: facilityBadges[i % facilityBadges.length].icon,
        badgeColor: facilityBadges[i % facilityBadges.length].color,
        doctors: doctorCountText, // FETCHED DIRECTLY FROM THE DB!
        desc: fac.address
          ? `Comprehensive inpatient, outpatient, and surgical wings located at ${fac.address}.`
          : "Comprehensive inpatient, outpatient, and emergency surgery wings with dedicated clinical staff.",
        image: fac.image_url || null, // STRICTLY from DB
        type: fac.type,
      };
    });

    // Specialties meta mapping
    const specialtyMetaList = [
      { title: "Cardiology", desc: "Heart, circulation & lipids", icon: "favorite" },
      { title: "Neurology", desc: "Brain, nerves & spine care", icon: "psychology" },
      { title: "Pediatrics", desc: "Infant & youth healthcare", icon: "child_care" },
      { title: "Ophthalmology", desc: "Vision, cornea & eye health", icon: "visibility" },
      { title: "Orthopaedics", desc: "Bones, joints & ligaments", icon: "orthopedics" },
      { title: "Dermatology", desc: "Skin, allergies & cosmetic", icon: "health_and_safety" },
      { title: "General Medicine", desc: "Primary adult preventative care", icon: "medical_services" },
      { title: "General Surgery", desc: "Minimally invasive & trauma", icon: "precision_manufacturing" },
    ];

    const formattedSpecialties = specialtyMetaList.map((spec) => {
      const count = specialtyCounts[spec.title] || (spec.title === "Orthopaedics" ? specialtyCounts["Orthopedics"] : 0) || (Math.floor(Math.random() * 30) + 40);
      return {
        ...spec,
        count: `${count} Docs`,
      };
    });

    // Extract all unique cities from hospitals and diagnostic centers
    const dbCities = [
      ...new Set([
        ...(dbHospitals?.map((h) => h.city) || []),
        ...(dbDiagnostics?.map((d) => d.city) || []),
      ]),
    ].filter(Boolean) as string[];

    const citiesList = dbCities.length > 0 ? dbCities : ["Mumbai", "New Delhi", "Bengaluru", "Chennai"];

    return (
      <PatientHome
        user={user}
        profile={profile}
        doctors={formattedDoctors}
        hospitals={formattedFacilities}
        specialties={formattedSpecialties}
        cities={citiesList}
      />
    );
  }

  // Fetch top 3 doctors
  const { data: topDoctors, error: doctorsError } = await supabase
    .from('doctors')
    .select(`
      id,
      specialty,
      experience_years,
      profiles!doctors_profile_id_fkey ( full_name ),
      hospitals ( name, city )
    `)
    .limit(3);

  // Fetch 4 featured hospitals
  const { data: featuredHospitals } = await supabase
    .from('hospitals')
    .select('id, name, city, image_url')
    .limit(8); // Fetching 8 to allow scrolling

  return (
    <>
      <ScrollReveal />

      {/* Hero Section */}
      <section className="px-4 md:px-margin-x-desktop py-16 md:py-20 max-w-container-max mx-auto overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 reveal-up">
            <h1 className="font-display-lg text-4xl md:text-display-lg text-on-surface leading-tight">
              World-Class Healthcare, <br />{" "}
              <span className="text-vibrant-blue">Delivered Quietly.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
              Experience a new standard of medical consultation. Connect with top-tier specialists, book instantly, and manage your health journey with unparalleled precision.
            </p>
            <div className="pt-6 space-y-6">
              <h3 className="font-title-md text-title-md text-primary">Uncompromising Standards of Care</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <ShieldPlus className="text-vibrant-blue mt-1 w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-title-md text-base text-on-surface font-semibold">Personalized Care Plans</p>
                    <p className="font-body-md text-sm text-on-surface-variant">Tailored healthcare strategies designed specifically for your unique medical history and lifestyle.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Award className="text-vibrant-blue mt-1 w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-title-md text-base text-on-surface font-semibold">Top 1% Global Specialists</p>
                    <p className="font-body-md text-sm text-on-surface-variant">Access a vetted network of internationally renowned medical professionals and surgeons.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MonitorSmartphone className="text-vibrant-blue mt-1 w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-title-md text-base text-on-surface font-semibold">24/7 Digital Health Access</p>
                    <p className="font-body-md text-sm text-on-surface-variant">Seamlessly manage appointments, records, and consultations from any device, anywhere.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div className="reveal-up delay-200">
            <BookConsultationForm />
          </div>
        </div>
      </section>

      {/* Patient Testimonials / Search Quick Links */}
      <section className="py-16 px-4 md:px-margin-x-desktop bg-white border-b border-surface-variant">
        <div className="max-w-container-max mx-auto reveal-up">
          <QuickSearch />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 md:px-margin-x-desktop bg-surface-container-lowest border-y border-surface-variant">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Stethoscope className="text-vibrant-blue w-10 h-10 flex-shrink-0" />
              <span className="font-display-lg text-xl text-primary tracking-tight">Consult your Doctor</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-surface-container-low rounded-2xl border border-surface-variant">
              <span className="font-display-lg text-3xl font-extrabold text-primary mb-1">60,000</span>
              <span className="text-sm text-on-surface-variant font-medium flex items-center gap-1">people getting better care</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-surface-container-low rounded-2xl border border-surface-variant">
              <span className="font-display-lg text-3xl font-extrabold text-primary mb-1">1,700</span>
              <span className="text-sm text-on-surface-variant font-medium flex items-center gap-1">health professionals</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-surface-container-low rounded-2xl border border-surface-variant">
              <span className="font-display-lg text-3xl font-extrabold text-primary mb-1">30,000</span>
              <span className="text-sm text-on-surface-variant font-medium flex items-center gap-1">people cured using AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rated Doctors Section */}
      <section className="py-24 px-4 md:px-margin-x-desktop bg-surface">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-12">
            <div>
              <h2 className="font-headline-lg text-2xl md:text-headline-lg text-primary font-bold">Top Rated Doctors</h2>
              <p className="font-body-md text-on-surface-variant max-w-2xl">Book appointments with some of our most highly-rated and experienced medical professionals.</p>
            </div>
            <Link href="/search?type=doctor" className="text-vibrant-blue font-bold text-sm hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap">
              View All Doctors <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {topDoctors?.map((doctor, idx) => {
              const profile = doctor.profiles as any;
              const hospital = doctor.hospitals as any;

              return (
                <div key={doctor.id} className={`h-full bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col reveal-up delay-${idx * 100}`}>
                  <div className="aspect-[16/9] w-full relative bg-surface-variant flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img alt={profile?.full_name} className="w-full h-full object-cover" src={profile.avatar_url} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-gray-100">
                        <User className="w-16 h-16 text-indigo-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-grow flex flex-col min-w-0">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-title-md text-on-surface truncate w-full" title={profile?.full_name}>{profile?.full_name || "Unknown Doctor"}</h3>
                        <p className="text-vibrant-blue font-medium text-sm mt-1 truncate w-full" title={doctor.specialty}>{doctor.specialty || "General Specialist"}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-primary flex-shrink-0">
                        <Star className="w-4 h-4 text-fresh-teal" />
                        <span className="text-sm font-medium">4.9</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant min-w-0">
                        <ClipboardList className="w-5 h-5 text-vibrant-blue flex-shrink-0" />
                        <span className="truncate">{doctor.experience_years || 5}+ Years Experience</span>
                      </div>
                      {hospital && (
                        <div className="flex items-center gap-2 text-sm text-on-surface-variant min-w-0">
                          <MapPin className="w-5 h-5 text-vibrant-blue flex-shrink-0" />
                          <span className="truncate w-full" title={`${hospital.name} ${hospital.city ? `, ${hospital.city}` : ''}`}>{hospital.name} {hospital.city && `, ${hospital.city}`}</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/doctors/${doctor.id}`} className="mt-auto text-center block w-full bg-surface-container-low text-primary border border-surface-variant py-3 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold flex-shrink-0">
                      Book Appointment
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Specialities */}
      <section className="py-16 px-4 md:px-margin-x-desktop bg-surface">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-8">
            <h2 className="font-headline-lg text-2xl md:text-headline-lg text-primary font-bold">Popular Specialities</h2>
            <Link href="/search?type=doctor" className="text-vibrant-blue font-bold text-sm hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap">
              View All Specialities <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { icon: Heart, label: "Cardiology" },
              { icon: Brain, label: "Neurology" },
              { icon: Bone, label: "Orthopaedics" },
              { icon: BriefcaseMedical, label: "General Med" },
              { icon: Baby, label: "Pediatrics" },
              { icon: Sparkles, label: "Dermatology" },
              { icon: Baby, label: "Gynecology" }, // Added to match previous UI items
            ].map((spec, i) => (
              <Link key={i} href={`/search?type=doctor&specialty=${spec.label}`} className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
                <spec.icon className="w-8 h-8 md:w-10 md:h-10 text-vibrant-blue mb-3" />
                <span className="font-title-md text-xs md:text-sm text-on-surface">{spec.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Hospitals Section */}
      <FeaturedHospitalsClient hospitals={featuredHospitals || []} />
    </>
  );
}
