"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, UserPlus } from "lucide-react";
import { btnOutline, btnPrimary, card } from "@/components/patient/app-ui";
import { firstName, initials } from "@/components/patient/format";
import { BOOK_FOR_KEY } from "@/components/patient/WhoFor";
import { removeFamilyMember, saveFamilyMember } from "@/app/actions/patient-health";
import { FAMILY_LIMIT, RELATIONS, type FamilyMember, type Relation } from "@/lib/patient-health";
import { Chips, Dialog, DialogButtons, ErrorNote, field, fieldLabel, NotReady, optional, useAction } from "./kit";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEXES = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Other", label: "Other" },
] as const;
const RELATION_OPTIONS = (Object.keys(RELATIONS) as Relation[]).map((value) => ({ value, label: RELATIONS[value] }));


/** "Book for Rahul": remembers the member for the booking form, then opens Find care. */
export function BookForButton({ memberId, name, className = "" }: { memberId: string | null; name: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        try {
          if (memberId) sessionStorage.setItem(BOOK_FOR_KEY, memberId);
          else sessionStorage.removeItem(BOOK_FOR_KEY);
        } catch {}
        router.push("/specialities");
      }}
      className={`${btnPrimary} h-10! ${className}`}
    >
      Book for {firstName(name) || name}
    </button>
  );
}

type Card = {
  member: FamilyMember | null;
  name: string;
  line: string;
  bloodGroup: string | null;
  covered: boolean | null;
  nextVisit: string | null;
};

