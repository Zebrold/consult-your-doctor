"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck, Footprints, IdCard, LoaderCircle, Lock, LogIn, Share2, UserRound } from "lucide-react";
import { VerifiedBadge } from "@/components/home/ui";
import { SPECIALITIES, specialityIcon } from "@/components/home/specialities";
import { doctorName, formatDayLabel, formatINR, formatSlot, formatTime, initials, istDateKey } from "./format";
import { InfoRow, card } from "./app-ui";
import { RemoteImage } from "@/components/RemoteImage";
import { onlinePayable, sumPrices, type BookedTest, type BookingFees } from "@/lib/pricing";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo";
import { finalizeConsultationAppointment } from "@/app/actions/booking";
import { startOnlinePayment, WINDOW_CLOSED } from "@/lib/razorpay-client";
import { doctorBookingHref } from "@/lib/booking-links";
import { AppointmentTypePicker, PaySummary, ServicePicker, bookingFeeItem } from "./BookingChoices";
import { PayableTable } from "./PayableTable";
import { appendPatientDetails, FormError, OnlinePayNote, patientDetailsError, RefundNote, type PatientDetails } from "./booking-ui";
import { usePatientLocation } from "./location";
import { WhoFor } from "./WhoFor";
import { WALK_IN, type WalkInState } from "@/lib/walk-in";

export type HospitalDoctor = {
  id: string;
  name: string | null;
  specialty: string | null;
  /** "Cardiologist · MBBS, DM · 18+ yrs" */
  quals: string;
  image: string | null;
  /** The hospital has set the consultation fee, so the doctor can be booked online. */
  bookable: boolean;
  /** The consultation fee, paid at the hospital. */
  fee: number | null;
  /** Their next open times, soonest first. */
  slots: { id: string; start: string }[];
  /** Walk-ins are open at the hospital now and this doctor can take one (bookable, not on leave today). */
  walkIn?: boolean;
};

/** The speciality's icon when one of the app's specialities covers it. */
function iconFor(specialty: string) {
  const s = SPECIALITIES.find((x) => x.match.test(specialty.trim().toLowerCase()));
  return s ? specialityIcon(s) : null;
}

/** A doctor's open times grouped by day (India time), in order. */
function byDay(slots: HospitalDoctor["slots"], now: number) {
  const days: { key: string; label: string; slots: HospitalDoctor["slots"] }[] = [];
  for (const s of slots) {
    const key = istDateKey(s.start);
    const day = days.find((d) => d.key === key);
    if (day) day.slots.push(s);
    else days.push({ key, label: formatDayLabel(s.start, now), slots: [s] });
  }
  return days;
}

/**
 * Booking at one hospital, start to finish: pick a speciality, a doctor, a day and one of their open times, then (once
 * the database has them, `choices`) general or fast track and any hospital services, and confirm and pay the booking
 * fee right here. Signed-out patients log in and come back to this page with everything still picked.
 * Phones keep the booking fee and the next step in a bar at the bottom; desktops in a summary.
 */
