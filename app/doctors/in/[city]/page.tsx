import { jsonLd } from "@/lib/json-ld";
import { Metadata } from "next";
import { sameCity } from "@/lib/geo";
import { FindScreen, loadFindData } from "@/components/patient/FindScreen";

export const revalidate = 0;

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { city } = await props.params;
  const decodedCity = decodeURIComponent(city);
  const capitalizedCity = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1);

  return {
    title: `Top Doctors in ${capitalizedCity} | Consult Your Doctor`,
    description: `Find and book appointments with the best specialist doctors in ${capitalizedCity}. See experience, hospitals and open times, and book online.`,
  };
}

export default async function DoctorsInCityPage(props: Props) {
  const { city } = await props.params;
  const decodedCity = decodeURIComponent(city);
  const data = await loadFindData();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": data.doctors.filter((d) => sameCity(d.city, decodedCity)).map((doc, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/doctors/${doc.id}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <FindScreen data={data} initial={{ mode: "doc", city: decodedCity }} />
    </>
  );
}
