import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router'
import { safeReturnPath, useAuth } from './auth'
import { Arrow, Compass, Loading, primaryButton, Spinner, Status, textButton } from './components'
import type { DashboardData, FieldErrors } from './services'
import { apiConfigured, ServiceError } from './services'

const labelClass = 'mb-2 block text-xs font-semibold'
const inputClass = 'h-12 w-full rounded-md border border-[#bbc6bb] bg-[#fdfcf8] px-3 text-sm text-ink placeholder:text-[#727c73] aria-invalid:border-danger disabled:opacity-70'
const fieldErrorClass = 'mt-1.5 text-xs text-danger'
const sectionTitle = 'text-[15px] font-semibold'

function PrivateRoute() {
  const { state, retry, logout } = useAuth()
  const location = useLocation()
  if (state.status === 'checking') return <main className="grid min-h-svh place-items-center p-8"><Loading /></main>
  if (state.status === 'unavailable') return <main className="grid min-h-svh place-items-center p-8">
    <section className="grid max-w-md gap-4">
      <h1 className="font-serif text-3xl leading-tight">No pudimos verificar tu sesión</h1>
      <Status tone="error">{state.message}</Status>
      <button className={primaryButton} onClick={retry}>Reintentar</button>
      <button className={textButton} onClick={logout}>Volver al inicio de sesión</button>
    </section>
  </main>
  if (state.status === 'guest') {
    const returnTo = location.pathname + location.search + location.hash
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }
  return <Outlet />
}

