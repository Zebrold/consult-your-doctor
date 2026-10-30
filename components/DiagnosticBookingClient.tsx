"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleCheck, FileText, FlaskConical, Home, IdCard, Lock, LoaderCircle, LogIn, MapPin, Navigation, Search } from "lucide-react";
import { PatientDock } from "@/components/PatientDock";
import { VerifiedBadge } from "@/components/home/ui";
import { HeroButtons } from "@/components/patient/HospitalBooking";
import { Dots, btnPrimary, card } from "@/components/patient/app-ui";
import { createDiagnosticBooking } from "@/app/actions/booking";
import { startPayuPayment } from "@/lib/payu-client";
import { DEFAULT_DOORSTEP_FEE, formatPercent, labBookingFee, labTestBookingFee, type BookedTest } from "@/lib/pricing";
import {
  appendPatientDetails, DayStrip, FormError, LabChargesAtVenue, PayuNote, patientDetailsError, RefundNote, SummaryRow, type PatientDetails,
} from "@/components/patient/booking-ui";
import { directionsHref, formatINR, formatLongDate, upcomingDays } from "@/components/patient/format";
import { RemoteImage } from "@/components/RemoteImage";

export interface DiagnosticCenter {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image: string | null;
  doorstepEnabled?: boolean;
  doorstepFee?: number;
}

interface DiagnosticBookingClientProps {
  center: DiagnosticCenter;
  /** Tests the lab lists with a price; only these can be booked online. */
  tests: BookedTest[];
  patient: PatientDetails | null;
  now: number;
  payuKey: string;
  /** The booking fee, as a per cent of each test's price, that /api/payu/hash will charge (lib/booking-fees.ts). */
  bookingFeePercent: number;
}

const COLLAPSED = 8;

