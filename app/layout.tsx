import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ContextVault — Multi-Workspace Document AI",
  description:
    "Upload documents into isolated workspaces and ask questions in plain English. Get AI-powered, source-cited answers grounded in your own data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark font-sans", inter.variable, geistSans.variable)}
    >
      <body
        className={cn(geistMono.variable, "min-h-screen antialiased")}
      >
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
