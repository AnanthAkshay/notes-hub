import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import TeacherRoute from './components/TeacherRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Upload from './pages/Upload'
import Review from './pages/Review'
import NotFound from './pages/NotFound'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
              <Navbar />
              <div className="flex-1">
                <Routes>
                  {/* Public route */}
                  <Route path="/" element={<Home />} />

                  {/* Login route (auto-redirects to Home if already authenticated) */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected route (requires active login) */}
                  <Route
                    path="/upload"
                    element={
                      <ProtectedRoute>
                        <Upload />
                      </ProtectedRoute>
                    }
                  />

                  {/* Teacher-only route (requires role === 'teacher') */}
                  <Route
                    path="/review"
                    element={
                      <TeacherRoute>
                        <Review />
                      </TeacherRoute>
                    }
                  />

                  {/* 404 Catch-All */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
