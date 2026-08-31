import { Header } from '@/components/Header'
import { 
  Users, Brain, Stethoscope, Microscope, Building2, RefreshCw, 
  Database, Plug, ShieldCheck, Lock, Eye, Key, FileCheck, 
  Sparkles, Heart, Network, Scale, Globe, Accessibility,
  UserCircle, Briefcase, Hospital, FlaskConical, Handshake,
  ArrowRight, ChevronRight, Layers, Activity, ActivitySquare,
  MessageSquare, Stethoscope as StethoscopeIcon, Calendar, ArrowDown
} from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'About Us | Consult Your Doctor',
  description: 'Consult Your Doctor is a multi-market healthcare platform building intelligent, human-centric, and connected healthcare technology infrastructure.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-[#E31E24]/20">
      <Header />

      <main className="flex-1">
        
        {/* NEW HERO SECTION */}
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
          
          <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-[#E31E24] font-semibold text-sm tracking-wide uppercase mb-8 shadow-sm ring-1 ring-red-100">
              <Heart className="w-4 h-4" />
              Consult Your Doctor
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
              Healthcare doesn't end <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E31E24] to-red-500">when the consultation ends.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-light mb-8">
              Consult Your Doctor, a healthcare technology company under Zebrold International Holdings Limited, is building a new layer of healthcare focused on what happens <strong>after</strong> the doctor-patient consultation.
            </p>
            <p className="text-lg text-slate-500 max-w-4xl mx-auto leading-relaxed font-light">
              A medical consultation may last only a few minutes, but the patient's healthcare journey continues long after the call, appointment, diagnosis, prescription, or clinical discussion has ended. Patients may still have questions, need investigations, forget instructions, or need help understanding what to do next. Our platform bridges this gap.
            </p>
          </div>
        </section>

        {/* VISION & PROBLEM */}
        <section className="py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            <div className="grid md:grid-cols-2 gap-16">
              <div>
                <h3 className="text-[#E31E24] font-bold tracking-wide uppercase text-sm mb-4">Our Vision</h3>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">From Consultation to Continuity.</h2>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Our vision is to build a healthcare ecosystem where patients are not left alone after meeting their doctor. Consult Your Doctor aims to make healthcare more connected, accessible, responsive and continuous by creating a structured digital layer between the consultation and the patient's next healthcare decision. 
                  <br /><br />
                  We believe the future of healthcare is not simply about making doctors available online. It is about creating a system that helps patients understand, follow, monitor and continue their healthcare journey responsibly.
                </p>
              </div>
              <div>
                <h3 className="text-[#E31E24] font-bold tracking-wide uppercase text-sm mb-4">The Problem We Are Solving</h3>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">The Fragmented Journey.</h2>
                <p className="text-slate-600 leading-relaxed text-lg mb-6">
                  Healthcare systems are increasingly becoming digital, but one important part of the patient journey remains fragmented: <em>What happens after the consultation?</em>
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    'A diagnosis or clinical assessment',
                    'Medication instructions',
                    'Recommended laboratory investigations',
                    'Imaging or diagnostic requirements',
                    'Follow-up requirements',
                    'Questions that arise later',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-slate-600 leading-relaxed">
                  Traditional healthcare systems often depend heavily on patients remembering and coordinating these activities themselves. This creates a gap between medical consultation and continued patient support. We are developing our platform to address this gap.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT IS CONSULT YOUR DOCTOR - 5 PRINCIPLES */}
        <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[100px]" />
          <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10">
            <div className="text-center mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">What is Consult Your Doctor?</h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                A digital healthcare and post-consultation support platform designed to connect patients, doctors, diagnostic services, hospitals and intelligent digital systems through one coordinated healthcare journey. The platform is designed around five fundamental principles:
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-6">
              {[
                { name: 'Consult', desc: 'Connect patients with appropriate healthcare professionals and consultation services.' },
                { name: 'Understand', desc: 'Help patients understand information and instructions provided during their journey.' },
                { name: 'Assess', desc: 'Use structured digital assessments and AI systems to help organize patient information.' },
                { name: 'Follow Up', desc: 'Create structured post-consultation pathways for investigations, appointments, reminders and continuing care.' },
                { name: 'Connect', desc: 'Connect patients with the appropriate healthcare provider when further professional attention is required.' },
              ].map((item, i) => (
                <div key={item.name} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex flex-col">
                  <div className="w-10 h-10 rounded-full bg-[#E31E24]/20 flex items-center justify-center text-[#E31E24] font-black text-xl mb-4">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI LAYER & COMMUNICATION */}
        <section className="py-24 bg-white">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            
            <div className="grid lg:grid-cols-2 gap-16 mb-24">
              <div>
                <h3 className="text-[#E31E24] font-bold tracking-wide uppercase text-sm mb-4">Core Component</h3>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Our AI-Assisted Healthcare Layer</h2>
                <p className="text-slate-600 leading-relaxed text-lg mb-6">
                  One of the core components is our AI-integrated healthcare assistance layer. The system interacts with patients after their consultation, collects relevant information, organizes responses and assists with appropriate next-step guidance.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Depending on the service and regulatory framework applicable in each market, the platform can support:
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    'AI-assisted questionnaires', 'Structured wellness assessments',
                    'Post-consultation follow-ups', 'Patient instruction reminders',
                    'Investigation guidance', 'Follow-up scheduling',
                    'Information organization', 'Automated communication'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="p-5 bg-slate-50 border-l-4 border-slate-300 italic text-slate-600 text-sm">
                  AI is not positioned as a replacement for the doctor. Instead, our approach is to use technology as a support layer around professional healthcare. Clinical decisions remain within the appropriate professional framework.
                </div>
              </div>

              <div>
                <h3 className="text-[#E31E24] font-bold tracking-wide uppercase text-sm mb-4">Communication</h3>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">AI-Assisted Patient Communication</h2>
                <p className="text-slate-600 leading-relaxed text-lg mb-6">
                  Patients frequently have questions after leaving a consultation. Instead of forcing patients to navigate complicated healthcare systems for every basic follow-up interaction, Consult Your Doctor is designed to provide an intelligent digital communication layer.
                </p>
                <div className="space-y-4">
                  <p className="text-slate-700 font-medium">The system can help patients:</p>
                  <ul className="space-y-3">
                    {[
                      'Understand their next steps & review information',
                      'Respond to structured follow-up questions & receive reminders',
                      'Prepare information for their next consultation',
                      'Navigate available healthcare services',
                      'Request appropriate follow-up support',
                      'Escalate relevant situations to healthcare professionals',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#E31E24] shrink-0" />
                        <span className="text-slate-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-lg font-bold text-slate-900">
                    The objective is simple: Make the patient's next healthcare decision easier to navigate.
                  </p>
                </div>
              </div>
            </div>

            {/* FLOW CHART SECTION */}
            <div className="bg-slate-50 rounded-3xl p-10 md:p-16 text-center border border-slate-100">
              <h3 className="text-[#E31E24] font-bold tracking-wide uppercase text-sm mb-4">Post-Consultation Intelligence</h3>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">The Continuous Journey</h2>
              <p className="text-slate-600 leading-relaxed max-w-2xl mx-auto mb-16">
                The consultation is only the beginning. After a patient completes a consultation, the platform can create a structured digital pathway based on the information and instructions available.
              </p>

              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-2 md:gap-4 text-sm font-semibold text-slate-700">
                  {[
                    'Doctor Consultation',
                    'Clinical Instructions',
                    'AI-Assisted Follow-Up',
                    'Required Investigations',
                    'Healthcare Navigation',
                    'Patient Updates',
                    'Follow-Up Consultation',
                    'Continuing Care',
                  ].map((step, idx, arr) => (
                    <div key={step} className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                      <div className={`px-5 py-3 rounded-xl border ${idx === 0 || idx === arr.length - 1 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 shadow-sm'}`}>
                        {step}
                      </div>
                      {idx < arr.length - 1 && (
                        <>
                          <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block" />
                          <ArrowDown className="w-5 h-5 text-slate-300 block md:hidden my-1" />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* PARTNERSHIPS & STAKEHOLDERS */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                Healthcare Ecosystem
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                We are designed to work alongside existing healthcare providers rather than replace them. Through partnerships, healthcare organizations can extend their patient relationship beyond the consultation itself.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-16">
              {/* For Hospitals */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <Building2 className="w-10 h-10 text-rose-500 mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 mb-4">For Hospitals</h3>
                <p className="text-slate-600 mb-6">Hospitals can use the ecosystem to strengthen their post-consultation patient engagement.</p>
                <ul className="space-y-4 text-sm text-slate-600">
                  <li><strong>Patient Follow-Up:</strong> Structured digital follow-up after consultations and procedures.</li>
                  <li><strong>Appointment Continuity:</strong> Helping patients navigate their next appointment.</li>
                  <li><strong>Investigation Coordination:</strong> Connecting recommended investigations with appropriate services.</li>
                  <li><strong>Operational Efficiency:</strong> Reducing unnecessary administrative friction through digital workflows.</li>
                </ul>
              </div>

              {/* For Doctors */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <StethoscopeIcon className="w-10 h-10 text-emerald-500 mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 mb-4">For Doctors</h3>
                <p className="text-slate-600 mb-6">Provide healthcare professionals with a digital extension of the patient relationship.</p>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-slate-300" />Structured patient follow-up</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-slate-300" />Better-organized patient information</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-slate-300" />Automated administrative communication</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-slate-300" />Digital appointment coordination</li>
                </ul>
                <p className="mt-4 text-sm font-medium text-slate-800">The objective is not to increase workload, but to build technology around the doctor so they can focus on healthcare.</p>
              </div>

              {/* For Patients */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <UserCircle className="w-10 h-10 text-blue-500 mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 mb-4">For Patients</h3>
                <p className="text-slate-600 mb-6">Patients remain at the centre of the platform. We aim to provide:</p>
                <ul className="space-y-4 text-sm text-slate-600">
                  <li><strong>Accessibility:</strong> Access to healthcare pathways beyond traditional working hours and physical locations.</li>
                  <li><strong>Continuity:</strong> A structured journey after the consultation.</li>
                  <li><strong>Clarity:</strong> Better organization of healthcare information and next steps.</li>
                  <li><strong>Connection:</strong> A bridge between patients and healthcare professionals.</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Testing & Diagnostic Connectivity</h3>
              <p className="text-slate-600 max-w-4xl mx-auto">
                A major component of the platform is the connection between consultation, investigation and follow-up care. When a professional recommends laboratory testing or imaging, the platform helps create a structured pathway: 
                <strong> Consultation &rarr; Recommended Investigation &rarr; Booking &rarr; Result Availability &rarr; Follow-Up &rarr; Doctor Review.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* FROM GERMANY TO ASIA */}
        <section className="py-24 bg-white border-t border-slate-100">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h3 className="text-[#E31E24] font-bold tracking-wide uppercase text-sm mb-4">Global Reach</h3>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">From Germany to Asia</h2>
                <p className="text-slate-600 leading-relaxed text-lg mb-6">
                  Consult Your Doctor is being developed with a strong foundation in Germany, with a long-term ambition to expand across Asian healthcare markets. Germany provides an important environment for developing a healthcare technology model built around structured healthcare delivery, data protection, professional standards and responsible digital innovation.
                </p>
                <p className="text-slate-600 leading-relaxed text-lg mb-6">
                  Our expansion strategy is designed to recognize that healthcare cannot simply be copied from one country to another. Every market has its own infrastructure, regulations, language, patient behaviour, and clinical workflows.
                </p>
                <p className="font-bold text-slate-900 text-lg border-l-4 border-[#E31E24] pl-4">
                  Therefore, our international strategy is based on local adaptation with a common technological foundation.
                </p>
              </div>
              
              <div className="bg-slate-50 p-10 rounded-3xl border border-slate-100">
                <Globe className="w-12 h-12 text-slate-800 mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Asian Expansion Vision</h3>
                <p className="text-slate-600 mb-6">
                  Asia represents one of the world's most diverse and rapidly developing healthcare environments. WHO's South-East Asia Region identifies digital health and AI as important tools for strengthening healthcare systems. We aim to build a scalable model capable of adapting to these environments.
                </p>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Expansion Markets include:</p>
                <div className="flex flex-wrap gap-2">
                  {['India', 'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'Bangladesh', 'Sri Lanka', 'Nepal'].map(country => (
                    <span key={country} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700">
                      {country}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE CORE PLATFORM (PREVIOUS OLD CONTENT RE-INTEGRATED) */}
        <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10">
            <div className="mb-16 text-center">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                The Platform Architecture
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Our technology evolves around interconnected layers designed for scale and adaptability.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Users, name: 'Patient Layer', desc: 'Digital patient interaction and healthcare navigation.', color: 'text-blue-400' },
                { icon: Brain, name: 'AI Layer', desc: 'Intelligent assistance, structured assessments and communication.', color: 'text-purple-400' },
                { icon: Stethoscope, name: 'Clinical Layer', desc: 'Doctors, specialists and healthcare professionals.', color: 'text-emerald-400' },
                { icon: Microscope, name: 'Diagnostic Layer', desc: 'Laboratory and diagnostic service connectivity.', color: 'text-amber-400' },
                { icon: Building2, name: 'Hospital Layer', desc: 'Hospital and clinic integration.', color: 'text-rose-400' },
                { icon: RefreshCw, name: 'Follow-Up Layer', desc: 'Post-consultation workflows and continuing care.', color: 'text-teal-400' },
                { icon: Database, name: 'Data Layer', desc: 'Secure and appropriately governed healthcare information.', color: 'text-indigo-400' },
                { icon: Plug, name: 'Integration Layer', desc: 'Connections with healthcare systems and partner organizations.', color: 'text-cyan-400' },
              ].map((layer) => {
                const Icon = layer.icon
                return (
                  <div key={layer.name} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                    <Icon className={`w-8 h-8 ${layer.color} mb-4`} />
                    <h3 className="text-lg font-bold mb-2">{layer.name}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{layer.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* DATA PRIVACY & TRUST */}
        <section className="py-24 bg-white">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center">
            <h3 className="text-[#E31E24] font-bold tracking-wide uppercase text-sm mb-4">Foundation</h3>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8">Data Privacy & Trust</h2>
            <p className="text-slate-600 text-lg leading-relaxed max-w-3xl mx-auto mb-16">
              Healthcare information is highly sensitive. Trust is at the centre of our platform philosophy. Our technology strategy is designed around these core principles:
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              {[
                'Privacy by design',
                'Appropriate data governance',
                'Secure information handling',
                'Access controls',
                'Consent-based information sharing',
                'Responsible AI practices',
                'Interoperability',
                'Regulatory compliance',
                'Transparent patient communication',
              ].map((item, i) => (
                <div key={i} className="px-5 py-3 bg-slate-50 border border-slate-200 rounded-full text-slate-700 font-medium shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
