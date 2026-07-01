"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Database, Plus, Sparkles, ShieldCheck } from "lucide-react";

export default function NewWorkspacePage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create workspace");
        return;
      }

      router.push(`/dashboard/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-size-[72px_72px] mask-[radial-gradient(ellipse_75%_60%_at_50%_0%,black,transparent_75%)]"
      />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="relative w-full max-w-lg"
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.03 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-[1.4rem] bg-linear-to-br from-violet-500 via-indigo-500 to-sky-500 shadow-2xl shadow-violet-500/25">
            <Database className="size-7 text-white" />
          </div>
          <p className="mb-3 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-violet-200/80">
            <Sparkles className="size-3.5" />
            Welcome to ContextVault
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Create your first workspace
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Workspaces isolate documents, chats, and tool actions so every project
            stays clean and private.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleCreate}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.06 }}
          className="rounded-[2rem] border border-white/10 bg-white/5.5 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6"
        >
          <div className="mb-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <ShieldCheck className="size-4" />
              Tenant isolation by default
            </div>
            <p className="text-xs leading-5 text-emerald-100/70">
              Retrieval and tool logs are scoped to the workspace you create.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-white"
            >
              Workspace name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Legal Documents, Product Research…"
              maxLength={100}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-muted-foreground shadow-inner shadow-black/20 focus:outline-none focus:ring-2 focus:ring-primary/60"
              autoFocus
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={!name.trim() || loading}
            whileHover={reduceMotion || !name.trim() || loading ? undefined : { y: -1, scale: 1.01 }}
            whileTap={reduceMotion || !name.trim() || loading ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-zinc-950 shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" />
            {loading ? "Creating…" : "Create workspace"}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
