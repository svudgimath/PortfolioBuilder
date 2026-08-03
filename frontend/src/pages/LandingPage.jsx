import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import Styles from "../components/landing/Styles";
import Features from "../components/landing/Features";
import Footer from "../components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-section hide-scrollbar">
      <Navbar />
      <Hero />
      <div className="section-divider" />
      <HowItWorks />
      <div className="section-divider" />
      <Styles />
      <div className="section-divider" />
      <Features />
      <div className="section-divider" />
      <Footer />
    </div>
  );
}
