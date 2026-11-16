"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Share2, Trash2, Upload } from "lucide-react";
import { btnOutline, btnPrimary } from "@/components/patient/app-ui";
import { removePatientRecord, uploadPatientRecord } from "@/app/actions/patient-health";
import { removeDoctorAccess, shareRecordLink } from "@/app/actions/record-access";
import { RECORD_KINDS, type RecordKind } from "@/lib/patient-health";
import { Dialog, DialogButtons, ErrorNote, field, fieldLabel, optional, useAction } from "./kit";

/** "Upload a record": an old prescription, a report, a scan or a vaccination card, kept privately for the patient. */
export function UploadRecordButton({ members, ready, variant = "primary", className = "" }: { members: { id: string; name: string }[]; ready: boolean; variant?: "primary" | "outline" | "hero"; className?: string }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(() => uploadPatientRecord(form), () => setOpen(false));
  };
  const cls =
    variant === "hero"
      ? "inline-flex items-center justify-center gap-2 h-12 px-4 rounded-[14px] bg-white text-[#2A4DD0] text-[14.5px] font-extrabold active:scale-[0.98] transition-transform"
      : variant === "outline"
        ? btnOutline
        : btnPrimary;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={!ready} title={ready ? undefined : "Uploads open up after the next update"} className={`${cls} disabled:opacity-60 ${className}`}>
        <Upload className="w-4 h-4" /> Upload a record
      </button>
      {open && (
        <Dialog title="Upload a record" sub="A PDF or photo up to 5 MB. Only you can see what you upload." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <div>
              <label htmlFor="rec-file" className={fieldLabel}>File</label>
              <input id="rec-file" name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="block w-full text-[13.5px] file:mr-3 file:h-10 file:px-4 file:rounded-[10px] file:border-0 file:bg-[#EEF3FF] file:text-[#2A4DD0] file:font-extrabold file:cursor-pointer" />
            </div>
            <div>
              <label htmlFor="rec-title" className={fieldLabel}>Name</label>
              <input id="rec-title" name="title" required minLength={2} maxLength={120} placeholder="e.g. Blood test, March 2026" className={field} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rec-kind" className={fieldLabel}>Type</label>
                <select id="rec-kind" name="kind" required defaultValue="" className={field}>
                  <option value="" disabled>Choose</option>
                  {(Object.keys(RECORD_KINDS) as RecordKind[]).map((k) => (
                    <option key={k} value={k}>{RECORD_KINDS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rec-date" className={fieldLabel}>Date {optional}</label>
                <input id="rec-date" name="date" type="date" max={new Date().toISOString().slice(0, 10)} className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="rec-provider" className={fieldLabel}>Doctor, hospital or lab {optional}</label>
              <input id="rec-provider" name="provider" maxLength={120} className={field} />
            </div>
            {members.length > 0 && (
              <div>
                <label htmlFor="rec-member" className={fieldLabel}>Whose record is it?</label>
                <select id="rec-member" name="member" defaultValue="" className={field}>
                  <option value="">Mine</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            <ErrorNote error={error} />
            <DialogButtons onCancel={() => setOpen(false)} pending={pending} label="Upload" />
          </form>
        </Dialog>
      )}
    </>
  );
}

/** Removes a record the patient uploaded (and its file). */
export function RemoveRecordButton({ id, title }: { id: string; title: string }) {
  const [confirm, setConfirm] = useState(false);
  const { pending, error, run } = useAction();
  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#5B667A] hover:text-[#B42318]">
        <Trash2 className="w-3.5 h-3.5" /> Remove
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => run(() => removePatientRecord(id))} aria-label={`Remove ${title}`} className="text-[12.5px] font-extrabold text-[#B42318] hover:underline">
        {pending ? "Removing…" : "Yes, remove"}
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="text-[12.5px] font-extrabold text-[#5B667A]">Keep</button>
      {error && <span role="alert" className="text-[12px] font-bold text-[#B42318]">{error}</span>}
    </span>
  );
}

const untilText = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

/** Shares one file through a link that stops working after 7 days (Web Share where the phone has it, else copied). */
export function ShareRecordButton({ source, id, title, variant = "text" }: { source: "visit" | "lab" | "upload"; id: string; title: string; variant?: "text" | "outline" }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const share = () => {
    if (pending) return;
    setNote(null);
    start(async () => {
      try {
        const res = await shareRecordLink({ source, id });
        if (!res.ok) return setNote({ text: res.error, bad: true });
        const until = untilText(res.expiresAt);
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          try {
            await navigator.share({ title, text: `${title} (link works until ${until})`, url: res.url });
            setNote({ text: `Anyone with the link can open this file until ${until}.` });
            return;
          } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") return;
          }
        }
        await navigator.clipboard.writeText(res.url);
        setNote({ text: `Link copied · works until ${until}. Anyone with the link can open this file until then.` });
      } catch {
        setNote({ text: "Couldn’t make a link. Please try again.", bad: true });
      }
    });
  };
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={share}
        disabled={pending}
        aria-label={`Share ${title}`}
        className={variant === "outline" ? `${btnOutline} h-9! px-3.5! disabled:opacity-60` : "text-[13px] font-extrabold text-[#2A4DD0] hover:underline disabled:opacity-60"}
      >
        {variant === "outline" && (pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />)}
        {pending ? "Making a link…" : "Share"}
      </button>
      {note && (
        <span role={note.bad ? "alert" : "status"} className={`mt-1 block max-w-[210px] text-right text-[12px] leading-snug ${note.bad ? "font-bold text-[#B42318]" : "text-[#5B667A]"}`}>
          {note.text}
        </span>
      )}
    </span>
  );
}

/** "Who can see your records": takes back a doctor's access to the patient's past visits, after a confirm. */
export function RemoveAccessButton({ doctorId, name, ready }: { doctorId: string; name: string; ready: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const remove = () => {
    if (pending) return;
    setError(null);
    start(async () => {
      try {
        const res = await removeDoctorAccess(doctorId);
        if (res.ok) {
          setConfirm(false);
          router.refresh();
        } else setError(res.error);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };
  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} disabled={!ready} title={ready ? undefined : "Opens after the next update"} className="shrink-0 text-[12.5px] font-extrabold text-[#5B667A] hover:text-[#B42318] disabled:opacity-50 disabled:hover:text-[#5B667A]">
        Remove
      </button>
    );
  }
  return (
    <span className="shrink-0 flex flex-col items-end gap-1">
      <span className="text-[12px] font-bold text-[#27324A]">Remove {name}&apos;s access?</span>
      <span className="inline-flex items-center gap-3">
        <button type="button" disabled={pending} onClick={remove} className="text-[12.5px] font-extrabold text-[#B42318] hover:underline disabled:opacity-60">
          {pending ? "Removing…" : "Yes, remove"}
        </button>
        <button type="button" disabled={pending} onClick={() => setConfirm(false)} className="text-[12.5px] font-extrabold text-[#5B667A]">Keep</button>
      </span>
      {error && <span role="alert" className="text-[12px] font-bold text-[#B42318] text-right">{error}</span>}
    </span>
  );
}
