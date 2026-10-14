"use client";

import { useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, Building2, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin,
  Microscope, Stethoscope,
} from "lucide-react";
import { PatientDock } from "@/components/PatientDock";
import { doctorName, formatDayLabel, formatINR, formatSlot, formatTime, initials } from "@/components/patient/format";
import { specialtyMeta } from "@/components/patient/specialties";
import { PhoneHome } from "@/components/patient/PhoneHome";
import { byNearness, usePatientLocation } from "@/components/patient/location";
import { formatDistance } from "@/lib/geo";

export type HomeDoctor = {
  id: string;
  name: string | null;
  specialty: string | null;
  hospital: string | null;
  city: string | null;
  experience: number | null;
  /** Degrees as the doctor entered them, e.g. "MBBS, MD". */
  qualifications: string | null;
  fee: number | null;
  image: string | null;
  nextSlot: string | null;
  openToday: number;
  /** Average of published patient ratings, or null when there are none. */
  rating: number | null;
  reviewCount: number;
  /** Their hospital's map pin, for the distance to the patient. */
  lat: number | null;
  lng: number | null;
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
  /** The map pin its staff set (null until they do). */
  lat: number | null;
  lng: number | null;
};

interface PatientHomeProps {
  name: string | null;
  email: string | null;
  isSignedIn: boolean;
  now: number;
  nextVisit: { doctor: string | null; at: string; status: string } | null;
  doctors: HomeDoctor[];
  /** Every bookable doctor, for the phone list ordered by distance. */
  nearbyDoctors: HomeDoctor[];
  specialties: { name: string; count: number }[];
  /** All partner hospitals and labs; the section shows the nearest (or a few featured ones). */
  facilities: HomeFacility[];
  cities: string[];
  /** Patient reviews (a server component), shown after the care network. */
  reviews?: ReactNode;
}

