"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CircleAlert, Clock, Download, FlaskConical, MapPin, Navigation, Plus, Share2, UserRound } from "lucide-react";
import { VerifiedBadge } from "@/components/home/ui";
import { ReviewButton, type ExistingReview } from "./ReviewButton";
import { DeskTitle, InfoRow, StatusDot, btnDanger, btnOutline, btnPrimary, card } from "./app-ui";
import { RemoteImage } from "@/components/RemoteImage";

export type BookingTab = "upcoming" | "completed" | "cancelled";

export type BookingItem = {
  id: string;
  kind: "visit" | "lab";
  tab: BookingTab;
  /** ok: booked and paid; unpaid: the booking fee isn't paid yet; done: visited; past: the date went by; cancelled. */
  state: "ok" | "unpaid" | "done" | "past" | "cancelled";
  statusLabel: string;
  title: string;
  sub: string;
  image: string | null;
  at: string | null;
  date: string;
  time: string | null;
  /** "in 2 days", "today" for upcoming visits. */
  relative: string | null;
  where: string;
  directions: string | null;
  token: string;
  bookingId: string;
  /** The booking fee: what was paid online, or what is due. */
  fee: string | null;
  /** What is paid at the counter. */
  rest: string;
  payHref: string | null;
  passHref: string;
  qr: string | null;
  prescription: string | null;
  report: string | null;
  rebookHref: string | null;
  supportHref: string;
  review: { doctorName: string; hospital: { id: string; name: string; city: string | null } | null; existing: ExistingReview | null } | null;
};

export type BookingStats = { upcoming: number; completed: number; spent: string; records: number };

