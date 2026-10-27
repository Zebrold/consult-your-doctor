"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Star } from "lucide-react";
import type { HomeDoctor } from "@/components/home/types";
import { doctorName, formatDayLabel, formatINR, initials } from "@/components/patient/format";
import { formatDistance } from "@/lib/geo";

const compactCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

/** A doctor in the phone lists: photo, name, specialty, rating or next slot, booking fee and Consult Now. */
export function DoctorCard({ doctor: d, km, now, bookingFee }: { doctor: HomeDoctor; km: number | null; now: number; bookingFee: number }) {
  const availableToday = d.openToday > 0;
  // Degrees (or the hospital when none are listed) and experience, as on the doctor's profile.
  const details = [d.qualifications || d.hospital, d.experience ? `${d.experience}+ Years Exp.` : null].filter(Boolean).join(" • ");
  const rated = d.reviewCount > 0 && d.rating !== null;
  return (
    <li className="flex items-center gap-2.5 min-[380px]:gap-3 p-3 rounded-[20px] bg-white border border-[#edf1f7] shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <Link href={`/doctors/${d.id}`} className="flex items-center gap-2.5 min-[380px]:gap-3 flex-1 min-w-0">
        <span className="relative w-14 h-14 min-[380px]:w-16 min-[380px]:h-16 shrink-0">
          <span className="absolute inset-0 rounded-full overflow-hidden bg-gradient-to-br from-primary-fixed to-surface-container flex items-center justify-center text-primary font-bold text-lg">
            {d.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.image} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(d.name)
            )}
          </span>
          {availableToday && <span aria-label="Available today" className="absolute right-0 bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-[2.5px] ring-white" />}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <span className="block font-title-md text-[15px] min-[380px]:text-[16px] font-bold text-indigo-gray-900 truncate">{doctorName(d.name)}</span>
          <span className="block mt-0.5 text-[13px] text-slate-500 truncate">{d.specialty || "Specialist"}</span>
          {details && <span className="block mt-1 text-[11px] text-slate-500 truncate">{details}</span>}
          <span className="mt-1.5 flex items-center gap-1.5 min-w-0">
            {rated ? (
              <Chip tone="green">
                <Star className="w-3 h-3 fill-current" strokeWidth={0} /> {d.rating!.toFixed(1)}
                {km == null && <span className="font-medium text-slate-500">({compactCount(d.reviewCount)})</span>}
              </Chip>
            ) : availableToday ? (
              <Chip tone="green"><CalendarDays className="w-3.5 h-3.5" /> Available today</Chip>
            ) : (
              <Chip tone="grey"><CalendarDays className="w-3.5 h-3.5" /> {d.nextSlot ? `Next: ${formatDayLabel(d.nextSlot, now)}` : "No open slots"}</Chip>
            )}
            {km != null && (
              <span className="flex items-center gap-0.5 text-[11.5px] font-medium text-slate-500 whitespace-nowrap">
                <MapPin className="w-3 h-3" /> {formatDistance(km)}
              </span>
            )}
          </span>
        </span>
      </Link>
      <span className="flex flex-col items-end gap-2 shrink-0">
        {d.bookable ? (
          <span className="flex flex-col items-end leading-none">
            <span className="font-title-md text-[18px] min-[380px]:text-[20px] font-extrabold tracking-tight text-vibrant-blue tabular-nums">{formatINR(bookingFee)}</span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-500">booking fee</span>
          </span>
        ) : null}
        <Link href={`/book/${d.id}`} className="h-9 px-2.5 min-[380px]:px-3.5 rounded-full bg-vibrant-blue text-white text-[12px] min-[380px]:text-[12.5px] font-semibold flex items-center gap-1 whitespace-nowrap shadow-[0_6px_14px_-6px_rgba(0,102,255,0.7)] active:scale-95 transition-transform">
          {/* The smallest phones get the short label so the doctor's name keeps its room. */}
          <span className="min-[360px]:hidden">Book</span>
          <span className="hidden min-[360px]:inline">Consult Now</span>
          <ArrowRight className="hidden min-[400px]:block w-3.5 h-3.5" />
        </Link>
      </span>
    </li>
  );
}

function Chip({ tone, children }: { tone: "green" | "grey"; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-semibold whitespace-nowrap min-w-0 truncate ${tone === "green" ? "bg-[#e8f8ef] text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}
