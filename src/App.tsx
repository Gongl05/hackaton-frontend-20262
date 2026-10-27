import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router'
import { safeReturnPath, useAuth } from './auth'
import { Arrow, Compass, Loading, Status } from './components'
import type { DashboardData, FieldErrors } from './services'
import { apiConfigured, ServiceError } from './services'

function PrivateRoute() {
  const { state, retry, logout } = useAuth()
  const location = useLocation()
  if (state.status === 'checking') return <main className="center-page"><Loading /></main>
  if (state.status === 'unavailable') return <main className="center-page"><section className="recovery"><h1>No pudimos verificar tu sesión</h1><Status tone="error">{state.message}</Status><button className="primary" onClick={retry}>Reintentar</button><button className="text-button" onClick={logout}>Volver al inicio de sesión</button></section></main>
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
  if (state.status === 'checking') return <main className="center-page"><Loading /></main>
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
      if (error instanceof ServiceError) { setErrors(error.fields); setMessage(error.message) }
      else setMessage('No pudimos completar el acceso. Inténtalo otra vez.')
    } finally { inFlight.current = false; setBusy(false) }
  }
  const alternative = `${register ? '/login' : '/register'}?returnTo=${encodeURIComponent(returnTo)}`
  return <main className="auth-layout">
    <section className="voyage-panel" aria-label="Log Pose Console">
      <Link className="brand light" to="/login"><Compass /><span>Log Pose<span className="brand-detail">Consola de la tripulación</span></span></Link>
      <div className="voyage-content"><h1>Todo gran viaje <br />empieza con <br /><em>un rumbo.</em></h1><p>Reúne a tu tripulación. Sigue las recompensas.<br />Encuentra tu camino al Grand Line.</p><div className="compass-scene"><Compass large /><span className="north">N</span><span className="east">E</span><span className="south">S</span><span className="west">O</span></div></div>
      <div className="voyage-footer"><span>East Blue</span><span className="voyage-line" /><span>Grand Line</span></div>
    </section>
    <section className="form-panel">
      <div className="local-badge"><span />{apiConfigured ? 'API del curso configurada' : 'Conexión pendiente de configurar'}</div>
      <div className="auth-form-wrap">
        <h2>{register ? 'Tu tripulación empieza aquí.' : 'Bienvenido a bordo.'}</h2>
        <p className="intro">{register ? 'Una cuenta compartida para los tres integrantes.' : 'Ingresa con la cuenta de tu tripulación para continuar el viaje.'}</p>
        <form onSubmit={submit} noValidate aria-busy={busy}>
          {register && <p className="registration-note">Al crear la tripulación se registra una cuenta real en el servidor del curso. Usen una sola cuenta por equipo.</p>}{register && <div className="field"><label htmlFor="teamName">Nombre de la tripulación</label><input id="teamName" name="teamName" minLength={3} maxLength={40} autoComplete="organization" value={fields.teamName} onChange={event => setFields({ ...fields, teamName: event.target.value })} aria-invalid={Boolean(errors.teamName)} aria-describedby={errors.teamName ? 'teamName-error' : undefined} disabled={busy} required />{errors.teamName && <p className="field-error" id="teamName-error">{errors.teamName}</p>}</div>}
          <div className="field"><label htmlFor="email">Email de la tripulación</label><input id="email" name="email" type="email" maxLength={120} autoComplete="email" placeholder="tripulacion@ejemplo.com" value={fields.email} onChange={event => setFields({ ...fields, email: event.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} disabled={busy} required />{errors.email && <p className="field-error" id="email-error">{errors.email}</p>}</div>
          <div className="field"><label htmlFor="password">Contraseña</label><div className="password-control"><input id="password" name="password" minLength={register ? 8 : 1} maxLength={register ? 72 : 120} type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={fields.password} onChange={event => setFields({ ...fields, password: event.target.value })} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} disabled={busy} required /><button className="password-toggle" type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div>{errors.password && <p className="field-error" id="password-error">{errors.password}</p>}</div>
          {message && <div ref={alertRef} tabIndex={-1}><Status tone="error">{message}</Status></div>}
          <button className="primary w-full justify-between" type="submit" disabled={busy}>{busy ? 'Un momento…' : register ? 'Crear tripulación' : 'Iniciar sesión'}{busy ? <span className="spinner" aria-hidden="true" /> : <Arrow />}</button>
        </form>
        <p className="alternate">{register ? '¿Ya tienen una cuenta?' : '¿Primera vez por aquí?'} <Link to={alternative}>{register ? 'Iniciar sesión' : 'Registrar tripulación'}</Link></p>
        <div className="preview-link"><Link to="/preview">Explorar el dashboard sin iniciar sesión <Arrow /></Link><p>Vista previa sin datos ni cuentas reales.</p></div>
      </div>
      <footer className="form-footer">Una tripulación. Una cuenta. El mismo rumbo.</footer>
    </section>
  </main>
}

