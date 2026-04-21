import {
  HeroSection,
  SellingPointsSection,
  SkillTreeSection,
  ArchitectureSection,
  DifferenceSection,
  FAQSection,
  FooterSection,
} from "@/components/LandingSections";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollReactiveOrbs from "@/components/ScrollReactiveOrbs";
import CodePreview from "@/components/CodePreview";
import ScrambleText from "@/components/ScrambleText";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-page)]">
      <ScrollProgress />
      <ScrollReactiveOrbs />

      <div className="relative z-10">
        {/* Section 1: Hero */}
        <HeroSection />

        {/* Section 2: Selling Points */}
        <SellingPointsSection />

        {/* Section 3: Skill Tree */}
        <SkillTreeSection />

        {/* Section 4: Agent Loop Experience */}
        <section className="relative py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
              <ScrambleText text="几行代码，一个 Agent" mode="typewriter" />
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-center text-[0.92rem] leading-7 text-[var(--text-secondary)]">
              在 BYOCC，你补全关键代码，几秒内看到 Agent 活起来
            </p>
            <div className="mt-12 flex justify-center">
              <CodePreview />
            </div>
          </div>
        </section>

        {/* Section 5: Architecture */}
        <ArchitectureSection />

        {/* Section 6: Difference + Community */}
        <DifferenceSection />

        {/* Section 7: FAQ */}
        <FAQSection />

        {/* Footer */}
        <FooterSection />
      </div>
    </div>
  );
}
