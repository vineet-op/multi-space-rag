import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const { workspaceId } = await params;

  // Load all user workspaces for the switcher
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId!)
    .order("created_at", { ascending: true });

  if (!workspaces || workspaces.length === 0) {
    redirect("/dashboard/new");
  }

  // Verify the requested workspace belongs to this user
  const activeWorkspace = workspaces.find((w) => w.id === workspaceId);
  if (!activeWorkspace) {
    // Redirect to first workspace they own
    redirect(`/dashboard/${workspaces[0].id}`);
  }

  return (
    <DashboardShell
      workspaces={workspaces}
      activeWorkspace={activeWorkspace!}
    />
  );
}