export function HospitalBooking({
  hospitalId,
  doctors,
  fees,
  choices,
  services,
  now,
  patient,
  initialSpeciality = null,
  initialDoctor = null,
  initialSlot = null,
  initialFastTrack = false,
  initialServices = [],
  freeFollowUp = [],
  walkIn = null,
  initialWalkIn = false,
  preview = false,
  intro,
  children,
}: {
  hospitalId: string;
  doctors: HospitalDoctor[];
  fees: BookingFees;
  /** Fast track and services can be stored on a booking (lib/booking-options.ts). */
  choices: boolean;
  /** The hospital's priced services. */
  services: BookedTest[];
  now: number;
  /** The signed-in patient's saved details, or null for a signed-out visitor. */
  patient: PatientDetails | null;
  /** The speciality tab to open on, e.g. when the patient came from that speciality's hospitals. */
  initialSpeciality?: string | null;
  /** What to open with picked: from Book on a doctor elsewhere, or coming back after logging in. */
  initialDoctor?: string | null;
  initialSlot?: string | null;
  initialFastTrack?: boolean;
  initialServices?: string[];
  /** Doctors this patient can book a free follow-up with (no booking fee, lib/follow-up.ts). */
  freeFollowUp?: string[];
  /** The hospital's walk-in hours and whether they are open now (lib/walk-in.ts); null when it takes no walk-ins. */
  walkIn?: WalkInState | null;
  /** Opened from the hospital's walk-in QR code: picking a doctor picks "Walk in now" with them. */
  initialWalkIn?: boolean;
  /** The hospital's own preview of this page: nothing can be booked, and no booking action is ever called. */
  preview?: boolean;
  /** Cards above the doctors (the consultation charges). */
  intro?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const specialties = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of doctors) counts.set(d.specialty || "General", (counts.get(d.specialty || "General") ?? 0) + 1);
    return Array.from(counts.keys()).sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b));
  }, [doctors]);
  const preset = doctors.find((d) => d.id === initialDoctor) ?? null;
  const presetSlot = preset?.slots.find((s) => s.id === initialSlot) ?? null;
  const [spec, setSpec] = useState(
    preset ? preset.specialty || "General" : initialSpeciality && specialties.includes(initialSpeciality) ? initialSpeciality : (specialties[0] ?? ""),
  );
  const [doctorId, setDoctorId] = useState<string | null>(preset?.id ?? null);
  const [slotId, setSlotId] = useState<string | null>(initialSlot === WALK_IN ? (preset?.walkIn ? WALK_IN : null) : (presetSlot?.id ?? null));
  const [day, setDay] = useState<string | null>(presetSlot ? istDateKey(presetSlot.start) : null);
  const [fastTrack, setFastTrack] = useState(choices && initialFastTrack);
  const [picked, setPicked] = useState<string[]>(initialServices);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  // What the reserved booking was made for, so a second Pay click with the same choice can reuse it.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // A family member the visit is for (null: the account holder).
  const [forId, setForId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);
  // Bring the doctor the patient chose into view, below the sticky header.
  useEffect(() => {
    presetRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const shown = doctors.filter((d) => (d.specialty || "General") === spec);
  const doctor = doctors.find((d) => d.id === doctorId) ?? null;
  // A walk-in is booked for the moment the patient confirms (lib/walk-in.ts); `now` stands in for its time until then.
  const walkInSlot = useMemo(() => ({ id: WALK_IN, start: new Date(now).toISOString() }), [now]);
  const slot = slotId === WALK_IN ? (doctor?.walkIn ? walkInSlot : null) : (doctor?.slots.find((s) => s.id === slotId) ?? null);
  const slotText = (s: { id: string; start: string }) => (s.id === WALK_IN ? "Walk-in, today" : formatSlot(s.start, now));
  const ready = !!doctor && doctor.bookable && !!slot;
  // A general booking with a doctor seen in the last 12 days is a free follow-up; the server decides it again on booking.
  const followUp = !!doctor && !(choices && fastTrack) && freeFollowUp.includes(doctor.id);
  const bookingFee = followUp ? 0 : choices && fastTrack ? fees.fastTrack : fees.consultation;
  // What is collected online: the booking fee and the payment convenience fee on it (lib/pricing.ts).
  const payable = onlinePayable(bookingFee, fees.conveniencePercent);
  const pickedServices = choices ? services.filter((s) => picked.includes(s.name)) : [];
  const servicesTotal = sumPrices(pickedServices);
  const payLater = pickedServices.length ? `Consultation + ${pickedServices.length} ${pickedServices.length === 1 ? "service" : "services"}` : "Consultation fee";
  const payLaterAmount = doctor?.fee ? formatINR(doctor.fee + servicesTotal) : servicesTotal ? `${formatINR(servicesTotal)} + consultation` : "At the hospital";
  // Logging in brings the patient back here with the doctor, time, type and services still picked.
  const loginHref = `/login/patient?next=${encodeURIComponent(
    doctor ? doctorBookingHref(doctor.id, hospitalId, { slotId, fastTrack: choices && fastTrack, services: pickedServices.map((s) => s.name) }) : `/hospitals/${hospitalId}`,
  )}`;
  const missing = patient ? patientDetailsError(patient) : null;
  const cta = preview
    ? "Booking is off in preview"
    : !doctor
    ? "Select a doctor"
    : !doctor.bookable
      ? "Booking unavailable"
      : !doctor.slots.length && !doctor.walkIn
        ? "No open times"
        : !slot
          ? "Pick a time"
          : !patient
            ? "Log in to book"
            : submitting
              ? "Reserving…"
              : followUp
                ? "Confirm free follow-up"
                : `Confirm & pay ${formatINR(payable.total)}`;

  const pickSpec = (s: string) => {
    setSpec(s);
    setDoctorId(null);
    setSlotId(null);
    setDay(null);
    setError(null);
  };
  const pickDoctor = (id: string) => {
    const next = doctorId === id ? null : id;
    setDoctorId(next);
    // From the walk-in QR code, picking a doctor picks their walk-in too (they can still choose a time instead).
    setSlotId(next && initialWalkIn && doctors.find((d) => d.id === next)?.walkIn ? WALK_IN : null);
    setDay(null);
    setError(null);
  };

  const confirm = async () => {
    if (preview || !doctor || !slot || !patient) return;
    if (missing) return setError(missing);
    setSubmitting(true);
    setError(null);
    const choiceKey = [doctor.id, slot.id, choices && fastTrack ? "ft" : "std", pickedServices.map((s) => s.name).sort().join(","), forId ?? ""].join("|");
    // The same choice as the reserved booking: pay for it again instead of reserving a second one.
    if (pendingId && pendingKey === choiceKey) {
      const retryError = await startOnlinePayment({
        bookingId: pendingId,
        product: "Consultation",
        name: patient.name || "Patient",
        email: (patient.email || "").trim() || null,
        phone: patient.phone || null,
      });
      if (retryError) {
        setError(retryError === WINDOW_CLOSED ? `Your slot is reserved. ${retryError}` : `Your slot is reserved, but the payment couldn't start: ${retryError}`);
        setSubmitting(false);
      }
      return;
    }
    // A different choice: the earlier reservation is no longer the one being paid for.
    setPendingId(null);
    setPendingKey(null);
    const form = new FormData();
    form.append("doctor_id", doctor.id);
    form.append("schedule_id", slot.id);
    // A walk-in is booked at this hospital, for now.
    if (slot.id === WALK_IN) form.append("hospital_id", hospitalId);
    if (choices && fastTrack) form.append("booking_type", "fast_track");
    for (const s of pickedServices) form.append("services", s.name);
    if (forId) form.append("family_member_id", forId);
    appendPatientDetails(form, patient);

    const res = await finalizeConsultationAppointment(form);
    if ("error" in res && res.error) {
      setError(res.error);
      setSubmitting(false);
      // Someone else took the time, or walk-ins just closed: reload the open times.
      if (/slot|walk-in/i.test(res.error)) router.refresh();
      return;
    }
    const appointmentId = "appointmentId" in res ? res.appointmentId : undefined;
    if (!appointmentId) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    // A free follow-up is confirmed with nothing to pay.
    if ("confirmed" in res && res.confirmed) {
      router.push(`/book/confirmation/${appointmentId}`);
      return;
    }
    const payError = await startOnlinePayment({
      bookingId: appointmentId,
      product: "Consultation",
      name: patient.name || "Patient",
      email: (patient.email || "").trim() || null,
      phone: patient.phone || null,
    });
    if (payError) {
      setPendingId(appointmentId);
      setPendingKey(choiceKey);
      setError(payError === WINDOW_CLOSED ? `Your slot is reserved. ${payError}` : `Your slot is reserved, but the payment couldn't start: ${payError}`);
      setSubmitting(false);
    }
  };

  /** "Walk in now" for this doctor, while the hospital takes walk-ins (lib/walk-in.ts). */
  const walkInChoice = (d: HospitalDoctor) => {
    if (!d.walkIn) return null;
    const on = slotId === WALK_IN && doctorId === d.id;
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          setSlotId(WALK_IN);
          setError(null);
        }}
        className={`w-full flex items-center gap-3 mb-3 px-3.5 py-2.5 rounded-[12px] border-[1.5px] text-left transition-colors ${
          on ? "border-[#2A4DD0] bg-[#2A4DD0] text-white" : "border-[#A9BCEF] bg-[#F3F6FF] text-[#0B1B3F] hover:border-[#2A4DD0]"
        }`}
      >
        <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${on ? "bg-white/15 text-white" : "bg-white text-[#2A4DD0]"}`}>
          <Footprints className="w-[18px] h-[18px]" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-extrabold">Walk in now</span>
          <span className={`block text-[12px] ${on ? "text-white/85" : "text-[#5B667A]"}`}>Join {doctorName(d.name)}&apos;s queue today{walkIn?.open ? ` · ${walkIn.note.replace(/^Open now /, "open ")}` : ""}</span>
        </span>
        {on && <CircleCheck className="w-5 h-5 shrink-0" />}
      </button>
    );
  };

  const times = (d: HospitalDoctor) => {
    if (!d.bookable) return <p className="text-[12.5px] text-[#5B667A]">Online booking for {doctorName(d.name)} isn&apos;t open yet.</p>;
    const walk = walkInChoice(d);
    if (!d.slots.length)
      return walk ? (
        <>
          {walk}
          <p className="text-[12.5px] text-[#5B667A]">No later times published yet.</p>
        </>
      ) : (
        <p className="text-[12.5px] text-[#5B667A]">No open times yet. They appear here as soon as the hospital publishes them.</p>
      );
    const days = byDay(d.slots, now);
    const open = days.find((x) => x.key === day) ?? days[0];
    return (
      <>
        {walk}
        {walk && <p className="mb-2 text-[12.5px] font-extrabold text-[#5B667A]">Or book a time</p>}
        <div role="tablist" aria-label="Days with open times" className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 lg:mx-0 px-3 lg:px-0 pb-0.5 mb-2.5">
          {days.map((x) => {
            const on = x.key === open.key;
            return (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setDay(x.key);
                  if (!x.slots.some((s) => s.id === slotId)) setSlotId(null);
                }}
                className={`shrink-0 min-w-[78px] px-3 py-1.5 rounded-[12px] border-[1.5px] text-center transition-colors ${
                  on ? "border-[#2A4DD0] bg-[#2A4DD0] text-white" : "border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9CBFF]"
                }`}
              >
                <span className="block text-[12.5px] font-extrabold whitespace-nowrap">{x.label}</span>
                <span className={`block text-[11px] font-bold whitespace-nowrap ${on ? "text-white/80" : "text-[#5B667A]"}`}>{x.slots.length} open</span>
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label={`Times, ${open.label}`} className="grid grid-cols-3 lg:grid-cols-5 gap-2">
          {open.slots.map((s) => {
            const on = s.id === slotId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setSlotId(s.id);
                  setError(null);
                }}
                className={`min-h-[38px] lg:min-h-10 px-2 rounded-[10px] border-[1.5px] text-[12.5px] font-extrabold transition-colors ${
                  on ? "border-[#2A4DD0] bg-[#2A4DD0] text-white" : "border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9CBFF]"
                }`}
              >
                {formatTime(s.start)}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const errorNote = error && (
    <FormError>
      {error}
      {pendingId && (
        <>
          {" "}
          <Link href={`/patient/checkout/${pendingId}`} className="font-bold underline">
            Pay from checkout
          </Link>
        </>
      )}
    </FormError>
  );

  return (
    <>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start">
        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          {intro}
          <section id="book" aria-labelledby="book-title" className={`scroll-mt-24 p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
            <h2 id="book-title" className="text-[16px] font-extrabold">Book a doctor here</h2>
            <p className="mt-1 mb-3 text-[12.5px] text-[#5B667A]">{specialties.length > 1 ? "Pick a speciality, select a doctor, then pick a day and time." : "Select a doctor, then pick a day and time."}</p>
            {walkIn && doctors.length > 0 && (
              <div className={`mb-3.5 flex items-start gap-3 px-3.5 py-3 rounded-[14px] ${walkIn.open ? "bg-[#ECFDF3] text-[#05603A]" : "bg-[#F6F8FC] text-[#27324A]"}`}>
                <Footprints className="w-5 h-5 mt-px shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-extrabold">{walkIn.open ? "Walk-ins open now" : "Walk-in hours"} · {walkIn.hours}</span>
                  <span className={`block mt-0.5 text-[12.5px] leading-snug ${walkIn.open ? "text-[#067647]" : "text-[#5B667A]"}`}>
                    {walkIn.open
                      ? "Pick a doctor, then Walk in now to join their queue today. You pay the booking fee here and the consultation fee at the hospital."
                      : `${walkIn.note}. You can still book a time below.`}
                  </span>
                </span>
              </div>
            )}
            {doctors.length === 0 ? (
              <p className="py-3 border-t border-[#EEF2F7] text-[13px] text-[#5B667A]">No doctors are listed at this hospital yet.</p>
            ) : (
              <>
                <div role="tablist" aria-label="Specialities at this hospital" className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 lg:mx-0 px-4 lg:px-0 pb-0.5 mb-3 lg:mb-3.5 lg:flex-wrap">
                  {specialties.map((s) => {
                    const on = s === spec;
                    const icon = iconFor(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => pickSpec(s)}
                        className={`shrink-0 flex items-center gap-1.5 h-9 lg:h-[38px] ${icon ? "pl-1.5" : "pl-3.5"} pr-3 lg:pr-3.5 rounded-full border-[1.5px] text-[12.5px] lg:text-[13px] font-extrabold whitespace-nowrap transition-colors ${
                          on ? "border-[#2A4DD0] bg-[#E8EEFF] text-[#2A4DD0]" : "border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9CBFF]"
                        }`}
                      >
                        {icon && (
                          <span className="w-[26px] h-[26px] rounded-full bg-white flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={icon} alt="" className="w-5 h-5" />
                          </span>
                        )}
                        {s}
                      </button>
                    );
                  })}
                </div>
                <div role="radiogroup" aria-labelledby="book-title" className="flex flex-col lg:grid lg:grid-cols-2 gap-2.5">
                  {shown.map((d) => {
                    const on = d.id === doctorId;
                    return (
                      <div
                        key={d.id}
                        ref={d.id === preset?.id ? presetRef : undefined}
                        className={`scroll-mt-24 rounded-[14px] border-[1.5px] overflow-hidden transition-colors ${on ? "border-[#2A4DD0] bg-[#F7F9FF]" : "border-[#E1E7F0] bg-white"}`}
                      >
                        <button type="button" role="radio" aria-checked={on} onClick={() => pickDoctor(d.id)} className="flex items-center gap-3 w-full px-3 py-2.5 lg:p-3 text-left">
                          {d.image ? (
                            <RemoteImage src={d.image} alt="" width={52} height={52} className="shrink-0 w-[50px] h-[50px] lg:w-[52px] lg:h-[52px] rounded-xl object-cover object-top bg-[#EEF1F5]" />
                          ) : (
                            <span className="shrink-0 w-[50px] h-[50px] lg:w-[52px] lg:h-[52px] rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[15px] font-extrabold">
                              {initials(d.name) || <UserRound className="w-5 h-5" />}
                            </span>
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-[5px] text-[14px] lg:text-[14.5px] font-extrabold min-w-0">
                              <span className="truncate">{doctorName(d.name)}</span>
                              <VerifiedBadge doctorId={d.id} className="w-3.5 h-3.5" />
                            </span>
                            <span className="block text-[12px] lg:text-[12.5px] text-[#5B667A] truncate">{d.quals}</span>
                            <span className="block text-[12px] lg:text-[12.5px] font-bold text-[#2A4DD0] truncate">
                              {d.walkIn ? "Walk-in open now" : d.slots[0] ? `Next: ${formatSlot(d.slots[0].start, now)}` : d.bookable ? "No open times yet" : "Online booking unavailable"}
                            </span>
                          </span>
                          <span aria-hidden className={`shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${on ? "border-[#2A4DD0]" : "border-[#B7C1D1]"}`}>
                            {on && <span className="w-2.5 h-2.5 rounded-full bg-[#2A4DD0]" />}
                          </span>
                        </button>
                        {on && (
                          <div className="lg:hidden mx-3 mb-3 pt-3 border-t border-dashed border-[#C9D5F2]">
                            <p className="mb-2 text-[12.5px] font-extrabold text-[#27324A]">Available times</p>
                            {times(d)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {doctor && (
                  <div className="hidden lg:block">
                    <p className="mt-4 mb-2 text-[13px] font-extrabold">Available times</p>
                    {times(doctor)}
                  </div>
                )}
              </>
            )}
          </section>
          {choices && doctors.length > 0 && (
            <>
              <AppointmentTypePicker fees={fees} fastTrack={fastTrack} onChange={setFastTrack} />
              <ServicePicker services={services} picked={picked} onToggle={(name) => setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]))}>
                {/* Phones: what is paid where (desktops have it in the summary) */}
                <div className="lg:hidden mt-3 px-3.5 py-1 rounded-[14px] bg-[#F6F8FC]">
                  <div className="flex justify-between gap-3 py-2.5 border-b border-[#E6EBF3] text-[13px]">
                    <span>
                      <span className="block font-extrabold">Pay now in the app</span>
                      <span className="block text-[11.5px] text-[#5B667A]">{followUp ? "Free follow-up: no booking fee" : `${fastTrack ? "Fast track" : "General"} booking fee + convenience fee`}</span>
                    </span>
                    <span className="font-extrabold text-[#2A4DD0]">{formatINR(payable.total)}</span>
                  </div>
                  <div className="flex justify-between gap-3 py-2.5 text-[13px]">
                    <span>
                      <span className="block font-extrabold">Pay at the hospital</span>
                      <span className="block text-[11.5px] text-[#5B667A]">{payLater}</span>
                    </span>
                    <span className="font-extrabold text-right">{payLaterAmount}</span>
                  </div>
                </div>
              </ServicePicker>
            </>
          )}
          {doctor?.bookable && (
            <section aria-labelledby="patient-title" className={`p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 id="patient-title" className="text-[16px] font-extrabold">Patient details</h2>
                {patient && !missing && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#067647] text-[11.5px] font-extrabold">
                    <CircleCheck className="w-3.5 h-3.5" /> From your profile
                  </span>
                )}
              </div>
              <WhoFor signedIn={!!patient} value={forId} onChange={setForId} />
              {patient ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4">
                    <Detail label="Name" value={patient.name || "—"} />
                    <Detail label="Mobile" value={patient.phone || "—"} />
                    <Detail label="Email" value={patient.email || "—"} />
                    <Detail label="Sex / DOB" value={[patient.gender, patient.dateOfBirth].filter(Boolean).join(" · ") || "—"} />
                  </div>
                  {missing && (
                    <p className="mt-2 text-[12.5px] text-[#B42318]">
                      {/^Please enter a valid mobile/.test(missing) ? "Add your mobile number" : "Add your full name"} to your{" "}
                      <Link href="/patient/profile" className="font-extrabold underline">
                        profile
                      </Link>{" "}
                      to book, so the hospital can reach you.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[#5B667A]">
                  {preview ? "Patients log in with their mobile number to book. Booking is turned off in this preview." : (<><Link href={loginHref} className="font-extrabold text-[#2A4DD0] hover:underline">
                    Log in
                  </Link>{" "}
                  with your mobile number to book. Your details are filled in from your profile, and you come back here with your choices kept.</>)}
                </p>
              )}
              <div className="lg:hidden mt-3 pt-3 border-t border-[#EEF2F7] flex flex-col gap-2.5">
                {patient && slot && <PayableTable payable={payable} item={bookingFeeItem(choices && fastTrack, followUp)} />}
                <OnlinePayNote />
                <RefundNote isConsultation walkIn={slot?.id === WALK_IN} />
              </div>
              {error && <div className="lg:hidden mt-3">{errorNote}</div>}
            </section>
          )}
          {children}
        </div>

        <aside className={`hidden lg:block sticky top-[96px] p-[22px] ${card}`}>
          <h2 className="text-[17px] font-extrabold">Booking summary</h2>
          <div className="mt-2.5">
            <InfoRow label="Doctor" value={doctor ? doctorName(doctor.name) : "Not selected"} valueClass={doctor ? "" : "text-[#8A94A6]"} />
            <InfoRow label="Time" value={slot ? slotText(slot) : "Not selected"} valueClass={slot ? "" : "text-[#8A94A6]"} />
            <InfoRow label="Speciality" value={doctor?.specialty || spec || "—"} />
            {choices && <InfoRow label="Type" value={fastTrack ? "Fast track" : "General"} />}
            {patient && <InfoRow label="Patient" value={patient.name || "—"} />}
          </div>
          <PaySummary payable={payable} fastTrack={choices && fastTrack} followUp={followUp} services={pickedServices} />
          <div className="mt-4 flex flex-col gap-3.5">
            <OnlinePayNote />
            {errorNote}
            {ready && !patient && !preview ? (
              <Link href={loginHref} className="w-full h-[50px] rounded-[11px] flex items-center justify-center gap-2 bg-[#2A4DD0] hover:bg-[#2443B8] text-[15px] font-extrabold text-white transition-colors">
                <LogIn className="w-4 h-4" /> {cta}
              </Link>
            ) : (
              <button
                type="button"
                disabled={preview || !ready || submitting}
                onClick={confirm}
                className="w-full h-[50px] rounded-[11px] flex items-center justify-center gap-2 bg-[#2A4DD0] hover:bg-[#2443B8] text-[15px] font-extrabold text-white transition-colors disabled:bg-[#C9D3E6] disabled:cursor-not-allowed"
              >
                {submitting ? <LoaderCircle className="w-5 h-5 animate-spin" /> : ready ? <Lock className="w-4 h-4" /> : null}
                {cta}
              </button>
            )}
          </div>
          <ul className="mt-5 pt-4 border-t border-[#EEF2F7] flex flex-col gap-2.5 text-[12.5px] text-[#4A5878]">
            <li className="flex items-start gap-2.5">
              <CircleCheck className="w-[17px] h-[17px] text-[#067647] shrink-0" />
              Your appointment is confirmed as soon as the payment succeeds.
            </li>
            <li className="flex items-start gap-2.5">
              <IdCard className="w-[17px] h-[17px] text-[#2A4DD0] shrink-0" />
              Show your token or QR pass at the hospital reception to check in.
            </li>
          </ul>
          <p className="mt-3 text-[12px] leading-normal text-[#5B667A]">Only the booking fee and its payment convenience fee are paid online. You pay the consultation fee at the hospital at your visit.</p>
          <div className="mt-3">
            <RefundNote isConsultation walkIn={slot?.id === WALK_IN} />
          </div>
        </aside>
      </div>

      {!preview && <div className="lg:hidden fixed z-40 inset-x-0 bottom-0 flex items-center gap-3 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-white border-t border-[#E6EBF3] shadow-[0_-8px_20px_rgba(11,27,63,0.06)] font-(family-name:--font-manrope)">
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-extrabold">{formatINR(payable.total)}</span>
          <span className="block text-[11.5px] text-[#5B667A] truncate">
            {ready && doctor && slot
              ? [choices && fastTrack ? "Fast track" : null, doctorName(doctor.name), slotText(slot)].filter(Boolean).join(" · ")
              : "Booking fee in app · rest paid at hospital"}
          </span>
        </span>
        {ready && !patient && !preview ? (
          <Link href={loginHref} className="shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] bg-[#2A4DD0] text-white text-[15px] font-extrabold shadow-[0_8px_16px_rgba(42,77,208,0.3)]">
            <LogIn className="w-4 h-4" /> {cta}
          </Link>
        ) : (
          <button
            type="button"
            disabled={preview || !ready || submitting}
            onClick={confirm}
            className={`shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] text-white text-[15px] font-extrabold transition-colors disabled:cursor-not-allowed ${
              ready ? "bg-[#2A4DD0] shadow-[0_8px_16px_rgba(42,77,208,0.3)]" : "bg-[#C9D3E6]"
            }`}
          >
            {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : ready ? <Lock className="w-4 h-4" /> : null}
            {cta}
            {!ready && <ArrowRight className="w-4 h-4" strokeWidth={2.6} />}
          </button>
        )}
      </div>}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <span className="py-2 min-w-0">
      <span className="block text-[11.5px] font-bold text-[#5B667A]">{label}</span>
      <span className="block text-[13.5px] font-extrabold truncate">{value}</span>
    </span>
  );
}

/** " · 1.2 km" from the patient's device location, when both it and the hospital's map pin are known. */
export function HospitalDistance({ at }: { at: LatLng | null }) {
  const { location } = usePatientLocation();
  if (!at || location?.kind !== "gps") return null;
  return <> · {formatDistance(distanceKm({ lat: location.lat, lng: location.lng }, at))}</>;
}

/** The phone hero's round buttons: back, and share (the system share sheet, or copy the link). */
export function HeroButtons({ backHref, backLabel = "Back", title }: { backHref: string; backLabel?: string; title: string }) {
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* the patient closed the share sheet */
    }
  };
  const cls = "absolute top-3 w-11 h-11 rounded-full bg-white text-[#0B1B3F] flex items-center justify-center shadow-[0_4px_12px_rgba(11,27,63,0.2)] active:scale-95 transition-transform";
  return (
    <>
      <Link href={backHref} aria-label={backLabel} className={`${cls} left-3`}>
        <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
      </Link>
      <button type="button" onClick={share} aria-label={`Share ${title}`} className={`${cls} right-3`}>
        <Share2 className="w-[18px] h-[18px]" />
      </button>
    </>
  );
}
