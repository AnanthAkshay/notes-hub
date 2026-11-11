import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdminRole, isTeacherRole } from '../lib/authHelpers'
import { PageFallbackSkeleton } from './ui/Skeleton'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, profileResolved } = useAuth()
  const location = useLocation()

  // 1. Show monochrome skeleton only while uncached session (or first-login role) resolves
  if (loading || (requiredRole && user && !profile && !profileResolved)) {
    return <PageFallbackSkeleton />
  }

  // 2. Redirect to /login if unauthenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Role check (admins satisfy teacher routes; admin routes require admin role)
  const hasRequiredRole =
    !requiredRole ||
    (requiredRole === 'admin'
      ? isAdminRole(profile?.role)
      : requiredRole === 'teacher'
        ? isTeacherRole(profile?.role)
        : profile?.role === requiredRole)

  if (!hasRequiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}
