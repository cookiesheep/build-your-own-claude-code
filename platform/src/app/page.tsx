import {
  HeroSection,
  SellingPointsSection,
  LabPreviewSection,
  ArchitectureSection,
  FooterSection,
} from "@/components/LandingSections";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-page)]">
      {/* Fixed atmospheric gradient layer — rich colorful depth across all sections */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        {/* Warm amber — top left */}
        <div
          className="absolute -left-[8%] -top-[5%] h-[65vh] w-[65vh] rounded-full"
          style={{
            background: 'radial-gradient(circle, #D4A574 0%, transparent 60%)',
            opacity: 0.2,
            filter: 'blur(60px)',
          }}
        />
        {/* Purple — top right */}
        <div
          className="absolute -right-[5%] -top-[10%] h-[50vh] w-[50vh] rounded-full"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 55%)',
            opacity: 0.25,
            filter: 'blur(55px)',
          }}
        />
        {/* Teal — bottom left */}
        <div
          className="absolute left-[10%] bottom-[5%] h-[45vh] w-[45vh] rounded-full"
          style={{
            background: 'radial-gradient(circle, #2DD4BF 0%, transparent 60%)',
            opacity: 0.2,
            filter: 'blur(50px)',
          }}
        />
        {/* Rose — center right */}
        <div
          className="absolute right-[20%] top-[40%] h-[40vh] w-[40vh] rounded-full"
          style={{
            background: 'radial-gradient(circle, #F472B6 0%, transparent 55%)',
            opacity: 0.35,
            filter: 'blur(50px)',
          }}
        />
      </div>

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
