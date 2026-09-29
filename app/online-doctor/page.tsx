import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Bot,
  ClipboardList,
  Clock,
  Gauge,
  History,
  IdCard,
  MessageSquare,
  Network,
  Brain,
  Shield,
  ShieldCheck,
  Smile,
  Sparkles,
  Timer,
  Video,
  BriefcaseMedical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OnlineDoctorRoster, type RosterDoctor } from "@/components/OnlineDoctorRoster";
import { TriageSimulator } from "@/components/TriageSimulator";

export const metadata: Metadata = {
  title: "Online Doctor Consultations",
  description:
    "Start with our clinical AI triage assistant, get a pre-consultation summary, and connect with the right board-certified physician online.",
};

const assignedDoctorImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDrfzQExhSFzLdB0gQ3extR-AlpY1y-1m2NOIOGMpK-VABkgIt44WzcOIRbCGNQuBkRp3_Dr3E5xs9GnH6qsdR3WcV1wGUHkPUTSu51NqHIQsPm49S7DLOMO2RNSpOsO1ntj0aJqDgoTTH9okxABjLN93BEW5sRn55zUmFp9wSfi2A0gDIsU1DRjLSkHAP8ZNogjqNqjWUPx6ppn16jD3yaL1rkbjwYJsUcP0I6D-V2SETVwNrq6CsATQ";

const routingSteps = [
  {
    icon: Brain,
    step: "STEP 01",
    title: "Symptom Assessment with Clinical AI",
    desc: "Natural language conversation where the patient describes symptoms. AI asks intelligent follow-up questions tailored to accredited medical protocols.",
    footerIcon: MessageSquare,
    footer: "Dynamic protocol questioning",
  },
  {
    icon: ClipboardList,
    step: "STEP 02",
    title: "Instant Clinical Risk Score & Triage",
    desc: "The AI calculates severity, checks contraindications, and prepares an encrypted SBAR (Situation, Background, Assessment, Recommendation) clinical brief.",
    footerIcon: ShieldCheck,
    footer: "Encrypted SBAR generated",
  },
  {
    icon: Network,
    step: "STEP 03",
    title: "Automated Redirection to Specialist",
    desc: "The system scans on-duty doctors across 35+ specialties, matching availability, patient language, licensing, and clinical specialty within seconds.",
    footerIcon: Gauge,
    footer: "Matched in < 8 seconds",
  },
  {
    icon: Video,
    step: "STEP 04",
    title: "Hand-off to Human Doctor",
    desc: "The doctor joins with full clinical context already synthesized, saving 50% of consultation time and focusing entirely on care and prescription.",
    footerIcon: Clock,
    footer: "50% faster consultation time",
  },
];

const assurances = [
  {
    icon: ShieldCheck,
    tone: "bg-fresh-teal/10 text-fresh-teal",
    title: "ABDM, HIPAA & NHS Certified",
    desc: "Full compliance with global telehealth and health data privacy frameworks. Your symptom queries and summaries are encrypted end-to-end.",
  },
  {
    icon: IdCard,
    tone: "bg-vibrant-blue/10 text-vibrant-blue",
    title: "Board-Certified Doctors Only",
    desc: "Every practitioner on our network undergoes 4-step credential verification, background check, and clinical license revalidation every quarter.",
  },
  {
    icon: History,
    tone: "bg-secondary/10 text-secondary",
    title: "23 Days Free Follow-Up",
    desc: "Consultations do not end at the call. Patients receive 23 days of free direct chat follow-up with their assigned doctor for prescription adjustments.",
  },
];

const trustBar = [
  { icon: Shield, tone: "text-primary", label: "256-Bit SSL Hospital Grade" },
  { icon: ClipboardList, tone: "text-fresh-teal", label: "Electronic Prescription Supported" },
  { icon: BadgeCheck, tone: "text-primary", label: "ISO 27001 Certified Infrastructure" },
  { icon: Smile, tone: "text-fresh-teal", label: "99.2% Patient Satisfaction Rate" },
];

