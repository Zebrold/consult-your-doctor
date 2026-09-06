import { createClient } from "@/lib/supabase/server";
import SearchClient from "@/components/SearchClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const type = typeof params.type === 'string' ? params.type : 'doctor';
  const q = typeof params.q === 'string' ? params.q.toLowerCase() : '';
  const specialty = typeof params.specialty === 'string' ? params.specialty : '';
  const city = typeof params.city === 'string' ? params.city : '';
  const hospitalId = typeof params.hospital_id === 'string' ? params.hospital_id : '';
  const testFilter = typeof params.test === 'string' ? params.test : '';

  // 1. Fetch cities for the filter (from hospitals)
  const { data: citiesData } = await supabase
    .from('hospitals')
    .select('city')
    .eq('status', 'active');
  const uniqueCities = Array.from(new Set(citiesData?.map(h => h.city) || []));

  // 2. Fetch hospitals
  const { data: hospitalsData } = await supabase
    .from('hospitals')
    .select('*')
    .eq('status', 'active');
  const hospitals = hospitalsData || [];

  // 2b. Fetch unique specialties for filter pills
  const { data: specialtiesData } = await supabase
    .from('doctors')
    .select('specialty');
  const uniqueSpecialties = Array.from(new Set(specialtiesData?.map(d => d.specialty).filter(Boolean) || []));

  // 2c. Fetch diagnostic centers
  const { data: diagCentersData } = await supabase
    .from('diagnostic_centers')
    .select('*')
    .eq('status', 'active');
  const diagnosticCenters = diagCentersData || [];

  // Extract unique cities from diagnostic centers
  const diagCities = Array.from(new Set(diagnosticCenters.map(c => c.city).filter(Boolean)));

  // Extract all unique test types across all centers
  const allTests: string[] = [];
  diagnosticCenters.forEach(center => {
    if (center.available_tests && Array.isArray(center.available_tests)) {
      center.available_tests.forEach((test: string) => {
        if (!allTests.includes(test)) allTests.push(test);
      });
    }
  });
  allTests.sort();

  // Filter diagnostic centers
  let filteredDiagCenters = diagnosticCenters;
  if (type === 'diagnostic') {
    filteredDiagCenters = diagnosticCenters.filter(center => {
      if (city && center.city !== city) return false;
      if (q && !center.name.toLowerCase().includes(q)) return false;
      if (testFilter && center.available_tests && !center.available_tests.some((t: string) => t.toLowerCase().replace(/ /g, '-') === testFilter)) return false;
      return true;
    });
  }

  let filteredHospitals = hospitals;
  if (type === 'hospital') {
    filteredHospitals = hospitals.filter(h => {
      if (city && h.city !== city) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // 3. Fetch doctors based on filters
  let query = supabase
    .from('doctors')
    .select('id, specialty, experience_years, hospital_id, image_url, profiles!inner(full_name), hospitals!inner(name, city)');

  if (specialty) {
    query = query.eq('specialty', specialty);
  }
  
  if (hospitalId) {
    query = query.eq('hospital_id', hospitalId);
  } else if (city) {
    query = query.eq('hospitals.city', city);
  }

  const { data: doctorsData, error } = await query;
  
  let doctors = (doctorsData || []).filter(doc => {
    if (city && doc.hospitals?.city !== city) return false;
    
    if (q) {
      const name = doc.profiles?.full_name?.toLowerCase() || '';
      const spec = doc.specialty?.toLowerCase() || '';
      if (!name.includes(q) && !spec.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return <SearchClient 
    type={type} 
    doctors={doctors} 
    cities={type === 'diagnostic' ? diagCities : uniqueCities} 
    hospitals={hospitals} 
    filteredHospitals={filteredHospitals}
    specialties={uniqueSpecialties}
    diagnosticCenters={filteredDiagCenters}
    allTests={allTests}
  />;
}
