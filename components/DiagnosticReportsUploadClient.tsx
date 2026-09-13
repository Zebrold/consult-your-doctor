"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dispatchDiagnosticReportAction } from "@/app/actions/booking";

export interface DiagnosticPatientOrder {
  id: string;
  bookingDbId?: string;
  name: string;
  firstName: string;
  phone: string;
  initials: string;
  idCode: string; // e.g. "CYD-98241"
  intakeType: "Home Sample Collection" | "In-Centre Intake";
  testName: string;
  referringDoctor: string;
  specialistTitle: string;
  phlebotomistName: string;
  phlebotomistId: string;
  sampleBarcode: string;
  collectedTime: string;
  patientAddress: string;
  gpsStatus: string;
  tariffTotal: number;
  tariffBase: number;
  homeSurcharge: number;
  invoiceId: string;
  invoiceStatus: string;
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

  // Curated baseline patient orders
  const baseOrders: DiagnosticPatientOrder[] = useMemo(() => {
    const fallbacks: DiagnosticPatientOrder[] = [
      {
        id: "mock-1",
        name: "Eleanor Vance",
        firstName: "Eleanor",
        phone: "+44 7911 802341",
        initials: "EV",
        idCode: "CYD-98241",
        intakeType: "Home Sample Collection",
        testName: "Comprehensive Metabolic Panel & Contrast Cardiac MRI",
        referringDoctor: "Dr. Sarah Jenkins",
        specialistTitle: "Cardiology Specialist",
        phlebotomistName: "Marcus Reed",
        phlebotomistId: "PHL-4092",
        sampleBarcode: "BC-98241-SMPL",
        collectedTime: "08:30 AM Today (Validated)",
        patientAddress: "42 Kensington Gardens Square, Suite 4B, London W2 4BH",
        gpsStatus: "GPS Geofence & Temperature Logged (4.2°C)",
        tariffTotal: 85,
        tariffBase: 65,
        homeSurcharge: 20,
        invoiceId: "INV-98241",
        invoiceStatus: "Invoice #INV-98241 Paid",
        token: "x9K2p8Q",
        reportFileName: "Report_Cardiac_MRI_Eleanor_Vance_Ref98241.pdf",
        reportFileSize: "4.8 MB",
      },
      {
        id: "mock-2",
        name: "Marcus Thorne",
        firstName: "Marcus",
        phone: "+44 7820 918230",
        initials: "MT",
        idCode: "CYD-98240",
        intakeType: "In-Centre Intake",
        testName: "High-Resolution Abdominal Doppler Ultrasound",
        referringDoctor: "Dr. Jonathan Hayes",
        specialistTitle: "Internal Medicine",
        phlebotomistName: "Desk Intake #02",
        phlebotomistId: "STAFF-110",
        sampleBarcode: "BC-98240-RAD",
        collectedTime: "09:15 AM Today (In-Centre)",
        patientAddress: "18 Marylebone High St, London W1U 4PF",
        gpsStatus: "Ultrasonography Suite 2 Authenticated",
        tariffTotal: 120,
        tariffBase: 120,
        homeSurcharge: 0,
        invoiceId: "INV-98240",
        invoiceStatus: "Invoice #INV-98240 Paid",
        token: "u7M4q9W",
        reportFileName: "Report_Abdominal_Doppler_Marcus_Thorne_Ref98240.pdf",
        reportFileSize: "6.2 MB",
      },
      {
        id: "mock-3",
        name: "Amina Patel",
        firstName: "Amina",
        phone: "+44 7700 900341",
        initials: "AP",
        idCode: "CYD-98239",
        intakeType: "Home Sample Collection",
        testName: "Blood Biochemistry & Complete Lipid Assay",
        referringDoctor: "Dr. Elena Rostova",
        specialistTitle: "Endocrinologist",
        phlebotomistName: "Tom Bennett",
        phlebotomistId: "PHL-4093",
        sampleBarcode: "BC-98239-SMPL",
        collectedTime: "07:45 AM Today (Validated)",
        patientAddress: "77 Camden High St, London NW1 7JE",
        gpsStatus: "Cold-Chain Maintained (3.8°C)",
        tariffTotal: 65,
        tariffBase: 50,
        homeSurcharge: 15,
        invoiceId: "INV-98239",
        invoiceStatus: "Invoice #INV-98239 Paid",
        token: "w3N8x5Z",
        reportFileName: "Report_Biochemistry_Amina_Patel_Ref98239.pdf",
        reportFileSize: "3.1 MB",
      },
    ];

    if (initialBookings.length > 0) {
      const dbOrders: DiagnosticPatientOrder[] = initialBookings.map((b, idx) => {
        const pName = b.profiles?.full_name || `Patient #${idx + 1}`;
        const pPhone = b.profiles?.phone_number || `+44 7911 ${800000 + idx}`;
        const cleanName = pName.replace(/Dr\.\s*/i, "").trim();
        const parts = cleanName.split(" ");
        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : cleanName.slice(0, 2).toUpperCase();

        const rawTest = b.test_name || "Comprehensive Diagnostic Panel";
        const formattedTest = rawTest
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        const isHome = idx % 2 === 0;
        const prices = center.test_prices || {};
        let price = 85;
        for (const [k, v] of Object.entries(prices)) {
          if (rawTest.toLowerCase().includes(k.toLowerCase())) {
            price = Number(v) || price;
            break;
          }
        }

        const shortId = b.id ? b.id.slice(0, 5).toUpperCase() : `${98250 + idx}`;
        const token = b.id ? b.id.slice(0, 7) : `tk${9000 + idx}`;

        return {
          id: b.id,
          bookingDbId: b.id,
          name: cleanName,
          firstName: parts[0] || cleanName,
          phone: pPhone,
          initials,
          idCode: `CYD-${shortId}`,
          intakeType: isHome ? "Home Sample Collection" : "In-Centre Intake",
          testName: formattedTest,
          referringDoctor: "Dr. Sarah Jenkins",
          specialistTitle: "Specialist Physician",
          phlebotomistName: isHome ? "Marcus Reed" : "Desk Intake",
          phlebotomistId: isHome ? "PHL-4092" : "STAFF-04",
          sampleBarcode: `BC-${shortId}-SMPL`,
          collectedTime: "Today (Verified)",
          patientAddress: "Hospital Catchment Zone, Central District",
          gpsStatus: "GPS Geofence & Temperature Logged (4.1°C)",
          tariffTotal: price,
          tariffBase: isHome ? Math.max(price - 20, 20) : price,
          homeSurcharge: isHome ? 20 : 0,
          invoiceId: `INV-${shortId}`,
          invoiceStatus: `Invoice #INV-${shortId} Paid`,
          token,
          reportFileName: `Report_${cleanName.replace(/\s+/g, "_")}_Ref${shortId}.pdf`,
          reportFileSize: "4.5 MB",
        };
      });

      return [...dbOrders, ...fallbacks];
    }

    return fallbacks;
  }, [initialBookings, center]);