function AuthPage({ register = false }: { register?: boolean }) {
  const { state, login, register: createCrew } = useAuth()
  const [params] = useSearchParams()
  const returnTo = safeReturnPath(params.get('returnTo'))
  const [fields, setFields] = useState({ teamName: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (message) alertRef.current?.focus() }, [message])
  if (state.status === 'checking') return <main className="grid min-h-svh place-items-center p-8"><Loading /></main>
  if (state.status === 'authenticated') return <Navigate to={returnTo} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const nextErrors: FieldErrors = {}
    if (register && !fields.teamName.trim()) nextErrors.teamName = 'Escribe el nombre de tu tripulación.'
    else if (register && (fields.teamName.trim().length < 3 || fields.teamName.trim().length > 40)) nextErrors.teamName = 'Usa entre 3 y 40 caracteres.'
    if (!fields.email.trim()) nextErrors.email = 'Escribe el email de tu tripulación.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) nextErrors.email = 'Revisa el formato del email.'
    if (fields.email.trim().length > 120) nextErrors.email = 'El email admite hasta 120 caracteres.'
    if (!fields.password) nextErrors.password = 'Escribe tu contraseña.'
    else if (register && (fields.password.length < 8 || fields.password.length > 72)) nextErrors.password = 'Usa entre 8 y 72 caracteres.'
    else if (!register && fields.password.length > 120) nextErrors.password = 'La contraseña admite hasta 120 caracteres.'
    setErrors(nextErrors); setMessage('')
    if (Object.keys(nextErrors).length) return
    inFlight.current = true; setBusy(true)
    try {
      const data = { ...fields, teamName: fields.teamName.trim(), email: fields.email.trim() }
      if (register) await createCrew(data)
      else await login({ email: data.email, password: data.password })
    } catch (error: unknown) {
      if (error instanceof ServiceError) {
        setErrors(error.fields)
        // Si el error ya se muestra junto a un campo, no se repite arriba.
        setMessage(Object.keys(error.fields).length > 0 ? '' : error.message)
      }
      else setMessage('No pudimos completar el acceso. Inténtalo otra vez.')
    } finally { inFlight.current = false; setBusy(false) }
  }
  const alternative = `${register ? '/login' : '/register'}?returnTo=${encodeURIComponent(returnTo)}`
  return <main className="grid min-h-svh md:grid-cols-[46%_54%]">
    <section className="relative flex flex-col overflow-hidden bg-sea px-6 py-6 text-[#efe4cc] md:px-12 md:pt-10 md:pb-7" aria-label="Log Pose Console">
      <Brand to="/login" />
      <div className="my-auto pt-6 pb-2 md:pt-10 md:pb-4">
        <h1 className="font-serif text-4xl leading-tight font-normal tracking-tight md:text-[clamp(38px,4.4vw,65px)]">Todo gran viaje <br className="hidden md:inline" />empieza con <br className="hidden md:inline" /><em className="text-accent">un rumbo.</em></h1>
        <p className="mt-3 text-xs leading-relaxed text-[#c3d3c8] md:mt-6 md:text-sm">Reúne a tu tripulación. Sigue las recompensas.<br />Encuentra tu camino al Grand Line.</p>
        <div className="relative mx-auto mt-4 hidden h-[250px] w-[260px] font-serif text-xs text-[#d2b77e] md:block">
          <Compass className="absolute top-1.5 left-2.5 size-60" />
          <span className="absolute top-0 left-[126px]">N</span><span className="absolute top-[119px] right-0">E</span>
          <span className="absolute bottom-0 left-[126px]">S</span><span className="absolute top-[119px] left-0">O</span>
        </div>
      </div>
      <div className="hidden items-center gap-3.5 text-[11px] text-[#bdd0c4] md:flex"><span>East Blue</span><span className="h-px flex-1 bg-[#527269]" /><span>Grand Line</span></div>
    </section>
    <section className="flex flex-col px-6 py-5 md:px-12 md:py-8">
      <div className="flex items-center gap-2 self-start text-[11px] text-[#596c60] md:self-end"><span className="size-1.5 rounded-full bg-[#557c61]" />{apiConfigured ? 'API del curso configurada' : 'Falta configurar VITE_API_BASE_URL'}</div>
      <div className="m-auto w-full max-w-[390px] py-8 md:py-14">
        <h2 className="font-serif text-3xl leading-tight font-normal tracking-tight md:text-4xl">{register ? 'Tu tripulación empieza aquí.' : 'Bienvenido a bordo.'}</h2>
        <p className="mt-3.5 mb-8 text-sm text-muted">{register ? 'Una cuenta compartida para los tres integrantes.' : 'Ingresa con la cuenta de tu tripulación para continuar el viaje.'}</p>
        <form onSubmit={submit} noValidate aria-busy={busy}>
          {register && <p className="mb-6 rounded-md border border-[#d4ddc9] bg-moss px-3.5 py-3 text-xs leading-relaxed text-[#52634e]">Al crear la tripulación se registra una cuenta real en el servidor del curso. Usen una sola cuenta por equipo.</p>}
          {register && <div className="mb-5"><label className={labelClass} htmlFor="teamName">Nombre de la tripulación</label><input className={inputClass} id="teamName" name="teamName" minLength={3} maxLength={40} autoComplete="organization" value={fields.teamName} onChange={event => setFields({ ...fields, teamName: event.target.value })} aria-invalid={Boolean(errors.teamName)} aria-describedby={errors.teamName ? 'teamName-error' : undefined} disabled={busy} required />{errors.teamName && <p className={fieldErrorClass} id="teamName-error">{errors.teamName}</p>}</div>}
          <div className="mb-5"><label className={labelClass} htmlFor="email">Email de la tripulación</label><input className={inputClass} id="email" name="email" type="email" maxLength={120} autoComplete="email" placeholder="tripulacion@ejemplo.com" value={fields.email} onChange={event => setFields({ ...fields, email: event.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} disabled={busy} required />{errors.email && <p className={fieldErrorClass} id="email-error">{errors.email}</p>}</div>
          <div className="mb-5"><label className={labelClass} htmlFor="password">Contraseña</label><div className="relative"><input className={`${inputClass} pr-20`} id="password" name="password" minLength={register ? 8 : 1} maxLength={register ? 72 : 120} type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={fields.password} onChange={event => setFields({ ...fields, password: event.target.value })} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} disabled={busy} required /><button className="absolute top-1.5 right-1.5 min-h-9 cursor-pointer bg-transparent px-2 text-xs text-[#586b5c]" type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div>{errors.password && <p className={fieldErrorClass} id="password-error">{errors.password}</p>}</div>
          {message && <div ref={alertRef} tabIndex={-1}><Status tone="error">{message}</Status></div>}
          <button className={`${primaryButton} w-full justify-between`} type="submit" disabled={busy}>{busy ? 'Un momento…' : register ? 'Crear tripulación' : 'Iniciar sesión'}{busy ? <Spinner /> : <Arrow />}</button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">{register ? '¿Ya tienen una cuenta?' : '¿Primera vez por aquí?'} <Link className="font-semibold text-ink" to={alternative}>{register ? 'Iniciar sesión' : 'Registrar tripulación'}</Link></p>
      </div>
      <footer className="text-center text-[10px] text-muted">Una tripulación. Una cuenta. El mismo rumbo.</footer>
    </section>
  </main>
}

function Brand({ to }: { to: string }) {
  return <Link className="flex items-center gap-2.5 font-serif text-[27px] leading-none text-[#f3ebd9] no-underline" to={to}><Compass className="size-10" /><span>Log Pose<span className="mt-1.5 block font-sans text-[10px] tracking-wider">Consola de la tripulación</span></span></Link>
}

