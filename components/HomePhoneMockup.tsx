import {
  BatteryFull,
  Bot,
  Calendar,
  ChevronRight,
  Droplet,
  Ellipsis,
  FileText,
  Heart,
  House,
  Menu,
  Search,
  ShieldPlus,
  Signal,
  SlidersHorizontal,
  Stethoscope,
  Baby,
  User,
  UserRound,
  Wifi,
} from "lucide-react";

const categories = [
  { label: "General Physician", icon: User },
  { label: "Dermatology", icon: Droplet },
  { label: "Pediatrics", icon: Baby },
  { label: "Cardiology", icon: Heart },
];

const doctors = [
  {
    name: "Dr. Ananya Mehta",
    specialty: "General Physician",
    experience: "MBBS, MD • 12+ Years Experience",
    rating: "4.9",
    reviews: "8.4K",
    fee: "€35",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5KvjTlnOHELBId3DYAjbxm4QHgLkN9N5mgj9NxqXEb41TndifXxWZquqPPM6Qkr8UgOeC7DZLwgoRKFF6ow6FbQLGpnHG-eZgP_DER5ZZVJFKFalM3PDQ120KUGj6bCOjUiYjxqTDScSS0QN3lp6ucCTGXoKUieumbk4MWizw6WJ1FqlyxrKA20Qcs0oz_NqEqZLPYNMDsHb8aBXJftNXQyi9RTCZWikoovtckSdIGWeROM_CaQHvrA",
  },
  {
    name: "Dr. Rohit Sharma",
    specialty: "Dermatologist",
    experience: "MBBS, MD • 10+ Years Experience",
    rating: "4.8",
    reviews: "6.2K",
    fee: "€20",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDK-VtRfE99MSVo4wmYGX7PA8NN2Xn4K6aHFEjgRvtVq2S6OiYXRZMGceGyxmv4Wg4Vvrpdy3sishhwYcO1An28eVGp-4lN9-jjfuoArxWZ-fBJOWOSVJhsJjXFWJVSeBbNV8YiPIuyT5kc65u15jxZE-gUMM0ep-EZDjTZILyiG43U245HtZ3XganmH7y0r8lur3YSvuWS_POm1zG14xf4WaenhJfiGWRdyt4Phiv6YmnrnC3y1JPCHA",
  },
];

const tabs = [
  { label: "Home", icon: House, active: true },
  { label: "Appointments", icon: Calendar },
  { label: "Health Records", icon: FileText },
  { label: "AI Doctor", icon: Bot },
  { label: "Profile", icon: UserRound },
];

/** Decorative preview of the patient mobile app shown on the marketing home page. */
export function HomePhoneMockup() {
  return (
    <div
      role="img"
      aria-label="Preview of the Consult your Doctor mobile app showing top doctors and specialties"
      className="relative w-full max-w-[340px] bg-slate-900 rounded-[48px] p-2.5 shadow-2xl border-4 border-slate-800 -rotate-1 hover:rotate-0 transition-transform duration-500 overflow-hidden select-none"
    >
      <div className="bg-white rounded-[40px] overflow-hidden flex flex-col border border-slate-100 shadow-inner">
        {/* Status bar */}
        <div className="pt-3 px-6 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-900">
          <span>9:41</span>
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950/60" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <BatteryFull className="w-4 h-4" />
          </div>
        </div>

        {/* App bar */}
        <div className="px-4 pt-2.5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-vibrant-blue">
              <ShieldPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 leading-none">Consult your Doctor</div>
              <div className="text-[9px] text-slate-400 font-medium mt-0.5">Trusted by Patients</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Search className="w-7 h-7 p-1.5 rounded-full bg-slate-50" />
            <Menu className="w-7 h-7 p-1.5 rounded-full bg-slate-50" />
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="relative flex items-center bg-[#f8faff] text-slate-400 text-[10px] pl-8 pr-8 py-2 rounded-xl border border-slate-200/80">
            <Search className="absolute left-3 w-3.5 h-3.5" />
            Search doctors, specialties or conditions
            <SlidersHorizontal className="absolute right-2.5 w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 py-2 grid grid-cols-6 items-start text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-2xl bg-vibrant-blue text-white flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-bold text-vibrant-blue">All</span>
          </div>
          {categories.map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-50/70 text-vibrant-blue flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[8px] text-slate-600 font-medium leading-tight tracking-tight">{label}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Ellipsis className="w-5 h-5" />
            </div>
            <span className="text-[8px] text-slate-600 font-medium leading-tight">More</span>
          </div>
        </div>

        {/* Top doctors */}
        <div className="px-4 pt-2.5 pb-1 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-900">Top Doctors for You</span>
          <span className="text-vibrant-blue text-[10px] font-semibold flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="px-4 py-1.5 space-y-2.5">
          {doctors.map((doctor) => (
            <div
              key={doctor.name}
              className="bg-white border border-slate-100 rounded-2xl p-2.5 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img alt="" className="w-11 h-11 rounded-full object-cover" src={doctor.image} />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs text-slate-900 leading-snug">{doctor.name}</div>
                  <div className="text-[10px] text-slate-500 leading-none">{doctor.specialty}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{doctor.experience}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-1 rounded text-[9px] font-bold">
                      ★ {doctor.rating}
                    </span>
                    <span className="text-[9px] text-slate-400">({doctor.reviews} Reviews)</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1.5">
                <span className="text-xs font-extrabold text-vibrant-blue">{doctor.fee}</span>
                <span className="px-3 py-1 bg-vibrant-blue text-white rounded-lg text-[9px] font-semibold">Consult Now</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom navigation */}
        <div className="border-t border-slate-100 mt-1 py-2 px-3 flex items-center justify-around">
          {tabs.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={`flex flex-col items-center gap-0.5 ${active ? "text-vibrant-blue" : "text-slate-400"}`}
            >
              <Icon className="w-4 h-4" />
              <span className={`text-[9px] ${active ? "font-semibold" : ""}`}>{label}</span>
            </div>
          ))}
        </div>
        <div className="w-28 h-1 bg-slate-900 rounded-full mx-auto my-1.5" />
      </div>
    </div>
  );
}
