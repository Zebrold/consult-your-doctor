'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Bolt, MapPin } from 'lucide-react'

export type RosterDoctor = {
  id: string
  name: string
  specialty: string
  experienceYears: number
  fee: string | null
  image: string | null
  hospital: string | null
  city: string | null
}

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Doctor cards with specialty filter chips for the "Online doctor" page. */
export function OnlineDoctorRoster({ doctors }: { doctors: RosterDoctor[] }) {
  const [specialty, setSpecialty] = useState('All')

  const specialties = ['All', ...Array.from(new Set(doctors.map((d) => d.specialty))).slice(0, 5)]
  const visible = specialty === 'All' ? doctors : doctors.filter((d) => d.specialty === specialty)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-label-sm text-label-sm font-bold text-secondary uppercase tracking-wider">
            <span className="w-3 h-3 rounded-full bg-fresh-teal animate-pulse" />
            Live On-Call Roster
          </span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Top Doctors Ready for AI Redirection</h2>
          <p className="font-body-md text-body-md text-indigo-gray-600">
            Connect in real-time or let our smart triage assistant route you straight to the next available specialist.
          </p>
        </div>
        {specialties.length > 2 && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-label-sm text-label-sm text-indigo-gray-600 font-semibold shrink-0">Specialty:</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {specialties.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSpecialty(spec)}
                  aria-pressed={specialty === spec}
                  className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                    specialty === spec
                      ? 'bg-vibrant-blue text-on-primary shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-8 text-center shadow-sm">
          <p className="font-body-md text-body-md text-indigo-gray-600 mb-4">No doctors are listed right now.</p>
          <Link href="/search?type=doctor" className="inline-flex items-center gap-2 text-vibrant-blue font-bold hover:underline">
            Browse all doctors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {visible.map((doctor) => (
            <article
              key={doctor.id}
              className="bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="flex flex-col gap-4 p-5">
                <div className="relative w-20 h-20 mx-auto">
                  {doctor.image ? (
                    <img alt={doctor.name} className="w-20 h-20 rounded-full object-cover shadow-sm" src={doctor.image} />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-surface-container text-primary flex items-center justify-center font-title-md text-title-md font-bold">
                      {initials(doctor.name)}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-fresh-teal border-2 border-white" />
                </div>
                <div className="text-center flex flex-col gap-1 min-w-0">
                  <h3 className="font-title-md text-title-md font-bold text-on-surface truncate" title={doctor.name}>{doctor.name}</h3>
                  <p className="font-body-md text-body-md text-primary font-semibold truncate">{doctor.specialty}</p>
                  <p className="font-label-sm text-label-sm text-indigo-gray-600 truncate">
                    {doctor.hospital ? `${doctor.hospital} · ` : ''}{doctor.experienceYears}+ Years Exp
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-fresh-teal font-bold bg-surface-container px-2 py-0.5 rounded-md">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                  {doctor.city && (
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-indigo-gray-600">
                      <MapPin className="w-3.5 h-3.5" /> {doctor.city}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 bg-surface-container-low p-5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-indigo-gray-600">Next Step</span>
                    <span className="font-label-sm text-label-sm text-fresh-teal font-bold flex items-center gap-1">
                      <Bolt className="w-3.5 h-3.5" /> Book online
                    </span>
                  </div>
                  {doctor.fee && (
                    <div className="text-right">
                      <span className="font-title-md text-title-md font-bold text-on-surface">{doctor.fee}</span>
                      <span className="font-label-sm text-label-sm text-indigo-gray-600 block">/ consult</span>
                    </div>
                  )}
                </div>
                <Link
                  href={`/doctors/${doctor.id}`}
                  className="w-full py-2.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm hover:bg-primary transition-all duration-150 shadow-sm text-center"
                >
                  Consult Now
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
