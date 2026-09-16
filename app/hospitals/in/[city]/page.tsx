import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { MapPin, Building2, Phone, Mail, ArrowRight } from "lucide-react";
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
    title: `Best Hospitals in ${capitalizedCity} | Consult Your Doctor`,
    description: `Discover top-rated hospitals and medical centers in ${capitalizedCity}. View facilities, contact details, and book doctor consultations.`,
  };
}

export default async function HospitalsInCityPage(props: Props) {
  const { city } = await props.params;
  const decodedCity = decodeURIComponent(city);
  const capitalizedCity = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1);

  const supabase = await createClient();

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("*")
    .ilike("city", `%${decodedCity}%`)
    .eq("status", "active");

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": (hospitals || []).map((hosp, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/hospitals/${hosp.id}`
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
              Best Hospitals in {capitalizedCity}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Browse world-class healthcare facilities and premium medical centers located in {capitalizedCity}.
            </p>
          </div>

          {hospitals && hospitals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {hospitals.map((hospital: any) => (
                <div key={hospital.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row group">
                  <div className="w-full sm:w-48 h-48 bg-gray-100 shrink-0 relative overflow-hidden">
                    {hospital.image_url ? (
                      <Image src={hospital.image_url} alt={hospital.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Building2 className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#E31E24] transition-colors">{hospital.name}</h3>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{[hospital.address, hospital.city, hospital.state].filter(Boolean).join(', ')}</span>
                      </div>
                      
                      {hospital.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{hospital.contact_phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <Link href={`/hospitals/${hospital.id}`} className="mt-auto flex items-center justify-between px-6 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-[#E31E24] hover:border-[#E31E24] hover:text-white transition-colors">
                      <span>View Hospital Profile</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Hospitals Found</h2>
              <p className="text-gray-500">We couldn't find any registered hospitals in {capitalizedCity} yet.</p>
              <Link href="/hospitals" className="mt-6 inline-block px-6 py-3 bg-[#E31E24] text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                View All Hospitals
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
