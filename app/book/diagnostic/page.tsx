import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Without a lab chosen, open the booking page of the most recently added active lab.
export default async function DiagnosticBookingDefaultPage() {
  const supabase = await createClient();
  const { data: center } = await supabase
    .from("diagnostic_centers")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  redirect(center ? `/book/diagnostic/${center.id}` : "/diagnostics");
}
