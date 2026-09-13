"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { addDiagnosticTest, deleteDiagnosticTest } from "@/app/actions/diagnostic-center";

interface DiagnosticAddTestClientProps {
  center: {
    id: string;
    name: string;
    city: string;
    address: string;
    available_tests?: string[];
    test_prices?: Record<string, number>;
  };
  directorName?: string;
}

const COMMON_TEST_SUGGESTIONS = [
  { name: "Complete Blood Count (CBC)", defaultFee: 350, category: "Hematology" },
  { name: "HbA1c Glycated Hemoglobin", defaultFee: 450, category: "Biochemistry" },
  { name: "Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)", defaultFee: 650, category: "Biochemistry" },
  { name: "Liver Function Test (LFT)", defaultFee: 750, category: "Biochemistry" },
  { name: "Thyroid Profile (Total T3, T4, TSH)", defaultFee: 550, category: "Endocrinology" },
  { name: "Kidney / Renal Function Test (KFT)", defaultFee: 650, category: "Biochemistry" },
  { name: "Vitamin D3 (25-Hydroxy)", defaultFee: 1200, category: "Immunoassay" },
  { name: "Vitamin B12 Assay", defaultFee: 850, category: "Immunoassay" },
  { name: "Urine Routine & Microscopy", defaultFee: 200, category: "Clinical Pathology" },
  { name: "High-Resolution Chest X-Ray (PA View)", defaultFee: 500, category: "Radiology" },
  { name: "Whole Abdomen & Pelvis Ultrasound (USG)", defaultFee: 1400, category: "Ultrasonography" },
  { name: "12-Lead Resting Electrocardiogram (ECG)", defaultFee: 350, category: "Cardiology" },
];

