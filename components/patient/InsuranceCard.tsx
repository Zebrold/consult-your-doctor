"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { removePatientInsurance, savePatientInsurance } from "@/app/actions/patient-insurance";
import type { InsurancePolicy } from "@/lib/insurance";
import { formatShortDate } from "./format";
import { btnOutline, btnPrimary } from "./app-ui";

// The profile's Health insurance card, after the user's design: an "Add your insurance policy" box until a policy is
// saved, then the policy as a digital card the hospital desk can read off the phone. The hospitals the patient books
// also see it on their patient list (lib/insurance.ts).

type Props = {
  policy: InsurancePolicy | null;
  /** The patient's name, the default for the name on the policy. */
  patientName: string;
  /** False until supabase/migrations/20261103_patient_insurance.sql has run. */
  ready: boolean;
  /** Insurers the partner hospitals list, suggested while typing. */
  insurers: string[];
  /** Today in IST (yyyy-mm-dd), to flag an expired policy. */
  today: string;
};

export function InsuranceCard({ policy, patientName, ready, insurers, today }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () => {
    if (!confirmRemove) return setConfirmRemove(true);
    setError(null);
    start(async () => {
      const res = await removePatientInsurance();
      if (res.success) {
        setConfirmRemove(false);
        router.refresh();
      } else setError(res.error);
    });
  };

  if (!policy) {
    return (
      <>
        <div className="mt-1 rounded-[16px] bg-[#F3F6FC] px-4 py-5 text-center">
          <p className="text-[14.5px] font-extrabold">Add your insurance policy</p>
          <p className="mt-1 text-[12.5px] leading-normal text-[#5B667A]">Keep it as a digital insurance card and share it with the hospital when you visit.</p>
          <button type="button" onClick={() => setEditing(true)} disabled={!ready} className={`${btnPrimary} mt-3.5 w-full max-w-[320px]`}>
            <Plus className="w-4 h-4" strokeWidth={2.6} /> Add insurance details
          </button>
          {!ready && <p className="mt-2.5 text-[12px] text-[#B54708]">Insurance details open up after the next update.</p>}
        </div>
        {editing && <InsuranceDialog policy={null} patientName={patientName} insurers={insurers} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />}
      </>
    );
  }

  const expired = !!policy.validUntil && policy.validUntil < today;
  return (
    <>
      {/* The digital card */}
      <div className="relative isolate overflow-hidden mt-1 rounded-[18px] p-4 lg:p-5 text-white bg-[linear-gradient(135deg,#1E3BB3_0%,#2A4DD0_55%,#3D63E6_100%)] shadow-[0_12px_26px_-14px_rgba(42,77,208,0.7)]">
        <span aria-hidden className="absolute -z-10 -right-12 -top-16 w-48 h-48 rounded-full border-[26px] border-white/[0.07]" />
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[11px] font-extrabold tracking-[0.08em] text-[#C9D7FF]">HEALTH INSURANCE</span>
            <span className="block mt-0.5 text-[17px] font-extrabold leading-tight break-words">{policy.insurer}</span>
          </span>
          <span className="shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </span>
        </div>
        <span className="block mt-4 text-[11px] font-bold text-[#C9D7FF]">Policy number</span>
        <span className="block text-[19px] font-extrabold tracking-[0.06em] tabular-nums break-all">{policy.policyNumber}</span>
        <div className="mt-3.5 grid grid-cols-2 gap-3 text-[12.5px]">
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-[#C9D7FF]">Name on policy</span>
            <span className="block font-extrabold truncate">{policy.holderName || patientName}</span>
          </span>
          <span className="min-w-0 text-right">
            <span className="block text-[11px] font-bold text-[#C9D7FF]">{policy.memberId ? "Member ID" : "Valid until"}</span>
            <span className="block font-extrabold truncate">{policy.memberId ?? (policy.validUntil ? formatShortDate(policy.validUntil) : "Not added")}</span>
          </span>
        </div>
        {policy.memberId && policy.validUntil && (
          <p className="mt-2 text-[12px] text-[#DCE6FF]">Valid until {formatShortDate(policy.validUntil)}</p>
        )}
      </div>
      {expired && (
        <p className="mt-2.5 rounded-xl bg-[#FEF3F2] px-3.5 py-2.5 text-[12.5px] font-bold text-[#B42318]">This policy&apos;s validity date has passed. Update it if you&apos;ve renewed.</p>
      )}
      <p className="mt-2.5 text-[12px] leading-normal text-[#5B667A]">The hospitals you book see this at the desk. Claims and cashless approval are handled by the hospital and your insurer.</p>
      <div className="mt-3 flex gap-2.5">
        <button type="button" onClick={() => setEditing(true)} className={`${btnOutline} flex-1`}>
          <Pencil className="w-4 h-4" /> Edit
        </button>
        <button type="button" onClick={remove} disabled={pending} className={`${btnOutline} flex-1 text-[#B42318]! disabled:opacity-60`}>
          {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {confirmRemove ? "Tap again to remove" : "Remove"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2.5 text-[12.5px] font-bold text-[#B42318]">{error}</p>}
      {editing && <InsuranceDialog policy={policy} patientName={patientName} insurers={insurers} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />}
    </>
  );
}

const field =
  "w-full h-[46px] px-3.5 rounded-xl bg-white text-[15px] text-[#0B1B3F] shadow-[inset_0_0_0_1px_#D6DDE8] focus:shadow-[inset_0_0_0_1.5px_#2A4DD0] outline-none placeholder:text-[#8A94A6]";
const fieldLabel = "block mb-1.5 text-[12.5px] font-extrabold text-[#27324A]";

/** Add or change the policy: a sheet from the bottom on phones, a dialog on desktops. */
function InsuranceDialog({ policy, patientName, insurers, onClose, onSaved }: {
  policy: InsurancePolicy | null;
  patientName: string;
  insurers: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await savePatientInsurance({
        insurer: String(form.get("insurer") || ""),
        policyNumber: String(form.get("policy") || ""),
        holderName: String(form.get("holder") || ""),
        memberId: String(form.get("member") || ""),
        validUntil: String(form.get("valid") || ""),
      });
      if (res.success) onSaved();
      else setError(res.error);
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-[#0B1B3F]/45 font-(family-name:--font-manrope)" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insurance-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[500px] max-h-[92dvh] overflow-y-auto rounded-t-[24px] md:rounded-2xl bg-white text-[#0B1B3F] px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] md:p-6 shadow-[0_24px_60px_rgba(11,27,63,0.3)]"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="insurance-dialog-title" className="text-[19px] font-extrabold tracking-[-0.01em]">{policy ? "Edit insurance details" : "Add insurance details"}</h2>
            <p className="mt-0.5 text-[13px] text-[#5B667A]">As printed on your insurance card.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center hover:bg-[#F4F6FA]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="insurance-insurer" className={fieldLabel}>Insurance company</label>
            <input id="insurance-insurer" name="insurer" required minLength={2} maxLength={120} list="insurance-insurers" defaultValue={policy?.insurer ?? ""} placeholder="e.g. Star Health Insurance" autoComplete="off" className={field} />
            <datalist id="insurance-insurers">
              {insurers.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="insurance-policy" className={fieldLabel}>Policy number</label>
            <input id="insurance-policy" name="policy" required minLength={3} maxLength={60} defaultValue={policy?.policyNumber ?? ""} autoComplete="off" className={`${field} uppercase`} />
          </div>
          <div>
            <label htmlFor="insurance-holder" className={fieldLabel}>Name on the policy</label>
            <input id="insurance-holder" name="holder" maxLength={120} defaultValue={policy?.holderName ?? patientName} autoComplete="name" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="insurance-member" className={fieldLabel}>Member ID <span className="font-bold text-[#8A94A6]">(optional)</span></label>
              <input id="insurance-member" name="member" maxLength={60} defaultValue={policy?.memberId ?? ""} autoComplete="off" className={`${field} uppercase`} />
            </div>
            <div>
              <label htmlFor="insurance-valid" className={fieldLabel}>Valid until <span className="font-bold text-[#8A94A6]">(optional)</span></label>
              <input id="insurance-valid" name="valid" type="date" defaultValue={policy?.validUntil ?? ""} className={field} />
            </div>
          </div>
          <p className="text-[12px] leading-normal text-[#5B667A]">
            The hospitals you book see these details at the desk. Claims and cashless approval are handled by the hospital and your insurer.
          </p>

          {error && (
            <p role="alert" className="rounded-xl bg-[#FEF3F2] px-3.5 py-2.5 text-[13px] font-bold text-[#B42318]">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2.5 mt-1">
            <button type="button" onClick={onClose} className={`${btnOutline} h-[46px]!`}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={`${btnPrimary} h-[46px]! px-6!`}>
              {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
              {policy ? "Save changes" : "Save insurance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
