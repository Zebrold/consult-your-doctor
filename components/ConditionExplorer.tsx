'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  BadgeCheck,
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
    badge: { label: 'General medicine', tone: 'teal' },
    title: 'Everyday illnesses',
    desc: 'Fevers, coughs, infections and other short-term illnesses, seen by a general physician.',
    conditions: ['Cough, Cold & Flu', 'Sore Throat & Strep Throat', 'Sinus Infections (Sinusitis)', 'Pink Eye & Eye Allergies', 'Urinary Tract Infections (UTI)', 'Food Poisoning & Diarrhea', 'Ear Infections & Otitis Media', 'Fever Management'],
    note: { icon: IdCard, text: 'Prescription saved to your account' },
    cta: { label: 'Find a general physician', href: '/search?type=doctor&q=general' },
  },
  {
    icon: Sparkles,
    badge: { label: 'Dermatology', tone: 'blue' },
    title: 'Dermatology & Skin',
    desc: 'Rashes, acne, infections and other skin, hair and nail problems, examined in person.',
    conditions: ['Rash, Eczema & Psoriasis', 'Severe Acne & Rosacea', 'Bug Bites & Cellulitis', 'Hives & Contact Allergies', 'Cold Sores & Shingles', 'Fungal Skin Infections', 'Scalp Dermatitis & Dandruff', 'Minor Burns & Scars'],
    note: { icon: Camera, text: 'Examined in person by a dermatologist' },
    cta: { label: 'Find a dermatologist', href: '/search?type=doctor&q=dermatolog' },
  },
  {
    icon: Activity,
    badge: { label: 'Follow-up care', tone: 'primary' },
    title: 'Long-term conditions',
    desc: 'Regular reviews for blood pressure, diabetes, asthma, thyroid and more, with every prescription kept in your account.',
    conditions: ['Asthma & Inhaler Refills', 'Hypertension & Blood Pressure', 'Acid Reflux & GERD', 'Type 2 Diabetes Monitoring', 'High Cholesterol Management', 'Hypothyroidism & Thyroid Checks', 'Seasonal Chronic Allergies', 'Migraines & Chronic Headaches'],
    note: { icon: RefreshCw, text: 'Past prescriptions kept in your account' },
    cta: { label: 'Book a follow-up', href: '/search?type=doctor&q=general' },
  },
  {
    icon: Users,
    badge: { label: 'Private', tone: 'primary' },
    title: "Men's & Women's Health",
    desc: 'Private consultations for sexual and reproductive health, hormones and general wellbeing.',
    conditions: ['Vaginal Yeast Infections', 'Bacterial Vaginosis (BV)', 'ED Treatment & Consult', 'Contraception & Birth Control', 'Gout Attack Management', 'Hair Loss & Finasteride Consult', 'Genital Herpes Therapy', 'Lab Orders for STIs'],
    note: { icon: Lock, text: 'Private consultation and records' },
    cta: { label: 'Book a private consultation', href: '/search?type=doctor' },
  },
  {
    icon: Brain,
    badge: { label: 'Psychiatry', tone: 'teal' },
    title: 'Mental Health & Wellness',
    desc: 'Support for anxiety, low mood, sleep and stress from qualified specialists.',
    conditions: ['Mild-to-Moderate Anxiety', 'Depression Support & Review', 'Sleep Disorders & Insomnia', 'Burnout & Work Stress Care', 'Panic Attack Action Plans', 'Grief & Relationship Counseling'],
    note: { icon: ShieldCheck, text: 'Seen by qualified specialists' },
    cta: { label: 'Find a specialist', href: '/search?type=doctor&q=psych' },
  },
  {
    icon: Microscope,
    badge: { label: 'Partner labs', tone: 'white' },
    title: 'Lab Orders & Diagnostics',
    desc: 'Book blood tests and other investigations at a partner lab near you.',
    conditions: ['Comprehensive Blood Panels (CBC)', 'Thyroid (TSH, Free T3/T4)', 'Lipid Panel & Cholesterol', 'Hemoglobin A1c (HbA1c)', 'Metabolic Panel & Kidney Function'],
    note: { icon: MapPin, text: 'Reports delivered to your account' },
    cta: { label: 'Book a lab test', href: '/search?type=diagnostic' },
    featured: true,
  },
]

const badgeTones = {
  teal: 'bg-fresh-teal/10 text-secondary',
  blue: 'bg-surface-container text-vibrant-blue',
  primary: 'bg-surface-container text-primary',
  white: 'bg-surface-container-lowest text-vibrant-blue',
}


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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <span className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm uppercase tracking-wider">
              What we treat
            </span>
            <h1 className="font-display-lg text-4xl md:text-display-lg text-indigo-gray-900 tracking-tight">
              Conditions our <br className="hidden sm:block" />
              <span className="text-vibrant-blue">doctors treat</span>
            </h1>
            <p className="font-body-lg text-base md:text-body-lg text-indigo-gray-600 max-w-xl">
              From everyday illnesses to long-term conditions and mental health, find the right specialist and book a visit at a partner hospital.
            </p>

            {/* Search bar with live filter */}
            <div className="relative w-full max-w-xl mt-3">
              <div className="relative flex items-center bg-surface-container-lowest rounded-full shadow-lg shadow-slate-900/5 p-1.5 transition-all focus-within:shadow-xl focus-within:shadow-slate-900/5">
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
                <BadgeCheck className="w-5 h-5 text-fresh-teal" /> Verified doctors
              </span>
              <span className="flex items-center gap-2 font-body-md text-body-md text-indigo-gray-900 font-semibold">
                <Zap className="w-5 h-5 text-vibrant-blue" /> Book in minutes
              </span>
              <span className="flex items-center gap-2 font-body-md text-body-md text-indigo-gray-900 font-semibold">
                <Pill className="w-5 h-5 text-fresh-teal" /> Prescriptions in your account
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-7">
              <h2 className="text-base font-semibold text-indigo-gray-900">How booking works</h2>
              <ol className="mt-5 space-y-5">
                {[
                  'Find a specialist for your condition below, or ask our assistant which kind of doctor you need.',
                  'Pick an open time at a partner hospital and pay online.',
                  'See the doctor in person. Your prescription is saved to your account.',
                ].map((text, i) => (
                  <li key={text} className="flex gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-primary-fixed/60 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-[15px] leading-relaxed text-slate-700">{text}</p>
                  </li>
                ))}
              </ol>
              <Link href="/doctors" className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-vibrant-blue hover:underline">
                Find a doctor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical categories grid */}
      <section id="clinical-grid" className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-8 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-sm font-semibold text-vibrant-blue">Browse by specialty</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900 mt-1">Find care for your condition</h2>
          </div>
          <p className="font-body-md text-body-md text-indigo-gray-600 max-w-md">
            Choose a category to see the doctors who treat it. Use the search above to find a condition quickly.
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
                className={`rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-slate-900/5 transition-all flex flex-col justify-between ${
                  category.featured ? 'bg-surface-container' : 'bg-surface-container-lowest'
                } ${isFiltering ? (hasMatch ? 'ring-2 ring-vibrant-blue' : 'opacity-40') : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl text-primary flex items-center justify-center ${category.featured ? 'bg-surface-container-lowest' : 'bg-surface-container'}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 ${badgeTones[category.badge.tone]}`}>
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
