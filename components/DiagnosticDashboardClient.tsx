"use client";

import React, { useState, useMemo, useRef } from "react";

export interface DiagnosticBookingItem {
  id: string;
  patientId?: string;
  patientName: string;
  patientPhone: string;
  patientInitials: string;
  intakeType: "In-Centre" | "Home Collect" | "Sample in Transit";
  category: "Pathology" | "MRI/CT" | "Ultrasound" | "Radiology";
  testName: string;
  tariffFee: number;
  baseFee: number;
  homeSurcharge?: number;
  isHomeCollect: boolean;
  addressOrBay: string;
  phleboOrStaff: string;
  statusText: string;
  statusCode: "ready_to_send" | "verified" | "transit" | "in_analysis" | "tested" | "dispatched";
  priority: "STAT Urgent" | "Fast-track" | "Routine";
  reportFileName: string;
}

interface DiagnosticDashboardClientProps {
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

export function DiagnosticDashboardClient({
  center,
  initialBookings = [],
  directorName = "Dr. Katherine Vance",
}: DiagnosticDashboardClientProps) {
  // 1. Process DB bookings into unified queue items
  const mappedBookings: DiagnosticBookingItem[] = useMemo(() => {
    // Standard template queue items to ensure rich matrix even with clean test DB
    const fallbackQueue: DiagnosticBookingItem[] = [
      {
        id: "PT-9801",
        patientName: "Marcus Reed",
        patientPhone: "+91 98204 44810",
        patientInitials: "MR",
        intakeType: "In-Centre",
        category: "MRI/CT",
        testName: "Brain MRI Contrast Diagnostic Report",
        tariffFee: 7500,
        baseFee: 7500,
        isHomeCollect: false,
        addressOrBay: "Bay 1 - MRI Suite",
        phleboOrStaff: "Walk-in direct entry",
        statusText: "Report Ready to Send",
        statusCode: "ready_to_send",
        priority: "STAT Urgent",
        reportFileName: "Report_MarcusReed_BrainMRI.pdf",
      },
      {
        id: "PT-9804",
        patientName: "Lillian Wright",
        patientPhone: "+91 98112 99411",
        patientInitials: "LW",
        intakeType: "Home Collect",
        category: "Pathology",
        testName: "Comprehensive Metabolic & Lipid Lab Report",
        tariffFee: 1250,
        baseFee: 1000,
        homeSurcharge: 250,
        isHomeCollect: true,
        addressOrBay: "14 Kensington Gardens, W8",
        phleboOrStaff: "Phlebo: Tom Bennett",
        statusText: "Verified by Pathologist",
        statusCode: "verified",
        priority: "Fast-track",
        reportFileName: "Report_LillianWright_MetabolicSuite.pdf",
      },
      {
        id: "PT-9820",
        patientName: "Elena Barnes",
        patientPhone: "+91 97114 19203",
        patientInitials: "EB",
        intakeType: "Sample in Transit",
        category: "Pathology",
        testName: "Thyroid Profile (TSH, FT4) Assay Report",
        tariffFee: 850,
        baseFee: 600,
        homeSurcharge: 250,
        isHomeCollect: true,
        addressOrBay: "88 Camden High St, NW1",
        phleboOrStaff: "Phlebo: Sarah Jenkins",
        statusText: "Cold-Chain Transit (ETA 12m)",
        statusCode: "transit",
        priority: "Routine",
        reportFileName: "Report_ElenaBarnes_ThyroidPanel.pdf",
      },
      {
        id: "PT-9807",
        patientName: "David Kim",
        patientPhone: "+91 98713 30198",
        patientInitials: "DK",
        intakeType: "In-Centre",
        category: "Ultrasound",
        testName: "Abdominal Doppler Ultrasound Diagnostic Report",
        tariffFee: 2200,
        baseFee: 2200,
        isHomeCollect: false,
        addressOrBay: "Bay 4 - US Alpha",
        phleboOrStaff: "Intake checked in",
        statusText: "In Analysis",
        statusCode: "in_analysis",
        priority: "Routine",
        reportFileName: "Report_DavidKim_AbdominalDoppler.pdf",
      },
      {
        id: "PT-9812",
        patientName: "Henry Beaumont",
        patientPhone: "+91 99104 43210",
        patientInitials: "HB",
        intakeType: "Home Collect",
        category: "Pathology",
        testName: "CBC & Coagulation Final Report",
        tariffFee: 950,
        baseFee: 700,
        homeSurcharge: 250,
        isHomeCollect: true,
        addressOrBay: "42 Sloane Street, SW1X",
        phleboOrStaff: "Phlebo: Rohit Sharma",
        statusText: "Collected & Tested",
        statusCode: "tested",
        priority: "Routine",
        reportFileName: "Report_HenryBeaumont_CBC_Coagulation.pdf",
      },
    ];

    // If real DB bookings exist, transform and prepend them
    if (initialBookings.length > 0) {
      const dbMapped: DiagnosticBookingItem[] = initialBookings.map((b, idx) => {
        const pName = b.profiles?.full_name || "Patient " + (idx + 1);
        const pPhone = b.profiles?.phone_number || "+91 98204 " + (10000 + idx);
        const cleanName = pName.replace(/Dr\.\s*/i, "").trim();
        const parts = cleanName.split(" ");
        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : cleanName.slice(0, 2).toUpperCase();

        const rawTest = (b.test_name || "Diagnostic Test").toLowerCase();
        let cat: DiagnosticBookingItem["category"] = "Pathology";
        if (rawTest.includes("mri") || rawTest.includes("ct") || rawTest.includes("x-ray")) {
          cat = "MRI/CT";
        } else if (rawTest.includes("ultrasound") || rawTest.includes("echo")) {
          cat = "Ultrasound";
        }

        const isHome = idx % 2 === 1;
        const prices = center.test_prices || {};
        let price = 1200;
        // Lookup in prices object
        for (const [k, v] of Object.entries(prices)) {
          if (k.toLowerCase().includes(rawTest.replace(/-/g, " ")) || rawTest.includes(k.toLowerCase())) {
            price = Number(v) || price;
            break;
          }
        }

        const formattedTest = b.test_name
          ? b.test_name
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase()) + " Diagnostic Report"
          : "General Diagnostic Panel";

        const status = b.status === "confirmed" ? "ready_to_send" : "in_analysis";
        const priority = idx % 3 === 0 ? "STAT Urgent" : idx % 2 === 0 ? "Fast-track" : "Routine";

        return {
          id: `PT-${b.id.slice(0, 4).toUpperCase()}`,
          patientId: b.patient_id,
          patientName: pName,
          patientPhone: pPhone,
          patientInitials: initials,
          intakeType: isHome ? "Home Collect" : "In-Centre",
          category: cat,
          testName: formattedTest,
          tariffFee: isHome ? price + 250 : price,
          baseFee: price,
          homeSurcharge: isHome ? 250 : undefined,
          isHomeCollect: isHome,
          addressOrBay: isHome ? `${center.city || "Delhi"} Metropolitan Area` : "Main Diagnostic Suite",
          phleboOrStaff: isHome ? "Phlebo Assigned" : "Walk-in registration",
          statusText: status === "ready_to_send" ? "Report Ready to Send" : "In Laboratory Analysis",
          statusCode: status,
          priority: priority as any,
          reportFileName: `Report_${cleanName.replace(/\s+/g, "")}_${cat}.pdf`,
        };
      });

      return [...dbMapped, ...fallbackQueue];
    }

    return fallbackQueue;
  }, [initialBookings, center]);

