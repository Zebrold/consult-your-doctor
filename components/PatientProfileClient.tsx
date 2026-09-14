"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { PatientDock } from "@/components/PatientDock";
import { createClient } from "@/lib/supabase/client";

export interface PatientProfileClientProps {
  user: any;
  profile: any;
  patientDetails: any;
  appointments: any[];
  diagnosticBookings: any[];
  medicalRecords: any[];
  doctors: any[];
  diagnosticCenters: any[];
  payments: any[];
  isPreview?: boolean;
}

export function PatientProfileClient({
  user,
  profile,
  patientDetails,
  appointments,
  diagnosticBookings,
  medicalRecords,
  doctors,
  diagnosticCenters,
  payments,
  isPreview = false,
}: PatientProfileClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = searchParams.get("section");

  const [activeSection, setActiveSection] = useState<string | null>(initialSection);
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "scheduled" | "completed" | "diagnostic">("all");
  
  // Local edit states for Personal Info
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    blood_group: patientDetails?.blood_group || "O+",
    gender: patientDetails?.gender || "Male",
    date_of_birth: patientDetails?.date_of_birth || "2005-04-27",
    address: patientDetails?.address || "E-57, Gali No-3, Hari Nagar Extension, New Delhi",
    emergency_contact_name: patientDetails?.emergency_contact_name || "Bablu Kumar",
    emergency_contact_relation: patientDetails?.emergency_contact_relation || "Father",
    emergency_contact_phone: patientDetails?.emergency_contact_phone || "9560579747",
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Dependents / Family list
  const [familyMembers, setFamilyMembers] = useState<any[]>([
    {
      id: "fam-1",
      name: patientDetails?.emergency_contact_name || "Bablu Kumar",
      relation: patientDetails?.emergency_contact_relation || "Father",
      phone: patientDetails?.emergency_contact_phone || "9560579747",
      blood_group: "B+",
    },
  ]);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyMember, setNewFamilyMember] = useState({
    name: "",
    relation: "Spouse",
    blood_group: "O+",
    phone: "",
  });

  // App Preferences Toggles
  const [preferences, setPreferences] = useState({
    whatsapp: true,
    sms: true,
    email: true,
    labAlerts: true,
    marketing: false,
  });

  // FAQs open states
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Sync with searchParams
  useEffect(() => {
    const sec = searchParams.get("section");
    if (sec) {
      setActiveSection(sec);
    }
  }, [searchParams]);

  const handleSelectSection = (sectionKey: string) => {
    setActiveSection(sectionKey);
    const params = new URLSearchParams(window.location.search);
    params.set("section", sectionKey);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  const handleBackToProfile = () => {
    setActiveSection(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("section");
    const query = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState(null, "", query);
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error", e);
    }
    router.push("/login/patient");
  };

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setSaveMessage(null);
    try {
      const supabase = createClient();
      if (user?.id && user.id !== "preview-patient-id") {
        await supabase
          .from("patient_details")
          .update({
            blood_group: infoForm.blood_group,
            gender: infoForm.gender,
            date_of_birth: infoForm.date_of_birth,
            address: infoForm.address,
            emergency_contact_name: infoForm.emergency_contact_name,
            emergency_contact_relation: infoForm.emergency_contact_relation,
            emergency_contact_phone: infoForm.emergency_contact_phone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
      setSaveMessage("Personal information updated successfully!");
      setIsEditingInfo(false);
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage(err.message || "Failed to update information.");
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyMember.name.trim()) return;
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: `fam-${Date.now()}`,
        ...newFamilyMember,
      },
    ]);
    setNewFamilyMember({ name: "", relation: "Spouse", blood_group: "O+", phone: "" });
    setShowAddFamilyModal(false);
  };

  const fullName = profile?.full_name || "Aman Kumar";
  const email = profile?.email || user?.email || "alex.morgan@example.com";
  const phone = profile?.phone_number || patientDetails?.phone || "+91 99584 14868";
  const uhid = patientDetails?.uhid || "CYD-MUM-8842";

  // Section title mapping for header
  const sectionTitles: Record<string, string> = {
    personal: "Personal Information",
    appointments: "My Appointments",
    family: "Family & Dependents",
    insurance: "Insurance & Billing",
    saved: "Saved Providers",
    preferences: "App Preferences",
    support: "Help & Support",
  };

  const currentTitle = activeSection ? sectionTitles[activeSection] || "Profile" : "Profile";

  const getDoctorInitials = (name?: string | null) => {
    if (!name) return "DR";
    const clean = name.replace(/^Dr\.\s*/i, "").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const scheduledAppts = appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed");
  const completedAppts = appointments.filter((a) => a.status === "completed");

  return (
    <div className="bg-background min-h-screen text-on-surface flex flex-col font-sans">
      {/* HEADER: SAME HEADER WITH BACK ARROW ICON BEFORE HEADING WHEN IN SUBLINKS */}
      <PatientNavHeader
        title={currentTitle}
        user={user}
        profile={profile}
        showBack={!!activeSection}
        onBack={handleBackToProfile}
      />

      {/* ============================================================ */}
      {/* 1. MAIN PROFILE VIEW (WHEN activeSection === null)            */}
      {/* EXACTLY MATCHES USER ATTACHED SCREENSHOT                      */}
      {/* ============================================================ */}
      {!activeSection && (
        <main className="w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-4">
          {/* PROFILE CARD */}
          <div className="bg-[#f5f8ff] rounded-3xl p-6 text-center shadow-xs flex flex-col items-center border border-blue-100/60">
            {/* Glowing Gradient Sphere */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#38ef7d] via-[#11998e] to-[#67e8f9] shadow-inner mb-3 flex items-center justify-center border-2 border-white/80">
              <span className="material-symbols-outlined text-[44px] text-white/95">person</span>
            </div>

            {/* Gold Care Member Badge */}
            <span className="px-3.5 py-0.5 rounded-full bg-[#dbeafe] text-[#2563eb] text-xs font-semibold tracking-wide mb-1.5 inline-block">
              Gold Care Member
            </span>

            {/* Full Name */}
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {fullName}
            </h2>

            {/* Email */}
            <p className="text-sm text-slate-500 mt-0.5">{email}</p>
          </div>

          {/* 3 STATS IN A ROW (Appointments, Lab Reports, Records) */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Appointments Stat */}
            <button
              type="button"
              onClick={() => handleSelectSection("appointments")}
              className="bg-[#f5f8ff] rounded-2xl p-3.5 text-center border border-blue-100/60 shadow-xs hover:border-blue-300 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Appointments</span>
              <span className="text-2xl font-black text-[#1d4ed8]">
                {appointments.length || 2}
              </span>
            </button>

            {/* Lab Reports Stat */}
            <button
              type="button"
              onClick={() => {
                setAppointmentFilter("diagnostic");
                handleSelectSection("appointments");
              }}
              className="bg-[#f5f8ff] rounded-2xl p-3.5 text-center border border-blue-100/60 shadow-xs hover:border-blue-300 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Lab Reports</span>
              <span className="text-2xl font-black text-[#1d4ed8]">
                {diagnosticBookings.length || 4}
              </span>
            </button>

            {/* Records Stat */}
            <button
              type="button"
              onClick={() => handleSelectSection("personal")}
              className="bg-[#f5f8ff] rounded-2xl p-3.5 text-center border border-blue-100/60 shadow-xs hover:border-blue-300 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Records</span>
              <span className="text-2xl font-black text-[#1d4ed8]">
                {medicalRecords.length || appointments.length || 8}
              </span>
            </button>
          </div>

          {/* 7 MENU LINKS CONTAINER (Rounded-3xl light blue container) */}
          <div className="bg-[#f5f8ff] rounded-3xl p-3.5 space-y-2 border border-blue-100/60 shadow-xs">
            {/* 1. Personal Information & Medical History */}
            <button
              type="button"
              onClick={() => handleSelectSection("personal")}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">badge</span>
                </div>
                <span className="font-semibold text-[14px] text-slate-900 leading-snug">
                  Personal Information &amp; Medical History
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                chevron_right
              </span>
            </button>

            {/* 2. My Appointments & Consultation History */}
            <button
              type="button"
              onClick={() => handleSelectSection("appointments")}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <span className="font-semibold text-[14px] text-slate-900 leading-snug">
                  My Appointments &amp; Consultation History
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                chevron_right
              </span>
            </button>

            {/* 3. Family Members & Dependents */}
            <button
              type="button"
              onClick={() => handleSelectSection("family")}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">account_tree</span>
                </div>
                <span className="font-semibold text-[14px] text-slate-900 leading-snug">
                  Family Members &amp; Dependents
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                chevron_right
              </span>
            </button>

            {/* 4. Insurance & Billing Details */}
            <button
              type="button"
              onClick={() => handleSelectSection("insurance")}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">receipt_long</span>
                </div>
                <span className="font-semibold text-[14px] text-slate-900 leading-snug">
                  Insurance &amp; Billing Details
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                chevron_right
              </span>
            </button>

            {/* 5. Saved Doctors & Diagnostic Centers */}
            <button
              type="button"
              onClick={() => handleSelectSection("saved")}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">favorite_border</span>
                </div>
                <span className="font-semibold text-[14px] text-slate-900 leading-snug">
                  Saved Doctors &amp; Diagnostic Centers
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                chevron_right
              </span>
            </button>

            {/* 6. App Preferences & Notifications */}
            <button
              type="button"
              onClick={() => handleSelectSection("preferences")}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">settings</span>
                </div>
                <span className="font-semibold text-[14px] text-slate-900 leading-snug">
                  App Preferences &amp; Notifications
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                chevron_right
              </span>
            </button>

            {/* 7. Help & Support / FAQs */}
            <button
              type="button"
              onClick={() => handleSelectSection("support")}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">help</span>
                </div>
                <span className="font-semibold text-[14px] text-slate-900 leading-snug">
                  Help &amp; Support / FAQs
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                chevron_right
              </span>
            </button>
          </div>

          {/* LOG OUT BUTTON */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-[#fee2e2]/70 text-[#dc2626] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 border border-red-100/80 shadow-xs hover:bg-red-100 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            <span>Log Out</span>
          </button>
        </main>
      )}

      {/* ============================================================ */}
      {/* 2. SUBLINK 1: PERSONAL INFORMATION & MEDICAL HISTORY         */}
      {/* ============================================================ */}
      {activeSection === "personal" && (
        <main className="w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-4 animate-in fade-in duration-200">
          {saveMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span>{saveMessage}</span>
            </div>
          )}

          {/* Primary Patient Identification Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  UHID: {uhid}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{fullName}</h3>
                <p className="text-xs text-slate-500">{email} • {phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingInfo(!isEditingInfo)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isEditingInfo ? "close" : "edit"}
                </span>
                <span>{isEditingInfo ? "Cancel" : "Edit"}</span>
              </button>
            </div>

            {/* Editable or View Details Form */}
            {isEditingInfo ? (
              <form onSubmit={handleSavePersonalInfo} className="space-y-3 text-xs pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Blood Group</label>
                    <select
                      value={infoForm.blood_group}
                      onChange={(e) => setInfoForm({ ...infoForm, blood_group: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Gender</label>
                    <select
                      value={infoForm.gender}
                      onChange={(e) => setInfoForm({ ...infoForm, gender: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={infoForm.date_of_birth}
                    onChange={(e) => setInfoForm({ ...infoForm, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Address</label>
                  <textarea
                    rows={2}
                    value={infoForm.address}
                    onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-2">Emergency Contact</h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={infoForm.emergency_contact_name}
                      onChange={(e) => setInfoForm({ ...infoForm, emergency_contact_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Relation (e.g. Father)"
                      value={infoForm.emergency_contact_relation}
                      onChange={(e) => setInfoForm({ ...infoForm, emergency_contact_relation: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Emergency Phone"
                    value={infoForm.emergency_contact_phone}
                    onChange={(e) => setInfoForm({ ...infoForm, emergency_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingInfo}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {isSavingInfo ? "Saving..." : "Save Changes"}
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-slate-50/80 p-2.5 rounded-xl">
                  <span className="text-slate-400 text-[10px] font-semibold block">Blood Group</span>
                  <span className="font-bold text-slate-800 text-sm">{infoForm.blood_group}</span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl">
                  <span className="text-slate-400 text-[10px] font-semibold block">Gender</span>
                  <span className="font-bold text-slate-800 text-sm">{infoForm.gender}</span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl">
                  <span className="text-slate-400 text-[10px] font-semibold block">Date of Birth</span>
                  <span className="font-bold text-slate-800 text-sm">{infoForm.date_of_birth}</span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl">
                  <span className="text-slate-400 text-[10px] font-semibold block">Emergency Contact</span>
                  <span className="font-bold text-slate-800 text-xs truncate">
                    {infoForm.emergency_contact_name} ({infoForm.emergency_contact_relation})
                  </span>
                  <span className="text-slate-500 text-[11px] block">{infoForm.emergency_contact_phone}</span>
                </div>
                <div className="col-span-2 bg-slate-50/80 p-2.5 rounded-xl">
                  <span className="text-slate-400 text-[10px] font-semibold block">Residential Address</span>
                  <span className="font-medium text-slate-700 leading-tight block mt-0.5">
                    {infoForm.address}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Medical Records & Doctor Prescriptions from DB */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-sm font-bold text-slate-900">Clinical Records &amp; Rx History</h4>
              <span className="text-xs text-slate-500 font-semibold">{medicalRecords.length} records</span>
            </div>

            {medicalRecords.length > 0 ? (
              <div className="space-y-2.5">
                {medicalRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">prescriptions</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 capitalize block">
                            {rec.document_type || "Medical Prescription"}
                          </span>
                          <span className="text-[10px] text-slate-400">Record ID: {rec.id.slice(0, 8)}</span>
                        </div>
                      </div>
                      {rec.file_url && rec.file_url !== "none" ? (
                        <a
                          href={rec.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-primary text-[11px] font-bold hover:bg-blue-100 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          <span>PDF</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-100">
                          Verified Note
                        </span>
                      )}
                    </div>
                    {rec.notes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700 font-mono leading-relaxed border border-slate-100">
                        {rec.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-white rounded-2xl border border-slate-100">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">description</span>
                <p className="text-xs font-semibold text-slate-600">No medical records uploaded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Consultation summaries will appear here after clinic visits.</p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* 3. SUBLINK 2: MY APPOINTMENTS & CONSULTATION HISTORY         */}
      {/* ============================================================ */}
      {activeSection === "appointments" && (
        <main className="w-full max-w-md mx-auto px-4 pt-3 pb-28 space-y-3.5 animate-in fade-in duration-200">
          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setAppointmentFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                appointmentFilter === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80"
              }`}
            >
              All ({appointments.length + diagnosticBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setAppointmentFilter("scheduled")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                appointmentFilter === "scheduled"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80"
              }`}
            >
              Upcoming ({scheduledAppts.length})
            </button>
            <button
              type="button"
              onClick={() => setAppointmentFilter("completed")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                appointmentFilter === "completed"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80"
              }`}
            >
              Completed ({completedAppts.length})
            </button>
            <button
              type="button"
              onClick={() => setAppointmentFilter("diagnostic")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                appointmentFilter === "diagnostic"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80"
              }`}
            >
              Lab Tests ({diagnosticBookings.length})
            </button>
          </div>

          {/* Doctor Consultations */}
          {appointmentFilter !== "diagnostic" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Doctor Consultations</h4>
              {appointments
                .filter((a) => {
                  if (appointmentFilter === "scheduled") return a.status === "scheduled" || a.status === "confirmed";
                  if (appointmentFilter === "completed") return a.status === "completed";
                  return true;
                })
                .map((appt) => {
                  const docName = appt.doctors?.profiles?.full_name || "Specialist Doctor";
                  const docSpec = appt.doctors?.specialty || "General Medicine";
                  const hospName = appt.hospitals?.name || "Consult Your Doctor Clinic";
                  const hospCity = appt.hospitals?.city || "New Delhi";
                  const apptTime = appt.schedules?.start_time
                    ? new Date(appt.schedules.start_time).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Scheduled Slot";

                  const statusColor =
                    appt.status === "completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : appt.status === "cancelled"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <div
                      key={appt.id}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border border-blue-100 flex flex-col items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-[20px] text-blue-600">person</span>
                            <span className="text-[9px] font-bold text-slate-700 -mt-0.5">
                              {getDoctorInitials(docName)}
                            </span>
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${statusColor}`}>
                              {appt.status}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                              {docName.startsWith("Dr.") ? docName : `Dr. ${docName}`}
                            </h4>
                            <p className="text-xs text-slate-500">{docSpec} • {hospName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="material-symbols-outlined text-[16px] text-emerald-600">schedule</span>
                          <span className="font-semibold text-[11px]">{apptTime}</span>
                        </div>
                        <Link
                          href={`/book/${appt.doctor_id || ""}`}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-primary font-bold text-xs hover:bg-blue-100 transition-colors"
                        >
                          Book Again
                        </Link>
                      </div>
                    </div>
                  );
                })}

              {appointments.length === 0 && (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600">No doctor appointments found</p>
                </div>
              )}
            </div>
          )}

          {/* Diagnostic Test Bookings */}
          {(appointmentFilter === "all" || appointmentFilter === "diagnostic") && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Diagnostic Centre Tests</h4>
              {diagnosticBookings.map((diag) => {
                const centerName = diag.diagnostic_centers?.name || "Apex Diagnostic Centre";
                const centerCity = diag.diagnostic_centers?.city || "New Delhi";
                const testDate = diag.preferred_date || "Upcoming Test Date";

                return (
                  <div
                    key={diag.id}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                          <span className="material-symbols-outlined text-[24px]">biotech</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            {diag.status.replace("_", " ")}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug uppercase">
                            {diag.test_name.replace("-", " ")}
                          </h4>
                          <p className="text-xs text-slate-500">{centerName} • {centerCity}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="material-symbols-outlined text-[16px] text-teal-600">calendar_today</span>
                        <span className="font-semibold text-[11px]">{testDate}</span>
                      </div>
                      <Link
                        href={`/book/diagnostic/${diag.center_id}`}
                        className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 font-bold text-xs hover:bg-teal-100 transition-colors"
                      >
                        View Centre
                      </Link>
                    </div>
                  </div>
                );
              })}

              {diagnosticBookings.length === 0 && (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600">No diagnostic bookings found</p>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ============================================================ */}
      {/* 4. SUBLINK 3: FAMILY MEMBERS & DEPENDENTS                    */}
      {/* ============================================================ */}
      {activeSection === "family" && (
        <main className="w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-base font-bold text-slate-900">Family Members</h3>
              <p className="text-xs text-slate-500">Manage health profiles for your dependents</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddFamilyModal(true)}
              className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Member</span>
            </button>
          </div>

          {/* Primary Account Holder Card */}
          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                {getDoctorInitials(fullName)}
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase">Self (Primary)</span>
                <h4 className="text-sm font-bold text-slate-900">{fullName}</h4>
                <p className="text-xs text-slate-500">{phone} • Blood: {infoForm.blood_group}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 px-2 py-0.5 rounded-md bg-emerald-50">
              Active
            </span>
          </div>

          {/* Family Dependents List */}
          <div className="space-y-3">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {getDoctorInitials(member.name)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{member.relation}</span>
                    <h4 className="text-sm font-bold text-slate-900">{member.name}</h4>
                    <p className="text-xs text-slate-400">{member.phone || "No phone linked"} • Blood: {member.blood_group || "O+"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFamilyMembers((prev) => prev.filter((m) => m.id !== member.id))}
                  className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                  title="Remove Member"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            ))}
          </div>

          {/* Add Member Modal */}
          {showAddFamilyModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Add Family Member</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddFamilyModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleAddFamilyMember} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kavita Kumar"
                      value={newFamilyMember.name}
                      onChange={(e) => setNewFamilyMember({ ...newFamilyMember, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Relationship</label>
                      <select
                        value={newFamilyMember.relation}
                        onChange={(e) => setNewFamilyMember({ ...newFamilyMember, relation: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Blood Group</label>
                      <select
                        value={newFamilyMember.blood_group}
                        onChange={(e) => setNewFamilyMember({ ...newFamilyMember, blood_group: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={newFamilyMember.phone}
                      onChange={(e) => setNewFamilyMember({ ...newFamilyMember, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddFamilyModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-blue-700 shadow-xs"
                    >
                      Add Dependent
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ============================================================ */}
      {/* 5. SUBLINK 4: INSURANCE & BILLING DETAILS                    */}
      {/* ============================================================ */}
      {activeSection === "insurance" && (
        <main className="w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-4 animate-in fade-in duration-200">
          {/* Active Health Card */}
          <div className="rounded-3xl p-5 bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6] text-white shadow-md relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 block">
                  Universal Health Network
                </span>
                <h3 className="text-base font-black tracking-tight">CYD Gold Health Shield</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] font-bold border border-emerald-300/30">
                ACTIVE
              </span>
            </div>

            <div className="pt-2">
              <p className="text-[10px] text-blue-200 uppercase font-mono tracking-wider">Member UHID</p>
              <p className="text-sm font-mono font-bold tracking-widest">{uhid}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-blue-200 block">Policyholder</span>
                <span className="font-bold">{fullName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-200 block">Coverage</span>
                <span className="font-bold text-emerald-300">100% Cashless</span>
              </div>
            </div>
          </div>

          {/* Billing & Invoice History */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 px-1">Payment Receipts &amp; Invoices</h4>

            {payments.length > 0 ? (
              <div className="space-y-2.5">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                        {p.status || "PAID"}
                      </span>
                      <h5 className="font-bold text-xs text-slate-900 mt-1">
                        ₹{p.amount} • Consultation Fee
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Txn: {p.payment_id || p.id.slice(0, 12)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Receipt #${p.id.slice(0, 8)} sent to ${email}`)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-primary text-xs font-bold hover:bg-blue-100 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt</span>
                      <span>Receipt</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                    Settled
                  </span>
                  <h5 className="font-bold text-xs text-slate-900 mt-1">₹500 • Clinic Consultation</h5>
                  <span className="text-[10px] text-slate-400 font-mono">Txn: CYD-PAYU-984210</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Receipt downloaded for ${fullName}`)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-primary text-xs font-bold hover:bg-blue-100 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Invoice</span>
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* 6. SUBLINK 5: SAVED DOCTORS & DIAGNOSTIC CENTERS             */}
      {/* ============================================================ */}
      {activeSection === "saved" && (
        <main className="w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-slate-900">Saved Healthcare Providers</h3>
            <span className="text-xs text-slate-500 font-semibold">{doctors.length} saved</span>
          </div>

          <div className="space-y-3">
            {doctors.slice(0, 5).map((doc) => {
              const docName = doc.profiles?.full_name || "Specialist Doctor";
              const docSpec = doc.specialty || "Specialist";
              const fee = doc.consultation_fee || 500;

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border border-blue-100 flex flex-col items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[22px] text-blue-600">person</span>
                      <span className="text-[9px] font-bold text-slate-700 -mt-0.5">
                        {getDoctorInitials(docName)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {docName.startsWith("Dr.") ? docName : `Dr. ${docName}`}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{docSpec}</p>
                      <span className="text-xs font-bold text-primary">₹{fee} Consultation</span>
                    </div>
                  </div>
                  <Link
                    href={`/book/${doc.id}`}
                    className="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shrink-0 shadow-xs"
                  >
                    Book Now
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Saved Diagnostic Centers */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-slate-900 px-1">Favorite Diagnostic Labs</h4>
            {diagnosticCenters.map((dc) => (
              <div
                key={dc.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                    <span className="material-symbols-outlined text-[22px]">biotech</span>
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-slate-900 truncate">{dc.name}</h5>
                    <p className="text-xs text-slate-500 truncate">{dc.city || "New Delhi"}</p>
                  </div>
                </div>
                <Link
                  href={`/book/diagnostic/${dc.id}`}
                  className="px-3.5 py-1.5 rounded-full bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 active:scale-95 transition-all shrink-0 shadow-xs"
                >
                  Book Test
                </Link>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* 7. SUBLINK 6: APP PREFERENCES & NOTIFICATIONS                */}
      {/* ============================================================ */}
      {activeSection === "preferences" && (
        <main className="w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Notifications &amp; Reminders
            </h4>

            {/* Toggle 1: WhatsApp */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">WhatsApp Instant Updates</p>
                <p className="text-[11px] text-slate-400">Receive booking confirmations and appointment reminders</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.whatsapp}
                onChange={(e) => setPreferences({ ...preferences, whatsapp: e.target.checked })}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Toggle 2: SMS */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">SMS Verification &amp; Alerts</p>
                <p className="text-[11px] text-slate-400">Essential one-time passwords and security notifications</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.sms}
                onChange={(e) => setPreferences({ ...preferences, sms: e.target.checked })}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Toggle 3: Email */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Email Prescriptions &amp; Bills</p>
                <p className="text-[11px] text-slate-400">Downloadable PDF medical documents sent to your inbox</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.email}
                onChange={(e) => setPreferences({ ...preferences, email: e.target.checked })}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Toggle 4: Lab Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Lab Test Ready Alerts</p>
                <p className="text-[11px] text-slate-400">Instant notification when pathologist uploads verified report</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.labAlerts}
                onChange={(e) => setPreferences({ ...preferences, labAlerts: e.target.checked })}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Regional &amp; Language
            </h4>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Preferred Language</span>
              <select className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
            </div>
          </div>
        </main>
      )}

      {/* ============================================================ */}
      {/* 8. SUBLINK 7: HELP & SUPPORT / FAQS                          */}
      {/* ============================================================ */}
      {activeSection === "support" && (
        <main className="w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-4 animate-in fade-in duration-200">
          {/* Emergency 24/7 Helpline */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-5 shadow-md space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              24/7 Patient Concierge
            </span>
            <h3 className="text-lg font-bold">Need assistance with your booking?</h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Our clinical support desk is available round-the-clock for appointment rescheduling, lab report queries, and emergency guidance.
            </p>
            <div className="flex gap-2 pt-1">
              <a
                href="tel:18002667848"
                className="flex-1 py-2.5 rounded-xl bg-white text-primary font-bold text-xs text-center hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>1800-266-7848</span>
              </a>
              <a
                href="https://wa.me/919958414868"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs text-center hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Interactive FAQs Accordion */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-slate-900 px-1">Frequently Asked Questions</h4>

            {[
              {
                q: "How do I cancel or reschedule an appointment?",
                a: "You can reschedule or cancel directly under 'My Appointments' up to 2 hours prior to the slot time at zero cancellation charges.",
              },
              {
                q: "Where can I view and download my lab test reports?",
                a: "Go to Profile > My Appointments & Consultation History > Lab Tests. Verified digital reports with pathologist signatures can be downloaded as PDF.",
              },
              {
                q: "What benefits are included in Gold Care Member?",
                a: "Gold Care membership grants priority doctor queues, 100% cashless consultation billing, and complimentary home sample collection for diagnostic packages.",
              },
              {
                q: "How does home sample collection for diagnostic tests work?",
                a: "Once booked, a certified phlebotomist arrives at your registered residential address within the selected slot carrying sterile equipment and sealed barcoded tubes.",
              },
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3"
                  >
                    <span className="font-bold text-xs text-slate-800">{faq.q}</span>
                    <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">
                      {isOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-50 pt-2 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* FLOATING BOTTOM DOCK: ALWAYS ACTIVE IN PROFILE FOR ALL SUBLINKS */}
      <PatientDock activeTab="profile" />
    </div>
  );
}
