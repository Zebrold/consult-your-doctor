import { redirect } from "next/navigation";

// The doctors-in-a-city list (the old Find screen) was removed; the city's partner hospitals list their doctors.
export default async function DoctorsInCityPage(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  redirect(`/hospitals/in/${encodeURIComponent(decodeURIComponent(city))}`);
}
