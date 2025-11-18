import { HeroSection } from "./sections/HeroSection";
import { AboutSection } from "./sections/AboutSection";
import { MissionVisionSection } from "./sections/MissionVisionSection";
import { ServicesSection } from "./sections/ServicesSection";
import { TeamSection } from "./sections/TeamSection";
import { KPISection } from "./sections/KPISection";
import { nc, ncStyles } from "./theme";
import { useReveal } from "./hooks/useReveal";
import { TimelineSection } from "./sections/TimelineSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { FooterSection } from "./sections/FooterSection";

export function NovacorePage() {
  useReveal();
  return (
    <div className="min-h-screen" style={{ backgroundColor: nc.bg }}>
      <style>{ncStyles}</style>
      <HeroSection />

      <main>
        <div data-reveal><AboutSection /></div>
        <div data-reveal><MissionVisionSection /></div>
        <div data-reveal><ServicesSection /></div>
        <div data-reveal><ProjectsSection /></div>
        <div data-reveal><TimelineSection /></div>
        <div data-reveal><TeamSection /></div>
        <div data-reveal><KPISection /></div>
      </main>
      <FooterSection />
    </div>
  );
}


