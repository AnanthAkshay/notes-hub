import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <main className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="bg-white rounded-[24px] border border-black/10 p-8 sm:p-12 shadow-xs">
        <span className="font-display text-7xl sm:text-8xl text-black block tracking-tight mb-2">
          404
        </span>
        <h1 className="font-display text-2xl text-black uppercase tracking-tight mb-2">
          PAGE NOT FOUND
        </h1>
        <p className="text-sm text-black/60 mb-8 leading-relaxed">
          The requested page or study material does not exist or may have been moved.
        </p>
        <Link to="/">
          <Button variant="black" size="lg" className="w-full">
            <span>Return to Notes Feed</span>
          </Button>
        </Link>
      </div>
    </main>
  )
}
