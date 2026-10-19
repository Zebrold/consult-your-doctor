'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'

export type RosterDoctor = {
  id: string
  name: string
  /** Null when the doctor hasn't set one; never filled in with a guess. */
  specialty: string | null
  experienceYears: number | null
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

/** Doctor cards with specialty filter chips for the "Book a doctor online" page. */
export function OnlineDoctorRoster({ doctors, bookingFee }: { doctors: RosterDoctor[]; bookingFee: string }) {
  const [specialty, setSpecialty] = useState('All')

  const specialties = ['All', ...Array.from(new Set(doctors.map((d) => d.specialty).filter(Boolean) as string[])).slice(0, 5)]
  const visible = specialty === 'All' ? doctors : doctors.filter((d) => d.specialty === specialty)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">Doctors you can book</h2>
          <p className="mt-2 text-slate-600 leading-relaxed">
            Compare fees and pick a time that suits you. Consultations take place at the doctor&apos;s hospital.
          </p>
        </div>
        {specialties.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by specialty">
            {specialties.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setSpecialty(spec)}
                aria-pressed={specialty === spec}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  specialty === spec
                    ? 'bg-indigo-gray-900 border-indigo-gray-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600 mb-4">No doctors are listed right now.</p>
          <Link href="/doctors" className="inline-flex items-center gap-2 text-vibrant-blue font-semibold hover:underline">
            Browse all doctors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visible.map((doctor) => (
            <article key={doctor.id} className="rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden">
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
                  <h3 className="font-semibold text-indigo-gray-900 truncate" title={doctor.name}>{doctor.name}</h3>
                  {doctor.specialty && <p className="text-sm font-medium text-primary truncate">{doctor.specialty}</p>}
                  <p className="mt-1 text-sm text-slate-500 truncate">
                    {[doctor.hospital, doctor.experienceYears ? `${doctor.experienceYears} yrs experience` : null].filter(Boolean).join(' · ')}
                  </p>
                  {doctor.city && (
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5" /> {doctor.city}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <div>
                  <span className="text-sm text-slate-500">Booking fee </span>
                  <span className="font-semibold text-indigo-gray-900">{bookingFee}</span>
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
  )
}