export function DiagnosticAddTestClient({
  center,
  directorName = "Dr. Katherine Vance",
}: DiagnosticAddTestClientProps) {
  const supabase = createClient();

  // Active tests state
  const [testsList, setTestsList] = useState<string[]>(center.available_tests || []);
  const [testPrices, setTestPrices] = useState<Record<string, number>>(center.test_prices || {});

  // Form state
  const [testName, setTestName] = useState("");
  const [testFee, setTestFee] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toast / Activity state
  const [toastMessage, setToastMessage] = useState<{ title: string; sub: string } | null>(null);
  const [deletingTest, setDeletingTest] = useState<string | null>(null);

  // Search in catalog
  const [catalogSearch, setCatalogSearch] = useState("");

  // REAL-TIME SUPABASE SUBSCRIPTION
  useEffect(() => {
    if (!center.id) return;

    const channel = supabase
      .channel(`diagnostic-center-tests-${center.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "diagnostic_centers",
          filter: `id=eq.${center.id}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as any;
            if (Array.isArray(updated.available_tests)) {
              setTestsList(updated.available_tests);
            }
            if (updated.test_prices) {
              setTestPrices(updated.test_prices);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, center.id]);

  // Handle Form Submit
  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = testName.trim();
    const numFee = Number(testFee);

    if (!cleanName) {
      setErrorMessage("Please enter a diagnostic test name.");
      return;
    }
    if (isNaN(numFee) || numFee < 0) {
      setErrorMessage("Please enter a valid non-negative fee in ₹ INR.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await addDiagnosticTest(center.id, cleanName, numFee);

      if (res.error) {
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      // Optimistically update local state immediately
      if (res.available_tests) setTestsList(res.available_tests);
      if (res.test_prices) setTestPrices(res.test_prices);

      setIsSubmitting(false);
      setSubmitSuccess(true);

      setToastMessage({
        title: "Diagnostic Test Registered",
        sub: `"${cleanName}" added at ₹${numFee} INR to ${center.name}.`,
      });

      setTimeout(() => {
        setSubmitSuccess(false);
        setTestName("");
        setTestFee("");
      }, 1800);

      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Failed to add test.");
    }
  };

  // Handle Quick Select chip
  const handleSelectSuggestion = (s: { name: string; defaultFee: number }) => {
    setTestName(s.name);
    setTestFee(s.defaultFee.toString());
    setErrorMessage(null);
  };

  // Handle Delete Test
  const handleDeleteTest = async (tName: string) => {
    if (!confirm(`Are you sure you want to remove "${tName}" from this centre's active catalog?`)) {
      return;
    }

    setDeletingTest(tName);
    try {
      const res = await deleteDiagnosticTest(center.id, tName);
      if (res.available_tests) setTestsList(res.available_tests);
      if (res.test_prices) setTestPrices(res.test_prices);

      setToastMessage({
        title: "Test Removed",
        sub: `"${tName}" was removed from the active catalog.`,
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingTest(null);
    }
  };

  // Filtered tests in live table
  const filteredTests = testsList.filter((t) =>
    t.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen flex flex-col font-body-md text-on-surface antialiased bg-background">
      {/* MAIN EDITABLE CONTENT AREA */}
      <main className="flex-1 px-4 sm:px-8 py-8 sm:py-10 max-w-4xl mx-auto w-full">
        {/* Breadcrumb strip for context */}
        <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-4">
          <Link
            href="/diagnostic-center/dashboard"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">domain</span>
            <span>{center.name || "Central Diagnostic Laboratory"}</span>
          </Link>
          <span className="text-outline">/</span>
          <span className="text-primary font-semibold">Add Diagnostic Test</span>
        </div>

        {/* Page Heading & Subtitle */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] uppercase tracking-wider font-bold">
              Test Catalog Master
            </span>
            <span className="text-outline-variant text-[11px]">•</span>
            <span className="flex items-center gap-1.5 text-fresh-teal font-label-sm text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse"></span>
              Real-time DB Active
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-indigo-gray-900 tracking-tight">
            Add Diagnostic Test to Centre
          </h1>
          <p className="text-sm text-indigo-gray-600 mt-1.5">
            Enter standard test name and set the diagnostic test fee in Indian Rupees (₹ INR).
          </p>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SINGLE SECTION: Test Details & Pricing Card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden mb-10">
          {/* Section Header */}
          <div className="px-5 sm:px-7 py-5 border-b border-outline-variant bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  ></path>
                </svg>
              </div>
              <div>
                <h2 className="font-headline-lg text-base font-bold text-indigo-gray-900">
                  Diagnostic Test Details &amp; Pricing
                </h2>
                <p className="text-xs text-indigo-gray-600">
                  Basic identification and standard fee configuration
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-primary border border-blue-100">
              Mandatory
            </span>
          </div>

          {/* Section Form Body */}
          <form className="p-5 sm:p-7 space-y-6" id="add-test-form" onSubmit={handleSaveTest}>
            {/* Field 1: Diagnostic Test Name */}
            <div>
              <label
                className="block text-sm font-semibold text-indigo-gray-900 mb-1.5"
                htmlFor="test-name"
              >
                Diagnostic Test Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                id="test-name"
                name="test-name"
                placeholder="e.g. Complete Blood Count (CBC) or HbA1c Glycated Hemoglobin"
                required
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
              />
              <p className="text-xs text-indigo-gray-600 mt-1.5">
                Enter clinical or common laboratory investigation name
              </p>

              {/* Quick Select Investigation Chips */}
              <div className="mt-3">
                <span className="text-[11px] text-indigo-gray-600 font-semibold uppercase tracking-wider block mb-1.5">
                  Popular Standard Lab Investigations:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TEST_SUGGESTIONS.slice(0, 6).map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-primary/10 hover:text-primary text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                    >
                      + {s.name} (₹{s.defaultFee})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field 2: Diagnostic Test Fee / Amount in INR */}
            <div>
              <label
                className="block text-sm font-semibold text-indigo-gray-900 mb-1.5"
                htmlFor="test-fee"
              >
                Test Amount (₹ INR) <span className="text-red-500">*</span>
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-base">
                  ₹
                </span>
                <input
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  id="test-fee"
                  min="0"
                  name="test-fee"
                  placeholder="e.g. 450"
                  required
                  step="1"
                  type="number"
                  value={testFee}
                  onChange={(e) => setTestFee(e.target.value)}
                />
              </div>
              <p className="text-xs text-indigo-gray-600 mt-1.5">
                Set standard diagnostic charge for this test in Indian Rupees
              </p>
            </div>

            {/* Divider & Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
                id="btn-clear"
                type="button"
                onClick={() => {
                  setTestName("");
                  setTestFee("");
                  setErrorMessage(null);
                }}
              >
                Discard / Clear
              </button>
              <button
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer ${
                  submitSuccess
                    ? "bg-fresh-teal"
                    : "bg-primary hover:bg-blue-600 active:scale-95"
                }`}
                id="btn-save"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Adding Test to DB...</span>
                  </>
                ) : submitSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Test Added Successfully!</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Save &amp; Add Test (₹ INR)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* LIVE CATALOG MATRIX: Tests currently in this Diagnostic Centre */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-5 sm:px-7 py-4 border-b border-outline-variant bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-fresh-teal/10 text-fresh-teal flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              </div>
              <div>
                <h3 className="font-headline-lg text-base font-bold text-indigo-gray-900">
                  Current Test Catalog &amp; Tariff Schedule
                </h3>
                <p className="text-xs text-indigo-gray-600">
                  {testsList.length} investigations active for {center.name}
                </p>
              </div>
            </div>

            {/* Quick Filter */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search catalog..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary w-48"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTests.length === 0 ? (
              <div className="p-8 text-center text-sm text-on-surface-variant">
                No diagnostic tests found in catalog matching &quot;{catalogSearch}&quot;.
              </div>
            ) : (
              filteredTests.map((test) => {
                const fee = testPrices[test] !== undefined ? testPrices[test] : 500;
                return (
                  <div
                    key={test}
                    className="px-5 sm:px-7 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">biotech</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-indigo-gray-900 truncate">
                          {test}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-indigo-gray-600">
                          <span className="inline-flex items-center gap-1 text-fresh-teal font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-fresh-teal"></span>
                            Active Online
                          </span>
                          <span>•</span>
                          <span>Report TAT: Same Day / 24 hrs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-bold text-indigo-gray-900 font-mono">
                          ₹{fee}
                        </span>
                        <span className="text-[10px] text-indigo-gray-600 block">INR Standard</span>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${test}`}
                        disabled={deletingTest === test}
                        onClick={() => handleDeleteTest(test)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {deletingTest === test ? (
                          <span className="material-symbols-outlined text-[16px] animate-spin">
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* MINIMAL PROFESSIONAL FOOTER */}
      <footer className="mt-auto border-t border-outline-variant bg-surface-container-lowest py-5 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              Consult Your Doctor Healthcare Diagnostics
            </span>
            <span>•</span>
            <span>GSTIN: 27AAACC4112L1Z9</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px] text-fresh-teal">
                verified_user
              </span>
              NABL ISO 15189:2022
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
              ABDM Integrated
            </span>
          </div>
        </div>
      </footer>

      {/* FLOATING ACTION TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-300 pointer-events-none animate-in fade-in slide-in-from-bottom-5">
          <div className="px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl flex items-center gap-3 border border-slate-700">
            <span className="material-symbols-outlined text-fresh-teal text-[22px]">
              check_circle
            </span>
            <div className="flex flex-col">
              <span className="font-label-sm text-[13px] font-bold">{toastMessage.title}</span>
              <span className="font-label-sm text-[11px] text-slate-300">{toastMessage.sub}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
