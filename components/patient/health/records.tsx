"use client";

import { useState, type FormEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { btnOutline, btnPrimary } from "@/components/patient/app-ui";
import { removePatientRecord, uploadPatientRecord } from "@/app/actions/patient-health";
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
      ? "inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[11px] bg-white text-[#2A4DD0] text-[14px] font-extrabold active:scale-[0.98] transition-transform"
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
