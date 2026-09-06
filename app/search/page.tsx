import { createClient } from "@/lib/supabase/server";
import SearchClient from "@/components/SearchClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const type =
    typeof params.type === "string" ? params.type : "doctor";

  const q =
    typeof params.q === "string"
      ? params.q.toLowerCase()
      : "";

  const specialty =
    typeof params.specialty === "string"
      ? params.specialty
      : "";

  const city =
    typeof params.city === "string"
      ? params.city
      : "";

  const hospitalId =
    typeof params.hospital_id === "string"
      ? params.hospital_id
      : "";

  const testFilter =
    typeof params.test === "string"
      ? params.test
      : "";

  // 1. Fetch hospital cities
  const { data: citiesData } = await supabase
    .from("hospitals")
    .select("city")
    .eq("status", "active");

  const uniqueCities = Array.from(
    new Set(
      (citiesData || [])
        .map((hospital) => hospital.city)
        .filter(Boolean)
    )
  );

  // 2. Fetch hospitals
  const { data: hospitalsData } = await supabase
    .from("hospitals")
    .select("*")
    .eq("status", "active");

  const hospitals = hospitalsData || [];

  // 3. Fetch specialties
  const { data: specialtiesData } = await supabase
    .from("doctors")
    .select("specialty");

  const uniqueSpecialties = Array.from(
    new Set(
      (specialtiesData || [])
        .map((doctor) => doctor.specialty)
        .filter(Boolean)
    )
  );

  // 4. Fetch diagnostic centers
  const { data: diagCentersData } = await supabase
    .from("diagnostic_centers")
    .select("*")
    .eq("status", "active");

  const diagnosticCenters = diagCentersData || [];

  // Diagnostic center cities
  const diagCities = Array.from(
    new Set(
      diagnosticCenters
        .map((center) => center.city)
        .filter(Boolean)
    )
  );

  // All diagnostic tests
  const allTests: string[] = [];

  diagnosticCenters.forEach((center) => {
    if (Array.isArray(center.available_tests)) {
      center.available_tests.forEach((test: string) => {
        if (!allTests.includes(test)) {
          allTests.push(test);
        }
      });
    }
  });

  allTests.sort();

  // 5. Filter diagnostic centers
  let filteredDiagCenters = diagnosticCenters;

  if (type === "diagnostic") {
    filteredDiagCenters = diagnosticCenters.filter((center) => {
      if (city && center.city !== city) {
        return false;
      }

      if (
        q &&
        !center.name?.toLowerCase().includes(q)
      ) {
        return false;
      }

      if (
        testFilter &&
        Array.isArray(center.available_tests) &&
        !center.available_tests.some(
          (test: string) =>
            test
              .toLowerCase()
              .replace(/\s+/g, "-") === testFilter.toLowerCase()
        )
      ) {
        return false;
      }

      return true;
    });
  }

  // 6. Filter hospitals
  let filteredHospitals = hospitals;

  if (type === "hospital") {
    filteredHospitals = hospitals.filter((hospital) => {
      if (city && hospital.city !== city) {
        return false;
      }

      if (
        q &&
        !hospital.name?.toLowerCase().includes(q)
      ) {
        return false;
      }

      return true;
    });
  }

  // 7. Fetch doctors
  let doctorsQuery = supabase
    .from("doctors")
    .select(`
      id,
      specialty,
      experience_years,
      hospital_id,
      image_url,
      profiles!inner(
        full_name
      ),
      hospitals!inner(
        name,
        city
      )
    `);

  if (specialty) {
    doctorsQuery = doctorsQuery.eq(
      "specialty",
      specialty
    );
  }

  if (hospitalId) {
    doctorsQuery = doctorsQuery.eq(
      "hospital_id",
      hospitalId
    );
  } else if (city) {
    doctorsQuery = doctorsQuery.eq(
      "hospitals.city",
      city
    );
  }

  const {
    data: doctorsData,
    error: doctorsError,
  } = await doctorsQuery;

  if (doctorsError) {
    console.error(
      "Failed to fetch doctors:",
      doctorsError
    );
  }

  // Supabase may infer joined relations as arrays.
  // Normalize them into single objects before passing
  // the data to SearchClient.
  const doctors = (doctorsData || [])
    .map((doctor) => ({
      ...doctor,

      profiles: Array.isArray(doctor.profiles)
        ? doctor.profiles[0] ?? null
        : doctor.profiles,

      hospitals: Array.isArray(doctor.hospitals)
        ? doctor.hospitals[0] ?? null
        : doctor.hospitals,
    }))
    .filter((doctor) => {
      if (
        city &&
        doctor.hospitals?.city !== city
      ) {
        return false;
      }

      if (q) {
        const name =
          doctor.profiles?.full_name?.toLowerCase() ||
          "";

        const spec =
          doctor.specialty?.toLowerCase() || "";

        if (
          !name.includes(q) &&
          !spec.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });

  return (
    <SearchClient
      type={type}
      doctors={doctors}
      cities={
        type === "diagnostic"
          ? diagCities
          : uniqueCities
      }
      hospitals={hospitals}
      filteredHospitals={filteredHospitals}
      specialties={uniqueSpecialties}
      diagnosticCenters={filteredDiagCenters}
      allTests={allTests}
    />
  );
}