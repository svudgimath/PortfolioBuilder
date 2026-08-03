import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import p1 from "../../assets/portfolio-1.png";
import p2 from "../../assets/portfolio-2.png";
import p3 from "../../assets/portfolio-3.png";

const previews = [
  { src: p1, label: "Light" },
  { src: p2, label: "Dark" },
  { src: p3, label: "Gradient" },
];

export default function Styles() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-14">

        {/* Heading */}
        <div className="text-center max-w-2xl">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--color-accent)' }}>
            AI-powered styling
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-text-primary mb-4"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
          >
            Same content,{" "}
            <span className="text-gradient">endless styles</span>
          </h2>
          <p className="text-text-dim text-base sm:text-lg leading-relaxed">
            Hit Restyle and our AI generates a completely new color palette, font pairing, and mood — all applied instantly without touching your data.
          </p>
        </div>

        {/* Preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          {previews.map(({ src, label }) => (
            <div key={label} className="group relative rounded-2xl overflow-hidden">
              <img
                src={src}
                alt={`${label} portfolio style`}
                className="img-depth rounded-2xl w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
              />
              {/* Bottom label */}
              <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end px-4 pb-3"
                style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--color-bg) 90%, transparent), transparent)" }}>
                <span className="text-xs font-semibold text-text-dim tracking-widest uppercase">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link to="/signup" className="btn-primary text-base flex items-center gap-2">
          Try it free <ArrowRight size={16} />
        </Link>

      </div>
    </section>
  );
}
