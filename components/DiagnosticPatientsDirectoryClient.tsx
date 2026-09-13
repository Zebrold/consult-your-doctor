"use client";

import React, { useState, useMemo } from "react";

export interface DirectoryPatient {
  id: string; // e.g. "CYD-DIA-8812"
  rawId?: string;
  name: string;
  age: number;
  gender: "Female" | "Male" | "Other";
  phone: string;
  avatarUrl?: string;
  initials: string;
  modality: "Home Collection" | "In-Centre Walk-In";
  address: string;
  slotTime: string;
  phlebotomist: {
    name: string;
    status: string;
    id: string;
  };
  billing: {
    totalFee: number;
    testFee: number;
    homeFee?: number;
    paidStatus: string;
    paymentMethod: string;
  };
  smsStatus: "SMS Verified" | "Active • Opted-in" | "Priority SMS Ready" | "Verified: Fastpath" | "SMS Pending Dispatch";
  testName: string;
  pacsUid: string;
  reportState: "Dispatched via SMS" | "Analysis in Progress" | "Awaiting Pathologist";
  isUrgent?: boolean;
  timeline: Array<{
    title: string;
    time: string;
    desc: string;
    icon: string;
    status: "completed" | "current" | "pending";
  }>;
  auditTokenId: string;
}

interface DiagnosticPatientsDirectoryClientProps {
  center: {
    id: string;
    name: string;
    city: string;
    address: string;
  };
  initialBookings?: any[];
}

