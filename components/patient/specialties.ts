import {
  Activity, Baby, Bone, Brain, Ear, Eye, FlaskConical, Heart, HeartPulse, type LucideIcon,
  Microscope, Pill, Ribbon, Scissors, ShieldPlus, Stethoscope, Syringe, Wind,
} from 'lucide-react'

type SpecialtyMeta = { icon: LucideIcon; desc: string }

// Keyed by a normalised specialty name; spelling variants share an entry.
const META: Record<string, SpecialtyMeta> = {
  cardiology: { icon: Heart, desc: 'Heart, circulation & cholesterol' },
  neurology: { icon: Brain, desc: 'Brain, nerves & spine' },
  pediatrics: { icon: Baby, desc: 'Infant & child health' },
  ophthalmology: { icon: Eye, desc: 'Vision & eye health' },
  orthopedics: { icon: Bone, desc: 'Bones, joints & ligaments' },
  dermatology: { icon: ShieldPlus, desc: 'Skin, hair & allergies' },
  'general medicine': { icon: Stethoscope, desc: 'Everyday adult care' },
  'general surgery': { icon: Scissors, desc: 'Surgical consultations' },
  ent: { icon: Ear, desc: 'Ear, nose & throat' },
  pulmonology: { icon: Wind, desc: 'Lungs & breathing' },
  oncology: { icon: Ribbon, desc: 'Cancer care' },
  gastroenterology: { icon: Pill, desc: 'Stomach, liver & digestion' },
  endocrinology: { icon: FlaskConical, desc: 'Diabetes, thyroid & hormones' },
  pathology: { icon: Microscope, desc: 'Lab diagnosis' },
  gynecology: { icon: HeartPulse, desc: "Women's health & pregnancy" },
  psychiatry: { icon: Brain, desc: 'Mental health' },
  nephrology: { icon: Activity, desc: 'Kidney care' },
  anesthesiology: { icon: Syringe, desc: 'Anaesthesia & pain' },
}

const ALIASES: Record<string, string> = {
  orthopaedics: 'orthopedics',
  paediatrics: 'pediatrics',
  gynaecology: 'gynecology',
  'obstetrics & gynecology': 'gynecology',
  'obstetrics & gynaecology': 'gynecology',
  'ent (otolaryngology)': 'ent',
  otolaryngology: 'ent',
  'internal medicine': 'general medicine',
  anaesthesiology: 'anesthesiology',
}

export function specialtyMeta(name: string): SpecialtyMeta {
  const key = name.trim().toLowerCase()
  return META[ALIASES[key] ?? key] ?? { icon: Stethoscope, desc: 'Specialist consultations' }
}
