"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck, IdCard, LoaderCircle, Lock, LogIn, Share2, UserRound } from "lucide-react";
import { VerifiedBadge } from "@/components/home/ui";
import { SPECIALITIES, specialityIcon } from "@/components/home/specialities";
import { doctorName, formatDayLabel, formatINR, formatSlot, formatTime, initials, istDateKey } from "./format";
import { InfoRow, card } from "./app-ui";
import { RemoteImage } from "@/components/RemoteImage";
import { sumPrices, type BookedTest, type BookingFees } from "@/lib/pricing";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo";
import { finalizeConsultationAppointment } from "@/app/actions/booking";
import { startPayuPayment } from "@/lib/payu-client";
import { doctorBookingHref } from "@/lib/booking-links";
import { AppointmentTypePicker, PaySummary, ServicePicker } from "./BookingChoices";
import { appendPatientDetails, FormError, PayuNote, patientDetailsError, RefundNote, type PatientDetails } from "./booking-ui";
import { usePatientLocation } from "./location";

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
  payuKey,
  initialSpeciality = null,
  initialDoctor = null,
  initialSlot = null,
  initialFastTrack = false,
  initialServices = [],
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
  payuKey: string;
  /** The speciality tab to open on, e.g. when the patient came from that speciality's hospitals. */
  initialSpeciality?: string | null;
  /** What to open with picked: from Book on a doctor elsewhere, or coming back after logging in. */
  initialDoctor?: string | null;
  initialSlot?: string | null;
  initialFastTrack?: boolean;
  initialServices?: string[];
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
  const [slotId, setSlotId] = useState<string | null>(presetSlot?.id ?? null);
  const [day, setDay] = useState<string | null>(presetSlot ? istDateKey(presetSlot.start) : null);
  const [fastTrack, setFastTrack] = useState(choices && initialFastTrack);
  const [picked, setPicked] = useState<string[]>(initialServices);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);
  // Bring the doctor the patient chose into view, below the sticky header.
  useEffect(() => {
    presetRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const shown = doctors.filter((d) => (d.specialty || "General") === spec);
  const doctor = doctors.find((d) => d.id === doctorId) ?? null;
  const slot = doctor?.slots.find((s) => s.id === slotId) ?? null;
  const ready = !!doctor && doctor.bookable && !!slot;
  const bookingFee = choices && fastTrack ? fees.fastTrack : fees.consultation;
  const pickedServices = choices ? services.filter((s) => picked.includes(s.name)) : [];
  const servicesTotal = sumPrices(pickedServices);
  const payLater = pickedServices.length ? `Consultation + ${pickedServices.length} ${pickedServices.length === 1 ? "service" : "services"}` : "Consultation fee";
  const payLaterAmount = doctor?.fee ? formatINR(doctor.fee + servicesTotal) : servicesTotal ? `${formatINR(servicesTotal)} + consultation` : "At the hospital";
  // Logging in brings the patient back here with the doctor, time, type and services still picked.
  const loginHref = `/login/patient?next=${encodeURIComponent(
    doctor ? doctorBookingHref(doctor.id, hospitalId, { slotId, fastTrack: choices && fastTrack, services: pickedServices.map((s) => s.name) }) : `/hospitals/${hospitalId}`,
  )}`;
  const missing = patient ? patientDetailsError(patient) : null;
  const cta = !doctor
    ? "Select a doctor"
    : !doctor.bookable
      ? "Booking unavailable"
      : !doctor.slots.length
        ? "No open times"
        : !slot
          ? "Pick a time"
          : !patient
            ? "Log in to book"
            : submitting
              ? "Reserving…"
              : `Confirm & pay ${formatINR(bookingFee)}`;

  const pickSpec = (s: string) => {
    setSpec(s);
    setDoctorId(null);
    setSlotId(null);
    setDay(null);
    setError(null);
  };
  const pickDoctor = (id: string) => {
    setDoctorId(doctorId === id ? null : id);
    setSlotId(null);
    setDay(null);
    setError(null);
  };

  const confirm = async () => {
    if (!doctor || !slot || !patient) return;
    if (missing) return setError(missing);
    setSubmitting(true);
    setError(null);
    setPendingId(null);
    const form = new FormData();
    form.append("doctor_id", doctor.id);
    form.append("schedule_id", slot.id);
    if (choices && fastTrack) form.append("booking_type", "fast_track");
    for (const s of pickedServices) form.append("services", s.name);
    appendPatientDetails(form, patient);

    const res = await finalizeConsultationAppointment(form);
    if ("error" in res && res.error) {
      setError(res.error);
      setSubmitting(false);
      // Someone else took the time: reload the open times.
      if (/slot/i.test(res.error)) router.refresh();
      return;
    }
    const appointmentId = "appointmentId" in res ? res.appointmentId : undefined;
    if (!appointmentId) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    const payError = await startPayuPayment({
      txnid: appointmentId,
      productinfo: "Consultation",
      firstname: patient.name || "Patient",
      email: (patient.email || "").trim() || "patient@example.com",
      phone: patient.phone || "9999999999",
      payuKey,
    });
    if (payError) {
      setPendingId(appointmentId);
      setError(`Your slot is reserved, but the payment couldn't start: ${payError}`);
      setSubmitting(false);
    }
  };

  const times = (d: HospitalDoctor) => {
    if (!d.bookable) return <p className="text-[12.5px] text-[#5B667A]">Online booking for {doctorName(d.name)} isn&apos;t open yet.</p>;
    if (!d.slots.length) return <p className="text-[12.5px] text-[#5B667A]">No open times yet. They appear here as soon as the hospital publishes them.</p>;
    const days = byDay(d.slots, now);
    const open = days.find((x) => x.key === day) ?? days[0];
    return (
      <>
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
          <section aria-labelledby="book-title" className={`p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
            <h2 id="book-title" className="text-[16px] font-extrabold">Choose your doctor</h2>
            <p className="mt-1 mb-3 text-[12.5px] text-[#5B667A]">{specialties.length > 1 ? "Pick a speciality, select a doctor, then pick a day and time." : "Select a doctor, then pick a day and time."}</p>
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
                              <VerifiedBadge className="w-3.5 h-3.5" />
                            </span>
                            <span className="block text-[12px] lg:text-[12.5px] text-[#5B667A] truncate">{d.quals}</span>
                            <span className="block text-[12px] lg:text-[12.5px] font-bold text-[#2A4DD0] truncate">
                              {d.slots[0] ? `Next: ${formatSlot(d.slots[0].start, now)}` : d.bookable ? "No open times yet" : "Online booking unavailable"}
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
                      <span className="block text-[11.5px] text-[#5B667A]">{fastTrack ? "Fast track" : "General"} booking fee</span>
                    </span>
                    <span className="font-extrabold text-[#2A4DD0]">{formatINR(bookingFee)}</span>
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
                  <Link href={loginHref} className="font-extrabold text-[#2A4DD0] hover:underline">
                    Log in
                  </Link>{" "}
                  with your mobile number to book. Your details are filled in from your profile, and you come back here with your choices kept.
                </p>
              )}
              <div className="lg:hidden mt-3 pt-3 border-t border-[#EEF2F7] flex flex-col gap-2.5">
                <PayuNote />
                <RefundNote isConsultation />
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
            <InfoRow label="Time" value={slot ? formatSlot(slot.start, now) : "Not selected"} valueClass={slot ? "" : "text-[#8A94A6]"} />
            <InfoRow label="Speciality" value={doctor?.specialty || spec || "—"} />
            {choices && <InfoRow label="Type" value={fastTrack ? "Fast track" : "General"} />}
            {patient && <InfoRow label="Patient" value={patient.name || "—"} />}
          </div>
          <PaySummary fee={bookingFee} fastTrack={choices && fastTrack} services={pickedServices} />
          <div className="mt-4 flex flex-col gap-3.5">
            <PayuNote />
            {errorNote}
            {ready && !patient ? (
              <Link href={loginHref} className="w-full h-[50px] rounded-[11px] flex items-center justify-center gap-2 bg-[#2A4DD0] hover:bg-[#2443B8] text-[15px] font-extrabold text-white transition-colors">
                <LogIn className="w-4 h-4" /> {cta}
              </Link>
            ) : (
              <button
                type="button"
                disabled={!ready || submitting}
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
          <p className="mt-3 text-[12px] leading-normal text-[#5B667A]">Only the booking fee is paid online. You pay the consultation fee at the hospital at your visit.</p>
          <div className="mt-3">
            <RefundNote isConsultation />
          </div>
        </aside>
      </div>

      <div className="lg:hidden fixed z-40 inset-x-0 bottom-0 flex items-center gap-3 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-white border-t border-[#E6EBF3] shadow-[0_-8px_20px_rgba(11,27,63,0.06)] font-(family-name:--font-manrope)">
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-extrabold">{formatINR(bookingFee)}</span>
          <span className="block text-[11.5px] text-[#5B667A] truncate">
            {ready && doctor && slot
              ? [choices && fastTrack ? "Fast track" : null, doctorName(doctor.name), formatSlot(slot.start, now)].filter(Boolean).join(" · ")
              : "Booking fee in app · rest paid at hospital"}
          </span>
        </span>
        {ready && !patient ? (
          <Link href={loginHref} className="shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] bg-[#2A4DD0] text-white text-[15px] font-extrabold shadow-[0_8px_16px_rgba(42,77,208,0.3)]">
            <LogIn className="w-4 h-4" /> {cta}
          </Link>
        ) : (
          <button
            type="button"
            disabled={!ready || submitting}
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
      </div>
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
