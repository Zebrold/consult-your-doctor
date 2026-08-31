import { Header } from '@/components/Header'
import { Search, Clock, Shield, Activity, Zap, Heart, Brain, Eye, Bone, Microscope, Waves, ScanLine, Droplets, Baby, ChevronRight, ActivitySquare } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Diagnostics | Consult Your Doctor',
  description: 'Comprehensive diagnostic services including X-Ray, CT Scan, MRI, Ultrasound, Blood Tests and more. Book your diagnostic test today.',
}

const diagnosticServices = [
  {
    id: 'xray',
    name: 'X-Ray',
    description: 'Digital radiography for bones, chest, and joints. Quick and painless imaging to detect fractures, infections, and abnormalities.',
    icon: Bone,
    priceRange: '₹300 – ₹1,500',
    duration: '10–15 min',
    preparation: 'No special preparation needed. Remove metal objects and jewelry before the scan.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    id: 'ct-scan',
    name: 'CT Scan',
    description: 'Advanced computed tomography for detailed cross-sectional images of internal organs, bones, soft tissue, and blood vessels.',
    icon: ScanLine,
    priceRange: '₹2,000 – ₹8,000',
    duration: '15–30 min',
    preparation: 'You may need to fast for 4–6 hours before the scan. Inform your doctor about any allergies.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
  {
    id: 'mri',
    name: 'MRI Scan',
    description: 'Magnetic resonance imaging for highly detailed images of the brain, spine, joints, and soft tissues without radiation.',
    icon: Brain,
    priceRange: '₹4,000 – ₹15,000',
    duration: '30–60 min',
    preparation: 'Remove all metal objects. Inform staff of any implants, pacemakers, or claustrophobia.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
  {
    id: 'ultrasound',
    name: 'Ultrasound',
    description: 'Non-invasive imaging using sound waves to examine organs like liver, kidney, thyroid, and monitor pregnancies.',
    icon: Waves,
    priceRange: '₹800 – ₹3,000',
    duration: '15–30 min',
    preparation: 'For abdominal ultrasound, fast for 6–8 hours. For pelvic scan, drink plenty of water beforehand.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
  },
  {
    id: 'blood-test',
    name: 'Blood Tests',
    description: 'Complete blood count (CBC), lipid profile, liver function, kidney function, thyroid panel, and more comprehensive panels.',
    icon: Droplets,
    priceRange: '₹200 – ₹3,500',
    duration: '5–10 min',
    preparation: 'Fasting for 10–12 hours may be required for certain tests like lipid profile and blood sugar.',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  {
    id: 'ecg',
    name: 'ECG / EKG',
    description: 'Electrocardiogram to record the electrical activity of the heart and detect arrhythmias, heart attacks, and other conditions.',
    icon: Heart,
    priceRange: '₹300 – ₹800',
    duration: '5–10 min',
    preparation: 'No special preparation needed. Avoid caffeine and exercise 2 hours before the test.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
  {
    id: 'echo',
    name: 'Echocardiogram',
    description: 'Ultrasound of the heart to evaluate heart valve function, chamber size, pumping strength, and detect structural abnormalities.',
    icon: Activity,
    priceRange: '₹1,500 – ₹4,000',
    duration: '20–40 min',
    preparation: 'No special preparation required. Wear comfortable, loose-fitting clothing.',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
  },
  {
    id: 'eeg',
    name: 'EEG',
    description: 'Electroencephalogram to measure brain wave patterns and diagnose epilepsy, sleep disorders, and other neurological conditions.',
    icon: Zap,
    priceRange: '₹1,500 – ₹3,500',
    duration: '30–60 min',
    preparation: 'Wash hair and avoid styling products. Your doctor may ask you to reduce sleep the night before.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    id: 'eye-test',
    name: 'Eye Examination',
    description: 'Comprehensive vision testing including visual acuity, retinal examination, intraocular pressure, and screening for glaucoma and cataracts.',
    icon: Eye,
    priceRange: '₹500 – ₹2,000',
    duration: '20–30 min',
    preparation: 'Bring your current glasses or contact lenses. Pupils may be dilated — arrange transportation.',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
  },
  {
    id: 'pathology',
    name: 'Pathology / Biopsy',
    description: 'Microscopic examination of tissue samples to diagnose diseases, including cancer screening, infections, and inflammatory conditions.',
    icon: Microscope,
    priceRange: '₹1,000 – ₹5,000',
    duration: 'Results in 3–7 days',
    preparation: 'Follow specific instructions from your doctor based on the type of biopsy being performed.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    id: 'dexa',
    name: 'DEXA Scan',
    description: 'Dual-energy X-ray absorptiometry to measure bone mineral density and assess risk of osteoporosis and fractures.',
    icon: Shield,
    priceRange: '₹1,500 – ₹3,500',
    duration: '15–20 min',
    preparation: 'Avoid calcium supplements 24 hours before. Wear comfortable clothing without metal zippers or buttons.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
  {
    id: 'prenatal',
    name: 'Prenatal Screening',
    description: 'Comprehensive screening tests during pregnancy including NT scan, anomaly scan, growth scan, and non-stress tests for fetal monitoring.',
    icon: Baby,
    priceRange: '₹1,000 – ₹5,000',
    duration: '20–45 min',
    preparation: 'Follow your obstetrician\'s instructions. Some scans may require a full bladder.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
]

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-[#E31E24]/20">
      <Header />

      <main className="flex-1">
        
        {/* HERO SECTION */}
        <section className="relative pt-24 pb-32 md:pt-32 md:pb-40 overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
          
          <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-[#E31E24] font-semibold text-sm tracking-wide uppercase mb-8 shadow-sm ring-1 ring-red-100">
              <ActivitySquare className="w-4 h-4" />
              Comprehensive Diagnostics
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
              Precision testing, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E31E24] to-red-500">crystal clear results.</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-light">
              State-of-the-art diagnostic tests with accurate results, fast turnaround times, and expert interpretation by qualified radiologists and pathologists.
            </p>
          </div>
        </section>

        {/* SERVICES GRID */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            <div className="text-center mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                Our Services
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Choose from a wide range of diagnostic tests. All performed with cutting-edge equipment and interpreted by expert specialists.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {diagnosticServices.map((service) => {
                const Icon = service.icon
                return (
                  <div key={service.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 group flex flex-col h-full">
                    
                    <div className="flex items-start justify-between mb-8">
                      <div className={`w-14 h-14 ${service.bg} rounded-2xl flex items-center justify-center shrink-0 border ${service.border} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-7 h-7 ${service.color}`} />
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 text-xs font-bold rounded-full border border-slate-200`}>
                          <Clock className="w-3.5 h-3.5" />
                          {service.duration}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">{service.name}</h3>
                      <p className="text-slate-600 leading-relaxed text-sm mb-6">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-auto space-y-6">
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preparation</p>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{service.preparation}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Cost</p>
                          <p className={`font-black text-lg ${service.color}`}>{service.priceRange}</p>
                        </div>
                        <Link
                          href="/#book-consultation-form"
                          className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 hover:bg-[#E31E24] hover:text-white hover:border-[#E31E24] transition-colors group/btn"
                        >
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover/btn:text-white transition-colors" />
                        </Link>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 bg-white text-center">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-16">
              How It Works
            </h2>
            
            <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto relative">
              <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-slate-200" />
              
              {[
                { step: '01', title: 'Choose Test', desc: 'Select the diagnostic test you need.' },
                { step: '02', title: 'Book Slot', desc: 'Pick a convenient date and location.' },
                { step: '03', title: 'Get Tested', desc: 'Visit the hospital for your test.' },
                { step: '04', title: 'Get Reports', desc: 'Receive accurate digital reports.' },
              ].map((item, idx) => (
                <div key={idx} className="relative z-10">
                  <div className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-xl font-black text-slate-900 mx-auto mb-6 shadow-sm">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            <div className="bg-slate-900 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[400px] h-[400px] bg-red-500/20 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[80px]" />
              
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
                  Need help choosing the right test?
                </h2>
                <p className="text-xl text-slate-400 leading-relaxed mb-10">
                  Our medical experts can guide you to the right diagnostic tests based on your symptoms and medical history.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/#book-consultation-form"
                    className="inline-flex items-center justify-center px-8 py-4 bg-[#E31E24] text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                  >
                    Book a Consultation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
