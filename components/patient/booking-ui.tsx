"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, CircleAlert, CreditCard, LogIn, Mail, Phone } from "lucide-react";

export type PatientDetails = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
};

export const emptyPatient: PatientDetails = { name: "", phone: "", email: "", dateOfBirth: "", gender: "" };

/** Client-side check before submitting; the server repeats it. */
export function patientDetailsError(p: PatientDetails) {
  if (!p.name.trim()) return "Please enter the patient's full name.";
  if (p.phone.replace(/\D/g, "").length < 10) return "Please enter a valid mobile number so we can reach you about the booking.";
  return null;
}

export function appendPatientDetails(form: FormData, p: PatientDetails) {
  form.append("patient_name", p.name.trim());
  form.append("patient_phone", p.phone.trim());
  if (p.dateOfBirth) form.append("date_of_birth", p.dateOfBirth);
  if (p.gender) form.append("gender", p.gender);
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-label-sm text-label-sm text-indigo-gray-600 mb-2 flex-wrap">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-outline-variant" />}
          {item.href ? (
            <Link className="hover:text-vibrant-blue transition-colors" href={item.href}>{item.label}</Link>
          ) : i === items.length - 1 ? (
            <span className="text-vibrant-blue font-semibold" aria-current="page">{item.label}</span>
          ) : (
            <span>{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export function StepCard({ step, title, aside, children }: { step: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-label-sm text-label-sm font-bold shrink-0">{step}</span>
          <h2 className="font-title-md text-body-lg font-bold text-on-surface">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 transition-all";

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="font-label-sm text-label-sm font-semibold text-indigo-gray-600">{label}</span>
      {children}
    </label>
  );
}

export function PatientDetailsFields({ value, onChange, maxDate }: { value: PatientDetails; onChange: (next: PatientDetails) => void; maxDate: string }) {
  const set = (key: keyof PatientDetails) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <Field label="Full Legal Name" className="sm:col-span-6">
          <input className={inputClass} type="text" autoComplete="name" required value={value.name} onChange={set("name")} placeholder="As on your ID" />
        </Field>
        <Field label="Date of Birth" className="sm:col-span-3">
          <input className={inputClass} type="date" max={maxDate} value={value.dateOfBirth} onChange={set("dateOfBirth")} />
        </Field>
        <Field label="Sex" className="sm:col-span-3">
          <select className={inputClass} value={value.gender} onChange={set("gender")}>
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Mobile Number (for booking updates)">
          <span className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-outline pointer-events-none" />
            <input className={`${inputClass} pl-10`} type="tel" autoComplete="tel" required value={value.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
          </span>
        </Field>
        <Field label="Email (for the payment receipt)">
          <span className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-outline pointer-events-none" />
            <input className={`${inputClass} pl-10`} type="email" autoComplete="email" value={value.email} onChange={set("email")} placeholder="Optional" />
          </span>
        </Field>
      </div>
      <p className="text-[12px] text-indigo-gray-600">Your name, mobile number, date of birth and sex are saved to your profile and shared with the provider for this booking.</p>
    </div>
  );
}

export function DayStrip({
  days,
  selected,
  onSelect,
  badge,
}: {
  days: { key: string; weekday: string; day: string }[];
  selected: string;
  onSelect: (key: string) => void;
  /** Small note under each date, e.g. how many slots are open. */
  badge?: (key: string) => { text: string; tone: "open" | "none" | "full" };
}) {
  return (
    <div className="flex sm:grid sm:grid-cols-6 gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map((d) => {
        const active = d.key === selected;
        const b = badge?.(d.key) ?? { text: "", tone: "none" as const };
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onSelect(d.key)}
            aria-pressed={active}
            className={`flex flex-col items-center min-w-[64px] py-3 px-2 rounded-xl transition-all text-center ${
              active ? "bg-vibrant-blue text-on-primary shadow-md" : "bg-surface-container-low text-on-surface hover:bg-surface-variant"
            }`}
          >
            <span className={`font-label-sm text-label-sm uppercase font-semibold ${active ? "opacity-80" : "text-outline"}`}>{d.weekday}</span>
            <span className="font-title-md text-body-lg font-bold mt-0.5">{d.day}</span>
            <span
              className={`font-label-sm text-[10px] font-medium mt-1 ${
                active ? "bg-surface-container-lowest/20 px-2 py-0.5 rounded-full" : b.tone === "open" ? "text-secondary" : "text-outline"
              }`}
            >
              {active ? "Selected" : b.text || "\u00a0"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SummaryRow({ label, sub, value, tone }: { label: string; sub?: string; value: string; tone?: "free" }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="block text-indigo-gray-600 leading-snug">{label}</span>
        {sub && <span className="block font-label-sm text-label-sm text-outline mt-0.5">{sub}</span>}
      </div>
      <span className={`font-semibold shrink-0 ${tone === "free" ? "text-secondary" : "text-on-surface"}`}>{value}</span>
    </div>
  );
}

export function PayuNote() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
      <span className="w-9 h-9 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center shrink-0 shadow-sm">
        <CreditCard className="w-[18px] h-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="font-label-sm text-[12px] font-bold text-on-surface">Pay securely with PayU</p>
        <p className="font-label-sm text-[11px] text-indigo-gray-600">UPI, cards or net banking on the next screen</p>
      </div>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="p-3 rounded-xl bg-error-container/60 text-on-error-container text-sm flex items-start gap-2">
      <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function SignInToBook({ next }: { next: string }) {
  return (
    <Link
      href={`/login/patient?next=${encodeURIComponent(next)}`}
      className="w-full py-4 px-6 rounded-full bg-vibrant-blue text-on-primary font-title-md text-body-lg font-bold shadow-lg shadow-vibrant-blue/25 hover:bg-primary transition-all flex items-center justify-center gap-2"
    >
      <LogIn className="w-5 h-5" /> Sign in to Book
    </Link>
  );
}
