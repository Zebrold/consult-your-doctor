"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, House } from "lucide-react";
import { btnPrimary, card } from "@/components/patient/app-ui";
import { formatINR } from "@/components/patient/format";
import { byNearness, placeLabel, usePatientLocation } from "@/components/patient/location";

export type Checkup = {
  key: string;
  kind: string;
  name: string;
  centerId: string;
  centerName: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  price: number;
  /** What is paid online when booking: the booking fee plus the payment convenience fee. */
  payNow: number;
  doorstep: boolean;
  doorstepFee: number;
};

/** Check-up packages the labs list, nearest first, and the picked one with Book. */
export function CheckupPicker({ checkups, percentLabel }: { checkups: Checkup[]; percentLabel: string }) {
  const { location } = usePatientLocation();
  const sorted = byNearness(checkups, location).map((r) => r.item);
  const [picked, setPicked] = useState<string | null>(null);
  const [home, setHome] = useState(false);
  const current = sorted.find((c) => c.key === picked) ?? sorted[0] ?? null;
  const homeOn = home && !!current?.doorstep;
  const atLab = current ? current.price + (homeOn ? current.doorstepFee : 0) : 0;
  const href = current ? `/book/diagnostic/${current.centerId}?test=${encodeURIComponent(current.name)}${homeOn ? "&home=1" : ""}` : "/diagnostics";

  if (checkups.length === 0) {
    return (
      <div className={`${card} px-5 py-8 text-center lg:col-span-2`}>
        <FlaskConical className="w-6 h-6 mx-auto text-[#2A4DD0]" />
        <p className="mt-2 text-[15px] font-extrabold">No check-up packages listed yet</p>
        <p className="mt-1 text-[12.5px] text-[#5B667A]">Labs add their packages and prices themselves. You can still book single tests.</p>
        <Link href="/diagnostics" className={`${btnPrimary} mt-3.5`}>Find a lab</Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
        {location && <p className="text-[12.5px] text-[#5B667A]">Nearest to {placeLabel(location)} first.</p>}
        <div className="grid gap-3 lg:gap-3.5 md:grid-cols-2">
          {sorted.map((c) => {
            const on = current?.key === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setPicked(c.key)}
                aria-pressed={on}
                className={`text-left rounded-[18px] lg:rounded-2xl p-4 lg:p-5 transition-shadow ${on ? "bg-[#F5F8FF] shadow-[0_0_0_2px_#2A4DD0]" : "bg-white shadow-[0_0_0_1px_#E6EAF0] hover:shadow-[0_0_0_1px_#C9D4EA]"}`}
              >
                <span className="inline-block px-2 py-0.5 rounded-md bg-[#EEF3FF] text-[11px] font-extrabold text-[#2A4DD0]">{c.kind}</span>
                <span className="block mt-2 text-[15px] font-extrabold leading-snug">{c.name}</span>
                <span className="block mt-1 text-[12.5px] text-[#5B667A]">{[c.centerName, c.city].filter(Boolean).join(" · ")}</span>
                <span className="mt-3 flex items-end justify-between gap-2">
                  <span className="text-[18px] font-extrabold tabular-nums">{formatINR(c.price)}</span>
                  {c.doorstep && (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#067647]">
                      <House className="w-3.5 h-3.5" /> Home collection
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <section className={`${card} p-4 lg:p-[22px] lg:sticky lg:top-[96px]`}>
          <h2 className="text-[16px] font-extrabold">Your booking</h2>
          <p className="mt-2 text-[14.5px] font-extrabold">{current.name}</p>
          <p className="text-[12.5px] text-[#5B667A]">{[current.centerName, current.city].filter(Boolean).join(" · ")}</p>
          {current.doorstep && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#F3F6FC] px-3.5 py-3">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold">Home sample collection</span>
                <span className="block text-[12px] text-[#5B667A]">{formatINR(current.doorstepFee)} extra, paid at the lab</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={homeOn}
                aria-label="Home sample collection"
                onClick={() => setHome((v) => !v)}
                className={`relative shrink-0 w-11 h-[26px] rounded-full transition-colors ${homeOn ? "bg-[#2A4DD0]" : "bg-[#C9D2E0]"}`}
              >
                <span className={`absolute top-[2px] w-[22px] h-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(11,27,63,0.25)] transition-[left] ${homeOn ? "left-[20px]" : "left-[2px]"}`} />
              </button>
            </div>
          )}
          <div className="mt-3">
            <div className="flex justify-between gap-3 py-2 text-[13.5px]">
              <span className="text-[#5B667A]">Package price</span>
              <span className="font-extrabold tabular-nums">{formatINR(current.price)}</span>
            </div>
            <div className="flex justify-between gap-3 py-2 border-t border-[#EEF2F7] text-[13.5px]">
              <span className="text-[#5B667A]">Pay now online</span>
              <span className="font-extrabold tabular-nums text-[#2A4DD0]">{formatINR(current.payNow)}</span>
            </div>
            <div className="flex justify-between gap-3 py-2 border-t border-[#EEF2F7] text-[13.5px]">
              <span className="text-[#5B667A]">Pay at the lab</span>
              <span className="font-extrabold tabular-nums">{formatINR(atLab)}</span>
            </div>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-normal text-[#5B667A]">Online you pay the booking fee ({percentLabel} of the price) and the payment fee. The package price is paid to the lab.</p>
          <Link href={href} className={`${btnPrimary} mt-3.5 w-full h-[50px]! text-[15px]!`}>
            Choose a date and book
          </Link>
          <p className="mt-2 text-[11.5px] text-[#8A94A6]">Ask the lab about fasting before the test.</p>
        </section>
      )}
    </>
  );
}
