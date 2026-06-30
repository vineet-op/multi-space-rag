"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

export function ExploreButton({ className }: { className?: string }) {
  return (
    <SignUpButton mode="modal">
      <Button
        className={cn(
          "group h-12 gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-[14px] text-white shadow-xl shadow-violet-500/30 transition-all duration-300 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/50 hover:scale-[1.03] active:scale-[0.98] cursor-pointer",
          className,
        )}
      >
        Explore Now
      </Button>
    </SignUpButton>
  );
}

export function NavSignInButton() {
  return (
    <SignInButton mode="modal">
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
      >
        Sign in
      </Button>
    </SignInButton>
  );
}

export function NavSignUpButton() {
  return (
    <SignUpButton mode="modal">
      <Button
        size="sm"
        className="rounded-full bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:border-white/20 shadow-none cursor-pointer"
      >
        Get started
      </Button>
    </SignUpButton>
  );
}
