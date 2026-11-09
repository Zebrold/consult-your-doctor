"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BedDouble, Building2, CalendarDays, Check, ClipboardList, FileText, FlaskConical, IndianRupee, LayoutDashboard, Lock, Search, Ticket, Users, Wallet, type LucideIcon,
} from "lucide-react";

// "One portal for your whole team": the tabs, what each portal does, and a sample screen of its dashboard (after the
// PartnerDesk / PartnerMobile designs). The screen is an illustration with sample names and numbers, and says so; the
// feature lines describe what each portal really has.

type Key = "hos" | "lab" | "doc";

type Portal = {
  tab: string;
  path: string;
  nav: [string, LucideIcon][];
  title: string;
  features: string[];
  kpis: [string, string, string][];
  chart: string;
  bars: number[];
  donut: [string, number, string, string];
  slips: [string, string, string, string, "Confirmed" | "Awaiting payment"][];
  listTitle: string;
  list: [string, string][];
};

const PORTALS: Record<Key, Portal> = {
  hos: {
    tab: "Hospitals",
    path: "/hospital/dashboard",
    nav: [["Dashboard", LayoutDashboard], ["Patients", Users], ["Beds", BedDouble], ["Doctors & roster", CalendarDays], ["Finance", IndianRupee], ["Payouts", Wallet]],
    title: "Today at Medora Hospitals",
    features: [
      "Live queue with online bookings, walk-ins and fast track",
      "Booking slips sent to patients on WhatsApp and by text",
      "Digital prescriptions from every doctor",
      "Doctor roster, beds and admissions",
      "Finance, wallet and withdrawals",
    ],
    kpis: [["Appointments", "42", "+12%"], ["Checked in", "18", "+4"], ["Collected today", "₹21,400", "+8%"], ["Beds free", "14 / 48", ""]],
    chart: "Appointments this week",
    bars: [32, 41, 38, 45, 52, 48, 42],
    donut: ["Payments today", 78, "Paid online", "Paid at desk"],
    slips: [
      ["CYD-24811", "Ananya Sharma", "Dr. Vaibhav · 10:30 AM", "12", "Confirmed"],
      ["CYD-24812", "Fatima Begum", "Dr. P. Nair · 11:15 AM", "07", "Awaiting payment"],
    ],
    listTitle: "Prescriptions today",
    list: [["Deepak Joshi", "Dr. M. Iyer · 3 medicines"], ["Kavitha Rao", "Dr. Vaibhav · 2 medicines"], ["Rohit Verma", "Dr. Vaibhav · follow-up in 2 weeks"]],
  },
  lab: {
    tab: "Diagnostic centres",
    path: "/diagnostic-center/dashboard",
    nav: [["Dashboard", LayoutDashboard], ["Schedule", CalendarDays], ["Patients", Users], ["Profile", Building2]],
    title: "Today at Medora Diagnostics",
    features: [
      "Test menu with your prices",
      "Day-wise bookings, each with a booking slip",
      "Home collection, where you offer it",
      "Reports uploaded straight to the patient",
      "Test-wise amounts for the month",
    ],
    kpis: [["Tests booked", "64", "+9%"], ["Home collections", "12", "+3"], ["Collected today", "₹38,900", "+6%"], ["Reports ready", "37", ""]],
    chart: "Tests booked this week",
    bars: [48, 55, 51, 60, 66, 70, 64],
    donut: ["Sample collection", 81, "At the lab", "At home"],
    slips: [
      ["CYD-31204", "Meena Pillai", "Lipid profile · today", "07", "Confirmed"],
      ["CYD-31205", "Rohit Verma", "Thyroid profile · at home", "08", "Awaiting payment"],
    ],
    listTitle: "Reports uploaded",
    list: [["Kavitha Rao", "Lipid profile · ready"], ["Sanjay Gupta", "X-ray, single view · ready"], ["Arjun Das", "CBC with ESR · ready"]],
  },
  doc: {
    tab: "Doctors",
    path: "/doctor/dashboard",
    nav: [["Dashboard", LayoutDashboard], ["Schedule", CalendarDays], ["Patients", Users], ["Profile", ClipboardList]],
    title: "Your day, Dr. Vaibhav",
    features: [
      "Your day’s slots and waiting room",
      "Booking slips sent to every patient",
      "Prescriptions with a live preview, sent as a PDF",
      "Past patients with notes and latest vitals",
      "Reviews from your patients",
    ],
    kpis: [["Appointments", "16", "+2"], ["Seen so far", "7", ""], ["Waiting now", "3", ""], ["Follow-ups", "5", ""]],
    chart: "Consultations this week",
    bars: [12, 15, 14, 16, 18, 11, 16],
    donut: ["Patients today", 62, "Follow-up", "New"],
    slips: [
      ["CYD-24811", "Ananya Sharma", "New patient · 10:30 AM", "12", "Confirmed"],
      ["CYD-24815", "Arjun Das", "Fracture check · 11:30 AM", "14", "Confirmed"],
    ],
    listTitle: "Prescriptions you wrote",
    list: [["Deepak Joshi", "Knee pain · 3 medicines"], ["Rohit Verma", "Follow-up · 1 medicine"], ["Meena Pillai", "Physiotherapy advised"]],
  },
};

