"use client";

import { useId } from "react";
import { Check, Clock, Zap } from "lucide-react";
import { sumPrices, type BookedTest, type BookingFees } from "@/lib/pricing";
import { formatINR } from "./format";
import { card } from "./app-ui";

// What a patient picks on top of the doctor and time (lib/booking-options.ts): fast track, and hospital services paid
// at the hospital. The hospital page and the booking page both show these, and the hospital page hands its picks to the
// booking page in the address.

/** The booking page for a doctor, with the time, appointment type and services already picked. */
export function bookingPath(doctorId: string, picks: { slotId?: string | null; fastTrack?: boolean; services?: string[] } = {}) {
  const q = new URLSearchParams();
  if (picks.slotId) q.set("slot", picks.slotId);
  if (picks.fastTrack) q.set("type", "fast_track");
  for (const s of picks.services ?? []) q.append("service", s);
  const query = q.toString();
  return `/book/${doctorId}${query ? `?${query}` : ""}`;
}

const section = `p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`;

/** General or fast track, each with its booking fee. */
export function AppointmentTypePicker({ fees, fastTrack, onChange }: { fees: BookingFees; fastTrack: boolean; onChange: (fastTrack: boolean) => void }) {
  const id = useId();
  const options = [
    { fast: false, icon: Clock, title: "General", sub: "Seen in turn, by your booked time", fee: fees.consultation },
    { fast: true, icon: Zap, title: "Fast track", sub: "Seen ahead of general patients once you check in", fee: fees.fastTrack },
  ];
  return (
    <section aria-labelledby={id} className={section}>
      <h2 id={id} className="text-[16px] font-extrabold">Appointment type</h2>
      <p className="mt-1 mb-3 text-[12.5px] text-[#5B667A]">Both are in person with the same doctor. Only the booking fee differs.</p>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((o) => {
          const on = o.fast === fastTrack;
          return (
            <button
              key={o.title}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.fast)}
              className={`flex items-start gap-3 p-3 lg:p-3.5 rounded-[14px] border-[1.5px] text-left transition-colors ${
                on ? "border-[#2A4DD0] bg-[#F7F9FF]" : "border-[#E1E7F0] bg-white hover:border-[#A9CBFF]"
              }`}
            >
              <span className={`shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center ${o.fast ? "bg-[#FFF4E5] text-[#B54708]" : "bg-[#EEF3FF] text-[#2A4DD0]"}`}>
                <o.icon className="w-[18px] h-[18px]" strokeWidth={2.3} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] lg:text-[14.5px] font-extrabold">{o.title}</span>
                  <span className="text-[14px] font-extrabold text-[#2A4DD0]">{formatINR(o.fee)}</span>
                </span>
                <span className="block mt-0.5 text-[12px] leading-snug text-[#5B667A]">{o.sub}</span>
              </span>
              <span aria-hidden className={`shrink-0 mt-2 w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center ${on ? "border-[#2A4DD0]" : "border-[#B7C1D1]"}`}>
                {on && <span className="w-2.5 h-2.5 rounded-full bg-[#2A4DD0]" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The hospital's priced services as checkboxes. They are paid at the hospital, so ticking one never changes the online fee. */
export function ServicePicker({ services, picked, onToggle }: { services: BookedTest[]; picked: string[]; onToggle: (name: string) => void }) {
  const id = useId();
  if (services.length === 0) return null;
  return (
    <section aria-labelledby={id} className={section}>
      <h2 id={id} className="text-[16px] font-extrabold">Choose services you need</h2>
      <p className="mt-1 mb-3 text-[12.5px] text-[#5B667A]">Optional. Prices are set by the hospital and paid there, not online.</p>
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-6">
        {services.map((s) => {
          const on = picked.includes(s.name);
          return (
            <label key={s.name} className="flex items-center gap-3 py-3 border-t border-[#EEF2F7] cursor-pointer">
              <input type="checkbox" checked={on} onChange={() => onToggle(s.name)} className="peer sr-only" />
              <span
                aria-hidden
                className={`shrink-0 w-[22px] h-[22px] rounded-[7px] border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#2A4DD0]/30 ${
                  on ? "border-[#2A4DD0] bg-[#2A4DD0] text-white" : "border-[#B7C1D1] bg-white"
                }`}
              >
                {on && <Check className="w-3.5 h-3.5" strokeWidth={3.2} />}
              </span>
              <span className="flex-1 min-w-0 text-[14px] font-bold">{s.name}</span>
              <span className="shrink-0 text-right">
                <span className="block text-[14px] font-extrabold">{formatINR(s.price)}</span>
                <span className="block text-[10.5px] font-bold text-[#5B667A]">at hospital</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

/** The summary's money box: the booking fee paid online, then what is paid at the hospital. */
export function PaySummary({ fee, fastTrack, services }: { fee: number; fastTrack: boolean; services: BookedTest[] }) {
  return (
    <div className="mt-2.5 px-3.5 py-1 rounded-[14px] bg-[#F6F8FC]">
      <PayLine title="Pay now online" sub={fastTrack ? "Fast-track booking fee" : "Booking fee"} value={formatINR(fee)} blue />
      <PayLine title="Pay at the hospital" sub="The consultation fee, set by the hospital" value="At the counter" />
      {services.length > 0 && (
        <PayLine title={`${services.length} service${services.length === 1 ? "" : "s"} at the hospital`} sub={services.map((s) => s.name).join(", ")} value={formatINR(sumPrices(services))} />
      )}
    </div>
  );
}

function PayLine({ title, sub, value, blue = false }: { title: string; sub: string; value: string; blue?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2.5 border-b last:border-b-0 border-[#E6EBF3] text-[13.5px]">
      <span className="min-w-0">
        <span className="block font-extrabold">{title}</span>
        <span className="block text-[12px] text-[#5B667A]">{sub}</span>
      </span>
      <span className={`shrink-0 font-extrabold text-right whitespace-nowrap ${blue ? "text-[#2A4DD0]" : ""}`}>{value}</span>
    </div>
  );
}
