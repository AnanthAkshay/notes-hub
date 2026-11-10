import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-8 sm:p-10">
        <span className="text-5xl font-extrabold text-blue-600 block mb-2">404</span>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          The page or resource you are looking for doesn&apos;t exist or may have been removed.
        </p>
        <Link
          to="/"
          className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
        >
          Back to Notes Feed
        </Link>
      </div>
    </main>
  )
}

