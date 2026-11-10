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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 max-w-md w-full p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold">
              ⚠
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              An unexpected error occurred while rendering the page. Don&apos;t worry, your data and notes are safe.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs"
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

