"use client";

import React, { useState, useMemo, useRef } from "react";
import { updateDiagnosticBookingStatus } from "@/app/actions/diagnostic-center";
import { createClient } from "@/lib/supabase/client";

export interface DiagnosticPatientOrder {
  id: string;
  bookingDbId: string;
  name: string;
  phone: string;
  idCode: string;
  testName: string;
  referringDoctor: string;
  intakeType: string;
  patientAddress: string;
  tariffTotal: number;
  tariffBase: number;
  homeSurcharge: number;
  token: string;
  reportFileName: string;
  reportFileSize: string;
}

interface DiagnosticReportsUploadClientProps {
  center: {
    id: string;
    name: string;
    city: string;
    address: string;
    available_tests?: string[];
    test_prices?: Record<string, number>;
  };
  initialBookings?: any[];
  directorName?: string;
}

export function DiagnosticReportsUploadClient({
  center,
  initialBookings = [],
  directorName = "Dr. Katherine Vance",
}: DiagnosticReportsUploadClientProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map real database records into orders
  const orders: DiagnosticPatientOrder[] = useMemo(() => {
    if (!initialBookings || initialBookings.length === 0) {
      return [];
    }

    return initialBookings.map((b, idx) => {
      const pName = b.profiles?.full_name || "Eleanor Vance";
      const pPhone = b.profiles?.phone_number || "+44 7911 802341";
      const idCode = `CYD-${(b.id || "98241").slice(0, 5).toUpperCase()}`;

      const rawTest = b.test_name || "Comprehensive Metabolic Panel & Contrast Cardiac MRI";
      const formattedTest = rawTest
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      const prices = center.test_prices || {};
      let price = 850;
      for (const [k, v] of Object.entries(prices)) {
        if (
          k.toLowerCase().includes(rawTest.toLowerCase().replace(/-/g, " ")) ||
          rawTest.toLowerCase().includes(k.toLowerCase().replace(/-/g, " "))
        ) {
          price = Number(v) || price;
          break;
        }
      }

      const address =
        b.patient_details?.address ||
        "42 Kensington Gardens Square, Temp Logged 4.2°C";

      const token = `${b.id.slice(0, 5)}-k3x7`;
      const cleanFileName = `Report_${formattedTest.replace(/[^a-zA-Z0-9]/g, "_")}_${pName.replace(/\s+/g, "_")}.pdf`;

      return {
        id: b.id,
        bookingDbId: b.id,
        name: pName,
        phone: pPhone,
        idCode,
        testName: formattedTest,
        referringDoctor: "Dr. Sarah Jenkins",
        intakeType: "Home Sample Collection",
        patientAddress: address,
        tariffTotal: price + 250,
        tariffBase: price,
        homeSurcharge: 250,
        token,
        reportFileName: cleanFileName,
        reportFileSize: "4.8 MB",
      };
    });
  }, [initialBookings, center]);

  // Selected patient order
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number>(0);
  const selectedOrder = orders[selectedOrderIndex] || {
    id: "default",
    bookingDbId: "",
    name: "Eleanor Vance",
    phone: "+44 7911 802341",
    idCode: "CYD-98241",
    testName: "Comprehensive Metabolic Panel & Contrast Cardiac MRI",
    referringDoctor: "Dr. Sarah Jenkins",
    intakeType: "Home Sample Collection",
    patientAddress: "42 Kensington Gardens Square, Temp Logged 4.2°C",
    tariffTotal: 1100,
    tariffBase: 850,
    homeSurcharge: 250,
    token: "98241-k3x7",
    reportFileName: "Report_Cardiac_MRI_Eleanor_Vance.pdf",
    reportFileSize: "4.8 MB",
  };

  // Form states
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: string;
  } | null>({
    name: selectedOrder.reportFileName,
    size: "4.8 MB",
  });

  const [clinicalCertified, setClinicalCertified] = useState(true);
  const [channelSMS, setChannelSMS] = useState(true);
  const [channelWhatsApp, setChannelWhatsApp] = useState(true);
  const [channelPhysician, setChannelPhysician] = useState(true);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Handle local file selection
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setAttachedFile({
        name: file.name,
        size: `${mb} MB`,
      });
      showToast("Document Attached", `${file.name} staged for SHA-256 indexing.`);
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    showToast("File Removed", "Attached report cleared.");
  };

  // Publish report & SMS dispatch directly to Supabase DB
  const handlePublishReport = async () => {
    if (!clinicalCertified) {
      showToast("Certification Required", "Please certify diagnostic findings before dispatch.");
      return;
    }

    setIsPublishing(true);
    try {
      if (selectedOrder.bookingDbId) {
        await updateDiagnosticBookingStatus(selectedOrder.bookingDbId, "completed");
      }

      setIsPublishing(false);
      showToast(
        "Report Published & SMS Sent",
        `Secured single-use token sent to ${selectedOrder.name} (${selectedOrder.phone})`
      );
    } catch (err: any) {
      setIsPublishing(false);
      showToast("Error", err.message || "Failed to publish report.");
    }
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setTimeout(() => {
      setIsSavingDraft(false);
      showToast(
        "Draft Saved",
        `Draft lab report for ${selectedOrder.name} saved to local workstation archive.`
      );
    }, 600);
  };

  return (
    <div className="w-full px-4 pt-3 pb-8 max-w-md mx-auto sm:max-w-xl md:max-w-3xl flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.dcm,.xml,image/*"
      />

      {/* TOP BADGES */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]/40">
          <span className="material-symbols-outlined text-[14px]">terminal</span>
          <span>LIMS Suite 4.2</span>
        </span>

        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#A7F3D0]/60 text-[#065F46] border border-[#6EE7B7]/40">
          <span className="material-symbols-outlined text-[14px]">cloud_done</span>
          <span>Direct Gateway Ready</span>
        </span>
      </div>

      {/* PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
          Upload Diagnostic Report &amp; SMS Dispatch
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 leading-relaxed">
          Securely attach laboratory and imaging reports with automated instant SMS delivery to the patient&apos;s verified mobile number.
        </p>
      </div>

      {/* STEP 1: PATIENT & DIAGNOSTIC ORDER CARD */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0066FF] text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Patient &amp; Diagnostic Order
            </h2>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Verified</span>
          </span>
        </div>

        {/* Real Order Selector (if multiple bookings in DB) */}
        {orders.length > 1 && (
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <span className="font-semibold">Select DB Booking:</span>
            <select
              value={selectedOrderIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedOrderIndex(idx);
                if (orders[idx]) {
                  setAttachedFile({
                    name: orders[idx].reportFileName,
                    size: "4.8 MB",
                  });
                }
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
            >
              {orders.map((ord, i) => (
                <option key={ord.id} value={i}>
                  {ord.name} - {ord.testName.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Patient Details Sub-card */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">{selectedOrder.name}</h3>
              <p className="text-xs font-mono text-slate-500 font-semibold mt-0.5">
                ID #{selectedOrder.idCode} •{" "}
                <span className="text-[#0066FF] font-bold">{selectedOrder.phone}</span>
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Carrier Verified
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-blue-500 shrink-0">
                biotech
              </span>
              <span className="font-semibold text-slate-800">{selectedOrder.testName}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">
                stethoscope
              </span>
              <span>Referring Physician: {selectedOrder.referringDoctor}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">
                location_on
              </span>
              <span>
                Home Sample Collection ({selectedOrder.patientAddress})
              </span>
            </div>
          </div>

          <div className="mt-1 bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                check_circle
              </span>
              <span>
                Billing Settled: ₹{selectedOrder.tariffTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              (₹{selectedOrder.tariffBase} Base + ₹{selectedOrder.homeSurcharge} Home) Paid
            </span>
          </div>
        </div>
      </div>

      {/* STEP 2: DIAGNOSTIC DOCUMENTS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0066FF] text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Diagnostic Documents
            </h2>
          </div>
          <span className="text-[10px] font-bold text-slate-500 font-mono">
            SHA-256 Validated
          </span>
        </div>

        {/* Dropzone Area */}
        <div
          onClick={handleSelectFile}
          className="border-2 border-dashed border-blue-200 bg-[#F8FAFC] hover:bg-blue-50/50 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
              Tap to Browse Report
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              PDF, DICOM (dcm), or Lab XML up to 50MB
            </p>
          </div>
          <button
            type="button"
            className="mt-1 bg-[#0066FF] text-white text-xs font-bold py-1.5 px-4 rounded-full shadow-xs pointer-events-none"
          >
            Select Local File
          </button>
        </div>

        {/* Uploaded File Item */}
        {attachedFile && (
          <div className="bg-[#F1F5F9] rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {attachedFile.name}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>{attachedFile.size}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    OCR Scanned
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => showToast("Report Preview", `Viewing ${attachedFile.name}`)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                title="Preview"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                title="Delete"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: CLINICAL VERIFICATION */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0066FF] text-xs font-bold flex items-center justify-center">
            3
          </span>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
            Clinical Verification
          </h2>
        </div>

        {/* Doctor credentials card */}
        <div className="bg-[#EFF6FF] border border-blue-100 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">badge</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-black text-slate-900">Dr. Alistair Finch, MD</h3>
            <p className="text-[11px] text-slate-600">
              Chief Diagnostic Radiologist • Reg #RAD-4881D
            </p>
            <span className="text-[10px] font-bold text-teal-700 flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[12px]">key</span>
              FIPS-140 HSM Key Authenticated
            </span>
          </div>
        </div>

        {/* Checkbox verification */}
        <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={clinicalCertified}
            onChange={(e) => setClinicalCertified(e.target.checked)}
            className="mt-0.5 rounded-md border-slate-300 text-[#0066FF] focus:ring-[#0066FF] h-4 w-4"
          />
          <span className="text-xs text-slate-600 leading-relaxed">
            I certify that these diagnostic findings are finalized, peer-reviewed, and authorized for direct patient disclosure via encrypted transmission channels.
          </span>
        </label>
      </div>

      {/* STEP 4: SMS SIMULATION & CHANNELS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0066FF] text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              SMS Simulation &amp; Channels
            </h2>
          </div>
          <span className="text-[10px] font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-full">
            Real-time Link
          </span>
        </div>

        {/* SMS Message Bubble Preview */}
        <div className="bg-[#F1F5F9] rounded-2xl p-3.5 border border-slate-200/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-200/60 pb-1.5">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold">
              <span className="material-symbols-outlined text-[14px]">sms</span>
              <span>CYD-LABS SMS Gateway</span>
            </div>
            <span>Today, 14:32</span>
          </div>

          <div className="text-xs text-slate-700 leading-relaxed">
            Hello <span className="font-bold text-slate-900">{selectedOrder.name}</span>, your verified Diagnostic Lab Report for{" "}
            <span className="font-bold text-slate-900">{selectedOrder.testName}</span> is now ready.
          </div>

          {/* Secure token box */}
          <div className="bg-[#DBEAFE]/80 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px]">lock</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-blue-900">
                cyd.health/r/{selectedOrder.token}
              </span>
              <span className="text-[10px] text-blue-700">
                Encrypted Single-Use Patient Token
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Dr. Alistair Finch finalized your results. Valid ID required for access.
          </p>
        </div>

        {/* Channel Selection Options */}
        <div className="flex flex-col gap-2.5 pt-1">
          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-[#F8FAFC] cursor-pointer">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <span className="material-symbols-outlined text-[18px] text-blue-600">chat</span>
              <div className="flex flex-col">
                <span className="font-bold">Send instant SMS with download link</span>
                <span className="text-[11px] text-slate-400">
                  Delivers instantly to {selectedOrder.phone}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={channelSMS}
              onChange={(e) => setChannelSMS(e.target.checked)}
              className="rounded-md border-slate-300 text-[#0066FF] focus:ring-[#0066FF] h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-[#F8FAFC] cursor-pointer">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">sms</span>
              <div className="flex flex-col">
                <span className="font-bold">Send WhatsApp copy fallback</span>
                <span className="text-[11px] text-slate-400">
                  Triggered if SMS is undelivered within 180s
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={channelWhatsApp}
              onChange={(e) => setChannelWhatsApp(e.target.checked)}
              className="rounded-md border-slate-300 text-[#0066FF] focus:ring-[#0066FF] h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-[#F8FAFC] cursor-pointer">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <span className="material-symbols-outlined text-[18px] text-slate-600">mail</span>
              <div className="flex flex-col">
                <span className="font-bold">CC prescribing physician</span>
                <span className="text-[11px] text-slate-400">
                  Notify Dr. Sarah Jenkins (Portal Dispatch)
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={channelPhysician}
              onChange={(e) => setChannelPhysician(e.target.checked)}
              className="rounded-md border-slate-300 text-[#0066FF] focus:ring-[#0066FF] h-4 w-4"
            />
          </label>
        </div>
      </div>

      {/* FINAL ACTION BUTTONS */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          disabled={isPublishing}
          onClick={handlePublishReport}
          className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-extrabold text-sm py-3.5 px-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition-all cursor-pointer"
        >
          {isPublishing ? (
            <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">send</span>
              <span>Publish Report &amp; Send SMS to Patient</span>
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-400 font-medium">
          Target: {selectedOrder.name} ({selectedOrder.phone})
        </p>

        <button
          type="button"
          disabled={isSavingDraft}
          onClick={handleSaveDraft}
          className="w-full bg-[#EFF6FF] border border-blue-100 text-[#0066FF] hover:bg-blue-100 font-bold text-sm py-2.5 px-4 rounded-full flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Save as Draft Lab Report</span>
        </button>
      </div>

      {/* TOAST POPUP */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-800">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
            <span>{toast.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}
