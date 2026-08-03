import step1 from "../../assets/step-1.png";
import step2 from "../../assets/step-2.png";
import step3 from "../../assets/github-logo.png";

const steps = [
  {
    number: "01",
    title: "Fill in your details",
    desc: "Guided sections walk you through your name, role, skills, projects, and experience. No blank page anxiety — just answer the prompts.",
    img: step1,
  },
  {
    number: "02",
    title: "Preview and restyle",
    desc: "Watch your portfolio update live. Hit Restyle to generate a new look with AI — colors, fonts, and mood in one click.",
    img: step2,
  },
  {
    number: "03",
    title: "Publish to GitHub Pages",
    desc: "Connect GitHub once. Dzigned creates your repo, enables Pages, and deploys everything. Your site, your domain, forever.",
    img: step3,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-20">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--color-accent)' }}>
            How it works
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
          >
            From zero to live in three steps
          </h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-6 items-start">
          {steps.map((step, i) => (
            <div key={step.number} className="flex-1 flex flex-col gap-5 relative">
              {/* Connector line between steps */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-9 left-[calc(100%+0.75rem)] w-6 h-px"
                  style={{ background: 'var(--color-bg-border-strong)' }} />
              )}

              {/* Step number chip */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">{step.number}</span>
                </div>
                <div className="h-px flex-1 max-w-12"
                  style={{ background: 'var(--color-bg-border)' }} />
              </div>

              {/* Image */}
              <div className="rounded-xl overflow-hidden border border-bg-border bg-surface-2 aspect-4/3">
                <img
                  src={step.img}
                  alt={step.title}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-text-primary"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {step.title}
                </h3>
                <p className="text-sm text-text-dim leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
