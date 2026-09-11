"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { PatientDock } from "@/components/PatientDock";

export interface DoctorData {
  id: string;
  specialty: string;
  experience_years?: number | null;
  consultation_fee?: number | null;
  image_url?: string | null;
  bio?: string | null;
  qualifications?: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  hospitals?: {
    id: string;
    name: string;
    city: string;
    address?: string | null;
    image_url?: string | null;
  } | null;
}

interface FindCareClientProps {
  initialDoctors: DoctorData[];
  specialties: string[];
  cities: string[];
}

// Coordinate generator for pins on the map based on index
const MAP_COORDINATES = [
  { top: "28%", left: "62%" },
  { top: "65%", left: "24%" },
  { top: "75%", left: "68%" },
  { top: "22%", left: "26%" },
  { top: "42%", left: "78%" },
  { top: "55%", left: "48%" },
  { top: "35%", left: "40%" },
  { top: "82%", left: "38%" },
];

const FEMALE_NAMES = new Set([
  "priya", "neha", "anjali", "sneha", "kavita", "elena", "sarah", "pooja",
  "sunita", "rekha", "anita", "divya", "shreya", "deepa", "swati", "meera",
  "geeta", "ritu", "radha", "maya", "laxmi", "aarti", "vandana", "smita",
  "tanvi", "isha", "nisha", "simran", "sheetal", "shilpa", "aditi", "elena"
]);

export function getDoctorGender(doctor: DoctorData): "male" | "female" {
  const bio = (doctor.bio || "").toLowerCase();
  if (/\b(she|her)\b/.test(bio)) return "female";
  if (/\b(he|him|his)\b/.test(bio)) return "male";

  const firstName = (doctor.profiles?.full_name || "")
    .replace(/^Dr\.\s*/i, "")
    .trim()
    .split(" ")[0]
    .toLowerCase();
  return FEMALE_NAMES.has(firstName) ? "female" : "male";
}

