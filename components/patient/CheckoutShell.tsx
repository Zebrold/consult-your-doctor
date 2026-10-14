import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, type LucideIcon } from "lucide-react";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { PatientDock } from "@/components/PatientDock";
import { formatINR } from "@/components/patient/format";

/** The patient portal around a checkout page: the blue header, the page, and the navigation pill. */
export function CheckoutShell({ name, email, children }: { name: string | null; email: string | null; children: ReactNode }) {
  return (
    <div className="bg-background text-on-surface antialiased min-h-screen">
      <PatientNavHeader
        name={name}
        email={email}
        isSignedIn
        backHref="/patient/appointments"
        container="max-w-[1080px] px-margin-x-mobile lg:px-margin-x-desktop"
        eyebrow="Secure payment"
        title="Checkout"
        subtitle="Paid securely through PayU."
      />
      <main className="w-full px-margin-x-mobile lg:px-margin-x-desktop pt-5 md:pt-8 pb-dock">
        <div className="max-w-[1080px] mx-auto flex flex-col gap-6">
          {children}
        </div>
      </main>
      <PatientDock activeTab="book" name={name} />
    </div>
  );
}

export function CheckoutHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">{title}</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">{children}</p>
    </div>
  );
}

/** Booking details on the left, the payment summary on the right (stacked on phones). */
export function CheckoutGrid({ details, summary }: { details: ReactNode; summary: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-4 md:gap-6 items-start">
      {details}
      <aside className="lg:sticky lg:top-24">{summary}</aside>
    </div>
  );
}

export function CheckoutCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-5 md:p-6 flex flex-col gap-5">
      <h2 className="font-title-md text-title-md font-bold text-on-surface">{title}</h2>
      {children}
    </section>
  );
}

export function DetailRow({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="mt-0.5 font-semibold text-on-surface">{value}</p>
        {sub && <p className="text-sm text-on-surface-variant">{sub}</p>}
      </div>
    </div>
  );
}

/** The charges, the total and the pay button. */
export function PaymentSummary({ lines, total, children }: { lines: { label: string; amount: number }[]; total: number; children: ReactNode }) {
  return (
    <CheckoutCard title="Payment summary">
      <dl className="flex flex-col gap-3 text-[15px]">
        {lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-4">
            <dt className="text-on-surface-variant capitalize">{line.label}</dt>
            <dd className="font-semibold text-on-surface tabular-nums shrink-0">{formatINR(line.amount)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 pt-4 mt-1 border-t border-dashed border-outline-variant">
          <dt className="font-bold text-on-surface">Total payable</dt>
          <dd className="font-headline-lg text-2xl font-bold text-primary tabular-nums">{formatINR(total)}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-3">
        {children}
        <p className="flex items-center justify-center gap-1.5 text-xs text-on-surface-variant">
          <ShieldCheck className="w-4 h-4 text-fresh-teal" /> Paid securely through PayU
        </p>
      </div>
    </CheckoutCard>
  );
}

/** Shown instead of the checkout when the booking can't be paid (not found, already paid, cancelled). */
export function CheckoutMessage({ icon: Icon, tone = "neutral", title, children }: { icon: LucideIcon; tone?: "neutral" | "success" | "error"; title: string; children: ReactNode }) {
  const tint = tone === "success" ? "bg-secondary-container text-secondary" : tone === "error" ? "bg-error-container text-error" : "bg-primary-fixed text-primary";
  return (
    <section className="max-w-xl w-full mx-auto bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6 md:p-10 text-center flex flex-col items-center gap-4">
      <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tint}`}>
        <Icon className="w-7 h-7" />
      </span>
      <h1 className="font-title-md text-title-md md:text-2xl font-bold text-on-surface">{title}</h1>
      <p className="text-on-surface-variant">{children}</p>
      <Link href="/patient/appointments" className="mt-2 inline-flex items-center justify-center h-12 px-6 rounded-full bg-vibrant-blue text-on-primary font-semibold hover:bg-primary transition-colors">
        Go to my appointments
      </Link>
    </section>
  );
}
