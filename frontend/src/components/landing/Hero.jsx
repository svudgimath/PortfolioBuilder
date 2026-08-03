import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import heroImg from "../../assets/hero.png";

export default function Hero() {
  return (
    <section className="relative flex items-center min-h-screen pt-16 bg-hero bg-noise">
      <div className="px-6 w-full max-w-[90vw] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-20">

        {/* Left — copy */}
        <div className="flex flex-col gap-6">

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] text-text-primary"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
          >
            Build a portfolio.{" "}
            <br />
            Publish to{" "}
            <span className="text-gradient">GitHub Pages.</span>
            <br />
            <span className="text-text-dim">In minutes.</span>
          </h1>

          {/* Sub */}
          <p className="text-base sm:text-lg text-text-dim max-w-md leading-relaxed">
            Fill in your details, pick an AI-generated style, and deploy — Dzigned handles the GitHub setup so you own your portfolio forever.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link to="/signup" className="btn-primary text-base flex items-center gap-2">
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-secondary text-base">
              Sign In
            </Link>
          </div>

          {/* Social proof hint */}
          <p className="text-xs text-text-muted pt-1">
            No credit card required. Deploy in under 5 minutes.
          </p>
        </div>

        {/* Right — mockup */}
        <div className="relative flex justify-center lg:justify-end">
          <img
            src={heroImg}
            alt="Dzigned portfolio editor preview"
            className="w-full max-w-2xl img-depth"
          />
        </div>

      </div>
    </section>
  )
}
