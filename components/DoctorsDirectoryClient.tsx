"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Search, Stethoscope, User, X } from "lucide-react";

export type DirectoryDoctor = {
  id: string;
  name: string;
  specialty: string | null;
  experienceYears: number | null;
  fee: number | null;
  image: string | null;
  hospital: string | null;
  city: string | null;
  address: string | null;
};

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DoctorsDirectoryClient({ doctors }: { doctors: DirectoryDoctor[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const d of doctors) {
      if (d.specialty) set.add(d.specialty);
    }
    return ["All", ...Array.from(set).sort()];
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return doctors.filter((doc) => {
      if (selectedSpecialty !== "All" && doc.specialty !== selectedSpecialty) {
        return false;
      }
      if (!q) return true;
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.specialty && doc.specialty.toLowerCase().includes(q)) ||
        (doc.hospital && doc.hospital.toLowerCase().includes(q)) ||
        (doc.city && doc.city.toLowerCase().includes(q))
      );
    });
  }, [doctors, searchQuery, selectedSpecialty]);

  return (
    <div className="flex flex-col gap-8">
      {/* Search and filters bar */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors, specialties, or hospitals…"
            className="w-full h-12 pl-11 pr-10 rounded-full border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 focus:border-vibrant-blue transition-all text-sm font-medium shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {specialties.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar" role="group" aria-label="Filter by specialty">
            {specialties.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialty(spec)}
                aria-pressed={selectedSpecialty === spec}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  selectedSpecialty === spec
                    ? "bg-indigo-gray-900 border-indigo-gray-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 font-medium">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> {filtered.length === 1 ? "doctor" : "doctors"}
          {selectedSpecialty !== "All" && <span> in {selectedSpecialty}</span>}
          {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
        </p>
        {(selectedSpecialty !== "All" || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedSpecialty("All");
              setSearchQuery("");
            }}
            className="text-xs font-semibold text-vibrant-blue hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid of Doctor Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No doctors found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
            We couldn&apos;t find any doctors matching your search criteria. Try clearing filters or searching for another term.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedSpecialty("All");
              setSearchQuery("");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-vibrant-blue text-white text-sm font-semibold hover:bg-primary transition-colors"
          >
            Show all doctors
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((doctor) => (
            <article
              key={doctor.id}
              className="rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4 p-5">
                {doctor.image ? (
                  <Image
                    src={doctor.image}
                    alt={doctor.name}
                    width={112}
                    height={112}
                    sizes="56px"
                    className="w-14 h-14 rounded-full object-cover shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold shrink-0">
                    {initials(doctor.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-indigo-gray-900 truncate" title={doctor.name}>
                    {doctor.name}
                  </h3>
                  {doctor.specialty && (
                    <p className="text-sm font-medium text-primary truncate">{doctor.specialty}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-500 truncate">
                    {[
                      doctor.hospital,
                      doctor.experienceYears ? `${doctor.experienceYears} yrs exp` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {doctor.city && (
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {doctor.city}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <div>
                  {doctor.fee ? (
                    <>
                      <span className="font-semibold text-indigo-gray-900">₹{doctor.fee}</span>
                      <span className="text-sm text-slate-500"> fee</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500">Fee on profile</span>
                  )}
                </div>
                <Link
                  href={`/doctors/${doctor.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-vibrant-blue px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary transition-colors"
                >
                  View and book
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
