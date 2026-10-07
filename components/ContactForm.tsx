"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, CircleCheck, Mail, MessageSquareText, Phone, Send, Tag, User, type LucideIcon } from "lucide-react";
import { COMPANY } from "@/lib/company";

const topics = ["General question", "Appointments & bookings", "Billing & payments", "Technical support", "Partnerships"];

const fieldClass =
  "w-full py-3 pl-10 pr-4 border border-outline-variant rounded-xl focus:border-vibrant-blue focus:ring-2 focus:ring-vibrant-blue/20 bg-surface-container-lowest text-sm text-on-surface placeholder:text-outline outline-none transition-all";

/** Composes the message in the visitor's email app, addressed to the company inbox. */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name")).trim();
    const phone = String(data.get("phone")).trim();
    const subject = `${data.get("topic")}: ${name}`;
    const lines = [String(data.get("message")).trim(), "", name, String(data.get("email")).trim()];
    if (phone) lines.push(phone);
    window.location.href = `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    setSent(true);
  }

  return (
    <div className="relative bg-surface-container-lowest rounded-2xl p-6 md:p-8 card-shadow border border-slate-200">
      <div className="mb-6">
        <h2 className="font-title-md text-xl md:text-2xl text-indigo-gray-900 font-bold">Send us a Message</h2>
        <p className="text-sm text-on-surface-variant mt-1">Tell us how we can help and our team will get back to you.</p>
      </div>

      {sent && (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-xl bg-fresh-teal/10 border border-fresh-teal/30 px-4 py-3 text-sm text-on-surface">
          <CircleCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <p>
            Your email app should now be open with your message ready to send. If it didn&apos;t open, write to us at{" "}
            <a href={`mailto:${COMPANY.email}`} className="font-semibold text-vibrant-blue hover:underline">{COMPANY.email}</a>.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" icon={User}>
            <input name="name" type="text" required autoComplete="name" placeholder="John Doe" className={fieldClass} />
          </Field>
          <Field label="Email Address" icon={Mail}>
            <input name="email" type="email" required autoComplete="email" placeholder="john@example.com" className={fieldClass} />
          </Field>
          <Field label="Phone (optional)" icon={Phone}>
            <input name="phone" type="tel" autoComplete="tel" placeholder="+49 151 2345678" className={fieldClass} />
          </Field>
          <Field label="Topic" icon={Tag}>
            <select name="topic" defaultValue={topics[0]} className={`${fieldClass} appearance-none cursor-pointer pr-10`}>
              {topics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
          </Field>
        </div>
        <Field label="Message" icon={MessageSquareText} top>
          <textarea name="message" required rows={5} placeholder="How can we help you?" className={`${fieldClass} resize-none`} />
        </Field>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-vibrant-blue hover:bg-primary text-on-primary font-semibold shadow-[0_10px_24px_rgba(0,102,255,0.28)] hover:shadow-[0_12px_28px_rgba(0,102,255,0.36)] active:scale-[0.99] transition-all"
        >
          Send Message <Send className="w-4 h-4" />
        </button>
        <p className="text-center text-[11px] font-medium text-on-surface-variant">
          Opens your email app with your message addressed to {COMPANY.email}. For medical emergencies, call your local emergency number.
        </p>
      </form>
    </div>
  );
}

function Field({ label, icon: Icon, top = false, children }: { label: string; icon: LucideIcon; top?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col">
      <span className="font-label-sm text-xs font-semibold text-vibrant-blue mb-1.5">{label}</span>
      <span className="relative block">
        <Icon className={`absolute left-3.5 w-4 h-4 text-vibrant-blue pointer-events-none ${top ? "top-3.5" : "top-1/2 -translate-y-1/2"}`} />
        {children}
      </span>
    </label>
  );
}
