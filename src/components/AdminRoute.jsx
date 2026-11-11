import ProtectedRoute from './ProtectedRoute'

export default function AdminRoute({ children }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
}

