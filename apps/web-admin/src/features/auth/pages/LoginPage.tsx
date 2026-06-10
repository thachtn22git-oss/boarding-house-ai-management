import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { appLabels } from '../../../config/navigation'
import { roleRedirects } from '../auth.constants'
import LoginForm from '../components/LoginForm'
import type { AuthMode, LoginFormValues } from '../types'
import { useAuth } from '../useAuth'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(values: LoginFormValues) {
    setError(null)
    setSubmitting(true)

    try {
      const user =
        mode === 'login'
          ? await login(values.email, values.password)
          : await register({
              fullName: values.fullName,
              email: values.email,
              password: values.password,
              role: values.role,
            })

      navigate(roleRedirects[user.role], { replace: true })
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <span className="auth-brand-mark">BH</span>
          <p className="page-eyebrow">Smart boarding house management</p>
          <h1>{appLabels.productName}</h1>
          <p>Smart boarding house management platform</p>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>
            <p>
              {mode === 'login'
                ? 'Sign in with your Firebase account.'
                : 'Create an account and profile in Firestore.'}
            </p>
          </div>

          <LoginForm
            mode={mode}
            error={error}
            submitting={submitting}
            onModeChange={(nextMode) => {
              setMode(nextMode)
              setError(null)
            }}
            onSubmit={handleSubmit}
          />

          <aside className="demo-hint" aria-label="Demo account hint">
            <strong>Account setup hint</strong>
            <span>
              {mode === 'register'
                ? 'New accounts are created in Firebase Authentication and stored in the users collection.'
                : 'Sign in with an existing account to access your dashboard.'}
            </span>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
