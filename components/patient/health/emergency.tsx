"use client";

import { useState, type FormEvent } from "react";
import { LocateFixed, MapPin, MessageSquareText, Navigation, Phone, Plus, Trash2 } from "lucide-react";
import { btnOutline, btnPrimary, card } from "@/components/patient/app-ui";
import { byNearness, placeLabel, usePatientLocation } from "@/components/patient/location";
import { directionsHref, firstName, initials, maskPhone } from "@/components/patient/format";
import { formatDistance } from "@/lib/geo";
import { addEmergencyContact, removeEmergencyContact } from "@/app/actions/patient-health";
import type { EmergencyContact } from "@/lib/patient-health";
import { Dialog, DialogButtons, ErrorNote, field, fieldLabel, NotReady, optional, useAction } from "./kit";

export type EmergencyHospital = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  /** Lists "24x7 Emergency" among its facilities. */
  allDay: boolean;
  /** Accepts the patient's insurer. */
  cashless: boolean;
};

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** The emergency hospitals nearest the patient's location (kept in this browser), with Call and Directions. */
export function NearestEmergency({ hospitals }: { hospitals: EmergencyHospital[] }) {
  const { location, status, locate } = usePatientLocation();
  const rows = byNearness(hospitals, location).slice(0, 3);
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-extrabold">Nearest emergency</h2>
          <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">
            {location ? `Based on your location in ${placeLabel(location)}` : "Partner hospitals with an emergency department or emergency number"}
          </p>
        </div>
        {location?.kind !== "gps" && (
          <button type="button" onClick={() => locate()} disabled={status === "locating"} className="shrink-0 flex items-center gap-1.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline disabled:opacity-60">
            <LocateFixed className="w-4 h-4" /> {status === "locating" ? "Finding you…" : "Use my location"}
          </button>
        )}
      </div>
      {status === "denied" && <p className="mt-2 text-[12.5px] font-bold text-[#B54708]">Location is blocked for this site. Allow it in your browser settings to sort by distance.</p>}
      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#F3F6FC] px-4 py-3.5 text-[13px] text-[#5B667A]">No partner hospital has listed an emergency department yet. Call 108 for an ambulance.</p>
      ) : (
        <div className="mt-1">
          {rows.map(({ item: h, km }) => {
            const directions = h.lat != null && h.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}` : directionsHref(h.name, h.address, h.city);
            const facts = [h.allDay ? "Emergency open 24/7" : "Emergency number listed", h.cashless ? "accepts your insurer" : null].filter(Boolean).join(" · ");
            return (
              <div key={h.id} className="flex flex-col lg:flex-row lg:items-center gap-3 py-3.5 border-t border-[#EEF2F7] first:border-t-0 lg:first:border-t">
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] font-extrabold">{h.name}</span>
                  <span className="block mt-0.5 text-[12.5px] text-[#5B667A]">{[h.city, km != null ? formatDistance(km) : null].filter(Boolean).join(" · ")}</span>
                  <span className="block mt-0.5 text-[12.5px] font-bold text-[#2A4DD0]">{facts}</span>
                </span>
                <span className="grid grid-cols-2 lg:flex gap-2 shrink-0">
                  {h.phone ? (
                    <a href={tel(h.phone)} className={btnPrimary}>
                      <Phone className="w-4 h-4" /> Call hospital
                    </a>
                  ) : (
                    <span className={`${btnOutline} opacity-60`}>No phone listed</span>
                  )}
                  {directions && (
                    <a href={directions} target="_blank" rel="noopener noreferrer" className={btnOutline}>
                      <Navigation className="w-4 h-4" /> Directions
                    </a>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** The emergency contacts: the one on the patient's details first, then the ones added here. */
export function EmergencyContacts({ contacts, ready }: { contacts: EmergencyContact[]; ready: boolean }) {
  const [adding, setAdding] = useState(false);
  const { pending, error, run } = useAction();
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(() => addEmergencyContact({ name: String(f.get("name") ?? ""), relation: String(f.get("relation") ?? ""), phone: String(f.get("phone") ?? "") }), () => setAdding(false));
  };
  const remove = useAction();
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-extrabold">Emergency contacts</h2>
        {ready && (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
            Add <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
          </button>
        )}
      </div>
      {contacts.length === 0 && <p className="mt-2 text-[13px] text-[#5B667A]">Add someone to call if you need help. Your profile&apos;s emergency contact shows here too.</p>}
      <div className="mt-1">
        {contacts.map((c) => (
          <div key={c.id ?? "primary"} className="flex items-center gap-3 py-3 border-t border-[#EEF2F7] first:border-t-0">
            <span className="shrink-0 w-[38px] h-[38px] rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[12px] font-extrabold">{initials(c.name)}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-extrabold truncate">{c.name}</span>
              <span className="block text-[12px] text-[#5B667A] truncate">{[c.relation, c.phone ? maskPhone(c.phone) : null].filter(Boolean).join(" · ")}</span>
            </span>
            {c.phone && (
              <a href={tel(c.phone)} className={`${btnOutline} h-9! px-3!`}>
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
            {c.id && (
              <button type="button" aria-label={`Remove ${c.name}`} disabled={remove.pending} onClick={() => remove.run(() => removeEmergencyContact(c.id!))} className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[#5B667A] hover:bg-[#F4F6FA] hover:text-[#B42318]">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!ready && <NotReady>More emergency contacts open up after the next update.</NotReady>}
      {remove.error && <div className="mt-2"><ErrorNote error={remove.error} /></div>}
      {adding && (
        <Dialog title="Add an emergency contact" sub="Someone to call if you need help." onClose={() => setAdding(false)}>
          <form onSubmit={add} className="flex flex-col gap-3.5">
            <div>
              <label htmlFor="ec-name" className={fieldLabel}>Full name</label>
              <input id="ec-name" name="name" required minLength={2} maxLength={80} autoComplete="off" className={field} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ec-relation" className={fieldLabel}>Relation {optional}</label>
                <input id="ec-relation" name="relation" maxLength={40} placeholder="e.g. Mother" className={field} />
              </div>
              <div>
                <label htmlFor="ec-phone" className={fieldLabel}>Mobile number</label>
                <input id="ec-phone" name="phone" type="tel" required inputMode="tel" maxLength={16} placeholder="98765 43210" className={field} />
              </div>
            </div>
            <ErrorNote error={error} />
            <DialogButtons onCancel={() => setAdding(false)} pending={pending} label="Save contact" />
          </form>
        </Dialog>
      )}
    </section>
  );
}

/** Texts the patient's current location (a map link) to an emergency contact, from the patient's own phone. */
export function SendLocation({ contacts }: { contacts: EmergencyContact[] }) {
  const withPhone = contacts.filter((c) => c.phone);
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");
  const send = (c: EmergencyContact) => {
    if (!("geolocation" in navigator)) return setState("error");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const body = `I need help. My location: https://maps.google.com/?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;
        setState("idle");
        window.location.href = `sms:${c.phone!.replace(/[^\d+]/g, "")}?body=${encodeURIComponent(body)}`;
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <h2 className="text-[16px] font-extrabold">Share my location</h2>
      <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">Opens a text message from your phone with a map link to where you are. Nothing is sent until you press send.</p>
      {withPhone.length === 0 ? (
        <p className="mt-3 text-[13px] text-[#5B667A]">Add an emergency contact with a mobile number first.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {withPhone.map((c) => (
            <button key={c.id ?? "primary"} type="button" onClick={() => send(c)} disabled={state === "locating"} className={`${btnOutline} justify-start!`}>
              <MessageSquareText className="w-4 h-4 text-[#2A4DD0]" /> Text my location to {firstName(c.name)}
            </button>
          ))}
        </div>
      )}
      {state === "locating" && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold text-[#2A4DD0]">
          <MapPin className="w-3.5 h-3.5" /> Finding your location…
        </p>
      )}
      {state === "error" && <p className="mt-2 text-[12.5px] font-bold text-[#B54708]">Couldn&apos;t get your location. Allow location for this site, or tell them where you are.</p>}
    </section>
  );
}
