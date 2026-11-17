import { jsonLd } from "@/lib/json-ld";
import { Metadata } from "next";
import { LabDirectoryScreen, loadDirectoryLabs } from "@/components/patient/DirectoryScreen";
import { directoryFilters, type DirectorySearch } from "@/lib/directory-params";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top Diagnostic Centers & Labs | Consult Your Doctor",
  description: "Find the best diagnostic centers for MRI, CT Scans, Blood Tests, and more. Compare centers and book your tests.",
};

export default async function DiagnosticsDirectoryPage(props: { searchParams: Promise<DirectorySearch> }) {
  const filters = directoryFilters(await props.searchParams);
  const labs = await loadDirectoryLabs();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": labs.map((center, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/book/diagnostic/${center.id}`
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <LabDirectoryScreen labs={labs} filters={filters} />
    </>
  );
}