type DashboardState = { status: 'loading' } | { status: 'empty'; data: DashboardData } | { status: 'error'; message: string } | { status: 'ready'; data: DashboardData }
function DashboardDetails({ state }: { state: DashboardState }) {
  if (state.status !== 'ready') return null
  const { data } = state
  return <section className="mt-7" aria-labelledby="bounty-title">
    {data.topBounties && data.topBounties.length > 0 && <><h2 className={sectionTitle} id="bounty-title">Las mayores recompensas</h2><ul className="my-4">{data.topBounties.map(item => <li className="flex items-center justify-between gap-4 border-t border-line py-3.5" key={item.id}><div className="min-w-0 break-words"><h3 className="text-[13px] font-semibold">{item.name}</h3><p className="text-xs text-muted">{item.epithet}</p></div><span className="max-w-[46%] shrink-0 text-right text-xs break-words tabular-nums">{item.bounty.toLocaleString('es-PE')} berries</span></li>)}</ul></>}
    {data.mostWantedCrew && <p className="mt-2 text-xs text-muted">Tripulación con mayor recompensa: <strong>{data.mostWantedCrew}</strong>.</p>}
    {data.generatedAt && !Number.isNaN(Date.parse(data.generatedAt)) && <p className="mt-2 text-xs text-muted">Resumen actualizado: {new Date(data.generatedAt).toLocaleString('es-PE')}.</p>}
  </section>
}

function NavItem({ children, active = false, checkpoint }: { children: string; active?: boolean; checkpoint?: string }) {
  return <span className={`flex min-h-10 items-center justify-center rounded px-1.5 py-2 text-[11px] md:min-h-11 md:justify-between md:px-3.5 md:py-3 md:text-[13px] ${active ? 'bg-sea-active text-[#fff4db]' : 'text-[#b3c6b8]'}`} aria-current={active ? 'page' : undefined}>
    {children}{checkpoint && <small className="hidden rounded-sm border border-[#5d7e71] px-1 py-0.5 text-[9px] md:inline">{checkpoint}</small>}
  </span>
}