const COLORS: Record<BookingItem["state"], string> = { ok: "#067647", unpaid: "#B42318", done: "#475467", past: "#B54708", cancelled: "#475467" };
const TABS: [BookingTab, string][] = [
  ["upcoming", "Upcoming"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

/** The patient's bookings: a reminder for unpaid ones, the next visit, every booking by tab, and the pass for one. */
export function BookingsClient({ items, stats, patient }: { items: BookingItem[]; stats: BookingStats; patient: { name: string; uhid: string } }) {
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const [phonePass, setPhonePass] = useState<string | null>(null);
  const upcoming = items.filter((b) => b.tab === "upcoming");
  const firstPaid = upcoming.find((b) => b.state === "ok") ?? null;
  const [deskPass, setDeskPass] = useState<string | null>(firstPaid?.id ?? upcoming[0]?.id ?? items[0]?.id ?? null);
  const unpaid = upcoming.find((b) => b.state === "unpaid") ?? null;
  const shown = items.filter((b) => b.tab === tab);
  const passItem = items.find((b) => b.id === phonePass) ?? null;
  const deskItem = items.find((b) => b.id === deskPass) ?? null;

  const openPass = (id: string) => {
    setDeskPass(id);
    if (window.matchMedia("(max-width: 1023px)").matches) setPhonePass(id);
  };

  return (
    <>
      <DeskTitle
        title="My bookings"
        subtitle="Appointments, lab tests and payments in one place"
        actions={
          <Link href="/find" className={btnPrimary}>
            <Plus className="w-4 h-4" strokeWidth={2.6} /> New booking
          </Link>
        }
      />

      <section aria-label="Booking summary" className="hidden lg:grid grid-cols-4 gap-4 mb-5">
        <Stat label="Upcoming" value={stats.upcoming} note="Doctor visits and lab tests" />
        <Stat label="Completed visits" value={stats.completed} note="Consultations and tests done" />
        <Stat label="Spent on bookings" value={stats.spent} note="Booking fees paid online" />
        <Stat label="Records" value={stats.records} note="Prescriptions and lab reports" />
      </section>

      {unpaid && (
        <div role="alert" className="mx-4 md:mx-6 lg:mx-0 mt-4 lg:mt-0 lg:mb-[18px] flex items-center gap-3 lg:gap-4 p-3 pl-3.5 lg:px-[18px] lg:py-3.5 rounded-2xl lg:rounded-[14px] bg-[#FEF3F2] shadow-[0_0_0_1px_#FBD5D1]">
          <span className="shrink-0 w-[38px] h-[38px] rounded-full bg-white shadow-[0_0_0_1px_#FBD5D1] flex items-center justify-center">
            <AlertTriangle className="w-[18px] h-[18px] text-[#B42318]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] lg:text-[14px] font-extrabold text-[#912018]">Booking fee not paid</span>
            <span className="block text-[12px] lg:text-[13px] leading-snug text-[#B42318]">
              {unpaid.title} · {[unpaid.date, unpaid.time].filter(Boolean).join(", ")}. It is confirmed once the fee is paid.
            </span>
          </span>
          {unpaid.payHref && (
            <Link href={unpaid.payHref} className={`${btnDanger} h-9! lg:h-[42px]! px-3.5! text-[12.5px]! lg:text-[13.5px]! shrink-0`}>
              Pay{unpaid.fee ? <span className="hidden lg:inline"> · {unpaid.fee}</span> : null}
            </Link>
          )}
        </div>
      )}

      {firstPaid && (
        <section aria-labelledby="next-title" className="lg:hidden pt-4 px-4 md:px-6">
          <div className={card}>
            <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
              <h2 id="next-title" className="text-[14px] font-extrabold">Next appointment</h2>
              <span className="text-[12px] font-bold text-[#067647]">Confirmed{firstPaid.relative ? ` · ${firstPaid.relative}` : ""}</span>
            </div>
            <div className="flex items-center gap-3 px-4 pt-3 pb-3.5">
              <Avatar item={firstPaid} size="w-12 h-12" />
              <span className="flex-1 min-w-0">
                <Title item={firstPaid} className="text-[15.5px]" />
                <span className="block text-[12.5px] text-[#5B667A] truncate">{firstPaid.sub}</span>
              </span>
            </div>
            <div className="grid grid-cols-[1fr_1fr_0.7fr] border-y border-[#EEF2F7]">
              <Cell label="Date" value={firstPaid.date} />
              <Cell label="Time" value={firstPaid.time ?? "Any time"} border />
              <Cell label="Token" value={firstPaid.token} border />
            </div>
            <div className="grid grid-cols-[1fr_1.4fr] gap-2 px-4 pt-3 pb-3.5">
              {firstPaid.directions ? (
                <a href={firstPaid.directions} target="_blank" rel="noreferrer" className={btnOutline}>
                  Directions
                </a>
              ) : (
                <Link href={firstPaid.supportHref} className={btnOutline}>
                  Help
                </Link>
              )}
              <button type="button" onClick={() => openPass(firstPaid.id)} className={btnPrimary}>
                Show at hospital
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start">
        <section aria-labelledby="list-title" className="pt-6 px-4 md:px-6 lg:p-[22px] lg:rounded-2xl lg:bg-white lg:shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)] min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3.5 lg:mb-4">
            <h2 id="list-title" className="text-[18px] lg:text-[16px] font-extrabold tracking-[-0.02em]">
              <span className="lg:hidden">My appointments</span>
              <span className="hidden lg:inline">Appointments</span>
            </h2>
            <div role="tablist" aria-label="Booking status" className="flex gap-1 p-1 rounded-[14px] lg:rounded-xl bg-[#E9EDF4] lg:bg-[#F4F6FA] lg:shadow-[inset_0_0_0_1px_#E6EAF0]">
              {TABS.map(([key, label]) => {
                const on = key === tab;
                const count = items.filter((b) => b.tab === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(key)}
                    className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 h-[38px] lg:h-[34px] px-3 lg:px-3.5 rounded-[10px] lg:rounded-[9px] text-[12.5px] lg:text-[13px] font-extrabold transition-colors ${
                      on ? "bg-white text-[#2A4DD0] shadow-[0_1px_3px_rgba(11,27,63,0.14)]" : "text-[#5B667A] hover:text-[#27324A]"
                    }`}
                  >
                    {label}
                    <span className={`px-[7px] py-px rounded-full text-[11px] ${on ? "bg-[#E8EEFF]" : "bg-[#E6EAF1] lg:bg-white"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="px-5 py-7 text-center rounded-[18px] bg-white lg:bg-[#F7F9FC] shadow-[0_0_0_1px_#E6EBF3] lg:shadow-none">
              <span className="inline-flex w-12 h-12 rounded-full bg-white shadow-[inset_0_0_0_1px_#E1E7F0] items-center justify-center text-[#2A4DD0]">
                <CalendarDays className="w-[22px] h-[22px]" />
              </span>
              <p className="mt-2.5 text-[15px] font-extrabold">No {tab} bookings</p>
              <p className="mt-0.5 text-[12.5px] text-[#5B667A]">
                {tab === "upcoming" ? (
                  <>
                    Book a doctor or a lab test and it shows here.{" "}
                    <Link href="/find" className="font-extrabold text-[#2A4DD0] hover:underline">
                      Find care
                    </Link>
                  </>
                ) : tab === "completed" ? (
                  "Visits and tests you have had show here, with their prescriptions and reports."
                ) : (
                  "Cancelled bookings show here."
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 lg:hidden">
                {shown.map((b) => (
                  <BookingCard key={b.id} item={b} onPass={() => openPass(b.id)} />
                ))}
              </div>
              <DeskTable items={shown} selected={deskPass} onPass={(id) => setDeskPass(id)} />
            </>
          )}
        </section>

        <aside className="hidden lg:block sticky top-[96px]">
          {deskItem ? <Pass item={deskItem} patient={patient} /> : <NoPass />}
        </aside>
      </div>

      {passItem && <PhonePass item={passItem} patient={patient} onClose={() => setPhonePass(null)} />}
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className={`${card} px-5 py-[18px]`}>
      <span className="block text-[13px] font-bold text-[#5B667A]">{label}</span>
      <span className="block mt-2 text-[28px] font-extrabold tracking-[-0.03em] leading-[1.1] tabular-nums">{value}</span>
      <span className="block mt-1.5 text-[12.5px] font-bold text-[#5B667A]">{note}</span>
    </div>
  );
}

function Cell({ label, value, border = false }: { label: string; value: string; border?: boolean }) {
  return (
    <span className={`px-4 py-2.5 ${border ? "border-l border-[#EEF2F7]" : ""}`}>
      <span className="block text-[11px] font-bold text-[#5B667A]">{label}</span>
      <span className="block mt-0.5 text-[14px] font-extrabold truncate">{value}</span>
    </span>
  );
}

function Avatar({ item, size }: { item: BookingItem; size: string }) {
  if (item.image) {
    return <RemoteImage src={item.image} alt="" width={48} height={48} className={`shrink-0 ${size} rounded-xl object-cover object-top bg-[#EEF1F5]`} />;
  }
  return (
    <span className={`shrink-0 ${size} rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center`}>
      {item.kind === "lab" ? <FlaskConical className="w-5 h-5" /> : <UserRound className="w-5 h-5" />}
    </span>
  );
}

function Title({ item, className = "" }: { item: BookingItem; className?: string }) {
  return (
    <span className={`flex items-center gap-[5px] font-extrabold min-w-0 ${className}`}>
      <span className="truncate capitalize">{item.title}</span>
      {item.kind === "visit" && <VerifiedBadge className="w-3.5 h-3.5" />}
    </span>
  );
}

/** A booking on phones: token, who, when and where, a note when unpaid, and two actions. */
function BookingCard({ item: b, onPass }: { item: BookingItem; onPass: () => void }) {
  const unpaid = b.state === "unpaid";
  const [first, second] = actions(b, onPass);
  return (
    <article className={`p-3.5 rounded-[18px] bg-white ${unpaid ? "shadow-[0_0_0_1px_#FBD5D1]" : "shadow-[0_0_0_1px_#E6EBF3]"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold tracking-[0.02em] text-[#5B667A]">{unpaid || b.state === "cancelled" ? `Booking ${b.bookingId}` : `Token ${b.token}`}</span>
        <StatusDot label={b.statusLabel} color={COLORS[b.state]} />
      </div>
      <div className="mt-3 min-w-0">
        <Title item={b} className="text-[15px]" />
        <span className="block text-[12.5px] text-[#5B667A] truncate">{b.sub}</span>
      </div>
      <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-[#EEF2F7] text-[12.5px] text-[#27324A]">
        <span className="flex items-center gap-2">
          <Clock className="w-[15px] h-[15px] text-[#4A5878] shrink-0" />
          {[b.date, b.time].filter(Boolean).join(" · ")}
        </span>
        <span className="flex items-center gap-2 min-w-0">
          <MapPin className="w-[15px] h-[15px] text-[#4A5878] shrink-0" />
          <span className="truncate">{b.where}</span>
        </span>
      </div>
      {unpaid && (
        <p className="flex gap-2 mt-2.5 text-[12px] leading-[1.45] text-[#B42318]">
          <CircleAlert className="w-[15px] h-[15px] shrink-0 mt-px" />
          <span>The booking fee{b.fee ? ` of ${b.fee}` : ""} isn&apos;t paid yet, so this booking isn&apos;t confirmed.</span>
        </p>
      )}
      <div className="grid grid-cols-[1fr_1.25fr] gap-2 mt-3">
        {first}
        {second}
      </div>
      {b.review && (
        <div className="mt-2.5 flex justify-end">
          <ReviewButton appointmentId={b.id} doctorName={b.review.doctorName} hospital={b.review.hospital} existing={b.review.existing} />
        </div>
      )}
    </article>
  );
}

/** A booking's two buttons, by its state. */
function actions(b: BookingItem, onPass: () => void) {
  const pass = (label: string, cls = btnPrimary) => (
    <button key="pass" type="button" onClick={onPass} className={cls}>
      {label}
      {cls === btnPrimary && <ArrowRight className="w-[15px] h-[15px]" strokeWidth={2.6} />}
    </button>
  );
  const link = (key: string, href: string | null, label: string, cls = btnOutline, external = false) =>
    href ? (
      external ? (
        <a key={key} href={href} target="_blank" rel="noreferrer" className={cls}>
          {label}
        </a>
      ) : (
        <Link key={key} href={href} className={cls}>
          {label}
        </Link>
      )
    ) : null;
  switch (b.state) {
    case "unpaid":
      return [pass("View details", btnOutline), link("pay", b.payHref, b.fee ? `Pay · ${b.fee}` : "Pay now", btnDanger)];
    case "ok":
      return [link("dir", b.directions, "Directions", btnOutline, true) ?? link("help", b.supportHref, "Help"), pass("View appointment")];
    case "done":
      return [
        b.prescription ? link("rx", b.prescription, "Prescription", btnOutline, true) : b.report ? link("report", b.report, "View report", btnOutline, true) : link("slip", b.passHref, "Booking slip"),
        link("again", b.rebookHref, b.kind === "lab" ? "Book again" : "Book follow-up", btnPrimary) ?? pass("Details"),
      ];
    case "past":
      return [link("slip", b.passHref, "Booking slip"), link("again", b.rebookHref, "Book again", btnPrimary) ?? link("help", b.supportHref, "Help", btnPrimary)];
    default:
      return [link("help", b.supportHref, "Help"), link("again", b.rebookHref, "Book again", btnPrimary) ?? link("find", "/find", "Find care", btnPrimary)];
  }
}

/** Desktop: the bookings as a table, each with its status and an action. */
function DeskTable({ items, selected, onPass }: { items: BookingItem[]; selected: string | null; onPass: (id: string) => void }) {
  const cols = "grid grid-cols-[minmax(0,1.5fr)_1fr_1.1fr_128px_116px] gap-4";
  return (
    <div className="hidden lg:block">
      <div className={`${cols} px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] text-[#5B667A] uppercase`}>
        <span>Appointment</span>
        <span>Date &amp; time</span>
        <span>Location</span>
        <span>Status</span>
        <span />
      </div>
      {items.map((b) => {
        const unpaid = b.state === "unpaid";
        return (
          <div key={b.id} className={`${cols} items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px] ${selected === b.id ? "bg-[#F7F9FF] -mx-3.5 px-3.5" : ""}`}>
            <span className="flex items-center gap-3 min-w-0">
              <Avatar item={b} size="w-10 h-10" />
              <span className="min-w-0">
                <span className="block font-extrabold truncate capitalize">{b.title}</span>
                <span className="block text-[12.5px] text-[#5B667A] truncate">
                  {b.sub} · {unpaid || b.state === "cancelled" ? "Token after payment" : `Token ${b.token}`}
                </span>
              </span>
            </span>
            <span className="font-bold">{[b.date, b.time].filter(Boolean).join(" · ")}</span>
            <span className="text-[#27324A] truncate">{b.where}</span>
            <StatusDot label={b.statusLabel} color={COLORS[b.state]} />
            {unpaid && b.payHref ? (
              <Link href={b.payHref} className={`${btnDanger} h-9! px-3! text-[12.5px]!`}>
                Pay now
              </Link>
            ) : (
              <button type="button" onClick={() => onPass(b.id)} aria-pressed={selected === b.id} className={`${btnOutline} h-9! px-3! text-[12.5px]!`}>
                View pass
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QrBlock({ item, size }: { item: BookingItem; size: number }) {
  if (!item.qr) return null;
  return (
    <span className="shrink-0 p-2 rounded-[14px] shadow-[0_0_0_1px_#E1E7F0] flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.qr} alt={`QR code for booking ${item.bookingId}`} width={size} height={size} style={{ width: size, height: size }} />
    </span>
  );
}

/** Desktop: the selected booking's pass beside the table. */
function Pass({ item: b, patient }: { item: BookingItem; patient: { name: string; uhid: string } }) {
  const showToken = b.state === "ok" || b.state === "done";
  return (
    <div className="rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
      <div className="px-[22px] py-[18px] bg-[#2A4DD0] text-white">
        <span className="block text-[11.5px] font-extrabold tracking-[0.08em] text-[#CFDCFF]">{b.kind === "lab" ? "LAB TEST PASS" : "APPOINTMENT PASS"}</span>
        <span className="flex items-center gap-1.5 mt-1 text-[19px] font-extrabold min-w-0">
          <span className="truncate capitalize">{b.title}</span>
        </span>
        <span className="block text-[13px] text-[#E3EAFF] truncate">{b.sub}</span>
      </div>
      <div className="px-[22px] py-5">
        {showToken && b.qr ? (
          <div className="flex items-center gap-5">
            <QrBlock item={b} size={124} />
            <span>
              <span className="block text-[11.5px] font-extrabold tracking-[0.08em] text-[#5B667A]">TOKEN</span>
              <span className="block text-[44px] font-extrabold text-[#2A4DD0] tracking-[-0.03em] leading-none">{b.token}</span>
              <span className="block mt-1.5 text-[12.5px] leading-[1.45] text-[#5B667A]">{b.kind === "lab" ? "Show at the lab's front desk" : "Show at reception to check in"}</span>
            </span>
          </div>
        ) : (
          <PassNote item={b} />
        )}
        <div className="mt-4">
          <InfoRow label="Date & time" value={[b.date, b.time].filter(Boolean).join(", ")} />
          <InfoRow label="Location" value={b.where} />
          <InfoRow label="Patient" value={patient.name} />
          <InfoRow label="Booking ID" value={b.bookingId} />
          <InfoRow label="Booking fee" value={b.fee ? `${b.fee} · ${b.state === "unpaid" ? "Due" : "Paid"}` : "—"} valueClass={b.state === "unpaid" ? "text-[#B42318]" : ""} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link href={b.passHref} className={btnOutline}>
            <Download className="w-[15px] h-[15px]" /> Booking slip
          </Link>
          {b.state === "unpaid" && b.payHref ? (
            <Link href={b.payHref} className={btnDanger}>
              Pay now
            </Link>
          ) : b.directions ? (
            <a href={b.directions} target="_blank" rel="noreferrer" className={btnPrimary}>
              Directions
            </a>
          ) : (
            <Link href={b.supportHref} className={btnPrimary}>
              Help
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function PassNote({ item: b }: { item: BookingItem }) {
  if (b.state === "unpaid") {
    return (
      <div className="p-3.5 rounded-[14px] bg-[#FEF3F2] shadow-[0_0_0_1px_#FBD5D1]">
        <p className="text-[13.5px] font-extrabold text-[#912018]">Booking fee not paid yet</p>
        <p className="mt-1 text-[12.5px] leading-[1.45] text-[#B42318]">Your token and QR code appear here once the booking fee is paid.</p>
      </div>
    );
  }
  return (
    <div className="p-3.5 rounded-[14px] bg-[#F6F8FC] text-[12.5px] leading-[1.45] text-[#4A5878]">
      {b.state === "cancelled" ? "This booking was cancelled." : b.state === "past" ? "The date of this booking has passed." : "The pass is kept on the booking slip."}
    </div>
  );
}

function NoPass() {
  return (
    <div className={`${card} p-[22px] text-center`}>
      <span className="inline-flex w-12 h-12 rounded-full shadow-[inset_0_0_0_1px_#E1E7F0] items-center justify-center text-[#2A4DD0]">
        <CalendarDays className="w-[22px] h-[22px]" />
      </span>
      <p className="mt-2.5 text-[15px] font-extrabold">Your appointment pass</p>
      <p className="mt-0.5 text-[12.5px] text-[#5B667A]">Book a visit and its token and QR code show here.</p>
    </div>
  );
}

/** Phones: the pass over the page, with the token and QR code to show at the desk. */
function PhonePass({ item: b, patient, onClose }: { item: BookingItem; patient: { name: string; uhid: string }; onClose: () => void }) {
  const paid = b.state === "ok" || b.state === "done";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const share = async () => {
    const url = new URL(b.passHref, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: b.kind === "lab" ? "Lab test pass" : "Appointment pass", url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* the patient closed the share sheet */
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={b.kind === "lab" ? "Lab test pass" : "Appointment pass"} className="lg:hidden fixed inset-0 z-[60] overflow-y-auto bg-[#F6F8FC] font-(family-name:--font-manrope) text-[#0B1B3F] pb-10">
      <header className="relative px-3.5 pt-[calc(env(safe-area-inset-top)+14px)] pb-16 bg-[#2A4DD0] text-white">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Back to bookings" className="shrink-0 w-11 h-11 rounded-full bg-white/[0.14] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
          <h1 className="flex-1 text-[17px] font-extrabold">{b.kind === "lab" ? "Lab test pass" : "Appointment pass"}</h1>
          <button type="button" onClick={share} aria-label="Share pass" className="shrink-0 w-11 h-11 rounded-full bg-white/[0.14] flex items-center justify-center">
            <Share2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>
      <section className="relative -mt-[50px] mx-3.5 rounded-[22px] bg-white shadow-[0_14px_30px_rgba(11,27,63,0.12)] overflow-hidden">
        <div className="px-[18px] pt-[18px] pb-4 text-center">
          <span
            className="inline-flex items-center gap-1.5 h-[26px] px-[11px] rounded-full text-[12px] font-extrabold"
            style={{ color: COLORS[b.state], background: b.state === "ok" ? "#ECFDF3" : b.state === "unpaid" ? "#FEF3F2" : "#F2F4F7" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[b.state] }} />
            {b.statusLabel}
          </span>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[18px] font-extrabold">
            <span className="truncate capitalize">{b.title}</span>
            {b.kind === "visit" && <VerifiedBadge className="w-4 h-4" />}
          </p>
          <p className="mt-0.5 text-[13px] text-[#5B667A]">{b.sub}</p>
        </div>
        <div aria-hidden className="relative h-[18px] flex items-center">
          <span className="absolute -left-[9px] w-[18px] h-[18px] rounded-full bg-[#F6F8FC]" />
          <span className="flex-1 mx-[18px] border-t-[1.5px] border-dashed border-[#D6DDE8]" />
          <span className="absolute -right-[9px] w-[18px] h-[18px] rounded-full bg-[#F6F8FC]" />
        </div>
        {paid && b.qr ? (
          <div className="flex items-center gap-4 px-[18px] pt-3.5 pb-1.5">
            <QrBlock item={b} size={136} />
            <span className="min-w-0">
              <span className="block text-[10.5px] font-extrabold tracking-[0.08em] text-[#5B667A]">TOKEN</span>
              <span className="block text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#2A4DD0]">{b.token}</span>
              <span className="block mt-2 text-[12px] leading-[1.45] text-[#4A5878]">
                Show this pass at the {b.kind === "lab" ? "lab's front desk" : "reception desk"}. The staff scan it to check you in.
              </span>
            </span>
          </div>
        ) : (
          <div className="mx-[18px] mt-3 mb-1">
            <PassNote item={b} />
            {b.state === "unpaid" && b.payHref && (
              <Link href={b.payHref} className={`${btnDanger} w-full mt-3`}>
                Pay booking fee{b.fee ? ` · ${b.fee}` : ""}
              </Link>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 px-[18px] pt-3.5 pb-[18px]">
          <Field label="DATE & TIME" value={[b.date, b.time].filter(Boolean).join(", ")} />
          <Field label="BOOKING ID" value={b.bookingId} />
          <Field label="PATIENT" value={patient.name} />
          <Field label="UHID" value={patient.uhid} />
          <Field label="LOCATION" value={b.where} wide />
        </div>
      </section>
      <section aria-labelledby="pay-title" className="mx-3.5 mt-3.5 px-4 pt-3.5 pb-2 rounded-[18px] bg-white shadow-[0_0_0_1px_#E6EBF3]">
        <h2 id="pay-title" className="mb-1 text-[15px] font-extrabold">Payment</h2>
        <InfoRow label="Booking fee" value={b.fee ?? "—"} />
        <InfoRow label="Status" value={b.state === "unpaid" ? "Not paid" : b.state === "cancelled" ? "Cancelled" : "Paid online"} valueClass={b.state === "unpaid" ? "text-[#B42318]" : "text-[#067647]"} />
        <InfoRow label="Pay at the counter" value={b.rest} />
      </section>
      {paid && (
        <section className="mx-3.5 mt-3.5 px-4 py-3.5 rounded-[18px] bg-[#EEF3FF]">
          <h2 className="mb-2 text-[14px] font-extrabold text-[#1F3FB8]">Before you go</h2>
          <p className="text-[12.5px] leading-[1.6] text-[#27324A]">
            Arrive 15 minutes early · Carry a photo ID · Bring previous reports and prescriptions
          </p>
        </section>
      )}
      <div className="grid grid-cols-3 gap-2 mx-3.5 mt-3.5">
        {b.directions ? (
          <a href={b.directions} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-1 h-16 rounded-[14px] bg-white shadow-[0_0_0_1px_#E6EBF3] text-[12px] font-extrabold text-[#27324A]">
            <Navigation className="w-[18px] h-[18px] text-[#2A4DD0]" /> Directions
          </a>
        ) : (
          <span />
        )}
        <Link href={b.passHref} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[14px] bg-white shadow-[0_0_0_1px_#E6EBF3] text-[12px] font-extrabold text-[#27324A]">
          <Download className="w-[18px] h-[18px] text-[#2A4DD0]" /> Slip
        </Link>
        <Link href={b.supportHref} className="flex flex-col items-center justify-center gap-1 h-16 rounded-[14px] bg-white shadow-[0_0_0_1px_#E6EBF3] text-[12px] font-extrabold text-[#27324A]">
          <CircleAlert className="w-[18px] h-[18px] text-[#2A4DD0]" /> Help
        </Link>
      </div>
      <p className="mt-[18px] px-6 text-center text-[12.5px] text-[#5B667A]">
        Need to change or cancel?{" "}
        <Link href={b.supportHref} className="font-extrabold text-[#2A4DD0]">
          Contact support
        </Link>
      </p>
    </div>
  );
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <span className={wide ? "col-span-2" : ""}>
      <span className="block text-[10.5px] font-extrabold tracking-[0.06em] text-[#5B667A]">{label}</span>
      <span className="block mt-0.5 text-[13.5px] font-extrabold break-words">{value}</span>
    </span>
  );
}

