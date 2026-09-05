import { Search, Star, BadgeCheck, Hospital, Plus, Minus, LocateFixed, MapPin } from "lucide-react";

export default function SearchPage() {
  return (
    <div className="w-full h-[calc(100vh-88px)] min-h-[600px] flex flex-col md:flex-row overflow-hidden relative">
      {/* Left Panel: Search & List */}
      <div className="w-full md:w-[40%] h-full flex flex-col bg-indigo-gray-50 border-r border-indigo-gray-200 z-10 shadow-[4px_0px_24px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Sticky Search Header */}
        <div className="p-6 bg-indigo-gray-50 flex-shrink-0 z-20">
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6">Find Specialist</h1>
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-gray-600 w-5 h-5" />
            <input
              className="w-full bg-white border border-indigo-gray-200 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-vibrant-blue focus:ring-4 focus:ring-vibrant-blue/10 transition-all font-body-md text-on-surface placeholder:text-indigo-gray-600 shadow-sm"
              placeholder="Search by name, condition, or specialty..."
              type="text"
            />
          </div>
          {/* Horizontal Filters */}
          <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 pt-2">
            <button className="flex-shrink-0 bg-white border border-indigo-gray-200 rounded-full px-4 py-1.5 font-label-sm text-label-sm text-indigo-gray-900 hover:border-vibrant-blue transition-colors">Cardiology</button>
            <button className="flex-shrink-0 bg-primary-container/10 border-2 border-vibrant-blue rounded-full px-4 py-1.5 font-label-sm text-label-sm text-vibrant-blue">Neurology</button>
            <button className="flex-shrink-0 bg-white border border-indigo-gray-200 rounded-full px-4 py-1.5 font-label-sm text-label-sm text-indigo-gray-900 hover:border-vibrant-blue transition-colors">Orthopedics</button>
            <button className="flex-shrink-0 bg-white border border-indigo-gray-200 rounded-full px-4 py-1.5 font-label-sm text-label-sm text-indigo-gray-900 hover:border-vibrant-blue transition-colors">Pediatrics</button>
            <button className="flex-shrink-0 bg-white border border-indigo-gray-200 rounded-full px-4 py-1.5 font-label-sm text-label-sm text-indigo-gray-900 hover:border-vibrant-blue transition-colors">Oncology</button>
          </div>
        </div>

        {/* Doctor List Scroll Area */}
        <div className="flex-grow overflow-y-auto px-6 pb-6 pt-2 space-y-4">
          {/* Doctor Card 1 */}
          <div className="bg-white p-4 rounded-xl border border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <img
                className="w-16 h-16 rounded-full object-cover border-2 border-surface-container-low group-hover:border-vibrant-blue transition-colors"
                alt="Professional headshot of a middle-aged male doctor"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWc57_zZUdQwNO2B8RXkAs3zlNI8izFrfsZeodKLcmYhSQqAAfPv89HSxwb2emQU2tmeuUAkwgecYY3Gm_v2ByAUbNr09Gz4ez2lpq87y-Y99LDm_vYuxpKCo27tyDwfQ5Hfah0Wh9GcqKdFVDKHXul3TplsD6mLhdSFPaTHh36aZhXAXpvFXa_k3e1QP3cK_p6JZyjf84TUyXcQ9LKlcGdwjdy1WvYQriQghNO1qB0Lo6UXLw-WoANw"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface">Dr. Alistair Finch</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Chief of Neurology</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">4.9</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm px-2.5 py-1 rounded-full">Available Today</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">15 yrs exp</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Profile</button>
              <button className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)]">Book Now</button>
            </div>
          </div>

          {/* Doctor Card 2 */}
          <div className="bg-primary-container/5 p-4 rounded-xl border-2 border-vibrant-blue shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <img
                className="w-16 h-16 rounded-full object-cover border-2 border-vibrant-blue"
                alt="Professional headshot of a younger female doctor"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8eBSjqTY2h0TGKVxi_btHYwppEAxtWmuW2ea13C6edhPmBumaNlEQDLNC5cYI-YwqWXclwzBdk770gv85ompz800-IDr41y0WLjZ7P8igpNx1xTMk0AmeRkFyiuY8Ijpll-qcGfpfTRsoQsjReX6f6kJKwf0sMdZd1lCKd9IjTNBaSPPOCcEV4WuMM1LqasFlpjJX7MXh1L4rwhcJ0azxajWnlT1r7qVbCnCiUxxgLKFUq4IBwB9TCw"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-md text-title-md text-on-surface">Dr. Sarah Jenkins</h3>
                      <BadgeCheck className="text-vibrant-blue w-4 h-4" />
                    </div>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Neurological Surgery</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">5.0</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm px-2.5 py-1 rounded-full">Next Avail: Tomorrow</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">8 yrs exp</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-200/50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Profile</button>
              <button className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)]">Book Now</button>
            </div>
          </div>

          {/* Doctor Card 3 */}
          <div className="bg-white p-4 rounded-xl border border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <img
                className="w-16 h-16 rounded-full object-cover border-2 border-surface-container-low group-hover:border-vibrant-blue transition-colors"
                alt="Professional portrait of an older male doctor"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeL1HNuUxCxkPPmFOKy0mcOqeWdHsN5mx6zvkDPD-BiEFKteLBHnBYQTIscYbwrzSgHjdNDCHM3SLhpzIn-QLPsvlgRZXSgFkx62g_FZ6Qi6g9B5BSVsH4KceCZoAgsgKzmaoMpBgO5cg1b7cCwMA9hkt_mLhmb4SvLAgx6yQ5sOvSBenu6J2Vz7BOxFDFNSAeByslj50_azHxtuBvNrJQpkPUbyV7K2hsNIjZ2NHQGW4T4_6ujxvoHA"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface">Dr. Robert Chen</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Pediatric Neurology</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">4.8</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-soft-coral/10 text-soft-coral font-label-sm text-label-sm px-2.5 py-1 rounded-full">Waitlist Only</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">22 yrs exp</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Profile</button>
              <button className="flex-grow bg-white border-[1.5px] border-vibrant-blue text-vibrant-blue rounded-full py-2 font-label-sm text-label-sm hover:bg-vibrant-blue/5 transition-colors">Join Waitlist</button>
            </div>
          </div>

          {/* Doctor Card 4 */}
          <div className="bg-white p-4 rounded-xl border border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <img
                className="w-16 h-16 rounded-full object-cover border-2 border-surface-container-low group-hover:border-vibrant-blue transition-colors"
                alt="Professional headshot of a doctor."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8eBSjqTY2h0TGKVxi_btHYwppEAxtWmuW2ea13C6edhPmBumaNlEQDLNC5cYI-YwqWXclwzBdk770gv85ompz800-IDr41y0WLjZ7P8igpNx1xTMk0AmeRkFyiuY8Ijpll-qcGfpfTRsoQsjReX6f6kJKwf0sMdZd1lCKd9IjTNBaSPPOCcEV4WuMM1LqasFlpjJX7MXh1L4rwhcJ0azxajWnlT1r7qVbCnCiUxxgLKFUq4IBwB9TCw"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface">Dr. Emily Rivera</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Cardiology Specialist</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">4.7</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm px-2.5 py-1 rounded-full">Available Today</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">10 yrs exp</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Profile</button>
              <button className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)]">Book Now</button>
            </div>
          </div>

          {/* Doctor Card 5 */}
          <div className="bg-white p-4 rounded-xl border border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <img
                className="w-16 h-16 rounded-full object-cover border-2 border-surface-container-low group-hover:border-vibrant-blue transition-colors"
                alt="Professional headshot of a doctor."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWc57_zZUdQwNO2B8RXkAs3zlNI8izFrfsZeodKLcmYhSQqAAfPv89HSxwb2emQU2tmeuUAkwgecYY3Gm_v2ByAUbNr09Gz4ez2lpq87y-Y99LDm_vYuxpKCo27tyDwfQ5Hfah0Wh9GcqKdFVDKHXul3TplsD6mLhdSFPaTHh36aZhXAXpvFXa_k3e1QP3cK_p6JZyjf84TUyXcQ9LKlcGdwjdy1WvYQriQghNO1qB0Lo6UXLw-WoANw"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface">Dr. Michael Scott</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Orthopedic Surgeon</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">4.6</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm px-2.5 py-1 rounded-full">Next Avail: Mon</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">14 yrs exp</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Profile</button>
              <button className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)]">Book Now</button>
            </div>
          </div>

          {/* Doctor Card 6 */}
          <div className="bg-white p-4 rounded-xl border border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <img
                className="w-16 h-16 rounded-full object-cover border-2 border-surface-container-low group-hover:border-vibrant-blue transition-colors"
                alt="Professional headshot of a doctor."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeL1HNuUxCxkPPmFOKy0mcOqeWdHsN5mx6zvkDPD-BiEFKteLBHnBYQTIscYbwrzSgHjdNDCHM3SLhpzIn-QLPsvlgRZXSgFkx62g_FZ6Qi6g9B5BSVsH4KceCZoAgsgKzmaoMpBgO5cg1b7cCwMA9hkt_mLhmb4SvLAgx6yQ5sOvSBenu6J2Vz7BOxFDFNSAeByslj50_azHxtuBvNrJQpkPUbyV7K2hsNIjZ2NHQGW4T4_6ujxvoHA"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface">Dr. Lisa Cuddy</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Endocrinology</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">4.9</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-soft-coral/10 text-soft-coral font-label-sm text-label-sm px-2.5 py-1 rounded-full">Waitlist Only</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">18 yrs exp</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Profile</button>
              <button className="flex-grow bg-white border-[1.5px] border-vibrant-blue text-vibrant-blue rounded-full py-2 font-label-sm text-label-sm hover:bg-vibrant-blue/5 transition-colors">Join Waitlist</button>
            </div>
          </div>

          {/* Hospital Card 7 */}
          <div className="bg-white p-4 rounded-xl border border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center border-2 border-surface-container-low group-hover:border-vibrant-blue transition-colors text-vibrant-blue">
                <Hospital className="w-8 h-8" />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface">City General Hospital</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Medical Center</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">4.5</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm px-2.5 py-1 rounded-full">Open 24/7</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">Multi-specialty</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Details</button>
              <button className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)]">Find Doctors Here</button>
            </div>
          </div>

          {/* Doctor Card 8 */}
          <div className="bg-white p-4 rounded-xl border border-indigo-gray-200 shadow-[0_2px_8px_rgba(0,102,255,0.04)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.08)] transition-all cursor-pointer group">
            <div className="flex items-start gap-4">
              <img
                className="w-16 h-16 rounded-full object-cover border-2 border-surface-container-low group-hover:border-vibrant-blue transition-colors"
                alt="Professional headshot of a doctor."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8eBSjqTY2h0TGKVxi_btHYwppEAxtWmuW2ea13C6edhPmBumaNlEQDLNC5cYI-YwqWXclwzBdk770gv85ompz800-IDr41y0WLjZ7P8igpNx1xTMk0AmeRkFyiuY8Ijpll-qcGfpfTRsoQsjReX6f6kJKwf0sMdZd1lCKd9IjTNBaSPPOCcEV4WuMM1LqasFlpjJX7MXh1L4rwhcJ0azxajWnlT1r7qVbCnCiUxxgLKFUq4IBwB9TCw"
              />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface">Dr. Gregory House</h3>
                    <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">Diagnostic Medicine</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-vibrant-blue fill-current" />
                    <span className="font-label-sm text-label-sm text-on-surface">5.0</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm px-2.5 py-1 rounded-full">Available Today</span>
                  <span className="bg-indigo-gray-50 text-indigo-gray-600 font-label-sm text-label-sm px-2.5 py-1 rounded-full">25 yrs exp</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-gray-50 flex gap-3">
              <button className="flex-grow bg-white border-[1.5px] border-indigo-gray-200 text-indigo-gray-900 rounded-full py-2 font-label-sm text-label-sm hover:bg-indigo-gray-50 transition-colors">View Profile</button>
              <button className="flex-grow bg-vibrant-blue text-white rounded-full py-2 font-label-sm text-label-sm hover:scale-[1.02] transition-transform shadow-[0_4px_12px_rgba(0,102,255,0.2)]">Book Now</button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Interactive Map */}
      <div className="hidden md:block w-[60%] h-full relative bg-surface-container-low">
        {/* Simulated Map Background */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwTTAgMjBoNDBNMCAzMGg0ME0xMCAwdjQwTTIwIDB2NDBNMzAgMHY0MCIgc3Ryb2tlPSIjZGFlMmZkIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')] opacity-50"></div>
        <img
          className="w-full h-full object-cover mix-blend-multiply opacity-40"
          alt="Map Background"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-EtPvnshPCg3CPHZPVsmudZBNVbu304Wc6d6IUUZPPgVJIArxIab5s52Rlr3LpA8dBF0T8tCFMSm9TGpBk25OHrNvgHDbTlvdB4CbT7Dw4LYrtIllPYSMDe2Q88cTOeMGf4pjWTZikQWEL_h6qAxnMzzeUVDUAeGrahZjyhZdl1bAIqUIDin_0qGCJjSp1KXkfLWhkjf3hDY8itk9SpDfRpHCT0dVdsrMu1wUYKAwlxGKPaSsv8iksg"
        />
        
        {/* Map Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
          <button className="bg-white/70 backdrop-blur border border-white/40 w-10 h-10 rounded-full flex items-center justify-center text-on-surface shadow-sm hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
          </button>
          <button className="bg-white/70 backdrop-blur border border-white/40 w-10 h-10 rounded-full flex items-center justify-center text-on-surface shadow-sm hover:scale-105 transition-transform">
            <Minus className="w-5 h-5" />
          </button>
          <button className="bg-white/70 backdrop-blur border border-white/40 w-10 h-10 rounded-full flex items-center justify-center text-vibrant-blue shadow-sm hover:scale-105 transition-transform mt-2">
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>

        {/* Map Pins */}
        <div className="absolute top-[35%] left-[45%] z-20 transform -translate-x-1/2 -translate-y-full group cursor-pointer">
          <div className="relative flex flex-col items-center">
            <div className="bg-white border-2 border-indigo-gray-200 rounded-full p-1 shadow-lg group-hover:border-vibrant-blue group-hover:scale-110 transition-all">
              <img
                className="w-10 h-10 rounded-full object-cover"
                alt="Dr. Finch"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuByUya9cl-ZGScaoK0KAinFv8hdtgRWMsWijHPyOmAA8X9Em3njUFtRbavcDxYCa7iIkkVTN4HzNVCJqsn5OmB6atAwAGdNZJK3CDNqk6wsupdm1BBl4XEKytczCVYfmekAFgP5qIIAz0GDQHHWiChY8fzYGSQZaJlUm9nbY7Rs5bPe00O_qUq60teYTl8yeVjnqEhWAWYufYM8XpZrMgQCUBYUz9QvldN2alXPieNMVT4nkyx4sA3SEQ"
              />
            </div>
            <div className="w-4 h-4 bg-white border-b-2 border-r-2 border-indigo-gray-200 transform rotate-45 -mt-2 group-hover:border-vibrant-blue transition-colors"></div>
          </div>
        </div>

        {/* Active Map Pin */}
        <div className="absolute top-[55%] left-[60%] z-30 transform -translate-x-1/2 -translate-y-full group cursor-pointer">
          <div className="relative flex flex-col items-center">
            {/* Popover Tooltip */}
            <div className="absolute bottom-full mb-4 w-48 bg-white/70 backdrop-blur rounded-xl p-3 shadow-xl border border-white/50 opacity-100 transform scale-100 transition-all origin-bottom">
              <h4 className="font-title-md text-title-md text-on-surface text-sm">Dr. Sarah Jenkins</h4>
              <p className="font-label-sm text-label-sm text-vibrant-blue mt-0.5">Neurological Surgery</p>
              <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-1">2.4 miles away</p>
            </div>
            <div className="bg-vibrant-blue border-2 border-white rounded-full p-1 shadow-[0_8px_16px_rgba(0,102,255,0.3)] scale-110">
              <img
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
                alt="Dr. Jenkins"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUHImPU8lrEX8H1AsK9Nl6-ZaMJ1k8WRK_ZTyasQbF3zqDtNy1QZeaide6TGBjLDPscisEsFJS-Kq5S_vz8zCLxfmpuhGaGystzmHdQV2F6d714r6vsYf7gJ0jK4rm5WvzrkB7XcpcEQ9lmEku7sg6IJPzVWkX1TOJwWbMQJlgN0qeE4oGsqG5e1hrCrQMiDoMNYEoHffj_WyZeW6lOk-OsOLoF2qeWtxmJli26OXBCaaGwSplHRPFSg"
              />
            </div>
            <div className="w-4 h-4 bg-vibrant-blue transform rotate-45 -mt-2 shadow-sm"></div>
          </div>
        </div>

        {/* Search Area Over Map */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur rounded-full px-6 py-3 shadow-lg border border-white/50 flex items-center gap-3 z-20">
          <MapPin className="text-vibrant-blue w-5 h-5 fill-vibrant-blue/20" />
          <span className="font-body-md text-on-surface font-semibold">
            Searching in: <span className="text-vibrant-blue">Downtown Medical District</span>
          </span>
          <button className="ml-4 font-label-sm text-label-sm text-indigo-gray-600 hover:text-vibrant-blue transition-colors underline">Change</button>
        </div>
      </div>
    </div>
  );
}