const KEYS: Key[] = ["hos", "lab", "doc"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const initialsOf = (name: string) => name.split(" ").map((w) => w[0]).join("");

export function PortalPreview() {
  const [key, setKey] = useState<Key>("hos");
  const p = PORTALS[key];
  const max = Math.max(...p.bars);
  const ring = 2 * Math.PI * 42;

  return (
    // Phones: the text, the tabs, the screen, then what's inside. Desktops: the text, tabs and list beside the screen.
    <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-[52px] lg:items-center">
      <div className="contents lg:block">
        <div className="order-1">
          <span className="block mb-2.5 text-[12.5px] font-extrabold tracking-[0.12em] text-[#1D4ED8]">YOUR PARTNER PORTAL</span>
          <h2 className="text-[24px] lg:text-[34px] font-extrabold tracking-[-0.02em] leading-[1.2] lg:leading-[1.15]">
            One portal for <span className="text-[#1D4ED8]">your whole team</span>
          </h2>
          <p className="mt-2 lg:mt-2.5 mb-4 lg:mb-6 max-w-[620px] text-[14.5px] lg:text-[16px] leading-[1.55] lg:leading-[1.6] text-[#5B667A]">
            <span className="lg:hidden">Bookings, the front desk and payments in one place, on a desktop or a phone.</span>
            <span className="hidden lg:inline">Run bookings, the front desk and payments from one place, on a desktop at reception or a phone on the go.</span>
          </p>
        </div>
        <div role="tablist" aria-label="Partner type" className="order-2 flex flex-wrap gap-2">
          {KEYS.map((k) => {
            const on = k === key;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setKey(k)}
                className={`h-9 lg:h-10 px-3 lg:px-4 rounded-full border text-[13px] lg:text-[14px] font-extrabold transition-colors ${
                  on ? "bg-[#1D4ED8] border-[#1D4ED8] text-white" : "bg-white border-[#D6DDE8] text-[#27324A] hover:border-[#A9CBFF]"
                }`}
              >
                {PORTALS[k].tab}
              </button>
            );
          })}
        </div>
        <ul className="order-4 mt-[22px] grid gap-3">
          {p.features.map((f) => (
            <li key={f} className="flex gap-2.5 items-start text-[14px] lg:text-[15px] font-semibold text-[#27324A]">
              <span className="shrink-0 mt-px w-[22px] h-[22px] rounded-full bg-[#EEF3FF] flex items-center justify-center">
                <Check className="w-[13px] h-[13px] text-[#1D4ED8]" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <Link
          href="/signup"
          className="order-5 hidden lg:inline-flex items-center gap-2 mt-7 h-[50px] px-6 rounded-xl bg-[#1D4ED8] text-white text-[15px] font-extrabold shadow-[0_8px_18px_rgba(29,78,216,0.25)] hover:bg-[#1A45C2] transition-colors"
        >
          Apply to partner <ArrowRight className="w-[17px] h-[17px]" />
        </Link>
      </div>

      {/* The sample screen */}
      <div className="order-3 mt-[18px] lg:mt-0" aria-label={`Sample ${p.tab.toLowerCase()} dashboard`} role="img">
        <div aria-hidden className="rounded-2xl bg-white overflow-hidden shadow-[0_30px_60px_rgba(11,27,63,0.16),0_0_0_1px_#E1E7F0]">
          <div className="flex items-center gap-1.5 h-[34px] px-3.5 bg-[#F4F6FA] border-b border-[#E6EAF0]">
            <span className="w-[9px] h-[9px] rounded-full bg-[#F28B82]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#F6C26B]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#8FD19E]" />
            <span className="ml-2.5 flex-1 min-w-0 h-5 rounded-md bg-white shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center gap-1.5 px-2.5 text-[10.5px] text-[#5B667A]">
              <Lock className="w-2.5 h-2.5 text-[#8A94A6] shrink-0" strokeWidth={2} />
              <span className="truncate">consultyourdoctor.de{p.path}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[138px_minmax(0,1fr)]">
            <div className="hidden lg:flex flex-col gap-[3px] py-3.5 px-2.5 bg-[#1D4ED8]">
              <span className="px-1.5 pt-0.5 pb-3.5 text-white text-[11.5px] font-extrabold">Consult your Doctor</span>
              {p.nav.map(([label, Icon], i) => (
                <span key={label} className={`flex items-center gap-2 px-2 py-[7px] rounded-lg text-[11px] font-extrabold ${i === 0 ? "bg-white text-[#1D4ED8]" : "text-[#DCE6FF]"}`}>
                  <Icon className="w-[13px] h-[13px] shrink-0" strokeWidth={2} />
                  <span className="truncate">{label}</span>
                </span>
              ))}
            </div>
            <div className="p-3 lg:p-4 bg-[#F7F9FC] min-w-0">
              <div className="flex items-center justify-between gap-2.5 mb-3">
                <span className="min-w-0">
                  <span className="block text-[13.5px] lg:text-[14.5px] font-extrabold truncate">{p.title}</span>
                  <span className="block text-[10px] text-[#5B667A]">Sample screen</span>
                </span>
                <span className="hidden lg:flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1.5 w-[140px] h-[26px] px-[9px] rounded-[7px] bg-white shadow-[inset_0_0_0_1px_#E6EAF0] text-[9.5px] text-[#8A94A6]">
                    <Search className="w-[11px] h-[11px]" strokeWidth={2} /> Search patients
                  </span>
                  <span className="w-[26px] h-[26px] rounded-full bg-[#1D4ED8] text-white flex items-center justify-center text-[9px] font-extrabold">MA</span>
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {p.kpis.map(([label, value, change]) => (
                  <div key={label} className="rounded-[10px] bg-white shadow-[0_0_0_1px_#E6EAF0] px-2.5 py-[9px] min-w-0">
                    <span className="block text-[10px] font-bold text-[#5B667A] truncate">{label}</span>
                    <span className="flex items-baseline justify-between gap-1 mt-[3px]">
                      <span className="text-[16px] font-extrabold tracking-[-0.02em] whitespace-nowrap">{value}</span>
                      {change && <span className="text-[9.5px] font-extrabold text-[#1D4ED8]">{change}</span>}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2 mt-2">
                <div className="rounded-[10px] bg-white shadow-[0_0_0_1px_#E6EAF0] px-3 pt-3 pb-2.5 min-w-0">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[11.5px] font-extrabold">{p.chart}</span>
                    <span className="text-[10px] font-bold text-[#5B667A]">{p.bars.reduce((a, b) => a + b, 0)} this week</span>
                  </div>
                  <div className="flex items-end gap-2 h-[92px] px-0.5 bg-[repeating-linear-gradient(to_top,#EEF2F7_0_1px,transparent_1px_23px)]">
                    {p.bars.map((v, i) => (
                      <span key={DAYS[i]} className="flex-1 flex flex-col justify-end h-full">
                        <span className="block rounded-[4px_4px_2px_2px]" style={{ height: `${Math.round((v / max) * 100)}%`, background: i === 5 ? "#1D4ED8" : "#C7D5FB" }} />
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 px-0.5 pt-[5px]">
                    {DAYS.map((d) => (
                      <span key={d} className="flex-1 text-center text-[9px] font-bold text-[#5B667A]">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="hidden lg:flex flex-col rounded-[10px] bg-white shadow-[0_0_0_1px_#E6EAF0] p-3">
                  <span className="text-[11.5px] font-extrabold mb-2">{p.donut[0]}</span>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="relative shrink-0 w-[84px] h-[84px]">
                      <svg width="84" height="84" viewBox="0 0 100 100" className="-rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#C7D5FB" strokeWidth="13" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#1D4ED8" strokeWidth="13" strokeDasharray={`${((p.donut[1] / 100) * ring).toFixed(1)} ${ring.toFixed(1)}`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold">{p.donut[1]}%</span>
                    </span>
                    <span className="grid gap-1.5 text-[10px] font-bold text-[#27324A]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-[#1D4ED8]" />
                        {p.donut[2]} · {p.donut[1]}%
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-[#C7D5FB]" />
                        {p.donut[3]} · {100 - p.donut[1]}%
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
                <div className="rounded-[10px] bg-white shadow-[0_0_0_1px_#E6EAF0] p-3 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold">
                      <Ticket className="w-[13px] h-[13px] text-[#1D4ED8]" strokeWidth={2} /> Booking slips
                    </span>
                    <span className="text-[10px] font-extrabold text-[#1D4ED8]">View all</span>
                  </div>
                  <div className="grid gap-[7px]">
                    {p.slips.map(([id, name, what, token, status]) => {
                      const ok = status === "Confirmed";
                      return (
                        <div key={id} className="flex items-stretch rounded-[9px] shadow-[inset_0_0_0_1px_#E6EAF0] overflow-hidden">
                          <span className="shrink-0 w-[46px] flex flex-col items-center justify-center bg-[#1D4ED8] text-white">
                            <span className="text-[7.5px] font-extrabold tracking-[0.08em] text-[#CFDCFF]">TOKEN</span>
                            <span className="text-[13px] font-extrabold">{token}</span>
                          </span>
                          <span className="flex-1 min-w-0 px-[9px] py-[7px] border-l-[1.5px] border-dashed border-[#D6DDE8]">
                            <span className="flex justify-between gap-1.5">
                              <span className="text-[11px] font-extrabold truncate">{name}</span>
                              <span className="shrink-0 text-[8.5px] font-extrabold text-[#5B667A]">{id}</span>
                            </span>
                            <span className="block mt-px text-[9.5px] text-[#5B667A] truncate">{what}</span>
                            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold ${ok ? "bg-[#EEF3FF] text-[#1D4ED8]" : "bg-[#FFF6E8] text-[#B54708]"}`}>{status}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-[10px] bg-white shadow-[0_0_0_1px_#E6EAF0] p-3 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold">
                      {key === "lab" ? <FlaskConical className="w-[13px] h-[13px] text-[#1D4ED8]" strokeWidth={2} /> : <FileText className="w-[13px] h-[13px] text-[#1D4ED8]" strokeWidth={2} />}
                      {p.listTitle}
                    </span>
                    <span className="text-[10px] font-extrabold text-[#1D4ED8]">View all</span>
                  </div>
                  {p.list.map(([name, detail]) => (
                    <div key={name} className="flex items-center gap-2 py-[7px] border-t border-[#EEF2F7]">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#EEF3FF] text-[#1D4ED8] flex items-center justify-center text-[9px] font-extrabold">{initialsOf(name)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[11px] font-extrabold">{name}</span>
                        <span className="block text-[9.5px] text-[#5B667A] truncate">{detail}</span>
                      </span>
                      <Check className="w-[13px] h-[13px] text-[#1D4ED8] shrink-0" strokeWidth={3} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
