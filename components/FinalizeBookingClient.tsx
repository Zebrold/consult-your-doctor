"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, CircleCheck, IdCard, Lock, LoaderCircle, LogIn, MapPin, Navigation, Sun, Sunset, type LucideIcon } from "lucide-react";
import { PatientDock } from "@/components/PatientDock";
import { PatientFooter } from "@/components/AppFooter";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { VerifiedBadge } from "@/components/home/ui";
import { InfoRow, btnPrimary, card } from "@/components/patient/app-ui";
import { finalizeConsultationAppointment } from "@/app/actions/booking";
import { startPayuPayment } from "@/lib/payu-client";
import { appendPatientDetails, DayStrip, FormError, PayuNote, patientDetailsError, RefundNote, type PatientDetails } from "@/components/patient/booking-ui";
import { directionsHref, doctorName, formatINR, formatLongDate, formatSlot, formatTime, initials, isMorning, istDateKey, upcomingDays } from "@/components/patient/format";

export interface BookingDoctor {
  id: string;
  name: string | null;
  specialty: string | null;
  qualifications: string | null;
  bio: string | null;
  experience: number | null;
  /** Online booking is open once the hospital has set the doctor's consultation fee (shown on the profile only). */
  bookable: boolean;
  image: string | null;
  hospital: { id: string; name: string; city: string | null; address: string | null } | null;
}

export type BookingSlot = { id: string; start: string; booked: boolean };

interface FinalizeBookingClientProps {
  doctor: BookingDoctor;
  slots: BookingSlot[];
  /** The signed-in patient's saved details, or null for a signed-out visitor. */
  patient: PatientDetails | null;
  now: number;
  payuKey: string;
  /** The booking fee /api/payu/hash will charge (lib/booking-fees.ts): the whole online payment. */
  bookingFee: number;
  /** A slot the patient already picked (on the hospital page), selected when it is still open. */
  initialSlotId?: string | null;
}

