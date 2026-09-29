'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  BadgeCheck,
  BriefcaseMedical,
  Brain,
  Camera,
  Check,
  IdCard,
  Lock,
  MapPin,
  Microscope,
  Pill,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

type Category = {
  icon: LucideIcon
  badge: { label: string; tone: 'teal' | 'blue' | 'primary' | 'white'; dot?: boolean }
  title: string
  desc: string
  conditions: string[]
  note: { icon: LucideIcon; text: string }
  cta: { label: string; href: string }
  featured?: boolean
}

const categories: Category[] = [
  {
    icon: Siren,
    badge: { label: 'Under 15m', tone: 'teal', dot: true },
    title: 'Everyday & Urgent Care',
    desc: 'Rapid diagnosis and symptomatic treatment for rapid onset seasonal and daily illnesses.',
    conditions: ['Cough, Cold & Flu', 'Sore Throat & Strep Throat', 'Sinus Infections (Sinusitis)', 'Pink Eye & Eye Allergies', 'Urinary Tract Infections (UTI)', 'Food Poisoning & Diarrhea', 'Ear Infections & Otitis Media', 'Fever Management'],
    note: { icon: IdCard, text: 'Includes official digital sick note' },
    cta: { label: 'Consult Urgent Care Doctor', href: '/search?type=doctor&q=general' },
  },
  {
    icon: Sparkles,
    badge: { label: 'Photo Upload', tone: 'blue' },
    title: 'Dermatology & Skin',
    desc: 'Certified skin evaluations via high-definition secure photos and real-time video consults.',
    conditions: ['Rash, Eczema & Psoriasis', 'Severe Acne & Rosacea', 'Bug Bites & Cellulitis', 'Hives & Contact Allergies', 'Cold Sores & Shingles', 'Fungal Skin Infections', 'Scalp Dermatitis & Dandruff', 'Minor Burns & Scars'],
    note: { icon: Camera, text: 'Secure photo assessment in 2 hours' },
    cta: { label: 'See a Dermatologist', href: '/search?type=doctor&q=dermatolog' },
  },
  {
    icon: Activity,
    badge: { label: 'Refill Sync', tone: 'primary' },
    title: 'Chronic Care & Refills',
    desc: 'Continuous medical management, dosage calibration, and fast electronic pharmacy refills.',
    conditions: ['Asthma & Inhaler Refills', 'Hypertension & Blood Pressure', 'Acid Reflux & GERD', 'Type 2 Diabetes Monitoring', 'High Cholesterol Management', 'Hypothyroidism & Thyroid Checks', 'Seasonal Chronic Allergies', 'Migraines & Chronic Headaches'],
    note: { icon: RefreshCw, text: 'Automatic 30-day renewal tracking' },
    cta: { label: 'Renew Prescription Now', href: '/search?type=doctor&q=general' },
  },
  {
    icon: Users,
    badge: { label: '100% Confidential', tone: 'primary' },
    title: "Men's & Women's Health",
    desc: 'Private, judgement-free clinical visits for sexual health, hormones, and wellness.',
    conditions: ['Vaginal Yeast Infections', 'Bacterial Vaginosis (BV)', 'ED Treatment & Consult', 'Contraception & Birth Control', 'Gout Attack Management', 'Hair Loss & Finasteride Consult', 'Genital Herpes Therapy', 'Lab Orders for STIs'],
    note: { icon: Lock, text: 'Encrypted records & discreet delivery' },
    cta: { label: 'Book Private Consultation', href: '/search?type=doctor' },
  },
  {
    icon: Brain,
    badge: { label: 'Therapists & MDs', tone: 'teal' },
    title: 'Mental Health & Wellness',
    desc: 'Compassionate guidance, psychological care plans, and stress regulation support.',
    conditions: ['Mild-to-Moderate Anxiety', 'Depression Support & Review', 'Sleep Disorders & Insomnia', 'Burnout & Work Stress Care', 'Panic Attack Action Plans', 'Grief & Relationship Counseling'],
    note: { icon: ShieldCheck, text: 'Licensed clinical psychotherapists' },
    cta: { label: 'Talk to a Specialist', href: '/search?type=doctor&q=psych' },
  },
  {
    icon: Microscope,
    badge: { label: 'Lab Network', tone: 'white' },
    title: 'Lab Orders & Diagnostics',
    desc: 'Electronic requisitions sent directly to certified testing clinics near your location.',
    conditions: ['Comprehensive Blood Panels (CBC)', 'Thyroid (TSH, Free T3/T4)', 'Lipid Panel & Cholesterol', 'Hemoglobin A1c (HbA1c)', 'Metabolic Panel & Kidney Function'],
    note: { icon: MapPin, text: '3,400+ Partner labs nationwide' },
    cta: { label: 'Order Lab Requisition', href: '/search?type=diagnostic' },
    featured: true,
  },
]

