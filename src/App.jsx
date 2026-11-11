import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { captureUtmFromSearch } from './lib/utm'
import ErrorBoundary from './components/ErrorBoundary'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import TeacherRoute from './components/TeacherRoute'
import AdminRoute from './components/AdminRoute'
import { PageFallbackSkeleton } from './components/ui/Skeleton'
import ScrollProgressBar from './components/ui/ScrollProgressBar'
import BackToTopButton from './components/ui/BackToTopButton'
import CookieBanner from './components/ui/CookieBanner'
import FloatingContact from './components/ui/FloatingContact'

const Home = lazy(() => import('./pages/Home'))
const Notes = lazy(() => import('./pages/Notes'))
const NoteDetail = lazy(() => import('./pages/NoteDetail'))
const Login = lazy(() => import('./pages/Login'))
const Upload = lazy(() => import('./pages/Upload'))
const Review = lazy(() => import('./pages/Review'))
const Admin = lazy(() => import('./pages/Admin'))
const NotFound = lazy(() => import('./pages/NotFound'))

function UtmTracker() {
  const location = useLocation()
  useEffect(() => {
    captureUtmFromSearch(location.search)
  }, [location.search])
  return null
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <UtmTracker />
            <div className="min-h-screen bg-[var(--bg-canvas)] flex flex-col text-[var(--text-ink)]">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-[6px] focus:bg-[var(--bg-inverse)] focus:text-[var(--text-inverse)] focus:text-xs focus:font-semibold"
              >
                Skip to main content
              </a>

              <ScrollProgressBar />
              <AnnouncementBar />
              <Navbar />

              <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
                <Suspense fallback={<PageFallbackSkeleton />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/notes/:id" element={<NoteDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                      path="/upload"
                      element={
                        <ProtectedRoute>
                          <Upload />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/review"
                      element={
                        <TeacherRoute>
                          <Review />
                        </TeacherRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <Admin />
                        </AdminRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>

              <Footer />
              <BackToTopButton />
              <FloatingContact />
              <CookieBanner />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
