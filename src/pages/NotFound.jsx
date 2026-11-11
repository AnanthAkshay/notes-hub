import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--border-hairline)] p-8 sm:p-10">
        <span className="font-mono-meta text-5xl sm:text-6xl font-semibold text-[var(--text-ink)] block mb-3">
          404
        </span>
        <h1 className="font-display text-2xl text-[var(--text-ink)] mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-7 leading-relaxed">
          The requested page or study record does not exist or may have been moved.
        </p>
        <Link to="/">
          <Button variant="black" size="md" className="w-full">
            <span>Return to Archive Home</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
