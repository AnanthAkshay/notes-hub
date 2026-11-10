import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // 1. Show clean loading state while session is being restored
  if (loading) {
    return (
      <div className="flex justify-center items-center py-28">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Checking credentials...</p>
        </div>
      </div>
    )
  }

  // 2. Redirect to /login if unauthenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Optional role check (e.g. requiredRole="teacher")
  if (requiredRole && profile?.role !== requiredRole) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-amber-50 border border-amber-200 rounded-xl text-center shadow-xs">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700 mb-3 text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-amber-900 mb-2">Restricted Access</h2>
        <p className="text-amber-800 text-sm mb-4">
          This feature is reserved for <span className="font-semibold capitalize">{requiredRole}s</span>. Your current account has the <span className="font-semibold uppercase">{profile?.role || 'student'}</span> role.
        </p>
        <Navigate to="/" replace />
      </div>
    )
  }

  return children
}
