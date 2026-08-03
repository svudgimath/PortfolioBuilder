import { lazy, Suspense } from 'react'
import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NotFoundPage from './pages/NotFoundPage'
import PublicLayout from './layouts/PublicLayout'
import AppLayout from './layouts/AppLayout'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy-load the protected app routes — landing visitors don't pay for them.
const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const EditPortfolioPage  = lazy(() => import('./pages/EditPortfolioPage'))
const PublishPage        = lazy(() => import('./pages/PublishPage'))

function PageLoader() {
  return (
    <div className="min-h-screen app-shell flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin relative z-10" />
    </div>
  )
}

const lazyEl = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard', element: lazyEl(DashboardPage) },
      { path: '/edit',      element: lazyEl(EditPortfolioPage) },
      { path: '/publish',   element: lazyEl(PublishPage) },
    ],
  },
  // Catch-all 404 — must be last
  { path: '*', element: <NotFoundPage /> },
])

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Analytics />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
