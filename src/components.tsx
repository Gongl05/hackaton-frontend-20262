import type { ReactNode } from 'react'

export function Compass({ large = false }: { large?: boolean }) {
  return <svg className={large ? 'compass compass-large' : 'compass'} viewBox="0 0 200 200" fill="none" aria-hidden="true">
    <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="1" />
    <circle cx="100" cy="100" r="69" stroke="currentColor" strokeWidth="1" strokeDasharray="1 8" />
    <path d="M100 23v14m0 126v14M23 100h14m126 0h14M46 46l10 10m88 88 10 10M46 154l10-10m88-88 10-10" stroke="currentColor" strokeWidth="1.5" />
    <path d="m100 45 13 42 42 13-42 13-13 42-13-42-42-13 42-13z" stroke="currentColor" strokeWidth="1.5" />
    <path d="m100 45 13 42-13 13-13 13z" fill="currentColor" />
    <circle cx="100" cy="100" r="5" fill="currentColor" />
  </svg>
}
export function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' }) {
  return <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}
export function Loading({ children = 'Comprobando tu sesión…' }: { children?: ReactNode }) {
  return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />{children}</div>
}
