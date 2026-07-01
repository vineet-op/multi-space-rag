import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  // Load user's workspaces and redirect to the first one (or create-workspace page)
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (workspaces && workspaces.length > 0) {
    redirect(`/dashboard/${workspaces[0].id}`);
  }

  // No workspaces yet — redirect to onboarding
  redirect("/dashboard/new");
}
