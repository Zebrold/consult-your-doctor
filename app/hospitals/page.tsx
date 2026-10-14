import { jsonLd } from "@/lib/json-ld";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { MapPin, Building2, Phone, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { PatientDock } from "@/components/PatientDock";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top Hospitals & Medical Centers | Consult Your Doctor",
  description: "Discover top-rated hospitals and medical centers. View facilities, contact details, and book doctor consultations.",
};

export default async function HospitalsDirectoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  let viewer = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, email")
      .eq("id", user.id)
      .maybeSingle();
    viewer = profile;
  }
  const isLoggedIn = !!user;

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("*")
    .eq("status", "active")
    .limit(50);

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
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      {isLoggedIn ? (
        <PatientNavHeader
          isSignedIn={isLoggedIn}
          name={viewer?.full_name || user?.user_metadata?.full_name}
          email={viewer?.email || user?.email}
          container="max-w-7xl px-4 sm:px-6 lg:px-8"
          backHref="/"
          eyebrow="Hospitals"
          title="Best Hospitals & Medical Centers"
          subtitle={`${hospitals?.length ?? 0} partner ${hospitals?.length === 1 ? "hospital" : "hospitals"}`}
        />
      ) : (
        <Header />
      )}
      
      <main className={`flex-1 ${isLoggedIn ? 'pt-5 md:pt-8 pb-dock' : 'pt-[calc(var(--header-h)+2rem)] md:pt-[calc(var(--header-h)+3rem)] pb-12'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Signed-in patients have the title in the blue header. */}
          <div className={`${isLoggedIn ? 'hidden' : ''} text-center mb-8 md:mb-12`}>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-3 md:mb-4">
              Best Hospitals & Medical Centers
            </h1>
            <p className="text-base md:text-xl text-gray-600 max-w-2xl mx-auto">
              Browse world-class healthcare facilities and premium medical centers.
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-vibrant-blue transition-colors">{hospital.name}</h3>
                    
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
                    
                    <Link href={`/hospitals/${hospital.id}`} className="mt-auto flex items-center justify-between px-6 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-vibrant-blue hover:border-vibrant-blue hover:text-white transition-colors">
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
              <p className="text-gray-500">We couldn't find any registered hospitals yet.</p>
            </div>
          )}
        </div>
      </main>
      {isLoggedIn ? (
        <PatientDock activeTab="find" isSignedIn={isLoggedIn} name={viewer?.full_name || user?.user_metadata?.full_name} />
      ) : (
        <Footer />
      )}
    </div>
  );
}
