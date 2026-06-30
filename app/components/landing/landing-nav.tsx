"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { Layers, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import {
  NavSignInButton,
  NavSignUpButton,
} from "@/app/components/landing/auth-buttons";
import { Button } from "@/app/components/ui/button";

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-50 border-b border-white/6 bg-[#09090b]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
            <Layers className="size-4 text-white" />
          </div>
          <span className="font-heading text-[15px] font-semibold tracking-tight text-white">
            ContextVault
          </span>
        </Link>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2 md:flex">
          <Show when="signed-out">
            <NavSignInButton />
            <NavSignUpButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-zinc-400 hover:text-white hover:bg-white/10"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
              >
                <X className="size-5" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
              >
                <Menu className="size-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            key="mobile-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden border-t border-white/6 bg-[#09090b]/95 backdrop-blur-xl md:hidden"
          >
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22, delay: 0.06, ease: "easeOut" }}
              className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:px-6"
            >
              <Show when="signed-out">
                <NavSignInButton />
                <NavSignUpButton />
              </Show>
              <Show when="signed-in">
                <div className="flex justify-center py-2">
                  <UserButton />
                </div>
              </Show>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