export function FinalizeBookingClient({ doctor, slots, patient, now, payuKey, bookingFee, initialSlotId = null }: FinalizeBookingClientProps) {
  const router = useRouter();
  const name = doctorName(doctor.name);
  const days = useMemo(() => upcomingDays(now, 6), [now]);
  const today = days[0].key;

  const slotsByDay = useMemo(() => {
    const map = new Map<string, BookingSlot[]>();
    for (const s of slots) {
      const key = istDateKey(s.start);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [slots]);
  const firstOpen = (initialSlotId ? slots.find((s) => s.id === initialSlotId && !s.booked) : undefined) ?? slots.find((s) => !s.booked) ?? null;

  const [date, setDate] = useState(() => (firstOpen && days.some((d) => d.key === istDateKey(firstOpen.start)) ? istDateKey(firstOpen.start) : today));
  const [slotId, setSlotId] = useState<string | null>(() => (firstOpen && istDateKey(firstOpen.start) === date ? firstOpen.id : null));
  const [details] = useState<PatientDetails>(() => patient ?? { name: "", phone: "", email: "", dateOfBirth: "", gender: "" });
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const customDate = useRef<HTMLInputElement>(null);

  const daySlots = slotsByDay.get(date) ?? [];
  const selected = slots.find((s) => s.id === slotId) ?? null;
  const nextOpenAfter = slots.find((s) => !s.booked && istDateKey(s.start) > date) ?? null;
  const openTodayCount = (slotsByDay.get(today) ?? []).filter((s) => !s.booked).length;

  const chooseDate = (key: string) => {
    setDate(key);
    setSlotId((slotsByDay.get(key) ?? []).find((s) => !s.booked)?.id ?? null);
    setError(null);
  };

  const confirm = async () => {
    if (!selected) return setError("Please choose an available time slot.");
    const activeDetails = patient ? { ...patient, ...details } : details;
    const detailsProblem = patientDetailsError(activeDetails);
    if (detailsProblem) return setError(detailsProblem);

    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("doctor_id", doctor.id);
    form.append("schedule_id", selected.id);
    appendPatientDetails(form, activeDetails);

    const res = await finalizeConsultationAppointment(form);
    if ("error" in res && res.error) {
      setError(res.error);
      setSubmitting(false);
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
      firstname: activeDetails.name || "Patient",
      email: (activeDetails.email || "").trim() || "patient@example.com",
      phone: activeDetails.phone || "9999999999",
      payuKey,
    });
    if (payError) {
      setPendingId(appointmentId);
      setError(`Your slot is reserved, but the payment couldn't start: ${payError}`);
      setSubmitting(false);
    }
  };

  const morning = daySlots.filter((s) => isMorning(s.start));
  const later = daySlots.filter((s) => !isMorning(s.start));
  const canBook = doctor.bookable;

  const directions = doctor.hospital ? directionsHref(doctor.hospital.name, doctor.hospital.address, doctor.hospital.city) : null;
  const signIn = `/login/patient?next=${encodeURIComponent(`/book/${doctor.id}`)}`;
  const ctaLabel = submitting ? "Reserving…" : !canBook ? "Booking unavailable" : !selected ? "Pick a time" : `Pay ${formatINR(bookingFee)}`;

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen font-(family-name:--font-manrope) text-[#0B1B3F]">
      <PatientNavHeader
        isSignedIn={!!patient}
        name={patient?.name}
        email={patient?.email}
        backHref={`/doctors/${doctor.id}`}
        container="max-w-[900px] px-4 md:px-6"
        eyebrow="Book appointment"
        title="Book a visit"
        subtitle={`${name}${doctor.hospital ? ` · ${doctor.hospital.name}` : ""}`}
        deskHidden
      />

      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-11">
        <div className="max-w-[1340px] lg:px-9 lg:pt-7">
          <Link href={`/doctors/${doctor.id}`} className="hidden lg:inline-flex items-center gap-1.5 mb-3.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Back to {name}
          </Link>
          <div className="hidden lg:block mb-[22px]">
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Book a visit</h1>
            <p className="mt-1 text-[14px] text-[#5B667A]">Pick a time, then pay the booking fee to confirm.</p>
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start px-4 md:px-6 lg:px-0 pt-4 lg:pt-0 max-w-[900px] lg:max-w-none mx-auto">
            <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
              <section className={`p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
                <div className="flex items-center gap-3.5">
                  {doctor.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doctor.image} alt={name} className="shrink-0 w-[72px] h-[78px] lg:w-24 lg:h-24 rounded-[14px] object-cover object-top bg-[#EEF1F5]" />
                  ) : (
                    <span className="shrink-0 w-[72px] h-[78px] lg:w-24 lg:h-24 rounded-[14px] bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[22px] font-extrabold">{initials(doctor.name)}</span>
                  )}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[17px] lg:text-[19px] font-extrabold min-w-0">
                      <span className="truncate">{name}</span>
                      <VerifiedBadge className="w-4 h-4" />
                    </span>
                    <span className="block text-[13.5px] font-bold text-[#2A4DD0]">{doctor.specialty || "Specialist"}</span>
                    {doctor.qualifications && <span className="block text-[12.5px] text-[#5B667A] line-clamp-2">{doctor.qualifications}</span>}
                  </span>
                </div>
                <div className="grid grid-cols-3 mt-3.5 border-t border-[#EEF2F7]">
                  <Metric label="Experience" value={doctor.experience ? `${doctor.experience} yrs` : "—"} />
                  <Metric label="Open today" value={openTodayCount ? `${openTodayCount} slot${openTodayCount === 1 ? "" : "s"}` : "None"} border />
                  <Metric label="Booking fee" value={formatINR(bookingFee)} highlight border />
                </div>
              </section>

              <section className={`p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
                <h2 className="text-[16px] font-extrabold">Where</h2>
                <div className="flex items-start gap-3 mt-3 p-3 rounded-[14px] border-[1.5px] border-[#2A4DD0] bg-[#F7F9FF]">
                  <Building2 className="w-5 h-5 text-[#2A4DD0] shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-extrabold">In person at the hospital</span>
                    <span className="block text-[12.5px] text-[#5B667A]">
                      {[doctor.hospital?.name, doctor.hospital?.address, doctor.hospital?.city].filter(Boolean).join(", ") || "Hospital address not listed"}
                    </span>
                  </span>
                  {directions && (
                    <a href={directions} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                      <Navigation className="w-3.5 h-3.5" /> Directions
                    </a>
                  )}
                </div>
              </section>

              <section className={`p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-[16px] font-extrabold">Date &amp; time</h2>
                  <span className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          customDate.current?.showPicker();
                        } catch {
                          customDate.current?.focus();
                        }
                      }}
                      className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline"
                    >
                      <CalendarDays className="w-4 h-4" /> Other date
                    </button>
                    <input ref={customDate} type="date" min={today} tabIndex={-1} aria-label="Choose a date" className="sr-only" onChange={(e) => e.target.value && chooseDate(e.target.value)} />
                  </span>
                </div>
                <DayStrip
                  days={days}
                  selected={date}
                  onSelect={chooseDate}
                  badge={(key) => {
                    const list = slotsByDay.get(key) ?? [];
                    const open = list.filter((s) => !s.booked).length;
                    if (open) return { text: `${open} Slot${open === 1 ? "" : "s"}`, tone: "open" };
                    return list.length ? { text: "Full", tone: "full" } : { text: "No slots", tone: "none" };
                  }}
                />
                {!days.some((d) => d.key === date) && <p className="mt-3 text-[12.5px] text-[#5B667A]">Showing times for {formatLongDate(`${date}T12:00:00+05:30`)}</p>}
                <div className="mt-5 flex flex-col gap-4">
                  {daySlots.length === 0 ? (
                    <div className="py-7 px-4 text-center rounded-[14px] bg-[#F6F8FC] flex flex-col items-center gap-2">
                      <CalendarDays className="w-7 h-7 text-[#9AA4B5]" />
                      <p className="text-[14px] font-extrabold">No times on this day</p>
                      {nextOpenAfter ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDate(istDateKey(nextOpenAfter.start));
                            setSlotId(nextOpenAfter.id);
                          }}
                          className={`${btnPrimary} mt-1`}
                        >
                          Next open time: {formatSlot(nextOpenAfter.start, now)}
                        </button>
                      ) : (
                        <p className="text-[12.5px] text-[#5B667A] max-w-sm">This doctor has no open times after this day yet. Check back later or choose another doctor.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <SlotGroup title="Morning" icon={Sun} slots={morning} selectedId={slotId} onPick={setSlotId} />
                      <SlotGroup title="Afternoon & evening" icon={Sunset} slots={later} selectedId={slotId} onPick={setSlotId} />
                    </>
                  )}
                </div>
              </section>

              <section className={`p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-[16px] font-extrabold">Patient details</h2>
                  {patient && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#067647] text-[11.5px] font-extrabold">
                      <CircleCheck className="w-3.5 h-3.5" /> From your profile
                    </span>
                  )}
                </div>
                {patient ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4">
                    <Detail label="Name" value={details.name || patient.name || "Patient"} />
                    <Detail label="Mobile" value={details.phone || patient.phone || "—"} />
                    <Detail label="Email" value={details.email || patient.email || "—"} />
                    <Detail label="Sex / DOB" value={[details.gender || patient.gender, details.dateOfBirth || patient.dateOfBirth].filter(Boolean).join(" · ") || "In your profile"} />
                  </div>
                ) : (
                  <p className="text-[13px] text-[#5B667A]">
                    <Link href={signIn} className="font-extrabold text-[#2A4DD0] hover:underline">
                      Sign in
                    </Link>{" "}
                    with your mobile number and your details are filled in from your profile.
                  </p>
                )}
              </section>

              {error && (
                <div className="lg:hidden">
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
                </div>
              )}
            </div>

            <aside className={`hidden lg:block sticky top-[96px] p-[22px] ${card}`}>
              <h2 className="text-[17px] font-extrabold">Booking summary</h2>
              <div className="mt-2.5">
                <InfoRow label="Doctor" value={name} />
                <InfoRow label="Time" value={selected ? formatSlot(selected.start, now) : "Not chosen yet"} valueClass={selected ? "" : "text-[#8A94A6]"} />
                <InfoRow label="Visit" value="In person" />
              </div>
              <div className="mt-2.5 px-3.5 py-1 rounded-[14px] bg-[#F6F8FC]">
                <div className="flex justify-between gap-3 py-2.5 border-b border-[#E6EBF3] text-[13.5px]">
                  <span>
                    <span className="block font-extrabold">Pay now online</span>
                    <span className="block text-[12px] text-[#5B667A]">Booking fee</span>
                  </span>
                  <span className="font-extrabold text-[#2A4DD0]">{formatINR(bookingFee)}</span>
                </div>
                <div className="flex justify-between gap-3 py-2.5 text-[13.5px]">
                  <span>
                    <span className="block font-extrabold">Pay at the hospital</span>
                    <span className="block text-[12px] text-[#5B667A]">The consultation fee, set by the hospital</span>
                  </span>
                  <span className="shrink-0 font-extrabold whitespace-nowrap">At the counter</span>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3.5">
                <PayuNote />
                {error && (
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
                )}
                {!patient ? (
                  <Link href={signIn} className={`${btnPrimary} w-full h-[50px]! text-[15px]!`}>
                    <LogIn className="w-4 h-4" /> Sign in to book
                  </Link>
                ) : (
                  <button type="button" disabled={submitting || !selected || !canBook} onClick={confirm} className={`${btnPrimary} w-full h-[50px]! text-[15px]! disabled:bg-[#C9D3E6]!`}>
                    {submitting ? (
                      <>
                        <LoaderCircle className="w-5 h-5 animate-spin" /> Reserving your time…
                      </>
                    ) : !canBook ? (
                      "Online booking unavailable"
                    ) : !selected ? (
                      "Select a time"
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> Confirm &amp; pay {formatINR(bookingFee)}
                      </>
                    )}
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
                {doctor.hospital && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
                    <Link href={`/hospitals/${doctor.hospital.id}`} className="hover:text-[#2A4DD0] hover:underline">
                      {doctor.hospital.name}
                    </Link>
                  </li>
                )}
              </ul>
              <div className="mt-4">
                <RefundNote isConsultation />
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Phones: the fee and the next step, fixed at the bottom. */}
      <div className="lg:hidden fixed z-40 inset-x-0 bottom-0 flex items-center gap-3 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-white border-t border-[#E6EBF3] shadow-[0_-8px_20px_rgba(11,27,63,0.06)]">
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-extrabold">{formatINR(bookingFee)}</span>
          <span className="block text-[11.5px] text-[#5B667A] truncate">{selected ? formatSlot(selected.start, now) : "Booking fee in app · consultation at hospital"}</span>
        </span>
        {!patient ? (
          <Link href={signIn} className="shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] bg-[#2A4DD0] text-white text-[15px] font-extrabold shadow-[0_8px_16px_rgba(42,77,208,0.3)]">
            <LogIn className="w-4 h-4" /> Sign in to book
          </Link>
        ) : (
          <button
            type="button"
            disabled={submitting || !selected || !canBook}
            onClick={confirm}
            className={`shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] text-white text-[15px] font-extrabold transition-colors disabled:cursor-not-allowed ${
              selected && canBook ? "bg-[#2A4DD0] shadow-[0_8px_16px_rgba(42,77,208,0.3)]" : "bg-[#C9D3E6]"
            }`}
          >
            {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : selected && canBook ? <Lock className="w-4 h-4" /> : null}
            {ctaLabel}
            {!submitting && !selected && canBook && <ArrowRight className="w-4 h-4" strokeWidth={2.6} />}
          </button>
        )}
      </div>

      <PatientFooter isSignedIn={!!patient} />
      <PatientDock activeTab="find" isSignedIn={!!patient} name={patient?.name} phoneBar={false} />
    </div>
  );
}

function Metric({ label, value, highlight, border }: { label: string; value: string; highlight?: boolean; border?: boolean }) {
  return (
    <span className={`pt-2.5 min-w-0 ${border ? "pl-3 border-l border-[#EEF2F7]" : ""}`}>
      <span className="block text-[11.5px] font-bold text-[#5B667A]">{label}</span>
      <span className={`block text-[14px] font-extrabold truncate ${highlight ? "text-[#2A4DD0]" : ""}`}>{value}</span>
    </span>
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

function SlotGroup({
  title,
  icon: Icon,
  slots,
  selectedId,
  onPick,
}: {
  title: string;
  icon: LucideIcon;
  slots: BookingSlot[];
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  if (slots.length === 0) return null;
  const open = slots.filter((s) => !s.booked).length;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[#5B667A]">
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-extrabold tracking-[0.04em] uppercase">
          {title} · {open} open
        </span>
      </div>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {slots.map((slot) => {
          const on = slot.id === selectedId;
          return (
            <button
              key={slot.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={slot.booked}
              onClick={() => onPick(slot.id)}
              className={`min-h-10 px-2 rounded-[10px] border-[1.5px] text-[13px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:border-[#EEF2F7] disabled:bg-[#F4F6FA] disabled:text-[#B7C1D1] disabled:line-through ${
                on ? "border-[#2A4DD0] bg-[#2A4DD0] text-white" : "border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9CBFF]"
              }`}
            >
              {formatTime(slot.start)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
