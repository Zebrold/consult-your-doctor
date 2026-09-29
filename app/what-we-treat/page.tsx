import type { Metadata } from "next";
import Link from "next/link";
import { Phone, TriangleAlert } from "lucide-react";
import { ConditionExplorer } from "@/components/ConditionExplorer";

export const metadata: Metadata = {
  title: "What We Treat Online",
  description:
    "From acute illnesses to chronic disease management and mental wellness, get diagnosis and prescriptions from licensed physicians online.",
};

const steps = [
  { title: "Select Care", desc: "Choose symptom or condition" },
  { title: "Video or Chat", desc: "Connect in 15 minutes" },
  { title: "Get Rx & Care", desc: "Pick up meds instantly" },
];

export default function WhatWeTreatPage() {
  return (
    <div className="w-full bg-indigo-gray-50">
      <ConditionExplorer />

      {/* How online diagnosis works */}
      <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-12">
        <div className="bg-surface-container-lowest rounded-3xl p-8 lg:p-12 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-3 max-w-lg">
            <span className="font-label-sm text-label-sm text-fresh-teal uppercase tracking-wider font-bold">Fast-Track Treatment</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900">How online diagnosis works in 3 easy steps</h2>
            <p className="font-body-md text-body-md text-indigo-gray-600">
              No waiting rooms or commutes. Connect seamlessly from your smartphone, tablet, or PC to consult with a licensed doctor.
            </p>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {steps.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-1">
                  <span className="w-8 h-8 rounded-full bg-surface-container text-primary font-bold flex items-center justify-center text-sm">{i + 1}</span>
                  <h3 className="font-title-md text-body-md font-bold text-indigo-gray-900">{step.title}</h3>
                  <p className="font-label-sm text-label-sm text-indigo-gray-600">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="w-full lg:w-96 flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-2xl">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                <circle className="text-surface-container-highest" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="8" />
                <circle className="text-fresh-teal" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeDasharray="264" strokeDashoffset="35" strokeLinecap="round" strokeWidth="8" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline-lg text-headline-lg font-extrabold text-indigo-gray-900">98.4%</span>
                <span className="font-label-sm text-label-sm text-indigo-gray-600">Resolved Online</span>
              </div>
            </div>
            <p className="text-center font-body-md text-body-md text-indigo-gray-900 font-medium mt-4">
              Over 420,000 satisfied patient consultations completed safely without hospital visits.
            </p>
          </div>
        </div>
      </section>

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
        <div className="relative overflow-hidden bg-gradient-to-r from-primary to-vibrant-blue text-on-primary rounded-3xl p-8 lg:p-12 shadow-xl shadow-primary/20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div aria-hidden className="absolute -right-10 -bottom-10 w-64 h-64 bg-on-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col gap-2 max-w-xl z-10">
            <span className="px-3 py-1 rounded-full bg-on-primary/15 font-label-sm text-label-sm self-start uppercase tracking-wider font-semibold">
              Don&apos;t see your condition listed?
            </span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold">Speak with a General Physician now</h2>
            <p className="font-body-md text-body-md text-on-primary/90">
              Our general practitioners can assess unlisted symptoms, conduct full triage, order custom diagnostic labs, or coordinate specialist referrals.
            </p>
          </div>
          <Link
            href="/search?type=doctor&q=general"
            className="z-10 w-full sm:w-auto shrink-0 text-center px-8 py-4 rounded-full bg-surface-container-lowest text-primary font-title-md text-body-md font-bold shadow-lg hover:bg-surface-bright transition-all hover:scale-[1.02]"
          >
            Consult a General Physician (From €20)
          </Link>
        </div>
      </section>
    </div>
  );
}
