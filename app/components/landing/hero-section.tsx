import { ArrowUpRight, FileText, FolderOpen, Sparkles } from "lucide-react";

import { ExploreButton } from "@/app/components/landing/auth-buttons";
import { Badge } from "@/app/components/ui/badge";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const workspaces = [
  { name: "Legal", active: true, docs: 12 },
  { name: "Product", active: false, docs: 8 },
  { name: "HR", active: false, docs: 5 },
];

export async function HeroSection() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      {/* ── Background layers ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[#09090b]"
      >
        {/* Top radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-5%,rgba(139,92,246,0.22),transparent)]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(139,92,246,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black 50%, transparent 100%)",
          }}
        />
        {/* Side orbs */}
        <div className="absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />
      </div>

      {/* ── Hero copy — staggered entry ── */}
      <div className="mx-auto max-w-3xl text-center">
        {/* Stagger slot 1 */}
        <div className="animate-in fade-in slide-in-from-bottom-4 blur-in duration-700 [animation-delay:100ms]">
          <Badge className="mb-8 gap-1.5 border-violet-500 px-4 py-1.5 sm:text-xs font-medium text-neutral-950 bg-white text-[8px]">
            <Sparkles className="size-3.5" />
            Multi-workspace document intelligence
          </Badge>
        </div>

        {/* Stagger slot 2 */}
        <div className="animate-in fade-in slide-in-from-bottom-5 blur-in duration-700 fill-mode-both [animation-delay:220ms]">
          <h1 className="font-heading text-4xl font-bold tracking-tighter text-white text-balance sm:text-6xl lg:text-[4.5rem]">
            Ask your documents
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-300 bg-clip-text text-transparent">
              anything.
            </span>
          </h1>
        </div>

        {/* Stagger slot 3 */}
        <div className="animate-in fade-in slide-in-from-bottom-4 blur-in duration-700 fill-mode-both [animation-delay:350ms]">
          <p className="mx-auto mt-6 max-w-xl text-md tracking-tighter text-zinc-400 text-pretty sm:text-md">
            Upload files into isolated workspaces, then chat with your knowledge
            base. Every answer is grounded in your data cited, accurate, and
            private.
          </p>
        </div>

        {/* Stagger slot 4 — CTA */}
        <div className="animate-in fade-in slide-in-from-bottom-4 blur-in duration-700 fill-mode-both [animation-delay:480ms]">
          <div className="mt-10 flex justify-center">
            <ExploreButton />
          </div>
        </div>
      </div>

      {/* ── Product preview ── */}
      <div className="animate-in fade-in slide-in-from-bottom-6 blur-in duration-1000 fill-mode-both [animation-delay:650ms] relative mx-auto mt-20 w-full max-w-4xl">
        {/* Glow behind card */}
        <div
          aria-hidden
          className="absolute -inset-8 rounded-[2rem] bg-gradient-to-b from-violet-600/18 via-indigo-600/8 to-transparent blur-3xl"
        />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] shadow-2xl shadow-black/60">
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500/60" />
                <span className="size-2.5 rounded-full bg-amber-500/60" />
                <span className="size-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="hidden text-[11px] text-zinc-500 sm:inline tracking-wide">
                ContextVault
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <FolderOpen className="size-3.5" />3 workspaces
            </div>
          </div>

          <div className="grid sm:grid-cols-[175px_1fr]">
            {/* Sidebar */}
            <div className="border-b border-white/[0.06] bg-white/[0.02] p-3 sm:border-r sm:border-b-0">
              <p className="mb-2.5 px-2 text-[10px] font-semibold tracking-widest text-zinc-600 uppercase">
                Workspaces
              </p>
              <ul className="space-y-0.5">
                {workspaces.map((ws) => (
                  <li
                    key={ws.name}
                    className={
                      ws.active
                        ? "flex items-center justify-between rounded-lg bg-violet-500/15 px-2.5 py-2 text-sm font-medium text-violet-300 ring-1 ring-violet-500/20"
                        : "flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-zinc-500"
                    }
                  >
                    {ws.name}
                    <span className="text-[11px] tabular-nums opacity-50">
                      {ws.docs}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chat pane */}
            <div className="p-4 sm:p-5">
              {/* Uploaded docs strip */}
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-violet-500/20 bg-violet-500/[0.06] px-3 py-2.5">
                <FileText className="size-4 shrink-0 text-violet-400" />
                <span className="truncate text-xs text-zinc-500">
                  contract.pdf · policy.docx · handbook.pdf
                </span>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white/[0.07] px-4 py-2.5 text-sm text-zinc-300">
                    Summarize the enterprise refund policy.
                  </div>
                </div>

                <div className="rounded-2xl rounded-tl-sm border border-violet-500/15 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-4">
                  <p className="text-sm leading-relaxed text-zinc-300">
                    Enterprise clients are eligible for a full refund within
                    30&nbsp;days. After that window, pro-rated credits apply
                    under Section&nbsp;4.2 of the master agreement.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11.5px] font-medium text-violet-400">
                    <FileText className="size-3" />
                    contract.pdf · page 12
                    <ArrowUpRight className="size-3 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3">
                <span className="flex-1 text-sm text-zinc-600">
                  Ask a question about your documents…
                </span>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-500/30">
                  <ArrowUpRight className="size-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
