'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconTile, PageHero, SIDES, SectionHead, btnBlue, card } from '@/components/site/ui'
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
      <PageHero
        eyebrow="What we treat"
        title="Conditions our doctors treat"
        lead="From everyday illnesses to long-term conditions and mental health, find the right specialist and book a visit at a partner hospital."
        actions={
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-2 h-14 pl-4 pr-2 rounded-2xl bg-white text-[#0B1B3F] shadow-[0_12px_28px_rgba(4,16,70,0.25)]">
              <Search className="w-5 h-5 text-[#5B667A] shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a condition, e.g. cough, asthma"
                aria-label="Search conditions"
                className="flex-1 min-w-0 bg-transparent text-[15px] placeholder:text-[#8A94A6] outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {isFiltering && (
                <button type="button" onClick={() => setQuery('')} className="shrink-0 px-2.5 h-9 text-[13px] font-extrabold text-[#5B667A] hover:text-[#0B1B3F]">
                  Clear
                </button>
              )}
              <a href="#clinical-grid" className="hidden sm:inline-flex shrink-0 items-center h-10 px-4 rounded-xl bg-[#2A4DD0] text-white text-[13.5px] font-extrabold hover:bg-[#2443B8] transition-colors">
                Browse all
              </a>
            </div>
            {isFiltering && (
              <p className="mt-2.5 ml-1 text-[13px] font-bold text-[#DCE7FF]" aria-live="polite">
                Found {matchesTotal} condition{matchesTotal === 1 ? '' : 's'} matching &quot;{query.trim()}&quot;
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[14px] font-bold">
              <span className="flex items-center gap-2"><BadgeCheck className="w-[18px] h-[18px] text-[#7CF2B0]" /> Verified doctors</span>
              <span className="flex items-center gap-2"><Zap className="w-[18px] h-[18px] text-[#A9CBFF]" /> Book in minutes</span>
              <span className="flex items-center gap-2"><Pill className="w-[18px] h-[18px] text-[#7CF2B0]" /> Prescriptions in your account</span>
            </div>
          </div>
        }
        aside={
          <div className={`${card} p-6 md:p-7 text-[#0B1B3F] shadow-[0_24px_50px_-20px_rgba(4,16,70,0.55)]`}>
            <h2 className="text-[17px] font-extrabold">How booking works</h2>
            <ol className="mt-5 space-y-4">
              {[
                'Find a specialist for your condition below, or ask our assistant which kind of doctor you need.',
                'Pick an open time at a partner hospital and pay the booking fee online.',
                'See the doctor in person. Your prescription is saved to your account.',
              ].map((text, i) => (
                <li key={text} className="flex gap-3.5">
                  <span className="w-8 h-8 rounded-full bg-[#EEF3FF] text-[#2A4DD0] text-[14px] font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-[14.5px] leading-[1.55] text-[#27324A]">{text}</p>
                </li>
              ))}
            </ol>
            <Link href="/find" className={`${btnBlue} w-full mt-6`}>
              Find a doctor
            </Link>
          </div>
        }
      />

      {/* Clinical categories grid */}
      <section id="clinical-grid" className={`${SIDES} py-12 md:py-20 scroll-mt-24`}>
        <SectionHead eyebrow="Browse by specialty" title="Find care for your condition" lead="Choose a category to see the doctors who treat it. Use the search above to find a condition quickly." />

        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {categories.map((category) => {
            const Icon = category.icon
            const NoteIcon = category.note.icon
            const hasMatch = category.conditions.some((item) => item.toLowerCase().includes(q))

            return (
              <article
                key={category.title}
                className={`${card} overflow-hidden p-6 flex flex-col justify-between transition-all ${isFiltering ? (hasMatch ? '!shadow-[0_0_0_2px_#2A4DD0]' : 'opacity-40') : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <IconTile icon={Icon} />
                    <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 ${badgeTones[category.badge.tone]}`}>
                      {category.badge.label}
                    </span>
                  </div>
                  <h3 className="text-[19px] font-extrabold">{category.title}</h3>
                  <p className="text-[14.5px] leading-[1.55] text-[#4A5878] mt-1.5 mb-5">{category.desc}</p>
                  <ul className="space-y-2.5">
                    {category.conditions.map((item) => {
                      const dimmed = isFiltering && !item.toLowerCase().includes(q)
                      return (
                        <li
                          key={item}
                          className={`flex items-center gap-2.5 text-[14.5px] font-semibold transition-opacity ${dimmed ? 'opacity-25' : ''}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-[#E7F7EE] text-[#067647] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3.2} />
                          </span>
                          {item}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div className="mt-6 -mx-6 -mb-6 p-6 bg-[#F6F8FC] border-t border-[#EEF2F7]">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-[#5B667A] mb-3">
                    <NoteIcon className="w-4 h-4 text-[#2A4DD0]" />
                    {category.note.text}
                  </div>
                  <Link href={category.cta.href} className={`${btnBlue} w-full !h-11 !text-[14px]`}>
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
