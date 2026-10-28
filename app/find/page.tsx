import type { Metadata } from "next";
import type { FindMode } from "@/components/patient/FindClient";
import { FindScreen, loadFindData } from "@/components/patient/FindScreen";

export const metadata: Metadata = {
  title: "Find Doctors, Hospitals & Labs | Consult Your Doctor",
  description: "Search verified doctors, partner hospitals and diagnostic centres by speciality and city, see the next open slot, and book a visit.",
};

const MODES: Record<string, FindMode> = { doctors: "doc", hospitals: "hosp", labs: "lab", diagnostics: "lab", diagnostic: "lab" };

export default async function FindPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = (await props.searchParams) ?? {};
  const param = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  return (
    <FindScreen
      data={await loadFindData()}
      initial={{
        mode: MODES[param("mode") || param("type")] ?? "doc",
        q: param("q"),
        specialty: param("specialty"),
        city: param("city"),
        availableToday: param("available") === "today",
      }}
    />
  );
}
