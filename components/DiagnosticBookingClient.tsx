"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck, Building2, CalendarDays, Check, CircleCheck, FileText, FlaskConical, IdCard, Lock, LoaderCircle,
  MapPin, Microscope, Navigation, Plus, Search,
} from "lucide-react";
import { PatientDock } from "@/components/PatientDock";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { createDiagnosticBooking } from "@/app/actions/booking";
import { startPayuPayment } from "@/lib/payu-client";
import { DIAGNOSTIC_PLATFORM_FEE, type BookedTest } from "@/lib/pricing";
import {
  appendPatientDetails, Breadcrumbs, DayStrip, FormError, PatientDetailsFields, PayuNote, patientDetailsError,
  SignInToBook, StepCard, SummaryRow, type PatientDetails,
} from "@/components/patient/booking-ui";
import { formatINR, formatLongDate, upcomingDays } from "@/components/patient/format";

export interface DiagnosticCenter {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image: string | null;
}

interface DiagnosticBookingClientProps {
  center: DiagnosticCenter;
  /** Tests the lab lists with a price; only these can be booked online. */
  tests: BookedTest[];
  patient: PatientDetails | null;
  now: number;
  payuKey: string;
}

const COLLAPSED = 8;

export function DiagnosticBookingClient({ center, tests, patient, now, payuKey }: DiagnosticBookingClientProps) {
  const days = useMemo(() => upcomingDays(now, 6), [now]);
  const today = days[0].key;
  const [chosen, setChosen] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Late in the evening most labs have closed, so suggest tomorrow (today stays selectable).
  const [date, setDate] = useState(() =>
    Number(new Date(now).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" })) >= 17 ? days[1].key : today,
  );
  const [details, setDetails] = useState<PatientDetails>(() => patient ?? { name: "", phone: "", email: "", dateOfBirth: "", gender: "" });
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedTests = tests.filter((t) => chosen.includes(t.name));
  const testsTotal = selectedTests.reduce((sum, t) => sum + t.price, 0);
  const total = testsTotal + DIAGNOSTIC_PLATFORM_FEE;
  const cheapest = tests.length ? Math.min(...tests.map((t) => t.price)) : null;

  const q = filter.trim().toLowerCase();
  const matching = tests.filter((t) => !q || t.name.toLowerCase().includes(q));
  const shown = showAll || q ? matching : matching.slice(0, COLLAPSED);

  const toggle = (name: string) => {
    setChosen((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));
    setError(null);
  };

  const confirm = async () => {
    if (selectedTests.length === 0) return setError("Please select at least one test.");
    const detailsProblem = patientDetailsError(details);
    if (detailsProblem) return setError(detailsProblem);

    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.append("center_id", center.id);
    form.append("preferred_date", date);
    for (const t of selectedTests) form.append("test_names", t.name);
    appendPatientDetails(form, details);

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
      firstname: details.name,
      email: details.email.trim() || "patient@example.com",
      phone: details.phone,
      payuKey,
    });
    if (payError) {
      setPendingId(bookingId);
      setError(`Your booking is saved, but the payment couldn't start: ${payError}`);
      setSubmitting(false);
    }
  };

  const location = [center.address, center.city].filter(Boolean).join(", ");

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen">
      <PatientNavHeader isSignedIn={!!patient} name={patient?.name} email={patient?.email} container="max-w-container-max px-margin-x-mobile md:px-margin-x-desktop" />

      <main className="w-full pb-28 md:pb-32">
        <div className="max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop pt-2 md:pt-4">
          <div className="hidden md:block py-4">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Diagnostics", href: "/diagnostics" }, { label: center.name }, { label: "Book Diagnostic Test" }]} />
          </div>
          <div className="hidden md:block pb-8">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">Lab Test Booking</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">Finalize Diagnostic Booking</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Lab */}
              <section className="relative bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,102,255,0.06)] md:shadow-sm overflow-hidden">
                <div aria-hidden className="md:hidden absolute -right-8 -top-8 w-28 h-28 rounded-full bg-primary-fixed/40 blur-xl pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  {center.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={center.image} alt={center.name} className="w-16 h-16 md:w-14 md:h-14 rounded-xl object-cover shrink-0 shadow-sm" />
                  ) : (
                    <span className="w-16 h-16 md:w-14 md:h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                      <Microscope className="w-7 h-7" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col-reverse md:flex-row md:items-center gap-1 md:gap-2">
                      <h2 className="font-title-md text-title-md text-on-surface md:font-bold truncate">{center.name}</h2>
                      <span className="self-start md:self-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fresh-teal/15 text-on-secondary-fixed-variant font-label-sm text-[10px] md:text-label-sm uppercase md:normal-case font-semibold shrink-0">
                        <BadgeCheck className="w-3.5 h-3.5" /> Partner Lab
                      </span>
                    </div>
                    <p className="font-body-md text-[13px] md:text-body-md text-on-surface-variant mt-0.5 line-clamp-2">{location || "Address not listed"}</p>
                  </div>
                </div>
                <div className="relative grid grid-cols-3 gap-3 mt-4 bg-surface-container-low/60 md:bg-surface-container-low rounded-lg p-3 md:p-3.5 text-center">
                  <LabMetric label="Tests Offered" value={String(tests.length)} />
                  <LabMetric label="Starting At" value={cheapest ? formatINR(cheapest) : "—"} accent />
                  <LabMetric label="City" value={center.city || "—"} />
                </div>
              </section>

              {/* 1. Visit */}
              <StepCard step={1} title="Sample Collection">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-primary-fixed/20 ring-2 ring-vibrant-blue/60">
                  <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,102,255,0.3)]">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-title-md text-body-lg font-bold text-on-surface flex items-center gap-2">
                      Lab Centre Visit <CircleCheck className="w-4 h-4 text-vibrant-blue" />
                    </span>
                    <span className="block text-sm text-on-surface-variant mt-0.5">Samples are collected at the lab: {location || center.name}.</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([center.name, location].filter(Boolean).join(", "))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start sm:self-center px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-semibold shadow-sm hover:bg-surface-variant flex items-center gap-1.5 shrink-0"
                  >
                    <Navigation className="w-4 h-4 text-vibrant-blue" /> Directions
                  </a>
                </div>
              </StepCard>

              {/* 2. Tests */}
              <StepCard
                step={2}
                title="Select Diagnostic Tests"
                aside={<span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{chosen.length} Selected</span>}
              >
                {tests.length === 0 ? (
                  <div className="py-8 text-center rounded-xl bg-surface-container-low">
                    <FlaskConical className="w-8 h-8 text-outline mx-auto mb-2" />
                    <p className="font-title-md text-body-md font-semibold text-on-surface">This lab hasn&apos;t listed bookable tests yet</p>
                    <p className="text-sm text-indigo-gray-600 mt-1">Please check back later or choose another lab.</p>
                  </div>
                ) : (
                  <>
                    {tests.length > COLLAPSED && (
                      <label className="relative block mb-3">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-outline pointer-events-none" />
                        <span className="sr-only">Search tests</span>
                        <input
                          type="search"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          placeholder={`Search ${tests.length} tests...`}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
                        />
                      </label>
                    )}
                    <ul className="flex flex-col gap-2.5 md:gap-3">
                      {shown.map((t) => {
                        const on = chosen.includes(t.name);
                        return (
                          <li key={t.name}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              onClick={() => toggle(t.name)}
                              className={`w-full text-left p-3.5 md:p-4 rounded-xl flex items-center justify-between gap-4 transition-all ${
                                on ? "bg-primary-fixed/20 ring-2 ring-vibrant-blue" : "bg-surface-container-lowest md:bg-surface-container-low shadow-[0_2px_8px_rgba(0,102,255,0.04)] md:shadow-none hover:bg-surface-container"
                              }`}
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <span className={`w-9 h-9 md:w-6 md:h-6 rounded-full md:rounded flex items-center justify-center shrink-0 ${on ? "bg-vibrant-blue text-on-primary" : "bg-surface-container-high md:bg-surface-container-lowest md:ring-1 md:ring-outline-variant text-on-surface-variant"}`}>
                                  {on ? <Check className="w-5 h-5 md:w-4 md:h-4" /> : <Plus className="w-5 h-5 md:hidden" />}
                                </span>
                                <span className="font-label-sm md:font-title-md text-[14px] md:text-body-lg font-semibold text-on-surface">{t.name}</span>
                              </span>
                              <span className={`font-title-md text-[15px] md:text-title-md font-bold shrink-0 ${on ? "text-primary" : "text-on-surface"}`}>{formatINR(t.price)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {q && matching.length === 0 && <p className="text-sm text-indigo-gray-600 mt-2">No tests match &ldquo;{filter}&rdquo;.</p>}
                    {!q && matching.length > COLLAPSED && (
                      <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 font-label-sm text-label-sm text-vibrant-blue font-semibold hover:underline">
                        {showAll ? "Show fewer tests" : `View all ${matching.length} tests`}
                      </button>
                    )}
                  </>
                )}
              </StepCard>

              {/* 3. Date */}
              <StepCard
                step={3}
                title="Choose Visit Date"
                aside={
                  <span className="font-label-sm text-label-sm text-primary font-medium flex items-center gap-1 shrink-0">
                    <CalendarDays className="w-4 h-4" />
                    {new Date(now).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" })}
                  </span>
                }
              >
                <DayStrip days={days} selected={date} onSelect={setDate} />
                <p className="mt-4 flex items-start gap-2 text-sm text-indigo-gray-600">
                  <IdCard className="w-4 h-4 mt-0.5 text-vibrant-blue shrink-0" />
                  Visit the lab on {formatLongDate(`${date}T12:00:00+05:30`)} and show your booking ID at the desk. The lab will advise you if any test needs fasting.
                </p>
              </StepCard>

              {/* 4. Patient */}
              <StepCard step={4} title="Patient Details" aside={patient ? <span className="hidden sm:inline font-label-sm text-label-sm text-indigo-gray-600">From your profile</span> : null}>
                {patient ? (
                  <PatientDetailsFields value={details} onChange={setDetails} maxDate={today} />
                ) : (
                  <p className="text-sm text-indigo-gray-600">Sign in first and we&apos;ll fill in your details from your profile.</p>
                )}
              </StepCard>
            </div>

            {/* Summary */}
            <aside className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
              <div className="bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,102,255,0.06)] md:shadow-md">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-container-high/60">
                  <h2 className="font-title-md text-body-lg md:text-title-md font-bold text-on-surface">Booking Summary</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-[11px] font-bold">INR</span>
                </div>
                <div className="flex flex-col gap-3.5 pb-5 font-body-md text-body-md">
                  {selectedTests.length === 0 ? (
                    <p className="text-sm text-indigo-gray-600">No tests selected yet.</p>
                  ) : (
                    selectedTests.map((t) => <SummaryRow key={t.name} label={t.name} value={formatINR(t.price)} />)
                  )}
                  <SummaryRow label="Platform fee" value={formatINR(DIAGNOSTIC_PLATFORM_FEE)} />
                  <SummaryRow label="Sample collection" sub="At the lab" value="Free" tone="free" />
                </div>
                <div className="py-4 bg-surface-container-low -mx-5 md:-mx-6 px-5 md:px-6 flex items-center justify-between gap-3">
                  <div>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">Total Payable</span>
                    <span className="block font-label-sm text-[11px] text-indigo-gray-600 mt-0.5">Visit on {formatLongDate(`${date}T12:00:00+05:30`)}</span>
                  </div>
                  <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-extrabold">{selectedTests.length ? formatINR(total) : "—"}</span>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <PayuNote />
                  {error && (
                    <FormError>
                      {error}
                      {pendingId && (
                        <>
                          {" "}
                          <Link href={`/patient/checkout/diagnostic/${pendingId}`} className="font-bold underline">Pay from checkout</Link>
                        </>
                      )}
                    </FormError>
                  )}
                  {!patient ? (
                    <SignInToBook next={`/book/diagnostic/${center.id}`} />
                  ) : (
                    <button
                      type="button"
                      onClick={confirm}
                      disabled={submitting || selectedTests.length === 0}
                      className="w-full py-4 px-6 rounded-full bg-primary hover:bg-primary-container text-on-primary font-title-md text-body-lg md:text-title-md font-bold shadow-[0_8px_20px_rgba(0,80,203,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <LoaderCircle className="w-5 h-5 animate-spin" /> Saving your booking…
                        </>
                      ) : selectedTests.length === 0 ? (
                        "Select a test to continue"
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
                    Your booking is confirmed as soon as the payment succeeds.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <FileText className="w-[18px] h-[18px] text-vibrant-blue shrink-0" />
                    Track the test and its report from your profile.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <MapPin className="w-[18px] h-[18px] text-on-surface-variant shrink-0" />
                    {center.name}{center.city ? `, ${center.city}` : ""}
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <PatientDock activeTab="book" isSignedIn={!!patient} name={patient?.name} />
    </div>
  );
}

function LabMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-w-0">
      <span className="font-label-sm text-[11px] md:text-label-sm text-on-surface-variant uppercase md:normal-case tracking-wider md:tracking-normal">{label}</span>
      <span className={`font-title-md text-[15px] md:text-title-md font-bold mt-0.5 truncate max-w-full ${accent ? "text-primary" : "text-on-surface"}`}>{value}</span>
    </div>
  );
}
