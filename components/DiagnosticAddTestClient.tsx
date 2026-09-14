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

export function DiagnosticAddTestClient({
  center,
  directorName = "Dr. Katherine Vance",
}: DiagnosticAddTestClientProps) {
  const supabase = createClient();

  // Active tests state directly synced from DB
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

  // Real-time Supabase subscription for instant live updates
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

  // Handle Form Submit to Supabase DB
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

      if (res.available_tests) setTestsList(res.available_tests);
      if (res.test_prices) setTestPrices(res.test_prices);

      setIsSubmitting(false);
      setSubmitSuccess(true);

      setToastMessage({
        title: "Test Added to Database",
        sub: `"${cleanName}" (₹${numFee} INR) added to ${center.name}.`,
      });

      setTimeout(() => {
        setSubmitSuccess(false);
        setTestName("");
        setTestFee("");
      }, 1500);

      setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Failed to add test.");
    }
  };

  // Handle Discard / Clear
  const handleDiscard = () => {
    setTestName("");
    setTestFee("");
    setErrorMessage(null);
    setSubmitSuccess(false);
  };

  // Handle Delete Test from DB
  const handleDeleteTest = async (tName: string) => {
    if (!confirm(`Remove "${tName}" from this centre's database catalog?`)) {
      return;
    }

    setDeletingTest(tName);
    try {
      const res = await deleteDiagnosticTest(center.id, tName);
      if (res.available_tests) setTestsList(res.available_tests);
      if (res.test_prices) setTestPrices(res.test_prices);

      setToastMessage({
        title: "Test Removed",
        sub: `"${tName}" deleted from Supabase DB.`,
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingTest(null);
    }
  };

  return (
    <div className="w-full px-4 pt-3 pb-8 max-w-md mx-auto sm:max-w-xl md:max-w-3xl flex flex-col gap-4">
      {/* BREADCRUMB STRIP */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link
          href="/diagnostic-center/dashboard"
          className="hover:text-blue-600 transition-colors"
        >
          Central Diagnostic Lab
        </Link>
        <span className="text-slate-400">›</span>
        <span className="text-[#0066FF] font-bold">Add Diagnostic Test</span>
      </div>

      {/* COMPLIANCE BADGES PILL */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#A7F3D0]/60 text-[#065F46] border border-[#6EE7B7]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
          <span>NABL ISO 15189</span>
        </span>

        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]/40">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          <span>ABDM M3 Ready</span>
        </span>
      </div>

      {/* PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
          Add Diagnostic Test to Centre
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Enter standard test name and set the diagnostic test fee in Indian Rupees (₹ INR).
        </p>
      </div>

      {/* STANDARDIZED CATALOG HERO CARD */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 border border-slate-100 p-2 flex items-center justify-center text-teal-600 shrink-0">
          <span className="material-symbols-outlined text-[30px]">science</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#0D9488] uppercase tracking-wider">
            STANDARDIZED CATALOG
          </span>
          <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
            NABL Reference Pricing
          </h2>
          <p className="text-xs text-slate-500 line-clamp-1">
            Syncs with automated billing and HIS...
          </p>
        </div>
      </div>

      {/* MAIN FORM CARD: Diagnostic Test Details & Pricing */}
      <form
        onSubmit={handleSaveTest}
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col gap-4"
      >
        {/* Card Header with Mandatory badge */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">experiment</span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Diagnostic Test Details &amp; Pricing
            </h2>
          </div>
          <span className="text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
            MANDATORY
          </span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Diagnostic Test Name Field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="testNameInput" className="text-xs font-bold text-slate-700">
              Diagnostic Test Name <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] font-mono text-slate-400">{testName.length}/120</span>
          </div>

          <input
            id="testNameInput"
            type="text"
            maxLength={120}
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g. Complete Blood Count (CBC) or"
            className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0066FF] focus:bg-white transition-all"
          />

          <span className="text-[11px] text-slate-400">
            Enter clinical or common laboratory investigation name
          </span>
        </div>

        {/* Test Amount (₹ INR) Field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="testAmountInput" className="text-xs font-bold text-slate-700">
            Test Amount (₹ INR) <span className="text-rose-500">*</span>
          </label>

          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-600 font-bold text-base">₹</span>
            <input
              id="testAmountInput"
              type="number"
              min="0"
              step="1"
              value={testFee}
              onChange={(e) => setTestFee(e.target.value)}
              placeholder="e.g. 450"
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0066FF] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
            <span>Set standard diagnostic charge for this test in Indian Rupees</span>
            <span className="font-semibold text-emerald-600">Incl. 0% GST (Clinical)</span>
          </div>
        </div>

        {/* ABDM Digital Health Record Linking Card */}
        <div className="bg-[#EFF6FF] border border-blue-100 rounded-xl p-3.5 flex items-start gap-3">
          <span className="material-symbols-outlined text-[#0066FF] text-[20px] shrink-0 mt-0.5">
            verified_user
          </span>
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-slate-900">ABDM Digital Health Record Linking</h3>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Test code will be automatically indexed to LOINC &amp; SNOMED-CT clinical dictionaries for fast patient record generation.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-bold text-sm py-3 px-4 rounded-full flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
            ) : submitSuccess ? (
              <>
                <span className="material-symbols-outlined text-[18px] text-emerald-300">check_circle</span>
                <span>Saved to Database!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Save &amp; Add Test (₹ INR)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDiscard}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold text-sm py-2.5 px-4 rounded-full flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            <span>Discard / Clear</span>
          </button>
        </div>
      </form>

      {/* INSTITUTIONAL COMPLIANCE SECTION */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">
            INSTITUTIONAL COMPLIANCE
          </span>
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Live Gateway</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: GSTIN */}
          <div className="bg-[#F1F5F9] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GSTIN</span>
            <span className="text-[11px] font-extrabold text-slate-800 mt-1 truncate max-w-full">
              27AABCY1982M1Z8
            </span>
          </div>

          {/* Card 2: NABL ISO */}
          <div className="bg-[#F1F5F9] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NABL ISO</span>
            <span className="text-[11px] font-extrabold text-slate-800 mt-1">15189:2022 Accr.</span>
          </div>

          {/* Card 3: ABDM */}
          <div className="bg-[#F1F5F9] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ABDM</span>
            <span className="text-[11px] font-extrabold text-teal-700 mt-1">Milestone 3</span>
          </div>
        </div>
      </div>

      {/* ACTIVE CATALOG FROM DB (Live view of all tests stored in Supabase) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">
            Active Centre Catalog ({testsList.length} Tests in DB)
          </h2>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Live DB Synced
          </span>
        </div>

        <div className="divide-y divide-slate-100 flex flex-col">
          {testsList.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No tests added yet.</p>
          ) : (
            testsList.map((tName) => {
              const price = testPrices[tName] || 0;
              return (
                <div key={tName} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{tName}</span>
                    <span className="text-[11px] font-semibold text-[#0066FF]">
                      ₹{price.toLocaleString("en-IN")} INR
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={deletingTest === tName}
                    onClick={() => handleDeleteTest(tName)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Test"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {deletingTest === tName ? "progress_activity" : "delete"}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* TOAST POPUP */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-800">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
            <span>{toastMessage.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}
