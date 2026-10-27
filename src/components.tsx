import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function Compass({ className = 'size-11' }: { className?: string }) {
  return <svg className={`shrink-0 ${className}`} viewBox="0 0 200 200" fill="none" aria-hidden="true">
    <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="1" />
    <circle cx="100" cy="100" r="69" stroke="currentColor" strokeWidth="1" strokeDasharray="1 8" />
    <path d="M100 23v14m0 126v14M23 100h14m126 0h14M46 46l10 10m88 88 10 10M46 154l10-10m88-88 10-10" stroke="currentColor" strokeWidth="1.5" />
    <path d="m100 45 13 42 42 13-42 13-13 42-13-42-42-13 42-13z" stroke="currentColor" strokeWidth="1.5" />
    <path d="m100 45 13 42-13 13-13 13z" fill="currentColor" />
    <circle cx="100" cy="100" r="5" fill="currentColor" />
  </svg>
}
export function Arrow() {
  return <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
}
export function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' }) {
  const toneClass = tone === 'error' ? 'border-[#d9b0a3] bg-[#fff0e9] text-[#7b3028]' : 'border-[#cbd5c6] bg-[#edf0e8]'
  return <div className={`mb-5 rounded-md border px-4 py-3 text-xs leading-relaxed ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}
export function Loading({ children = 'Comprobando tu sesión…' }: { children?: ReactNode }) {
  return <div className="flex min-h-36 items-center justify-center gap-3 text-sm text-muted" role="status"><Spinner />{children}</div>
}

// Respuesta 423: el Grand Line se desbloquea solo al aprobar la inspección del CP3.
export function GrandLineLocked() {
  return <div className="flex min-h-80 flex-col items-center justify-center rounded-md border border-[#d4ddc9] bg-moss p-8 text-center">
    <Compass className="mb-4 size-16 text-[#677d56]" />
    <h2 className="font-serif text-2xl">El Grand Line sigue bloqueado</h2>
    <p className="mt-3 max-w-md text-sm text-muted">Esta sección necesita el Log Pose. Se obtiene al aprobar la inspección presencial del CP3 en Reverse Mountain.</p>
    <Link className={`${textButton} mt-4`} to="/dashboard">Ver el estado del Log Pose</Link>
  </div>
}

// Clases compartidas por botones y formularios.
export const primaryButton = 'inline-flex min-h-12 items-center justify-center gap-4 rounded-md bg-sea px-5 py-3 text-sm font-semibold text-[#fffaf0] no-underline hover:bg-sea-hover disabled:cursor-wait disabled:opacity-65'
export const textButton = 'cursor-pointer bg-transparent py-2 text-xs text-sea underline underline-offset-4'
