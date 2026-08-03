import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4 relative z-10">
        <p className="text-7xl font-bold text-gradient leading-none"
          style={{ fontFamily: 'var(--font-display)' }}>
          404
        </p>
        <h1 className="text-xl font-semibold text-text-primary">Page not found</h1>
        <p className="text-sm text-text-dim">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>
    </div>
  )
}
