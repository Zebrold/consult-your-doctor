// What the home page (and the pages that reuse its cards) knows about doctors, hospitals and the visitor.

export type HomeDoctor = {
  id: string;
  name: string | null;
  specialty: string | null;
  hospital: string | null;
  /** Their hospital, whose page books them. */
  hospitalId?: string | null;
  city: string | null;
  experience: number | null;
  /** Degrees as the doctor entered them, e.g. "MBBS, MD". */
  qualifications: string | null;
  /** Online booking is open (the hospital has set the consultation fee, which only the profile page shows). */
  bookable: boolean;
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

export type HomeHospital = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image: string | null;
  /** Every doctor listed at the hospital. */
  doctors: number;
  /** The specialties its doctors are listed under, most doctors first. */
  specialties: { name: string; count: number }[];
  /** A facility the hospital lists as round the clock (e.g. "24/7 Emergency"). */
  open247: boolean;
  /** The first other facility it lists, for the card. */
  facility: string | null;
  /** Average of published patient ratings, or null when there are none. */
  rating: number | null;
  reviewCount: number;
  /** The map pin its staff set (null until they do). */
  lat: number | null;
  lng: number | null;
};

export type NextVisit = { doctor: string | null; at: string; status: string };

/** Who is looking: a visitor, a signed-in patient, or staff (who get a link back to their portal). */
export type HomeAccount =
  | { kind: "guest" }
  | { kind: "patient"; name: string | null; email: string | null }
  | { kind: "staff"; href: string };
