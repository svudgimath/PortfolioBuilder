import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-bg-border">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">

        {/* Brand + copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-text-dim text-sm">
          <Link to="/" className="flex items-center gap-2 text-base font-bold text-text-primary"
            style={{ fontFamily: 'var(--font-display)' }}>
            <img src="/dzigned_logo.png" alt="" className="w-5 h-5 object-contain" />
            Dzigned
          </Link>
          <span className="hidden sm:block opacity-30">·</span>
          <span>© {new Date().getFullYear()} Dzigned. All rights reserved.</span>
        </div>

        {/* Contact */}
        <a
          href="mailto:contact@dzigned.dev"
          className="btn-secondary text-sm px-5 py-2"
        >
          Contact Us
        </a>

      </div>
    </footer>
  );
}
