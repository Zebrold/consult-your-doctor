// The specialities on the home page and at /specialities/<slug>, each with its illustration in
// public/images/specialities. Doctors are listed under the names their hospital typed (Paediatrics, Pediatrics,
// "Obstetrics & Gynaecology"...), so each speciality matches those names rather than one exact spelling.

export type Speciality = {
  slug: string;
  name: string;
  /** A shorter label for the small phone tiles. */
  short?: string;
  desc: string;
  /** Tested against a doctor's specialty, trimmed and lower-cased. */
  match: RegExp;
};

export const SPECIALITIES: Speciality[] = [
  { slug: "general-physician", name: "General Physician", desc: "Fever, infections, blood pressure and sugar checks, and everyday adult care.", match: /^(general (physician|medicine|practi)|internal medicine|family (medicine|physician)|physician)/ },
  { slug: "cardiology", name: "Cardiology", desc: "Heart specialists for chest pain, blood pressure, ECG and complete heart check-ups.", match: /cardio/ },
  { slug: "orthopaedics", name: "Orthopaedics", desc: "Bones, joints, back pain, fractures and sports injuries.", match: /orthop/ },
  { slug: "paediatrics", name: "Paediatrics", desc: "Care for babies, children and teenagers, from fevers to growth checks.", match: /p(a)?ediatric|neonat/ },
  { slug: "gynaecology", name: "Gynaecology", desc: "Women's health, periods, fertility and pregnancy care.", match: /gyn|obstet/ },
  { slug: "neurology", name: "Neurology", desc: "Headaches, seizures, nerve pain, stroke and memory problems.", match: /^neuro/ },
  { slug: "dental-care", name: "Dental Care", desc: "Toothache, cleaning, fillings, root canals and gum care.", match: /^dent|dental|orthodon|endodon|prosthodon/ },
  { slug: "eye-care", name: "Eye Care", desc: "Eye check-ups, vision problems, cataract and eye infections.", match: /ophthalm|^eye|optom/ },
  { slug: "ent", name: "ENT", desc: "Ear, nose and throat: sinus, hearing, tonsils and allergies.", match: /^ent\b|otolaryng|otorhino/ },
  { slug: "dermatology", name: "Dermatology", desc: "Skin, hair and nails: acne, rashes, eczema and allergies.", match: /dermat|cosmetolog/ },
  { slug: "pulmonology", name: "Pulmonology", desc: "Lungs and breathing: asthma, long coughs, COPD and sleep apnoea.", match: /pulmon|respirat|^chest/ },
  { slug: "gastroenterology", name: "Gastroenterology", short: "Gastro", desc: "Stomach, liver and digestion: acidity, IBS and jaundice.", match: /gastro|hepatolog/ },
  { slug: "nephrology", name: "Nephrology", desc: "Kidney care: kidney function, infections and stones.", match: /nephro/ },
  { slug: "oncology", name: "Oncology", desc: "Cancer screening, diagnosis and treatment planning.", match: /oncol|cancer/ },
  { slug: "diabetology", name: "Diabetology", desc: "Diabetes, thyroid and other hormone conditions.", match: /diabet|endocrin/ },
  { slug: "psychiatry", name: "Psychiatry", desc: "Anxiety, depression, sleep and other mental health concerns.", match: /psychiat|mental health/ },
  { slug: "physiotherapy", name: "Physiotherapy", desc: "Recovery after injury or surgery, and back and joint pain.", match: /physio/ },
  { slug: "urology", name: "Urology", desc: "Urinary problems, kidney stones and prostate health.", match: /^urolog/ },
  { slug: "general-surgery", name: "General Surgery", desc: "Consultations for hernia, appendix, gallbladder and other surgery.", match: /general surg|laparoscop/ },
  { slug: "ayurveda", name: "Ayurveda", desc: "Ayurvedic doctors for traditional care and wellness.", match: /ayurved/ },
];

/** What a client component needs to show a speciality (its `match` RegExp can't be passed to one). */
export type SpecialityInfo = Pick<Speciality, "slug" | "name" | "desc">;

export const specialityIcon = (s: Pick<Speciality, "slug">) => `/images/specialities/${s.slug}.svg`;

export const findSpeciality = (slug: string) => SPECIALITIES.find((s) => s.slug === slug) ?? null;

/** Whether a doctor listed under `specialty` belongs to this speciality. */
export const isOf = (s: Speciality, specialty: string | null | undefined) => !!specialty && s.match.test(specialty.trim().toLowerCase());
