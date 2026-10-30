import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, type LucideIcon } from "lucide-react";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { PatientDock } from "@/components/PatientDock";
import { formatINR } from "@/components/patient/format";
import { RefundNote } from "@/components/patient/booking-ui";
import { PageBody, btnPrimary, card } from "@/components/patient/app-ui";

/** The patient portal around a checkout page: the blue header, the page, and the navigation pill. */
export function CheckoutShell({ name, email, children }: { name: string | null; email: string | null; children: ReactNode }) {
  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen font-(family-name:--font-manrope) text-[#0B1B3F]">
      <PatientNavHeader
        name={name}
        email={email}
        isSignedIn
        backHref="/patient/appointments"
        container="max-w-[900px] px-4 md:px-6"
        eyebrow="Secure payment"
        title="Checkout"
        subtitle="Paid securely online."
        deskHidden
      />
      <PageBody>
        <div className="max-w-[900px] lg:max-w-[1080px] mx-auto lg:mx-0 px-4 md:px-6 lg:px-0 pt-4 lg:pt-0 flex flex-col gap-4 lg:gap-5">
          <Link href="/patient/appointments" className="hidden lg:inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Back to my bookings
          </Link>
          {children}
        </div>
      </PageBody>
      <PatientDock activeTab="book" name={name} />
    </div>
  );
}

export function CheckoutHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[22px] lg:text-[26px] font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="text-[13.5px] lg:text-[14px] text-[#5B667A] max-w-2xl">{children}</p>
    </div>
  );
}

/** Booking details on the left, the payment summary on the right (stacked on phones). */
export function CheckoutGrid({ details, summary }: { details: ReactNode; summary: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-3.5 lg:gap-5 items-start">
      {details}
      <aside className="lg:sticky lg:top-[96px]">{summary}</aside>
    </div>
  );
}

export function CheckoutCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${card} rounded-[20px]! lg:rounded-2xl! p-4 lg:p-[22px] flex flex-col gap-4`}>
      <h2 className="text-[16px] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export function DetailRow({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="w-10 h-10 rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#5B667A]">{label}</p>
        <p className="mt-0.5 text-[14.5px] font-extrabold">{value}</p>
        {sub && <p className="text-[12.5px] text-[#5B667A]">{sub}</p>}
      </div>
    </div>
  );
}

/**
 * The booking fee, the online total and the pay button. `atVenue` is what the patient pays in person (the consultation
 * fee at the hospital counter, or the lab's test charges): shown below, never part of the total.
 */
export function PaymentSummary({ lines, total, atVenue, isConsultation, children }: {
  lines: { label: string; sub?: string; amount: number }[];
  total: number;
  atVenue?: ReactNode;
  isConsultation: boolean;
  children: ReactNode;
}) {
  return (
    <CheckoutCard title="Payment summary">
      <dl className="flex flex-col gap-3 text-[14px]">
        {lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-4">
            <dt className="text-[#27324A]">
              <span className="block font-bold">{line.label}</span>
              {line.sub && <span className="block text-[12px] text-[#5B667A] mt-0.5">{line.sub}</span>}
            </dt>
            <dd className="font-extrabold tabular-nums shrink-0">{formatINR(line.amount)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 pt-3.5 mt-1 border-t border-dashed border-[#D6DDE8]">
          <dt className="font-extrabold">Pay online now</dt>
          <dd className="text-[24px] font-extrabold text-[#2A4DD0] tabular-nums">{formatINR(total)}</dd>
        </div>
      </dl>
      {atVenue}
      <div className="flex flex-col gap-3">
        {children}
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-[#5B667A]">
          <ShieldCheck className="w-4 h-4 text-[#067647]" /> Paid securely online (UPI, Cards, NetBanking)
        </p>
        <RefundNote isConsultation={isConsultation} />
      </div>
    </CheckoutCard>
  );
}

/** Shown instead of the checkout when the booking can't be paid (not found, already paid, cancelled). */
export function CheckoutMessage({ icon: Icon, tone = "neutral", title, children }: { icon: LucideIcon; tone?: "neutral" | "success" | "error"; title: string; children: ReactNode }) {
  const tint = tone === "success" ? "bg-[#ECFDF3] text-[#067647]" : tone === "error" ? "bg-[#FEF3F2] text-[#B42318]" : "bg-[#EEF3FF] text-[#2A4DD0]";
  return (
    <section className={`max-w-xl w-full mx-auto ${card} rounded-[20px]! p-6 md:p-10 text-center flex flex-col items-center gap-3.5`}>
      <span className={`w-14 h-14 rounded-full flex items-center justify-center ${tint}`}>
        <Icon className="w-7 h-7" />
      </span>
      <h1 className="text-[20px] md:text-[24px] font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="text-[14px] text-[#5B667A]">{children}</p>
      <Link href="/patient/appointments" className={`${btnPrimary} mt-2 h-12! px-6!`}>
        Go to my appointments
      </Link>
    </section>
  );
}
