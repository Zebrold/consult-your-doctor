"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, X } from "lucide-react";
import { btnOutline, btnPrimary } from "@/components/patient/app-ui";

// Shared pieces for the "My health" forms: fields, a dialog (a sheet from the bottom on phones), the error line and a
// hook that runs a server action, shows its error and refreshes the page when it worked.

export const field =
  "w-full h-[46px] px-3.5 rounded-xl bg-white text-[15px] text-[#0B1B3F] shadow-[inset_0_0_0_1px_#D6DDE8] focus:shadow-[inset_0_0_0_1.5px_#2A4DD0] outline-none placeholder:text-[#8A94A6] disabled:bg-[#F4F6FA]";
export const area =
  "w-full min-h-[96px] px-3.5 py-3 rounded-xl bg-white text-[15px] text-[#0B1B3F] shadow-[inset_0_0_0_1px_#D6DDE8] focus:shadow-[inset_0_0_0_1.5px_#2A4DD0] outline-none placeholder:text-[#8A94A6] resize-y";
export const fieldLabel = "block mb-1.5 text-[12.5px] font-extrabold text-[#27324A]";
export const optional = <span className="font-bold text-[#8A94A6]">(optional)</span>;

/** Choice chips (relation, sex, what stood out): the picked ones in blue. */
export function Chips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`h-9 px-3.5 rounded-full text-[13px] font-extrabold border-[1.5px] transition-colors ${on ? "bg-[#2A4DD0] border-[#2A4DD0] text-white" : "bg-white border-[#D6DDE8] text-[#27324A] hover:bg-[#F4F6FA]"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-[#FEF3F2] px-3.5 py-2.5 text-[13px] font-bold text-[#B42318]">
      {error}
    </p>
  );
}

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Runs a server action: `pending` while it runs, its error if it failed, a page refresh and `onDone` if it worked. */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<ActionResult>, onDone?: (id?: string) => void) => {
    setError(null);
    start(async () => {
      try {
        const res = await action();
        if (res.ok) {
          onDone?.(res.id);
          router.refresh();
        } else setError(res.error);
      } catch {
        setError("Something went wrong. Please check your connection and try again.");
      }
    });
  };
  return { pending, error, setError, run };
}

/** A dialog: a sheet from the bottom on phones, a centred card on wider screens. Escape or the backdrop closes it. */
export function Dialog({ title, sub, onClose, children, wide = false }: { title: string; sub?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-[#0B1B3F]/45 font-(family-name:--font-manrope)" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "md:max-w-[620px]" : "md:max-w-[500px]"} max-h-[92dvh] overflow-y-auto rounded-t-[24px] md:rounded-2xl bg-white text-[#0B1B3F] px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] md:p-6 shadow-[0_24px_60px_rgba(11,27,63,0.3)]`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-[19px] font-extrabold tracking-[-0.01em]">{title}</h2>
            {sub && <p className="mt-0.5 text-[13px] text-[#5B667A]">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center hover:bg-[#F4F6FA]">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Cancel and the submit button at the bottom of a dialog's form. */
export function DialogButtons({ onCancel, pending, label }: { onCancel: () => void; pending: boolean; label: string }) {
  return (
    <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2.5 mt-1">
      <button type="button" onClick={onCancel} className={`${btnOutline} h-[46px]!`}>
        Cancel
      </button>
      <button type="submit" disabled={pending} className={`${btnPrimary} h-[46px]! px-6!`}>
        {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
}

/** A note that a feature opens up once the database update has run. */
export function NotReady({ children = "This opens up after the next update." }: { children?: ReactNode }) {
  return <p className="rounded-xl bg-[#FFF6E5] px-3.5 py-2.5 text-[12.5px] font-bold text-[#B54708]">{children}</p>;
}