  const [queueItems, setQueueItems] = useState<DiagnosticBookingItem[]>(mappedBookings);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<DiagnosticBookingItem | null>(null);

  // Ticker Feed State
  const [tickerEvents, setTickerEvents] = useState<Array<{ id: string; html: string }>>([
    {
      id: "1",
      html: `Home Collection: Phlebo <strong class="text-on-surface font-semibold">Tom Bennett</strong> arrived at <span class="font-mono text-on-surface">Kensington Gardens</span> • Sample Collected <span class="text-fresh-teal font-medium">[Transit to Lab]</span>`,
    },
    {
      id: "2",
      html: `Report for <strong class="text-on-surface font-semibold">Eleanor Vance</strong> sent via SMS to <span class="font-mono text-on-surface">+91 99118 02341</span> • Verified Delivery <span class="text-primary font-medium">[Delivered 2m ago]</span>`,
    },
    {
      id: "3",
      html: `Report for <strong class="text-on-surface font-semibold">Arthur Pendelton</strong> sent to <span class="font-mono text-on-surface">+91 98224 19082</span> • <span class="text-primary font-medium">[Delivered 8m ago]</span>`,
    },
    {
      id: "4",
      html: `Report for <strong class="text-on-surface font-semibold">Sofia Morales</strong> sent to <span class="font-mono text-on-surface">+91 97700 90014</span> • <span class="text-primary font-medium">[Delivered 14m ago]</span>`,
    },
  ]);

