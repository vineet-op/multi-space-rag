import { HeroSection } from "@/app/components/landing/hero-section";
import { LandingNav } from "@/app/components/landing/landing-nav";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
      </main>
    </div>
  );
}
