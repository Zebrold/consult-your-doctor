"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientDock } from "@/components/PatientDock";

export interface DoctorItem {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  hospitalCity?: string;
  experience_years?: number;
  fee: string;
  image?: string | null;
  rating?: string;
  reviews?: string;
  badge?: string;
  badgeIcon?: string;
  badgeColor?: string;
}

export interface HospitalItem {
  id: string;
  name: string;
  city?: string;
  location: string;
  rating: string;
  badge: string;
  badgeIcon: string;
  badgeColor: string;
  doctors: string;
  desc: string;
  image?: string | null;
  type?: "hospital" | "diagnostic";
}

export interface SpecialtyItem {
  title: string;
  desc: string;
  icon: string;
  count: string;
}

interface PatientHomeProps {
  user?: any;
  profile?: any;
  doctors?: DoctorItem[];
  hospitals?: HospitalItem[];
  specialties?: SpecialtyItem[];
  cities?: string[];
}

export function PatientHome({
  user,
  profile,
  doctors = [],
  hospitals = [],
  specialties = [],
  cities = [],
}: PatientHomeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";
  const [searchQuery, setSearchQuery] = useState("");
  const defaultCity = cities.length > 0 ? cities[0] : "All Locations";
  const [selectedLocation, setSelectedLocation] = useState(defaultCity);

  const doctorCarouselRef = useRef<HTMLDivElement>(null);
  const hospitalCarouselRef = useRef<HTMLDivElement>(null);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || "Patient";

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "PT";
  };

  const initials = getInitials(fullName);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", "doctor");
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (selectedLocation && selectedLocation !== "All Locations") {
      params.set("location", selectedLocation);
    }
    router.push(`/search?${params.toString()}`);
  };

  // Smooth infinite / cyclic scroll
  const scrollCarousel = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right"
  ) => {
    if (!ref.current) return;
    const container = ref.current;
    const scrollAmount = 320;
    const maxScroll = container.scrollWidth - container.clientWidth;

    if (direction === "right") {
      if (container.scrollLeft >= maxScroll - 20) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    } else {
      if (container.scrollLeft <= 20) {
        container.scrollTo({ left: maxScroll, behavior: "smooth" });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <main className="w-full bg-background min-h-[calc(100vh-20rem)] pb-28">
        <div className="flex flex-col w-full">

          {/* SECTION 1: HERO & SEARCH */}
          <section className="relative w-full overflow-hidden bg-gradient-to-b from-surface-container-low via-surface to-background px-margin-x-mobile lg:px-margin-x-desktop pt-8 md:pt-10 pb-16">
            <div className="absolute -top-24 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 -left-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative max-w-container-max mx-auto flex flex-col gap-8">
              {/* User Greeting Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary font-headline-lg text-headline-lg-mobile font-bold">
                    {initials}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-title-md text-title-md text-on-surface">
                        Welcome back, {fullName}
                      </span>
                    </div>
                    <span className="font-body-md text-body-md text-indigo-gray-600">
                      Your health plan covers 100% of preventative teleconsults
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Headline (The Anchor Alignment Element) */}
              <div className="flex flex-col gap-4 pt-2">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">
                  Accredited Clinical Network
                </span>
                <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight leading-[1.08]">
                  Find Your Specialist Today &amp; Book Instant Consultations
                </h1>
                <p className="font-body-lg text-body-lg text-indigo-gray-600 max-w-2xl">
                  Connect with verified top-tier physicians, accredited hospital networks, and certified diagnostic centers in seconds with zero friction.
                </p>
              </div>

              {/* Instant Search Bar */}
              <form
                onSubmit={handleSearch}
                className="w-full bg-surface-container-lowest p-3 lg:p-4 rounded-3xl md:rounded-full shadow-xl flex flex-col md:flex-row items-center gap-2 border border-surface-variant"
              >
                <div className="flex-1 w-full flex items-center gap-3 px-4 py-2">
                  <span className="material-symbols-outlined text-vibrant-blue text-[24px]">search</span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                    placeholder="Specialty, condition, doctor name, or clinical procedure..."
                    type="text"
                  />
                </div>
                <div className="hidden md:block h-8 w-[1px] bg-surface-variant"></div>
                <div className="w-full md:w-72 flex items-center gap-3 px-4 py-2">
                  <span className="material-symbols-outlined text-fresh-teal text-[22px]">location_on</span>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-transparent font-body-md text-body-md text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value="All Locations">All Locations</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="w-full md:w-auto px-8 py-3.5 rounded-full bg-vibrant-blue text-on-primary font-title-md text-body-lg font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  type="submit"
                >
                  <span>Search Doctors</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </form>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-label-sm text-label-sm text-indigo-gray-600 mr-2">Quick Filters:</span>
                <Link
                  href="/search?type=doctor&consultation=video"
                  className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                  Video Consult
                </Link>
                <Link
                  href="/search?type=doctor&consultation=in-person"
                  className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">person_pin_circle</span>
                  In-Person Visit
                </Link>
                <Link
                  href="/search?type=doctor&insurance=true"
                  className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">shield</span>
                  Insurance Accepted
                </Link>
              </div>
            </div>
          </section>

          {/* SECTION 2: EXPLORE POPULAR SPECIALTIES (Aligned with Main Heading) */}
          <section className="w-full py-14 px-margin-x-mobile lg:px-margin-x-desktop">
            <div className="max-w-container-max mx-auto flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">
                    Clinical Domains
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
                    Explore Popular Specialties
                  </h2>
                </div>
                <Link
                  className="group flex items-center gap-1.5 font-body-md text-body-md font-semibold text-vibrant-blue hover:text-primary transition-colors"
                  href="/search?type=doctor"
                >
                  <span>View All {specialties.length > 8 ? specialties.length : 42} Specialties</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {specialties.map((spec) => (
                  <Link
                    key={spec.title}
                    className="group p-5 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md hover:bg-primary/5 transition-all flex flex-col justify-between h-44 border border-surface-variant/40"
                    href={`/search?type=doctor&specialty=${encodeURIComponent(spec.title)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center group-hover:bg-vibrant-blue group-hover:text-on-primary transition-colors">
                        <span className="material-symbols-outlined text-[26px]">{spec.icon}</span>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-surface-container text-indigo-gray-600 font-label-sm text-label-sm">
                        {spec.count}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-title-md text-title-md text-on-surface font-bold group-hover:text-vibrant-blue transition-colors">
                        {spec.title}
                      </h3>
                      <p className="font-body-md text-body-md text-indigo-gray-600 mt-1 line-clamp-1">
                        {spec.desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: RECOMMENDED DOCTORS (1 Single Row + Infinite Arrows, Aligned with Main Heading) */}
          <section className="w-full bg-surface-container-low py-16 px-margin-x-mobile lg:px-margin-x-desktop">
            <div className="max-w-container-max mx-auto flex flex-col gap-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">
                    Top Verified Clinicians
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
                    Recommended Doctors For You
                  </h2>
                  <p className="font-body-md text-body-md text-indigo-gray-600 mt-1">
                    Vetted practitioners with guaranteed clinical availability this week
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollCarousel(doctorCarouselRef, "left")}
                    className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm cursor-pointer border border-surface-variant/40 active:scale-95"
                    type="button"
                    aria-label="Previous doctors"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => scrollCarousel(doctorCarouselRef, "right")}
                    className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm cursor-pointer border border-surface-variant/40 active:scale-95"
                    type="button"
                    aria-label="Next doctors"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* 1 Single Row with horizontal carousel scroll */}
              <div
                ref={doctorCarouselRef}
                className="flex flex-nowrap gap-6 overflow-x-auto scroll-smooth pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all border border-surface-variant/40 w-[280px] sm:w-[300px] flex-shrink-0"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-950">
                        {doctor.image ? (
                          <img
                            className="w-full h-full object-cover"
                            alt={doctor.name}
                            src={doctor.image}
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900 to-slate-950 opacity-95" />
                            <div className="relative z-10 w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-vibrant-blue shadow-inner">
                              <span className="material-symbols-outlined text-[32px]">person</span>
                            </div>
                            <span className="relative z-10 font-label-sm text-[11px] text-slate-400 mt-2 font-medium">
                              {doctor.specialty}
                            </span>
                          </div>
                        )}
                        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md ${doctor.badgeColor || 'text-secondary'} font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow-sm`}>
                          <span className="material-symbols-outlined text-[14px]">{doctor.badgeIcon || 'bolt'}</span>
                          {doctor.badge || 'Available Today'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-vibrant-blue font-semibold uppercase truncate">
                            {doctor.specialty}
                          </span>
                          <span className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-on-surface flex-shrink-0">
                            <span
                              className="material-symbols-outlined text-amber-500 text-[16px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            {doctor.rating || '4.9'} <span className="font-normal text-outline">({doctor.reviews || '120+'})</span>
                          </span>
                        </div>
                        <h3 className="font-title-md text-body-lg font-bold text-on-surface mt-1 truncate" title={doctor.name}>
                          {doctor.name}
                        </h3>
                        <p className="font-body-md text-body-md text-indigo-gray-600 truncate" title={doctor.hospital}>
                          {doctor.hospital}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-surface-variant flex items-center justify-between gap-3">
                      <div>
                        <span className="font-label-sm text-label-sm text-outline">Fee</span>
                        <p className="font-title-md text-body-lg font-bold text-on-surface">{doctor.fee}</p>
                      </div>
                      <Link
                        href={isPreview ? `/book/${doctor.id}?preview=patient` : `/book/${doctor.id}`}
                        className="px-5 py-2.5 rounded-full bg-vibrant-blue text-on-primary font-body-md text-body-md font-semibold hover:bg-primary transition-all text-center"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 4: ACCREDITED HOSPITALS (1 Single Row + Infinite Arrows, Aligned with Main Heading) */}
          <section className="w-full py-16 px-margin-x-mobile lg:px-margin-x-desktop">
            <div className="max-w-container-max mx-auto flex flex-col gap-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">
                    Network Centers
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
                    Accredited Hospitals &amp; Diagnostics
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    className="font-body-md text-body-md font-semibold text-vibrant-blue hover:text-primary mr-2"
                    href="/search?type=hospital"
                  >
                    View Facility Directory
                  </Link>
                  <button
                    onClick={() => scrollCarousel(hospitalCarouselRef, "left")}
                    className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm cursor-pointer border border-surface-variant/40 active:scale-95"
                    type="button"
                    aria-label="Previous hospitals"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => scrollCarousel(hospitalCarouselRef, "right")}
                    className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm cursor-pointer border border-surface-variant/40 active:scale-95"
                    type="button"
                    aria-label="Next hospitals"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* 1 Single Row with horizontal carousel scroll */}
              <div
                ref={hospitalCarouselRef}
                className="flex flex-nowrap gap-6 overflow-x-auto scroll-smooth pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {hospitals.map((fac) => (
                  <div
                    key={fac.id}
                    className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col border border-surface-variant/40 w-[320px] sm:w-[360px] flex-shrink-0"
                  >
                    <div className="h-48 w-full relative bg-slate-950">
                      {fac.image ? (
                        <img
                          className="w-full h-full object-cover"
                          alt={fac.name}
                          src={fac.image}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900 to-slate-950 opacity-95" />
                          <div className="relative z-10 w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-fresh-teal shadow-inner">
                            <span className="material-symbols-outlined text-[32px]">
                              {fac.type === "diagnostic" ? "biotech" : "local_hospital"}
                            </span>
                          </div>
                          <span className="relative z-10 font-label-sm text-[11px] text-slate-400 mt-2 font-medium">
                            {fac.city || "Healthcare Facility"}
                          </span>
                        </div>
                      )}
                      <span className={`absolute top-3 right-3 px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md ${fac.badgeColor} font-label-sm text-label-sm font-bold flex items-center gap-1`}>
                        <span className="material-symbols-outlined text-[14px]">{fac.badgeIcon}</span>
                        {fac.badge}
                      </span>
                    </div>
                    <div className="p-6 flex flex-col justify-between flex-1 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-label-sm text-label-sm text-indigo-gray-600 truncate">
                            {fac.location}
                          </span>
                          <span className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-on-surface flex-shrink-0">
                            <span
                              className="material-symbols-outlined text-amber-500 text-[16px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            {fac.rating}
                          </span>
                        </div>
                        <h3 className="font-title-md text-title-md font-bold text-on-surface line-clamp-1" title={fac.name}>
                          {fac.name}
                        </h3>
                        <p className="font-body-md text-body-md text-indigo-gray-600 mt-2 line-clamp-2">
                          {fac.desc}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-surface-variant">
                        <span className="font-label-sm text-label-sm text-indigo-gray-900 font-semibold">
                          {fac.doctors}
                        </span>
                        <Link
                          className="font-body-md text-body-md font-bold text-vibrant-blue hover:underline"
                          href={fac.type === "diagnostic" ? `/search?type=diagnostic&q=${encodeURIComponent(fac.name)}` : `/search?type=hospital&q=${encodeURIComponent(fac.name)}`}
                        >
                          Explore {fac.type === "diagnostic" ? "Center" : "Hospital"}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>

      <PatientDock activeTab="home" />
    </div>
  );
}
