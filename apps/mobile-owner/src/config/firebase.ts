import { initializeApp } from 'firebase/app'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

declare const require: (moduleName: string) => unknown

const { getReactNativePersistence } = require('@firebase/auth') as {
  getReactNativePersistence?: (storage: unknown) => Persistence
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey) {
  console.error('Missing Firebase API key. Check EXPO_PUBLIC_FIREBASE_API_KEY.')
}

export const firebaseApp = initializeApp(firebaseConfig)
let authInstance: Auth

try {
  authInstance = getReactNativePersistence
    ? initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      })
    : getAuth(firebaseApp)
} catch {
  authInstance = getAuth(firebaseApp)
}

export const auth = authInstance
export const db = getFirestore(firebaseApp)
