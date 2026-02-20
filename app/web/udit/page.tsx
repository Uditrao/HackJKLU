import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import ProblemSection from "./components/ProblemSection";
import PhilosophySection from "./components/PhilosophySection";
import FeaturesSection from "./components/FeaturesSection";
import LanguagesSection from "./components/LanguagesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import FinalCTASection from "./components/FinalCTASection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <PhilosophySection />
      <FeaturesSection />
      <LanguagesSection />
      <HowItWorksSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}
