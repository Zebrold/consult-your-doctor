import { redirect } from "next/navigation";
import { findRedirectTarget, type DirectorySearch } from "@/lib/directory-params";

// The doctor list (the old Find screen) was removed: patients choose a speciality, then a hospital and its doctor.
// A speciality in the link opens that speciality's page; anything else Browse specialities (lib/directory-params.ts).
export default async function DoctorsDirectoryPage(props: { searchParams: Promise<DirectorySearch> }) {
  redirect(findRedirectTarget(await props.searchParams));
}
