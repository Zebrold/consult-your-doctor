"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ShieldPlus, Award, MonitorSmartphone, ChevronDown, Search, Calendar, Clock, User, Building2, BriefcaseMedical, MapPin, Stethoscope, Info, Star, ClipboardList, ChevronRight, Heart, Brain, Bone, Baby, Sparkles, ChevronLeft } from "lucide-react";

export default function Home() {
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.15,
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll(".reveal-up, .reveal-fade").forEach((el) => {
      observer.observe(el);
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="px-margin-x-desktop py-16 md:py-28 max-w-container-max mx-auto overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 reveal-up">
            <h1 className="font-display-lg text-display-lg text-on-surface leading-tight">
              World-Class Healthcare, <br />{" "}
              <span className="text-vibrant-blue">Delivered Quietly.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
              Experience a new standard of medical consultation. Connect with top-tier specialists, book instantly, and manage your health journey with unparalleled precision.
            </p>
            <div className="pt-6 space-y-6">
              <h3 className="font-title-md text-title-md text-primary">Uncompromising Standards of Care</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <ShieldPlus className="text-vibrant-blue mt-1 w-5 h-5" />
                  <div>
                    <p className="font-title-md text-base text-on-surface font-semibold">Personalized Care Plans</p>
                    <p className="font-body-md text-sm text-on-surface-variant">Tailored healthcare strategies designed specifically for your unique medical history and lifestyle.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Award className="text-vibrant-blue mt-1 w-5 h-5" />
                  <div>
                    <p className="font-title-md text-base text-on-surface font-semibold">Top 1% Global Specialists</p>
                    <p className="font-body-md text-sm text-on-surface-variant">Access a vetted network of internationally renowned medical professionals and surgeons.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MonitorSmartphone className="text-vibrant-blue mt-1 w-5 h-5" />
                  <div>
                    <p className="font-title-md text-base text-on-surface font-semibold">24/7 Digital Health Access</p>
                    <p className="font-body-md text-sm text-on-surface-variant">Seamlessly manage appointments, records, and consultations from any device, anywhere.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div className="reveal-up delay-200">
            {/* Quick Booking Widget */}
            <div className="bg-surface-container-lowest rounded-2xl p-8 card-shadow border border-surface-variant space-y-6 card-hover w-full max-w-md mx-auto">
              <h3 className="font-title-md text-title-md text-primary text-center mb-4">Book Your Visit</h3>
              {/* Toggle Buttons */}
              <div className="flex bg-surface-container-low rounded-full p-1 mb-6">
                <button className="flex-1 bg-vibrant-blue text-on-primary py-2.5 rounded-full font-label-sm text-label-sm transition-all shadow-sm">Hospital</button>
                <button className="flex-1 text-on-surface-variant py-2.5 rounded-full font-label-sm text-label-sm hover:bg-surface-variant/50 transition-all">Diagnostic</button>
              </div>
              <div className="space-y-4">
                {/* Specialty */}
                <div className="flex flex-col relative">
                  <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Select Specialty</label>
                  <div className="relative">
                    <select className="mt-4 pt-4 pb-2 px-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md w-full appearance-none outline-none cursor-pointer">
                      <option>Cardiology</option>
                      <option>Neurology</option>
                      <option>Oncology</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-8 text-outline pointer-events-none w-5 h-5" />
                  </div>
                </div>
                {/* Location */}
                <div className="flex flex-col relative">
                  <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Select Location</label>
                  <div className="relative">
                    <select className="mt-4 pt-4 pb-2 px-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md w-full appearance-none outline-none cursor-pointer">
                      <option>Central Clinic, London</option>
                      <option>New York Medical Center</option>
                      <option>Dubai Health City</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-8 text-outline pointer-events-none w-5 h-5" />
                  </div>
                </div>
                {/* Search Doctor */}
                <div className="flex flex-col relative">
                  <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Search Doctor / Hospital</label>
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-3 text-vibrant-blue w-5 h-5" />
                    <input className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none" placeholder="Dr. Emily Chen" type="text" />
                  </div>
                </div>
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col relative">
                    <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Date</label>
                    <div className="relative mt-4">
                      <Calendar className="absolute left-3 top-3 text-vibrant-blue w-5 h-5" />
                      <input className="w-full pl-10 pr-3 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none" type="text" defaultValue="Oct 25, 2023" />
                    </div>
                  </div>
                  <div className="flex flex-col relative">
                    <label className="font-label-sm text-label-sm text-vibrant-blue absolute top-2 left-3 z-10 bg-surface-container-lowest px-1">Time</label>
                    <div className="relative mt-4">
                      <Clock className="absolute left-3 top-3 text-vibrant-blue w-5 h-5" />
                      <input className="w-full pl-10 pr-3 py-3 border border-outline-variant rounded-lg focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue/50 bg-surface-container-lowest text-body-md outline-none" type="text" defaultValue="10:30 AM" />
                    </div>
                  </div>
                </div>
              </div>
              <button className="w-full bg-vibrant-blue text-on-primary py-4 rounded-xl font-title-md text-base btn-hover mt-4 shadow-lg shadow-vibrant-blue/20">Find Appointment</button>
            </div>
          </div>
        </div>
      </section>

      {/* Patient Testimonials / Search */}
      <section className="py-16 px-margin-x-desktop bg-surface-container-lowest border-b border-surface-variant">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-12 border-b border-surface-variant pb-4">
            <a className="flex items-center gap-2 pb-2 border-b-2 border-primary text-primary font-bold text-sm cursor-pointer"><User className="text-vibrant-blue w-5 h-5" /> Search Doctor</a>
            <a className="flex items-center gap-2 pb-2 text-on-surface-variant hover:text-primary font-semibold text-sm cursor-pointer"><Building2 className="text-outline w-5 h-5" /> Search Hospital</a>
            <a className="flex items-center gap-2 pb-2 text-on-surface-variant hover:text-primary font-semibold text-sm cursor-pointer"><BriefcaseMedical className="text-outline w-5 h-5" /> Search by Speciality</a>
            <a className="flex items-center gap-2 pb-2 text-on-surface-variant hover:text-primary font-semibold text-sm cursor-pointer"><ShieldPlus className="text-outline w-5 h-5" /> Search by Symptoms</a>
            <a className="flex items-center gap-2 pb-2 text-on-surface-variant hover:text-primary font-semibold text-sm cursor-pointer"><MapPin className="text-outline w-5 h-5" /> Search by City</a>
          </div>
          <div className="bg-surface-container-low p-6 rounded-2xl border border-surface-variant grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-3.5 text-outline w-5 h-5" />
              <input className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-vibrant-blue outline-none text-body-md" placeholder="Search by doctor name or keyword..." type="text" />
            </div>
            <div className="md:col-span-5 relative">
              <MapPin className="absolute left-3 top-3.5 text-outline w-5 h-5" />
              <input className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-vibrant-blue outline-none text-body-md" placeholder="Enter city or location" type="text" />
            </div>
            <div className="md:col-span-2">
              <button className="w-full bg-vibrant-blue text-on-primary py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">Search</button>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rated Doctors Section */}
      <section className="py-16 px-margin-x-desktop bg-surface-container-lowest border-y border-surface-variant">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Stethoscope className="text-vibrant-blue w-10 h-10" />
              <span className="font-display-lg text-xl text-primary tracking-tight">Consult your Doctor</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-surface-container-low rounded-2xl border border-surface-variant">
              <span className="font-display-lg text-3xl font-extrabold text-primary mb-1">60,000</span>
              <span className="text-sm text-on-surface-variant font-medium flex items-center gap-1">people getting better care <Info className="w-3 h-3 text-outline cursor-pointer" /></span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-surface-container-low rounded-2xl border border-surface-variant">
              <span className="font-display-lg text-3xl font-extrabold text-primary mb-1">1,700</span>
              <span className="text-sm text-on-surface-variant font-medium flex items-center gap-1">health professionals <Info className="w-3 h-3 text-outline cursor-pointer" /></span>
            </div>
            <div className="flex flex-col items-center text-center p-4 bg-surface-container-low rounded-2xl border border-surface-variant">
              <span className="font-display-lg text-3xl font-extrabold text-primary mb-1">30,000</span>
              <span className="text-sm text-on-surface-variant font-medium flex items-center gap-1">people cured using AI <Info className="w-3 h-3 text-outline cursor-pointer" /></span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-margin-x-desktop bg-surface">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="text-center mb-12">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Top Rated Doctors</h2>
            <p className="font-body-md text-on-surface-variant max-w-2xl mx-auto">Book appointments with some of our most highly-rated and experienced medical professionals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Doctor Card 1 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col">
              <div className="aspect-[16/9] w-full relative">
                <img alt="Dr. Alistair Finch" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsPOnBuB7aMTywyRzWJIkmocCqlD7NwFq5C-csD4i-zL61vpPuDUaSj9CDe_bDyaZDKPPqfOqTLPQgCPJLLo48TMFID2EvTqiMm1qasyuIn20W9VhZrbVVDjrcK0ouwpwfowSh7h7UyeoEORjLysBSPwd2gQjAfSHJp60dcrjyxULJFHUsj2hUJyCcAPfNrvgEsDpMbAJyTXTAhUVb2HXn7Ssr_cxN_XkgHwp-1RPzoV5Rya1CezonLQ" />
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-title-md text-on-surface">Dr. Alistair Finch</h3>
                    <p className="text-vibrant-blue font-medium text-sm mt-1">Cardiologist</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-primary">
                    <Star className="w-4 h-4 text-fresh-teal" />
                    <span className="text-sm font-medium">4.9</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <ClipboardList className="w-5 h-5 text-vibrant-blue" />
                    <span className="">25+ Years Experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <MapPin className="w-5 h-5 text-vibrant-blue" />
                    <span className="">City of Hope Medical Center</span>
                  </div>
                </div>
                <button className="mt-auto w-full bg-surface-container-low text-primary border border-surface-variant py-3 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold">Book Appointment</button>
              </div>
            </div>
            {/* Doctor Card 2 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col reveal-up delay-100">
              <div className="aspect-[16/9] w-full relative">
                <img alt="Dr. Sarah Jenkins" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsD_z9God9ZmRTErPrDILxow6NvAo6m33rH3uXhNN0z23B9oy9sv9AbmvABCJNKXI2q6vuxprjiVoxus8jJCW-VzzXbHKkDQbmlpipWUdpKoLK4DvHnmaUxrZoCz26CgrNw1GvRyo2x-PPvRkfcP5K-XwDdW51liNBcwPHMNRUaA3dIbNj8YsOjTWWVzcXxrFIiF2rdggZveYplwVFPd9U4H9Sx8X_cSqL_AJh8me6qeG5LhHnkXcbPA" />
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-title-md text-on-surface">Dr. Sarah Jenkins</h3>
                    <p className="text-vibrant-blue font-medium text-sm mt-1">Neurologist</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-primary">
                    <Star className="w-4 h-4 text-fresh-teal" />
                    <span className="text-sm font-medium">4.8</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <ClipboardList className="w-5 h-5 text-vibrant-blue" />
                    <span className="">18+ Years Experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <MapPin className="w-5 h-5 text-vibrant-blue" />
                    <span className="">Metro City Hospital</span>
                  </div>
                </div>
                <button className="mt-auto w-full bg-surface-container-low text-primary border border-surface-variant py-3 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold">Book Appointment</button>
              </div>
            </div>
            {/* Doctor Card 3 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col reveal-up delay-200">
              <div className="aspect-[16/9] w-full relative">
                <img alt="Dr. Michael Vance" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWCBohm3XL58BZ764-cLjGJohgZonT8DQ7nXhb09Pnbm_4nZEgbPIYDAed6z8j78qD4fwpMurm0PB-7K2dqh_iEr9BcosxEjeAXSbFicrj-VXFqJDge_F1r2oDUtkQqz4phBEgQUVC6-1TepXXENqJSdpP5swhFY-WC430Nx2shDfHALe0kWUVw7RB-zrC9VVbm2j3obRuXbGecd0V0Xhc0SzrzRrlrLT0OsaSIyhCbxerPsOINrrU8g" />
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-title-md text-on-surface">Dr. Michael Vance</h3>
                    <p className="text-vibrant-blue font-medium text-sm mt-1">Orthopedic Surgeon</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-primary">
                    <Star className="w-4 h-4 text-fresh-teal" />
                    <span className="text-sm font-medium">4.8</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <ClipboardList className="w-5 h-5 text-vibrant-blue" />
                    <span className="">22+ Years Experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <MapPin className="w-5 h-5 text-vibrant-blue" />
                    <span className="">St. Jude Global Health</span>
                  </div>
                </div>
                <button className="mt-auto w-full bg-surface-container-low text-primary border border-surface-variant py-3 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold">Book Appointment</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Specialities */}
      <section className="py-16 px-margin-x-desktop bg-surface">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="flex justify-between items-end mb-8">
            <h2 className="font-headline-lg text-headline-lg text-primary">Popular Specialities</h2>
            <a className="text-vibrant-blue font-bold text-sm hover:underline flex items-center gap-1 cursor-pointer">
              View All Specialities <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <Heart className="w-10 h-10 text-vibrant-blue mb-3" />
              <span className="font-title-md text-sm text-on-surface">Cardiology</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <Brain className="w-10 h-10 text-vibrant-blue mb-3" />
              <span className="font-title-md text-sm text-on-surface">Neurology</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <Bone className="w-10 h-10 text-vibrant-blue mb-3" />
              <span className="font-title-md text-sm text-on-surface">Orthopaedics</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <BriefcaseMedical className="w-10 h-10 text-vibrant-blue mb-3" />
              <span className="font-title-md text-sm text-on-surface">General Medicine</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <Baby className="w-10 h-10 text-vibrant-blue mb-3" />
              <span className="font-title-md text-sm text-on-surface">Pediatrics</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <Sparkles className="w-10 h-10 text-vibrant-blue mb-3" />
              <span className="font-title-md text-sm text-on-surface">Dermatology</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <Baby className="w-10 h-10 text-vibrant-blue mb-3" />
              <span className="font-title-md text-sm text-on-surface">Gynecology</span>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-variant card-shadow card-hover flex flex-col items-center text-center cursor-pointer">
              <div className="w-9 h-9 mb-3 flex items-center justify-center text-vibrant-blue">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="m18 2 4 4-9.5 9.5-3.5 1 1-3.5L18 2z"></path>
                  <path d="m14.5 5.5 4 4"></path>
                  <path d="M4.5 16.5 2 22l5.5-2.5"></path>
                  <path d="M9 15 6 18"></path>
                </svg>
              </div>
              <span className="font-title-md text-sm text-on-surface">General Surgery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Hospitals Section */}
      <section className="py-24 px-margin-x-desktop bg-surface">
        <div className="max-w-container-max mx-auto reveal-up">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-headline-lg text-headline-lg text-primary">Featured Hospitals</h2>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full border border-surface-variant flex items-center justify-center text-vibrant-blue hover:bg-surface-container-low transition-colors bg-surface-container-lowest">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full border border-surface-variant flex items-center justify-center text-vibrant-blue hover:bg-surface-container-low transition-colors bg-surface-container-lowest">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
            {/* Hospital 1 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col">
              <div className="aspect-[16/9] w-full relative">
                <img alt="City of Hope Medical Center" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAk9ehLuJwiWHSX00S8SMZdjFGf9AinwY0MvMi38R_pMsWgvzU7AiEFuIAx0FdKyrQ5WolurQPDqg3mTERTow8_18oR9kAphoINbqX2CUXurMgT1ky_7SQWmpn5EClz7hT3Jl_AOd1XCTpZSNZQuwNkAAy1yIyUC4GhxSBf-78DTlaxr5OGiyfMXKKTYvqDhFpHB49MdbuEJYbsoQeyJVEX1GACymS0CuVeJ4wIVLyQg5WHuqN_wNLoVA" />
                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded text-primary border border-surface-variant">GLOBAL PARTNER</span>
              </div>
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">City of Hope Medical Center</h3>
                <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-vibrant-blue" /> New York City
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-on-surface mb-6">
                  <div>
                    <span className="text-vibrant-blue block font-bold">4.9/5</span>
                    <span className="text-xs text-on-surface-variant font-normal">Rating</span>
                  </div>
                  <div>
                    <span className="text-vibrant-blue block font-bold">24/7</span>
                    <span className="text-xs text-on-surface-variant font-normal">Emergency</span>
                  </div>
                </div>
                <button className="mt-auto w-full bg-surface-container-low text-primary border border-surface-variant py-2 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold">View Profile</button>
              </div>
            </div>
            {/* Hospital 2 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col">
              <div className="aspect-[16/9] w-full relative">
                <img alt="St. Jude Global Health" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_qXhn_y5teW2Agg5FG8UykjiLgDdthZuzsqLBXFU-7f5FtF5-1-kkqqDSDff9AxBROsifY7uCYCmva06KJz9OoLrxKRMp9m8T985xdfAnAfzB4WUEmjLabUOVdaS0euKcqQ25G-dj_mkC-okUv70fiuNvkn7LY9JzhQ2RLwVLBcuSB1BzsJNONX0N0MBzC9Dq3mAV9_nTfmptKcwiqY3YR8W_I-IdXBmW3zqyDPuJwroseu8uTN4pUA" />
                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded text-primary border border-surface-variant">GLOBAL PARTNER</span>
              </div>
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">St. Jude Global Health</h3>
                <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-vibrant-blue" /> London, UK
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-on-surface mb-6">
                  <div>
                    <span className="text-vibrant-blue block font-bold">4.8/5</span>
                    <span className="text-xs text-on-surface-variant font-normal">Rating</span>
                  </div>
                  <div>
                    <span className="text-vibrant-blue block font-bold">Level 1</span>
                    <span className="text-xs text-on-surface-variant font-normal">Trauma</span>
                  </div>
                </div>
                <button className="mt-auto w-full bg-surface-container-low text-primary border border-surface-variant py-2 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold">View Profile</button>
              </div>
            </div>
            {/* Hospital 3 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col">
              <div className="aspect-[16/9] w-full relative">
                <img alt="Global Medical Institute" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfzxdVyWwlkvwjT7KUvS2ONr1AKX69s421FCpjiS57SbhL7daSzTXfO_jrj0j-uwr0vpVUwLmy5507wOzPQ_sE37tjD3b-E5KxkqZMBkzLhogc1aNZhsmIeBmPzX41q_QBy_IgFdRp_qcZnhYJTxjWDrMs1aRpCyOwG2u9BYyeyKPT3pRBPt8jcvjCaKopF375PuqjE76FjSQYLi0SZW_dQ_J_cwdPNrnKTcmwnhVbKweTW4ljTiKjVA" />
                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded text-primary border border-surface-variant">GOLD PARTNER</span>
              </div>
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">Global Medical Institute</h3>
                <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-vibrant-blue" /> Dubai, UAE
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-on-surface mb-6">
                  <div>
                    <span className="text-vibrant-blue block font-bold">4.7/5</span>
                    <span className="text-xs text-on-surface-variant font-normal">Rating</span>
                  </div>
                  <div>
                    <span className="text-vibrant-blue block font-bold">24/7</span>
                    <span className="text-xs text-on-surface-variant font-normal">On-call Staff</span>
                  </div>
                </div>
                <button className="mt-auto w-full bg-surface-container-low text-primary border border-surface-variant py-2 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold">View Profile</button>
              </div>
            </div>
            {/* Hospital 4 */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden card-shadow card-hover flex flex-col opacity-50">
              <div className="aspect-[16/9] w-full relative bg-surface-variant flex items-center justify-center">
                <Building2 className="w-10 h-10 text-vibrant-blue" />
              </div>
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">Sunrise General</h3>
                <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-vibrant-blue" /> Western District
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-on-surface mb-6">
                  <div>
                    <span className="text-vibrant-blue block font-bold">4.5/5</span>
                    <span className="text-xs text-on-surface-variant font-normal">Rating</span>
                  </div>
                  <div>
                    <span className="text-vibrant-blue block font-bold">24/7</span>
                    <span className="text-xs text-on-surface-variant font-normal">Emergency</span>
                  </div>
                </div>
                <button className="mt-auto w-full bg-surface-container-low text-primary border border-surface-variant py-2 rounded-lg font-label-sm hover:bg-surface-variant transition-colors font-bold">View Profile</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
