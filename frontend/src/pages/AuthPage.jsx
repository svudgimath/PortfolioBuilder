import { useState, useContext } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import AuthContext from '../auth/AuthContext'
import Input from '../components/ui/Input'

export default function AuthPage({ mode = 'signup' }) {
  const navigate = useNavigate()
  const { signupUser, loginUser } = useContext(AuthContext)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSignup = mode === 'signup'

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm()

  async function onSubmit(data) {
    setServerError('')
    setSubmitting(true)
    try {
      if (isSignup) {
        await signupUser(data.name, data.email, data.password)
      } else {
        await loginUser(data.email, data.password)
      }
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(targetMode) {
    if (targetMode === mode) return
    reset()
    setServerError('')
    navigate(targetMode === 'signup' ? '/signup' : '/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-section">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[128px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[128px] -z-10" />

      <div className="w-full max-w-md">
        {/* Logo bubble */}
        <div className="flex justify-center mb-[-32px] relative z-10">
          <div className="w-16 h-16 rounded-full bg-bg-surface/60 backdrop-blur-xl border border-bg-border flex items-center justify-center shadow-2xl overflow-hidden p-2.5">
            <img src="/dzigned_logo.png" alt="Dzigned" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Glass card */}
        <div className="glass rounded-2xl p-8 pt-12 shadow-2xl">
          <h2
            className="text-center text-text-primary text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Welcome to Dzigned
          </h2>
          <p className="text-center text-text-dim mt-2 text-sm">
            {isSignup ? 'Create an account to get started' : 'Sign in to your account'}
          </p>

          {/* Tabs */}
          <div className="flex mt-6 mb-6 border-b border-bg-border">
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                isSignup ? 'text-text' : 'text-text-muted hover:text-text-dim'
              }`}
            >
              Sign Up
              {isSignup && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 gradient-bg rounded-full" />
              )}
            </button>
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                !isSignup ? 'text-text' : 'text-text-muted hover:text-text-dim'
              }`}
            >
              Log In
              {!isSignup && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 gradient-bg rounded-full" />
              )}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {isSignup && (
              <Input
                placeholder="Name"
                icon={<User size={18} />}
                error={errors.name?.message}
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
            )}

            <Input
              type="email"
              placeholder="Email"
              icon={<Mail size={18} />}
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: 'Invalid email address',
                },
              })}
            />

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                icon={<Lock size={18} />}
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-text-muted hover:text-text-dim transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {serverError && (
              <div className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-fill py-3 rounded-lg mt-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-text-dim mt-6">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="text-primary hover:text-primary-hover font-medium"
            >
              {isSignup ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}