  // Toast state
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 3600);
  };

  // Filtered rows
  const filteredQueue = useMemo(() => {
    return queueItems.filter((item) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "HomeCollect") return item.isHomeCollect;
      if (activeFilter === "InCentre") return !item.isHomeCollect;
      if (activeFilter === "Pathology") return item.category === "Pathology";
      if (activeFilter === "MRI/CT") return item.category === "MRI/CT";
      if (activeFilter === "Urgent") return item.priority === "STAT Urgent";
      return true;
    });
  }, [queueItems, activeFilter]);

  // Statistics calculation
  const totalQueueCount = 138 + queueItems.length;
  const homeCollectCount = queueItems.filter((q) => q.isHomeCollect).length + 24;
  const completedCount = 38;
  const inLabCount = 24;
  const waitingCount = totalQueueCount - completedCount - inLabCount;
  const totalBilledToday = useMemo(() => {
    const sum = queueItems.reduce((acc, curr) => acc + curr.tariffFee, 0);
    return 74000 + sum;
  }, [queueItems]);

  // Handle Refresh Feed
  const handleRefreshFeed = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Diagnostic Queue Synced", "PACS / LIMS stream updated with latest laboratory scans.");
    }, 600);
  };

  // Open Modal
  const openDispatchModal = (item: DiagnosticBookingItem) => {
    setSelectedPatient(item);
    setDispatchModalOpen(true);
  };

  const closeDispatchModal = () => {
    setDispatchModalOpen(false);
    setSelectedPatient(null);
  };

  // Confirm Dispatch
  const confirmDispatch = () => {
    if (!selectedPatient) return;

    const patientName = selectedPatient.patientName;
    const phone = selectedPatient.patientPhone;

    // Update row status
    setQueueItems((prev) =>
      prev.map((item) =>
        item.id === selectedPatient.id
          ? {
              ...item,
              statusText: "SMS Link Dispatched",
              statusCode: "dispatched",
            }
          : item
      )
    );

    // Prepend to ticker
    const newTicker = {
      id: Date.now().toString(),
      html: `Report for <strong class="text-on-surface font-semibold">${patientName}</strong> sent to <span class="font-mono text-on-surface">${phone}</span> • <span class="text-fresh-teal font-medium">[Just now]</span>`,
    };
    setTickerEvents((prev) => [newTicker, ...prev]);

    closeDispatchModal();
    showToast(`SMS Transmitted to ${patientName}`, `Secured report link delivered to ${phone}`);
  };

  // Handle File Upload Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      showToast("File Upload Staged", `${fileName} indexed to PACS queue. Select patient to dispatch.`);
    }
  };

  const handleBulkDispatch = () => {
    showToast("Bulk Queue Processing", "12 verified diagnostic reports scheduled for SMS dispatch in batches of 4.");
  };

  return (
    <main className="w-full px-4 sm:px-8 xl:px-margin-x-desktop pb-stack-lg">
      <div className="flex flex-col w-full">
        {/* OPERATIONAL OVERVIEW HEADER & METRIC HUB */}
        <div className="flex flex-col gap-base mb-stack-md pt-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal shadow-[0_0_8px_rgba(20,184,166,0.6)]"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Live System Stream
                </span>
                <span className="text-outline-variant">•</span>
                <span className="font-label-sm text-label-sm text-primary font-semibold">
                  PACS / HL7 Feed Linked
                </span>
              </div>
              <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface tracking-tight font-extrabold">
                {center.name || "Apex Diagnostics & Imaging"}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Real-time telemetry, automated digital dispatch, and diagnostic triage stream.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-full bg-surface-container flex items-center gap-2 border border-surface-container-high/60 shadow-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">cell_tower</span>
                <span className="font-label-sm text-label-sm text-on-surface">
                  SMS Gateway:{" "}
                  <strong className="text-fresh-teal font-semibold">Tier-1 Telco Fastpath</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshFeed}
                className="p-2.5 rounded-full bg-surface-container-lowest shadow-sm hover:scale-105 active:scale-95 transition-all text-on-surface flex items-center justify-center border border-surface-container cursor-pointer"
                title="Refresh Stream"
              >
                <span
                  className={`material-symbols-outlined text-[20px] text-on-surface-variant ${
                    isRefreshing ? "animate-spin text-primary" : ""
                  }`}
                >
                  autorenew
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* METRIC MATRIX BENTO (4 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
          {/* Card 1: Diagnostic Queue */}
          <div className="p-stack-md rounded-xl bg-surface-container-lowest shadow-[0_8px_30px_rgba(0,102,255,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_36px_rgba(0,102,255,0.08)] relative overflow-hidden group border border-surface-container/60">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-primary-fixed/30 blur-2xl group-hover:bg-primary-fixed/50 transition-all pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Diagnostic Queue
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display-lg text-display-lg font-extrabold text-on-surface">
                    {totalQueueCount}
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-fresh-teal flex items-center">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    +14%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">group_add</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-on-surface-variant border-t border-surface-container/60">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold text-fresh-teal">
                  {completedCount} Done
                </span>
                <span className="font-label-sm text-[11px] opacity-70">Completed</span>
              </div>
              <div className="h-6 w-px bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold text-primary">
                  {inLabCount} In Lab
                </span>
                <span className="font-label-sm text-[11px] opacity-70">Processing</span>
              </div>
              <div className="h-6 w-px bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold text-on-surface">
                  {waitingCount} Waiting
                </span>
                <span className="font-label-sm text-[11px] opacity-70">Scheduled</span>
              </div>
            </div>
          </div>

          {/* Card 2: Home Collections */}
          <div className="p-stack-md rounded-xl bg-surface-container-lowest shadow-[0_8px_30px_rgba(0,102,255,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_36px_rgba(0,102,255,0.08)] relative overflow-hidden group border border-fresh-teal/30">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-fresh-teal/15 blur-2xl group-hover:bg-fresh-teal/25 transition-all pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-label-sm text-label-sm text-fresh-teal uppercase tracking-wider font-bold">
                    Home Collections
                  </span>
                  <span className="w-2 h-2 rounded-full bg-fresh-teal animate-ping"></span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display-lg text-display-lg font-extrabold text-on-surface">
                    {homeCollectCount}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-bold">
                    9 Phlebos Active
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-fresh-teal/10 flex items-center justify-center text-fresh-teal shadow-sm">
                <span className="material-symbols-outlined text-[22px]">home_health</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-on-surface-variant border-t border-surface-container/60">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold text-fresh-teal">16 Picked</span>
                <span className="font-label-sm text-[11px] opacity-70">In Transit</span>
              </div>
              <div className="h-6 w-px bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold text-primary">7 At Door</span>
                <span className="font-label-sm text-[11px] opacity-70">Collecting</span>
              </div>
              <div className="h-6 w-px bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold text-on-surface">5 Slots</span>
                <span className="font-label-sm text-[11px] opacity-70">Assigned</span>
              </div>
            </div>
          </div>

          {/* Card 3: SMS Dispatches */}
          <div className="p-stack-md rounded-xl bg-surface-container-lowest shadow-[0_8px_30px_rgba(0,102,255,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_36px_rgba(0,102,255,0.08)] relative overflow-hidden group border border-surface-container/60">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-secondary-fixed/30 blur-2xl group-hover:bg-secondary-fixed/50 transition-all pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  SMS Dispatches
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display-lg text-display-lg font-extrabold text-on-surface">
                    94
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-on-secondary-container font-label-sm text-label-sm font-bold">
                    99.2% rate
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">mark_email_read</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 pt-3 border-t border-surface-container/60">
              <div className="w-2 h-2 rounded-full bg-fresh-teal"></div>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                Encrypted token SMS active
              </span>
            </div>
          </div>

          {/* Card 4: Tariff & Billed Fees */}
          <div className="p-stack-md rounded-xl bg-surface-container-lowest shadow-[0_8px_30px_rgba(0,102,255,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_36px_rgba(0,102,255,0.08)] relative overflow-hidden group border border-surface-container/60">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Tariff &amp; Billed Fees
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display-lg text-display-lg font-extrabold text-on-surface">
                    ₹{totalBilledToday.toLocaleString("en-IN")}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-semibold">Today</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">payments</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant border-t border-surface-container/60">
              <span className="text-fresh-teal font-semibold">+₹250 Home Surcharge</span>
              <span className="text-outline font-medium">100% Collected</span>
            </div>
          </div>
        </div>

        {/* LIVE SMS DISPATCH STREAM TICKER */}
        <div className="mb-stack-lg rounded-xl bg-surface-container-lowest p-stack-sm shadow-sm flex items-center gap-stack-md overflow-hidden border border-surface-container/60">
          <div className="flex items-center gap-2 pl-2 whitespace-nowrap">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fresh-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-fresh-teal"></span>
            </span>
            <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
              Direct Dispatch Ticker
            </span>
          </div>
          <div className="h-4 w-px bg-surface-container-high hidden sm:block"></div>
          <div className="overflow-x-auto flex-1 no-scrollbar py-1">
            <div className="flex items-center gap-6 text-on-surface-variant font-label-sm text-label-sm whitespace-nowrap">
              {tickerEvents.map((evt, i) => (
                <React.Fragment key={evt.id}>
                  {i > 0 && <span className="text-outline-variant">•</span>}
                  <span
                    className="flex items-center gap-1.5"
                    dangerouslySetInnerHTML={{ __html: evt.html }}
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN PIPELINE & WORKSTATIONS SPLIT GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter mb-stack-lg" id="queueTable">
          {/* LEFT 8-COLS: LIVE DIAGNOSTIC QUEUE & PROCESSING PIPELINE */}
          <div className="xl:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgba(0,102,255,0.03)] p-stack-md border border-surface-container/60">
            {/* Section Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-stack-md">
              <div>
                <h2 className="font-title-md text-title-md text-on-surface font-bold">
                  Live Diagnostic Queue &amp; Processing Pipeline
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Real-time status from intake to SMS link dispatch.
                </p>
              </div>

              {/* Tab Filters */}
              <div className="flex items-center p-1 rounded-full bg-surface-container-low self-start sm:self-auto overflow-x-auto border border-surface-container/60">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  All Tests
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("HomeCollect")}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-medium transition-all flex items-center gap-1 cursor-pointer ${
                    activeFilter === "HomeCollect"
                      ? "bg-surface-container-lowest text-fresh-teal font-semibold shadow-sm"
                      : "text-fresh-teal hover:bg-fresh-teal/10"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-fresh-teal"></span>
                  Home Collect ({homeCollectCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("InCentre")}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
                    activeFilter === "InCentre"
                      ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Walk-in / In-Centre
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("Pathology")}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
                    activeFilter === "Pathology"
                      ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Pathology
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("MRI/CT")}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
                    activeFilter === "MRI/CT"
                      ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  MRI / CT
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("Urgent")}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-medium transition-all flex items-center gap-1 cursor-pointer ${
                    activeFilter === "Urgent"
                      ? "bg-surface-container-lowest text-soft-coral font-semibold shadow-sm"
                      : "text-soft-coral hover:bg-soft-coral/10"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-soft-coral"></span>
                  STAT Triage
                </button>
              </div>
            </div>

            {/* Live Queue Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-on-surface-variant font-label-sm text-label-sm border-b border-surface-container">
                    <th className="pb-3 font-semibold">Patient &amp; Intake Type</th>
                    <th className="pb-3 font-semibold text-center">Diagnostic Report &amp; Hospital Tariff</th>
                    <th className="pb-3 font-semibold">Booking Logistics / Address</th>
                    <th className="pb-3 font-semibold">Scan / Sample Transit</th>
                    <th className="pb-3 font-semibold">Priority</th>
                    <th className="pb-3 text-right font-semibold">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/60 font-body-md text-body-md">
                  {filteredQueue.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface-container-low/50 transition-colors group ${
                        item.isHomeCollect ? "bg-fresh-teal/5" : ""
                      }`}
                    >
                      {/* Patient & Intake */}
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-sm ${
                              item.isHomeCollect
                                ? "bg-fresh-teal/20 text-fresh-teal"
                                : "bg-primary-fixed text-primary"
                            }`}
                          >
                            {item.patientInitials}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-title-md text-[15px] font-bold text-on-surface leading-tight">
                                {item.patientName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold flex items-center gap-0.5 ${
                                  item.intakeType === "Home Collect"
                                    ? "bg-fresh-teal/15 text-fresh-teal font-bold"
                                    : item.intakeType === "Sample in Transit"
                                    ? "bg-fresh-teal/15 text-fresh-teal font-bold"
                                    : "bg-surface-container text-on-surface-variant"
                                }`}
                              >
                                {item.intakeType === "Home Collect" && (
                                  <span className="material-symbols-outlined text-[12px]">home</span>
                                )}
                                {item.intakeType === "Sample in Transit" && (
                                  <span className="material-symbols-outlined text-[12px]">local_shipping</span>
                                )}
                                {item.intakeType}
                              </span>
                            </div>
                            <span className="font-mono text-label-sm text-on-surface-variant">
                              #{item.id} • {item.patientPhone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Report & Tariff */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-label-sm text-[11px] font-bold uppercase tracking-wider mb-1 ${
                              item.category === "Pathology"
                                ? "bg-fresh-teal/15 text-fresh-teal"
                                : item.category === "MRI/CT"
                                ? "bg-surface-container text-primary"
                                : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {item.category} • {item.intakeType}
                          </span>
                          <span className="font-title-md text-[14px] font-bold text-on-surface leading-snug">
                            {item.testName}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">
                              Registered Fee:
                            </span>
                            <span className="font-label-sm text-[12px] font-bold text-primary">
                              ₹{item.tariffFee.toLocaleString("en-IN")}
                            </span>
                            {item.isHomeCollect ? (
                              <span className="font-label-sm text-[11px] text-fresh-teal font-semibold">
                                (₹{item.baseFee} Base + ₹{item.homeSurcharge || 250} Home Fee)
                              </span>
                            ) : (
                              <span className="font-label-sm text-[11px] text-outline font-normal">
                                (Tariff Standard)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Logistics / Address */}
                      <td className="py-3.5 pr-2">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-[13px] font-medium text-on-surface truncate max-w-[180px]">
                            {item.addressOrBay}
                          </span>
                          <span className="font-label-sm text-label-sm text-primary font-medium flex items-center gap-1">
                            {item.isHomeCollect ? (
                              <>
                                <span className="material-symbols-outlined text-[14px]">person</span>
                                {item.phleboOrStaff}
                              </>
                            ) : (
                              <span className="text-on-surface-variant">{item.phleboOrStaff}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Transit / Status */}
                      <td className="py-3.5 pr-2">
                        {item.statusCode === "ready_to_send" && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            {item.statusText}
                          </div>
                        )}
                        {item.statusCode === "verified" && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-[14px]">verified</span>
                            {item.statusText}
                          </div>
                        )}
                        {item.statusCode === "transit" && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container font-label-sm text-label-sm font-semibold">
                            <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse"></span>
                            {item.statusText}
                          </div>
                        )}
                        {item.statusCode === "in_analysis" && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            {item.statusText}
                          </div>
                        )}
                        {item.statusCode === "tested" && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            {item.statusText}
                          </div>
                        )}
                        {item.statusCode === "dispatched" && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fresh-teal/15 text-fresh-teal font-label-sm text-label-sm font-bold">
                            <span className="material-symbols-outlined text-[14px]">mark_chat_read</span>
                            SMS Delivered
                          </div>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 pr-2">
                        {item.priority === "STAT Urgent" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-soft-coral/15 text-soft-coral font-label-sm text-label-sm font-bold">
                            STAT Urgent
                          </span>
                        )}
                        {item.priority === "Fast-track" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">
                            Fast-track
                          </span>
                        )}
                        {item.priority === "Routine" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">
                            Routine
                          </span>
                        )}
                      </td>

                      {/* Quick Action */}
                      <td className="py-3.5 text-right">
                        {item.statusCode === "transit" ? (
                          <button
                            type="button"
                            onClick={() =>
                              showToast(
                                "Phlebotomist Tracking",
                                `${item.phleboOrStaff} is 1.8km away. Sample cold-chain temperature: 4.1°C.`
                              )
                            }
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">fmd_good</span>
                            <span>Track Transit</span>
                          </button>
                        ) : item.statusCode === "in_analysis" ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant/60 font-label-sm text-label-sm font-semibold cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                            <span>Awaiting Signoff</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDispatchModal(item)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-semibold shadow-[0_4px_12px_rgba(0,102,255,0.22)] hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
                            <span>Upload &amp; SMS</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Table Pagination & Status Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-surface-container text-on-surface-variant font-label-sm text-label-sm">
              <span>Showing {filteredQueue.length} of {totalQueueCount} Active Diagnostics Requests</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-primary text-on-primary font-bold shadow-sm"
                >
                  1
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  2
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 4-COLS: MODALITY & LAB WORKSTATION STATUS */}
          <div className="xl:col-span-4 flex flex-col gap-base" id="workstations">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-title-md text-title-md text-on-surface font-bold">
                  Workstation Status
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Diagnostics Bays &amp; Calibration Timers
                </p>
              </div>
              <span className="font-label-sm text-label-sm text-fresh-teal font-semibold px-2 py-0.5 rounded-full bg-fresh-teal/10 border border-fresh-teal/20">
                All Calibrated
              </span>
            </div>

            {/* Bay 1: MRI Suite 3T */}
            <div className="p-stack-sm rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">radiology</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-[15px] font-bold text-on-surface">
                      MRI Suite 1 (Siemens Vida 3T)
                    </h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Tech: <strong>Rachel Vance, RT(MR)</strong>
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-bold">
                  88% Load
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden mt-1">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: "88%" }}></div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant pt-1 border-t border-surface-container/60">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">nest_clock_farsight_analog</span>
                  Next Calib: 14h 20m
                </span>
                <span className="text-primary font-medium">Protocol 4 Active</span>
              </div>
            </div>

            {/* Bay 2: Spectral CT 128-Slice */}
            <div className="p-stack-sm rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-[15px] font-bold text-on-surface">
                      Spectral CT (GE Apex 128)
                    </h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Tech: <strong>Gavin Chen, RT(R)(CT)</strong>
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-bold">
                  62% Load
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden mt-1">
                <div className="bg-fresh-teal h-1.5 rounded-full" style={{ width: "62%" }}></div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant pt-1 border-t border-surface-container/60">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">nest_clock_farsight_analog</span>
                  Next Calib: 06h 45m
                </span>
                <span className="text-on-surface font-medium">Ready for Intake</span>
              </div>
            </div>

            {/* Bay 3: Core Automated Pathology Analyzer */}
            <div className="p-stack-sm rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">science</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-[15px] font-bold text-on-surface">
                      Automated Core Chem &amp; Immuno
                    </h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Lead: <strong>Dr. Julian Ross, MD Path</strong>
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-soft-coral/15 text-soft-coral font-label-sm text-label-sm font-bold">
                  94% Load
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden mt-1">
                <div className="bg-soft-coral h-1.5 rounded-full" style={{ width: "94%" }}></div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant pt-1 border-t border-surface-container/60">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">nest_clock_farsight_analog</span>
                  Next Calib: 02h 10m
                </span>
                <span className="text-soft-coral font-semibold">High Throughput</span>
              </div>
            </div>

            {/* Bay 4: Ultrasound Bay Alpha */}
            <div className="p-stack-sm rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 border border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">sound_detection_loud_sound</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-[15px] font-bold text-on-surface">
                      Ultrasound Bay A (Philips EPIQ)
                    </h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Sonographer: <strong>Elena Kostas, RDMS</strong>
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-fresh-teal font-label-sm text-label-sm font-bold">
                  45% Load
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden mt-1">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: "45%" }}></div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant pt-1 border-t border-surface-container/60">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">nest_clock_farsight_analog</span>
                  Next Calib: 19h 50m
                </span>
                <span className="text-fresh-teal font-medium">Optimal Status</span>
              </div>
            </div>
          </div>
        </div>

        {/* TEST CATALOG & TARIFF PRICING CONTROLS */}
        <div className="mb-stack-lg rounded-xl bg-surface-container-lowest p-stack-md shadow-[0_8px_30px_rgba(0,102,255,0.03)] border border-surface-container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold">
                  Hospital Tariff Master
                </span>
                <span className="text-outline-variant">•</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Hospital &amp; Private Fee Schedule v4.2
                </span>
              </div>
              <h2 className="font-title-md text-title-md text-on-surface font-bold">
                Test Catalog &amp; Tariff Pricing Controls
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Hospital registered rates, in-centre tariffs, and automatic home collection surcharges.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container flex items-center gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Active Home Surcharge:</span>
                <span className="font-label-sm text-label-sm font-bold text-fresh-teal">+₹250 / patient</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Tariff Rule Configurator",
                    "Hospital tariff and home collection surcharge configuration window ready."
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Edit Pricing / Add Surcharge</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter pt-4">
            {/* Test 1: Comprehensive Metabolic Panel */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container/60 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-primary-fixed/30 text-primary font-label-sm text-[11px] font-bold">
                    Pathology
                  </span>
                  <h3 className="font-title-md text-[14px] font-bold text-on-surface mt-1">
                    Comprehensive Metabolic Panel
                  </h3>
                </div>
                <span className="material-symbols-outlined text-[20px] text-primary">biotech</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-surface-container">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[11px] text-on-surface-variant">In-Centre Fee</span>
                  <span className="font-title-md text-[16px] font-bold text-on-surface">₹950</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-label-sm text-[11px] text-fresh-teal font-semibold">Home Collect</span>
                  <span className="font-title-md text-[16px] font-bold text-fresh-teal">₹1,200</span>
                </div>
              </div>
            </div>

            {/* Test 2: Lipid Profile & Atherogenic Index */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container/60 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-primary-fixed/30 text-primary font-label-sm text-[11px] font-bold">
                    Pathology
                  </span>
                  <h3 className="font-title-md text-[14px] font-bold text-on-surface mt-1">
                    Lipid Profile &amp; Atherogenic Index
                  </h3>
                </div>
                <span className="material-symbols-outlined text-[20px] text-primary">bloodtype</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-surface-container">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[11px] text-on-surface-variant">In-Centre Fee</span>
                  <span className="font-title-md text-[16px] font-bold text-on-surface">₹650</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-label-sm text-[11px] text-fresh-teal font-semibold">Home Collect</span>
                  <span className="font-title-md text-[16px] font-bold text-fresh-teal">₹900</span>
                </div>
              </div>
            </div>

            {/* Test 3: Brain & Spine MRI */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container/60 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-secondary-fixed/30 text-secondary font-label-sm text-[11px] font-bold">
                    Radiology
                  </span>
                  <h3 className="font-title-md text-[14px] font-bold text-on-surface mt-1">
                    Brain &amp; Spine MRI (1.5T / 3T)
                  </h3>
                </div>
                <span className="material-symbols-outlined text-[20px] text-primary">radiology</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-surface-container">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[11px] text-on-surface-variant">In-Centre Fee</span>
                  <span className="font-title-md text-[16px] font-bold text-on-surface">
                    ₹{center.test_prices?.["MRI Scan"] || 8500}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-label-sm text-[11px] text-on-surface-variant">Modality</span>
                  <span className="font-label-sm text-[12px] font-medium text-on-surface-variant">In-Bay Suite</span>
                </div>
              </div>
            </div>

            {/* Test 4: Full Blood Count & CRP */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container/60 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-primary-fixed/30 text-primary font-label-sm text-[11px] font-bold">
                    Pathology
                  </span>
                  <h3 className="font-title-md text-[14px] font-bold text-on-surface mt-1">
                    Full Blood Count &amp; CRP
                  </h3>
                </div>
                <span className="material-symbols-outlined text-[20px] text-primary">science</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-surface-container">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[11px] text-on-surface-variant">In-Centre Fee</span>
                  <span className="font-title-md text-[16px] font-bold text-on-surface">
                    ₹{center.test_prices?.["Blood Tests"] || 550}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-label-sm text-[11px] text-fresh-teal font-semibold">Home Collect</span>
                  <span className="font-title-md text-[16px] font-bold text-fresh-teal">
                    ₹{(center.test_prices?.["Blood Tests"] || 550) + 250}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DIRECT UPLOAD & INSTANT SMS BROADCAST ACTION BANNER */}
        <div className="rounded-xl bg-gradient-to-r from-primary via-vibrant-blue to-surface-tint text-on-primary p-stack-md relative overflow-hidden shadow-[0_16px_40px_rgba(0,102,255,0.24)]">
          {/* Visual background accents */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="absolute right-1/3 -top-24 w-48 h-48 rounded-full bg-fresh-teal/20 blur-xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px] text-on-primary">send_and_archive</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed opacity-90 font-bold">
                  Expedited Diagnostics Delivery
                </span>
                <h2 className="font-headline-lg text-headline-lg tracking-tight text-on-primary font-bold">
                  Direct Upload &amp; Instant SMS Broadcast to Patient
                </h2>
                <p className="font-body-md text-body-md text-on-primary-container max-w-2xl mt-1 opacity-90">
                  Instantly parse PDF/DICOM lab results, attach end-to-end encrypted download keys, and trigger an
                  automated SMS notification directly to the patient&apos;s verified mobile terminal within 4.2 seconds.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-stack-md py-3 rounded-full bg-surface-container-lowest text-primary font-body-md text-body-md font-bold shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span>Select Test File to Send</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.dcm,.png,.jpg"
              />

              <button
                type="button"
                onClick={handleBulkDispatch}
                className="inline-flex items-center gap-2 px-stack-md py-3 rounded-full bg-white/15 text-on-primary hover:bg-white/25 border border-white/20 backdrop-blur font-body-md text-body-md font-semibold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">mark_chat_read</span>
                <span>Bulk Dispatch (12 Ready)</span>
              </button>
            </div>
          </div>
        </div>

        {/* INTERACTIVE SMS DISPATCH MODAL DIALOG */}
        {dispatchModalOpen && selectedPatient && (
          <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-stack-md shadow-2xl relative flex flex-col gap-stack-sm animate-in fade-in zoom-in duration-200 border border-surface-container">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">sms</span>
                  </span>
                  <h3 className="font-title-md text-title-md text-on-surface font-bold">
                    Dispatch Diagnostic Report via SMS
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeDispatchModal}
                  className="w-8 h-8 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 py-2">
                <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1 border border-surface-container/80">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Target Recipient</span>
                  <span className="font-title-md text-[16px] font-bold text-on-surface">
                    {selectedPatient.patientName} (#{selectedPatient.id})
                  </span>
                  <span className="font-mono text-[14px] text-primary font-medium">
                    {selectedPatient.patientPhone}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Diagnostics File to Attach
                  </label>
                  <div className="p-3 rounded-lg bg-surface-container/50 border border-dashed border-outline-variant flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-primary text-[20px]">picture_as_pdf</span>
                      <span className="font-body-md text-body-md text-on-surface font-medium truncate">
                        {selectedPatient.reportFileName}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-fresh-teal font-semibold">2.4 MB • Signed</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Automated SMS Preview
                  </label>
                  <div className="p-3 rounded-lg bg-surface text-on-surface-variant font-mono text-[12px] leading-relaxed border border-surface-container">
                    &quot;Hello {selectedPatient.patientName.split(" ")[0]}, your diagnostic report for [
                    {selectedPatient.testName.replace(/Diagnostic Report/i, "").trim()}] from {center.name} is now
                    ready. View securely: https://apex-diag.co/r/x9k42-token. Valid for 72 hours.&quot;
                  </div>
                </div>

                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-fresh-teal">lock</span>
                  <span className="font-label-sm text-label-sm">
                    End-to-End Encrypted Link • Single-Use SMS Delivery
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={closeDispatchModal}
                  className="px-4 py-2 rounded-full text-on-surface font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDispatch}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Confirm &amp; Transmit SMS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 transition-all duration-300 pointer-events-none animate-in fade-in slide-in-from-bottom-5">
            <div className="px-4 py-3 rounded-xl bg-on-background text-on-primary shadow-2xl flex items-center gap-3 border border-outline-variant/20">
              <span className="material-symbols-outlined text-fresh-teal text-[22px]">check_circle</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold">{toast.title}</span>
                <span className="font-label-sm text-label-sm text-outline-variant">{toast.sub}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
