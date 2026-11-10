import ProtectedRoute from './ProtectedRoute'

export default function TeacherRoute({ children }) {
  return <ProtectedRoute requiredRole="teacher">{children}</ProtectedRoute>
}

