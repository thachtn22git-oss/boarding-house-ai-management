import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'

import { auth, db } from '../../config/firebase'
import type { AppUser, UserRole } from '../../types/user'
import { authContext as AuthContextObject, type RegisterInput } from './auth.context'

type AuthProviderProps = {
  children: ReactNode
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'owner' || value === 'tenant'
}

function mapUserProfile(data: DocumentData, uid: string): AppUser {
  const role = data.role

  if (!isUserRole(role)) {
    throw new Error('Your account role is missing or invalid.')
  }

  return {
    uid,
    fullName: String(data.fullName ?? 'User'),
    email: String(data.email ?? ''),
    role,
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

async function loadUserProfile(uid: string) {
  const profileRef = doc(db, 'users', uid)
  const profileSnapshot = await getDoc(profileRef)

  if (!profileSnapshot.exists()) {
    throw new Error('No user profile was found for this account.')
  }

  return mapUserProfile(profileSnapshot.data(), uid)
}

function getFriendlyAuthError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : ''

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password.'
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/email-already-in-use':
      return 'This email is already registered.'
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null)
        setLoading(false)
        return
      }

      try {
        const profile = await loadUserProfile(firebaseUser.uid)
        setCurrentUser(profile)
      } catch {
        setCurrentUser(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  async function login(email: string, password: string) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const profile = await loadUserProfile(credential.user.uid)

      setCurrentUser(profile)
      return profile
    } catch (error) {
      throw new Error(getFriendlyAuthError(error), { cause: error })
    }
  }

  async function register(input: RegisterInput) {
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        input.email,
        input.password,
      )
      const profileRef = doc(db, 'users', credential.user.uid)

      await setDoc(profileRef, {
        uid: credential.user.uid,
        fullName: input.fullName,
        email: input.email,
        role: input.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const profile = await loadUserProfile(credential.user.uid)

      setCurrentUser(profile)
      return profile
    } catch (error) {
      throw new Error(getFriendlyAuthError(error), { cause: error })
    }
  }

  async function logout() {
    await signOut(auth)
    setCurrentUser(null)
  }

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      register,
      logout,
    }),
    [currentUser, loading],
  )

  return (
    <AuthContextObject.Provider value={value}>
      {children}
    </AuthContextObject.Provider>
  )
}
