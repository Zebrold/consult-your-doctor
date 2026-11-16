"use client";

import { useState } from "react";
import { LoaderCircle, Pencil, Star, Trash2 } from "lucide-react";
import { btnOutline, btnPrimary, card } from "@/components/patient/app-ui";
import { initials } from "@/components/patient/format";
import { deleteMyReview, saveMyReview } from "@/app/actions/reviews";
import { REVIEW_TAGS } from "@/lib/reviews";
import { area, Chips, ErrorNote, useAction } from "./kit";

type Tag = (typeof REVIEW_TAGS)[number];
const LABELS = ["Tap a star to rate", "Poor", "Below average", "Good", "Very good", "Excellent"];

export type PendingVisit = { id: string; name: string; sub: string; date: string };
export type MyReview = {
  appointmentId: string;
  doctor: string;
  sub: string;
  rating: number;
  comment: string | null;
  tags: string[];
  when: string;
};

function Stars({ value, onChange, size = 30 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span role={onChange ? "radiogroup" : "img"} aria-label={onChange ? "Rating" : `${value} out of 5 stars`} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}, ${LABELS[n]}`} onClick={() => onChange(n)} className="p-0.5 active:scale-90 transition-transform">
            <Star style={{ width: size, height: size }} className={n <= value ? "fill-[#F5A524] text-[#F5A524]" : "text-[#C9D2E0]"} strokeWidth={1.6} />
          </button>
        ) : (
          <Star key={n} style={{ width: size, height: size }} className={n <= value ? "fill-[#F5A524] text-[#F5A524]" : "text-[#C9D2E0]"} strokeWidth={1.6} />
        ),
      )}
    </span>
  );
}

/** The rating form: stars, what stood out, the review. */
function ReviewForm({ appointmentId, name, initial, onDone, onCancel }: { appointmentId: string; name: string; initial?: MyReview; onDone: () => void; onCancel?: () => void }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [tags, setTags] = useState<Tag[]>((initial?.tags ?? []).filter((t): t is Tag => (REVIEW_TAGS as readonly string[]).includes(t)));
  const [comment, setComment] = useState(initial?.comment ?? "");
  const { pending, error, run } = useAction();
  const toggle = (t: Tag) => setTags((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveMyReview({ appointmentId, rating, comment, tags }), onDone);
      }}
      className="flex flex-col gap-3.5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Stars value={rating} onChange={setRating} />
        <span className="text-[13px] font-extrabold text-[#5B667A]">{LABELS[rating]}</span>
      </div>
      <div>
        <span className="block mb-2 text-[12.5px] font-extrabold text-[#27324A]">What stood out?</span>
        <Chips label="What stood out" options={REVIEW_TAGS.map((t) => ({ value: t, label: t }))} value={tags} onChange={toggle} />
      </div>
      <div>
        <label htmlFor={`rv-${appointmentId}`} className="block mb-1.5 text-[12.5px] font-extrabold text-[#27324A]">Your review</label>
        <textarea id={`rv-${appointmentId}`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder={`How was your visit with ${name}?`} className={area} />
      </div>
      <p className="text-[12px] text-[#5B667A]">Posted with your first name and initial on the doctor&apos;s page.</p>
      <ErrorNote error={error} />
      <div className="flex gap-2.5">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-12 px-4 rounded-[11px] text-[14px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA]">
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending || rating === 0} className={`${btnPrimary} flex-1 h-12! text-[15px]! disabled:bg-[#C9D2E0]!`}>
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {initial ? "Save review" : "Post review"}
        </button>
      </div>
    </form>
  );
}