function Dashboard() {
  const { state: auth, gateway, logout } = useAuth()
  const [state, setState] = useState<DashboardState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (auth.status !== 'authenticated') return
    const controller = new AbortController()
    setState({ status: 'loading' })
    gateway.dashboard(auth.session.token, controller.signal).then(data => {
      if (!controller.signal.aborted) setState(data.items.length ? { status: 'ready', data } : { status: 'empty', data })
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setState({ status: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar los indicadores.' })
    })
    return () => controller.abort()
  }, [auth, gateway, attempt, logout])
  const crew = auth.status === 'authenticated' ? auth.session.crew : null
  const poseData = state.status === 'ready' || state.status === 'empty' ? state.data : null
  return <div className="min-h-svh md:grid md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[236px_minmax(0,1fr)]">
    <aside className="flex flex-col gap-4 bg-sea px-5 py-4 text-[#f4e9d4] md:gap-0 md:px-6 md:py-8">
      <Brand to="/dashboard" />
      <nav className="grid grid-cols-4 gap-1 md:mt-14 md:grid-cols-1 md:gap-2" aria-label="Navegación principal">
        <NavItem active>Bitácora</NavItem><NavItem checkpoint="CP2">Carteles</NavItem><NavItem checkpoint="CP4">Noticias</NavItem><NavItem checkpoint="CP5">Sagas</NavItem>
      </nav>
      <div className="flex items-center justify-between gap-4 text-[10px] text-[#bbd0bf] md:mt-auto md:block md:pt-16">
        <span className="hidden md:inline">El viaje empieza en East Blue.</span>
        <button className="flex cursor-pointer items-center justify-end gap-2.5 bg-transparent text-[11px] text-[#f5e9d4] md:mt-5 md:w-full md:justify-between md:border-t md:border-[#547469] md:pt-4 md:text-xs" onClick={logout}>Cerrar sesión <Arrow /></button>
      </div>
    </aside>
    <main className="flex min-w-0 flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-line px-5 py-4 text-[11px] break-all md:px-10 md:py-6 md:text-xs"><span>{crew?.teamCode}</span><span className="text-[10px] text-muted md:text-[11px]">{crew?.email}</span></header>
      <div className="mx-auto w-full max-w-[1150px] px-5 py-8 md:px-10 md:py-11">
        <div className="mb-7"><h1 className="font-serif text-[31px] leading-tight font-normal tracking-tight md:text-[clamp(28px,3vw,38px)]">Bitácora de la tripulación</h1><p className="mt-2.5 text-[13px] break-words text-muted">{crew ? `Bienvenida a bordo, ${crew.teamName}.` : 'El punto de partida de tu próxima aventura.'}</p></div>
        <section className="mt-8" aria-labelledby="summary-title"><div className="flex items-center justify-between gap-3"><h2 className={sectionTitle} id="summary-title">Tu tripulación, de un vistazo</h2>{state.status === 'error' && <button className={textButton} onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}</div>
          {state.status === 'loading' ? <Loading>Cargando indicadores…</Loading>
            : state.status === 'error' ? <div className="mt-4"><Status tone="error">{state.message} Puedes reintentar la carga.</Status></div>
            : state.status === 'ready' ? <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-6 border-y border-line py-6">{state.data.items.map((item, index) => <div className="min-w-0" key={`${item.label}-${index}`}><dt className="text-xs text-muted">{item.label}</dt><dd className="mt-2 font-serif text-[clamp(22px,2vw,28px)] break-words tabular-nums">{item.value}</dd></div>)}</dl>
            : <div className="mt-4 flex min-h-56 flex-col items-center justify-center border-y border-line p-6 text-center"><Compass className="size-13 text-[#73896c]" /><h3 className="my-2 font-serif text-[23px] font-normal">Todavía no hay indicadores.</h3><p className="max-w-md text-xs text-muted">Tu espacio de trabajo todavía no tiene carteles de Se Busca.</p><button className={textButton} onClick={() => setAttempt(value => value + 1)}>Volver a consultar</button></div>}
        </section>
        <DashboardDetails state={state} />
        <section className="mt-8 flex items-center justify-between gap-5 rounded-md border border-[#d4ddc9] bg-moss p-5 md:px-7 md:py-6" aria-labelledby="log-pose-title">
          <div><h2 className={sectionTitle} id="log-pose-title">Tu paso al Grand Line</h2><p className="mt-2 max-w-sm text-xs text-[#52634e]">{poseData?.logPoseMessage ?? 'El Log Pose se obtiene al aprobar la inspección presencial del CP3.'}</p><span className="mt-4 inline-block border-b border-[#9cae8e] pb-0.5 text-[10px] font-semibold text-[#52634e]">{poseData ? poseData.logPose === 'unlocked' ? 'Log Pose obtenido' : 'Inspección pendiente' : 'Estado pendiente de consultar'}</span></div>
          <Compass className="size-[70px] text-[#677d56] md:size-[105px]" />
        </section>
        <section className="mt-9" aria-labelledby="route-title"><h2 className={sectionTitle} id="route-title">La ruta de la tripulación</h2>
          <ol className="mt-4">{[['CP1', 'Zarpar', 'Acceso y bitácora', 'Acceso iniciado'], ['CP2', 'Se Busca', 'Carteles y recompensas', 'Próxima etapa'], ['CP3', 'Reverse Mountain', 'Inspección presencial', 'Requiere CP1 y CP2']].map(([code, title, detail, note]) => <li className="flex items-center gap-2.5 border-t border-line py-4 md:gap-4" key={code}><span className="w-8 text-[11px] text-[#647358] tabular-nums">{code}</span><div><h3 className="text-[13px] font-semibold">{title}</h3><p className="mt-1 text-[11px] text-muted">{detail}</p></div><small className="ml-auto max-w-24 text-right text-[10px] text-muted md:max-w-none">{note}</small></li>)}</ol>
        </section>
      </div>
      <footer className="mt-auto border-t border-line px-5 py-5 text-[10px] text-muted md:px-10">Log Pose Console · Rumbo al Grand Line</footer>
    </main>
  </div>
}

function NotFound() {
  return <main className="grid min-h-svh place-items-center p-8"><section className="max-w-md text-center"><Compass className="mx-auto size-60 text-[#997338]" /><h1 className="font-serif text-3xl leading-tight font-normal">Este rumbo no está en el mapa.</h1><p className="mt-4 mb-7 text-sm text-muted">No encontramos la página que estás buscando.</p><Link className={primaryButton} to="/dashboard">Volver al inicio <Arrow /></Link></section></main>
}

export function App() {
  return <Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/login" element={<AuthPage key="login" />} /><Route path="/register" element={<AuthPage key="register" register />} /><Route element={<PrivateRoute />}><Route path="/dashboard" element={<Dashboard />} /></Route><Route path="*" element={<NotFound />} /></Routes>
}
