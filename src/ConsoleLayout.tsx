import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from './auth'
import { Arrow, Compass } from './components'

export function Brand({ to }: { to: string }) {
  return <Link className="flex items-center gap-2.5 font-serif text-[27px] leading-none text-[#f3ebd9] no-underline" to={to}><Compass className="size-10" /><span>Log Pose<span className="mt-1.5 block font-sans text-[10px] tracking-wider">Consola de la tripulación</span></span></Link>
}
const navClass = 'flex min-h-10 items-center justify-center rounded px-1.5 py-2 text-[11px] md:min-h-11 md:justify-between md:px-3.5 md:py-3 md:text-[13px]'
export function ConsoleLayout({ children }: { children: ReactNode }) {
  const { state, logout } = useAuth()
  const crew = state.status === 'authenticated' ? state.session.crew : null
  return <div className="min-h-svh md:grid md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[236px_minmax(0,1fr)]">
    <aside className="flex flex-col gap-4 bg-sea px-5 py-4 text-[#f4e9d4] md:gap-0 md:px-6 md:py-8">
      <Brand to="/dashboard" />
      <nav className="grid grid-cols-4 gap-1 md:mt-14 md:grid-cols-1 md:gap-2" aria-label="Navegación principal">
        {[['/dashboard', 'Bitácora'], ['/wanted', 'Carteles'], ['/news', 'Noticias'], ['/sagas', 'Sagas']].map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `${navClass} ${isActive ? 'bg-sea-active text-[#fff4db]' : 'text-[#b3c6b8] hover:bg-sea-hover'}`}>{label}</NavLink>)}
      </nav>
      <div className="flex items-center justify-between gap-4 text-[10px] text-[#bbd0bf] md:mt-auto md:block md:pt-16"><span className="hidden md:inline">El viaje empieza en East Blue.</span><button className="flex cursor-pointer items-center justify-end gap-2.5 bg-transparent text-[11px] text-[#f5e9d4] md:mt-5 md:w-full md:justify-between md:border-t md:border-[#547469] md:pt-4 md:text-xs" onClick={logout}>Cerrar sesión <Arrow /></button></div>
    </aside>
    <main className="flex min-w-0 flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-line px-5 py-4 text-[11px] break-all md:px-10 md:py-6 md:text-xs"><span>{crew?.teamCode}</span><span className="text-[10px] text-muted md:text-[11px]">{crew?.email}</span></header>
      <div className="mx-auto w-full max-w-[1150px] px-5 py-8 md:px-10 md:py-11">{children}</div>
      <footer className="mt-auto border-t border-line px-5 py-5 text-[10px] text-muted md:px-10">Log Pose Console · Rumbo al Grand Line</footer>
    </main>
  </div>
}
