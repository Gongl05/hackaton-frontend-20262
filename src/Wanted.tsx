import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useParams, useSearchParams } from 'react-router'
import { useAuth } from './auth'
import { ConsoleLayout } from './ConsoleLayout'
import { Compass, Loading, primaryButton, Status, textButton } from './components'
import { ServiceError } from './services'
import type { PirateCrew, WantedDetailData, WantedPageData, WantedQuery } from './wanted-models'
import { fruitLabels, fruitTypes, readWantedQuery, roleLabels, statusLabels, wantedSearch, wantedStatuses } from './wanted-models'

const controlClass = 'min-h-11 w-full min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink disabled:opacity-60'
const labelClass = 'mb-2 block text-xs font-semibold'
type PageState = { key: string; status: 'loading' } | { key: string; status: 'error'; message: string } | { key: string; status: 'ready'; data: WantedPageData }
type CrewsState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: PirateCrew[] }
const money = (value: number) => `${value.toLocaleString('es-PE')} berries`
const date = (value: string) => Number.isNaN(Date.parse(value)) ? 'Fecha no disponible' : new Date(value).toLocaleDateString('es-PE')

export function WantedPage() {
  const { state: auth, gateway, logout } = useAuth()
  const { id } = useParams()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const paramsWriter = useRef(setParams)
  paramsWriter.current = setParams
  const query = readWantedQuery(params)
  const key = wantedSearch(query)
  const queryRef = useRef(query)
  queryRef.current = query
  const ownNavigation = useRef<string | null>(null)
  const [draft, setDraft] = useState(query.q)
  const draftRef = useRef(query.q)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [crewAttempt, setCrewAttempt] = useState(0)
  const [pageState, setPageState] = useState<PageState>({ key, status: 'loading' })
  const [crews, setCrews] = useState<CrewsState>({ status: 'loading' })
  const [reservedHeight, setReservedHeight] = useState(480)
  const resultsRef = useRef<HTMLDivElement>(null)
  const listScroll = useRef(0)
  const previousId = useRef(id)
  const token = auth.status === 'authenticated' ? auth.session.token : ''
  const visibleState = pageState.key === key ? pageState : { key, status: 'loading' as const }
  const data = visibleState.status === 'ready' ? visibleState.data : null

  const change = useCallback((patch: Partial<WantedQuery>, replace = false) => {
    if (timer.current) clearTimeout(timer.current)
    const current = queryRef.current
    const next = { ...current, page: 0, q: draftRef.current.trim().slice(0, 100), ...patch }
    if (['q', 'size', 'sort', 'status', 'fruit', 'crewId'].some(field => next[field as keyof WantedQuery] !== current[field as keyof WantedQuery])) next.page = 0
    const destination = wantedSearch(next)
    ownNavigation.current = destination
    paramsWriter.current(destination, { replace, preventScrollReset: true })
  }, [])

  useLayoutEffect(() => {
    const own = ownNavigation.current === wantedSearch(queryRef.current)
    ownNavigation.current = null
    // Una navegación propia no debe borrar texto escrito después de pedirla.
    if (!own || draftRef.current.trim() === queryRef.current.q) {
      if (timer.current) clearTimeout(timer.current)
      draftRef.current = queryRef.current.q
      setDraft(queryRef.current.q)
    }
  }, [location.key])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (params.toString() !== key) paramsWriter.current(key, { replace: true, preventScrollReset: true })
  }, [key, params])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setCrews({ status: 'loading' })
    gateway.crews(token, controller.signal).then(items => { if (!controller.signal.aborted) setCrews({ status: 'ready', items }) }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setCrews({ status: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar las tripulaciones.' })
    })
    return () => controller.abort()
  }, [token, gateway, logout, crewAttempt])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setPageState({ key, status: 'loading' })
    const requested = readWantedQuery(new URLSearchParams(key))
    gateway.wanted(token, requested, controller.signal).then(page => {
      if (controller.signal.aborted) return
      const lastPage = Math.max(0, page.totalPages - 1)
      if (requested.page > lastPage) {
        paramsWriter.current(wantedSearch({ ...requested, page: lastPage }), { replace: true, preventScrollReset: true })
        return
      }
      setPageState({ key, status: 'ready', data: page })
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setPageState({ key, status: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar los carteles.' })
    })
    return () => controller.abort()
  }, [token, key, gateway, logout, attempt])

  useLayoutEffect(() => {
    if (!id && data && resultsRef.current) setReservedHeight(Math.max(480, resultsRef.current.offsetHeight))
  }, [id, data])

  useLayoutEffect(() => {
    const returning = previousId.current && !id
    previousId.current = id
    const frame = requestAnimationFrame(() => { if (returning) window.scrollTo(0, listScroll.current); else if (id) window.scrollTo(0, 0) })
    return () => cancelAnimationFrame(frame)
  }, [id])

  function search(value: string) {
    setDraft(value); draftRef.current = value
    if (timer.current) clearTimeout(timer.current)
    if (value.trim() !== queryRef.current.q) timer.current = setTimeout(() => change({ q: value.trim() }), 350)
  }
  function reset() { draftRef.current = ''; setDraft(''); change({ status: '', fruit: '', crewId: '', q: '', page: 0 }) }
  const activeFilters = Boolean(query.status || query.fruit || query.crewId || query.q)

  return <ConsoleLayout>
    <div hidden={Boolean(id)}>
      <div className="mb-7"><h1 className="font-serif text-[31px] leading-tight tracking-tight md:text-4xl">Carteles de Se Busca</h1><p className="mt-3 text-sm text-muted">Sigue las recompensas y encuentra tu próximo objetivo.</p></div>
      <form className="grid gap-4 border-y border-line py-6 sm:grid-cols-2 lg:grid-cols-3" onSubmit={event => { event.preventDefault(); change({ q: draft.trim() }) }}>
        <div className="sm:col-span-2 lg:col-span-3"><label className={labelClass} htmlFor="wanted-search">Buscar por nombre o epíteto</label><input id="wanted-search" className={controlClass} type="search" maxLength={100} value={draft} placeholder="Escribe un nombre o apodo…" onChange={event => search(event.target.value)} /></div>
        <div><label className={labelClass} htmlFor="wanted-status">Estado</label><select id="wanted-status" className={controlClass} value={query.status} onChange={event => change({ status: event.target.value as WantedQuery['status'] })}><option value="">Todos los estados</option>{wantedStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div>
        <div><label className={labelClass} htmlFor="wanted-crew">Tripulación</label><select id="wanted-crew" className={controlClass} value={query.crewId} disabled={crews.status === 'loading'} onChange={event => change({ crewId: event.target.value })}><option value="">{crews.status === 'loading' ? 'Cargando tripulaciones…' : 'Todas las tripulaciones'}</option>{query.crewId && (crews.status !== 'ready' || !crews.items.some(crew => crew.id === query.crewId)) && <option value={query.crewId}>Tripulación de la URL</option>}{crews.status === 'ready' && crews.items.map(crew => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></div>
        <div><label className={labelClass} htmlFor="wanted-fruit">Fruta del diablo</label><select id="wanted-fruit" className={controlClass} value={query.fruit} onChange={event => change({ fruit: event.target.value as WantedQuery['fruit'] })}><option value="">Todos los tipos</option>{fruitTypes.map(fruit => <option key={fruit} value={fruit}>{fruitLabels[fruit]}</option>)}</select></div>
        <div><label className={labelClass} htmlFor="wanted-sort">Ordenar por</label><select id="wanted-sort" className={controlClass} value={query.sort} onChange={event => change({ sort: event.target.value as WantedQuery['sort'] })}><option value="bounty,desc">Mayor recompensa</option><option value="name,asc">Nombre: A–Z</option><option value="updatedAt,desc">Actualización más reciente</option></select></div>
        <div><label className={labelClass} htmlFor="wanted-size">Carteles por página</label><select id="wanted-size" className={controlClass} value={query.size} onChange={event => change({ size: Number(event.target.value) as WantedQuery['size'] })}>{[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></div>
        <div className="flex items-end"><button type="button" className={textButton} onClick={reset} disabled={!activeFilters && !draft}>Limpiar filtros</button></div>
      </form>
      {crews.status === 'error' && <div className="mt-4"><Status tone="error">{crews.message} <button className={textButton} onClick={() => setCrewAttempt(value => value + 1)}>Reintentar tripulaciones</button></Status></div>}
      <div className="flex min-h-16 items-center justify-between gap-4 text-xs text-muted" aria-live="polite"><span>{data ? `${data.totalElements.toLocaleString('es-PE')} ${data.totalElements === 1 ? 'cartel encontrado' : 'carteles encontrados'}` : visibleState.status === 'error' ? 'Carga interrumpida' : 'Buscando carteles…'}</span><span>{data && data.totalPages > 0 ? `Página ${query.page + 1} de ${data.totalPages}` : ''}</span></div>
      <section aria-label="Resultados de carteles" aria-busy={visibleState.status === 'loading'} style={{ minHeight: reservedHeight }}>
        {visibleState.status === 'loading' ? <div className="flex min-h-120 items-center justify-center"><Loading>Cargando carteles…</Loading></div>
          : visibleState.status === 'error' ? <div className="grid min-h-120 content-center"><Status tone="error">{visibleState.message}</Status><button className={`${primaryButton} justify-self-center`} onClick={() => setAttempt(value => value + 1)}>Reintentar carteles</button></div>
          : data && data.content.length === 0 ? <div className="flex min-h-120 flex-col items-center justify-center text-center"><Compass className="mb-4 size-16 text-muted" /><h2 className="font-serif text-2xl">No encontramos carteles.</h2><p className="mt-3 max-w-sm text-sm text-muted">{activeFilters ? 'Prueba con otros filtros o una búsqueda diferente.' : 'Tu equipo todavía no tiene carteles disponibles.'}</p>{activeFilters && <button className={`${textButton} mt-4`} onClick={reset}>Limpiar filtros</button>}</div>
          : data && <div ref={resultsRef} className="divide-y divide-line border-y border-line">{data.content.map(item => <article key={item.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><span className="text-[10px] font-semibold text-muted">{statusLabels[item.status]}</span><h2 className="mt-1 font-serif text-2xl break-words"><Link className="underline-offset-4 hover:underline" to={`/wanted/${encodeURIComponent(item.id)}?${key}`} onClick={() => { listScroll.current = window.scrollY }}>{item.name}</Link></h2><p className="mt-1 text-sm text-muted break-words">{item.epithet}</p><p className="mt-2 text-xs text-muted break-words">{item.crew.name} · {item.devilFruit ? item.devilFruit.name : 'Sin fruta del diablo'}</p></div><div className="min-w-0 sm:max-w-64 sm:text-right"><p className="font-serif text-xl break-words tabular-nums">{money(item.bounty)}</p><Link className={`${textButton} mt-1 inline-block`} to={`/wanted/${encodeURIComponent(item.id)}?${key}`} onClick={() => { listScroll.current = window.scrollY }}>Ver cartel<span className="sr-only"> de {item.name}</span></Link></div></article>)}</div>}
      </section>
      <nav className="mt-5 flex min-h-12 items-center justify-between gap-4" aria-label="Paginación de carteles"><button className={`${primaryButton} disabled:cursor-default`} disabled={!data || query.page === 0} onClick={() => change({ page: query.page - 1 })}>Anterior</button><span className="text-xs text-muted">{data && data.totalPages > 0 ? `${query.page + 1} / ${data.totalPages}` : '—'}</span><button className={`${primaryButton} disabled:cursor-default`} disabled={!data || query.page + 1 >= data.totalPages} onClick={() => change({ page: query.page + 1 })}>Siguiente</button></nav>
    </div>
    <Outlet />
  </ConsoleLayout>
}

type DetailState = { id: string; status: 'loading' } | { id: string; status: 'error'; message: string; missing: boolean } | { id: string; status: 'ready'; data: WantedDetailData }
export function WantedDetail() {
  const { id = '' } = useParams()
  const { state: auth, gateway, logout } = useAuth()
  const [params] = useSearchParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<DetailState>({ id, status: 'loading' })
  const token = auth.status === 'authenticated' ? auth.session.token : ''
  const visible = state.id === id ? state : { id, status: 'loading' as const }
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setState({ id, status: 'loading' })
    gateway.wantedDetail(token, id, controller.signal).then(data => { if (!controller.signal.aborted) setState({ id, status: 'ready', data }) }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setState({ id, status: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar el cartel.', missing: error instanceof ServiceError && error.kind === 'not-found' })
    })
    return () => controller.abort()
  }, [token, id, gateway, logout, attempt])
  const item = visible.status === 'ready' ? visible.data : null
  return <section>
    <Link className={textButton} to={`/wanted?${wantedSearch(readWantedQuery(params))}`}>← Volver a los carteles</Link>
    <div className="mt-6 min-h-120">
      {visible.status === 'loading' ? <Loading>Cargando cartel…</Loading> : visible.status === 'error' ? <><h1 className="mb-5 font-serif text-3xl">{visible.missing ? 'Este cartel no está disponible.' : 'No pudimos abrir el cartel.'}</h1><Status tone="error">{visible.message}</Status>{!visible.missing && <button className={primaryButton} onClick={() => setAttempt(value => value + 1)}>Reintentar detalle</button>}</> : item && <>
        <div className="border-b border-line pb-7"><p className="text-xs font-semibold text-muted">{statusLabels[item.status]}</p><h1 className="mt-3 font-serif text-4xl break-words md:text-5xl">{item.name}</h1><p className="mt-3 text-lg text-muted break-words">{item.epithet}</p><p className="mt-6 font-serif text-3xl break-words tabular-nums">{money(item.bounty)}</p></div>
        <p className="mt-7 max-w-prose text-sm leading-7">{item.bio}</p>
        <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">{[['Tripulación', item.crew.name], ['Puesto', roleLabels[item.role] ?? item.role], ['Fruta del diablo', item.devilFruit ? `${item.devilFruit.name} (${item.devilFruit.type})` : 'Sin fruta'], ['Nivel de amenaza', `${item.threatLevel} / 5`], ['Edad', `${item.age} años`], ['Altura', `${item.heightCm} cm`], ['Último avistamiento', `${item.lastSeen.island} · ${date(item.lastSeen.seenAt)}`], ['Actualizado', date(item.updatedAt)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-2 text-sm break-words">{value}</dd></div>)}</dl>
        <section className="mt-10"><h2 className="font-serif text-2xl">Historial de recompensas</h2>{item.bountyHistory.length ? <ol className="mt-5 divide-y divide-line">{item.bountyHistory.map((entry, index) => <li className="flex flex-wrap justify-between gap-3 py-4 text-sm" key={`${entry.issuedAt}-${index}`}><time dateTime={entry.issuedAt} className="text-muted">{date(entry.issuedAt)}</time><span className="tabular-nums">{money(entry.amount)}</span></li>)}</ol> : <p className="mt-4 text-sm text-muted">No hay historial disponible.</p>}</section>
      </>}
    </div>
  </section>
}
