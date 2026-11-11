import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Global Error Boundary Caught]:', error, errorInfo)
  }

  handleReload = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-strong)] max-w-md w-full p-8 text-center">
            <div className="w-11 h-11 mx-auto mb-4 rounded-[6px] bg-[var(--accent-danger-bg)] text-[var(--accent-danger)] border border-[var(--accent-danger)]/30 flex items-center justify-center font-mono-meta text-lg font-bold">
              !
            </div>
            <h1 className="font-display text-2xl text-[var(--text-ink)] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              An unexpected error occurred while rendering this page. Your saved notes and session remain intact.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-[var(--bg-inverse)] hover:opacity-90 text-[var(--text-inverse)] font-semibold text-sm rounded-[6px] transition-opacity cursor-pointer"
            >
              Return to Notes Hub Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
