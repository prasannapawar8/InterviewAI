import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AcceptInvite from './pages/auth/AcceptInvite'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Processing from './pages/Processing'
import Results from './pages/Results'
import Compare from './pages/Compare'
import AnalysesList from './pages/AnalysesList'
import CandidateHub from './pages/CandidateHub'
import RoleTemplates from './pages/RoleTemplates'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import Console from './pages/Console'

// Route guard: send unauthenticated users to login
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/share/:token" element={<Results />} />
      {/* Failure simulation for selfheal demos; outside auth so it works while the app fails */}
      <Route path="/console" element={<Console />} />

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
      </Route>

      {/* Full-screen pipeline — no sidebar/topbar under the animation */}
      <Route
        path="/processing"
        element={
          <ProtectedRoute>
            <Processing />
          </ProtectedRoute>
        }
      />

      {/* App (protected) */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/results" element={<AnalysesList />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/candidates" element={<CandidateHub />} />
        <Route path="/candidates/:name" element={<CandidateHub />} />
        <Route path="/templates" element={<RoleTemplates />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
