import { z } from "zod";
import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { supabase } from "./supabase";

// ---- Tool schemas for Gemini function calling ----

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "save_task",
    description:
      "Save a task or action item into the current workspace. Use this when the user asks to create a task, reminder, or to-do.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Short, descriptive title for the task",
        },
        description: {
          type: SchemaType.STRING,
          description: "Optional longer description or notes for the task",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "send_discord_summary",
    description:
      "Send a summary or notification to the team Discord channel. Use this when the user asks to share, post, or send a summary.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        summary: {
          type: SchemaType.STRING,
          description: "The summary text to send to Discord",
        },
      },
      required: ["summary"],
    },
  },
];

// ---- Zod validation schemas ----

const SaveTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

const SendDiscordSummarySchema = z.object({
  summary: z.string().min(1).max(4000),
});

// ---- Tool result type ----

export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

// ---- Executors ----

export async function executeSaveTask(
  args: unknown,
  workspaceId: string
): Promise<ToolResult> {
  const parsed = SaveTaskSchema.safeParse(args);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid arguments: ${parsed.error.message}`,
    };
  }

  const { title, description } = parsed.data;

  const { error } = await supabase.from("tasks").insert({
    workspace_id: workspaceId,
    title,
    description: description ?? null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { title, description } };
}

export async function executeSendDiscordSummary(
  args: unknown
): Promise<ToolResult> {
  const parsed = SendDiscordSummarySchema.safeParse(args);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid arguments: ${parsed.error.message}`,
    };
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      success: false,
      error: "Discord webhook not configured",
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: parsed.data.summary,
      username: "ContextVault",
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: `Discord returned ${response.status}`,
    };
  }

  return { success: true, data: { sent: true } };
}

/**
 * Dispatch a tool call by name. Returns a ToolResult.
 * Logs the call to the tool_calls table.
 */
export async function dispatchTool(
  toolName: string,
  args: unknown,
  workspaceId: string
): Promise<ToolResult> {
  let result: ToolResult;

  if (toolName === "save_task") {
    result = await executeSaveTask(args, workspaceId);
  } else if (toolName === "send_discord_summary") {
    result = await executeSendDiscordSummary(args);
  } else {
    result = { success: false, error: `Unknown tool: ${toolName}` };
  }

  // Audit log — fire and forget (don't throw if logging fails)
  void (async () => {
    try {
      await supabase.from("tool_calls").insert({
        workspace_id: workspaceId,
        tool_name: toolName,
        arguments: args as Record<string, unknown>,
        result: result as Record<string, unknown>,
        status: result.success ? "success" : "error",
      });
    } catch {
      // ignore logging errors
    }
  })();

  return result;
}
