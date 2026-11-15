import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { PatientNavHeader } from "@/components/PatientNavHeader";
import { PatientDock } from "@/components/PatientDock";
import { DeskTitle, PageBody } from "./app-ui";

/** The frame of a patient account page: the blue header on phones, the title on desktops, the navigation. */
export function AccountPage({
  user,
  profile,
  title,
  subtitle,
  phoneSubtitle,
  actions,
  hero,
  wide = false,
  children,
}: {
  user: User;
  profile: { full_name?: string | null; email?: string | null } | null;
  title: string;
  subtitle: ReactNode;
  /** A shorter line for the phone's blue header, when the desktop one is long. */
  phoneSubtitle?: ReactNode;
  /** Buttons beside the desktop title. */
  actions?: ReactNode;
  /** Inside the phone's blue header, under the title: the page's main buttons or a summary. */
  hero?: ReactNode;
  /** Use the full width on desktops (pages with a two-column layout). */
  wide?: boolean;
  children: ReactNode;
}) {
  const name = profile?.full_name || user.user_metadata?.full_name || "Patient";
  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen">
      <PatientNavHeader
        name={name}
        email={profile?.email || user.email}
        isSignedIn
        container="max-w-[900px] px-4 md:px-6"
        up={{ href: "/patient/profile", label: "My profile" }}
        title={title}
        subtitle={phoneSubtitle ?? subtitle}
        hero={hero}
        deskHidden
      />
      <PageBody>
        <div className={`max-w-[900px] ${wide ? "lg:max-w-none" : "lg:max-w-[1080px]"} mx-auto lg:mx-0 px-4 md:px-6 lg:px-0 pt-4 lg:pt-0 flex flex-col gap-3.5 lg:gap-5`}>
          <DeskTitle title={title} subtitle={subtitle} actions={actions} />
          {children}
        </div>
      </PageBody>
      <PatientDock activeTab="profile" name={name} detail={`UHID CYD-${user.id.slice(0, 8).toUpperCase()}`} />
    </div>
  );
}

/** A white card with a title and an optional line under it. */
export function AccountCard({ title, sub, children }: { title?: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] lg:rounded-2xl bg-white shadow-[0_0_0_1px_#E6EBF3] lg:shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)] p-4 lg:p-[22px]">
      {title && <h2 className="text-[16px] font-extrabold">{title}</h2>}
      {sub && <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">{sub}</p>}
      {title && <div className="mb-2" />}
      {children}
    </section>
  );
}
