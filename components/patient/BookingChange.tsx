"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { btnDanger, btnOutline, btnPrimary } from "./app-ui";
import { Dialog, ErrorNote } from "./health/kit";
import { cancelMyBooking, rescheduleMyBooking, rescheduleOptions, type RescheduleDay } from "@/app/actions/patient-bookings";

// Changing your own booking from My bookings: cancel it (the booking fee is refunded when it is at least 2 hours before the
// slot) or move a doctor visit once. The rules are in lib/booking-change.ts and are checked again on the server.

const linkBtn = "font-extrabold underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline";

export function CancelBookingButton({ id, kind, refundDue, fee, label = "Cancel appointment" }: { id: string; kind: "visit" | "lab"; refundDue: boolean; fee: string | null; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [windowPassed, setWindowPassed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refunding = refundDue && !windowPassed;
  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const submit = () => {
    setError(null);
    start(async () => {
      try {
        const res = await cancelMyBooking({ kind, id, expectRefund: refunding });
        if (res.ok) {
          setOpen(false);
          router.refresh();
        } else if (res.code === "refund_window_passed") {
          // Less than 2 hours to go now: show that the fee is kept and ask again.
          setWindowPassed(true);
        } else {
          setError(res.error);
        }
      } catch {
        setError("Something went wrong. Please check your connection and try again.");
      }
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${linkBtn} text-[#B42318]`}>
        {label}
      </button>
      {open && (
        <Dialog title="Cancel this booking?" onClose={close}>
          <div className="flex flex-col gap-3.5">
            <p className="text-[14px] leading-[1.55] text-[#27324A]">
              {refunding
                ? `You’ll get ${fee ?? "your booking fee"} back (booking fee and convenience fee) to the way you paid, once our team processes it. Banks usually take 5–7 working days.`
                : fee
                  ? windowPassed
                    ? "It is now less than 2 hours before your booking, so the booking fee can no longer be refunded. Your slot is freed for someone else."
                    : "It’s less than 2 hours to your booking, so the booking fee isn’t refunded. Your slot is freed for someone else."
                  : "Nothing was paid for this booking."}
            </p>
            <ErrorNote error={error} />
            <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2.5">
              <button type="button" onClick={close} disabled={pending} className={`${btnOutline} h-[46px]!`}>
                Keep booking
              </button>
              <button type="button" onClick={submit} disabled={pending} className={`${btnDanger} h-[46px]! px-6!`}>
                {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {pending ? "Cancelling…" : "Cancel booking"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

export type RescheduleState = { allowed: boolean; reason: string | null; notReady: boolean };

export function RescheduleButton({ id, reschedule, place }: { id: string; reschedule: RescheduleState; place: string }) {
  const [open, setOpen] = useState(false);
  if (reschedule.notReady) {
    return (
      <span className="inline-flex flex-col items-center">
        <button type="button" disabled title="Rescheduling opens after the next update" className={`${linkBtn} text-[#2A4DD0]`}>
          Reschedule
        </button>
        <span className="text-[11px] text-[#8A94A6]">Rescheduling opens after the next update</span>
      </span>
    );
  }
  if (!reschedule.allowed) {
    const moved = reschedule.reason?.startsWith("You’ve already moved");
    return <span className="text-[12px] text-[#5B667A]">{moved ? "Moved once already" : reschedule.reason}</span>;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${linkBtn} text-[#2A4DD0]`}>
        Reschedule
      </button>
      {open && <RescheduleDialog id={id} place={place} onClose={() => setOpen(false)} />}
    </>
  );
}

function RescheduleDialog({ id, place, onClose }: { id: string; place: string; onClose: () => void }) {
  const router = useRouter();
  const [days, setDays] = useState<RescheduleDay[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movedTo, setMovedTo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    rescheduleOptions(id)
      .then((res) => {
        if (!live) return;
        if (res.ok) {
          setDays(res.days);
          setDayKey(res.days[0]?.key ?? null);
        } else setLoadError(res.error);
      })
      .catch(() => live && setLoadError("Could not load open times. Please try again."));
    return () => {
      live = false;
    };
  }, [id]);

  const day = days?.find((d) => d.key === dayKey) ?? null;
  const slot = day?.slots.find((s) => s.id === slotId) ?? null;

  const finish = () => {
    if (pending) return;
    if (movedTo) router.refresh();
    onClose();
  };

  const submit = () => {
    if (!slot) return;
    setError(null);
    start(async () => {
      try {
        const res = await rescheduleMyBooking(id, slot.id);
        if (res.ok) setMovedTo(res.when);
        else setError(res.error);
      } catch {
        setError("Something went wrong. Please check your connection and try again.");
      }
    });
  };

  return (
    <Dialog title="Reschedule" sub="Pick another open time with the same doctor. You can move a booking once." onClose={finish}>
      {movedTo ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl bg-[#ECFDF3] px-3.5 py-3 text-[13.5px] font-bold text-[#067647]">Moved to {movedTo}. We’ve sent you the new booking slip.</p>
          <button type="button" onClick={finish} className={`${btnPrimary} h-[46px]!`}>
            Done
          </button>
        </div>
      ) : loadError ? (
        <ErrorNote error={loadError} />
      ) : !days ? (
        <p className="py-6 text-center text-[13.5px] font-bold text-[#5B667A]">Finding open times…</p>
      ) : days.length === 0 ? (
        <p className="rounded-xl bg-[#F7F9FC] px-3.5 py-4 text-[13.5px] leading-[1.5] text-[#27324A]">
          No other open times with this doctor at {place} in the next 30 days. You can cancel instead, or contact support.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div role="tablist" aria-label="Day" className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={d.key === dayKey}
                onClick={() => {
                  setDayKey(d.key);
                  setSlotId(null);
                }}
                className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-extrabold border-[1.5px] transition-colors ${d.key === dayKey ? "bg-[#2A4DD0] border-[#2A4DD0] text-white" : "bg-white border-[#D6DDE8] text-[#27324A] hover:bg-[#F4F6FA]"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {day?.slots.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === slotId}
                onClick={() => setSlotId(s.id)}
                className={`h-10 rounded-[10px] text-[13px] font-extrabold border-[1.5px] transition-colors ${s.id === slotId ? "bg-[#EEF3FF] border-[#2A4DD0] text-[#2A4DD0]" : "bg-white border-[#D6DDE8] text-[#27324A] hover:bg-[#F4F6FA]"}`}
              >
                {s.time}
              </button>
            ))}
          </div>
          <ErrorNote error={error} />
          <button type="button" onClick={submit} disabled={!slot || pending} className={`${btnPrimary} h-[46px]!`}>
            {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {pending ? "Moving…" : slot ? `Move to ${slot.time}` : "Pick a time"}
          </button>
        </div>
      )}
    </Dialog>
  );
}
