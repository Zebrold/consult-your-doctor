// Patients book a doctor on the doctor's hospital page, start to finish: it opens with the doctor (and the time, type
// and services, when they were already picked) selected, and takes the booking fee there. Doctors not attached to a
// hospital are booked on their own booking page.

/** Where a "Book" button for a doctor goes. */
export function doctorBookingHref(
  doctorId: string,
  hospitalId: string | null | undefined,
  picks: { slotId?: string | null; fastTrack?: boolean; services?: string[] } = {},
) {
  const q = new URLSearchParams();
  if (hospitalId) q.set("doctor", doctorId);
  if (picks.slotId) q.set("slot", picks.slotId);
  if (picks.fastTrack) q.set("type", "fast_track");
  for (const s of picks.services ?? []) q.append("service", s);
  const query = q.toString();
  return `${hospitalId ? `/hospitals/${hospitalId}` : `/book/${doctorId}`}${query ? `?${query}` : ""}`;
}
