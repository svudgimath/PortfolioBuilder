import { Component } from 'react'

// Catches any uncaught render error in the tree below it so the user never
// sees a blank page. Class component is required — hooks can't catch render
// errors.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Replace with a real reporting hook (Sentry/etc) when one's wired.
    console.error('Unhandled UI error:', error, info)
  }

  handleReset = () => {
    // Hard reload — simpler than trying to surgically reset every store.
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen app-shell flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4 relative z-10">
          <p className="text-5xl font-bold text-gradient" style={{ fontFamily: 'var(--font-display)' }}>
            Oops
          </p>
          <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
          <p className="text-sm text-text-dim">
            We hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={this.handleReset}
            className="btn-fill px-5 py-2.5 rounded-lg text-sm"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
