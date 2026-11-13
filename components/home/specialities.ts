// The specialities on the home page and at /specialities/<slug>, each with its illustration in
// public/images/specialities. Doctors are listed under the names their hospital typed (Paediatrics, Pediatrics,
// "Obstetrics & Gynaecology"...), so each speciality matches those names rather than one exact spelling.

export type Speciality = {
  slug: string;
  name: string;
  /** A shorter label for the small phone tiles. */
  short?: string;
  /** A few words under the name on the Browse specialities tiles. */
  tagline: string;
  desc: string;
  /** Tested against a doctor's specialty, trimmed and lower-cased. */
  match: RegExp;
};

export const SPECIALITIES: Speciality[] = [
  { slug: "general-physician", name: "General Physician", tagline: "Fever, cold, BP and sugar", desc: "Fever, infections, blood pressure and sugar checks, and everyday adult care.", match: /^(general (physician|medicine|practi)|internal medicine|family (medicine|physician)|physician)/ },
  { slug: "cardiology", name: "Cardiology", tagline: "Heart and blood pressure", desc: "Heart specialists for chest pain, blood pressure, ECG and complete heart check-ups.", match: /cardio/ },
  { slug: "orthopaedics", name: "Orthopaedics", tagline: "Bones, joints and spine", desc: "Bones, joints, back pain, fractures and sports injuries.", match: /orthop/ },
  { slug: "paediatrics", name: "Paediatrics", tagline: "Babies and children", desc: "Care for babies, children and teenagers, from fevers to growth checks.", match: /p(a)?ediatric|neonat/ },
  { slug: "gynaecology", name: "Gynaecology", tagline: "Women's health and pregnancy", desc: "Women's health, periods, fertility and pregnancy care.", match: /gyn|obstet/ },
  { slug: "neurology", name: "Neurology", tagline: "Brain, nerves and headaches", desc: "Headaches, seizures, nerve pain, stroke and memory problems.", match: /^neuro/ },
  { slug: "dental-care", name: "Dental Care", tagline: "Teeth and gums", desc: "Toothache, cleaning, fillings, root canals and gum care.", match: /^dent|dental|orthodon|endodon|prosthodon/ },
  { slug: "eye-care", name: "Eye Care", tagline: "Vision and eye problems", desc: "Eye check-ups, vision problems, cataract and eye infections.", match: /ophthalm|^eye|optom/ },
  { slug: "ent", name: "ENT", tagline: "Ear, nose and throat", desc: "Ear, nose and throat: sinus, hearing, tonsils and allergies.", match: /^ent\b|otolaryng|otorhino/ },
  { slug: "dermatology", name: "Dermatology", tagline: "Skin, hair and nails", desc: "Skin, hair and nails: acne, rashes, eczema and allergies.", match: /dermat|cosmetolog/ },
  { slug: "pulmonology", name: "Pulmonology", tagline: "Lungs and breathing", desc: "Lungs and breathing: asthma, long coughs, COPD and sleep apnoea.", match: /pulmon|respirat|^chest/ },
  { slug: "gastroenterology", name: "Gastroenterology", short: "Gastro", tagline: "Stomach and digestion", desc: "Stomach, liver and digestion: acidity, IBS and jaundice.", match: /gastro|hepatolog/ },
  { slug: "nephrology", name: "Nephrology", tagline: "Kidney care", desc: "Kidney care: kidney function, infections and stones.", match: /nephro/ },
  { slug: "oncology", name: "Oncology", tagline: "Cancer care", desc: "Cancer screening, diagnosis and treatment planning.", match: /oncol|cancer/ },
  { slug: "diabetology", name: "Diabetology", tagline: "Diabetes care", desc: "Diabetes, thyroid and other hormone conditions.", match: /diabet|endocrin/ },
  { slug: "psychiatry", name: "Psychiatry", tagline: "Mental health", desc: "Anxiety, depression, sleep and other mental health concerns.", match: /psychiat|mental health/ },
  { slug: "physiotherapy", name: "Physiotherapy", tagline: "Pain and rehabilitation", desc: "Recovery after injury or surgery, and back and joint pain.", match: /physio/ },
  { slug: "urology", name: "Urology", tagline: "Urinary and kidney stones", desc: "Urinary problems, kidney stones and prostate health.", match: /^urolog/ },
  { slug: "general-surgery", name: "General Surgery", tagline: "Surgical consultations", desc: "Consultations for hernia, appendix, gallbladder and other surgery.", match: /general surg|laparoscop/ },
  { slug: "ayurveda", name: "Ayurveda", tagline: "Traditional medicine", desc: "Ayurvedic doctors for traditional care and wellness.", match: /ayurved/ },
];

/** What a client component needs to show a speciality (its `match` RegExp can't be passed to one). */
export type SpecialityInfo = Pick<Speciality, "slug" | "name" | "desc">;

/** A speciality as the Browse specialities tiles show it (no RegExp, so a client component can take it). */
export type SpecialityTile = Pick<Speciality, "slug" | "name" | "short" | "tagline" | "desc">;

export const specialityIcon = (s: Pick<Speciality, "slug">) => `/images/specialities/${s.slug}.svg`;

export const findSpeciality = (slug: string) => SPECIALITIES.find((s) => s.slug === slug) ?? null;

/** Whether a doctor listed under `specialty` belongs to this speciality. */
export const isOf = (s: Speciality, specialty: string | null | undefined) => !!specialty && s.match.test(specialty.trim().toLowerCase());
