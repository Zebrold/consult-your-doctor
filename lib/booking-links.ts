// Patients book a doctor through the doctor's hospital page: it opens with the doctor (and the time, when one was
// already picked) selected, and its Book now continues to the booking page. Doctors not attached to a hospital are
// booked on their own booking page.

/** Where a "Book" button for a doctor goes. */
export function doctorBookingHref(doctorId: string, hospitalId: string | null | undefined, slotId?: string | null) {
  if (!hospitalId) return `/book/${doctorId}`;
  const q = new URLSearchParams({ doctor: doctorId });
  if (slotId) q.set("slot", slotId);
  return `/hospitals/${hospitalId}?${q}`;
}
