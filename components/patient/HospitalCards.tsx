import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/home/ui";
import type { HomeHospital } from "@/components/home/types";
import { formatDistance } from "@/lib/geo";
import { Dots, card } from "./app-ui";

/** What a hospital offers in a few words: its specialities, or "Multi-speciality" when it has three or more. */
export function hospitalTags(h: Pick<HomeHospital, "specialties">) {
  const names = h.specialties.map((s) => s.name);
  if (names.length >= 3) return `Multi-speciality · ${names.length} specialities`;
  return names.join(" · ") || "Hospital";
}

/** The area part of an address ("Jubilee Hills"), or the city. */
export function placeOf(h: Pick<HomeHospital, "address" | "city">) {
  const area = h.address?.split(",").map((p) => p.trim()).filter(Boolean)[0];
  return area && area.length <= 32 ? area : h.city || "Partner hospital";
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Photo({ h, className }: { h: HomeHospital; className: string }) {
  return h.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={h.image} alt={`Exterior of ${h.name}`} loading="lazy" className={`w-full h-full object-cover ${className}`} />
  ) : (
    <span className={`w-full h-full flex items-center justify-center bg-[linear-gradient(160deg,#F2F6FF,#DCE7FF)] text-[#2A4DD0] ${className}`}>
      <Building2 className="w-12 h-12" strokeWidth={1.5} />
    </span>
  );
}

/** The phone card: a photo with the name and rating over it, then what it offers, where it is and the way in. */
export function HospitalListCard({ hospital: h, km }: { hospital: HomeHospital; km: number | null }) {
  return (
    <Link href={`/hospitals/${h.id}`} className="group flex flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_0_0_1px_#E6EBF3]">
      <span className="relative block h-[140px] md:h-[160px] overflow-hidden">
        <Photo h={h} className="group-hover:scale-[1.03] transition-transform duration-300" />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,20,51,0)_45%,rgba(8,20,51,0.8)_100%)]" />
        <span className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0 text-white text-[16px] font-extrabold">
            <span className="truncate">{h.name}</span>
            <VerifiedBadge className="w-[15px] h-[15px]" />
          </span>
          {h.rating != null && (
            <span className="shrink-0 px-2 py-[3px] rounded-full border border-white/70 bg-[rgba(8,20,51,0.45)] text-white text-[11.5px] font-extrabold">
              <span className="sr-only">Rated </span>
              {h.rating.toFixed(1)} ★
            </span>
          )}
        </span>
      </span>
      <span className="flex flex-col gap-1.5 p-3">
        <span className="flex justify-between gap-2 text-[12.5px] text-[#4A5878]">
          <span className="truncate">{hospitalTags(h)}</span>
          <span className="shrink-0 flex items-center gap-[3px] max-w-[48%]">
            <MapPin className="w-3 h-3 text-[#7A8599] shrink-0" />
            <span className="truncate">{[placeOf(h), km != null ? formatDistance(km) : null].filter(Boolean).join(" · ")}</span>
          </span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <Dots items={[h.open247 && "Open 24/7", plural(h.doctors, "doctor"), !h.open247 && h.facility]} nowrap className="overflow-hidden" />
          <span className="shrink-0 flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0]">
            View hospital <ArrowRight className="w-[13px] h-[13px]" strokeWidth={2.6} />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** The desktop card: a photo with the rating on it, the name, what it offers and where, then a footer with Book. */
export function HospitalGridCard({ hospital: h, km }: { hospital: HomeHospital; km: number | null }) {
  return (
    <Link href={`/hospitals/${h.id}`} className={`group block overflow-hidden ${card}`}>
      <span className="relative block h-[150px] overflow-hidden">
        <Photo h={h} className="group-hover:scale-[1.03] transition-transform duration-300" />
        {h.rating != null && (
          <span className="absolute top-2.5 right-2.5 px-[9px] py-1 rounded-lg bg-white text-[12.5px] font-extrabold">
            <span className="sr-only">Rated </span>★ {h.rating.toFixed(1)}
          </span>
        )}
      </span>
      <span className="block px-4 pt-3.5 pb-4">
        <span className="flex items-center gap-1.5 text-[15px] font-extrabold min-w-0">
          <span className="truncate group-hover:text-[#2A4DD0] transition-colors">{h.name}</span>
          <VerifiedBadge className="w-[15px] h-[15px]" />
        </span>
        <span className="block mt-0.5 text-[13px] text-[#5B667A] truncate">
          {[h.specialties.length >= 3 ? "Multi-speciality" : h.specialties[0]?.name, placeOf(h), km != null ? formatDistance(km) : null].filter(Boolean).join(" · ")}
        </span>
        <span className="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-[#EEF2F7]">
          <span className="text-[12.5px] font-bold text-[#4A5878] truncate">{[h.open247 ? "Open 24/7" : null, plural(h.doctors, "doctor")].filter(Boolean).join(" · ")}</span>
          <span className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0]">Book →</span>
        </span>
      </span>
    </Link>
  );
}

