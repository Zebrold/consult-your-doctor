import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, ArrowRight, Microscope } from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/Header";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top Diagnostic Centers & Labs | Consult Your Doctor",
  description: "Find the best diagnostic centers for MRI, CT Scans, Blood Tests, and more. Compare centers and book your tests.",
};

export default async function DiagnosticsDirectoryPage() {
  const supabase = await createClient();

  const { data: diagnosticCenters } = await supabase
    .from("diagnostic_centers")
    .select("*")
    .eq("status", "active")
    .limit(50);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": (diagnosticCenters || []).map((center, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/search?type=diagnostic&city=${encodeURIComponent(center.city || '')}`
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
              Top Diagnostic Centers & Labs
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find the best diagnostic centers for MRI, CT Scans, Blood Tests, and more.
            </p>
          </div>

          {diagnosticCenters && diagnosticCenters.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {diagnosticCenters.map((center: any) => (
                <div key={center.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row group">
                  <div className="w-full sm:w-48 h-48 bg-gray-100 shrink-0 relative overflow-hidden">
                    {center.image_url ? (
                      <Image src={center.image_url} alt={center.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Microscope className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#E31E24] transition-colors">{center.name}</h3>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{[center.address, center.city, center.state].filter(Boolean).join(', ')}</span>
                      </div>
                      
                      {center.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{center.contact_phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {Array.isArray(center.available_tests) && center.available_tests.slice(0, 3).map((test: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">{test}</span>
                      ))}
                      {Array.isArray(center.available_tests) && center.available_tests.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">+{center.available_tests.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Microscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Diagnostic Centers Found</h2>
              <p className="text-gray-500">We couldn't find any registered diagnostic centers yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
