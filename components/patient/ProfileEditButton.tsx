"use client";

import { useState, type ReactNode } from "react";
import { EditProfileModal } from "@/components/EditProfileModal";

type ProfileDetails = {
  full_name: string | null;
  phone_number: string | null;
  blood_group: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
};

/** Opens the existing profile editor (saves through updatePatientProfile). */
export function ProfileEditButton({ details, className, children }: { details: ProfileDetails; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <EditProfileModal
        isOpen={open}
        onClose={() => setOpen(false)}
        user={null}
        profile={{ full_name: details.full_name, phone_number: details.phone_number }}
        patientDetails={details}
      />
    </>
  );
}
