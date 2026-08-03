import f1 from "../../assets/feature-1.png";
import f2 from "../../assets/feature-2.png";
import f3 from "../../assets/feature-3.png";
import f4 from "../../assets/feature-4.png";

const features = [
  {
    img: f1,
    badge: null,
    title: "One-Click Publishing",
    desc: "Deploy to GitHub Pages with one click. No terminal, no YAML, no config — just a live URL that's yours forever.",
  },
  {
    img: f2,
    badge: null,
    title: "AI Style Generation",
    desc: "Generate a new look in seconds. Our AI picks a cohesive color palette, font pairing, and mood that matches your vibe.",
  },
  {
    img: f3,
    badge: "Coming Soon",
    title: "Smart Import",
    desc: "Import from LinkedIn or upload a resume. Your portfolio fills itself — no copy-pasting.",
  },
  {
    img: f4,
    badge: "Coming Soon",
    title: "Multiple Templates",
    desc: "Switch between professionally designed templates without re-entering any of your data.",
  },
];

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full self-start"
      style={{
        background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
        color: "var(--color-accent)",
      }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: 'var(--color-accent)' }} />
      Coming Soon
    </span>
  );
}

export default function Features() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-14">

        {/* Heading */}
        <div className="text-center">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--color-accent)' }}>
            Features
          </span>
          <h2
            className="text-3xl sm:text-5xl font-bold text-text-primary mb-4"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
          >
            Everything you need
          </h2>
          <p className="text-text-dim text-base sm:text-lg max-w-xl mx-auto">
            Built for developers and creatives who want a great portfolio without the busywork.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className="glass-card p-5 flex flex-col gap-4">
              <div className="rounded-xl overflow-hidden border border-bg-border">
                <img
                  src={f.img}
                  alt={f.title}
                  className="w-full aspect-4/3 object-cover object-top"
                />
              </div>
              <div className="flex flex-col gap-2">
                {f.badge && <ComingSoonBadge />}
                <h3
                  className="text-base font-bold text-text-primary leading-snug"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm text-text-dim leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
