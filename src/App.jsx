import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import TeacherRoute from './components/TeacherRoute'
import Home from './pages/Home'
import Notes from './pages/Notes'
import NoteDetail from './pages/NoteDetail'
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
            <div className="min-h-screen bg-white flex flex-col text-[#111111]">
              {/* Top Global Announcement Bar with Session Dismissal */}
              <AnnouncementBar />

              {/* Bold Monochrome Sticky Navbar */}
              <Navbar />

              {/* Main Routed Page Content */}
              <div className="flex-1">
                <Routes>
                  {/* Public Landing Home */}
                  <Route path="/" element={<Home />} />

                  {/* Public Notes Category Feed with Filters & Sorting */}
                  <Route path="/notes" element={<Notes />} />

                  {/* Product/Note Detail Page */}
                  <Route path="/notes/:id" element={<NoteDetail />} />

                  {/* Login (OTP / Password) */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected Upload Route */}
                  <Route
                    path="/upload"
                    element={
                      <ProtectedRoute>
                        <Upload />
                      </ProtectedRoute>
                    }
                  />

                  {/* Teacher-Only Review Queue Route */}
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

              {/* Editorial Footer with Black CTA Banner */}
              <Footer />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