/** A person's card: who they are, blood group, insurance, next visit, and Book for / Health details. */
export function MemberCard({ person }: { person: Card }) {
  const [editing, setEditing] = useState(false);
  const { member, name } = person;
  return (
    <section className={`${card} p-4 lg:p-5 flex flex-col`}>
      <div className="flex items-center gap-3">
        <span className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-extrabold ${member ? "bg-[#EEF3FF] text-[#2A4DD0]" : "bg-[#2A4DD0] text-white"}`}>{initials(name)}</span>
        <span className="min-w-0">
          <span className="block text-[15.5px] font-extrabold truncate">{name}</span>
          <span className="block text-[12.5px] text-[#5B667A] truncate">{person.line}</span>
        </span>
      </div>
      <div className="mt-3 flex-1">
        <Row label="Blood group" value={person.bloodGroup ?? <span className="text-[#8A94A6]">Not added</span>} />
        <Row
          label="Insurance"
          value={
            person.covered == null ? <span className="text-[#8A94A6]">No policy added</span> : person.covered ? <span className="text-[#067647]">Covered</span> : <span className="text-[#5B667A]">Not covered</span>
          }
        />
        <Row label="Next visit" value={person.nextVisit ?? <span className="font-bold text-[#8A94A6]">No upcoming visits</span>} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <BookForButton memberId={member?.id ?? null} name={name} />
        {member ? (
          <button type="button" onClick={() => setEditing(true)} className={`${btnOutline} h-10!`}>
            Health details
          </button>
        ) : (
          <a href="/patient/profile#medical" className={`${btnOutline} h-10!`}>
            Health details
          </a>
        )}
      </div>
      {editing && member && <MemberDialog member={member} onClose={() => setEditing(false)} />}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-t border-[#EEF2F7] first:border-t-0 text-[13px]">
      <span className="text-[#5B667A]">{label}</span>
      <span className="text-right font-extrabold min-w-0 truncate">{value}</span>
    </div>
  );
}

/** The member's details, to edit or remove. */
function MemberDialog({ member, onClose }: { member: FamilyMember; onClose: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const remove = useAction();
  return (
    <Dialog title={member.name} sub={`${RELATIONS[member.relation]} · health details`} onClose={onClose}>
      <MemberForm member={member} onDone={onClose} onCancel={onClose} />
      <div className="mt-5 pt-4 border-t border-[#EEF2F7]">
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] font-bold text-[#27324A]">Remove {firstName(member.name)} from your account? Past bookings stay.</span>
            <button type="button" disabled={remove.pending} onClick={() => remove.run(() => removeFamilyMember(member.id), onClose)} className="h-9 px-3.5 rounded-[10px] bg-[#B42318] text-white text-[13px] font-extrabold">
              Remove
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="h-9 px-3 text-[13px] font-extrabold text-[#27324A]">
              Keep
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#B42318] hover:underline">
            <Trash2 className="w-4 h-4" /> Remove family member
          </button>
        )}
        <div className="mt-2"><ErrorNote error={remove.error} /></div>
      </div>
    </Dialog>
  );
}

/** Add or edit a member: name, relation, date of birth, blood group, sex, mobile, allergies, conditions. */
function MemberForm({ member, onDone, onCancel, compact = false }: { member: FamilyMember | null; onDone: () => void; onCancel: () => void; compact?: boolean }) {
  const [relation, setRelation] = useState<Relation | null>(member?.relation ?? null);
  const [sex, setSex] = useState<string | null>(member?.gender ?? null);
  const { pending, error, setError, run } = useAction();
  const id = member?.id ?? "new";

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!relation) return setError("Choose how they’re related to you.");
    const f = new FormData(e.currentTarget);
    run(
      () =>
        saveFamilyMember({
          id: member?.id,
          name: String(f.get("name") ?? ""),
          relation,
          dateOfBirth: String(f.get("dob") ?? "") || null,
          gender: (sex as "Male" | "Female" | "Other" | null) ?? null,
          bloodGroup: String(f.get("blood") ?? "") || null,
          phone: String(f.get("phone") ?? ""),
          allergies: String(f.get("allergies") ?? ""),
          conditions: String(f.get("conditions") ?? ""),
        }),
      onDone,
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div>
        <label htmlFor={`fm-name-${id}`} className={fieldLabel}>Full name</label>
        <input id={`fm-name-${id}`} name="name" required minLength={2} maxLength={80} defaultValue={member?.name ?? ""} autoComplete="off" className={field} />
      </div>
      <div>
        <span className={fieldLabel}>Relation</span>
        <Chips label="Relation" options={RELATION_OPTIONS} value={relation ? [relation] : []} onChange={setRelation} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`fm-dob-${id}`} className={fieldLabel}>Date of birth</label>
          <input id={`fm-dob-${id}`} name="dob" type="date" defaultValue={member?.dateOfBirth ?? ""} max={new Date().toISOString().slice(0, 10)} className={field} />
        </div>
        <div>
          <label htmlFor={`fm-blood-${id}`} className={fieldLabel}>Blood group</label>
          <select id={`fm-blood-${id}`} name="blood" defaultValue={member?.bloodGroup ?? ""} className={field}>
            <option value="">Not known</option>
            {BLOOD.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <span className={fieldLabel}>Sex</span>
        <Chips label="Sex" options={SEXES.map((s) => ({ value: s.value as string, label: s.label }))} value={sex ? [sex] : []} onChange={(v) => setSex(v === sex ? null : v)} />
      </div>
      <div>
        <label htmlFor={`fm-phone-${id}`} className={fieldLabel}>Mobile number {optional}</label>
        <input id={`fm-phone-${id}`} name="phone" type="tel" inputMode="tel" maxLength={16} defaultValue={member?.phone ?? ""} className={field} />
      </div>
      {!compact && (
        <>
          <div>
            <label htmlFor={`fm-allergies-${id}`} className={fieldLabel}>Allergies {optional}</label>
            <input id={`fm-allergies-${id}`} name="allergies" maxLength={300} defaultValue={member?.allergies ?? ""} placeholder="e.g. Penicillin" className={field} />
          </div>
          <div>
            <label htmlFor={`fm-conditions-${id}`} className={fieldLabel}>Conditions {optional}</label>
            <input id={`fm-conditions-${id}`} name="conditions" maxLength={300} defaultValue={member?.conditions ?? ""} placeholder="e.g. Asthma" className={field} />
          </div>
        </>
      )}
      <ErrorNote error={error} />
      <DialogButtons onCancel={onCancel} pending={pending} label={member ? "Save changes" : "Save member"} />
    </form>
  );
}

/** The "Add a family member" card: a button, then the form inline, then a confirmation. */
export function AddMember({ count, ready }: { count: number; ready: boolean }) {
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const full = count >= FAMILY_LIMIT;
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <h2 className="text-[16px] font-extrabold">Add a family member</h2>
      {state === "idle" && (
        <>
          <p className="mt-1 text-[13px] leading-relaxed text-[#5B667A]">Book visits and lab tests, keep records and see reminders for up to {FAMILY_LIMIT} people from one account.</p>
          {!ready ? (
            <div className="mt-3"><NotReady>Family members open up after the next update.</NotReady></div>
          ) : (
            <button type="button" disabled={full} onClick={() => setState("adding")} className={`${btnPrimary} mt-3.5 w-full h-[46px]!`}>
              <UserPlus className="w-[18px] h-[18px]" /> {full ? `You’ve added ${FAMILY_LIMIT} people` : "Add a family member"}
            </button>
          )}
        </>
      )}
      {state === "adding" && (
        <div className="mt-3">
          <MemberForm member={null} compact onDone={() => setState("added")} onCancel={() => setState("idle")} />
        </div>
      )}
      {state === "added" && (
        <div className="mt-3 rounded-2xl bg-[#ECFDF3] p-4">
          <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#067647]">
            <CheckCircle2 className="w-[18px] h-[18px]" /> Family member added
          </p>
          <p className="mt-1 text-[12.5px] text-[#27324A]">You can now book visits and keep records for them.</p>
          {count < FAMILY_LIMIT && (
            <button type="button" onClick={() => setState("adding")} className="mt-2.5 flex items-center gap-1.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
              <UserPlus className="w-3.5 h-3.5" /> Add another
            </button>
          )}
        </div>
      )}
    </section>
  );
}
