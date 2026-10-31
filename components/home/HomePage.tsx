"use client";

import { useCallback, useMemo, useState } from "react";
import { doctorName, formatSlot } from "@/components/patient/format";
import { locationCity, nearbyOnly, usePatientLocation } from "@/components/patient/location";
import { LocationSheet } from "@/components/patient/LocationSheet";
import { MenuSheet } from "@/components/patient/PhoneSheet";
import { HomeHero } from "./HomeHero";
import { DoctorsSection, HospitalsSection, SpecialitiesSection, TreatSection } from "./HomeSections";
import { AppPromo } from "./AppPromo";
import type { HomeAccount, HomeDoctor, HomeHospital, NextVisit } from "./types";

type Props = {
  account: HomeAccount;
  now: number;
  /** A signed-in patient's next booked visit. */
  nextVisit: NextVisit | null;
  /** Every bookable doctor, soonest available first. */
  doctors: HomeDoctor[];
  /** Partner hospitals with doctors, those with photos first. */
  hospitals: HomeHospital[];
  /** Cities with partner hospitals or labs, for the location sheet. */
  cities: string[];
  /** An SVG QR code of the site's address, for the app banner. */
  appQr: string;
};

const SHOWN = 10;

export function HomePage({ account, now, nextVisit, doctors, hospitals, cities, appQr }: Props) {
  const place = usePatientLocation();
  const [sheet, setSheet] = useState<"location" | "menu" | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  // Once a location is set, only what is near it, nearest first; otherwise the lists in the order they came.
  const shownDoctors = useMemo(() => nearbyOnly(doctors, place.location).slice(0, SHOWN), [doctors, place.location]);
  const shownHospitals = useMemo(() => nearbyOnly(hospitals, place.location).slice(0, SHOWN), [hospitals, place.location]);

  const city = locationCity(place.location);
  const findHref = city ? `/find?city=${encodeURIComponent(city)}` : "/find";
  const visitLine = nextVisit
    ? `${nextVisit.status === "pending_payment" ? "Awaiting payment: " : "Your next visit: "}${nextVisit.doctor ? doctorName(nextVisit.doctor) : "your doctor"}, ${formatSlot(nextVisit.at, now)}`
    : null;

  return (
    <main className="font-(family-name:--font-manrope) text-[#0B1B3F] bg-white">
      <HomeHero account={account} place={place} cities={cities} visitLine={visitLine} onLocation={() => setSheet("location")} onMenu={() => setSheet("menu")} />
      <SpecialitiesSection />
      {hospitals.length > 0 && <HospitalsSection hospitals={shownHospitals} place={place} />}
      {doctors.length > 0 && <DoctorsSection doctors={shownDoctors} place={place} now={now} findHref={findHref} />}
      <TreatSection hospitals={hospitals} />
      <AppPromo qr={appQr} />

      {sheet === "location" && <LocationSheet place={place} cities={cities} onClose={closeSheet} />}
      {sheet === "menu" && (
        <MenuSheet
          name={account.kind === "patient" ? account.name : null}
          email={account.kind === "patient" ? account.email : null}
          isSignedIn={account.kind === "patient"}
          onClose={closeSheet}
        />
      )}
    </main>
  );
}
