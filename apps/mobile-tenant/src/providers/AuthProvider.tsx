import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import type { AppUser } from '../types/user'

interface AuthContextValue {
  currentUser: AppUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProfile(uid: string) {
    const snapshot = await getDoc(doc(db, 'users', uid))
    if (!snapshot.exists()) throw new Error('User profile was not found.')

    const data = snapshot.data()
    if (data.role !== 'tenant') throw new Error('This account is not allowed to access this app.')

    return {
      uid,
      fullName: String(data.fullName ?? 'Tenant User'),
      email: String(data.email ?? ''),
      role: 'tenant',
    } satisfies AppUser
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      setError(null)

      try {
        if (!user) {
          setCurrentUser(null)
          return
        }

        setCurrentUser(await loadProfile(user.uid))
      } catch (authError) {
        console.warn('Tenant auth profile load failed.', authError)
        setCurrentUser(null)
        setError(getAuthErrorMessage(authError))
        await signOut(auth)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  async function login(email: string, password: string) {
    setLoading(true)
    setError(null)

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      setCurrentUser(await loadProfile(credential.user.uid))
    } catch (authError) {
      const message = getAuthErrorMessage(authError)
      setError(message)
      await signOut(auth).catch(() => undefined)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await signOut(auth)
    setCurrentUser(null)
  }

  const value = useMemo(
    () => ({ currentUser, loading, error, login, logout }),
    [currentUser, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''

  if (code === 'auth/invalid-api-key') return 'Firebase API key is invalid. Check the mobile environment variables.'
  if (code === 'auth/invalid-credential') return 'Invalid email or password.'
  if (code === 'auth/user-not-found') return 'No account found with this email.'
  if (code === 'auth/wrong-password') return 'Incorrect password.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.'
  if (error instanceof Error && error.message === 'This account is not allowed to access this app.') return error.message

  return 'Something went wrong. Please try again.'
}