const badgeTones = {
  teal: 'bg-fresh-teal/10 text-secondary',
  blue: 'bg-surface-container text-vibrant-blue',
  primary: 'bg-surface-container text-primary',
  white: 'bg-surface-container-lowest text-vibrant-blue',
}

const heroImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCai_XYMgqyGU1tEJ0WCNvxPMv1VpGyVluNl4wRmOBK9MmEuJuNezHVtfoaRENCZc1kp2vVsJ8zC54eZE-O0oPWADQ2YagdwWRA9in-6gKfGyFbi5UyS34Dr_8ZZXxxqjhGkQT2kpUROEX2ScrPfDBEt56DnYY69swajoNho4L14ecX7GvkhD4iMypnYOsMaam9sUGZ1AAVcH4jbq4GJSlWaYTyMdwywttArLnVGqV4YDIsU7LOXp4oKg'

/** Hero search + condition category grid for the "What we treat" page; the search filters the grid. */
export function ConditionExplorer() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const isFiltering = q.length > 0

  const matchesTotal = isFiltering
    ? categories.reduce((sum, c) => sum + c.conditions.filter((item) => item.toLowerCase().includes(q)).length, 0)
    : 0

  return (
    <>
      {/* Hero */}
      <section className="relative isolate w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-8 pb-12">
        <div aria-hidden className="absolute top-0 right-1/4 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />
        <div aria-hidden className="absolute top-24 left-10 w-72 h-72 bg-secondary-fixed/20 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <span className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-vibrant-blue animate-pulse" />
              Comprehensive Telehealth Medical Services
            </span>
            <h1 className="font-display-lg text-4xl md:text-display-lg text-indigo-gray-900 tracking-tight">
              What Conditions <br className="hidden sm:block" />
              <span className="text-vibrant-blue">We Treat Online</span>
            </h1>
            <p className="font-body-lg text-base md:text-body-lg text-indigo-gray-600 max-w-xl">
              From acute illnesses and daily health concerns to chronic disease management and mental wellness, get diagnosis and prescriptions from licensed physicians in under 15 minutes.
            </p>

            {/* Search bar with live filter */}
            <div className="relative w-full max-w-xl mt-3">
              <div className="relative flex items-center bg-surface-container-lowest rounded-full shadow-lg shadow-primary/5 p-1.5 transition-all focus-within:shadow-xl focus-within:shadow-primary/10">
                <Search className="w-5 h-5 text-indigo-gray-600 ml-4 mr-2 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search condition, symptom, or treatment (e.g. Cough, Asthma, UTI)..."
                  aria-label="Search conditions"
                  className="w-full bg-transparent font-body-md text-sm md:text-body-md text-on-surface placeholder:text-outline focus:outline-none py-2 min-w-0"
                />
                {isFiltering && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="px-3 py-1 font-label-sm text-label-sm text-indigo-gray-600 hover:text-on-surface"
                  >
                    Clear
                  </button>
                )}
                <a
                  href="#clinical-grid"
                  className="px-5 md:px-6 py-2.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm hover:bg-primary transition-all shrink-0"
                >
                  Browse All
                </a>
              </div>
              {isFiltering && (
                <p className="text-xs font-label-sm text-primary mt-2 ml-4" aria-live="polite">
                  Found {matchesTotal} condition{matchesTotal === 1 ? '' : 's'} matching &quot;{query.trim()}&quot;
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
              <span className="flex items-center gap-2 font-body-md text-body-md text-indigo-gray-900 font-semibold">
                <BadgeCheck className="w-5 h-5 text-fresh-teal" /> 100% Certified Doctors
              </span>
              <span className="flex items-center gap-2 font-body-md text-body-md text-indigo-gray-900 font-semibold">
                <Zap className="w-5 h-5 text-vibrant-blue" /> 15-Min Response
              </span>
              <span className="flex items-center gap-2 font-body-md text-body-md text-indigo-gray-900 font-semibold">
                <Pill className="w-5 h-5 text-fresh-teal" /> e-Prescriptions Sent Instantly
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 bg-surface-container-low flex flex-col justify-end p-6">
              <img
                className="absolute inset-0 w-full h-full object-cover"
                alt="Patient using a smartphone to consult a verified doctor online"
                src={heroImage}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-gray-900/80 via-indigo-gray-900/20 to-transparent" />
              <div className="relative z-10 p-4 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-fresh-teal/10 flex items-center justify-center text-fresh-teal shrink-0">
                    <BriefcaseMedical className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-body-md font-bold text-indigo-gray-900">Immediate Assessment</span>
                    <span className="font-label-sm text-label-sm text-fresh-teal">Online doctors ready now</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">€20</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical categories grid */}
      <section id="clinical-grid" className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-8 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="font-label-sm text-label-sm text-vibrant-blue font-semibold uppercase tracking-wider">Clinically Approved Conditions</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900 mt-1">Specialized Virtual Consultations</h2>
          </div>
          <p className="font-body-md text-body-md text-indigo-gray-600 max-w-md">
            Select a category below or review our doctor checklist. Medical certificates, referrals, and same-day electronic pharmacy orders included.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon
            const NoteIcon = category.note.icon
            const hasMatch = category.conditions.some((item) => item.toLowerCase().includes(q))

            return (
              <article
                key={category.title}
                className={`rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col justify-between ${
                  category.featured ? 'bg-surface-container' : 'bg-surface-container-lowest'
                } ${isFiltering ? (hasMatch ? 'ring-2 ring-vibrant-blue' : 'opacity-40') : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl text-primary flex items-center justify-center ${category.featured ? 'bg-surface-container-lowest' : 'bg-surface-container'}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 ${badgeTones[category.badge.tone]}`}>
                      {category.badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-fresh-teal" />}
                      {category.badge.label}
                    </span>
                  </div>
                  <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">{category.title}</h3>
                  <p className="font-body-md text-body-md text-indigo-gray-600 mt-1 mb-5">{category.desc}</p>
                  <ul className="space-y-2.5">
                    {category.conditions.map((item) => {
                      const dimmed = isFiltering && !item.toLowerCase().includes(q)
                      return (
                        <li
                          key={item}
                          className={`flex items-center gap-2.5 font-body-md text-[15px] text-indigo-gray-900 transition-opacity ${dimmed ? 'opacity-25' : ''}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-vibrant-blue shrink-0 ${category.featured ? 'bg-surface-container-lowest' : 'bg-surface-container'}`}>
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          </span>
                          {item}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div className={`mt-6 -mx-6 -mb-6 p-6 rounded-b-3xl ${category.featured ? 'bg-surface-container-lowest/60' : 'bg-surface-container-low/60'}`}>
                  <div className="flex items-center gap-2 text-indigo-gray-600 font-label-sm text-label-sm mb-3">
                    <NoteIcon className="w-4 h-4 text-primary" />
                    {category.note.text}
                  </div>
                  <Link
                    href={category.cta.href}
                    className="block w-full py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-center font-label-sm text-label-sm font-semibold transition-all"
                  >
                    {category.cta.label}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
