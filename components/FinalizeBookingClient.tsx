"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Building2, CalendarDays, CircleCheck, Clock, IdCard, Lock, LoaderCircle, MapPin,
  Navigation, Sun, Sunset, type LucideIcon,
} from "lucide-react";
import { PatientDock } from "@/components/PatientDock";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { finalizeConsultationAppointment } from "@/app/actions/booking";
import { startPayuPayment } from "@/lib/payu-client";
import { CONSULTATION_PLATFORM_FEE } from "@/lib/pricing";
import {
  appendPatientDetails, Breadcrumbs, DayStrip, FormError, PatientDetailsFields, PayuNote, patientDetailsError,
  SignInToBook, StepCard, SummaryRow, type PatientDetails,
} from "@/components/patient/booking-ui";
import {
  doctorName, formatINR, formatLongDate, formatSlot, formatTime, initials, isMorning, istDateKey, upcomingDays,
} from "@/components/patient/format";

export interface BookingDoctor {
  id: string;
  name: string | null;
  specialty: string | null;
  qualifications: string | null;
  bio: string | null;
  experience: number | null;
  fee: number | null;
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
}

export function FinalizeBookingClient({ doctor, slots, patient, now, payuKey }: FinalizeBookingClientProps) {
  const router = useRouter();
  const name = doctorName(doctor.name);
  const fee = doctor.fee ?? 0;
  const total = fee + CONSULTATION_PLATFORM_FEE;
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
  const firstOpen = slots.find((s) => !s.booked) ?? null;

  const [date, setDate] = useState(() => (firstOpen && days.some((d) => d.key === istDateKey(firstOpen.start)) ? istDateKey(firstOpen.start) : today));
  const [slotId, setSlotId] = useState<string | null>(() => (firstOpen && istDateKey(firstOpen.start) === date ? firstOpen.id : null));
  const [details, setDetails] = useState<PatientDetails>(() => patient ?? { name: "", phone: "", email: "", dateOfBirth: "", gender: "" });
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
    const detailsProblem = patientDetailsError(details);
    if (detailsProblem) return setError(detailsProblem);

    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("doctor_id", doctor.id);
    form.append("schedule_id", selected.id);
    appendPatientDetails(form, details);

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
      firstname: details.name,
      email: details.email.trim() || "patient@example.com",
      phone: details.phone,
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
  const canBook = fee > 0;

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen">
      <PatientNavHeader title="Book" isSignedIn={!!patient} name={patient?.name} email={patient?.email} backHref="/find" />

      <main className="relative w-full overflow-hidden pb-28 md:pb-32 md:pt-8">
        <div aria-hidden className="hidden md:block absolute -top-32 left-1/4 w-[600px] h-[450px] bg-gradient-to-br from-primary-container/10 via-fresh-teal/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[1280px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-2 md:py-8">
          {/* Breadcrumb & heading */}
          <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8">
            <div>
              <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Find Doctors", href: "/find" }, { label: name, href: `/doctors/${doctor.id}` }, { label: "Book Appointment" }]} />
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Finalize Consultation</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container font-label-sm text-label-sm text-indigo-gray-900 font-semibold shadow-sm">
                <BadgeCheck className="w-4 h-4 text-fresh-teal" /> Verified Doctor
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container font-label-sm text-label-sm text-indigo-gray-900 font-semibold shadow-sm">
                <Clock className="w-4 h-4 text-vibrant-blue" /> Confirmed on Payment
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Doctor */}
              <section className="bg-surface-container-low md:bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm relative overflow-hidden">
                <div aria-hidden className="hidden md:block absolute top-0 left-0 w-1.5 h-full bg-vibrant-blue" />
                <div className="flex gap-4 md:gap-6 items-center">
                  <div className="relative shrink-0">
                    {doctor.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="w-20 h-20 md:w-28 md:h-28 rounded-full md:rounded-xl object-cover shadow-md bg-surface-container" src={doctor.image} alt={name} />
                    ) : (
                      <span className="w-20 h-20 md:w-28 md:h-28 rounded-full md:rounded-xl bg-gradient-to-br from-primary-fixed to-surface-container flex items-center justify-center text-primary font-headline-lg text-2xl md:text-3xl font-bold shadow-md">
                        {initials(doctor.name)}
                      </span>
                    )}
                    {openTodayCount > 0 && (
                      <span className="hidden md:flex absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-fresh-teal text-on-primary font-label-sm text-label-sm items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest" /> Today
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="hidden md:inline-block px-2.5 py-0.5 mb-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
                      {doctor.specialty || "Specialist"}
                    </span>
                    <h1 className="md:hidden font-headline-lg-mobile text-headline-lg-mobile text-on-surface truncate">{name}</h1>
                    <h2 className="hidden md:block font-title-md text-title-md text-on-surface truncate">{name}</h2>
                    <p className="font-body-md text-body-md text-on-surface-variant md:text-indigo-gray-600 mt-0.5 line-clamp-2">
                      <span className="md:hidden">{doctor.specialty || "Specialist"}</span>
                      <span className="hidden md:inline">{doctor.qualifications || doctor.bio || `${doctor.specialty || "Specialist"} consultations`}</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-surface-container-high/40 md:border-surface-container-low text-center md:text-left md:ml-[136px]">
                  <Metric label="Experience" value={doctor.experience ? `${doctor.experience} Years` : "—"} />
                  <Metric label="Hospital" value={doctor.hospital?.name || "—"} />
                  <Metric label="Consultation Fee" value={fee ? formatINR(fee) : "Not set"} highlight />
                </div>
              </section>

              {/* 1. Visit type */}
              <StepCard step={1} title="Consultation Type">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-surface-container-low ring-2 ring-vibrant-blue/60">
                  <span className="w-10 h-10 rounded-xl bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-[22px] h-[22px]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-title-md text-body-md font-bold text-on-surface flex items-center gap-2">
                      In-Person Clinic Visit <CircleCheck className="w-4 h-4 text-vibrant-blue" />
                    </span>
                    <span className="font-body-md text-sm text-indigo-gray-600 block mt-0.5">
                      {[doctor.hospital?.name, doctor.hospital?.address, doctor.hospital?.city].filter(Boolean).join(", ") || "Hospital address not listed"}
                    </span>
                  </div>
                  {doctor.hospital && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([doctor.hospital.name, doctor.hospital.address, doctor.hospital.city].filter(Boolean).join(", "))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start sm:self-center px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold shadow-sm hover:bg-surface-variant flex items-center gap-1.5 shrink-0"
                    >
                      <Navigation className="w-4 h-4 text-vibrant-blue" /> Directions
                    </a>
                  )}
                </div>
              </StepCard>

              {/* 2. Date & time */}
              <StepCard
                step={2}
                title="Choose Date & Time Slot"
                aside={
                  <span className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          customDate.current?.showPicker();
                        } catch {
                          customDate.current?.focus();
                        }
                      }}
                      className="flex items-center gap-1.5 font-label-sm text-label-sm text-vibrant-blue font-semibold hover:underline"
                    >
                      <CalendarDays className="w-[18px] h-[18px]" />
                      <span className="hidden sm:inline">Choose Custom Date</span>
                      <span className="sm:hidden">Other date</span>
                    </button>
                    <input
                      ref={customDate}
                      type="date"
                      min={today}
                      tabIndex={-1}
                      aria-label="Choose a date"
                      className="sr-only"
                      onChange={(e) => e.target.value && chooseDate(e.target.value)}
                    />
                  </span>
                }
              >
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
                {!days.some((d) => d.key === date) && (
                  <p className="mt-3 font-label-sm text-label-sm text-indigo-gray-600">Showing slots for {formatLongDate(`${date}T12:00:00+05:30`)}</p>
                )}

                <div className="mt-6 flex flex-col gap-5">
                  {daySlots.length === 0 ? (
                    <div className="py-8 px-4 text-center rounded-xl bg-surface-container-low flex flex-col items-center gap-2">
                      <CalendarDays className="w-8 h-8 text-outline" />
                      <p className="font-title-md text-body-md font-semibold text-on-surface">No slots scheduled on this date</p>
                      {nextOpenAfter ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDate(istDateKey(nextOpenAfter.start));
                            setSlotId(nextOpenAfter.id);
                          }}
                          className="mt-1 px-4 py-2 rounded-full bg-vibrant-blue text-on-primary text-sm font-bold hover:bg-primary"
                        >
                          Next open slot: {formatSlot(nextOpenAfter.start, now)}
                        </button>
                      ) : (
                        <p className="font-body-md text-sm text-indigo-gray-600 max-w-sm">This doctor has no open slots after this date yet. Please check back later or choose another doctor.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <SlotGroup title="Morning" icon={Sun} slots={morning} selectedId={slotId} onPick={setSlotId} />
                      <SlotGroup title="Afternoon & Evening" icon={Sunset} slots={later} selectedId={slotId} onPick={setSlotId} />
                    </>
                  )}
                </div>
              </StepCard>

              {/* 3. Patient */}
              <StepCard
                step={3}
                title="Patient Details"
                aside={patient ? <span className="hidden sm:inline font-label-sm text-label-sm text-indigo-gray-600">From your profile</span> : null}
              >
                {patient ? (
                  <PatientDetailsFields value={details} onChange={setDetails} maxDate={today} />
                ) : (
                  <p className="text-sm text-indigo-gray-600">Sign in first and we&apos;ll fill in your details from your profile.</p>
                )}
              </StepCard>
            </div>

            {/* Summary */}
            <aside className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
              <div className="bg-surface-container-low md:bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-md">
                <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/60 md:border-surface-container-low">
                  <h2 className="font-title-md text-body-lg font-bold text-on-surface">Appointment Summary</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-fresh-teal/15 text-secondary font-label-sm text-label-sm font-bold">1 Visit</span>
                </div>
                <div className="py-4 flex flex-col gap-3 font-body-md text-body-md">
                  <SummaryRow label={`${doctor.specialty || "Specialist"} clinic visit`} value={fee ? formatINR(fee) : "—"} />
                  <SummaryRow label="Platform fee" value={formatINR(CONSULTATION_PLATFORM_FEE)} />
                  <div className="flex items-center justify-between gap-2 text-sm py-2.5 px-3 rounded-lg bg-surface-container-low md:bg-surface-container-low">
                    <span className="text-indigo-gray-600 font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-vibrant-blue" /> Slot
                    </span>
                    <span className="font-bold text-on-surface text-right">{selected ? formatSlot(selected.start, now) : "Not chosen yet"}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-surface-container flex items-baseline justify-between">
                  <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">Total Payable</span>
                  <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-extrabold text-vibrant-blue">{formatINR(total)}</span>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <PayuNote />
                  {error && (
                    <FormError>
                      {error}
                      {pendingId && (
                        <>
                          {" "}
                          <Link href={`/patient/checkout/${pendingId}`} className="font-bold underline">Pay from checkout</Link>
                        </>
                      )}
                    </FormError>
                  )}
                  {!patient ? (
                    <SignInToBook next={`/book/${doctor.id}`} />
                  ) : (
                    <button
                      type="button"
                      disabled={submitting || !selected || !canBook}
                      onClick={confirm}
                      className="w-full py-4 px-6 rounded-full bg-vibrant-blue text-on-primary font-title-md text-body-lg font-bold shadow-lg shadow-vibrant-blue/25 hover:bg-primary transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <LoaderCircle className="w-5 h-5 animate-spin" /> Reserving your slot…
                        </>
                      ) : !canBook ? (
                        "Online booking unavailable"
                      ) : !selected ? (
                        "Select a time slot"
                      ) : (
                        <>
                          <Lock className="w-5 h-5" /> Confirm &amp; Pay {formatINR(total)}
                        </>
                      )}
                    </button>
                  )}
                </div>

                <ul className="mt-6 pt-5 border-t border-surface-container-low flex flex-col gap-2.5 font-label-sm text-label-sm text-indigo-gray-600">
                  <li className="flex items-start gap-2.5">
                    <CircleCheck className="w-[18px] h-[18px] text-fresh-teal shrink-0" />
                    Your appointment is confirmed as soon as the payment succeeds.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IdCard className="w-[18px] h-[18px] text-vibrant-blue shrink-0" />
                    Show your booking ID at the hospital reception to check in.
                  </li>
                </ul>
              </div>

              {doctor.hospital && (
                <div className="hidden md:flex bg-surface-container-low rounded-xl p-4 items-center gap-4">
                  <span className="w-12 h-12 rounded-full bg-vibrant-blue/10 text-vibrant-blue flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
                  </span>
                  <div className="min-w-0">
                    <span className="font-title-md text-body-md font-bold text-on-surface block truncate">{doctor.hospital.name}</span>
                    <Link href={`/hospitals/${doctor.hospital.id}`} className="font-body-md text-label-sm text-vibrant-blue hover:underline">
                      View hospital details
                    </Link>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <PatientDock activeTab="book" isSignedIn={!!patient} />
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="font-label-sm text-label-sm text-on-surface-variant md:text-outline">{label}</span>
      <span className={`font-title-md text-[15px] md:text-body-md font-bold truncate ${highlight ? "text-primary md:text-vibrant-blue" : "text-on-surface"}`}>{value}</span>
    </div>
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
      <div className="flex items-center gap-2 mb-2.5 text-outline">
        <Icon className="w-[18px] h-[18px]" />
        <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">
          {title} ({open} open)
        </span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
        {slots.map((slot) =>
          slot.booked ? (
            <button
              key={slot.id}
              type="button"
              disabled
              className="py-2.5 px-2 rounded-lg md:rounded-full bg-surface-container-high/60 text-outline-variant text-sm md:text-body-md cursor-not-allowed line-through"
            >
              {formatTime(slot.start)}
            </button>
          ) : (
            <button
              key={slot.id}
              type="button"
              aria-pressed={slot.id === selectedId}
              onClick={() => onPick(slot.id)}
              className={`py-2.5 px-2 rounded-lg md:rounded-full text-sm md:text-body-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                slot.id === selectedId ? "bg-vibrant-blue text-on-primary shadow-sm" : "bg-surface-container-low md:bg-surface-container text-on-surface hover:bg-surface-variant"
              }`}
            >
              {slot.id === selectedId && <CircleCheck className="hidden sm:block w-4 h-4" />}
              {formatTime(slot.start)}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

