import Navbar from "./web/components/Navbar";
import HeroSection from "./web/components/HeroSection";
import ProblemSection from "./web/components/ProblemSection";
import PhilosophySection from "./web/components/PhilosophySection";
import FeaturesSection from "./web/components/FeaturesSection";
import LanguagesSection from "./web/components/LanguagesSection";
import HowItWorksSection from "./web/components/HowItWorksSection";
import FinalCTASection from "./web/components/FinalCTASection";
import Footer from "./web/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <PhilosophySection />
      <FeaturesSection />
      <LanguagesSection />
      <HowItWorksSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}