export function DiagnosticPatientsDirectoryClient({
  center,
  initialBookings = [],
}: DiagnosticPatientsDirectoryClientProps) {
  // 1. Initial curated cohort plus real DB mapped bookings
  const baseCohort: DirectoryPatient[] = useMemo(() => {
    const fallbackPatients: DirectoryPatient[] = [
      {
        id: "CYD-DIA-8812",
        name: "Eleanor Vance",
        age: 64,
        gender: "Female",
        phone: "+91 99118 02341",
        avatarUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuBJ1Yl74YUjUobqhmuiXcAcJ-Yat8-NgFZn-SlE3zA8VqzmjiVzFaiQOysrQpGRh_p17f_P1fDwDZRQLTnlIKNCy8X7hREVRexmoThbxRV0I0Ojzayajzf5-GUJpY7Ijc9Jb79vBX79xJ9anyiXysUBAWkAcvoertuwRE9u-4rESYYKaL2_Xnpab7wlzyPjv0XYqcZVWFSK596oqWqXXDvwKwpX4MerKImnbqnrVMZKTukx0KhOl0E0Fg",
        initials: "EV",
        modality: "Home Collection",
        address: "14 St. Jude Mews, SW1E",
        slotTime: "Today 08:30 - 09:15",
        phlebotomist: {
          name: "Tariq Al-Mansur",
          status: "Sample Handed to Lab",
          id: "#PHL-409",
        },
        billing: {
          totalFee: 1100,
          testFee: 850,
          homeFee: 250,
          paidStatus: "Paid via Portal",
          paymentMethod: "Portal Online",
        },
        smsStatus: "SMS Verified",
        testName: "Contrast Brain MRI + Lipid",
        pacsUid: "PACS UID: 9940-XC",
        reportState: "Dispatched via SMS",
        isUrgent: false,
        timeline: [
          {
            title: "Digital Booking & Fee Settled",
            time: "Today 16:45",
            desc: "Requisition received; Total fee ₹1,100 captured online.",
            icon: "check",
            status: "completed",
          },
          {
            title: "Home Sample Collected & Barcoded",
            time: "Today 08:52",
            desc: "Sample barcode #SPL-UK-8812-BC tagged at 14 St. Jude Mews.",
            icon: "home",
            status: "completed",
          },
          {
            title: "Courier Transit & Lab Handover",
            time: "Today 09:35",
            desc: "Courier temperature controlled (+4°C); Ingested into Central Station Lab.",
            icon: "local_shipping",
            status: "completed",
          },
          {
            title: "Automated Analysis & Sign-off",
            time: "Today 13:58",
            desc: "Lipid panel assays parsed; Verified by Dr. Alistair Finch (FRCR).",
            icon: "check",
            status: "completed",
          },
          {
            title: "SMS Dispatched to Patient",
            time: "Today 14:22",
            desc: "Secure download link confirmed on Tier-1 Telco network.",
            icon: "send",
            status: "completed",
          },
        ],
        auditTokenId: "SMS-TX-89104",
      },
      {
        id: "CYD-DIA-9142",
        name: "Arthur Mitchell",
        age: 48,
        gender: "Male",
        phone: "+91 98224 19082",
        avatarUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAf01CVkVnBYktsP7jK-gT28oN0zzAujXSzWEv8lqI89EDO78-fpjR7hxOKEQgEjyY4fjke_ezqMliZql0sQp-OzmzkcOp-LWSZX1YfGNHmPe0HG86GrnQNo-naFepBEjULjfQs90zCB0RLM5sMMDateHrPKFRLj4UiBa4dBEAXFxHucaVB-DuTN61dRitNmgG8ulg7BgjSM-QvUHmYGpS3C_GeNPbOdj7-qFwnMzUQShYV-6QhzNCkvA",
        initials: "AM",
        modality: "In-Centre Walk-In",
        address: "Central Station #04",
        slotTime: "Checked in: 09:15",
        phlebotomist: {
          name: "In-Clinic Radiology",
          status: "Dr. Marcus Sterling",
          id: "#RAD-102",
        },
        billing: {
          totalFee: 1850,
          testFee: 1850,
          paidStatus: "Paid (Counter)",
          paymentMethod: "Counter POS",
        },
        smsStatus: "Active • Opted-in",
        testName: "Full Body CT Scan",
        pacsUid: "PACS UID: 7721-CT",
        reportState: "Analysis in Progress",
        isUrgent: false,
        timeline: [
          {
            title: "Walk-in Registration & Check-in",
            time: "Today 09:15",
            desc: "Intake complete at Bay 2 Central Station counter.",
            icon: "domain",
            status: "completed",
          },
          {
            title: "Diagnostic Imaging Scans Taken",
            time: "Today 09:40",
            desc: "Spectral CT 128-slice tomography completed.",
            icon: "radiology",
            status: "completed",
          },
          {
            title: "Radiology PACS DICOM Pipeline",
            time: "Today 10:15",
            desc: "Cross-sectional slices rendering in workstation.",
            icon: "progress_activity",
            status: "current",
          },
        ],
        auditTokenId: "SMS-TX-99014",
      },
      {
        id: "CYD-DIA-6629",
        name: "Maya Patel",
        age: 32,
        gender: "Female",
        phone: "+91 97700 90081",
        avatarUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuB3LugGbDsNzrScPqvu7qoEqSyffWniLnm5na-VgtaWgp9NjDGw086ucB99FGVMy0ldKosa0RC3xyrXsLA278f7T8bUw6t6V1CXuCAk9JCN_-UglbYQFLrjVCAjLz2d_RU0NCT6mJ53Xpyv4UnoxJgvIQyrPiK3-mWeiUGiToh8GgN2zCfTF3xvleglELHnM--C_2bNhAPEMwc8iNkjh2UalHRhbC5isyQ6bRGUCmObpopN6S5qbIigQQ",
        initials: "MP",
        modality: "Home Collection",
        address: "72 Kensington Gardens Sq",
        slotTime: "Today 07:00 - 07:45",
        phlebotomist: {
          name: "Chloe Bennett",
          status: "Sample In Transit",
          id: "ETA Lab: 15 mins",
        },
        billing: {
          totalFee: 850,
          testFee: 600,
          homeFee: 250,
          paidStatus: "Paid via Portal",
          paymentMethod: "Portal Online",
        },
        smsStatus: "Priority SMS Ready",
        testName: "HbA1c & Fasting Glucose",
        pacsUid: "LIMS: #9021-BLD",
        reportState: "Awaiting Pathologist",
        isUrgent: true,
        timeline: [
          {
            title: "STAT Urgent Requisition",
            time: "Today 06:30",
            desc: "Priority marker assigned for endocrine suite.",
            icon: "emergency",
            status: "completed",
          },
          {
            title: "Sample Cold-Chain Transit",
            time: "Today 07:40",
            desc: "Phlebotomist en route with active 4°C container.",
            icon: "local_shipping",
            status: "completed",
          },
          {
            title: "Awaiting Pathologist Verification",
            time: "Today 08:20",
            desc: "Automated assay run finished; waiting for sign-off.",
            icon: "assignment_late",
            status: "current",
          },
        ],
        auditTokenId: "SMS-TX-77192",
      },
      {
        id: "CYD-DIA-4190",
        name: "David K. Chen",
        age: 51,
        gender: "Male",
        phone: "+91 97799 11223",
        initials: "DK",
        modality: "In-Centre Walk-In",
        address: "Station #02 (Cardiology)",
        slotTime: "Completed: 15:30",
        phlebotomist: {
          name: "Hospital Tech Lab",
          status: "Dr. Sarah Jenkins",
          id: "#CRD-819",
        },
        billing: {
          totalFee: 1250,
          testFee: 1250,
          paidStatus: "Paid (Insurance)",
          paymentMethod: "Corporate Desk",
        },
        smsStatus: "Verified: Fastpath",
        testName: "Cardiac Calcium Scoring",
        pacsUid: "PACS UID: 4018-CV",
        reportState: "Dispatched via SMS",
        isUrgent: false,
        timeline: [
          {
            title: "Clinical Referral Accepted",
            time: "Oct 22, 11:00",
            desc: "Cardiology department referral intake confirmed.",
            icon: "check",
            status: "completed",
          },
          {
            title: "Cardiac Echo Scans Completed",
            time: "Oct 22, 14:15",
            desc: "Doppler calcium index analyzed and finalized.",
            icon: "check",
            status: "completed",
          },
          {
            title: "SMS Delivered to Patient",
            time: "Oct 22, 15:40",
            desc: "Delivered to verified mobile +91 97799 11223.",
            icon: "send",
            status: "completed",
          },
        ],
        auditTokenId: "SMS-TX-61209",
      },
      {
        id: "CYD-DIA-7731",
        name: "Zara Al-Mansoor",
        age: 29,
        gender: "Female",
        phone: "+91 97855 20491",
        initials: "ZA",
        modality: "Home Collection",
        address: "88 Park Lane, Apt 4B",
        slotTime: "Slot: Scheduled Tomorrow",
        phlebotomist: {
          name: "Tariq Al-Mansur",
          status: "Scheduled Phlebotomist",
          id: "#PHL-409",
        },
        billing: {
          totalFee: 1100,
          testFee: 850,
          homeFee: 250,
          paidStatus: "Paid via Portal",
          paymentMethod: "Portal Online",
        },
        smsStatus: "SMS Pending Dispatch",
        testName: "Thyroid Ultrasound + TSH",
        pacsUid: "PACS UID: 8102-US",
        reportState: "Analysis in Progress",
        isUrgent: false,
        timeline: [
          {
            title: "Order Processed",
            time: "Today 12:10",
            desc: "Home collection slot locked for tomorrow morning.",
            icon: "calendar_month",
            status: "completed",
          },
          {
            title: "Phlebotomist Kit Assigned",
            time: "Today 13:00",
            desc: "Barcoded vacutainers staged for dispatch.",
            icon: "inventory",
            status: "completed",
          },
        ],
        auditTokenId: "SMS-TX-33810",
      },
    ];

    // If initialBookings exist from DB, prepend them
    if (initialBookings.length > 0) {
      const dbMapped: DirectoryPatient[] = initialBookings.map((b, idx) => {
        const pName = b.profiles?.full_name || `Patient ${idx + 1}`;
        const pPhone = b.profiles?.phone_number || `+91 98204 ${10000 + idx}`;
        const cleanName = pName.replace(/Dr\.\s*/i, "").trim();
        const parts = cleanName.split(" ");
        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : cleanName.slice(0, 2).toUpperCase();

        const isHome = idx % 2 === 1;
        const testFormatted = b.test_name
          ? b.test_name.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
          : "Diagnostic Scan";

        const state: DirectoryPatient["reportState"] =
          b.status === "confirmed" ? "Dispatched via SMS" : "Analysis in Progress";

        return {
          id: `CYD-DIA-${b.id.slice(0, 4).toUpperCase()}`,
          rawId: b.id,
          name: pName,
          age: 38 + (idx % 25),
          gender: idx % 2 === 0 ? "Female" : "Male",
          phone: pPhone,
          initials,
          modality: isHome ? "Home Collection" : "In-Centre Walk-In",
          address: isHome ? `${center.city || "New Delhi"} Sector ${idx + 3}` : "Central Diagnostics Bay 1",
          slotTime: b.preferred_date ? `Date: ${b.preferred_date}` : "Today 10:00 - 11:00",
          phlebotomist: {
            name: isHome ? "Phlebo: Rahul V." : "In-Clinic Radiology",
            status: isHome ? "Sample Handed to Lab" : "Tech Operator Active",
            id: `#PHL-${100 + idx}`,
          },
          billing: {
            totalFee: isHome ? 1350 : 1100,
            testFee: 1100,
            homeFee: isHome ? 250 : undefined,
            paidStatus: "Paid via Portal",
            paymentMethod: "Online Gateway",
          },
          smsStatus: "SMS Verified",
          testName: testFormatted,
          pacsUid: `PACS UID: ${b.id.slice(0, 6).toUpperCase()}`,
          reportState: state,
          isUrgent: idx % 4 === 0,
          timeline: [
            {
              title: "Digital Booking Initiated",
              time: "Verified",
              desc: `Patient requisition recorded in ${center.name}.`,
              icon: "check",
              status: "completed",
            },
            {
              title: "Sample Ingested & Scanned",
              time: "Active",
              desc: "DICOM PACS repository synchronizing telemetry.",
              icon: "biotech",
              status: "completed",
            },
            {
              title: "SMS Dispatch Gateway",
              time: "Active",
              desc: `Single-use download token generated for ${pPhone}.`,
              icon: "send",
              status: "completed",
            },
          ],
          auditTokenId: `SMS-TX-${10000 + idx}`,
        };
      });

      return [...dbMapped, ...fallbackPatients];
    }

    return fallbackPatients;
  }, [initialBookings, center]);

  const [patients, setPatients] = useState<DirectoryPatient[]>(baseCohort);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(baseCohort[0]?.id || "");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);

  // Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAgeGender, setNewAgeGender] = useState("42 / Male");
  const [newTestType, setNewTestType] = useState("Contrast Brain MRI");
  const [newPhysician, setNewPhysician] = useState("Dr. Sarah Jenkins");

  // Re-dispatch loading state
  const [isRedispatching, setIsRedispatching] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Selected Patient
  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  // Filtering
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesId = p.id.toLowerCase().includes(q);
        const matchesPhone = p.phone.toLowerCase().includes(q);
        const matchesTest = p.testName.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesPhone && !matchesTest) return false;
      }

      // 2. Pill filter
      if (activeFilter === "all") return true;
      if (activeFilter === "home-collection") return p.modality === "Home Collection";
      if (activeFilter === "pending") return p.reportState !== "Dispatched via SMS";
      if (activeFilter === "dispatched") return p.reportState === "Dispatched via SMS";
      if (activeFilter === "urgent") return !!p.isUrgent;

      return true;
    });
  }, [patients, searchQuery, activeFilter]);

  // Filter Counts
  const homeCount = patients.filter((p) => p.modality === "Home Collection").length;
  const pendingCount = patients.filter((p) => p.reportState !== "Dispatched via SMS").length;
  const dispatchedCount = patients.filter((p) => p.reportState === "Dispatched via SMS").length;
  const urgentCount = patients.filter((p) => p.isUrgent).length;
  const totalDisplayCount = 1420 + patients.length;

  // Handle Row Selection
  const handleSelectPatient = (patient: DirectoryPatient) => {
    setSelectedPatientId(patient.id);
    setDrawerOpen(true);
  };

  // Handle Re-dispatch
  const handleRedispatch = () => {
    if (!selectedPatient) return;
    setIsRedispatching(true);

    setTimeout(() => {
      setIsRedispatching(false);
      showToast(
        "SMS Dispatched Successfully",
        `Carrier confirmation token #${selectedPatient.auditTokenId} routed to ${selectedPatient.phone}`
      );
    }, 900);
  };

  // Handle Register Walk-in Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${newFirstName.trim()} ${newLastName.trim()}`.trim() || "New Patient";
    const phone = newPhone.trim() || "+91 98204 77102";
    const cleanInitials = fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newId = `CYD-DIA-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPatient: DirectoryPatient = {
      id: newId,
      name: fullName,
      age: 42,
      gender: "Male",
      phone,
      initials: cleanInitials || "NP",
      modality: "In-Centre Walk-In",
      address: "Main Diagnostic Reception",
      slotTime: "Just now (Checked in)",
      phlebotomist: {
        name: "Counter Intake Desk",
        status: newPhysician,
        id: "#REG-01",
      },
      billing: {
        totalFee: 1200,
        testFee: 1200,
        paidStatus: "Paid (Counter)",
        paymentMethod: "Counter POS",
      },
      smsStatus: "Active • Opted-in",
      testName: newTestType,
      pacsUid: `PACS UID: ${Math.floor(1000 + Math.random() * 9000)}-REG`,
      reportState: "Analysis in Progress",
      timeline: [
        {
          title: "Walk-in Registration Completed",
          time: "Just now",
          desc: "Intake form registered. Digital consent token issued.",
          icon: "person_add",
          status: "completed",
        },
      ],
      auditTokenId: `SMS-TX-${Math.floor(10000 + Math.random() * 90000)}`,
    };

    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatientId(newId);
    setDrawerOpen(true);
    setRegisterModalOpen(false);

    // Reset Form
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");

    showToast(
      "Patient Registered & Queued",
      `New diagnostic patient ${newId} (${fullName}) recorded. Verification SMS queued.`
    );
  };

  return (
    <main className="w-full px-4 sm:px-8 xl:px-margin-x-desktop pb-stack-lg">
      <div className="flex flex-col w-full">
        {/* DYNAMIC ATMOSPHERIC GLOW & BREADCRUMB RIBBON */}
        <div className="relative w-full py-stack-md flex flex-col gap-base">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
            <span>Portal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>{center.name || "Apex Diagnostics & Imaging"}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Patients Directory &amp; Dispatch Hub</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-stack-sm py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm mb-base border border-surface-container/80">
                <span className="material-symbols-outlined text-[15px]">verified_user</span>
                <span>Apex Enterprise PACS • SMS Gateway Active</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight font-extrabold">
                Diagnostic Patients Directory
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Search and manage diagnostic test history, patient mobile numbers for SMS dispatch, and real-time report
                access logs.
              </p>
            </div>

            {/* Quick Metrics Summary Bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-stack-md py-stack-sm rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container/80">
                <div className="w-10 h-10 rounded-full bg-fresh-teal/15 flex items-center justify-center text-fresh-teal">
                  <span className="material-symbols-outlined text-[22px]">sms</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                    SMS Deliverability
                  </span>
                  <span className="font-title-md text-title-md font-bold text-on-surface">99.82%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 px-stack-md py-3 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-bold shadow-[0_4px_16px_rgba(0,102,255,0.22)] hover:scale-[1.02] hover:bg-vibrant-blue transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">person_add_alt</span>
                <span>+ Register Walk-in Diagnostic Patient</span>
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER RIBBON WITH MICRO TELEMETRY BAR */}
        <div className="w-full bg-surface-container-lowest rounded-2xl shadow-sm p-stack-md mb-stack-md flex flex-col gap-stack-md border border-surface-container/60">
          <div className="flex flex-col lg:flex-row gap-stack-md items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full lg:w-7/12">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, Patient ID (CYD-DIA-...), or verified mobile phone number..."
                className="w-full pl-12 pr-16 py-3 bg-indigo-gray-50 rounded-full text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-vibrant-blue transition-all border border-surface-container/60"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-mono font-semibold">
                CTRL+K
              </span>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                All Patients <span className="ml-1 opacity-90">({totalDisplayCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("home-collection")}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all cursor-pointer flex items-center ${
                  activeFilter === "home-collection"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[15px] align-text-bottom mr-1 text-primary">
                  home_health
                </span>
                Home Sample Collection <span className="ml-1 text-primary font-bold">({homeCount + 342})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("pending")}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${
                  activeFilter === "pending"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                Pending Report <span className="ml-1 text-soft-coral font-bold">({pendingCount + 18})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("dispatched")}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${
                  activeFilter === "dispatched"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                Dispatched via SMS <span className="ml-1 text-fresh-teal font-bold">({dispatchedCount + 1380})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("urgent")}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all cursor-pointer flex items-center ${
                  activeFilter === "urgent"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                Urgent Cases{" "}
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-soft-coral text-white text-[10px] font-bold">
                  {urgentCount + 22}
                </span>
              </button>
            </div>
          </div>

          {/* Telemetry Sub-strip */}
          <div className="flex flex-wrap items-center justify-between pt-base border-t-0 bg-indigo-gray-50/70 -mx-stack-md -mb-stack-md px-stack-md py-2.5 rounded-b-2xl border-t border-surface-container/60">
            <div className="flex items-center gap-stack-md text-on-surface-variant font-label-sm text-label-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-fresh-teal animate-ping"></span>
                <span>Twilio SMS Routing Node: Fastpath-01 (14ms latency)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">encrypted</span>
                <span>End-to-End Encrypted Token Dispatch: Active</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Audit Log Exported",
                    `Full CSV audit trail exported for ${patients.length} diagnostic patient sessions.`
                  )
                }
                className="flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-sm text-label-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Export Audit Log</span>
              </button>
              <div className="w-px h-3 bg-outline-variant/60"></div>
              <button
                type="button"
                onClick={() =>
                  showToast("PACS Feeds Synchronized", "LIMS & PACS patient status updated in real-time.")
                }
                className="flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-sm text-label-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Sync Status</span>
              </button>
            </div>
          </div>
        </div>

        {/* MASTER LAYOUT: PATIENT GRID + PERSISTENT SLIDEOUT PANEL */}
        <div className="relative w-full flex flex-col xl:flex-row gap-stack-md items-start">
          {/* TABLE CONTAINER (8 Cols) */}
          <div
            className={`w-full transition-all duration-300 flex flex-col bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-surface-container/60 ${
              drawerOpen ? "xl:w-8/12" : "xl:w-full"
            }`}
          >
            {/* Table Header Bar */}
            <div className="p-stack-md flex items-center justify-between border-b border-surface-container/60">
              <div>
                <h2 className="font-title-md text-title-md text-on-surface font-bold">Registered Patient Cohort</h2>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Showing latest synchronized records with validated telco routing
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Bulk Action:</span>
                <button
                  type="button"
                  onClick={() =>
                    showToast("Batch Dispatch Queued", "5 verified diagnostic reports queued for SMS broadcast.")
                  }
                  className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container font-label-sm text-label-sm flex items-center gap-1 border border-surface-container/80 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                  <span>Batch Dispatch</span>
                </button>
              </div>
            </div>

            {/* Patients Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left font-body-md text-body-md border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider border-b border-surface-container">
                    <th className="py-3 px-4 font-semibold">Patient Profile</th>
                    <th className="py-3 px-4 font-semibold">Modality &amp; Address / Slot</th>
                    <th className="py-3 px-4 font-semibold">Field Phlebotomist</th>
                    <th className="py-3 px-4 font-semibold">Hospital Fee &amp; Billing</th>
                    <th className="py-3 px-4 font-semibold">Mobile &amp; SMS Status</th>
                    <th className="py-3 px-4 font-semibold">Diagnostic Tests</th>
                    <th className="py-3 px-4 font-semibold">Report State</th>
                    <th className="py-3 px-4 font-semibold text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/60">
                  {filteredPatients.map((patient) => {
                    const isSelected = patient.id === selectedPatientId;
                    return (
                      <tr
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary-fixed/30"
                            : "hover:bg-surface-container-low/60"
                        }`}
                      >
                        {/* Profile */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {patient.avatarUrl ? (
                                <img
                                  src={patient.avatarUrl}
                                  alt={patient.name}
                                  className="w-10 h-10 rounded-full object-cover shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-label-sm">
                                  {patient.initials}
                                </div>
                              )}
                              <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full shadow-[0_0_0_2px_#fff] ${
                                  patient.isUrgent ? "bg-soft-coral" : "bg-fresh-teal"
                                }`}
                              ></span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-body-md text-body-md font-bold text-on-surface hover:text-primary leading-tight">
                                  {patient.name}
                                </span>
                                {patient.isUrgent && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-soft-coral/15 text-soft-coral text-[10px] font-bold">
                                    STAT
                                  </span>
                                )}
                              </div>
                              <span className="font-label-sm text-label-sm text-on-surface-variant">
                                {patient.age}y • {patient.gender} •{" "}
                                <span className="font-mono text-primary font-semibold">{patient.id}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Modality & Address */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold w-fit ${
                                patient.modality === "Home Collection"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-surface-container-high text-on-surface"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {patient.modality === "Home Collection" ? "home_health" : "domain"}
                              </span>
                              {patient.modality}
                            </span>
                            <span className="text-[12px] font-medium text-on-surface truncate max-w-[170px]">
                              {patient.address}
                            </span>
                            <span className="text-[11px] text-on-surface-variant font-mono">
                              {patient.slotTime}
                            </span>
                          </div>
                        </td>

                        {/* Field Phlebotomist */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-body-md text-[13px] font-semibold text-on-surface">
                              {patient.phlebotomist.name}
                            </span>
                            <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-fresh-teal">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              {patient.phlebotomist.status}
                            </span>
                            <span className="font-mono text-[10px] text-on-surface-variant">
                              {patient.phlebotomist.id}
                            </span>
                          </div>
                        </td>

                        {/* Fee & Billing */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-body-md text-[14px] font-bold text-on-surface">
                              ₹{patient.billing.totalFee.toLocaleString("en-IN")}
                            </span>
                            <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-fresh-teal font-medium">
                              <span className="material-symbols-outlined text-[12px]">check</span>
                              {patient.billing.paidStatus}
                            </span>
                            {patient.billing.homeFee ? (
                              <span className="text-[10px] text-on-surface-variant">
                                (₹{patient.billing.testFee} Test + ₹{patient.billing.homeFee} Visit)
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Mobile & SMS Status */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-medium text-on-surface text-[13px]">
                              {patient.phone}
                            </span>
                            <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-fresh-teal">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              {patient.smsStatus}
                            </span>
                          </div>
                        </td>

                        {/* Diagnostic Tests */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-body-md text-[13px] font-medium text-on-surface max-w-[160px] truncate">
                              {patient.testName}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                              {patient.pacsUid}
                            </span>
                          </div>
                        </td>

                        {/* Report State */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {patient.reportState === "Dispatched via SMS" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fresh-teal/15 text-on-secondary-container font-label-sm text-label-sm font-semibold">
                              <span className="material-symbols-outlined text-[14px] text-fresh-teal">
                                mark_email_read
                              </span>
                              Dispatched via SMS
                            </span>
                          )}
                          {patient.reportState === "Analysis in Progress" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                              <span className="material-symbols-outlined text-[14px] text-vibrant-blue animate-spin">
                                progress_activity
                              </span>
                              Analysis in Progress
                            </span>
                          )}
                          {patient.reportState === "Awaiting Pathologist" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-coral/15 text-soft-coral font-label-sm text-label-sm font-semibold">
                              <span className="material-symbols-outlined text-[14px]">assignment_late</span>
                              Awaiting Pathologist
                            </span>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatientId(patient.id);
                                setDrawerOpen(true);
                                handleRedispatch();
                              }}
                              className="p-2 rounded-full hover:bg-surface-container text-primary hover:scale-105 transition-all cursor-pointer"
                              title="Re-dispatch SMS"
                            >
                              <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatientId(patient.id);
                                setDrawerOpen(true);
                              }}
                              className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                              title="View Inspection Card"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination & Record Summary */}
            <div className="p-stack-md flex flex-col sm:flex-row items-center justify-between gap-base bg-surface-container-lowest border-t border-surface-container/60">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Showing <span className="font-semibold text-on-surface">1 - {filteredPatients.length}</span> of{" "}
                <span className="font-semibold text-on-surface">{totalDisplayCount}</span> registered records
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-sm text-label-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold shadow-sm">
                    1
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-surface flex items-center justify-center font-label-sm text-label-sm cursor-pointer"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-surface flex items-center justify-center font-label-sm text-label-sm cursor-pointer"
                  >
                    3
                  </button>
                  <span className="px-1 text-on-surface-variant">•••</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-surface flex items-center justify-center font-label-sm text-label-sm cursor-pointer"
                  >
                    284
                  </button>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-sm text-label-sm transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* SIDE SLIDE-OUT PATIENT PREVIEW DRAWER (4 Cols) */}
          {drawerOpen && selectedPatient && (
            <div className="w-full xl:w-4/12 bg-surface-container-lowest rounded-2xl shadow-md p-stack-md flex flex-col gap-stack-md sticky top-20 border border-surface-container/60">
              {/* Drawer Top Bar & Close */}
              <div className="flex items-center justify-between pb-1 border-b border-surface-container/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal shadow-[0_0_8px_rgba(20,184,166,0.6)]"></span>
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                    Patient Inspection Card
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-secondary-container/30 text-on-secondary-container text-[11px] font-mono font-bold">
                    LIVE TELEMETRY
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Patient Header Information Card */}
              <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-3 relative overflow-hidden border border-surface-container/80">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {selectedPatient.avatarUrl ? (
                      <img
                        src={selectedPatient.avatarUrl}
                        alt={selectedPatient.name}
                        className="w-14 h-14 rounded-xl object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold text-[20px] shadow-sm">
                        {selectedPatient.initials}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <h3 className="font-title-md text-title-md font-bold text-on-surface leading-tight">
                        {selectedPatient.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {selectedPatient.age} Years • {selectedPatient.gender}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-primary bg-surface-container-lowest px-1.5 py-0.2 rounded border border-surface-container">
                          {selectedPatient.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {/* Modality & Address */}
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest flex flex-col gap-1.5 border border-surface-container/60">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-primary font-label-sm text-[12px] font-bold">
                        <span className="material-symbols-outlined text-[16px]">
                          {selectedPatient.modality === "Home Collection" ? "home_health" : "domain"}
                        </span>
                        {selectedPatient.modality === "Home Collection"
                          ? "Sample Collection Modality: Home Phlebotomy Visit"
                          : "Intake Modality: In-Clinic Diagnostics Station"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-fresh-teal/15 text-fresh-teal font-label-sm text-[10px] font-bold">
                        COMPLETED VISIT
                      </span>
                    </div>

                    <div className="text-[12px] text-on-surface font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                        location_on
                      </span>
                      {selectedPatient.address}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-label-sm font-label-sm pt-1 border-t border-surface-container/60">
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant text-[10px]">Scheduled Slot</span>
                        <span className="font-mono font-semibold text-[11px] text-on-surface">
                          {selectedPatient.slotTime}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant text-[10px]">Phlebotomist / Tech</span>
                        <span className="font-semibold text-[11px] text-on-surface truncate">
                          {selectedPatient.phlebotomist.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Fee Billing */}
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest flex flex-col gap-1.5 border border-surface-container/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                        Hospital Set Registered Amount
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-fresh-teal/15 text-fresh-teal font-label-sm text-[11px] font-bold">
                        Paid in Full
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-on-surface">
                      <span className="text-on-surface-variant">Diagnostic Test Fee:</span>
                      <span className="font-mono font-medium">₹{selectedPatient.billing.testFee}</span>
                    </div>
                    {selectedPatient.billing.homeFee ? (
                      <div className="flex items-center justify-between text-[12px] text-on-surface">
                        <span className="text-on-surface-variant">Home Collection Visit Surcharge:</span>
                        <span className="font-mono font-medium">+₹{selectedPatient.billing.homeFee}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-[13px] font-bold text-on-surface pt-1 border-t border-surface-container/60">
                      <span className="text-primary">Total Billed ({selectedPatient.billing.paidStatus}):</span>
                      <span className="font-mono text-primary text-[14px]">
                        ₹{selectedPatient.billing.totalFee.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Phone & SMS Confirmation */}
                  <div className="flex items-center justify-between bg-surface-container-lowest p-2.5 rounded-lg border border-surface-container/60">
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[18px]">smartphone</span>
                      <span className="font-mono font-bold text-[13px]">{selectedPatient.phone}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-fresh-teal/15 text-fresh-teal font-label-sm text-[11px] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      SMS Confirmed
                    </span>
                  </div>

                  {/* Primary Consultant & Investigation */}
                  <div className="grid grid-cols-2 gap-2 text-label-sm font-label-sm">
                    <div className="p-2 rounded-lg bg-surface-container-lowest flex flex-col border border-surface-container/60">
                      <span className="text-on-surface-variant text-[11px]">Primary Consultant</span>
                      <span className="font-semibold text-on-surface truncate">Dr. Sarah Jenkins</span>
                      <span className="text-on-surface-variant text-[10px] truncate">
                        {center.name || "Central Hospital"}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-surface-container-lowest flex flex-col border border-surface-container/60">
                      <span className="text-on-surface-variant text-[11px]">Investigation</span>
                      <span className="font-semibold text-on-surface truncate">{selectedPatient.testName}</span>
                      <span className="text-on-surface-variant text-[10px] truncate">{selectedPatient.pacsUid}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Progression Timeline */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                    Test Pipeline Lifecycle
                  </span>
                  <span className="font-label-sm text-label-sm text-fresh-teal font-semibold">
                    Status: {selectedPatient.reportState}
                  </span>
                </div>

                <div className="relative pl-6 flex flex-col gap-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-fresh-teal/30">
                  {selectedPatient.timeline.map((step, idx) => (
                    <div key={idx} className="relative flex flex-col">
                      <span
                        className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white ${
                          step.icon === "send"
                            ? "bg-vibrant-blue animate-pulse"
                            : "bg-fresh-teal"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[11px]">{step.icon}</span>
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          {step.title}
                        </span>
                        <span className="font-mono text-[11px] text-on-surface-variant">{step.time}</span>
                      </div>
                      <span className="font-body-md text-[12px] text-on-surface-variant">{step.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SMS Delivery Audit Log */}
              <div className="p-stack-sm rounded-xl bg-surface-container-high/40 flex flex-col gap-2 border border-surface-container/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span className="font-label-sm text-label-sm font-bold">SMS Audit Trail &amp; Token</span>
                  </div>
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    ID: {selectedPatient.auditTokenId}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-2.5 rounded-lg font-mono text-[11px] text-on-surface leading-relaxed break-all border border-surface-container/60">
                  SMS sent with secure 256-bit download token to{" "}
                  <strong className="text-primary">{selectedPatient.phone}</strong>. Delivery confirmed by telco carrier.
                  Token expires in 72 hrs.
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Token Status: Unopened (1-click active)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(`https://apex-diag.co/r/${selectedPatient.auditTokenId}`);
                      }
                      showToast("Access Link Copied", "Secure cryptographic report link copied to clipboard.");
                    }}
                    className="text-primary hover:underline font-label-sm text-[11px] font-semibold cursor-pointer"
                  >
                    Copy Access Link
                  </button>
                </div>
              </div>

              {/* Quick Drawer Actions */}
              <div className="flex flex-col gap-2 pt-base border-t border-surface-container/60">
                <button
                  type="button"
                  onClick={handleRedispatch}
                  disabled={isRedispatching}
                  className="w-full py-2.5 px-4 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold flex items-center justify-center gap-2 hover:bg-vibrant-blue shadow-sm hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-75"
                >
                  {isRedispatching ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Dispatching Secure Token...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                      <span>Re-dispatch SMS to Mobile ({selectedPatient.phone})</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      showToast("Print Formatter Ready", `Generating standardized print report for ${selectedPatient.name}.`)
                    }
                    className="py-2 px-3 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border border-surface-container"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    <span>Print Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        "Clinical Addendum",
                        `Addendum editor opened for test ${selectedPatient.testName}.`
                      )
                    }
                    className="py-2 px-3 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border border-surface-container"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    <span>Add Addendum</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* REGISTER WALK-IN PATIENT MODAL */}
        {registerModalOpen && (
          <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg p-stack-md mx-4 flex flex-col gap-stack-md animate-in fade-in zoom-in-95 duration-200 border border-surface-container">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container/60">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-title-md font-bold text-on-surface">Walk-in Patient Intake</h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Instant mobile registration for SMS diagnostic dispatch
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-indigo-gray-600 font-semibold">First Name</label>
                    <input
                      type="text"
                      required
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="e.g. Liam"
                      className="w-full px-3 py-2 bg-indigo-gray-50 rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue border border-surface-container/80"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-indigo-gray-600 font-semibold">Last Name</label>
                    <input
                      type="text"
                      required
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="e.g. Bennett"
                      className="w-full px-3 py-2 bg-indigo-gray-50 rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue border border-surface-container/80"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-indigo-gray-600 font-semibold">
                    Verified Mobile Phone Number (for SMS report dispatch)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91 98204 77102"
                      className="w-full pl-10 pr-3 py-2 bg-indigo-gray-50 rounded-lg text-on-surface font-mono text-body-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue border border-surface-container/80"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      call
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Patient will receive instantaneous cryptographic download link upon sign-off.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-indigo-gray-600 font-semibold">Age &amp; Gender</label>
                    <input
                      type="text"
                      value={newAgeGender}
                      onChange={(e) => setNewAgeGender(e.target.value)}
                      placeholder="e.g. 42 / Male"
                      className="w-full px-3 py-2 bg-indigo-gray-50 rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue border border-surface-container/80"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-indigo-gray-600 font-semibold">
                      Assign Test / Scan Type
                    </label>
                    <select
                      value={newTestType}
                      onChange={(e) => setNewTestType(e.target.value)}
                      className="w-full px-3 py-2 bg-indigo-gray-50 rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue border border-surface-container/80"
                    >
                      <option>Contrast Brain MRI</option>
                      <option>Full Body CT Scan</option>
                      <option>HbA1c &amp; Fasting Glucose</option>
                      <option>Ultrasound (Abdominal)</option>
                      <option>Cardiac Echo Doppler</option>
                      <option>CBC &amp; Lipid Profiler</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-indigo-gray-600 font-semibold">
                    Referring Physician / Facility
                  </label>
                  <input
                    type="text"
                    value={newPhysician}
                    onChange={(e) => setNewPhysician(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins (Cardiology)"
                    className="w-full px-3 py-2 bg-indigo-gray-50 rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue border border-surface-container/80"
                  />
                </div>

                <div className="p-3 rounded-lg bg-surface-container-low flex items-center gap-2 mt-1 border border-surface-container/80">
                  <input
                    id="smsConsent"
                    type="checkbox"
                    defaultChecked
                    className="rounded text-primary focus:ring-vibrant-blue h-4 w-4"
                  />
                  <label htmlFor="smsConsent" className="font-label-sm text-label-sm text-on-surface">
                    Patient has signed direct SMS electronic disclosure agreement (GDPR / HIPAA)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 mt-stack-sm pt-base border-t border-surface-container/60">
                  <button
                    type="button"
                    onClick={() => setRegisterModalOpen(false)}
                    className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container font-label-sm text-label-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-sm hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    Generate CYD-DIA Record &amp; Queue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION SYSTEM */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-indigo-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 border border-outline-variant/20">
            <div className="w-8 h-8 rounded-full bg-fresh-teal/20 text-fresh-teal flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm font-semibold text-white">{toast.title}</span>
              <span className="font-label-sm text-[11px] text-gray-300">{toast.sub}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
