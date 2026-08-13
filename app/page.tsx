import { Header } from '@/components/Header'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Heart, Brain, Bone, Stethoscope, Baby, UserCircle, Eye, Activity,
  Search, ShieldCheck, CreditCard, Building2, UserPlus, UserCheck, Calendar,
  FileText, Clock, FileDigit, PhoneCall, CheckCircle2, MapPin, Search as SearchIcon,
  ChevronRight, Star, Headset
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      {/* Hero Section */}
      <section className="relative w-full bg-[#f8f9fa] border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12 md:py-20 flex flex-col lg:flex-row items-center gap-12">
          {/* Left Text */}
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Healthcare <br /> Made Simple <br />
              <span className="text-[#E31E24]">Consult Your Doctor</span>
            </h1>
            <h2 className="text-xl font-semibold text-gray-800">Your Personal Healthcare Concierge</h2>
            <p className="text-gray-600 max-w-lg">
              Book appointments with trusted hospitals and specialists, pay securely online, and receive dedicated executive assistance throughout your healthcare journey.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button className="px-6 py-3 bg-[#E31E24] text-white font-semibold hover:bg-red-700 transition-colors rounded-full cursor-pointer">
                Book Appointment
              </button>
              <button className="px-6 py-3 bg-white text-gray-800 border border-gray-300 font-semibold hover:bg-gray-50 transition-colors rounded-full cursor-pointer">
                Find a Doctor
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-gray-200 mt-8">
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <UserCheck className="w-5 h-5" /> 500+
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Doctors</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <Building2 className="w-5 h-5" /> 100+
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Partner Hospitals</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <Heart className="w-5 h-5" /> 1 Lakh+
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Happy Patients</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#E31E24] font-bold text-xl">
                  <PhoneCall className="w-5 h-5" /> 24/7
                </div>
                <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Executive Support</div>
              </div>
            </div>
          </div>

          {/* Right Card */}
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 p-6 relative z-10">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Book Consultation</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Speciality</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-[#E31E24] bg-white">
                    <option>Select Speciality</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Doctor</label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-[#E31E24] bg-white">
                    <option>Select Doctor</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Hospital</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-[#E31E24] bg-white">
                    <option>Select Hospital</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-[#E31E24] bg-white">
                    <option>Select Location</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Preferred Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="date" className="w-full pl-10 pr-2 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-[#E31E24] text-gray-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Preferred Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="time" className="w-full pl-10 pr-2 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:border-[#E31E24] text-gray-600" />
                  </div>
                </div>
              </div>
              <button type="button" className="w-full py-3 mt-4 bg-[#E31E24] text-white font-bold hover:bg-red-700 transition-colors rounded-full cursor-pointer">
                Book Now
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex flex-wrap justify-between gap-6 text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#E31E24]" /> Trusted Healthcare Platform</div>
          <div className="flex items-center gap-2"><PhoneCall className="w-5 h-5 text-[#E31E24]" /> 24/7 Executive Support</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#E31E24]" /> Verified Doctors</div>
          <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#E31E24]" /> Secure Payments</div>
          <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-[#E31E24]" /> NABH Partner Hospitals</div>
          <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-[#E31E24]" /> End-to-End Guidance</div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 mb-6 border-b border-gray-200 pb-4 text-sm font-semibold text-gray-500">
            <button className="text-[#E31E24] border-b-2 border-[#E31E24] pb-4 -mb-[18px] flex items-center gap-2 rounded-full cursor-pointer"><SearchIcon className="w-4 h-4"/> Search Doctor</button>
            <button className="hover:text-[#E31E24] transition-colors flex items-center gap-2 rounded-full cursor-pointer"><Building2 className="w-4 h-4"/> Search Hospital</button>
            <button className="hover:text-[#E31E24] transition-colors flex items-center gap-2 rounded-full cursor-pointer"><Stethoscope className="w-4 h-4"/> Search by Speciality</button>
            <button className="hover:text-[#E31E24] transition-colors flex items-center gap-2 rounded-full cursor-pointer"><Activity className="w-4 h-4"/> Search by Symptoms</button>
            <button className="hover:text-[#E31E24] transition-colors flex items-center gap-2 rounded-full cursor-pointer"><MapPin className="w-4 h-4"/> Search by City</button>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search by doctor name, speciality or keyword..." className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24]" />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Enter city or location" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-[#E31E24]" />
            </div>
            <button className="px-8 py-3 bg-[#E31E24] text-white font-bold hover:bg-red-700 transition-colors rounded-full cursor-pointer">Search</button>
          </div>
        </div>
      </section>

      {/* Popular Specialities */}
      <section className="bg-gray-50 py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Popular Specialities</h2>
            <Link href="#" className="text-[#E31E24] text-sm font-semibold flex items-center">View All Specialities <ChevronRight className="w-4 h-4 ml-1"/></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { icon: Heart, label: 'Cardiology' },
              { icon: Brain, label: 'Neurology' },
              { icon: Bone, label: 'Orthopaedics' },
              { icon: Stethoscope, label: 'General Medicine' },
              { icon: Baby, label: 'Pediatrics' },
              { icon: UserCircle, label: "Women's Health" },
              { icon: Eye, label: 'Ophthalmology' },
              { icon: Activity, label: 'Dental' },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-4 hover:shadow-md transition-shadow cursor-pointer hover:border-[#E31E24] group">
                <item.icon className="w-10 h-10 text-[#E31E24] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-gray-700 text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-12">How Consult Your Doctor Works</h2>
          <div className="flex flex-wrap justify-center items-center gap-4 lg:gap-8">
            {[
              { icon: UserPlus, label: 'Register / Login' },
              { icon: SearchIcon, label: 'Search Hospital\nor Doctor' },
              { icon: UserCheck, label: 'Choose Doctor\n& Hospital' },
              { icon: Calendar, label: 'Select Date\n& Time Slot' },
              { icon: CreditCard, label: 'Pay Advance\nSecurely' },
              { icon: PhoneCall, label: 'Executive\nAssigned' },
              { icon: Building2, label: 'Hospital Visit\n& Guidance' },
              { icon: Stethoscope, label: 'Consultation\nwith Doctor' },
              { icon: FileText, label: 'Reports &\nFollow-up' },
            ].map((item, i, arr) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center max-w-[100px]">
                  <div className="w-16 h-16 rounded-full bg-red-50 text-[#E31E24] flex items-center justify-center mb-3">
                    <item.icon className="w-8 h-8" strokeWidth={1.5} />
                  </div>
                  <div className="text-xs font-bold text-gray-900 mb-1">{i + 1}</div>
                  <div className="text-[10px] font-semibold text-gray-600 whitespace-pre-line leading-snug">{item.label}</div>
                </div>
                {i < arr.length - 1 && <ChevronRight className="w-5 h-5 text-gray-300 ml-4 lg:ml-8 -mt-8 hidden md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="bg-gray-50 py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-12">Why Choose Consult Your Doctor?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: PhoneCall, title: 'Executive Assistance', desc: 'A dedicated executive supports you from booking to hospital visit.' },
              { icon: Building2, title: 'Verified Hospitals', desc: 'Partner with trusted multi-specialty hospitals across India.' },
              { icon: CreditCard, title: 'Secure Payment', desc: 'Encrypted payments with multiple safe options.' },
              { icon: Clock, title: 'Priority Appointment', desc: 'Get quicker access to specialists with priority scheduling.' },
              { icon: FileDigit, title: 'Digital Medical Records', desc: 'Store prescriptions and reports securely in your digital locker.' },
              { icon: Headset, title: '24/7 Support', desc: 'Dedicated support whenever you need us.' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 text-left flex gap-4 hover:shadow-md transition-shadow">
                <div className="shrink-0 mt-1">
                  <item.icon className="w-8 h-8 text-[#E31E24]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Hospitals */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Featured Hospitals</h2>
            <Link href="#" className="text-[#E31E24] text-sm font-semibold flex items-center">View All Hospitals <ChevronRight className="w-4 h-4 ml-1"/></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {['Apollo Hospitals', 'Fortis Hospitals', 'Max Healthcare', 'Medanta', 'Manipal Hospitals'].map((name, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <div className="h-32 bg-gray-200 w-full relative">
                  {/* Placeholder for hospital image */}
                  <div className="absolute bottom-2 right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> 4.{5 - (i % 3)}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 mb-1">{name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{['Hyderabad', 'Bangalore', 'New Delhi', 'Gurugram', 'Bangalore'][i]}</p>
                  <p className="text-xs font-medium text-gray-600 mb-4">{15 + (i * 5)}+ Specialities</p>
                  <button className="mt-auto w-full py-2 border border-[#E31E24] text-[#E31E24] text-sm font-semibold hover:bg-red-50 transition-colors rounded-full cursor-pointer">
                    Book Appointment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Doctors */}
      <section className="bg-gray-50 py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Top Doctors</h2>
            <Link href="#" className="text-[#E31E24] text-sm font-semibold flex items-center">View All Doctors <ChevronRight className="w-4 h-4 ml-1"/></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {name: 'Dr. Rohit Sharma', spec: 'Cardiologist', hosp: 'Apollo Hospitals, Delhi', exp: '15+', fee: '1000'},
              {name: 'Dr. Neha Verma', spec: 'Neurologist', hosp: 'Fortis Hospitals, Bangalore', exp: '12+', fee: '800'},
              {name: 'Dr. Arvind Iyer', spec: 'Orthopaedic Surgeon', hosp: 'Max Healthcare, Delhi', exp: '18+', fee: '1100'},
              {name: 'Dr. Anjali Mehta', spec: 'Gynecologist', hosp: 'Kokilaben Hospital, Mumbai', exp: '10+', fee: '900'}
            ].map((doc, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow">
                <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden shrink-0"></div>
                <div className="flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 text-sm mb-0.5">{doc.name}</h3>
                  <p className="text-[10px] text-gray-500 mb-0.5">{doc.spec}</p>
                  <p className="text-[10px] text-gray-500 mb-2">{doc.hosp}</p>
                  <p className="text-[10px] font-medium text-gray-700 mb-0.5"><span className="text-[#E31E24]">{doc.exp}</span> Years Exp.</p>
                  <p className="text-[10px] font-medium text-gray-700 mb-3"><span className="text-[#E31E24]">₹{doc.fee}</span> Consultation Fee</p>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-[10px] text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Available Today</span>
                    <button className="px-4 py-1.5 bg-[#E31E24] text-white text-xs font-semibold hover:bg-red-700 transition-colors rounded-full cursor-pointer">Book</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Health Check Packages */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Health Check Packages</h2>
            <Link href="#" className="text-[#E31E24] text-sm font-semibold flex items-center">View All Packages <ChevronRight className="w-4 h-4 ml-1"/></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {['Executive Health Check', "Women's Wellness", 'Senior Citizen Package', 'Heart Package', 'Full Body Checkup'].map((pkg, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <div className="h-32 bg-gray-200 w-full"></div>
                <div className="p-4 flex flex-col flex-1 text-center items-center">
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{pkg}</h3>
                  <p className="text-lg font-bold text-gray-900 mb-4">₹{(i+2)*1000}</p>
                  <button className="mt-auto w-full py-2 bg-[#E31E24] text-white text-sm font-semibold hover:bg-red-700 transition-colors rounded-full cursor-pointer">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="bg-[#1a2b3c] text-white mt-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#E31E24] rounded-full flex items-center justify-center text-white font-bold text-xl">C</div>
              <span className="text-xl font-bold">Consult your Doctor</span>
            </div>
            <p className="text-xs text-gray-400 mb-6 max-w-xs leading-relaxed">
              Your personal healthcare concierge. We connect patients with top doctors, hospitals and executives with complete support.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-sm">Company</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Press & Media</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-sm">For Patients</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">Find Doctors</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Find Hospitals</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Health Check Packages</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Diagnostics</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Medical Tourism</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-sm">Contact Us</h4>
            <ul className="space-y-3 text-xs text-gray-400">
              <li className="flex items-center gap-2"><PhoneCall className="w-4 h-4"/> +91 12345 67890</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4"/> support@consultyourdoctor.com</li>
              <li className="flex gap-2">
                <Building2 className="w-4 h-4 shrink-0"/> 
                <span>123, Healthcare Avenue,<br/>Hyderabad, Telangana - 500001</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-xs text-gray-500">
          © 2026 Consult Your Doctor. All Rights Reserved.
        </div>
      </div>
    </footer>
  )
}