/** Visits waiting for a review, and the form for the one picked. */
export function ReviewQueue({ visits }: { visits: PendingVisit[] }) {
  const [open, setOpen] = useState<string | null>(visits[0]?.id ?? null);
  const [done, setDone] = useState<string[]>([]);
  const left = visits.filter((v) => !done.includes(v.id));
  const current = visits.find((v) => v.id === open) ?? null;
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <h2 className="text-[16px] font-extrabold">Waiting for your review</h2>
      <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">
        {visits.length === 0 ? "You’re all caught up." : left.length === 0 ? "All done. Thank you!" : `${left.length} ${left.length === 1 ? "visit" : "visits"} to review`}
      </p>
      {visits.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#F3F6FC] px-4 py-3.5 text-[13px] text-[#5B667A]">After a consultation you can rate it here. Reviews help other patients choose.</p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {visits.map((v) => {
              const on = v.id === open;
              const reviewed = done.includes(v.id);
              return (
                <button key={v.id} type="button" onClick={() => setOpen(v.id)} aria-pressed={on} className={`w-full text-left flex items-center gap-3 rounded-[14px] px-3.5 py-3 transition-shadow ${on ? "bg-[#F5F8FF] shadow-[0_0_0_2px_#2A4DD0]" : "bg-white shadow-[0_0_0_1px_#E6EAF0]"}`}>
                  <span className="shrink-0 w-10 h-10 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[12px] font-extrabold">{initials(v.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-extrabold truncate">{v.name}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate">{v.date}</span>
                  </span>
                  <span className={`shrink-0 text-[12px] font-extrabold ${reviewed ? "text-[#2A4DD0]" : "text-[#5B667A]"}`}>{reviewed ? "Reviewed" : "To review"}</span>
                </button>
              );
            })}
          </div>
          {current && !done.includes(current.id) && (
            <div className="mt-3.5 rounded-2xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0] p-4">
              <p className="text-[16px] font-extrabold">How was your visit with {current.name}?</p>
              <p className="mt-0.5 mb-3 text-[12.5px] text-[#5B667A]">{current.sub}</p>
              <ReviewForm
                key={current.id}
                appointmentId={current.id}
                name={current.name}
                onDone={() => setDone((d) => [...d, current.id])}
              />
            </div>
          )}
          {current && done.includes(current.id) && (
            <div className="mt-3.5 rounded-2xl bg-[#F5F8FF] shadow-[inset_0_0_0_1px_#DCE5FF] p-4">
              <p className="text-[15.5px] font-extrabold text-[#2A4DD0]">Thank you for your review</p>
              <p className="mt-1 text-[13px] text-[#27324A]">It now shows on {current.name}&apos;s page.</p>
              {left.length > 0 && (
                <button type="button" onClick={() => setOpen(left[0].id)} className={`${btnOutline} w-full mt-3`}>
                  Review your next visit
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** One of the patient's reviews, with Edit and Delete. */
export function MyReviewItem({ review }: { review: MyReview }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const del = useAction();
  return (
    <div className="py-4 border-t border-[#EEF2F7] first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[14.5px] font-extrabold">{review.doctor}</span>
          <span className="block text-[12.5px] text-[#5B667A]">{review.sub}</span>
        </span>
        <span className="shrink-0 text-right">
          <Stars value={review.rating} size={15} />
          <span className="block text-[11.5px] text-[#8A94A6]">{review.when}</span>
        </span>
      </div>
      {editing ? (
        <div className="mt-3">
          <ReviewForm appointmentId={review.appointmentId} name={review.doctor} initial={review} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <>
          {review.comment && <p className="mt-2 text-[13.5px] leading-relaxed text-[#27324A]">{review.comment}</p>}
          {review.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {review.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-[#F3F6FC] text-[11.5px] font-bold text-[#4A5878]">{t}</span>
              ))}
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            {confirm ? (
              <span className="inline-flex items-center gap-3">
                <button type="button" disabled={del.pending} onClick={() => del.run(() => deleteMyReview(review.appointmentId))} className="text-[12.5px] font-extrabold text-[#B42318] hover:underline">
                  {del.pending ? "Deleting…" : "Yes, delete"}
                </button>
                <button type="button" onClick={() => setConfirm(false)} className="text-[12.5px] font-extrabold text-[#5B667A]">Keep</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#5B667A] hover:text-[#B42318]">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
          {del.error && <div className="mt-2"><ErrorNote error={del.error} /></div>}
        </>
      )}
    </div>
  );
}
