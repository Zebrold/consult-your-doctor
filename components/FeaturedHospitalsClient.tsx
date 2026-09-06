"use client";

import { ChevronLeft, ChevronRight, MapPin, Building2 } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";

export function FeaturedHospitalsClient({ hospitals }: { hospitals: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-24 px-4 md:px-margin-x-desktop bg-surface">
      <div className="max-w-container-max mx-auto reveal-up">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <h2 className="font-headline-lg text-headline-lg text-primary">Featured Hospitals</h2>
          <div className="flex items-center gap-4">
            <Link href="/search?type=hospital" className="text-vibrant-blue font-bold text-sm hover:underline cursor-pointer">
              View All Hospitals
            </Link>
            <div className="flex gap-2">
              <button 
                onClick={() => scroll("left")}
                className="w-10 h-10 rounded-full border border-surface-variant flex items-center justify-center text-vibrant-blue hover:bg-surface-container-low transition-colors bg-surface-container-lowest"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scroll("right")}
                className="w-10 h-10 rounded-full border border-surface-variant flex items-center justify-center text-vibrant-blue hover:bg-surface-container-low transition-colors bg-surface-container-lowest"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbar items-stretch"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {hospitals.map((hospital) => (
            <div key={hospital.id} className="w-[280px] md:w-[300px] h-full flex-shrink-0 snap-start bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col">
              <div className="aspect-[16/9] w-full relative bg-surface-variant flex items-center justify-center flex-shrink-0">
                {hospital.image_url ? (
                  <img alt={hospital.name} className="w-full h-full object-cover" src={hospital.image_url} />
                ) : (
                  <Building2 className="w-10 h-10 text-vibrant-blue" />
                )}
                {/* Just a decorative badge for visual consistency with the design */}
                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded text-primary border border-surface-variant uppercase tracking-wider">
                  Partner
                </span>
              </div>
              <div className="p-5 flex-grow flex flex-col min-w-0">
                <h3 className="font-title-md text-base font-semibold text-on-surface mb-1 truncate w-full" title={hospital.name}>{hospital.name}</h3>
                <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1 min-w-0 w-full">
                  <MapPin className="w-4 h-4 text-vibrant-blue flex-shrink-0" /> 
                  <span className="truncate w-full">{hospital.city || "Various Locations"}</span>
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-on-surface mb-6 mt-auto">
                  <div>
                    <span className="text-vibrant-blue block font-bold">4.8/5</span>
                    <span className="text-xs text-on-surface-variant font-normal">Rating</span>
                  </div>
                  <div>
                    <span className="text-vibrant-blue block font-bold">24/7</span>
                    <span className="text-xs text-on-surface-variant font-normal">Emergency</span>
                  </div>
                </div>
                <Link href={`/hospitals/${hospital.id}`} className="block text-center w-full bg-surface-container-low text-primary border border-surface-variant py-2 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold flex-shrink-0">
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
