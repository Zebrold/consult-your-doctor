"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { familyForBooking } from "@/app/actions/patient-health";
import { firstName } from "@/components/patient/format";

/** Who a booking is for, remembered in this browser by "Book for …" on Family members until a booking page reads it. */
export const BOOK_FOR_KEY = "cyd-book-for";

/**
 * "Who is this for?" on the booking pages: Me, or one of the family members on the account. Shows nothing for patients
 * without family members. The account holder still books, pays and gets the slip; the booking names the person.
 */
export function WhoFor({ signedIn, value, onChange }: { signedIn: boolean; value: string | null; onChange: (id: string | null) => void }) {
  const [members, setMembers] = useState<{ id: string; name: string; relation: string }[]>([]);
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    familyForBooking()
      .then((list) => {
        if (!live) return;
        setMembers(list);
        // "Book for Rahul" on Family members: start with them picked, once.
        try {
          const wanted = sessionStorage.getItem(BOOK_FOR_KEY);
          sessionStorage.removeItem(BOOK_FOR_KEY);
          if (wanted && list.some((m) => m.id === wanted)) onChange(wanted);
        } catch {}
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // onChange is a state setter from the booking page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  if (members.length === 0) return null;
  const picked = members.find((m) => m.id === value) ?? null;
  const chip = (on: boolean) =>
    `h-9 px-3.5 rounded-full text-[13px] font-extrabold border-[1.5px] transition-colors ${on ? "bg-[#2A4DD0] border-[#2A4DD0] text-white" : "bg-white border-[#D6DDE8] text-[#27324A] hover:bg-[#F4F6FA]"}`;
  return (
    <div className="mb-3.5 pb-3.5 border-b border-[#EEF2F7]">
      <span className="block mb-2 text-[13px] font-extrabold text-[#27324A]">Who is this for?</span>
      <div role="radiogroup" aria-label="Who is this for?" className="flex flex-wrap gap-2">
        <button type="button" role="radio" aria-checked={!value} onClick={() => onChange(null)} className={chip(!value)}>
          Me
        </button>
        {members.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={value === m.id} onClick={() => onChange(m.id)} className={chip(value === m.id)}>
            {firstName(m.name) || m.name} <span className={value === m.id ? "text-white/75" : "text-[#8A94A6]"}>· {m.relation}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[#5B667A]">
        {picked ? `The booking names ${picked.name}. Your contact details below get the slip and updates.` : "Booking for someone in your family? Pick them here."}{" "}
        <Link href="/patient/family" className="font-extrabold text-[#2A4DD0] hover:underline">
          Family members
        </Link>
      </p>
    </div>
  );
}
