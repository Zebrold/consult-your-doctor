"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

const SHOWN = 6;
/** The doctors-in-a-city page (same address as the sitemap's). */
const cityHref = (city: string) => `/doctors/in/${encodeURIComponent(city.toLowerCase())}`;

/** The footer's "Available in": the first cities, and More cities for the rest. */
export function FooterCities({ cities, linkClass }: { cities: string[]; linkClass: string }) {
  const [all, setAll] = useState(false);
  const list = all ? cities : cities.slice(0, SHOWN);
  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 md:grid-cols-1">
        {list.map((city) => (
          <li key={city}>
            <Link href={cityHref(city)} className={linkClass}>
              <ChevronRight className="w-[11px] h-[11px] md:w-3 md:h-3 shrink-0 text-[#B7C8F2]" strokeWidth={3} />
              {city}
            </Link>
          </li>
        ))}
      </ul>
      {cities.length > SHOWN && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll(!all)}
          className="inline-flex items-center gap-2.5 mt-2.5 h-[38px] px-3.5 rounded-[10px] border border-white/45 text-white text-[14px] font-bold hover:bg-white/10 transition-colors"
        >
          {all ? "Fewer cities" : "More cities"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${all ? "rotate-180" : ""}`} strokeWidth={2.5} />
        </button>
      )}
    </>
  );
}
