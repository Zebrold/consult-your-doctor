"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { saveMedicalDetails } from "@/app/actions/patient-health";
import { Dialog, DialogButtons, ErrorNote, field, fieldLabel, NotReady, optional, useAction } from "./kit";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type Details = { bloodGroup: string | null; allergies: string | null; conditions: string | null; currentMedicines: string | null; heightCm: number | null };

/** Edit the medical ID: blood group, allergies, conditions, regular medicines and height. */
export function MedicalDetailsButton({ details, ready, className = "", children }: { details: Details; ready: boolean; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const height = String(f.get("height") ?? "").trim();
    run(
      () =>
        saveMedicalDetails({
          bloodGroup: String(f.get("blood") ?? ""),
          allergies: String(f.get("allergies") ?? ""),
          conditions: String(f.get("conditions") ?? ""),
          currentMedicines: String(f.get("medicines") ?? ""),
          heightCm: height ? Number(height) : null,
        }),
      () => setOpen(false),
    );
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <Dialog title="Medical details" sub="Shown on your medical ID and to the doctors you book." onClose={() => setOpen(false)}>
          {!ready ? (
            <NotReady>Allergies, conditions and medicines open up after the next update. You can change your blood group from Edit details.</NotReady>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="md-blood" className={fieldLabel}>Blood group</label>
                  <select id="md-blood" name="blood" defaultValue={details.bloodGroup ?? ""} className={field}>
                    <option value="">Not known</option>
                    {BLOOD.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="md-height" className={fieldLabel}>Height (cm) {optional}</label>
                  <input id="md-height" name="height" type="number" min={30} max={260} step="0.1" defaultValue={details.heightCm ?? ""} className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="md-allergies" className={fieldLabel}>Allergies {optional}</label>
                <input id="md-allergies" name="allergies" maxLength={300} defaultValue={details.allergies ?? ""} placeholder="e.g. Penicillin, peanuts" className={field} />
              </div>
              <div>
                <label htmlFor="md-conditions" className={fieldLabel}>Long-term conditions {optional}</label>
                <input id="md-conditions" name="conditions" maxLength={300} defaultValue={details.conditions ?? ""} placeholder="e.g. Diabetes, asthma" className={field} />
              </div>
              <div>
                <label htmlFor="md-medicines" className={fieldLabel}>Medicines you take regularly {optional}</label>
                <input id="md-medicines" name="medicines" maxLength={300} defaultValue={details.currentMedicines ?? ""} placeholder="e.g. Metformin 500 mg twice a day" className={field} />
              </div>
              <p className="text-[12px] text-[#5B667A]">In your own words. This doesn&apos;t change any prescription.</p>
              <ErrorNote error={error} />
              <DialogButtons onCancel={() => setOpen(false)} pending={pending} label="Save" />
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
