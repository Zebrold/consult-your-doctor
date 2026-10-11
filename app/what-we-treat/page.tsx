import type { Metadata } from "next";
import Link from "next/link";
import { Phone, TriangleAlert } from "lucide-react";
import { ConditionExplorer } from "@/components/ConditionExplorer";

export const metadata: Metadata = {
  title: "What We Treat",
  description:
    "From everyday illnesses to long-term conditions and mental health: find the right specialist and book a visit at a partner hospital.",
};

export default function WhatWeTreatPage() {
  return (
    <div className="w-full bg-indigo-gray-50">
      <ConditionExplorer />

      {/* Emergency safety notice */}
      <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pb-8">
        <div className="rounded-3xl bg-error-container/40 p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-error text-on-error flex items-center justify-center shrink-0 shadow-lg shadow-error/20">
            <TriangleAlert className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-title-md text-title-md font-bold text-on-error-container">When to Seek Emergency Care</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold uppercase">Immediate 112 / 911</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Telehealth is intended for non-emergent medical situations. If you or someone with you experiences <strong>sudden severe chest pain</strong>, <strong>extreme shortness of breath</strong>, <strong>signs of stroke</strong> (facial drooping, slurred speech), <strong>uncontrolled bleeding</strong>, or <strong>severe trauma</strong>, please call your local emergency services (112 or 911) or go directly to the nearest hospital Emergency Room.
            </p>
          </div>
          <a
            href="tel:112"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold shadow-md hover:opacity-90 transition-all"
          >
            <Phone className="w-4 h-4" />
            Call Emergency
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pb-16">
        <div className="relative overflow-hidden bg-primary text-on-primary rounded-2xl p-8 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-2 max-w-xl z-10">
            <p className="text-sm font-semibold text-on-primary/80">Don&apos;t see your condition listed?</p>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold">Start with a general physician</h2>
            <p className="font-body-md text-body-md text-on-primary/90">
              A general physician can assess symptoms that aren&apos;t listed here, order tests, and refer you to the right specialist if you need one.
            </p>
          </div>
          <Link
            href="/search?type=doctor&q=general"
            className="z-10 w-full sm:w-auto shrink-0 text-center px-6 py-3 rounded-lg bg-white text-primary text-[15px] font-semibold hover:bg-slate-100 transition-colors"
          >
            Find a general physician
          </Link>
        </div>
      </section>
    </div>
  );
}
