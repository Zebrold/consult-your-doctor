"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Building2, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin,
  Microscope, Search, Stethoscope, UserRound, Zap, type LucideIcon,
} from "lucide-react";
import { PatientDock } from "@/components/PatientDock";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { doctorName, firstName, formatDayLabel, formatINR, formatSlot, formatTime, initials } from "@/components/patient/format";
import { specialtyMeta } from "@/components/patient/specialties";

export type HomeDoctor = {
  id: string;
  name: string | null;
  specialty: string | null;
  hospital: string | null;
  city: string | null;
  experience: number | null;
  fee: number | null;
  image: string | null;
  nextSlot: string | null;
  openToday: number;
};

export type HomeFacility = {
  id: string;
  kind: "hospital" | "lab";
  name: string;
  city: string | null;
  address: string | null;
  image: string | null;
  /** Doctors at a hospital, or priced tests at a lab. */
  count: number;
};

interface PatientHomeProps {
  name: string | null;
  email: string | null;
  isSignedIn: boolean;
  now: number;
  nextVisit: { doctor: string | null; at: string; status: string } | null;
  doctors: HomeDoctor[];
  specialties: { name: string; count: number }[];
  facilities: HomeFacility[];
  cities: string[];
}

const facilityHref = (f: HomeFacility) => (f.kind === "lab" ? `/book/diagnostic/${f.id}` : `/hospitals/${f.id}`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function PatientHome({ name, email, isSignedIn, now, nextVisit, doctors, specialties, facilities, cities }: PatientHomeProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const carousel = useRef<HTMLDivElement>(null);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    router.push(`/find${params.size ? `?${params}` : ""}`);
  };

  const scrollDoctors = (direction: 1 | -1) => {
    const el = carousel.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : 320;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    if (direction === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (direction === -1 && el.scrollLeft <= 8) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const visitLine = nextVisit
    ? `${nextVisit.status === "pending_payment" ? "Awaiting payment: " : "Your next visit: "}${nextVisit.doctor ? doctorName(nextVisit.doctor) : "your doctor"}, ${formatSlot(nextVisit.at, now)}`
    : "No upcoming visits. Find a doctor below and book in a few taps.";

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen">
      <PatientNavHeader name={name} email={email} isSignedIn={isSignedIn} container="max-w-[1296px] px-margin-x-mobile lg:px-margin-x-desktop" />

      <main className="w-full pb-28 md:pb-32">
        {/* Hero, greeting & search */}
        <section className="relative w-full overflow-hidden md:bg-gradient-to-b md:from-surface-container-low md:via-surface md:to-background px-margin-x-mobile lg:px-margin-x-desktop pt-2 md:pt-10 pb-10 md:pb-16">
          <div aria-hidden className="hidden md:block absolute -top-24 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div aria-hidden className="hidden md:block absolute top-1/2 -left-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-container-max mx-auto flex flex-col gap-stack-md md:gap-8">
            {/* Desktop greeting */}
            <div className="hidden md:flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary font-headline-lg text-xl font-bold">
                {name ? initials(name) : <UserRound className="w-6 h-6" />}
              </span>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface">{name ? `Welcome back, ${name}` : "Welcome to Consult Your Doctor"}</span>
                <span className="font-body-md text-body-md text-indigo-gray-600">{isSignedIn ? visitLine : "Sign in to book appointments and lab tests."}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:gap-4 md:pt-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary md:text-vibrant-blue font-bold">
                <span className="md:hidden">{name ? `Welcome back, ${firstName(name)}` : "Welcome"}</span>
                <span className="hidden md:inline">Verified Doctors &amp; Partner Labs</span>
              </span>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-display-lg md:text-display-lg text-on-surface tracking-tight md:leading-[1.08]">
                <span className="md:hidden">Find your specialist today</span>
                <span className="hidden md:inline">Find Your Specialist Today &amp; Book Instant Consultations</span>
              </h1>
              <p className="hidden md:block font-body-lg text-body-lg text-indigo-gray-600 max-w-2xl">
                Search verified doctors, partner hospitals and diagnostic labs, see their real open slots, and book in a few taps.
              </p>
            </div>

            {/* Mobile next-visit note */}
            {isSignedIn && nextVisit && (
              <Link href="/patient/appointments" className="md:hidden flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-lowest shadow-[0_4px_20px_rgb(0,80,203,0.05)]">
                <span className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5" />
                </span>
                <span className="text-sm text-on-surface leading-snug">{visitLine}</span>
              </Link>
            )}

            <form
              onSubmit={search}
              className="w-full bg-surface-container-lowest p-2 md:p-3 lg:p-4 rounded-full md:rounded-3xl lg:rounded-full shadow-[0_8px_30px_rgb(0,80,203,0.06)] md:shadow-xl flex items-center md:flex-col lg:flex-row md:items-stretch lg:items-center gap-2"
            >
              <label className="flex-1 w-full flex items-center gap-3 pl-3 md:px-4 md:py-2 min-w-0">
                <Search className="w-5 h-5 md:w-6 md:h-6 text-outline md:text-vibrant-blue shrink-0" />
                <span className="sr-only">Search doctors</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full min-w-0 bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                  placeholder="Search doctors, specialties or hospitals..."
                  type="text"
                />
              </label>
              <div className="hidden lg:block h-8 w-px bg-surface-variant" />
              <label className="hidden md:flex w-full lg:w-72 items-center gap-3 px-4 py-2">
                <MapPin className="w-[22px] h-[22px] text-fresh-teal shrink-0" />
                <span className="sr-only">City</span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-transparent font-body-md text-body-md text-on-surface focus:outline-none cursor-pointer"
                >
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="shrink-0 px-6 md:px-8 py-3 md:py-3.5 rounded-full bg-primary md:bg-vibrant-blue text-on-primary font-label-sm md:font-title-md text-sm md:text-body-lg font-bold shadow-md hover:scale-[1.02] md:hover:scale-100 md:hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="md:hidden">Search</span>
                <span className="hidden md:inline">Search Doctors</span>
                <ArrowRight className="hidden md:block w-5 h-5" />
              </button>
            </form>

            <div className="hidden md:flex flex-wrap items-center gap-2 pt-1">
              <span className="font-label-sm text-label-sm text-indigo-gray-600 mr-2">Quick Filters:</span>
              <QuickFilter href="/find?available=today" icon={Zap}>Available today</QuickFilter>
              <QuickFilter href="#care-network" icon={Microscope}>Lab tests</QuickFilter>
              <QuickFilter href="/hospitals" icon={Building2}>Hospitals</QuickFilter>
            </div>
          </div>
        </section>

        {/* Popular specialties */}
        {specialties.length > 0 && (
          <section className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-10 md:py-14">
            <div className="max-w-container-max mx-auto">
              <div className="flex items-center md:items-end justify-between gap-4 mb-stack-sm md:mb-8">
                <div>
                  <span className="hidden md:block font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">Clinical Domains</span>
                  <h2 className="font-title-md text-title-md md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight md:mt-1">
                    <span className="md:hidden">Popular Specialties</span>
                    <span className="hidden md:inline">Explore Popular Specialties</span>
                  </h2>
                </div>
                <Link href="/find" className="group flex items-center gap-1.5 text-label-sm md:font-body-md md:text-body-md font-semibold text-primary md:text-vibrant-blue hover:text-primary shrink-0">
                  <span className="md:hidden">See All</span>
                  <span className="hidden md:inline">View All {specialties.length} {specialties.length === 1 ? "Specialty" : "Specialties"}</span>
                  <ArrowRight className="hidden md:block w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Phone: compact scroller */}
              <div className="md:hidden flex gap-4 overflow-x-auto pb-2 -mx-margin-x-mobile px-margin-x-mobile [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {specialties.slice(0, 10).map((s, i) => {
                  const { icon: Icon } = specialtyMeta(s.name);
                  const tint = ["bg-primary-fixed text-on-primary-fixed", "bg-secondary-fixed text-on-secondary-fixed", "bg-tertiary-fixed text-on-tertiary-fixed", "bg-surface-container-highest text-on-surface"][i % 4];
                  return (
                    <Link
                      key={s.name}
                      href={`/find?specialty=${encodeURIComponent(s.name)}`}
                      className="flex flex-col items-center gap-2 min-w-[84px] p-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container shadow-sm transition-colors"
                    >
                      <span className={`w-12 h-12 rounded-full flex items-center justify-center ${tint}`}>
                        <Icon className="w-6 h-6" />
                      </span>
                      <span className="text-label-sm text-on-surface whitespace-nowrap">{s.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Tablet & desktop: cards */}
              <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 gap-4">
                {specialties.slice(0, 8).map((s) => {
                  const { icon: Icon, desc } = specialtyMeta(s.name);
                  return (
                    <Link
                      key={s.name}
                      href={`/find?specialty=${encodeURIComponent(s.name)}`}
                      className="group p-5 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md hover:bg-primary/5 transition-all flex flex-col justify-between h-44"
                    >
                      <div className="flex items-start justify-between">
                        <span className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center group-hover:bg-vibrant-blue group-hover:text-on-primary transition-colors">
                          <Icon className="w-[26px] h-[26px]" />
                        </span>
                        <span className="px-2 py-1 rounded-full bg-surface-container text-indigo-gray-600 font-label-sm text-label-sm">{plural(s.count, "Doctor")}</span>
                      </div>
                      <div>
                        <h3 className="font-title-md text-title-md text-on-surface font-bold group-hover:text-vibrant-blue transition-colors">{s.name}</h3>
                        <p className="font-body-md text-body-md text-indigo-gray-600 mt-1 line-clamp-1">{desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Doctors */}
        <section className="w-full md:bg-surface-container-low px-margin-x-mobile lg:px-margin-x-desktop pb-10 md:py-16">
          <div className="max-w-container-max mx-auto flex flex-col gap-stack-sm md:gap-8">
            <div className="flex items-center md:items-end justify-between gap-4">
              <div>
                <span className="hidden md:block font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">Top Verified Clinicians</span>
                <h2 className="font-title-md text-title-md md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight md:mt-1">
                  <span className="md:hidden">Available Doctors</span>
                  <span className="hidden md:inline">Recommended Doctors For You</span>
                </h2>
                <p className="hidden md:block font-body-md text-body-md text-indigo-gray-600 mt-1">Verified doctors, sorted by their earliest open appointment slot.</p>
              </div>
              <Link href="/find" className="md:hidden text-label-sm text-primary font-semibold">View All</Link>
              {doctors.length > 4 && (
                <div className="hidden md:flex items-center gap-2">
                  <CarouselButton label="Previous doctors" onClick={() => scrollDoctors(-1)}><ChevronLeft className="w-5 h-5" /></CarouselButton>
                  <CarouselButton label="Next doctors" onClick={() => scrollDoctors(1)}><ChevronRight className="w-5 h-5" /></CarouselButton>
                </div>
              )}
            </div>

            {doctors.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-container-lowest text-center text-indigo-gray-600">
                <Stethoscope className="w-10 h-10 mx-auto mb-2 text-outline" />
                No doctors are listed yet. Please check back soon.
              </div>
            ) : (
              <>
                {/* Phone: list rows */}
                <div className="md:hidden flex flex-col gap-base">
                  {doctors.slice(0, 4).map((d) => (
                    <Link key={d.id} href={`/book/${d.id}`} className="bg-surface-container-lowest p-4 rounded-xl shadow-[0_4px_20px_rgb(0,80,203,0.04)] flex gap-4 items-center">
                      <DoctorPhoto doctor={d} className="w-16 h-16 rounded-full" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <h3 className="font-title-md text-body-lg font-semibold text-on-surface truncate">{doctorName(d.name)}</h3>
                        <p className="text-sm text-outline truncate">{d.specialty || "Specialist"}{d.hospital ? ` · ${d.hospital}` : ""}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <AvailabilityChip doctor={d} now={now} />
                          {d.experience ? <span className="text-label-sm text-outline">• {d.experience} yrs exp</span> : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Tablet & desktop: card carousel */}
                <div
                  ref={carousel}
                  className="hidden md:flex gap-6 overflow-x-auto snap-x scroll-smooth pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {doctors.map((d) => (
                    <article
                      key={d.id}
                      className="snap-start shrink-0 w-[calc((100%-24px)/2)] lg:w-[calc((100%-72px)/4)] bg-surface-container-lowest rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="flex flex-col gap-4">
                        <Link href={`/doctors/${d.id}`} className="relative block w-full h-48 rounded-lg overflow-hidden bg-surface-container">
                          <DoctorPhoto doctor={d} className="w-full h-full" large />
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow-sm">
                            <SlotBadge doctor={d} now={now} />
                          </span>
                        </Link>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-label-sm text-label-sm text-vibrant-blue font-semibold uppercase truncate">{d.specialty || "Specialist"}</span>
                            {d.experience ? <span className="font-label-sm text-label-sm text-outline shrink-0">{d.experience} yrs exp</span> : null}
                          </div>
                          <Link href={`/doctors/${d.id}`} className="font-title-md text-body-lg font-bold text-on-surface mt-1 block truncate hover:text-vibrant-blue transition-colors">
                            {doctorName(d.name)}
                          </Link>
                          <p className="font-body-md text-body-md text-indigo-gray-600 truncate">{[d.hospital, d.city].filter(Boolean).join(" • ") || "Partner hospital"}</p>
                        </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-surface-variant flex items-center justify-between gap-3">
                        <div>
                          <span className="font-label-sm text-label-sm text-outline">Fee</span>
                          <p className="font-title-md text-body-lg font-bold text-on-surface">{d.fee ? formatINR(d.fee) : "—"}</p>
                        </div>
                        <Link href={`/book/${d.id}`} className="px-5 py-2.5 rounded-full bg-vibrant-blue text-on-primary font-body-md text-body-md font-semibold hover:bg-primary transition-all">
                          Book Now
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Hospitals & labs */}
        {facilities.length > 0 && (
          <section id="care-network" className="scroll-mt-6 w-full px-margin-x-mobile lg:px-margin-x-desktop md:py-16">
            <div className="max-w-container-max mx-auto">
              <div className="flex items-center md:items-end justify-between gap-4 mb-stack-sm md:mb-8">
                <div>
                  <span className="hidden md:block font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">Network Centers</span>
                  <h2 className="font-title-md text-title-md md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight md:mt-1">
                    <span className="md:hidden">Featured Hospitals &amp; Labs</span>
                    <span className="hidden md:inline">Partner Hospitals &amp; Diagnostics</span>
                  </h2>
                </div>
                <Link href="/hospitals" className="text-label-sm md:font-body-md md:text-body-md font-semibold text-primary md:text-vibrant-blue hover:text-primary shrink-0">
                  <span className="md:hidden">Explore All</span>
                  <span className="hidden md:inline">View Hospital Directory</span>
                </Link>
              </div>

              <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-2 -mx-margin-x-mobile px-margin-x-mobile md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {facilities.map((f) => {
                  const Icon = f.kind === "lab" ? Microscope : Building2;
                  return (
                    <article key={`${f.kind}-${f.id}`} className="min-w-[260px] max-w-[260px] md:min-w-0 md:max-w-none bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_rgb(0,80,203,0.04)] md:shadow-sm hover:shadow-md transition-all flex flex-col">
                      <Link href={facilityHref(f)} className="h-32 md:h-48 w-full relative bg-surface-container block">
                        {f.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="w-full h-full object-cover" alt={f.name} src={f.image} />
                        ) : (
                          <span className="w-full h-full bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed/40 flex items-center justify-center text-primary">
                            <Icon className="w-10 h-10" />
                          </span>
                        )}
                        <span className={`hidden md:flex absolute top-3 right-3 px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md font-label-sm text-label-sm font-bold items-center gap-1 ${f.kind === "lab" ? "text-vibrant-blue" : "text-secondary"}`}>
                          <Icon className="w-3.5 h-3.5" /> {f.kind === "lab" ? "Diagnostic Lab" : "Hospital"}
                        </span>
                      </Link>
                      <div className="p-4 md:p-6 flex flex-col justify-between flex-1 gap-1 md:gap-4">
                        <div>
                          {f.city && (
                            <span className="hidden md:flex font-label-sm text-label-sm text-indigo-gray-600 mb-1 items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {f.city}
                            </span>
                          )}
                          <h3 className="font-title-md text-body-lg md:text-title-md font-semibold md:font-bold text-on-surface truncate" title={f.name}>{f.name}</h3>
                          <p className="md:hidden text-sm text-outline flex items-center gap-1 truncate">
                            <MapPin className="w-4 h-4 shrink-0" /> {f.city || f.address || "Partner facility"}
                          </p>
                          {f.address && <p className="hidden md:block font-body-md text-body-md text-indigo-gray-600 mt-2 line-clamp-2">{f.address}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-2 md:mt-0 pt-2 md:pt-4 border-t border-indigo-gray-50 md:border-surface-variant">
                          <span className="text-label-sm font-semibold text-primary md:text-indigo-gray-900">
                            {f.kind === "lab" ? plural(f.count, "Test") : plural(f.count, "Doctor")}
                          </span>
                          <Link href={facilityHref(f)} className="text-label-sm md:font-body-md md:text-body-md font-bold text-fresh-teal md:text-vibrant-blue hover:underline">
                            {f.kind === "lab" ? "Book a Test" : "Explore Hospital"}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      <PatientDock activeTab="home" isSignedIn={isSignedIn} name={name} />
    </div>
  );
}

function QuickFilter({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Link href={href} className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-1.5 shadow-sm">
      <Icon className="w-[18px] h-[18px]" />
      {children}
    </Link>
  );
}

function CarouselButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
    >
      {children}
    </button>
  );
}

function DoctorPhoto({ doctor, className, large }: { doctor: HomeDoctor; className: string; large?: boolean }) {
  if (doctor.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={doctor.image} alt={doctorName(doctor.name)} className={`${className} object-cover shrink-0`} />;
  }
  return (
    <span className={`${className} shrink-0 bg-gradient-to-br from-primary-fixed to-surface-container flex items-center justify-center text-primary font-headline-lg font-bold ${large ? "text-4xl" : "text-lg"}`}>
      {initials(doctor.name)}
    </span>
  );
}

/** Desktop photo badge: the doctor's next open slot. */
function SlotBadge({ doctor, now }: { doctor: HomeDoctor; now: number }) {
  if (!doctor.nextSlot) {
    return (
      <span className="flex items-center gap-1 text-indigo-gray-600">
        <Clock className="w-3.5 h-3.5" /> No open slots
      </span>
    );
  }
  const day = formatDayLabel(doctor.nextSlot, now);
  return day === "Today" ? (
    <span className="flex items-center gap-1 text-secondary">
      <Zap className="w-3.5 h-3.5" /> Today {formatTime(doctor.nextSlot)}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-indigo-gray-900">
      <CalendarDays className="w-3.5 h-3.5" /> {day}
    </span>
  );
}

/** Phone list chip: "Available Today" or the next day with an open slot. */
function AvailabilityChip({ doctor, now }: { doctor: HomeDoctor; now: number }) {
  if (doctor.openToday > 0) {
    return <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-fresh-teal text-label-sm">Available Today</span>;
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-label-sm">
      {doctor.nextSlot ? `Next Available: ${formatDayLabel(doctor.nextSlot, now)}` : "No open slots"}
    </span>
  );
}
