export const styles = {
  // Layout
  sectionWrapper: "max-w-7xl mx-auto px-6",
  sectionPadding: "py-20 sm:py-28",

  // Cards
  card: "glass-card p-6",
  cardHover: "glass-card p-6 hover:border-white/15 hover:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)]",

  // Buttons
  btnPrimary: "bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 rounded-lg transition-colors duration-200",
  btnSecondary: "bg-transparent border border-bg-border text-text hover:bg-bg-surface-light font-medium px-6 py-2.5 rounded-lg transition-colors duration-200",
  btnGhost: "bg-transparent text-text-dim hover:text-text font-medium px-4 py-2 rounded-lg transition-colors duration-200",

  // Inputs
  input: "w-full bg-bg-surface border border-bg-border rounded-lg px-4 py-2.5 text-text placeholder-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all duration-200",
  label: "block text-sm font-medium text-text-dim mb-1.5",

  // Navbar
  navLink: "text-text-dim hover:text-text text-sm transition-colors duration-200",

  // Sidebar
  sidebarLink: "flex items-center gap-3 px-4 py-2.5 rounded-xl text-text-dim hover:text-text hover:bg-white/5 transition-all duration-200",
  sidebarLinkActive: "flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/15 text-white border border-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all duration-200",
}
