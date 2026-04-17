import {
  HeroSection,
  SellingPointsSection,
  LabPreviewSection,
  ArchitectureSection,
  FooterSection,
} from "@/components/LandingSections";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollReactiveOrbs from "@/components/ScrollReactiveOrbs";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-page)]">
      <ScrollProgress />
      <ScrollReactiveOrbs />

      {/* Content sits above the gradient layer */}
      <div className="relative z-10">
        <HeroSection />
        <SellingPointsSection />
        <LabPreviewSection />
        <ArchitectureSection />
        <FooterSection />
      </div>
    </div>
  );
}
