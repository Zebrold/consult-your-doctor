"use client";

import { useState } from "react";
import { ChevronDown, Search, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export function QuickBookWidget() {
  const router = useRouter();
  const [type, setType] = useState<"doctor" | "diagnostic">("doctor");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("type", type);
    if (specialty && type === "doctor") params.set("specialty", specialty);
    if (location) params.set("city", location);
    if (query) params.set("q", query);
    
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 card-shadow border border-surface-variant space-y-6 card-hover w-full max-w-md mx-auto relative z-10">
      <h3 className="font-title-md text-title-md text-primary text-center mb-4">Book Your Visit</h3>
      
      {/* Toggle Buttons */}
      <div className="flex bg-surface-container-low rounded-full p-1 mb-6 relative">
        <div 
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-vibrant-blue rounded-full transition-transform duration-300 ease-in-out ${type === 'diagnostic' ? 'translate-x-full left-1' : 'translate-x-0 left-1'}`}
        />
        <button 
          onClick={() => setType("doctor")}
          className={`flex-1 relative z-10 py-2.5 rounded-full font-label-sm text-label-sm transition-colors ${type === 'doctor' ? 'text-white' : 'text-on-surface-variant hover:text-primary'}`}
        >
          Hospital / Doctor
        </button>
        <button 
          onClick={() => setType("diagnostic")}
          className={`flex-1 relative z-10 py-2.5 rounded-full font-label-sm text-label-sm transition-colors ${type === 'diagnostic' ? 'text-white' : 'text-on-surface-variant hover:text-primary'}`}
        >
          Diagnostic
        </button>
      </div>

      <div className="space-y-4">
        {/* Specialty (Only for Doctor) */}
        {type === "doctor" && (
          <div className="flex flex-col relative">
            <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Specialty</label>
            <div className="relative">
              <select 
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="mt-4 pt-4 pb-2 px-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md w-full appearance-none outline-none cursor-pointer text-on-surface"
              >
                <option value="">Any Specialty</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Gynecology">Gynecology</option>
              </select>
              <ChevronDown className="absolute right-3 top-8 text-outline pointer-events-none w-5 h-5" />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col relative">
          <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">
            Search {type === "doctor" ? "Doctor / Hospital" : "Test Name"}
          </label>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 text-vibrant-blue w-5 h-5" />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface" 
              placeholder={type === "doctor" ? "e.g. Dr. Emily Chen" : "e.g. Blood Test, MRI"} 
              type="text" 
            />
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col relative">
          <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">City or Location</label>
          <div className="relative mt-4">
            <input 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none text-on-surface" 
              placeholder="e.g. New York" 
              type="text" 
            />
          </div>
        </div>
      </div>

      <button 
        onClick={handleSearch}
        className="w-full bg-vibrant-blue text-on-primary py-4 rounded-xl font-title-md text-base btn-hover mt-4 shadow-lg shadow-vibrant-blue/20"
      >
        Find Appointment
      </button>
    </div>
  );
}
