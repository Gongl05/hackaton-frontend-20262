import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Credentials, Crew, Gateway, Registration, Session } from './services'
import { configuredGateway, ServiceError } from './services'

const TOKEN_KEY = 'log-pose:session'
type AuthState =
  | { status: 'checking' }
  | { status: 'guest' }
  | { status: 'unavailable'; message: string }
  | { status: 'authenticated'; session: Session }

interface AuthContextValue {
  state: AuthState
  gateway: Gateway
  login: (data: Credentials) => Promise<void>
  register: (data: Registration) => Promise<void>
  logout: () => void
  retry: () => void
}

function storedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* La sesión sigue disponible en memoria si el navegador bloquea almacenamiento. */ }
}
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children, gateway = configuredGateway }: { children: ReactNode; gateway?: Gateway }) {
  const [state, setState] = useState<AuthState>({ status: 'checking' })
  const [attempt, setAttempt] = useState(0)
  const logout = useCallback(() => { saveToken(null); setState({ status: 'guest' }) }, [])

  useEffect(() => {
    const controller = new AbortController()
    const token = storedToken()
    if (!token) { setState({ status: 'guest' }); return () => controller.abort() }
    setState({ status: 'checking' })
    gateway.restore(token, controller.signal).then((crew: Crew) => {
      if (!controller.signal.aborted) setState({ status: 'authenticated', session: { token, crew } })
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setState({ status: 'unavailable', message: error instanceof Error ? error.message : 'No se pudo verificar la sesión. Inténtalo otra vez.' })
    })
    return () => controller.abort()
  }, [gateway, attempt, logout])

  const value = useMemo<AuthContextValue>(() => {
    const accept = (session: Session) => { saveToken(session.token); setState({ status: 'authenticated', session }) }
    return {
      state, gateway, logout,
      retry: () => setAttempt(value => value + 1),
      login: async data => accept(await gateway.login(data)),
      register: async data => accept(await gateway.register(data)),
    }
  }, [state, gateway, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth requiere AuthProvider')
  return value
}

export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/dashboard'
  try {
    const url = new URL(value, 'http://local.invalid')
    if (url.origin !== 'http://local.invalid' || ['/login', '/register'].includes(url.pathname)) return '/dashboard'
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return '/dashboard' }
}
