"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Download, FileText, LoaderCircle, Paperclip, Pencil, Plus, Share2, ShieldCheck, Trash2 } from "lucide-react";
import { btnOutline, btnPrimary, card } from "@/components/patient/app-ui";
import { formatINR, formatShortDate } from "@/components/patient/format";
import { byNearness, placeLabel, usePatientLocation } from "@/components/patient/location";
import { InsuranceDialog } from "@/components/patient/InsuranceCard";
import { formatDistance } from "@/lib/geo";
import { addClaimDocument, removeClaim, saveInsuranceDetails, startClaim, updateClaim } from "@/app/actions/patient-health";
import { PLAN_LABEL, type InsurancePolicy } from "@/lib/insurance";
import { Chips, Dialog, DialogButtons, ErrorNote, field, fieldLabel, NotReady, optional, useAction } from "./kit";

/** The policy as a card, with Show at hospital (a large, high-contrast view for the desk) and Edit. */
export function PolicyCard({ policy, members, patientName, insurers, today }: { policy: InsurancePolicy; members: string; patientName: string; insurers: string[]; today: string }) {
  const router = useRouter();
  const [showing, setShowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const expired = !!policy.validUntil && policy.validUntil < today;
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState<{ text: string; bad?: boolean } | null>(null);
  // Shares the PDF where the phone can share files, else the card details as text, else copies those details.
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    setShareNote(null);
    const title = "Health insurance card";
    const text = [
      `Insurer: ${policy.insurer}`,
      `Policy number: ${policy.policyNumber}`,
      `Name on policy: ${policy.holderName || patientName}`,
      policy.memberId ? `Member ID: ${policy.memberId}` : null,
      policy.validUntil ? `Valid till: ${formatShortDate(policy.validUntil)}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      let file: File | null = null;
      if (typeof navigator.canShare === "function") {
        const res = await fetch("/api/patient/insurance-card", { cache: "no-store" });
        if (res.ok) file = new File([await res.blob()], "Insurance_Card.pdf", { type: "application/pdf" });
      }
      if (file && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title });
      else if (typeof navigator.share === "function") await navigator.share({ title, text });
      else {
        await navigator.clipboard.writeText(text);
        setShareNote({ text: "Card details copied" });
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setShareNote({ text: "Couldn’t share. Download the card instead.", bad: true });
    } finally {
      setSharing(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="relative isolate overflow-hidden rounded-[20px] p-5 lg:p-6 text-white bg-[linear-gradient(135deg,#1E3BB3_0%,#2A4DD0_55%,#3D63E6_100%)] shadow-[0_14px_30px_-16px_rgba(42,77,208,0.8)]">
        <span aria-hidden className="absolute -z-10 -right-14 -top-20 w-56 h-56 rounded-full border-[30px] border-white/[0.07]" />
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] font-extrabold">
            <ShieldCheck className="w-[18px] h-[18px]" /> Health insurance
          </span>
          {policy.planType && <span className="px-2.5 py-1 rounded-full bg-white/15 text-[10.5px] font-extrabold tracking-[0.08em] uppercase">{PLAN_LABEL[policy.planType]}</span>}
        </div>
        <span className="block mt-5 text-[10.5px] font-extrabold tracking-[0.08em] text-[#C9D7FF]">INSURED</span>
        <span className="block text-[15px] font-extrabold">{members}</span>
        <span className="block mt-3 text-[10.5px] font-extrabold tracking-[0.08em] text-[#C9D7FF]">POLICY NUMBER</span>
        <span className="block text-[20px] font-extrabold tracking-[0.06em] tabular-nums break-all">{policy.policyNumber}</span>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <span className="min-w-0">
            <span className="block text-[10.5px] font-extrabold tracking-[0.08em] text-[#C9D7FF]">INSURER</span>
            <span className="block text-[13.5px] font-extrabold truncate">{policy.insurer}</span>
          </span>
          <span className="min-w-0 text-right">
            <span className="block text-[10.5px] font-extrabold tracking-[0.08em] text-[#C9D7FF]">{policy.validUntil ? "VALID TILL" : "MEMBER ID"}</span>
            <span className="block text-[13.5px] font-extrabold truncate">{policy.validUntil ? formatShortDate(policy.validUntil) : policy.memberId ?? "Not added"}</span>
          </span>
        </div>
      </div>
      {expired && <p className="rounded-xl bg-[#FEF3F2] px-3.5 py-2.5 text-[12.5px] font-bold text-[#B42318]">This policy&apos;s validity date has passed. Update it if you&apos;ve renewed.</p>}
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => setShowing(true)} className={btnPrimary}>Show at hospital</button>
        <a href="/api/patient/insurance-card" download className={btnOutline}>
          <Download className="w-4 h-4" /> Download card
        </a>
        <button type="button" onClick={share} disabled={sharing} className={`${btnOutline} disabled:opacity-60`}>
          {sharing ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} {sharing ? "Preparing…" : "Share card"}
        </button>
        <button type="button" onClick={() => setEditing(true)} className={btnOutline}>
          <Pencil className="w-4 h-4" /> Edit card
        </button>
      </div>
      {shareNote && (
        <p role={shareNote.bad ? "alert" : "status"} className={`text-[12.5px] font-bold ${shareNote.bad ? "text-[#B42318]" : "text-[#067647]"}`}>
          {shareNote.text}
        </p>
      )}
      {showing && (
        <Dialog title="Show this at the hospital desk" sub="Hand over your phone, or read out the details." onClose={() => setShowing(false)}>
          <div className="rounded-2xl bg-[#0B1B3F] text-white p-5">
            {[
              ["Insurer", policy.insurer],
              ["Policy number", policy.policyNumber],
              ["Name on policy", policy.holderName || patientName],
              ["Member ID", policy.memberId],
              ["Valid till", policy.validUntil ? formatShortDate(policy.validUntil) : null],
              ["TPA", [policy.tpaName, policy.tpaPhone].filter(Boolean).join(" · ") || null],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="py-2.5 border-t border-white/10 first:border-t-0">
                  <span className="block text-[11.5px] font-bold text-[#AFC2FF]">{label}</span>
                  <span className="block text-[20px] font-extrabold tracking-[0.03em] break-all">{value}</span>
                </div>
              ))}
          </div>
          <p className="mt-3 text-[12.5px] text-[#5B667A]">Also carry the insurer&apos;s card or e-card and a photo ID. The hospital&apos;s insurance desk asks your insurer for cashless approval.</p>
        </Dialog>
      )}
      {editing && <InsuranceDialog policy={policy} patientName={patientName} insurers={insurers} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />}
    </div>
  );
}

/** "Add a policy" for patients without one. */
export function AddPolicyButton({ patientName, insurers, ready, className = "" }: { patientName: string; insurers: string[]; ready: boolean; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={!ready} className={`${btnPrimary} ${className}`}>
        <Plus className="w-4 h-4" strokeWidth={2.6} /> Add a policy
      </button>
      {open && <InsuranceDialog policy={null} patientName={patientName} insurers={insurers} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} />}
    </>
  );
}

/** Edit the policy's details: plan, sum insured, room rent, co-payment, TPA, and which family members it covers. */
export function PolicyDetailsButton({ policy, members, ready }: { policy: InsurancePolicy; members: { id: string; name: string }[]; ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(policy.planType);
  const [covered, setCovered] = useState<string[]>(policy.coveredMemberIds);
  const { pending, error, run } = useAction();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const sum = String(f.get("sum") ?? "").replace(/[,\s₹]/g, "");
    run(
      () =>
        saveInsuranceDetails({
          planType: plan,
          sumInsured: sum ? Number(sum) : null,
          tpaName: String(f.get("tpa") ?? ""),
          tpaPhone: String(f.get("tpaPhone") ?? ""),
          roomRent: String(f.get("room") ?? ""),
          coPayment: String(f.get("copay") ?? ""),
          coveredMemberIds: covered,
        }),
      () => setOpen(false),
    );
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={!ready} className="shrink-0 flex items-center gap-1 text-[13px] font-extrabold text-[#2A4DD0] hover:underline disabled:opacity-50 disabled:no-underline">
        <Pencil className="w-3.5 h-3.5" /> Edit details
      </button>
      {open && (
        <Dialog title="Policy details" sub="As written in your policy document." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <div>
              <span className={fieldLabel}>Type of plan</span>
              <Chips
                label="Type of plan"
                options={(Object.keys(PLAN_LABEL) as NonNullable<InsurancePolicy["planType"]>[]).map((k) => ({ value: k, label: PLAN_LABEL[k] }))}
                value={plan ? [plan] : []}
                onChange={(v) => setPlan(v === plan ? null : v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pd-sum" className={fieldLabel}>Sum insured (₹)</label>
                <input id="pd-sum" name="sum" inputMode="numeric" defaultValue={policy.sumInsured ?? ""} placeholder="500000" className={field} />
              </div>
              <div>
                <label htmlFor="pd-copay" className={fieldLabel}>Co-payment {optional}</label>
                <input id="pd-copay" name="copay" maxLength={80} defaultValue={policy.coPayment ?? ""} placeholder="e.g. None, or 10%" className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="pd-room" className={fieldLabel}>Room rent limit {optional}</label>
              <input id="pd-room" name="room" maxLength={80} defaultValue={policy.roomRent ?? ""} placeholder="e.g. Single private room" className={field} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pd-tpa" className={fieldLabel}>TPA {optional}</label>
                <input id="pd-tpa" name="tpa" maxLength={120} defaultValue={policy.tpaName ?? ""} className={field} />
              </div>
              <div>
                <label htmlFor="pd-tpa-phone" className={fieldLabel}>TPA helpline {optional}</label>
                <input id="pd-tpa-phone" name="tpaPhone" type="tel" maxLength={16} defaultValue={policy.tpaPhone ?? ""} className={field} />
              </div>
            </div>
            {members.length > 0 && (
              <div>
                <span className={fieldLabel}>Family members on this policy</span>
                <Chips label="Family members on this policy" options={members.map((m) => ({ value: m.id, label: m.name }))} value={covered} onChange={(id) => setCovered((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))} />
              </div>
            )}
            <ErrorNote error={error} />
            <DialogButtons onCancel={() => setOpen(false)} pending={pending} label="Save details" />
          </form>
        </Dialog>
      )}
    </>
  );
}

// --- Claims the patient keeps track of ---------------------------------------------------------------------------------

export type Claim = {
  id: string;
  number: string | null;
  type: "cashless" | "reimbursement";
  hospital: string;
  treatedOn: string | null;
  createdAt: string;
  amount: number | null;
  settled: number | null;
  status: keyof typeof CLAIM_STATUS;
  documents: { name: string; url: string | null }[];
};

const CLAIM_STATUS = {
  preparing: { label: "Preparing", color: "#5B667A" },
  submitted: { label: "Submitted", color: "#2A4DD0" },
  in_review: { label: "In review", color: "#B54708" },
  documents_needed: { label: "Documents needed", color: "#B42318" },
  approved: { label: "Approved", color: "#067647" },
  settled: { label: "Settled", color: "#067647" },
  rejected: { label: "Rejected", color: "#B42318" },
} as const;

function StatusPill({ status }: { status: Claim["status"] }) {
  const s = CLAIM_STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold whitespace-nowrap" style={{ color: s.color }}>
      <span aria-hidden className="w-[7px] h-[7px] rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

/** The claims, newest first, each opening to its documents, status and amount settled. */
export function ClaimsList({ claims, ready }: { claims: Claim[]; ready: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <h2 className="text-[16px] font-extrabold">Your claims</h2>
      <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">Keep track of the claims you send to your insurer, from first papers to settlement</p>
      {!ready ? (
        <div className="mt-3"><NotReady>The claim tracker opens up after the next update.</NotReady></div>
      ) : claims.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#F3F6FC] px-4 py-3.5 text-[13px] text-[#5B667A]">No claims yet. Start one below to keep the documents and the status in one place.</p>
      ) : (
        <div className="mt-3">
          <div className="hidden lg:grid grid-cols-[1fr_110px_minmax(0,1.4fr)_120px_110px_150px_70px] gap-4 px-3.5 py-2.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold text-[#5B667A]">
            <span>Claim</span>
            <span>Date</span>
            <span>Hospital or lab</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Status</span>
            <span />
          </div>
          {claims.map((c) => (
            <div key={c.id} className="border-t lg:border-t-0 lg:border-b border-[#EEF2F7] first:border-t-0">
              <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="w-full text-left grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_110px_minmax(0,1.4fr)_120px_110px_150px_70px] gap-x-4 gap-y-0.5 py-3 lg:px-3.5 text-[13.5px] items-center">
                <span className="lg:hidden min-w-0">
                  <span className="block text-[14px] font-extrabold truncate">{c.hospital}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">
                    {[c.number, c.type === "cashless" ? "Cashless" : "Reimbursement", formatShortDate(c.treatedOn ? `${c.treatedOn}T12:00:00+05:30` : c.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="lg:hidden flex flex-col items-end gap-1">
                  <span className="text-[14px] font-extrabold tabular-nums">{c.amount != null ? formatINR(c.amount) : "–"}</span>
                  <StatusPill status={c.status} />
                </span>
                <span className="hidden lg:block font-extrabold truncate">{c.number ?? "No claim number yet"}</span>
                <span className="hidden lg:block text-[13.5px]">{formatShortDate(c.treatedOn ? `${c.treatedOn}T12:00:00+05:30` : c.createdAt)}</span>
                <span className="hidden lg:block text-[13.5px] truncate">{c.hospital}</span>
                <span className="hidden lg:block">{c.type === "cashless" ? "Cashless" : "Reimbursement"}</span>
                <span className="hidden lg:block font-extrabold tabular-nums">{c.amount != null ? formatINR(c.amount) : "–"}</span>
                <span className="hidden lg:block"><StatusPill status={c.status} /></span>
                <span className="hidden lg:flex items-center gap-1 text-[13px] font-extrabold text-[#2A4DD0]">
                  Details <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open === c.id ? "rotate-180" : ""}`} />
                </span>
              </button>
              {open === c.id && <ClaimDetails claim={c} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ClaimDetails({ claim }: { claim: Claim }) {
  const [status, setStatus] = useState(claim.status);
  const [confirm, setConfirm] = useState(false);
  const save = useAction();
  const upload = useAction();
  const del = useAction();
  return (
    <div className="mb-3 rounded-2xl bg-[#F7F9FC] p-4 flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3 text-[13px] lg:hidden">
        <span><span className="block text-[11.5px] font-bold text-[#5B667A]">Type</span><span className="font-extrabold">{claim.type === "cashless" ? "Cashless" : "Reimbursement"}</span></span>
        <span><span className="block text-[11.5px] font-bold text-[#5B667A]">Amount</span><span className="font-extrabold">{claim.amount != null ? formatINR(claim.amount) : "–"}</span></span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const settled = String(f.get("settled") ?? "").replace(/[,\s₹]/g, "");
          save.run(() => updateClaim({ id: claim.id, status, claimNumber: String(f.get("number") ?? ""), settledAmount: settled ? Number(settled) : null }));
        }}
        className="grid gap-3 md:grid-cols-3 items-end"
      >
        <div>
          <label htmlFor={`cs-${claim.id}`} className={fieldLabel}>Status</label>
          <select id={`cs-${claim.id}`} value={status} onChange={(e) => setStatus(e.target.value as Claim["status"])} className={field}>
            {(Object.keys(CLAIM_STATUS) as Claim["status"][]).map((s) => (
              <option key={s} value={s}>{CLAIM_STATUS[s].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`cn-${claim.id}`} className={fieldLabel}>Claim number</label>
          <input id={`cn-${claim.id}`} name="number" maxLength={60} defaultValue={claim.number ?? ""} className={field} />
        </div>
        {(status === "approved" || status === "settled") && (
          <div>
            <label htmlFor={`ca-${claim.id}`} className={fieldLabel}>Amount {status === "settled" ? "settled" : "approved"} (₹)</label>
            <input id={`ca-${claim.id}`} name="settled" inputMode="numeric" defaultValue={claim.settled ?? ""} className={field} />
          </div>
        )}
        <button type="submit" disabled={save.pending} className={`${btnPrimary} md:col-start-3`}>Save</button>
      </form>
      <ErrorNote error={save.error} />

      <div>
        <span className="block mb-1.5 text-[12.5px] font-extrabold text-[#27324A]">Documents</span>
        {claim.documents.length === 0 ? (
          <p className="text-[12.5px] text-[#5B667A]">No documents added yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {claim.documents.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px]">
                <FileText className="w-4 h-4 text-[#2A4DD0] shrink-0" />
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="font-bold text-[#2A4DD0] hover:underline truncate">{d.name}</a>
                ) : (
                  <span className="truncate">{d.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <label className={`${btnOutline} mt-2.5 h-9! cursor-pointer ${upload.pending ? "opacity-60" : ""}`}>
          <Paperclip className="w-4 h-4" /> {upload.pending ? "Adding…" : "Add a document"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={upload.pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.set("claim", claim.id);
              form.set("file", file);
              upload.run(() => addClaimDocument(form));
              e.target.value = "";
            }}
          />
        </label>
        <div className="mt-2"><ErrorNote error={upload.error} /></div>
      </div>

      <div className="pt-3 border-t border-[#E6EAF0]">
        {confirm ? (
          <span className="inline-flex items-center gap-3">
            <button type="button" disabled={del.pending} onClick={() => del.run(() => removeClaim(claim.id))} className="text-[12.5px] font-extrabold text-[#B42318] hover:underline">
              {del.pending ? "Removing…" : "Yes, remove this claim and its documents"}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="text-[12.5px] font-extrabold text-[#5B667A]">Keep</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#5B667A] hover:text-[#B42318]">
            <Trash2 className="w-3.5 h-3.5" /> Remove claim
          </button>
        )}
        <ErrorNote error={del.error} />
      </div>
    </div>
  );
}

const NEEDS = {
  cashless: {
    text: "Show your insurance card and photo ID at the hospital's insurance desk. The hospital sends the request to your insurer or TPA, who tells them the approved amount.",
    docs: ["Insurance card or e-card", "Photo ID", "Doctor's advice for admission"],
  },
  reimbursement: {
    text: "Pay the hospital, then send the papers to your insurer or TPA, usually within 30 days of discharge. Check your policy for the exact deadline.",
    docs: ["Final bill and payment receipts", "Discharge summary", "Prescriptions and test reports", "Claim form from your insurer"],
  },
} as const;

/** Start a claim to keep track of. Nothing is sent to the insurer from here. */
export function StartClaim({ ready, tpa }: { ready: boolean; tpa: string | null }) {
  const [type, setType] = useState<"cashless" | "reimbursement">("cashless");
  const [started, setStarted] = useState(false);
  const { pending, error, run } = useAction();
  const need = NEEDS[type];
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("type", type);
    run(() => startClaim(form), () => setStarted(true));
  };
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <h2 className="text-[16px] font-extrabold">Start a claim</h2>
      <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">How were you treated?</p>
      {started ? (
        <div className="mt-3 rounded-2xl bg-[#F5F8FF] shadow-[inset_0_0_0_1px_#DCE5FF] p-4">
          <p className="text-[15px] font-extrabold text-[#2A4DD0]">Claim saved</p>
          <p className="mt-1 text-[13px] text-[#27324A]">Send the papers to {tpa ?? "your insurer or TPA"}, then update the status here as they reply.</p>
          <button type="button" onClick={() => setStarted(false)} className={`${btnOutline} w-full mt-3`}>
            Start another claim
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3.5">
          <Chips
            label="How were you treated"
            options={[
              { value: "cashless", label: "Cashless at hospital" },
              { value: "reimbursement", label: "Reimbursement" },
            ]}
            value={[type]}
            onChange={(v) => setType(v as "cashless" | "reimbursement")}
          />
          <p className="text-[12.5px] leading-normal text-[#4A5878]">{need.text}</p>
          <ul className="flex flex-col gap-1.5">
            {need.docs.map((d) => (
              <li key={d} className="flex items-center gap-2 text-[13px] font-bold text-[#27324A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2A4DD0]" /> {d}
              </li>
            ))}
          </ul>
          <div>
            <label htmlFor="cl-hospital" className={fieldLabel}>Hospital or lab</label>
            <input id="cl-hospital" name="hospital" required minLength={2} maxLength={120} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cl-date" className={fieldLabel}>Treated on {optional}</label>
              <input id="cl-date" name="treatedOn" type="date" max={new Date().toISOString().slice(0, 10)} className={field} />
            </div>
            <div>
              <label htmlFor="cl-amount" className={fieldLabel}>Amount (₹) {optional}</label>
              <input id="cl-amount" name="amount" inputMode="numeric" className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="cl-number" className={fieldLabel}>Claim number {optional}</label>
            <input id="cl-number" name="claimNumber" maxLength={60} placeholder="If the insurer has given one" className={field} />
          </div>
          <div>
            <label htmlFor="cl-docs" className={fieldLabel}>Documents {optional}</label>
            <input id="cl-docs" name="documents" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="block w-full text-[13px] file:mr-3 file:h-10 file:px-4 file:rounded-[10px] file:border-0 file:bg-[#EEF3FF] file:text-[#2A4DD0] file:font-extrabold file:cursor-pointer" />
            <p className="mt-1 text-[11.5px] text-[#8A94A6]">Up to 5 MB now; add more to the claim later. Kept privately for you.</p>
          </div>
          {!ready && <NotReady>The claim tracker opens up after the next update.</NotReady>}
          <ErrorNote error={error} />
          <button type="submit" disabled={pending || !ready} className={`${btnPrimary} w-full h-12!`}>
            Save claim
          </button>
          <p className="text-[11.5px] leading-normal text-[#8A94A6]">Consult your Doctor doesn&apos;t send or settle claims. This keeps your papers and the claim&apos;s progress in one place.</p>
        </form>
      )}
    </section>
  );
}

export type CashlessHospital = { id: string; name: string; city: string | null; lat: number | null; lng: number | null };

/** Partner hospitals that list the patient's insurer, nearest first. */
export function CashlessNearby({ hospitals, insurer }: { hospitals: CashlessHospital[]; insurer: string }) {
  const { location } = usePatientLocation();
  const rows = byNearness(hospitals, location).slice(0, 5);
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-extrabold">Hospitals that accept your insurer</h2>
          <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">{location ? `Nearest to ${placeLabel(location)} first` : `Partner hospitals listing ${insurer}`}</p>
        </div>
        <Link href="/hospitals" className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">See all</Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-[#5B667A]">No partner hospital lists {insurer} yet. Ask the hospital&apos;s insurance desk before you book.</p>
      ) : (
        <div className="mt-2">
          {rows.map(({ item: h, km }) => (
            <Link key={h.id} href={`/hospitals/${h.id}`} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0 hover:bg-[#F7F9FC] -mx-2 px-2 rounded-lg">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold truncate">{h.name}</span>
                <span className="block text-[12px] text-[#5B667A] truncate">{[h.city, km != null ? formatDistance(km) : null].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="shrink-0 inline-flex items-center h-6 px-[9px] rounded-full bg-[#EEF3FF] text-[11.5px] font-extrabold text-[#2A4DD0]">Accepts</span>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11.5px] text-[#8A94A6]">As listed by each hospital. Cashless approval is decided by your insurer.</p>
    </section>
  );
}
