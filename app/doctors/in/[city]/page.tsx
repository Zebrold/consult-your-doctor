import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { MapPin, UserCircle, CheckCircle2, Building2 } from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/Header";

export const revalidate = 0;

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { city } = await props.params;
  const decodedCity = decodeURIComponent(city);
  const capitalizedCity = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1);

  return {
    title: `Top Doctors in ${capitalizedCity} | Consult Your Doctor`,
    description: `Find and book appointments with the best specialist doctors in ${capitalizedCity}. View fees, experience, and patient reviews.`,
  };
}

export default async function DoctorsInCityPage(props: Props) {
  const { city } = await props.params;
  const decodedCity = decodeURIComponent(city);
  const capitalizedCity = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1);

  const supabase = await createClient();

  const { data: doctors } = await supabase
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
    .ilike("hospitals.city", `%${decodedCity}%`);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": (doctors || []).map((doc, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/doctors/${doc.id}`
    }))
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Header />
      
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
              Top Specialist Doctors in {capitalizedCity}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Book appointments with highly rated doctors practicing at premium hospitals and clinics across {capitalizedCity}.
            </p>
          </div>

          {doctors && doctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {doctors.map((item: any) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex gap-4 mb-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.profiles?.full_name || "Doctor"} fill className="object-cover" />
                      ) : (
                        <UserCircle className="w-10 h-10 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1" title={item.profiles?.full_name}>{item.profiles?.full_name}</h3>
                      <p className="text-sm text-[#E31E24] font-medium mb-1 line-clamp-1">{item.departments?.name || item.specialty}</p>
                      <p className="text-xs text-gray-600">{item.experience_years} Years Experience</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="leading-tight line-clamp-1">{item.hospitals?.name}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item.hospitals?.city}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold text-gray-900">₹{item.consultation_fee} Fee</span>
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Available</span>
                    </div>
                  </div>
                  
                  <Link href={`/doctors/${item.id}`} className="mt-auto w-full py-2.5 bg-white border-2 border-gray-200 text-gray-700 text-sm font-bold hover:border-[#E31E24] hover:text-[#E31E24] transition-colors rounded-full text-center">
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Doctors Found</h2>
              <p className="text-gray-500">We couldn't find any registered doctors in {capitalizedCity} yet.</p>
              <Link href="/doctors" className="mt-6 inline-block px-6 py-3 bg-[#E31E24] text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                View All Doctors
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
