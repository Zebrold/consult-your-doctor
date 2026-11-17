import { jsonLd } from "@/lib/json-ld";
import { Metadata } from "next";
import { HospitalDirectoryScreen, loadBookableHospitals } from "@/components/patient/DirectoryScreen";
import { directoryFilters, type DirectorySearch } from "@/lib/directory-params";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top Hospitals & Medical Centers | Consult Your Doctor",
  description: "Discover top-rated hospitals and medical centers. View facilities, contact details, and book doctor consultations.",
};

export default async function HospitalsDirectoryPage(props: { searchParams: Promise<DirectorySearch> }) {
  const filters = directoryFilters(await props.searchParams);
  const hospitals = await loadBookableHospitals();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": hospitals.map((hosp, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/hospitals/${hosp.id}`
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <HospitalDirectoryScreen hospitals={hospitals} filters={filters} />
    </>
  );
}