export default async function OnlineDoctorPage() {
  const supabase = await createClient();
  const { data: dbDoctors } = await supabase
    .from("doctors")
    .select(`
      id,
      specialty,
      experience_years,
      consultation_fee,
      image_url,
      profiles!doctors_profile_id_fkey ( full_name ),
      hospitals ( name, city )
    `)
    .order("image_url", { ascending: false, nullsFirst: false })
    .limit(8);

  type DoctorRow = {
    id: string;
    specialty: string | null;
    experience_years: number | null;
    consultation_fee: number | null;
    image_url: string | null;
    profiles: { full_name: string | null } | null;
    hospitals: { name: string | null; city: string | null } | null;
  };

  const doctors: RosterDoctor[] = ((dbDoctors ?? []) as unknown as DoctorRow[]).map((doc) => ({
    id: doc.id,
    name: doc.profiles?.full_name || "Specialist Doctor",
    specialty: doc.specialty || "General Physician",
    experienceYears: doc.experience_years || 5,
    fee: doc.consultation_fee ? `₹${doc.consultation_fee}` : null,
    image: doc.image_url || null,
    hospital: doc.hospitals?.name || null,
    city: doc.hospitals?.city || null,
  }));

  return (
    <div className="w-full bg-indigo-gray-50">
      {/* Hero */}
      <div className="relative isolate w-full overflow-hidden">
        <div aria-hidden className="absolute -top-40 right-10 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[130px] pointer-events-none -z-10" />
        <div aria-hidden className="absolute top-96 -left-32 w-[420px] h-[420px] bg-fresh-teal/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-12 pb-16 lg:pt-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <span className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm tracking-wider uppercase shadow-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
                AI-Powered Telemedicine Redirection &amp; Instant Access
              </span>
              <h1 className="font-display-lg text-4xl md:text-display-lg text-on-surface tracking-tight">
                Online Doctor Consultations with <span className="text-vibrant-blue">Intelligent AI Routing</span>
              </h1>
              <p className="font-body-lg text-base md:text-body-lg text-indigo-gray-600 max-w-2xl">
                Experience next-generation telehealth: Start with our clinical AI triage assistant that analyzes your symptoms, generates a pre-consultation clinical summary, and instantly redirects you to the ideal on-duty board-certified physician.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#triage-simulator"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-vibrant-blue text-on-primary font-title-md text-lg md:text-title-md hover:bg-primary transition-all duration-200 shadow-md hover:shadow-xl hover:scale-[1.02]"
                >
                  Start AI Health Triage Now
                  <ArrowRight className="w-5 h-5" />
                </a>
                <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-surface-container-lowest shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fresh-teal opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-fresh-teal" />
                  </span>
                  <span className="font-label-sm text-label-sm text-indigo-gray-900 font-bold">84 Doctors Online Now</span>
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">· Avg. wait &lt; 3 mins</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-4 text-indigo-gray-600">
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm">
                  <BadgeCheck className="w-4 h-4 text-fresh-teal" /> HIPAA Compliant
                </span>
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm">
                  <Shield className="w-4 h-4 text-fresh-teal" /> Encrypted SBAR Triage
                </span>
                <span className="flex items-center gap-1.5 font-label-sm text-label-sm">
                  <BriefcaseMedical className="w-4 h-4 text-fresh-teal" /> Board-Certified MDs Only
                </span>
              </div>
            </div>

            {/* Redirection hub preview */}
            <div className="lg:col-span-5 mt-6 lg:mt-0">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl flex flex-col gap-5">
                <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-lg gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm font-bold text-on-surface">Redirection Hub</span>
                      <span className="font-label-sm text-label-sm text-fresh-teal flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-fresh-teal" /> Real-time AI Routing
                      </span>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary bg-surface-container px-2.5 py-1 rounded-full whitespace-nowrap">Automated Triage</span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-lg bg-surface-container-low flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">1</span>
                    <div className="flex-1">
                      <p className="font-label-sm text-label-sm font-bold text-on-surface">Symptoms Expressed</p>
                      <p className="font-label-sm text-label-sm text-indigo-gray-600">&quot;Sore throat &amp; fever for 36 hours&quot;</p>
                    </div>
                    <span className="font-label-sm text-label-sm text-fresh-teal font-semibold">Processed</span>
                  </div>
                  <div className="flex justify-center -my-1 text-primary">
                    <ArrowDown className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">2</span>
                    <div className="flex-1">
                      <p className="font-label-sm text-label-sm font-bold text-on-surface">Clinical SBAR Summary Created</p>
                      <p className="font-label-sm text-label-sm text-indigo-gray-600">Risk Level: Moderate · Category: Primary Care</p>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-semibold">Matched</span>
                  </div>
                  <div className="flex justify-center -my-1 text-primary">
                    <ArrowDown className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="p-3.5 rounded-lg bg-surface-container-high flex items-center gap-3 shadow-sm">
                    <img alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" src={assignedDoctorImage} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-sm text-label-sm font-bold text-on-surface truncate">Dr. Ananya Mehta</span>
                        <span className="w-2 h-2 rounded-full bg-fresh-teal shrink-0" />
                      </div>
                      <p className="font-label-sm text-label-sm text-indigo-gray-600 truncate">General Physician · MBBS, MD</p>
                    </div>
                    <span className="font-label-sm text-label-sm font-bold text-vibrant-blue bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
                      Assigned &lt; 2m
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-indigo-gray-600 font-label-sm text-label-sm">
                  <span className="flex items-center gap-1">
                    <Timer className="w-4 h-4 text-fresh-teal" /> Intake time saved: ~12 mins
                  </span>
                  <span className="font-bold text-on-surface">100% Secure Hand-off</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Doctors on duty */}
      <section className="w-full bg-surface-container-low py-16">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
          <OnlineDoctorRoster doctors={doctors} />
        </div>
      </section>

      {/* How AI redirection works */}
      <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-20">
        <div className="flex flex-col gap-4 max-w-3xl mb-12">
          <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-widest">Architected for Clinical Precision</span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">How AI Redirection Works</h2>
          <p className="font-body-md text-body-md text-indigo-gray-600">
            Our proprietary Clinical Routing Engine translates natural language health complaints into structured medical summaries, ensuring you are directed to the exact specialist without waiting rooms or misdirected appointments.
          </p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {routingSteps.map((step) => {
            const Icon = step.icon;
            const FooterIcon = step.footerIcon;
            return (
              <li key={step.step} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between gap-6 hover:shadow-md transition-all">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="font-label-sm text-label-sm text-primary font-bold">{step.step}</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">{step.title}</h3>
                  <p className="font-body-md text-body-md text-indigo-gray-600">{step.desc}</p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-lg font-label-sm text-label-sm text-indigo-gray-600 flex items-center gap-2">
                  <FooterIcon className="w-4 h-4 text-fresh-teal shrink-0" />
                  {step.footer}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Triage simulator */}
      <section id="triage-simulator" className="w-full bg-surface-container-high py-20 scroll-mt-20">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <span className="font-label-sm text-label-sm font-bold text-vibrant-blue uppercase tracking-wider">Live Simulation</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Experience the AI Triage &amp; Redirection Engine</h2>
            <p className="font-body-md text-body-md text-indigo-gray-600">
              Try a demo interaction below to witness how our triage chatbot distills your inputs and hands you off seamlessly to an authorized doctor.
            </p>
          </div>
          <TriageSimulator />
        </div>
      </section>

      {/* Trust & quality assurance */}
      <section className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-20">
        <div className="bg-surface-container rounded-2xl p-8 lg:p-12 shadow-sm flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
            <span className="font-label-sm text-label-sm font-bold text-primary uppercase tracking-widest">Medical Governance &amp; Integrity</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Clinical Trust &amp; Quality Assurance</h2>
            <p className="font-body-md text-body-md text-indigo-gray-600">
              Our AI routing strictly operates within legal healthcare boundaries, verified against international standards before dispatching patient data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {assurances.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${item.tone}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">{item.title}</h3>
                  <p className="font-body-md text-body-md text-indigo-gray-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="pt-4 flex flex-wrap items-center justify-around gap-6 text-indigo-gray-600 font-label-sm text-label-sm opacity-80">
            {trustBar.map(({ icon: Icon, tone, label }) => (
              <span key={label} className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${tone}`} /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final conversion banner */}
      <section className="w-full bg-gradient-to-r from-primary to-vibrant-blue text-on-primary py-12">
        <div className="w-full max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg">Need medical advice right now?</h2>
            <p className="font-body-md text-body-md text-on-primary/80">Skip traditional clinic queues. Complete AI assessment and connect in under 5 minutes.</p>
          </div>
          <a
            href="#triage-simulator"
            className="px-8 py-3.5 rounded-full bg-surface-container-lowest text-primary font-title-md text-lg md:text-title-md hover:bg-surface-container transition-all shadow-lg hover:scale-105 whitespace-nowrap"
          >
            Start Free Triage
          </a>
        </div>
      </section>
    </div>
  );
}
