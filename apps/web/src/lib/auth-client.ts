import { createAuthClient } from 'better-auth/react'

const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
const baseURL = apiUrl.replace(/\/api$/, '')

export const authClient = createAuthClient({
  baseURL: baseURL || window.location.origin,
})

export const { useSession, signIn, signUp, signOut } = authClient