type DashboardState = { status: 'loading' } | { status: 'empty'; data: DashboardData } | { status: 'offline' } | { status: 'error'; message: string } | { status: 'ready'; data: DashboardData }
function DashboardDetails({ state }: { state: DashboardState }) {
  if (state.status !== 'ready') return null
  const { data } = state
  return <section className="bounty-section" aria-labelledby="bounty-title">
    {data.topBounties && data.topBounties.length > 0 && <><h2 id="bounty-title">Las mayores recompensas</h2><ul className="bounty-list">{data.topBounties.map(item => <li key={item.id}><div><h3>{item.name}</h3><p>{item.epithet}</p></div><span>{item.bounty.toLocaleString('es-PE')} berries</span></li>)}</ul></>}
    {data.mostWantedCrew && <p className="summary-detail">Tripulación con mayor recompensa: <strong>{data.mostWantedCrew}</strong>.</p>}
    {data.generatedAt && !Number.isNaN(Date.parse(data.generatedAt)) && <p className="summary-detail">Resumen actualizado: {new Date(data.generatedAt).toLocaleString('es-PE')}.</p>}
  </section>
}
function Dashboard({ preview = false }: { preview?: boolean }) {
  const { state: auth, gateway, logout } = useAuth()
  const [state, setState] = useState<DashboardState>({ status: preview ? 'offline' : 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (preview || auth.status !== 'authenticated') return
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
  }, [preview, auth, gateway, attempt, logout])
  const crew = auth.status === 'authenticated' && !preview ? auth.session.crew : null
  return <div className="console-layout">
    <aside className="sidebar"><Link className="brand light" to={preview ? '/preview' : '/dashboard'}><Compass /><span>Log Pose<span className="brand-detail">Consola de la tripulación</span></span></Link><nav aria-label="Navegación principal"><span className="nav-active" aria-current="page">Bitácora</span><span className="nav-future">Carteles <small>CP2</small></span><span className="nav-future">Noticias <small>CP4</small></span><span className="nav-future">Sagas <small>CP5</small></span></nav><div className="sidebar-bottom"><span>El viaje empieza en East Blue.</span>{preview ? <Link to="/login">Volver al acceso <Arrow /></Link> : <button onClick={logout}>Cerrar sesión <Arrow /></button>}</div></aside>
    <main className="console-main"><header className="console-header"><span>{crew?.teamCode ?? 'Vista previa local'}</span><span className="connection-label">{preview ? 'Sin conexión al curso' : crew?.email}</span></header>
      <div className="console-body"><div className="page-heading"><h1>Bitácora de la tripulación</h1><p>{crew ? `Bienvenida a bordo, ${crew.teamName}.` : 'El punto de partida de tu próxima aventura.'}</p></div>
        {preview && <Status>Estás explorando una vista previa. No se ha iniciado sesión ni enviado información al curso.</Status>}
        <section className="summary-section" aria-labelledby="summary-title"><div className="section-heading"><h2 id="summary-title">Tu tripulación, de un vistazo</h2>{state.status === 'error' && <button className="text-button" onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}</div>
          {state.status === 'loading' ? <Loading>Cargando indicadores…</Loading> : state.status === 'error' ? <Status tone="error">{state.message} Puedes reintentar la carga.</Status> : state.status === 'ready' ? <dl className="metrics">{state.data.items.map((item, index) => <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <div className="empty-state"><Compass /><h3>{state.status === 'offline' ? 'Los indicadores esperan tu conexión.' : 'Todavía no hay indicadores.'}</h3><p>{state.status === 'offline' ? 'Aquí aparecerán los datos reales de tu tripulación cuando habilitemos la API.' : 'Tu espacio de trabajo todavía no tiene carteles de Se Busca.'}</p>{state.status === 'empty' && <button className="text-button" onClick={() => setAttempt(value => value + 1)}>Volver a consultar</button>}</div>}
        </section>
        <DashboardDetails state={state} /><section className="log-pose-section" aria-labelledby="log-pose-title"><div><h2 id="log-pose-title">Tu paso al Grand Line</h2><p>{state.status === 'ready' || state.status === 'empty' ? state.data.logPoseMessage ?? 'El Log Pose se obtiene al aprobar la inspección presencial del CP3.' : 'El Log Pose se obtiene al aprobar la inspección presencial del CP3.'}</p><span className="pose-label">{state.status === 'ready' || state.status === 'empty' ? state.data.logPose === 'unlocked' ? 'Log Pose obtenido' : 'Inspección pendiente' : 'Estado pendiente de consultar'}</span></div><Compass large /></section>
        <section className="route-section" aria-labelledby="route-title"><h2 id="route-title">La ruta de la tripulación</h2><ol className="route-list"><li><span>CP1</span><div><h3>Zarpar</h3><p>Acceso y bitácora</p></div><small>{preview ? 'Vista previa' : 'Acceso iniciado'}</small></li><li><span>CP2</span><div><h3>Se Busca</h3><p>Carteles y recompensas</p></div><small>Próxima etapa</small></li><li><span>CP3</span><div><h3>Reverse Mountain</h3><p>Inspección presencial</p></div><small>Requiere CP1 y CP2</small></li></ol></section>
      </div><footer className="console-footer">Log Pose Console · Rumbo al Grand Line</footer>
    </main>
  </div>
}

function NotFound() {
  return <main className="center-page"><section className="not-found"><Compass large /><h1>Este rumbo no está en el mapa.</h1><p>No encontramos la página que estás buscando.</p><Link className="primary" to="/dashboard">Volver al inicio <Arrow /></Link></section></main>
}

export function App() {
  return <Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/login" element={<AuthPage key="login" />} /><Route path="/register" element={<AuthPage key="register" register />} /><Route path="/preview" element={<Dashboard preview />} /><Route element={<PrivateRoute />}><Route path="/dashboard" element={<Dashboard />} /></Route><Route path="*" element={<NotFound />} /></Routes>
}