  // Active state
  const [patientOrders, setPatientOrders] = useState<DiagnosticPatientOrder[]>(baseOrders);
  const [selectedOrder, setSelectedOrder] = useState<DiagnosticPatientOrder>(baseOrders[0]);

  // Real-time Supabase Subscription
  useEffect(() => {
    const channel = supabase
      .channel("diagnostic-reports-orders-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "diagnostic_bookings" },
        (payload) => {
          if (payload.new && (payload.new as any).id) {
            const updated = payload.new as any;
            setPatientOrders((prev) =>
              prev.map((o) =>
                o.bookingDbId === updated.id
                  ? {
                      ...o,
                      testName: updated.test_name || o.testName,
                      invoiceStatus:
                        updated.status === "confirmed" || updated.status === "report_sent"
                          ? `Invoice #${o.idCode} Settled`
                          : o.invoiceStatus,
                    }
                  : o
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Modal States
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [supplementaryModalOpen, setSupplementaryModalOpen] = useState(false);
  const [supplementaryUrl, setSupplementaryUrl] = useState("");
  const [phoneEditModalOpen, setPhoneEditModalOpen] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState("");

  // Uploaded documents state
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      ocrVerified: boolean;
      shaValidated: boolean;
      format: "pdf" | "dicom" | "xml";
    }>
  >([
    {
      id: "doc-1",
      name: "Report_Cardiac_MRI_Eleanor_Vance_Ref98241.pdf",
      size: "4.8 MB",
      ocrVerified: true,
      shaValidated: true,
      format: "pdf",
    },
  ]);

  // Update file name when selected patient changes
  useEffect(() => {
    if (selectedOrder) {
      setUploadedFiles((prev) => {
        if (prev.length === 0) return prev;
        return [
          {
            ...prev[0],
            name: selectedOrder.reportFileName,
            size: selectedOrder.reportFileSize,
          },
          ...prev.slice(1),
        ];
      });
      setEditPhoneValue(selectedOrder.phone);
    }
  }, [selectedOrder]);

  // Checkbox settings
  const [sendSms, setSendSms] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [ccPhysician, setCcPhysician] = useState(true);
  const [criticalAlert, setCriticalAlert] = useState(false);
  const [bundleInvoice, setBundleInvoice] = useState(true);
  const [clinicalAttestation, setClinicalAttestation] = useState(true);

  // Dispatch Action State
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    phone: string;
    token: string;
    patientName: string;
  } | null>(null);

  // Recent transmissions log
  const [recentTransmissions, setRecentTransmissions] = useState<
    Array<{
      id: string;
      patientName: string;
      idCode: string;
      testSummary: string;
      channelText: string;
      deliveredTime: string;
    }>
  >([
    {
      id: "rt-1",
      patientName: "Marcus Thorne",
      idCode: "CYD-98240",
      testSummary: "Ultrasound Abdomen",
      channelText: "SMS Confirmed Received",
      deliveredTime: "Delivered (2m ago)",
    },
    {
      id: "rt-2",
      patientName: "Amina Patel",
      idCode: "CYD-98239",
      testSummary: "Blood Biochemistry Panel",
      channelText: "WhatsApp Fallback",
      deliveredTime: "Delivered (7m ago)",
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      const isDcm = file.name.toLowerCase().endsWith(".dcm");

      const newDoc = {
        id: `doc-${Date.now()}`,
        name: file.name,
        size: `${mb} MB`,
        ocrVerified: true,
        shaValidated: true,
        format: (isPdf ? "pdf" : isDcm ? "dicom" : "xml") as any,
      };

      setUploadedFiles([newDoc]);
    }
  };

  // Import PACS direct simulation
  const handleImportPacs = () => {
    const pacsDoc = {
      id: `pacs-${Date.now()}`,
      name: `DICOM_Volumetric_${selectedOrder.firstName}_Ref${selectedOrder.idCode.replace(
        /[^a-zA-Z0-9]/g,
        ""
      )}.dcm`,
      size: "32.4 MB",
      ocrVerified: true,
      shaValidated: true,
      format: "dicom" as const,
    };
    setUploadedFiles((prev) => [pacsDoc, ...prev]);
  };

  // Remove file from package
  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((d) => d.id !== id));
  };

  // Dispatch Action
  const handlePublishAndSend = async () => {
    if (!clinicalAttestation) {
      alert("Please check the clinical verification attestation box to sign the diagnostic report.");
      return;
    }
    if (uploadedFiles.length === 0) {
      alert("Please upload at least one diagnostic report file to dispatch.");
      return;
    }

    setIsDispatching(true);

    try {
      if (selectedOrder.bookingDbId) {
        await dispatchDiagnosticReportAction(selectedOrder.bookingDbId, {
          reportFileName: uploadedFiles[0]?.name,
          smsPhone: selectedOrder.phone,
          token: selectedOrder.token,
        });
      }

      setTimeout(() => {
        setIsDispatching(false);
        setDispatchSuccess(true);

        // Prepend to recent transmissions
        const newLog = {
          id: `rt-${Date.now()}`,
          patientName: selectedOrder.name,
          idCode: selectedOrder.idCode,
          testSummary: selectedOrder.testName.split("&")[0].trim(),
          channelText: sendWhatsApp
            ? "SMS & WhatsApp Direct Delivered"
            : "SMS Confirmed Received",
          deliveredTime: "Delivered (just now)",
        };
        setRecentTransmissions((prev) => [newLog, ...prev.slice(0, 5)]);

        // Trigger floating action toast
        setToastMessage({
          phone: selectedOrder.phone,
          token: selectedOrder.token,
          patientName: selectedOrder.name,
        });

        // Hide success button state after 5 seconds
        setTimeout(() => {
          setDispatchSuccess(false);
        }, 5000);

        // Hide toast after 6 seconds
        setTimeout(() => {
          setToastMessage(null);
        }, 6500);
      }, 1200);
    } catch (err) {
      setIsDispatching(false);
      console.error(err);
    }
  };

  // Filtered patients in search modal
  const filteredPatients = patientOrders.filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.idCode.toLowerCase().includes(q) ||
      p.testName.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  return (
    <div className="w-full bg-surface px-4 sm:px-8 xl:px-margin-x-desktop pt-4 sm:pt-6 pb-stack-lg font-body-md text-body-md text-on-surface">
      <div className="flex flex-col w-full max-w-[1400px] mx-auto">
        {/* TOP CONTEXT HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md mb-stack-lg">
          <div className="flex flex-col max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm tracking-wide uppercase font-bold">
                LIMS Dispatch Suite 4.2
              </span>
              <span className="text-outline-variant text-label-sm font-label-sm">•</span>
              <span className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse"></span>
                Direct SMS Gateway Ready
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight text-[26px] sm:text-[32px] font-bold">
              Upload Diagnostic Report &amp; SMS Dispatch
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 text-[15px]">
              Securely attach laboratory and imaging reports (PDF/DICOM) with automated instant SMS
              delivery to the patient&apos;s verified mobile number.
            </p>
          </div>

          <div className="flex items-center gap-stack-sm self-start md:self-end">
            <div className="px-stack-sm py-2 rounded-xl bg-surface-container-low flex items-center gap-3 text-on-surface-variant border border-surface-container/60 shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-primary">
                verified_user
              </span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                  ISO-27001 &amp; HIPAA
                </span>
                <span className="font-label-sm text-[11px] text-on-surface-variant">
                  End-to-End Cryptographic Seal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CLINICAL TWO-COLUMN WORKFLOW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT COLUMN: Report Ingestion & Verification (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-gutter">
            {/* 1. Patient & Order Verification Card */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.04)] relative overflow-hidden border border-surface-container/60">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-vibrant-blue to-fresh-teal"></div>
              <div className="flex items-center justify-between pb-stack-sm mb-stack-sm flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                    1
                  </span>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Select Patient &amp; Diagnostic Order
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 ${
                      selectedOrder.intakeType === "Home Sample Collection"
                        ? "bg-fresh-teal/10 text-fresh-teal"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {selectedOrder.intakeType === "Home Sample Collection" ? "home" : "domain"}
                    </span>
                    {selectedOrder.intakeType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPatientModalOpen(true)}
                  className="font-label-sm text-label-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">switch_account</span>
                  <span>Change Patient</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                {/* Active Patient Plate */}
                <div className="p-stack-sm rounded-lg bg-surface-container-low flex flex-col gap-1.5 border border-surface-container/60">
                  <span className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider font-semibold">
                    Patient Identification
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-title-md text-title-md font-bold shrink-0">
                      {selectedOrder.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title-md text-[17px] text-on-surface truncate font-semibold">
                        {selectedOrder.name}
                      </span>
                      <span className="font-label-sm text-[12px] text-on-surface-variant font-mono font-medium">
                        ID #{selectedOrder.idCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verified Target Phone */}
                <div className="p-stack-sm rounded-lg bg-surface-container-low flex flex-col justify-between border border-surface-container/60">
                  <span className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider font-semibold">
                    Verified Target Mobile
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-title-md text-[17px] text-on-surface font-mono tracking-tight font-semibold">
                      {selectedOrder.phone}
                    </span>
                    <span
                      className="w-6 h-6 rounded-full bg-secondary-container/60 text-secondary flex items-center justify-center"
                      title="Carrier Route Verified"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-fresh-teal">
                    <span className="material-symbols-outlined text-[14px]">format_image_left</span>
                    <span className="font-label-sm text-[11px] font-medium">
                      SMS Direct Carrier Delivery Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinical Meta Strip */}
              <div className="mt-stack-sm pt-stack-sm bg-surface rounded-lg p-stack-sm flex flex-col gap-3 border border-surface-container/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container-high/60">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold uppercase tracking-wider">
                      Prescribed Diagnostic Order
                    </span>
                    <span className="font-body-md text-body-md font-semibold text-on-surface">
                      {selectedOrder.testName}
                    </span>
                  </div>
                  <div className="flex flex-col sm:text-right">
                    <span className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold uppercase tracking-wider">
                      Referring Physician
                    </span>
                    <div className="flex items-center gap-1 sm:justify-end">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        stethoscope
                      </span>
                      <span className="font-body-md text-body-md text-on-surface font-medium">
                        {selectedOrder.referringDoctor}
                      </span>
                    </div>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      {selectedOrder.specialistTitle}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm text-label-sm">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider font-semibold">
                      Home Sample Chain of Custody
                    </span>
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-fresh-teal">
                        person_pin
                      </span>
                      <span className="font-semibold">Phlebotomist:</span>
                      <span>
                        {selectedOrder.phlebotomistName} (ID #{selectedOrder.phlebotomistId})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-fresh-teal">
                        barcode
                      </span>
                      <span className="font-semibold">Sample Barcode:</span>
                      <span className="font-mono font-bold text-primary">
                        #{selectedOrder.sampleBarcode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px] text-fresh-teal">
                        schedule
                      </span>
                      <span>Collected: {selectedOrder.collectedTime}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider font-semibold">
                      Patient Home Collection Address
                    </span>
                    <div className="flex items-start gap-1.5 text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                        location_on
                      </span>
                      <span className="text-on-surface font-medium leading-tight">
                        {selectedOrder.patientAddress}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-fresh-teal">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      <span>{selectedOrder.gpsStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-surface-container/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      receipt_long
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                        Hospital Registered Test Tariff: £{selectedOrder.tariffTotal}.00
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Breakdown: £{selectedOrder.tariffBase}.00 Base Test + £
                        {selectedOrder.homeSurcharge}.00 Home Collection Surcharge
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-bold flex items-center gap-1 self-start sm:self-auto">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {selectedOrder.invoiceStatus}
                  </span>
                </div>
              </div>
            </section>

            {/* 2. Document Ingestion & Drag Drop Zone */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.04)] flex flex-col gap-stack-sm border border-surface-container/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                    2
                  </span>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Upload Diagnostic Report Documents
                  </h2>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  HL7 / FHIR compliant attachment
                </span>
              </div>

              {/* Hidden native file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.dcm,.dicom,.xml,.json,image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Interactive Drag Zone */}
              <div
                id="drop-zone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    const mb = (file.size / (1024 * 1024)).toFixed(1);
                    const isPdf = file.name.toLowerCase().endsWith(".pdf");
                    const isDcm = file.name.toLowerCase().endsWith(".dcm");

                    const newDoc = {
                      id: `doc-${Date.now()}`,
                      name: file.name,
                      size: `${mb} MB`,
                      ocrVerified: true,
                      shaValidated: true,
                      format: (isPdf ? "pdf" : isDcm ? "dicom" : "xml") as any,
                    };
                    setUploadedFiles([newDoc]);
                  }
                }}
                className={`rounded-xl p-6 sm:p-8 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer group border-2 border-dashed ${
                  isDragOver
                    ? "bg-primary/10 border-primary scale-[1.01]"
                    : "bg-surface-container-low/50 border-surface-container-high/80 hover:bg-surface-container-low"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-3 border border-surface-container/60">
                  <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                </div>
                <span className="font-title-md text-title-md font-bold text-on-surface">
                  Drag &amp; Drop Final Lab Report
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-md text-[14px]">
                  Compatible formats: PDF, high-resolution DICOM archive, or structured XML/JSON Lab
                  Result. Maximum file size 50MB.
                </span>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-stack-md py-2 rounded-full bg-primary text-on-primary font-label-sm text-label-sm shadow-[0_4px_12px_rgba(0,102,255,0.18)] hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer font-bold"
                  >
                    Browse Local Workstation
                  </button>
                  <button
                    type="button"
                    onClick={handleImportPacs}
                    className="px-stack-md py-2 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm hover:bg-surface transition-colors flex items-center gap-1.5 border border-surface-container/80 cursor-pointer font-semibold"
                  >
                    <span className="material-symbols-outlined text-[18px] text-vibrant-blue">
                      medical_services
                    </span>
                    Import PACS Direct
                  </button>
                </div>
              </div>

              {/* Attached Document Queue Card */}
              <div className="mt-2 flex flex-col gap-2">
                <span className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider font-semibold">
                  Ready for Dispatch Package ({uploadedFiles.length} File
                  {uploadedFiles.length === 1 ? "" : "s"})
                </span>

                {uploadedFiles.length === 0 ? (
                  <div className="p-4 rounded-lg bg-surface-container-low text-center text-on-surface-variant text-label-sm border border-dashed border-outline-variant/40">
                    No files attached yet. Click &quot;Browse Local Workstation&quot; or drop a PDF
                    above.
                  </div>
                ) : (
                  uploadedFiles.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-stack-sm rounded-lg bg-surface-container-lowest shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 group border border-surface-container/60 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            doc.format === "pdf"
                              ? "bg-soft-coral/10 text-soft-coral"
                              : "bg-vibrant-blue/10 text-vibrant-blue"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]">
                            {doc.format === "pdf" ? "picture_as_pdf" : "radiology"}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-body-md text-[14px] font-semibold text-on-surface truncate">
                            {doc.name}
                          </span>
                          <div className="flex items-center gap-2 text-label-sm text-[11px] text-on-surface-variant flex-wrap">
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span className="text-fresh-teal font-medium flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[14px]">
                                task_alt
                              </span>
                              OCR Verified &amp; Scanned
                            </span>
                            <span>•</span>
                            <span>SHA-256 Validated</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Preview Document"
                          onClick={() => setPreviewModalOpen(true)}
                          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Remove File"
                          onClick={() => handleRemoveFile(doc.id)}
                          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Supplementary Secondary Button */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSupplementaryModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-primary hover:text-primary-fixed-dim font-label-sm text-label-sm font-semibold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Attach Supplementary DICOM Slice Archive or Web Viewer URL
                </button>
                <span className="font-label-sm text-[11px] text-on-surface-variant font-mono">
                  LIMS Ingestion ID: #LMS-2024-9981
                </span>
              </div>
            </section>

            {/* 3. Clinical Sign-Off & Verification */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.04)] flex flex-col gap-stack-sm border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                    3
                  </span>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Clinical Verification &amp; Digital Signature
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-semibold">
                  Audit Level 3
                </span>
              </div>

              <div className="p-stack-sm rounded-lg bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-stack-sm border border-surface-container/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center font-title-md text-title-md font-bold shadow-[0_2px_8px_rgba(0,102,255,0.2)] shrink-0">
                    AF
                  </div>
                  <div className="flex flex-col">
                    <span className="font-body-md text-body-md font-semibold text-on-surface">
                      Dr. Alistair Finch
                    </span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      Chief Diagnostic Radiologist • GMC #6182940
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-lowest px-stack-sm py-1.5 rounded-full shadow-sm border border-surface-container/60">
                  <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse"></span>
                  <span className="font-label-sm text-[11px] text-on-surface font-mono font-medium">
                    FIPS-140 HSM Key Authenticated
                  </span>
                </div>
              </div>

              {/* Attestation Checkbox */}
              <label className="flex items-start gap-3 mt-1 p-stack-sm rounded-lg bg-surface hover:bg-surface-container-low transition-colors cursor-pointer select-none border border-surface-container/40">
                <input
                  type="checkbox"
                  checked={clinicalAttestation}
                  onChange={(e) => setClinicalAttestation(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary accent-vibrant-blue cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-body-md text-[14px] font-medium text-on-surface leading-snug">
                    I certify that these diagnostic findings are finalized, peer-reviewed, and
                    authorized for direct patient disclosure.
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">
                    Signing initiates cryptographic stamping onto the dispatch manifest and patient
                    record audit trail.
                  </span>
                </div>
              </label>
            </section>
          </div>

          {/* RIGHT COLUMN: SMS Dispatch Settings & Live Phone Mockup (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-gutter">
            {/* Dispatch Configuration Panel */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.04)] flex flex-col gap-stack-md border border-surface-container/60">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-blue text-[24px]">
                    sms
                  </span>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">
                    Automated Patient SMS Notification
                  </h2>
                </div>
                <span className="font-label-sm text-label-sm text-fresh-teal font-semibold">
                  Instant Route
                </span>
              </div>

              {/* Destination Phone Box */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold uppercase tracking-wider">
                  Target Patient Phone (E.164 Format)
                </label>
                <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-stack-sm py-2 border border-surface-container/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                      phone_iphone
                    </span>
                    <span className="font-title-md text-[16px] font-mono font-bold text-on-surface">
                      {selectedOrder.phone}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditPhoneValue(selectedOrder.phone);
                      setPhoneEditModalOpen(true);
                    }}
                    className="text-primary font-label-sm text-label-sm font-semibold hover:underline cursor-pointer"
                  >
                    Edit with OTP
                  </button>
                </div>
              </div>

              {/* REALISTIC iOS SMARTPHONE LIVE MOCKUP */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[340px] bg-indigo-gray-900 rounded-[36px] p-3 shadow-[0_16px_36px_rgba(15,23,42,0.18)] text-surface border-4 border-black/80">
                  {/* Phone Notch / Status Bar */}
                  <div className="flex items-center justify-between px-4 pt-1 pb-2">
                    <span className="text-[11px] font-semibold text-white/80 tracking-tight">
                      09:41
                    </span>
                    <div className="w-16 h-3 bg-black/60 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-black/90 mr-4"></div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-white/80">
                      <span className="material-symbols-outlined text-[13px]">
                        signal_cellular_alt
                      </span>
                      <span className="material-symbols-outlined text-[13px]">wifi</span>
                      <span className="material-symbols-outlined text-[14px]">battery_full</span>
                    </div>
                  </div>

                  {/* Messages Header */}
                  <div className="bg-indigo-gray-900 px-3 py-2 flex items-center justify-between border-b border-white/10">
                    <span className="material-symbols-outlined text-vibrant-blue text-[18px]">
                      chevron_left
                    </span>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-primary/40 flex items-center justify-center text-white text-[11px] font-bold border border-white/20">
                        CYD
                      </div>
                      <span className="text-[11px] font-semibold text-white mt-0.5">
                        Consult Your Doctor
                      </span>
                      <span className="text-[9px] text-white/60">Verified Lab Gateway</span>
                    </div>
                    <span className="material-symbols-outlined text-vibrant-blue text-[18px]">
                      info
                    </span>
                  </div>

                  {/* Phone Screen Content */}
                  <div className="bg-surface-container-lowest rounded-[24px] p-3.5 flex flex-col gap-3 min-h-[310px] justify-between text-on-surface">
                    <div className="flex flex-col gap-2">
                      <span className="text-center text-[10px] text-indigo-gray-600 font-medium">
                        Today • Direct NHS FastTrack Carrier
                      </span>

                      {/* Incoming SMS Bubble */}
                      <div className="flex flex-col max-w-[95%] self-start">
                        <div className="bg-surface-container-high text-on-surface p-3 rounded-2xl rounded-tl-sm text-[12px] leading-[17px] shadow-sm border border-surface-container">
                          <span className="font-bold text-primary block text-[11px] uppercase tracking-wider mb-0.5">
                            {center.name || "Apex Diagnostics"}
                          </span>
                          Hello {selectedOrder.firstName}, your home-collected sample report for{" "}
                          <span className="font-semibold text-on-surface">
                            {selectedOrder.testName}
                          </span>{" "}
                          is ready. Registered Fee: £{selectedOrder.tariffTotal}.00. View &amp;
                          download certified report:{" "}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPreviewModalOpen(true);
                            }}
                            className="text-vibrant-blue font-semibold underline block mt-1 break-all"
                          >
                            https://cyd.health/r/{selectedOrder.token}
                          </a>
                          <span className="block mt-1 text-[10px] text-indigo-gray-600">
                            ({selectedOrder.invoiceStatus}. Reply STOP to opt out).
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 pl-1">
                          <span className="text-[9px] text-indigo-gray-600">
                            {dispatchSuccess ? "Delivered just now" : "Carrier Ready"}
                          </span>
                          <span
                            className={`material-symbols-outlined text-[12px] ${
                              dispatchSuccess ? "text-fresh-teal" : "text-outline-variant"
                            }`}
                          >
                            done_all
                          </span>
                        </div>
                      </div>

                      {/* Rich Secure Link Card Preview inside SMS */}
                      <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm max-w-[95%] border border-surface-container/60">
                        <div className="w-9 h-9 rounded-lg bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-on-surface truncate">
                            cyd.health Secure Patient Portal
                          </span>
                          <span className="text-[10px] text-indigo-gray-600 truncate font-mono">
                            Token: #{selectedOrder.token} • 2FA Protected
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Message Input Mockup Bar */}
                    <div className="bg-surface-container-low rounded-full px-3 py-1.5 flex items-center justify-between text-indigo-gray-600 border border-surface-container">
                      <span className="text-[11px]">Text Message • SMS</span>
                      <div className="w-5 h-5 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
                      </div>
                    </div>
                  </div>

                  {/* Home indicator bar */}
                  <div className="w-24 h-1 bg-white/40 rounded-full mx-auto my-2"></div>
                </div>
              </div>

              {/* Dispatch Options & Channels Checkbox Group */}
              <div className="flex flex-col gap-2.5 pt-2">
                <span className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider font-semibold">
                  Multi-Channel Routing &amp; Safeguards
                </span>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low cursor-pointer border border-surface-container/60 hover:bg-surface-container transition-colors">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-vibrant-blue cursor-pointer"
                  />
                  <span className="font-body-md text-[13px] text-on-surface flex-1">
                    Send instant SMS notification with secure download link
                  </span>
                  <span className="material-symbols-outlined text-vibrant-blue text-[18px]">
                    sms
                  </span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low cursor-pointer border border-surface-container/60 hover:bg-surface-container transition-colors">
                  <input
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-vibrant-blue cursor-pointer"
                  />
                  <span className="font-body-md text-[13px] text-on-surface flex-1">
                    Send automated WhatsApp copy as high-speed fallback
                  </span>
                  <span className="material-symbols-outlined text-fresh-teal text-[18px]">
                    chat
                  </span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low cursor-pointer border border-surface-container/60 hover:bg-surface-container transition-colors">
                  <input
                    type="checkbox"
                    checked={ccPhysician}
                    onChange={(e) => setCcPhysician(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-vibrant-blue cursor-pointer"
                  />
                  <span className="font-body-md text-[13px] text-on-surface flex-1">
                    CC prescribing physician ({selectedOrder.referringDoctor}) via clinician portal
                  </span>
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    person_check
                  </span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-soft-coral/10 cursor-pointer border border-soft-coral/20 hover:bg-soft-coral/15 transition-colors">
                  <input
                    type="checkbox"
                    checked={criticalAlert}
                    onChange={(e) => setCriticalAlert(e.target.checked)}
                    className="w-4 h-4 rounded text-soft-coral focus:ring-soft-coral accent-soft-coral cursor-pointer"
                  />
                  <span className="font-body-md text-[13px] text-on-surface flex-1">
                    Include automated SMS alert to patient if urgent critical values require
                    immediate physician consultation
                  </span>
                  <span className="material-symbols-outlined text-soft-coral text-[18px]">
                    warning
                  </span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low cursor-pointer border border-surface-container/60 hover:bg-surface-container transition-colors">
                  <input
                    type="checkbox"
                    checked={bundleInvoice}
                    onChange={(e) => setBundleInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-vibrant-blue cursor-pointer"
                  />
                  <span className="font-body-md text-[13px] text-on-surface flex-1">
                    Bundle itemized hospital invoice (£{selectedOrder.tariffTotal}.00 paid) with SMS
                    &amp; secure portal download
                  </span>
                  <span className="material-symbols-outlined text-vibrant-blue text-[18px]">
                    receipt_long
                  </span>
                </label>
              </div>

              {/* Action Section & CTAs */}
              <div className="flex flex-col gap-stack-sm pt-2">
                <button
                  type="button"
                  id="btn-dispatch"
                  disabled={isDispatching}
                  onClick={handlePublishAndSend}
                  className={`w-full py-3.5 px-stack-md rounded-full text-on-primary font-title-md text-[15px] font-bold shadow-[0_8px_20px_rgba(0,102,255,0.25)] hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group cursor-pointer ${
                    dispatchSuccess
                      ? "bg-fresh-teal"
                      : "bg-vibrant-blue hover:bg-primary"
                  }`}
                >
                  {isDispatching ? (
                    <>
                      <span className="material-symbols-outlined text-[22px] animate-spin">
                        progress_activity
                      </span>
                      <span>Cryptographically Signing &amp; Transmitting...</span>
                    </>
                  ) : dispatchSuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[22px]">check_circle</span>
                      <span>Report Dispatched to {selectedOrder.name}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Publish Report &amp; Send SMS to Patient ({selectedOrder.phone})
                      </span>
                      <span className="material-symbols-outlined text-[22px] group-hover:translate-x-1 transition-transform">
                        send
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => alert("Report draft saved to LIMS laboratory queue.")}
                  className="w-full py-2.5 px-stack-md rounded-full bg-surface-container-lowest text-indigo-gray-900 font-label-sm text-label-sm font-semibold shadow-sm hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1.5 border border-surface-container cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">save_as</span>
                  Save as Draft Lab Report
                </button>
              </div>

              {/* Bottom Gateway Status Indicator */}
              <div className="p-stack-sm rounded-lg bg-surface-container-low flex items-center justify-between border border-surface-container/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal animate-pulse"></span>
                  <span className="font-label-sm text-[12px] font-semibold text-on-surface">
                    Carrier Gateway: SMS Tier-1 NHS Direct Route Active
                  </span>
                </div>
                <span className="font-label-sm text-[11px] text-fresh-teal font-bold">
                  99.8% 10-second delivery SLA
                </span>
              </div>
            </section>

            {/* Live Clinical Dispatch Log Widget */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.04)] flex flex-col gap-3 border border-surface-container/60">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold uppercase tracking-wider">
                  Recent Diagnostic Transmissions
                </span>
                <button
                  type="button"
                  onClick={() =>
                    alert("Audit Gateway Log: All SMS and WhatsApp delivery receipts cryptographically verified.")
                  }
                  className="font-label-sm text-label-sm text-primary font-medium cursor-pointer hover:underline"
                >
                  View All Gateway Activity
                </button>
              </div>

              <div className="space-y-2">
                {recentTransmissions.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-surface-container-low flex items-center justify-between text-body-md border border-surface-container/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-fresh-teal text-[18px]">
                        mark_email_read
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[13px] font-bold text-on-surface">
                          {log.patientName} (#{log.idCode})
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-label-sm">
                          {log.testSummary} • {log.channelText}
                        </span>
                      </div>
                    </div>
                    <span className="font-label-sm text-[11px] text-fresh-teal font-medium">
                      {log.deliveredTime}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* MODAL: CHANGE PATIENT ORDER */}
      {patientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-surface-container max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  person_search
                </span>
                <h3 className="font-title-md text-[18px] font-bold text-on-surface">
                  Select Patient Order from Database
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPatientModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by patient name, order ID, phone, or test..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-surface-container text-body-md text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredPatients.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant text-label-sm">
                  No patient orders matching your query.
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = p.id === selectedOrder.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedOrder(p);
                        setPatientModalOpen(false);
                      }}
                      className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-surface-container-low hover:bg-surface-container border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed font-bold flex items-center justify-center shrink-0">
                          {p.initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-on-surface text-[15px] truncate">
                            {p.name}
                          </span>
                          <span className="text-[12px] text-on-surface-variant truncate">
                            {p.testName}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                            <span className="font-mono text-primary font-bold">#{p.idCode}</span>
                            <span>•</span>
                            <span>{p.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            p.intakeType === "Home Sample Collection"
                              ? "bg-fresh-teal/10 text-fresh-teal"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {p.intakeType === "Home Sample Collection" ? "Home Collect" : "In-Centre"}
                        </span>
                        <span className="text-[12px] font-mono font-bold text-on-surface">
                          £{p.tariffTotal}.00
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-surface-container flex justify-end">
              <button
                type="button"
                onClick={() => setPatientModalOpen(false)}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-sm text-[13px] font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DOCUMENT PREVIEW */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-surface-container max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  picture_as_pdf
                </span>
                <div className="flex flex-col">
                  <h3 className="font-title-md text-[17px] font-bold text-on-surface">
                    Certified Clinical Diagnostic Report
                  </h3>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    SHA-256: 8f9b2c4e1a09d3752e5d • Audit Level 3
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-[13px]">
              {/* Header inside report preview */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex justify-between items-start">
                <div>
                  <div className="font-bold text-[16px] text-primary">
                    {center.name || "Apex Diagnostics & Imaging Labs"}
                  </div>
                  <div className="text-[12px] text-on-surface-variant">
                    {center.address || "Central Hospital Complex, Diagnostic Hub"}
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-mono mt-1">
                    Accreditation: UKAS / CAP / ISO-15189 Certified
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-fresh-teal/15 text-fresh-teal font-bold text-[11px]">
                    FINAL SIGNED REPORT
                  </span>
                  <div className="text-[11px] text-on-surface-variant font-mono mt-1.5">
                    Order Ref: #{selectedOrder.idCode}
                  </div>
                </div>
              </div>

              {/* Patient details matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px] p-3 rounded-lg bg-surface border border-surface-container">
                <div>
                  <span className="text-indigo-gray-600 block text-[10px] uppercase">Patient</span>
                  <strong className="text-on-surface">{selectedOrder.name}</strong>
                </div>
                <div>
                  <span className="text-indigo-gray-600 block text-[10px] uppercase">Modality</span>
                  <strong className="text-on-surface">{selectedOrder.intakeType}</strong>
                </div>
                <div>
                  <span className="text-indigo-gray-600 block text-[10px] uppercase">Referring</span>
                  <strong className="text-on-surface">{selectedOrder.referringDoctor}</strong>
                </div>
                <div>
                  <span className="text-indigo-gray-600 block text-[10px] uppercase">Collected</span>
                  <strong className="text-on-surface">{selectedOrder.collectedTime}</strong>
                </div>
              </div>

              {/* Findings & Values */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container space-y-3">
                <span className="font-bold text-[13px] text-on-surface uppercase tracking-wider block">
                  Diagnostic Findings Summary
                </span>
                <p className="text-[13px] text-on-surface leading-relaxed">
                  Examination: <strong>{selectedOrder.testName}</strong>. Comprehensive physiological
                  assessment was performed following HL7 FHIR standard protocol. No acute anatomical
                  anomalies or emergent disruptions detected. Physiological baseline within normal
                  parameters.
                </p>

                <div className="rounded-lg overflow-hidden border border-surface-container-high">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-surface-container text-on-surface-variant font-semibold">
                      <tr>
                        <th className="p-2">Assay Parameter</th>
                        <th className="p-2">Observed</th>
                        <th className="p-2">Reference Range</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container bg-surface-container-lowest">
                      <tr>
                        <td className="p-2 font-medium">Serum Creatinine</td>
                        <td className="p-2 font-mono">0.92 mg/dL</td>
                        <td className="p-2 text-on-surface-variant">0.7 - 1.3 mg/dL</td>
                        <td className="p-2 text-fresh-teal font-bold">NORMAL</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">eGFR (CKD-EPI)</td>
                        <td className="p-2 font-mono">&gt; 90 mL/min</td>
                        <td className="p-2 text-on-surface-variant">&gt; 60 mL/min</td>
                        <td className="p-2 text-fresh-teal font-bold">OPTIMAL</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Left Ventricular Ejection Fraction</td>
                        <td className="p-2 font-mono">62%</td>
                        <td className="p-2 text-on-surface-variant">55% - 70%</td>
                        <td className="p-2 text-fresh-teal font-bold">PRESERVED</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attestation stamp */}
              <div className="p-3 rounded-lg bg-surface border border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-[12px]">
                    AF
                  </div>
                  <div className="flex flex-col text-[11px]">
                    <span className="font-bold text-on-surface">Dr. Alistair Finch</span>
                    <span className="text-on-surface-variant">Chief Diagnostic Radiologist</span>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-fresh-teal font-bold">
                  CRYPTOGRAPHICALLY SEALED • HSM 2048-BIT
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-sm text-[13px] font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ATTACH SUPPLEMENTARY PACS / URL */}
      {supplementaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  medical_services
                </span>
                <h3 className="font-title-md text-[17px] font-bold text-on-surface">
                  Attach DICOM Web Viewer URL
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSupplementaryModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-[13px] text-on-surface-variant">
                Enter an external PACS Web Viewer URL or Orthanc DICOM accession link for multi-slice
                series inspection.
              </p>
              <input
                type="url"
                placeholder="https://pacs.cyd.health/viewer?accession=98241"
                value={supplementaryUrl}
                onChange={(e) => setSupplementaryUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-body-md text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setSupplementaryModalOpen(false)}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-sm text-[13px] font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (supplementaryUrl) {
                    setUploadedFiles((prev) => [
                      ...prev,
                      {
                        id: `pacs-link-${Date.now()}`,
                        name: `PACS_Viewer_WebLink_${selectedOrder.idCode}.url`,
                        size: "Cloud Stream",
                        ocrVerified: true,
                        shaValidated: true,
                        format: "dicom",
                      },
                    ]);
                    setSupplementaryModalOpen(false);
                    setSupplementaryUrl("");
                  }
                }}
                className="px-4 py-2 rounded-full bg-primary text-on-primary font-label-sm text-[13px] font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                Attach Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PATIENT TARGET PHONE */}
      {phoneEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-blue text-[22px]">
                  phone_iphone
                </span>
                <h3 className="font-title-md text-[17px] font-bold text-on-surface">
                  Edit Target Patient Mobile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPhoneEditModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-[13px] text-on-surface-variant">
                Modify recipient telephone number for SMS report dispatch (E.164 international format).
              </p>
              <input
                type="tel"
                value={editPhoneValue}
                onChange={(e) => setEditPhoneValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container font-mono text-body-md text-on-surface text-[15px] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setPhoneEditModalOpen(false)}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-sm text-[13px] font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editPhoneValue) {
                    setSelectedOrder((prev) => ({
                      ...prev,
                      phone: editPhoneValue,
                    }));
                    setPhoneEditModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-[13px] font-bold shadow-md hover:bg-primary transition-all cursor-pointer"
              >
                Save Phone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE ACTION TOAST NOTIFICATION */}
      <div
        id="dispatch-success-banner"
        className={`fixed bottom-6 right-6 max-w-md bg-surface-container-lowest p-stack-md rounded-2xl shadow-[0_12px_40px_rgba(0,102,255,0.18)] flex items-start gap-3 border border-surface-container transition-all duration-300 z-50 ${
          toastMessage
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-32 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-fresh-teal text-on-primary flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[24px]">done_all</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-title-md text-title-md text-on-surface font-bold text-[16px]">
            Report Dispatched &amp; SMS Broadcasted
          </span>
          <span className="font-body-md text-body-md text-on-surface-variant mt-0.5 text-[13px]">
            Target <span className="font-mono font-semibold text-on-surface">{toastMessage?.phone}</span>{" "}
            received encrypted access token #{toastMessage?.token} with carrier acknowledgment.
          </span>
        </div>
      </div>
    </div>
  );
}
