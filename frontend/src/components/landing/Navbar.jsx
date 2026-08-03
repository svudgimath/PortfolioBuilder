import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img src="/dzigned_logo.png" alt="Dzigned" className="w-8 h-8 object-contain shrink-0" />
          <span className="text-lg font-bold text-text-primary tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}>
            Dzigned
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-8">
          <a href="#how-it-works"
            className="text-sm text-text-dim hover:text-text-primary transition-colors">
            How it works
          </a>
          <Link to="/login"
            className="text-sm text-text-dim hover:text-text-primary transition-colors">
            Sign In
          </Link>
          <Link to="/signup"
            className="btn-fill px-5 py-2 rounded-lg text-sm">
            Get Started Free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="sm:hidden p-2 text-text-muted hover:text-text-primary transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-bg-border px-6 py-5 flex flex-col gap-4"
          style={{
            background: 'color-mix(in srgb, var(--color-bg-shell) 94%, transparent)',
            backdropFilter: 'blur(20px)',
          }}>
          <a href="#how-it-works"
            className="text-sm text-text-dim hover:text-text-primary py-1 transition-colors"
            onClick={() => setOpen(false)}>
            How it works
          </a>
          <Link to="/login"
            className="text-sm text-text-dim hover:text-text-primary py-1 transition-colors"
            onClick={() => setOpen(false)}>
            Sign In
          </Link>
          <Link to="/signup"
            className="btn-fill px-5 py-2.5 rounded-lg text-sm text-center"
            onClick={() => setOpen(false)}>
            Get Started Free
          </Link>
        </div>
      )}
    </nav>
  );
}
