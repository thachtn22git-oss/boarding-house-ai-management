import { useState, type FormEvent } from 'react'

import { roleOptions } from '../auth.constants'
import type { AuthMode, LoginFormValues } from '../types'

type FormErrors = Partial<Record<keyof LoginFormValues, string>>

type LoginFormProps = {
  mode: AuthMode
  error: string | null
  submitting: boolean
  onModeChange: (mode: AuthMode) => void
  onSubmit: (values: LoginFormValues) => void
}

function LoginForm({
  mode,
  error,
  submitting,
  onModeChange,
  onSubmit,
}: LoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'owner',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function validateForm(nextValues: LoginFormValues) {
    const errors: FormErrors = {}
    const email = nextValues.email.trim()

    if (mode === 'register' && !nextValues.fullName.trim()) {
      errors.fullName = 'Full name is required.'
    }

    if (!email) {
      errors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!nextValues.password) {
      errors.password = 'Password is required.'
    } else if (nextValues.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    }

    if (mode === 'register') {
      if (!nextValues.confirmPassword) {
        errors.confirmPassword = 'Confirm password is required.'
      } else if (nextValues.password !== nextValues.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.'
      }

      if (!nextValues.role) {
        errors.role = 'Please select a role.'
      }
    }

    return errors
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm(values)

    setFormErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    onSubmit(values)
  }

  function updateValue<Field extends keyof LoginFormValues>(
    field: Field,
    value: LoginFormValues[Field],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="auth-mode-toggle" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          disabled={submitting}
          onClick={() => onModeChange('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          disabled={submitting}
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
      </div>

      {mode === 'register' ? (
        <label className="form-field">
          <span>Full name</span>
          <input
            type="text"
            value={values.fullName}
            autoComplete="name"
            placeholder="Enter your full name"
            disabled={submitting}
            aria-invalid={Boolean(formErrors.fullName)}
            onChange={(event) => updateValue('fullName', event.target.value)}
          />
          {formErrors.fullName ? (
            <small className="field-error">{formErrors.fullName}</small>
          ) : null}
        </label>
      ) : null}

      <label className="form-field">
        <span>Email</span>
        <input
          type="email"
          value={values.email}
          autoComplete="email"
          placeholder="Enter your email"
          disabled={submitting}
          aria-invalid={Boolean(formErrors.email)}
          onChange={(event) => updateValue('email', event.target.value)}
        />
        {formErrors.email ? (
          <small className="field-error">{formErrors.email}</small>
        ) : null}
      </label>

      <label className="form-field">
        <span>Password</span>
        <div
          className={
            formErrors.password ? 'password-input invalid' : 'password-input'
          }
        >
          <input
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={
              mode === 'login' ? 'Enter your password' : 'Create a password'
            }
            disabled={submitting}
            aria-invalid={Boolean(formErrors.password)}
            onChange={(event) => updateValue('password', event.target.value)}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            disabled={submitting}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {formErrors.password ? (
          <small className="field-error">{formErrors.password}</small>
        ) : null}
      </label>

      {mode === 'register' ? (
        <label className="form-field">
          <span>Confirm password</span>
          <div
            className={
              formErrors.confirmPassword
                ? 'password-input invalid'
                : 'password-input'
            }
          >
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={values.confirmPassword}
              autoComplete="new-password"
              placeholder="Confirm your password"
              disabled={submitting}
              aria-invalid={Boolean(formErrors.confirmPassword)}
              onChange={(event) =>
                updateValue('confirmPassword', event.target.value)
              }
            />
            <button
              type="button"
              aria-label={
                showConfirmPassword ? 'Hide password' : 'Show password'
              }
              disabled={submitting}
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {formErrors.confirmPassword ? (
            <small className="field-error">{formErrors.confirmPassword}</small>
          ) : null}
        </label>
      ) : null}

      <fieldset className="role-selector" disabled={submitting}>
        <legend>Role</legend>
        <div className="role-options">
          {roleOptions.map((role) => (
            <label key={role.value} className="role-option">
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={values.role === role.value}
                disabled={submitting}
                onChange={() => updateValue('role', role.value)}
              />
              <span>{role.label}</span>
            </label>
          ))}
        </div>
        {formErrors.role ? (
          <small className="field-error">{formErrors.role}</small>
        ) : null}
        {mode === 'login' ? (
          <p className="role-helper">
            Existing account roles are loaded from the user profile.
          </p>
        ) : null}
      </fieldset>

      {error ? <p className="auth-error">{error}</p> : null}

      <button className="login-button" type="submit" disabled={submitting}>
        {submitting
          ? mode === 'login'
            ? 'Signing in...'
            : 'Creating account...'
          : mode === 'login'
            ? 'Login'
            : 'Create account'}
      </button>
    </form>
  )
}

export default LoginForm