export function DiagnosticBookingClient({ center, tests, patient, now, payuKey, bookingFeePercent }: DiagnosticBookingClientProps) {
  const days = useMemo(() => upcomingDays(now, 6), [now]);
  const today = days[0].key;
  const doorstepEnabled = center.doorstepEnabled !== false;
  const doorstepFee = center.doorstepFee ?? DEFAULT_DOORSTEP_FEE;
  const [bookingType, setBookingType] = useState<'walk_in' | 'doorstep'>('walk_in');
  const isDoorstep = bookingType === 'doorstep' && doorstepEnabled;
  const currentDoorstepFee = isDoorstep ? doorstepFee : 0;

  const [chosen, setChosen] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Late in the evening most labs have closed, so suggest tomorrow (today stays selectable).
  const [date, setDate] = useState(() =>
    Number(new Date(now).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" })) >= 17 ? days[1].key : today,
  );
  const [details] = useState<PatientDetails>(() => patient ?? { name: "", phone: "", email: "", dateOfBirth: "", gender: "" });
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedTests = tests.filter((t) => chosen.includes(t.name));
  // The whole online payment: the booking fee on each test. The tests and home collection are paid to the lab.
  const total = labBookingFee(selectedTests, bookingFeePercent);
  const feeOf = (t: BookedTest) => labTestBookingFee(t.price, bookingFeePercent);

  const q = filter.trim().toLowerCase();
  const matching = tests.filter((t) => !q || t.name.toLowerCase().includes(q));
  const shown = showAll || q ? matching : matching.slice(0, COLLAPSED);

  const toggle = (name: string) => {
    setChosen((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));
    setError(null);
  };

  const confirm = async () => {
    if (selectedTests.length === 0) return setError("Please select at least one test.");
    const activeDetails = patient ? { ...patient, ...details } : details;
    const detailsProblem = patientDetailsError(activeDetails);
    if (detailsProblem) return setError(detailsProblem);

    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("center_id", center.id);
    form.append("preferred_date", date);
    form.append("booking_type", isDoorstep ? "doorstep" : "walk_in");
    form.append("doorstep_fee", String(currentDoorstepFee));
    for (const t of selectedTests) form.append("test_names", t.name);
    appendPatientDetails(form, activeDetails);

    const res = await createDiagnosticBooking(form);
    if (res && "error" in res && res.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    const bookingId = res && "bookingId" in res ? res.bookingId : undefined;
    if (!bookingId) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    const payError = await startPayuPayment({
      txnid: bookingId,
      productinfo: "Diagnostic",
      firstname: activeDetails.name || "Patient",
      email: (activeDetails.email || "").trim() || "patient@example.com",
      phone: activeDetails.phone || "9999999999",
      payuKey,
    });
    if (payError) {
      setPendingId(bookingId);
      setError(`Your booking is saved, but the payment couldn't start: ${payError}`);
      setSubmitting(false);
    }
  };

  const location = [center.address, center.city].filter(Boolean).join(", ");
  const directions = directionsHref(center.name, center.address, center.city);
  const countLabel = selectedTests.length === 0 ? "No tests selected" : `${selectedTests.length} ${selectedTests.length === 1 ? "test" : "tests"} selected`;
  const signIn = `/login/patient?next=${encodeURIComponent(`/book/diagnostic/${center.id}`)}`;

  const photo = center.image ? (
    <RemoteImage src={center.image} alt={center.name} fill sizes="(min-width: 1024px) 1000px, 100vw" load="first" className="object-cover" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/images/home/lab-microscope.webp" alt="" className="absolute right-[26px] bottom-[34px] lg:bottom-6 h-[160px] w-auto" />
  );

  const places = [
    { key: "walk_in" as const, title: "Visit the lab", sub: "Walk in on your day", icon: FlaskConical, on: !isDoorstep, disabled: false },
    { key: "doorstep" as const, title: "At home", sub: doorstepEnabled ? `The lab collects it · ${formatINR(doorstepFee)} to the lab` : "Not offered by this lab", icon: Home, on: isDoorstep, disabled: !doorstepEnabled },
  ];

  const cta = !patient ? (
    <Link href={signIn} className="shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] bg-[#2A4DD0] text-white text-[15px] font-extrabold shadow-[0_8px_16px_rgba(42,77,208,0.3)]">
      <LogIn className="w-4 h-4" /> Log in to book
    </Link>
  ) : (
    <button
      type="button"
      onClick={confirm}
      disabled={submitting || selectedTests.length === 0}
      className={`shrink-0 flex items-center gap-1.5 h-12 px-[18px] rounded-[14px] text-white text-[15px] font-extrabold transition-colors disabled:cursor-not-allowed ${
        selectedTests.length ? "bg-[#2A4DD0] shadow-[0_8px_16px_rgba(42,77,208,0.3)] hover:bg-[#2443B8]" : "bg-[#C9D3E6]"
      }`}
    >
      {submitting ? (
        <>
          <LoaderCircle className="w-4 h-4 animate-spin" /> Saving…
        </>
      ) : selectedTests.length === 0 ? (
        <>
          Select tests <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" /> Pay {formatINR(total)}
        </>
      )}
    </button>
  );

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen font-(family-name:--font-manrope) text-[#0B1B3F]">
      {/* Phones: the lab's picture with back and share, then its details over the edge. */}
      <div className="lg:hidden relative h-[220px] md:h-[280px] overflow-hidden bg-[linear-gradient(160deg,#EAF1FF_0%,#D3E0FF_100%)]">
        {photo}
        <HeroButtons backHref="/diagnostics" title={center.name} />
      </div>
      <section className="lg:hidden relative -mt-9 mx-3 md:mx-6 p-4 rounded-[20px] bg-white shadow-[0_10px_26px_rgba(11,27,63,0.1)]">
        <LabHeading center={center} tests={tests.length} location={location} doorstep={doorstepEnabled} />
      </section>

      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-11">
        <div className="max-w-[1340px] lg:px-9 lg:pt-7">
          <Link href="/diagnostics" className="hidden lg:inline-flex items-center gap-1.5 mb-3.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline">
            <ArrowLeft className="w-4 h-4" strokeWidth={2.4} /> Back to diagnostic centres
          </Link>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start px-3 md:px-6 lg:px-0 pt-3.5 lg:pt-0">
            <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
              <section className="hidden lg:flex relative overflow-hidden items-end min-h-[200px] p-7 rounded-[22px] bg-[linear-gradient(160deg,#EAF1FF_0%,#D3E0FF_100%)]">
                {photo}
                <div className="relative max-w-[560px] p-5 rounded-[18px] bg-white/95 shadow-[0_10px_26px_rgba(11,27,63,0.1)]">
                  <LabHeading center={center} tests={tests.length} location={location} doorstep={doorstepEnabled} desk />
                </div>
              </section>

              <Card title="How payment works">
                <PayRow title="Booking charge" sub={`${formatPercent(bookingFeePercent)} of each test's price, paid online`} value={formatPercent(bookingFeePercent)} accent />
                <PayRow title="Test price" sub="Paid to the lab at your visit" value="At the lab" />
                {doorstepEnabled && <PayRow title="Home sample collection" sub="If you choose it, paid to the lab" value={formatINR(doorstepFee)} last />}
              </Card>

              <Card title="Sample collection" id="where-title">
                <div role="radiogroup" aria-labelledby="where-title" className="grid grid-cols-2 gap-2">
                  {places.map((w) => (
                    <button
                      key={w.key}
                      type="button"
                      role="radio"
                      aria-checked={w.on}
                      disabled={w.disabled}
                      onClick={() => setBookingType(w.key)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-[14px] border-[1.5px] text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        w.on ? "border-[#2A4DD0] bg-[#F2F6FF]" : "border-[#E1E7F0] bg-white hover:border-[#A9CBFF]"
                      }`}
                    >
                      <w.icon className="w-5 h-5 text-[#2A4DD0]" />
                      <span className="text-[13.5px] font-extrabold">{w.title}</span>
                      <span className="text-[11.5px] text-[#5B667A]">{w.sub}</span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="Choose your tests" sub={tests.length ? "Select one or more. Prices are set by the lab." : undefined} aside={tests.length ? <span className="shrink-0 text-[12.5px] font-bold text-[#5B667A]">{chosen.length} selected</span> : undefined}>
                {tests.length === 0 ? (
                  <div className="py-7 text-center rounded-[14px] bg-[#F6F8FC]">
                    <FlaskConical className="w-8 h-8 text-[#9AA4B5] mx-auto mb-2" />
                    <p className="text-[14px] font-extrabold">This lab hasn&apos;t listed bookable tests yet</p>
                    <p className="mt-1 text-[12.5px] text-[#5B667A]">Please check back later or choose another lab.</p>
                  </div>
                ) : (
                  <>
                    {tests.length > COLLAPSED && (
                      <label className="relative block mb-2">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-[#7A8599] pointer-events-none" />
                        <span className="sr-only">Search tests</span>
                        <input
                          type="search"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          placeholder={`Search ${tests.length} tests`}
                          className="w-full h-11 pl-10 pr-4 rounded-[11px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] text-[14px] outline-none focus:shadow-[inset_0_0_0_1.5px_#2A4DD0]"
                        />
                      </label>
                    )}
                    <div className="lg:grid lg:grid-cols-2 lg:gap-x-6">
                      {shown.map((t) => {
                        const on = chosen.includes(t.name);
                        return (
                          <button
                            key={t.name}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggle(t.name)}
                            className="flex items-center gap-3 w-full py-[11px] border-t border-[#EEF2F7] text-left"
                          >
                            <span aria-hidden className={`shrink-0 w-[22px] h-[22px] rounded-[7px] border-2 flex items-center justify-center ${on ? "border-[#2A4DD0] bg-[#2A4DD0]" : "border-[#B7C1D1] bg-white"}`}>
                              {on && <Check className="w-3 h-3 text-white" strokeWidth={3.6} />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[14px] font-bold">{t.name}</span>
                              <span className="block text-[12px] leading-[1.4] text-[#5B667A]">Booking fee {formatINR(feeOf(t))} · rest at the lab</span>
                            </span>
                            <span className="shrink-0 text-[14px] font-extrabold">{formatINR(t.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                    {q && matching.length === 0 && <p className="mt-2 text-[13px] text-[#5B667A]">No tests match &ldquo;{filter}&rdquo;.</p>}
                    {!q && matching.length > COLLAPSED && (
                      <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
                        {showAll ? "Show fewer tests" : `View all ${matching.length} tests`}
                      </button>
                    )}
                  </>
                )}
              </Card>

              <Card title="Visit day" sub="Labs book by day, not by time.">
                <DayStrip days={days} selected={date} onSelect={setDate} />
                <p className="mt-3.5 flex items-start gap-2 text-[12.5px] leading-normal text-[#4A5878]">
                  <IdCard className="w-4 h-4 mt-px text-[#2A4DD0] shrink-0" />
                  {isDoorstep
                    ? `The lab contacts you to collect the sample on ${formatLongDate(`${date}T12:00:00+05:30`)}.`
                    : `Visit the lab on ${formatLongDate(`${date}T12:00:00+05:30`)} and show your booking ID at the desk.`}{" "}
                  The lab will tell you if a test needs fasting.
                </p>
              </Card>

              <Card title="Patient details" aside={patient ? <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#067647] text-[11.5px] font-extrabold"><CircleCheck className="w-3.5 h-3.5" /> From your profile</span> : undefined}>
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
                      Login
                    </Link>{" "}
                    with your mobile number and your details are filled in from your profile.
                  </p>
                )}
              </Card>

              {error && (
                <div className="lg:hidden">
                  <FormError>
                    {error}
                    {pendingId && (
                      <>
                        {" "}
                        <Link href={`/patient/checkout/diagnostic/${pendingId}`} className="font-bold underline">
                          Pay from checkout
                        </Link>
                      </>
                    )}
                  </FormError>
                </div>
              )}
            </div>

            {/* Desktops: the summary and the button beside the steps. */}
            <aside className={`hidden lg:block sticky top-[96px] p-[22px] ${card}`}>
              <h2 className="text-[17px] font-extrabold">Booking summary</h2>
              <div className="mt-2.5 flex flex-col gap-3 pb-4">
                {selectedTests.length === 0 ? (
                  <p className="text-[13px] text-[#5B667A]">No tests selected yet.</p>
                ) : (
                  selectedTests.map((t) => (
                    <SummaryRow key={t.name} label={`Booking fee: ${t.name}`} sub={`${formatPercent(bookingFeePercent)} of the ${formatINR(t.price)} test price`} value={formatINR(feeOf(t))} />
                  ))
                )}
                <SummaryRow label="Sample collection" sub={isDoorstep ? "Collected by the lab" : "At the lab"} value={isDoorstep ? "Paid to lab" : "Free"} tone={isDoorstep ? undefined : "free"} />
              </div>
              <div className="flex items-center justify-between gap-3 -mx-[22px] px-[22px] py-4 bg-[#F6F8FC]">
                <span>
                  <span className="block text-[12px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">Pay online now</span>
                  <span className="block mt-0.5 text-[11.5px] text-[#5B667A]">{formatLongDate(`${date}T12:00:00+05:30`)}</span>
                </span>
                <span className="text-[24px] font-extrabold text-[#2A4DD0]">{selectedTests.length ? formatINR(total) : "—"}</span>
              </div>
              <div className="mt-4 flex flex-col gap-3.5">
                <LabChargesAtVenue tests={selectedTests} doorstepFee={currentDoorstepFee} />
                <PayuNote />
                {error && (
                  <FormError>
                    {error}
                    {pendingId && (
                      <>
                        {" "}
                        <Link href={`/patient/checkout/diagnostic/${pendingId}`} className="font-bold underline">
                          Pay from checkout
                        </Link>
                      </>
                    )}
                  </FormError>
                )}
                {!patient ? (
                  <Link href={signIn} className={`${btnPrimary} w-full h-[50px]! text-[15px]!`}>
                    <LogIn className="w-4 h-4" /> Log in to book
                  </Link>
                ) : (
                  <button type="button" onClick={confirm} disabled={submitting || selectedTests.length === 0} className={`${btnPrimary} w-full h-[50px]! text-[15px]! disabled:bg-[#C9D3E6]!`}>
                    {submitting ? (
                      <>
                        <LoaderCircle className="w-5 h-5 animate-spin" /> Saving your booking…
                      </>
                    ) : selectedTests.length === 0 ? (
                      "Select a test to continue"
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> Confirm &amp; pay {formatINR(total)}
                      </>
                    )}
                  </button>
                )}
              </div>
              <ul className="mt-5 pt-4 border-t border-[#EEF2F7] flex flex-col gap-2.5 text-[12.5px] text-[#4A5878]">
                <li className="flex items-start gap-2.5">
                  <CircleCheck className="w-[17px] h-[17px] text-[#067647] shrink-0" />
                  Your booking is confirmed as soon as the payment succeeds.
                </li>
                <li className="flex items-start gap-2.5">
                  <FileText className="w-[17px] h-[17px] text-[#2A4DD0] shrink-0" />
                  Track the test and its report from your profile.
                </li>
                {directions && (
                  <li className="flex items-start gap-2.5">
                    <Navigation className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
                    <a href={directions} target="_blank" rel="noreferrer" className="hover:text-[#2A4DD0] hover:underline">
                      Directions to {center.name}
                    </a>
                  </li>
                )}
              </ul>
              <div className="mt-4">
                <RefundNote isConsultation={false} />
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Phones: what is selected and the next step, fixed at the bottom. */}
      <div className="lg:hidden fixed z-40 inset-x-0 bottom-0 flex items-center gap-3 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-white border-t border-[#E6EBF3] shadow-[0_-8px_20px_rgba(11,27,63,0.06)]">
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-extrabold">{selectedTests.length ? `${formatINR(total)} now` : countLabel}</span>
          <span className="block text-[11.5px] text-[#5B667A] truncate">
            {selectedTests.length ? `${countLabel} · rest at the lab` : `Pay ${formatPercent(bookingFeePercent)} now · rest at the lab`}
          </span>
        </span>
        {cta}
      </div>

      <PatientDock activeTab="find" isSignedIn={!!patient} name={patient?.name} phoneBar={false} />
    </div>
  );
}

/** The lab's name, what can be booked, where it is and how. */
function LabHeading({ center, tests, location, doorstep, desk = false }: { center: DiagnosticCenter; tests: number; location: string; doorstep: boolean; desk?: boolean }) {
  return (
    <>
      <h1 className={`flex items-center gap-1.5 font-extrabold tracking-[-0.02em] leading-[1.2] ${desk ? "text-[26px]" : "text-[19px]"}`}>
        <span className="min-w-0">{center.name}</span>
        <VerifiedBadge className={desk ? "w-[22px] h-[22px]" : "w-[18px] h-[18px]"} />
      </h1>
      <p className="mt-1.5 text-[13.5px] text-[#4A5878]">{tests ? `${tests} ${tests === 1 ? "test" : "tests"} with prices · Partner lab` : "Partner lab"}</p>
      {location && (
        <p className="mt-1 flex items-start gap-1.5 text-[13.5px] text-[#4A5878]">
          <MapPin className="w-[13px] h-[13px] mt-1 text-[#5B667A] shrink-0" />
          {location}
        </p>
      )}
      <Dots items={["Book by day", "Reports in your account", doorstep && "Home collection available"]} className="mt-3" />
    </>
  );
}

function Card({ title, sub, aside, id, children }: { title: string; sub?: string; aside?: ReactNode; id?: string; children: ReactNode }) {
  return (
    <section className={`p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
      <div className="flex items-start justify-between gap-3">
        <h2 id={id} className="text-[16px] font-extrabold">{title}</h2>
        {aside}
      </div>
      {sub ? <p className="mt-1 mb-2.5 text-[12.5px] text-[#5B667A]">{sub}</p> : <div className="mb-2" />}
      {children}
    </section>
  );
}

function PayRow({ title, sub, value, accent = false, last = false }: { title: string; sub: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-2.5 ${last ? "" : "border-b border-[#EEF2F7]"}`}>
      <span>
        <span className="block text-[14px] font-bold">{title}</span>
        <span className="block text-[12px] text-[#5B667A]">{sub}</span>
      </span>
      <span className={`shrink-0 text-[13.5px] font-extrabold ${accent ? "text-[#2A4DD0]" : ""}`}>{value}</span>
    </div>
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
