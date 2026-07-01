import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, getWorkspaceForUser } from "@/lib/supabase";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query param required" },
      { status: 400 }
    );
  }

  // Verify ownership
  try {
    await getWorkspaceForUser(workspaceId, userId);
  } catch {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  const workspaceId = searchParams.get("workspaceId");

  if (!documentId || !workspaceId) {
    return NextResponse.json(
      { error: "documentId and workspaceId are required" },
      { status: 400 }
    );
  }

  // Verify workspace ownership
  try {
    await getWorkspaceForUser(workspaceId, userId);
  } catch {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