export function FindCareClient({
  initialDoctors,
  specialties,
  cities,
}: FindCareClientProps) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All Locations");
  const [consultationMode, setConsultationMode] = useState<"all" | "video" | "in-person">("all");
  const [highRatingOnly, setHighRatingOnly] = useState(false);
  const [selectedGender, setSelectedGender] = useState<"any" | "male" | "female">("any");
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"next" | "fee_low" | "exp_high">("next");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    initialDoctors[0]?.id || ""
  );
  const [visibleCount, setVisibleCount] = useState(6);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Horizontal scroll controller for specialty pills
  const specialtiesRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (specialtiesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = specialtiesRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = specialtiesRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [specialties]);

  const scrollSpecialties = (direction: "left" | "right") => {
    if (specialtiesRef.current) {
      const amount = direction === "left" ? -280 : 280;
      specialtiesRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return initialDoctors.filter((doc) => {
      const docName = doc.profiles?.full_name?.toLowerCase() || "";
      const docSpec = doc.specialty?.toLowerCase() || "";
      const hospName = doc.hospitals?.name?.toLowerCase() || "";
      const hospCity = doc.hospitals?.city?.toLowerCase() || "";
      const query = searchQuery.toLowerCase().trim();

      // Search query filter
      if (
        query &&
        !docName.includes(query) &&
        !docSpec.includes(query) &&
        !hospName.includes(query) &&
        !hospCity.includes(query)
      ) {
        return false;
      }

      // Specialty filter
      if (
        selectedSpecialty !== "All" &&
        doc.specialty?.toLowerCase() !== selectedSpecialty.toLowerCase()
      ) {
        return false;
      }

      // City filter
      if (
        selectedCity !== "All Locations" &&
        doc.hospitals?.city?.toLowerCase() !== selectedCity.toLowerCase()
      ) {
        return false;
      }

      // Gender filter
      if (selectedGender !== "any") {
        const docGender = getDoctorGender(doc);
        if (docGender !== selectedGender) {
          return false;
        }
      }

      // High Rating filter (4.5+)
      if (highRatingOnly) {
        // High rated doctors (exp >= 4 or top rated)
        if ((doc.experience_years || 5) < 5) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "fee_low") {
        return (a.consultation_fee || 0) - (b.consultation_fee || 0);
      }
      if (sortBy === "exp_high") {
        return (b.experience_years || 0) - (a.experience_years || 0);
      }
      return 0; // Default / Next slot
    });
  }, [initialDoctors, searchQuery, selectedSpecialty, selectedCity, selectedGender, consultationMode, highRatingOnly, sortBy]);

  const displayedDoctors = filteredDoctors.slice(0, visibleCount);

  // Current selected doctor for map preview
  const selectedDoctor = useMemo(() => {
    return (
      filteredDoctors.find((d) => d.id === selectedDoctorId) ||
      filteredDoctors[0] ||
      initialDoctors[0]
    );
  }, [filteredDoctors, selectedDoctorId, initialDoctors]);

  const getDoctorLastName = (name?: string | null) => {
    if (!name) return "Doctor";
    const parts = name.replace(/^Dr\.\s*/i, "").trim().split(" ");
    return parts[parts.length - 1] || parts[0];
  };

  const getDoctorInitials = (name?: string | null) => {
    if (!name) return "DR";
    const clean = name.replace(/^Dr\.\s*/i, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <main className="w-full bg-background min-h-[calc(100vh-10rem)] pb-32">
        <div className="flex flex-col w-full">
          {/* ============================================================ */}
          {/* INTERACTIVE & FILTER DASHBOARD HEADER */}
          {/* ============================================================ */}
          <section className="w-full bg-surface-container-low/70 backdrop-blur-md px-margin-x-mobile lg:px-margin-x-desktop py-8 border-b border-surface-container-high/60">
            <div className="max-w-[1536px] mx-auto flex flex-col gap-6">
              {/* Search Row with Prominent Controls */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-vibrant-blue transition-colors">
                    <span className="material-symbols-outlined text-[24px]">search</span>
                  </div>
                  <input
                    className="w-full pl-12 pr-36 py-3.5 bg-surface-container-lowest rounded-full font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all placeholder:text-outline"
                    placeholder="Search doctors, conditions, or clinics..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    onClick={() => {}}
                    className="absolute inset-y-1.5 right-1.5 px-6 rounded-full bg-vibrant-blue text-on-primary font-title-md text-body-md font-semibold hover:bg-primary transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span>Find Care</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-auto">
                  {/* Location Selector */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest rounded-full shadow-sm">
                    <span className="material-symbols-outlined text-vibrant-blue text-[20px]">near_me</span>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      aria-label="Filter by location"
                      className="bg-transparent font-body-md text-body-md text-on-surface font-medium focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="All Locations">All Locations</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span className="font-label-sm text-label-sm text-outline px-2 py-0.5 rounded-full bg-surface-container">
                      within 10 mi
                    </span>
                  </div>

                  {/* Bookmark Button */}
                  <Link
                    href="/patient/saved"
                    className="w-12 h-12 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center shadow-sm hover:bg-surface-container transition-colors relative"
                    title="Saved Doctors"
                  >
                    <span className="material-symbols-outlined text-[20px]">bookmark</span>
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-soft-coral"></span>
                  </Link>
                </div>
              </div>

              {/* Specialty Pills (Primary Filtering) with Scroll Controls */}
              <div className="relative flex items-center group/scroll">
                {/* Left Scroll Arrow */}
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => scrollSpecialties("left")}
                    aria-label="Scroll specialties left"
                    className="absolute -left-3 z-20 w-9 h-9 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-md border border-surface-container flex items-center justify-center text-on-surface hover:text-vibrant-blue hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                )}

                {/* Horizontal Scroll Track */}
                <div
                  ref={specialtiesRef}
                  onScroll={checkScroll}
                  className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth w-full px-1"
                >
                  <button
                    onClick={() => setSelectedSpecialty("All")}
                    className={`px-5 py-2 rounded-full font-body-md text-body-md font-semibold whitespace-nowrap transition-all shadow-sm shrink-0 cursor-pointer ${
                      selectedSpecialty === "All"
                        ? "bg-vibrant-blue text-on-primary scale-[1.02]"
                        : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:scale-[1.01]"
                    }`}
                  >
                    All Specialists
                  </button>
                  {specialties.map((spec) => {
                    const isCardiology = spec.toLowerCase() === "cardiology";
                    const isSelected = selectedSpecialty.toLowerCase() === spec.toLowerCase();
                    return (
                      <button
                        key={spec}
                        onClick={() => setSelectedSpecialty(spec)}
                        className={`px-5 py-2 rounded-full font-body-md text-body-md whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isSelected
                            ? "bg-vibrant-blue text-on-primary font-semibold scale-[1.02]"
                            : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {isCardiology && !isSelected && (
                          <span className="w-2 h-2 rounded-full bg-fresh-teal"></span>
                        )}
                        {spec}
                      </button>
                    );
                  })}
                </div>

                {/* Right Scroll Arrow */}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => scrollSpecialties("right")}
                    aria-label="Scroll specialties right"
                    className="absolute -right-3 z-20 w-9 h-9 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-md border border-surface-container flex items-center justify-center text-on-surface hover:text-vibrant-blue hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                )}
              </div>

              {/* Secondary Clinical Attributes Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-surface-container-high/60">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Consultation Mode Toggle */}
                  <div className="flex items-center p-1 bg-surface-container-lowest rounded-full shadow-sm">
                    <button
                      onClick={() => setConsultationMode(consultationMode === "video" ? "all" : "video")}
                      className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-colors ${
                        consultationMode === "video"
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">videocam</span> Video Call
                    </button>
                    <button
                      onClick={() => setConsultationMode(consultationMode === "in-person" ? "all" : "in-person")}
                      className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-colors ${
                        consultationMode === "in-person"
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">apartment</span> In-Person
                    </button>
                  </div>

                  {/* Rating Filter Pill */}
                  <button
                    onClick={() => setHighRatingOnly(!highRatingOnly)}
                    className={`px-4 py-1.5 rounded-full font-body-md text-label-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors ${
                      highRatingOnly
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[16px] text-amber-500"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span>4.5+ Rating</span>
                  </button>

                  {/* Gender Filter Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsGenderOpen((prev) => !prev)}
                      className={`px-4 py-1.5 rounded-full bg-surface-container-lowest font-body-md text-label-sm font-semibold flex items-center gap-1.5 shadow-sm hover:bg-surface-container transition-all cursor-pointer ${
                        selectedGender !== "any"
                          ? "text-vibrant-blue ring-1.5 ring-vibrant-blue/40"
                          : "text-on-surface"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] ${
                          selectedGender !== "any" ? "text-vibrant-blue" : "text-outline"
                        }`}
                      >
                        group
                      </span>
                      <span>
                        Gender: {selectedGender === "any" ? "Any" : selectedGender === "male" ? "Male" : "Female"}
                      </span>
                      <span
                        className={`material-symbols-outlined text-[16px] text-outline transition-transform duration-200 ${
                          isGenderOpen ? "rotate-180 text-vibrant-blue" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    {isGenderOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsGenderOpen(false)}
                        />
                        <div className="absolute left-0 mt-2 w-48 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container p-1.5 z-50 flex flex-col gap-1 slide-down">
                          {[
                            { key: "any", label: "Gender: Any", desc: "All Specialists" },
                            { key: "male", label: "Gender: Male", desc: "Male Doctors Only" },
                            { key: "female", label: "Gender: Female", desc: "Female Doctors Only" },
                          ].map((opt) => {
                            const isSelected = selectedGender === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  setSelectedGender(opt.key as any);
                                  setIsGenderOpen(false);
                                }}
                                className={`px-3 py-2 text-left rounded-xl text-label-sm flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 text-vibrant-blue font-bold"
                                    : "text-on-surface hover:bg-surface-container font-medium"
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span>{opt.label}</span>
                                  <span className="text-[11px] text-outline font-normal">
                                    {opt.desc}
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-[16px] text-vibrant-blue">
                                    check
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-3 font-label-sm text-label-sm text-outline">
                  <span>Sort:</span>
                  <div className="flex items-center gap-1 text-on-surface font-semibold">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort specialists"
                      className="bg-transparent font-semibold cursor-pointer text-on-surface focus:outline-none pr-1"
                    >
                      <option value="next">Next Available Slot</option>
                      <option value="fee_low">Fee: Low to High</option>
                      <option value="exp_high">Experience: High to Low</option>
                    </select>
                    <span className="material-symbols-outlined text-[16px]">swap_vert</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* MAIN SPLIT LAYOUT CONTAINER */}
          {/* ============================================================ */}
          <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop py-8 max-w-[1536px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* ------------------------------------------------------------ */}
              {/* LEFT COLUMN: 60% Doctor Listings */}
              {/* ------------------------------------------------------------ */}
              <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col gap-6">
                {/* Results Summary Bar */}
                <div className="flex items-center justify-between px-2">
                  <div>
                    <h2 className="font-headline-lg text-title-md text-on-surface font-bold tracking-tight">
                      Available Doctors in Your Area
                    </h2>
                    <p className="font-body-md text-label-sm text-indigo-gray-600 mt-0.5">
                      Showing {filteredDoctors.length} verified specialists within 10 miles of {selectedCity === "All Locations" ? "Downtown Medical Hub" : selectedCity}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal animate-pulse"></span>
                    <span className="font-label-sm text-label-sm text-fresh-teal font-semibold">
                      Real-time scheduling synced
                    </span>
                  </div>
                </div>

                {/* DOCTORS LIST */}
                {displayedDoctors.length === 0 ? (
                  <div className="w-full bg-surface-container-lowest rounded-2xl p-12 text-center shadow-sm">
                    <span className="material-symbols-outlined text-outline text-[48px] mb-3">search_off</span>
                    <h3 className="font-title-md text-lg font-bold text-on-surface">No specialists found</h3>
                    <p className="font-body-md text-label-sm text-indigo-gray-600 mt-1">
                      Try clearing your search query or switching to another specialty.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedSpecialty("All");
                        setSelectedCity("All Locations");
                      }}
                      className="mt-4 px-6 py-2 rounded-full bg-vibrant-blue text-on-primary font-bold text-sm hover:bg-primary transition-all"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  displayedDoctors.map((doctor, index) => {
                    const isSelected = selectedDoctor?.id === doctor.id;
                    const docName = doctor.profiles?.full_name || "Specialist Doctor";
                    const fee = doctor.consultation_fee || 500;
                    const exp = doctor.experience_years || 5;
                    const hosp = doctor.hospitals?.name || "Premier Medical Center";
                    const city = doctor.hospitals?.city || "Mumbai";
                    const address = doctor.hospitals?.address || "Downtown Clinic";

                    // Dynamic Badges based on index / attributes
                    const badge =
                      index === 0
                        ? { label: "Top Rated", bg: "bg-primary/10 text-vibrant-blue" }
                        : index === 1
                        ? { label: "Next-Gen Clinic", bg: "bg-secondary-container/30 text-on-secondary-container" }
                        : index === 2
                        ? { label: "Experienced", bg: "bg-surface-container-high text-on-surface-variant" }
                        : { label: "Highly Recommended", bg: "bg-primary/10 text-vibrant-blue" };

                    // Simulated slot text
                    const slotText =
                      index % 3 === 0
                        ? "Available Today, 2:30 PM"
                        : index % 3 === 1
                        ? "Tomorrow, 10:00 AM"
                        : "Thu, 4:15 PM";

                    return (
                      <div
                        key={doctor.id}
                        onClick={() => setSelectedDoctorId(doctor.id)}
                        className={`w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer border ${
                          isSelected
                            ? "border-vibrant-blue/60 ring-2 ring-vibrant-blue/20"
                            : "border-transparent"
                        }`}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 via-transparent to-transparent rounded-bl-full pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row gap-5 items-start">
                          {/* Doctor Profile Photo / Fallback */}
                          <div className="relative flex-shrink-0">
                            {doctor.image_url ? (
                              <img
                                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-inner bg-surface-container"
                                src={doctor.image_url}
                                alt={docName}
                              />
                            ) : (
                              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-indigo-gray-900 text-white flex flex-col items-center justify-center font-bold text-2xl shadow-inner shrink-0">
                                <span>{getDoctorInitials(docName)}</span>
                                <span className="text-[11px] text-outline font-normal mt-0.5">Doctor</span>
                              </div>
                            )}
                            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-fresh-teal text-on-primary font-label-sm text-[11px] font-bold shadow-sm flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest animate-ping"></span>
                              ACTIVE
                            </span>
                          </div>

                          {/* Content Details */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold tracking-wide uppercase ${badge.bg}`}
                                  >
                                    {badge.label}
                                  </span>
                                  <span className="flex items-center gap-1 font-label-sm text-label-sm font-semibold text-on-surface">
                                    <span
                                      className="material-symbols-outlined text-amber-500 text-[16px]"
                                      style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                      star
                                    </span>
                                    4.9{" "}
                                    <span className="text-outline font-normal">
                                      ({120 + index * 34} reviews) • {exp} yrs exp
                                    </span>
                                  </span>
                                </div>
                                <span className="font-headline-lg text-title-md font-bold text-on-surface">
                                  ₹{fee}{" "}
                                  <span className="text-outline font-normal text-label-sm">
                                    / session
                                  </span>
                                </span>
                              </div>

                              <h3 className="font-headline-lg text-body-lg font-bold text-on-surface group-hover:text-vibrant-blue transition-colors">
                                {docName}, MD
                              </h3>
                              <p className="font-body-md text-label-sm text-indigo-gray-600 font-medium">
                                Senior {doctor.specialty} &amp; Consultant Specialist
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-indigo-gray-600 font-body-md text-label-sm">
                                <span className="material-symbols-outlined text-[16px] text-outline">
                                  domain
                                </span>
                                <span className="truncate">
                                  {hosp} • {address || city} ({1.2 + index * 0.4} mi)
                                </span>
                              </div>
                            </div>

                            {/* Consultation modes & Next Slot indicator */}
                            <div className="mt-4 pt-3 border-t border-surface-container flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1.5 font-medium">
                                  <span className="material-symbols-outlined text-[15px] text-vibrant-blue">
                                    videocam
                                  </span>{" "}
                                  Video
                                </span>
                                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1.5 font-medium">
                                  <span className="material-symbols-outlined text-[15px] text-secondary">
                                    apartment
                                  </span>{" "}
                                  Clinic
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary font-semibold">
                                <span className="material-symbols-outlined text-[16px] text-fresh-teal">
                                  alarm_on
                                </span>
                                <span>{slotText}</span>
                              </div>
                            </div>

                            {/* Primary Actions */}
                            <div className="flex items-center gap-3 mt-4">
                              <Link
                                href={isPreview ? `/book/${doctor.id}?preview=patient` : `/book/${doctor.id}`}
                                className="flex-1 py-2.5 px-4 rounded-full bg-vibrant-blue text-on-primary font-title-md text-body-md font-semibold hover:bg-primary transition-all shadow-sm flex items-center justify-center gap-2"
                              >
                                <span>Book Now</span>
                                <span className="material-symbols-outlined text-[18px]">event</span>
                              </Link>
                              <Link
                                href={isPreview ? `/doctors/${doctor.id}?preview=patient` : `/doctors/${doctor.id}`}
                                className="py-2.5 px-5 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container font-title-md text-body-md font-semibold transition-colors flex items-center justify-center gap-1"
                              >
                                <span>View Full Profile</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pagination & Load More */}
                {visibleCount < filteredDoctors.length && (
                  <div className="py-6 flex items-center justify-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 6)}
                      className="px-8 py-3 rounded-full bg-surface-container-lowest text-on-surface font-title-md text-body-md font-semibold shadow-sm hover:bg-surface-container transition-colors flex items-center gap-2"
                    >
                      <span>Show {filteredDoctors.length - visibleCount} More Specialists</span>
                      <span className="material-symbols-outlined text-[20px] text-vibrant-blue">
                        expand_more
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------ */}
              {/* RIGHT COLUMN: 40% Interactive Map Experience (Sticky) */}
              {/* ------------------------------------------------------------ */}
              <div className="w-full lg:w-[42%] xl:w-[40%] lg:sticky lg:top-8 h-[650px] lg:h-[calc(100vh-6rem)]">
                <div className="w-full h-full rounded-3xl overflow-hidden shadow-lg relative bg-surface-container-highest flex flex-col border border-surface-container">
                  {/* Dynamic Map Viewport with styled SVG Layer */}
                  <div
                    className="w-full h-full relative overflow-hidden transition-transform duration-300"
                    style={{
                      backgroundColor: "#e8effd",
                      backgroundImage: `radial-gradient(#c2c6d8 1px, transparent 1px)`,
                      backgroundSize: "24px 24px",
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "center center",
                    }}
                  >
                    {/* Map Decorative Street Network SVG Layer */}
                    <svg
                      className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <pattern
                          height="220"
                          id="grid-roads"
                          patternUnits="userSpaceOnUse"
                          width="220"
                        >
                          <path
                            d="M 0 45 L 220 45 M 0 160 L 220 160 M 70 0 L 70 220 M 175 0 L 175 220"
                            fill="none"
                            stroke="#dae2fd"
                            strokeWidth="4"
                          ></path>
                          <path
                            d="M 0 100 Q 100 80, 220 130"
                            fill="none"
                            stroke="#c2c6d8"
                            strokeWidth="6"
                          ></path>
                          <path
                            d="M 40 0 L 190 220"
                            fill="none"
                            stroke="#dae2fd"
                            strokeWidth="2"
                          ></path>
                        </pattern>
                      </defs>
                      <rect fill="url(#grid-roads)" height="100%" width="100%"></rect>
                    </svg>

                    {/* Map Radius Indicator from User Location */}
                    <div className="absolute top-[46%] left-[48%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-vibrant-blue/25 bg-vibrant-blue/5 pointer-events-none animate-pulse"></div>

                    {/* User Location Marker */}
                    <div className="absolute top-[46%] left-[48%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                      <div className="w-5 h-5 rounded-full bg-vibrant-blue ring-4 ring-on-primary shadow-md flex items-center justify-center text-on-primary">
                        <span className="w-2 h-2 rounded-full bg-on-primary"></span>
                      </div>
                      <span className="mt-1 px-2 py-0.5 rounded-full bg-on-surface/80 backdrop-blur-md text-on-primary font-label-sm text-[10px] font-bold">
                        You are here
                      </span>
                    </div>

                    {/* DOCTOR MAP PINS */}
                    {displayedDoctors.map((doc, idx) => {
                      const pos = MAP_COORDINATES[idx % MAP_COORDINATES.length];
                      const isSelected = selectedDoctor?.id === doc.id;
                      const lastName = getDoctorLastName(doc.profiles?.full_name);
                      const fee = doc.consultation_fee || 500;

                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDoctorId(doc.id)}
                          style={{ top: pos.top, left: pos.left }}
                          className={`absolute z-30 flex flex-col items-center group cursor-pointer transition-all duration-300 ${
                            isSelected ? "scale-110 z-40" : "hover:scale-105"
                          }`}
                        >
                          {isSelected ? (
                            <div className="px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary font-title-md text-label-sm font-bold shadow-md flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">
                                stethoscope
                              </span>
                              <span>
                                Dr. {lastName} • ₹{fee}
                              </span>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-title-md text-label-sm font-bold shadow-md hover:bg-vibrant-blue hover:text-on-primary transition-all flex items-center gap-1.5 border border-surface-container">
                              <span>
                                Dr. {lastName} • ₹{fee}
                              </span>
                            </div>
                          )}
                          <div
                            className={`w-2.5 h-2.5 rotate-45 -mt-1 shadow-sm transition-colors ${
                              isSelected
                                ? "bg-vibrant-blue"
                                : "bg-surface-container-lowest group-hover:bg-vibrant-blue"
                            }`}
                          ></div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Top Left Floating Search Radius Pill */}
                  <div className="absolute top-4 left-4 z-30">
                    <div className="px-3.5 py-2 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center gap-2 border border-surface-container/50">
                      <span className="w-2 h-2 rounded-full bg-vibrant-blue"></span>
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                        {selectedCity === "All Locations" ? "Downtown Corridor" : `${selectedCity} Hub`}
                      </span>
                      <span className="font-label-sm text-[11px] text-outline">
                        | {filteredDoctors.length} Specialists
                      </span>
                    </div>
                  </div>

                  {/* Floating Map Navigation & Zoom Controls */}
                  <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                    <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl shadow-md p-1 flex flex-col border border-surface-container/50">
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
                        className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-xl transition-colors"
                        title="Zoom In"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                      </button>
                      <div className="h-px bg-surface-container mx-2"></div>
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.85))}
                        className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-xl transition-colors"
                        title="Zoom Out"
                      >
                        <span className="material-symbols-outlined text-[20px]">remove</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {}}
                      className="w-11 h-11 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors border border-surface-container/50"
                      title="Street View Pegman"
                    >
                      <span
                        className="material-symbols-outlined text-[22px] text-amber-500"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        accessibility_new
                      </span>
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="w-11 h-11 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl shadow-md flex items-center justify-center text-vibrant-blue hover:bg-surface-container transition-colors border border-surface-container/50"
                      title="Center Current Location"
                    >
                      <span className="material-symbols-outlined text-[22px]">my_location</span>
                    </button>
                  </div>

                  {/* BOTTOM DOCKED POP-UP PREVIEW CARD FOR SELECTED PIN */}
                  {selectedDoctor && (
                    <div className="absolute bottom-4 left-4 right-4 z-30">
                      <div className="w-full bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-surface-container/60">
                        <div className="flex items-center gap-3.5 w-full sm:w-auto">
                          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary flex-shrink-0 shadow-sm">
                            <span className="material-symbols-outlined text-[24px]">
                              local_hospital
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-title-md text-body-md font-bold text-on-surface truncate">
                                {selectedDoctor.hospitals?.name || "Consult Your Doctor Clinic"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-[11px] font-bold">
                                Open
                              </span>
                            </div>
                            <p className="font-body-md text-label-sm text-indigo-gray-600 truncate">
                              {selectedDoctor.hospitals?.address || selectedDoctor.hospitals?.city || "City Center"} • 1.2 mi away
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${selectedDoctor.hospitals?.name || ""} ${selectedDoctor.hospitals?.city || ""}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-title-md text-label-sm font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              directions
                            </span>
                            <span>Directions</span>
                          </a>
                          <Link
                            href={
                              selectedDoctor.hospitals?.id
                                ? `/hospitals/${selectedDoctor.hospitals.id}`
                                : `/doctors/${selectedDoctor.id}`
                            }
                            className="px-4 py-2 rounded-full bg-vibrant-blue text-on-primary font-title-md text-label-sm font-semibold hover:bg-primary transition-all shadow-sm flex items-center gap-1"
                          >
                            <span>View Clinic</span>
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FLOATING BOTTOM DOCK WITH FIND ACTIVE */}
      <PatientDock activeTab="find" />
    </div>
  );
}
