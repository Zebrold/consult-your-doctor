"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { staffLogin } from "@/app/actions/auth";

// "Already a partner? Sign in": pick the portal, then the same Staff ID and password sign-in as the portal's own login
// page (staffLogin checks the account belongs to that portal). The password reset lives on those pages.

type Portal = {
  name: string;
  sub: string;
  chip: string;
  role: "hospital_admin" | "diagnostic_admin" | "doctor";
  login: string;
  image: { src: string; width: number; height: number };
};

const PORTALS: Portal[] = [
  {
    name: "Hospital",
    sub: "Doctors, slots, beds, walk-ins and finance",
    chip: "Admin & desk",
    role: "hospital_admin",
    login: "/login/hospital",
    image: { src: "/images/home/hospital-building.webp", width: 787, height: 357 },
  },
  {
    name: "Diagnostic centre",
    sub: "Test bookings, home collection and reports",
    chip: "Lab & collections",
    role: "diagnostic_admin",
    login: "/login/diagnostic",
    image: { src: "/images/home/lab-microscope.webp", width: 419, height: 395 },
  },
  {
    name: "Doctor",
    sub: "Appointments, prescriptions and patients",
    chip: "Schedule & prescriptions",
    role: "doctor",
    login: "/login/doctor",
    image: { src: "/images/home/doctor.webp", width: 376, height: 518 },
  },
];

const label = "block mb-[7px] text-[13px] font-extrabold text-[#27324A]";
const field = "flex items-center gap-2.5 h-[50px] px-3.5 rounded-xl border border-[#D6DDE8] bg-white focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-[#1D4ED8]/15 transition-shadow";

export function PartnerSignIn() {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [state, action, pending] = useActionState(staffLogin, null);
  const portal = PORTALS[index];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-[18px] lg:gap-7 items-start">
      <div role="radiogroup" aria-label="Choose your portal" className="grid gap-3 lg:gap-3.5">
        {PORTALS.map((p, i) => {
          const on = i === index;
          return (
            <button
              key={p.role}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setIndex(i)}
              className={`relative flex items-center gap-3 w-full min-h-[112px] lg:min-h-[124px] p-4 lg:px-5 lg:py-[18px] rounded-[18px] text-left text-[#0B1B3F] overflow-hidden transition-shadow ${
                on ? "bg-[#F3F6FF] shadow-[0_0_0_2px_#1D4ED8,0_1px_2px_rgba(11,27,63,0.04)]" : "bg-white shadow-[0_0_0_1px_#E6EBF3,0_1px_2px_rgba(11,27,63,0.04)] hover:shadow-[0_0_0_1px_#C9D5F2,0_1px_2px_rgba(11,27,63,0.04)]"
              }`}
            >
              <span className={`shrink-0 self-start mt-[3px] w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${on ? "border-[#1D4ED8]" : "border-[#C9D2E0]"}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${on ? "bg-[#1D4ED8]" : "bg-white"}`} />
              </span>
              <span className="flex-1 min-w-0 relative z-[1]">
                <span className="block text-[18px] lg:text-[20px] font-extrabold tracking-[-0.01em] uppercase">{p.name}</span>
                <span className="block mt-[3px] max-w-[190px] lg:max-w-[300px] text-[12.5px] leading-[1.45] text-[#5B667A]">{p.sub}</span>
                <span className="inline-block mt-2.5 px-2.5 py-[5px] rounded-lg bg-[#EEF3FF] text-[#1D4ED8] text-[11px] font-extrabold tracking-[0.04em] uppercase">{p.chip}</span>
              </span>
              <Image src={p.image.src} alt="" width={p.image.width} height={p.image.height} sizes="118px" className="shrink-0 w-[92px] h-[84px] lg:w-[118px] lg:h-24 object-contain object-right-bottom" />
            </button>
          );
        })}
      </div>

      <div className="px-[18px] py-6 lg:px-9 lg:py-[34px] rounded-[20px] bg-white shadow-[0_0_0_1px_#E6EBF3,0_12px_30px_rgba(11,27,63,0.06)]">
        <h3 className="text-[21px] lg:text-[24px] font-extrabold tracking-[-0.02em]">{portal.name} sign in</h3>
        <p className="mt-1.5 mb-[22px] text-[14px] leading-[1.5] text-[#5B667A]">Use the Staff ID and password our team shared with you.</p>

        <form action={action}>
          <input type="hidden" name="role" value={portal.role} />
          {state?.error && (
            <p role="alert" className="mb-4 p-3 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
              {state.error}
            </p>
          )}
          <label className="block">
            <span className={label}>Staff ID</span>
            <span className={field}>
              <input
                name="staffId"
                type="text"
                required
                autoComplete="username"
                placeholder="e.g. CYDAB1234"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-[#0B1B3F] uppercase placeholder:normal-case placeholder:text-[#8A94A6]"
              />
            </span>
          </label>
          <div className="mt-4">
            <span className={`${label} flex justify-between`}>
              <label htmlFor="partner-password">Password</label>
              <Link href={portal.login} className="font-extrabold text-[#1D4ED8] hover:underline underline-offset-4">
                Forgot password?
              </Link>
            </span>
            <span className={field}>
              <input
                id="partner-password"
                name="password"
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-[#0B1B3F]"
              />
              <button type="button" onClick={() => setShow(!show)} className="shrink-0 text-[13px] font-extrabold text-[#1D4ED8]">
                {show ? "Hide" : "Show"}
              </button>
            </span>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-[22px] w-full flex items-center justify-center gap-2.5 h-[52px] rounded-xl bg-[#1D4ED8] text-white text-[15.5px] font-extrabold hover:bg-[#1A45C2] disabled:opacity-70 transition-colors"
          >
            {pending ? <LoaderCircle className="w-[18px] h-[18px] animate-spin" /> : null}
            Sign in {!pending && <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.6} />}
          </button>
        </form>
        <p className="mt-4 text-center text-[13.5px] text-[#5B667A]">
          New to Consult your Doctor?{" "}
          <Link href="/signup" className="font-extrabold text-[#1D4ED8] hover:underline underline-offset-4">
            Apply to partner
          </Link>
        </p>
      </div>
    </div>
  );
}