const facilityHref = (f: HomeFacility) => (f.kind === "lab" ? `/book/diagnostic/${f.id}` : `/hospitals/${f.id}`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function PatientHome({ name, email, isSignedIn, now, nextVisit, doctors, nearbyDoctors, specialties, facilities, cities, reviews }: PatientHomeProps) {
  const place = usePatientLocation();
  // Nearest first once the patient shares a location; otherwise four hospitals and two labs, as before.
  const shownFacilities = useMemo(() => {
    if (place.location) return byNearness(facilities, place.location).slice(0, 8);
    const hospitals = facilities.filter((f) => f.kind === "hospital");
    const labs = facilities.filter((f) => f.kind === "lab");
    return [...hospitals.slice(0, labs.length ? 4 : 6), ...labs.slice(0, 2)].map((item) => ({ item, km: null as number | null, inArea: true }));
  }, [facilities, place.location]);
  const doctorRow = useRef<HTMLDivElement>(null);
  const facilityRow = useRef<HTMLDivElement>(null);

  // Moves a card row along by one card, wrapping round at either end.
  const scrollRow = (el: HTMLDivElement | null, direction: 1 | -1) => {
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 24) : 320;
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
      <main className="w-full pb-dock">
        <PhoneHome
          name={name}
          email={email}
          isSignedIn={isSignedIn}
          now={now}
          visitLine={isSignedIn && nextVisit ? visitLine : null}
          doctors={nearbyDoctors}
          specialties={specialties}
          cities={cities}
          place={place}
        />

        {/* Popular specialties */}
        {specialties.length > 0 && (
          <section className="hidden md:block w-full px-margin-x-mobile lg:px-margin-x-desktop pb-8 md:py-7">
            <div className="max-w-container-max mx-auto">
              <div className="flex items-center md:items-end justify-between gap-4 mb-stack-sm md:mb-8">
                <div>
                  <span className="hidden md:block font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">Clinical Domains</span>
                  <h2 className="font-title-md text-title-md md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight md:mt-1">
                    <span className="md:hidden">Popular Specialties</span>
                    <span className="hidden md:inline">Explore Popular Specialties</span>
                  </h2>
                </div>
                <Link href="/find" className="group flex items-center gap-1.5 py-2.5 -my-2.5 md:py-0 md:my-0 text-label-sm md:font-body-md md:text-body-md font-semibold text-primary md:text-vibrant-blue hover:text-primary shrink-0">
                  <span className="md:hidden">See All</span>
                  <span className="hidden md:inline">View All {specialties.length} {specialties.length === 1 ? "Specialty" : "Specialties"}</span>
                  <ArrowRight className="hidden md:block w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" />
                </Link>
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
        <section className="hidden md:block w-full md:bg-surface-container-low px-margin-x-mobile lg:px-margin-x-desktop pb-8 md:py-7">
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
              {doctors.length > 2 && (
                <CarouselButtons label="doctors" className={doctors.length <= 4 ? "lg:hidden" : ""} onScroll={(d) => scrollRow(doctorRow.current, d)} />
              )}
            </div>

            {doctors.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-container-lowest text-center text-indigo-gray-600">
                <Stethoscope className="w-10 h-10 mx-auto mb-2 text-outline" />
                No doctors are listed yet. Please check back soon.
              </div>
            ) : (
              <>
                {/* Card carousel */}
                <div
                  ref={doctorRow}
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
          <section id="care-network" className="scroll-mt-6 w-full px-margin-x-mobile lg:px-margin-x-desktop pb-8 md:py-7">
            <div className="max-w-container-max mx-auto">
              <div className="flex items-center md:items-end justify-between gap-4 mb-stack-sm md:mb-8">
                <div>
                  <span className="hidden md:block font-label-sm text-label-sm uppercase tracking-wider text-vibrant-blue font-bold">Network Centers</span>
                  <h2 className="font-title-md text-title-md md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight md:mt-1">
                    <span className="md:hidden">{place.location ? "Hospitals & Labs Near You" : "Featured Hospitals & Labs"}</span>
                    <span className="hidden md:inline">Partner Hospitals &amp; Diagnostics</span>
                  </h2>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Link href="/hospitals" className="py-2.5 -my-2.5 md:py-0 md:my-0 text-label-sm md:font-body-md md:text-body-md font-semibold text-primary md:text-vibrant-blue hover:text-primary">
                    <span className="md:hidden">Explore All</span>
                    <span className="hidden md:inline">View Hospital Directory</span>
                  </Link>
                  {shownFacilities.length > 2 && (
                    <CarouselButtons label="hospitals and labs" className={shownFacilities.length <= 3 ? "lg:hidden" : ""} onScroll={(d) => scrollRow(facilityRow.current, d)} />
                  )}
                </div>
              </div>

              <div
                ref={facilityRow}
                className="flex gap-4 md:gap-6 overflow-x-auto snap-x scroll-smooth pb-2 md:pb-4 pt-1 -mx-margin-x-mobile px-margin-x-mobile scroll-px-margin-x-mobile md:mx-0 md:px-0 md:scroll-px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {shownFacilities.map(({ item: f, km }) => {
                  const Icon = f.kind === "lab" ? Microscope : Building2;
                  const where = [km != null ? formatDistance(km) : null, f.city].filter(Boolean).join(" · ");
                  return (
                    <article key={`${f.kind}-${f.id}`} className="snap-start shrink-0 w-[260px] md:w-[calc((100%-24px)/2)] lg:w-[calc((100%-48px)/3)] bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_rgb(0,80,203,0.04)] md:shadow-sm hover:shadow-md transition-all flex flex-col">
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
                          {where && (
                            <span className="hidden md:flex font-label-sm text-label-sm text-indigo-gray-600 mb-1 items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {where}
                            </span>
                          )}
                          <h3 className="font-title-md text-body-lg md:text-title-md font-semibold md:font-bold text-on-surface truncate" title={f.name}>{f.name}</h3>
                          <p className="md:hidden text-sm text-outline flex items-center gap-1 truncate">
                            <MapPin className="w-4 h-4 shrink-0" /> {where || f.address || "Partner facility"}
                          </p>
                          {f.address && <p className="hidden md:block font-body-md text-body-md text-indigo-gray-600 mt-2 line-clamp-2">{f.address}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-2 md:mt-0 pt-2 md:pt-4 border-t border-indigo-gray-50 md:border-surface-variant">
                          <span className="text-label-sm font-semibold text-primary md:text-indigo-gray-900">
                            {f.kind === "lab" ? plural(f.count, "Test") : plural(f.count, "Doctor")}
                          </span>
                          <Link href={facilityHref(f)} className="py-2.5 -my-2.5 md:py-0 md:my-0 text-label-sm md:font-body-md md:text-body-md font-bold text-fresh-teal md:text-vibrant-blue hover:underline">
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

        {reviews}

        {/* Patient Portal Footer */}
        <footer className="w-full pt-8 pb-12 border-t border-outline-variant/30 text-on-surface-variant font-body-md text-xs">
          <div className="max-w-[1440px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-0 md:gap-y-2">
              <Link href="/terms-of-use" className="py-2.5 md:py-0 hover:text-vibrant-blue hover:underline">
                Terms &amp; Conditions
              </Link>
              <Link href="/privacy-policy" className="py-2.5 md:py-0 hover:text-vibrant-blue hover:underline">
                Privacy Policy
              </Link>
              <Link href="/patient/support" className="py-2.5 md:py-0 hover:text-vibrant-blue hover:underline">
                Help &amp; FAQs
              </Link>
              <a href="tel:108" className="py-2.5 md:py-0 text-soft-coral font-bold hover:underline">
                Emergency: Call 108
              </a>
            </div>
            <p className="text-center md:text-right text-[11px] text-on-surface-variant/70">
              © 2026 Zebrold International Holdings Pvt Ltd. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      <PatientDock activeTab="home" isSignedIn={isSignedIn} name={name} />
    </div>
  );
}

function CarouselButtons({ label, className = "", onScroll }: { label: string; className?: string; onScroll: (direction: 1 | -1) => void }) {
  return (
    <div className={`hidden md:flex items-center gap-2 ${className}`}>
      <CarouselButton label={`Previous ${label}`} onClick={() => onScroll(-1)}><ChevronLeft className="w-5 h-5" /></CarouselButton>
      <CarouselButton label={`Next ${label}`} onClick={() => onScroll(1)}><ChevronRight className="w-5 h-5" /></CarouselButton>
    </div>
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
    <span className="flex items-center gap-1.5 text-secondary">
      <span aria-hidden className="w-2 h-2 rounded-full bg-fresh-teal" /> Today {formatTime(doctor.nextSlot)}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-indigo-gray-900">
      <CalendarDays className="w-3.5 h-3.5" /> {day}
    </span>
  );
}
