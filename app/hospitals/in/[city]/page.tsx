import { jsonLd } from "@/lib/json-ld";
import { Metadata } from "next";
import { sameCity } from "@/lib/geo";
import { HospitalDirectoryScreen, loadBookableHospitals } from "@/components/patient/DirectoryScreen";

export const revalidate = 0;

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { city } = await props.params;
  const decodedCity = decodeURIComponent(city);
  const capitalizedCity = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1);

  return {
    title: `Best Hospitals in ${capitalizedCity} | Consult Your Doctor`,
    description: `Discover top-rated hospitals and medical centers in ${capitalizedCity}. View facilities, contact details, and book doctor consultations.`,
  };
}

export default async function HospitalsInCityPage(props: Props) {
  const { city } = await props.params;
  const decodedCity = decodeURIComponent(city);
  const hospitals = await loadBookableHospitals();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": hospitals.filter((h) => sameCity(h.city, decodedCity)).map((hosp, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://consultyourdoctor.de/hospitals/${hosp.id}`
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <HospitalDirectoryScreen hospitals={hospitals} filters={{ city: decodedCity }} />
    </>
  );
}
