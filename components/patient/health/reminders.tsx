"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, LoaderCircle, Minus, Plus } from "lucide-react";
import { btnPrimary, card } from "@/components/patient/app-ui";
import { markDose, saveMealTimes } from "@/app/actions/patient-health";
import { clockTime, type Meals } from "@/lib/patient-health";
import { ErrorNote, NotReady, useAction } from "./kit";

export type Dose = {
  key: string;
  minutes: number;
  slot: string;
  name: string;
  pattern: string;
  dose: string;
  instructions: string;
  doctor: string | null;
  progress: string;
  taken: boolean;
};

/** Today's doses in time order, each with Mark as taken. */
export function TodaySchedule({ doses, date, label, ready }: { doses: Dose[]; date: string; label: string; ready: boolean }) {
  const [taken, setTaken] = useOptimistic(new Set(doses.filter((d) => d.taken).map((d) => d.key)), (set, { key, on }: { key: string; on: boolean }) => {
    const next = new Set(set);
    if (on) next.add(key);
    else next.delete(key);
    return next;
  });
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const done = doses.filter((d) => taken.has(d.key)).length;
  const pct = doses.length ? Math.round((done / doses.length) * 100) : 0;

  const toggle = (key: string) => {
    const on = !taken.has(key);
    setError(null);
    start(async () => {
      setTaken({ key, on });
      const res = await markDose({ key, date, taken: on });
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-extrabold">Today · {label}</h2>
          <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">Your schedule, set by the doctor&apos;s timing</p>
        </div>
      </div>
      {doses.length > 0 && (
        <>
          <div className="mt-3 flex items-center justify-between gap-3 text-[13px] font-extrabold">
            <span>{done} of {doses.length} taken today</span>
            <span className="text-[#2A4DD0] tabular-nums">{pct}%</span>
          </div>
          <span className="block mt-2 h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
            <span className="block h-full rounded-full bg-[#2A4DD0] transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </span>
        </>
      )}
      {doses.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#F3F6FC] px-4 py-3.5 text-[13px] text-[#5B667A]">No doses due today. Medicines from your doctors&apos; prescriptions show up here with their timing.</p>
      ) : (
        <div className="mt-2">
          {doses.map((d) => {
            const on = taken.has(d.key);
            return (
              <div key={d.key} className="flex items-start lg:items-center gap-3.5 py-3.5 border-t border-[#EEF2F7] first:border-t-0">
                <span className="shrink-0 w-16 lg:w-[84px]">
                  <span className="block text-[14px] lg:text-[15px] font-extrabold tabular-nums">{clockTime(d.minutes)}</span>
                  <span className="block text-[12px] font-bold text-[#5B667A]">{d.slot}</span>
                </span>
                <span className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3.5">
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className={`text-[14px] font-extrabold `}>{d.name}</span>
                    {d.pattern && <span className="px-1.5 py-px rounded-md bg-[#EEF3FF] text-[11px] font-extrabold text-[#2A4DD0]">{d.pattern}</span>}
                  </span>
                  <span className="block text-[12.5px] text-[#4A5878]">{[d.dose, d.instructions].filter(Boolean).join(" · ")}</span>
                  <span className="block text-[11.5px] text-[#8A94A6]">{[d.doctor ? `Prescribed by ${d.doctor}` : null, d.progress].filter(Boolean).join(" · ")}</span>
                </span>
                <button
                  type="button"
                  onClick={() => toggle(d.key)}
                  disabled={!ready}
                  aria-pressed={on}
                  className={`shrink-0 self-start lg:self-center inline-flex items-center gap-2 h-[34px] lg:h-[38px] px-3 rounded-[10px] text-[12.5px] font-extrabold border border-[#D6DDE8] bg-white transition-colors disabled:opacity-50 hover:bg-[#F4F6FA] ${on ? "text-[#2A4DD0]" : "text-[#27324A]"}`}
                >
                  <span className={`w-4 h-4 rounded-[5px] border-2 flex items-center justify-center ${on ? "bg-[#2A4DD0] border-[#2A4DD0] text-white" : "border-[#C9D2E0]"}`}>
                    {on && <Check className="w-3 h-3" strokeWidth={3.5} />}
                  </span>
                  {on ? "Taken" : "Mark as taken"}
                </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {!ready && doses.length > 0 && <div className="mt-2"><NotReady>Marking doses as taken opens up after the next update.</NotReady></div>}
      {error && <div className="mt-2"><ErrorNote error={error} /></div>}
    </section>
  );
}

const STEP = 15;
const MEAL_LABEL: Record<keyof Meals, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

/** The patient's meal times, which before- and after-food reminders follow. */
export function MealTimes({ meals, ready }: { meals: Meals; ready: boolean }) {
  const [value, setValue] = useState(meals);
  const { pending, error, run } = useAction();
  const changed = (Object.keys(meals) as (keyof Meals)[]).some((k) => meals[k] !== value[k]);
  const bump = (k: keyof Meals, by: number) => setValue((v) => ({ ...v, [k]: (v[k] + by + 1440) % 1440 }));
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <h2 className="text-[16px] font-extrabold">Your meal times</h2>
      <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">Reminder times move with your meals, following the doctor&apos;s before or after food instructions.</p>
      <div className="mt-2">
        {(Object.keys(MEAL_LABEL) as (keyof Meals)[]).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0">
            <span className="text-[13.5px] font-bold text-[#27324A]">{MEAL_LABEL[k]}</span>
            <span className="flex items-center gap-2">
              <button type="button" aria-label={`${MEAL_LABEL[k]} earlier`} onClick={() => bump(k, -STEP)} disabled={!ready} className="w-8 h-8 rounded-full border-[1.5px] border-[#D6DDE8] flex items-center justify-center hover:bg-[#F4F6FA] disabled:opacity-50">
                <Minus className="w-3.5 h-3.5" strokeWidth={2.6} />
              </button>
              <span className="w-[74px] text-center text-[14px] font-extrabold tabular-nums">{clockTime(value[k])}</span>
              <button type="button" aria-label={`${MEAL_LABEL[k]} later`} onClick={() => bump(k, STEP)} disabled={!ready} className="w-8 h-8 rounded-full border-[1.5px] border-[#D6DDE8] flex items-center justify-center hover:bg-[#F4F6FA] disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.6} />
              </button>
            </span>
          </div>
        ))}
      </div>
      {!ready && <div className="mt-2"><NotReady>Your own meal times open up after the next update. Until then reminders use 8:00 AM, 1:30 PM and 8:30 PM.</NotReady></div>}
      {changed && (
        <button type="button" disabled={pending} onClick={() => run(() => saveMealTimes(value))} className={`${btnPrimary} mt-3 w-full`}>
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Save meal times
        </button>
      )}
      {error && <div className="mt-2"><ErrorNote error={error} /></div>}
    </section>
  );
}
