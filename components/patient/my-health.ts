import { ClipboardCheck, FileText, Pill, ShieldCheck, Siren, Star, Users, type LucideIcon } from "lucide-react";

/** The patient's "My health" pages: the sidebar's MY HEALTH group, the profile's quick links and the phone menu. */
export const MY_HEALTH: { key: string; href: string; label: string; icon: LucideIcon }[] = [
  { key: "insurance", href: "/patient/insurance", label: "Insurance", icon: ShieldCheck },
  { key: "records", href: "/patient/records", label: "Health records", icon: FileText },
  { key: "family", href: "/patient/family", label: "Family members", icon: Users },
  { key: "reminders", href: "/patient/reminders", label: "Medicines & reminders", icon: Pill },
  { key: "checkups", href: "/patient/checkups", label: "Health check-ups", icon: ClipboardCheck },
  { key: "reviews", href: "/patient/reviews", label: "My reviews", icon: Star },
  { key: "emergency", href: "/patient/emergency", label: "Emergency", icon: Siren },
];
