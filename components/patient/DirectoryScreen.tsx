import { createClient, getSessionUser } from "@/lib/supabase/server";
import { pricedTests } from "@/lib/pricing";
import { getBookingFees } from "@/lib/booking-fees";
import { toLatLng } from "@/lib/geo";
import { loadPublicHospitals, loadPublicLabs } from "@/lib/public-directory";
import { PatientDock } from "@/components/PatientDock";
import { HospitalDirectory, LabDirectory, type DirectoryLab } from "@/components/patient/Directory";

// The partner hospital and lab lists (components/patient/Directory.tsx), with the viewer and the booking fees. The
// lists are shared by every visitor and cached (lib/public-directory.ts), so this is usually only the viewer's name.

async function viewer() {
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await (await createClient()).from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return { id: user.id, email: user.email ?? null, name: data?.full_name ?? user.user_metadata?.full_name ?? null };
}

/** Partner hospitals patients can book (they have doctors on the platform). */
export async function loadBookableHospitals() {
  return (await loadPublicHospitals()).filter((h) => h.doctors > 0);
}

/** Active partner labs with their priced tests and map pin. */
export async function loadDirectoryLabs(): Promise<DirectoryLab[]> {
  return (await loadPublicLabs()).map((l) => {
    const pin = toLatLng(l.latitude, l.longitude);
    const priced = pricedTests(l.test_prices as Parameters<typeof pricedTests>[0]);
    return { id: l.id, name: l.name, city: l.city, address: l.address, image: l.image_url, tests: priced.length, testNames: priced.map((t) => t.name), lat: pin?.lat ?? null, lng: pin?.lng ?? null };
  });
}

type Filters = { q?: string; city?: string };

function Frame({ user, children }: { user: Awaited<ReturnType<typeof viewer>>; children: React.ReactNode }) {
  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen">
      {children}
      <PatientDock activeTab="find" isSignedIn={!!user} name={user?.name} detail={user ? `UHID CYD-${user.id.slice(0, 8).toUpperCase()}` : null} />
    </div>
  );
}

export async function HospitalDirectoryScreen({ hospitals, filters = {} }: { hospitals: Awaited<ReturnType<typeof loadBookableHospitals>>; filters?: Filters }) {
  const [user, fees] = await Promise.all([viewer(), getBookingFees()]);
  return (
    <Frame user={user}>
      <HospitalDirectory
        hospitals={hospitals}
        fee={fees.consultation}
        account={{ isSignedIn: !!user, name: user?.name ?? null, email: user?.email ?? null }}
        initialQuery={filters.q ?? ""}
        initialCity={filters.city ?? ""}
      />
    </Frame>
  );
}

export async function LabDirectoryScreen({ labs, filters = {} }: { labs: DirectoryLab[]; filters?: Filters }) {
  const [user, fees] = await Promise.all([viewer(), getBookingFees()]);
  return (
    <Frame user={user}>
      <LabDirectory
        labs={labs}
        percent={fees.diagnosticPercent}
        account={{ isSignedIn: !!user, name: user?.name ?? null, email: user?.email ?? null }}
        initialQuery={filters.q ?? ""}
        initialCity={filters.city ?? ""}
      />
    </Frame>
  );
}
