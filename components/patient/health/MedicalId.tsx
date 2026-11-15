import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { card } from "@/components/patient/app-ui";
import { ageFrom } from "@/components/patient/format";
import type { HealthDetails } from "@/lib/patient-health";
import type { InsurancePolicy } from "@/lib/insurance";

/** What paramedics and hospitals need to know: name, age, blood group, allergies, conditions, medicines, insurance. */
export function MedicalId({ name, details, policy, now, className = "" }: { name: string; details: HealthDetails; policy: InsurancePolicy | null; now: number; className?: string }) {
  const age = ageFrom(details.dateOfBirth, now);
  const rows: [string, React.ReactNode][] = [
    ["Name", [name, age != null ? `${age} yrs` : null, details.gender].filter(Boolean).join(" · ")],
    ["Blood group", details.bloodGroup ?? <Missing />],
    ["Allergies", details.allergies ? <span className="text-[#B42318]">{details.allergies}</span> : <Missing />],
    ["Conditions", details.conditions ?? <Missing />],
    ["Medicines", details.currentMedicines ?? <Missing />],
    ["Insurance", policy ? `${policy.insurer} · ${policy.policyNumber}` : "Not added"],
    ["Emergency contact", details.emergency ? [details.emergency.name, details.emergency.relation?.toLowerCase()].filter(Boolean).join(" · ") : <Missing />],
  ];
  return (
    <section className={`${card} p-4 lg:p-[22px] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-extrabold">Medical ID</h2>
          <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">What paramedics and hospitals need to know</p>
        </div>
        <Link href="/patient/profile#medical" className="shrink-0 flex items-center gap-0.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
          Edit <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.6} />
        </Link>
      </div>
      <div className="mt-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5 lg:py-[11px] border-t border-[#EEF2F7] first:border-t-0 text-[13px] lg:text-[13.5px]">
            <span className="shrink-0 text-[#5B667A]">{label}</span>
            <span className="min-w-0 text-right font-extrabold break-words">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Missing() {
  return <span className="font-bold text-[#8A94A6]">Not added</span>;
}
