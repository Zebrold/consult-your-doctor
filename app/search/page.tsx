import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { FindMode } from "@/components/patient/FindClient";
import { FindScreen, loadFindData } from "@/components/patient/FindScreen";

export const metadata: Metadata = {
  title: "Search Doctors, Hospitals & Labs | Consult Your Doctor",
  description: "Search verified doctors, partner hospitals and diagnostic centres by speciality and city, and book a visit online.",
};

const TYPES: Record<string, FindMode> = { doctor: "doc", hospital: "hosp", diagnostic: "lab" };

/** The older search address, still linked across the site: it opens the Find screen on the same list. */
export default async function SearchPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await props.searchParams;
  const param = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  // A hospital's doctors are listed, with their open times, on the hospital's own page.
  if (/^[0-9a-f-]{36}$/i.test(param("hospital_id"))) redirect(`/hospitals/${param("hospital_id")}`);

  return (
    <FindScreen
      data={await loadFindData()}
      initial={{ mode: TYPES[param("type")] ?? "doc", q: param("q"), specialty: param("specialty"), city: param("city") }}
    />
  );
}
