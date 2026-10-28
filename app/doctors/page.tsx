import { jsonLd } from "@/lib/json-ld";
import { Metadata } from "next";
import { FindScreen, loadFindData } from "@/components/patient/FindScreen";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Top Doctors & Medical Specialists | Consult Your Doctor",
  description: "Browse our comprehensive directory of top-rated doctors and medical specialists. Book consultations and view patient reviews.",
};

export default async function DoctorsDirectoryPage() {
  const data = await loadFindData();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": data.doctors.map((doc, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/doctors/${doc.id}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <FindScreen data={data} initial={{ mode: "doc" }} />
    </>
  );
}
