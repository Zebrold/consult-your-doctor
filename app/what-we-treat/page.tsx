import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, TriangleAlert } from "lucide-react";
import { ConditionExplorer } from "@/components/ConditionExplorer";
import { CtaBand, SIDES, SitePage, btnGhost, btnWhite } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "What We Treat",
  description:
    "From everyday illnesses to long-term conditions and mental health: find the right specialist and book a visit at a partner hospital.",
};

export default function WhatWeTreatPage() {
  return (
    <SitePage>
      <ConditionExplorer />

      {/* Emergency safety notice */}
      <section className={`${SIDES} pb-12 md:pb-16`}>
        <div className="rounded-[20px] bg-[#FEF3F2] shadow-[0_0_0_1px_#FECDCA] p-5 md:p-7 flex flex-col md:flex-row items-start md:items-center gap-5">
          <span className="w-12 h-12 rounded-[14px] bg-[#D92D20] text-white flex items-center justify-center shrink-0 shadow-[0_8px_18px_rgba(217,45,32,0.25)]">
            <TriangleAlert className="w-6 h-6" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] md:text-[18px] font-extrabold text-[#7A271A]">When to seek emergency care</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D92D20] text-white text-[11.5px] font-extrabold uppercase tracking-[0.04em]">Call 108</span>
            </div>
            <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[#4A5878]">
              Booking a visit is for care that can wait for an appointment. If you or someone with you has <strong>sudden severe chest pain</strong>,{" "}
              <strong>extreme shortness of breath</strong>, <strong>signs of stroke</strong> (facial drooping, slurred speech), <strong>uncontrolled bleeding</strong> or{" "}
              <strong>severe injury</strong>, call 108 or go straight to the nearest emergency department.
            </p>
          </div>
          <a href="tel:108" className="shrink-0 inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-[#D92D20] text-white text-[15px] font-extrabold shadow-[0_8px_18px_rgba(217,45,32,0.25)] hover:bg-[#B42318] transition-colors">
            <Phone className="w-4 h-4" /> Call 108
          </a>
        </div>
      </section>

      <CtaBand
        title="Don't see your condition listed?"
        lead="A general physician can assess symptoms that aren't listed here, order tests, and refer you to the right specialist if you need one."
        actions={
          <>
            <Link href="/search?type=doctor&q=general" className={btnWhite}>
              Find a general physician <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
            </Link>
            <Link href="/contact" className={btnGhost}>
              Contact us
            </Link>
          </>
        }
      />
    </SitePage>
  );
}
