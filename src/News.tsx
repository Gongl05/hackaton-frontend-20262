import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useOutletContext, useParams, useSearchParams } from 'react-router'
import { useAuth } from './auth'
import { ConsoleLayout } from './ConsoleLayout'
import { Compass, GrandLineLocked, Loading, primaryButton, Spinner, Status, textButton } from './components'
import { readNewsDetail, ServiceError } from './services'
import type { NewsDetailData, NewsItem, NewsQuery, NewsStatus, VerifiedStatus } from './news-models'
import { newsPriorities, newsPriorityLabels, newsSearch, newsStatuses, newsStatusLabels, newsTypeLabels, newsTypes, readNewsQuery } from './news-models'

const controlClass = 'min-h-11 w-full min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink'
const labelClass = 'mb-2 block text-xs font-semibold'
const statusTone: Record<NewsStatus, string> = { RUMOR: 'bg-[#fff4d6] text-[#7a5a12]', CONFIRMED: 'bg-[#e1efe3] text-[#25603a]', DEBUNKED: 'bg-[#f6e3df] text-[#7b3028]' }
const priorityTone: Record<string, string> = { CRITICAL: 'text-danger', HIGH: 'text-[#9a5b13]', MEDIUM: 'text-muted', LOW: 'text-muted' }
const dateTime = (value: string) => Number.isNaN(Date.parse(value)) ? 'Fecha no disponible' : new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

// Estado del feed ligado a sus filtros (key). Si cambian los filtros, se descarta todo lo de la key anterior.
interface FeedState {
  key: string
  items: NewsItem[]
  cursor: string | null
  hasMore: boolean
  status: 'idle' | 'loading' | 'error'
  error: string
  locked: boolean
}
const emptyFeed = (key: string): FeedState => ({ key, items: [], cursor: null, hasMore: true, status: 'idle', error: '', locked: false })

export interface NewsOutletContext { updateNews: (item: NewsItem) => void }

export function NewsPage() {
  const { state: auth, gateway, logout } = useAuth()
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const query = readNewsQuery(params)
  const key = newsSearch(query)
  const token = auth.status === 'authenticated' ? auth.session.token : ''
  const [stored, setFeed] = useState<FeedState>(() => emptyFeed(key))
  // Mientras el efecto de reinicio no corre, nunca se muestran noticias de otros filtros.
  const feed = stored.key === key ? stored : emptyFeed(key)
  const feedRef = useRef(feed)
  feedRef.current = feed
  // Una sola carga adicional en vuelo: este ref guarda la request activa.
  const inFlight = useRef<AbortController | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const listScroll = useRef(0)
  const previousId = useRef(id)

  // Una URL con valores inválidos se corrige sin romper la vista.
  useEffect(() => {
    if (params.toString() !== key) setParams(key, { replace: true, preventScrollReset: true })
  }, [key, params, setParams])

  // Cambiar filtros: se cancela la carga en vuelo y el feed empieza de nuevo sin cursor.
  useEffect(() => {
    inFlight.current?.abort()
    inFlight.current = null
    setFeed(emptyFeed(key))
    return () => { inFlight.current?.abort(); inFlight.current = null }
  }, [key])

  const loadMore = useCallback(() => {
    const current = feedRef.current
    if (!token || inFlight.current || !current.hasMore || current.status === 'loading') return
    const controller = new AbortController()
    inFlight.current = controller
    const requestKey = current.key
    setFeed({ ...current, status: 'loading', error: '' })
    gateway.newsFeed(token, readNewsQuery(new URLSearchParams(requestKey)), current.cursor, controller.signal).then(page => {
      if (controller.signal.aborted) return
      inFlight.current = null
      setFeed(prev => {
        if (prev.key !== requestKey) return prev
        // Ninguna noticia aparece dos veces, aunque el servidor la repita.
        const seen = new Set(prev.items.map(item => item.id))
        const fresh = page.items.filter(item => !seen.has(item.id) && Boolean(seen.add(item.id)))
        return { ...prev, items: [...prev.items, ...fresh], cursor: page.nextCursor, hasMore: page.hasMore && page.nextCursor !== null, status: 'idle' }
      })
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      inFlight.current = null
      if (error instanceof ServiceError && error.kind === 'unauthorized') { logout(); return }
      // Cursor inválido o de otros filtros: se vuelve a pedir el feed desde el inicio.
      if (error instanceof ServiceError && (error.code === 'INVALID_CURSOR' || error.code === 'CURSOR_FILTER_MISMATCH')) { setFeed(emptyFeed(requestKey)); return }
      const message = error instanceof Error ? error.message : 'No pudimos cargar más noticias.'
      // El error no borra las noticias que ya estaban cargadas.
      setFeed(prev => prev.key !== requestKey ? prev : { ...prev, status: 'error', error: message, locked: error instanceof ServiceError && error.kind === 'locked' })
    })
  }, [token, gateway, logout])

  // Infinite scroll: al acercarse el final de la lista se carga la siguiente página.
  // El observer se vuelve a crear después de cada carga, así revisa si el final sigue visible.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || id || feed.status !== 'idle' || !feed.hasMore) return
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) loadMore() }, { rootMargin: '0px 0px 600px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [id, feed.key, feed.status, feed.hasMore, feed.items.length, loadMore])

  // Al cerrar el detalle se vuelve a la misma posición del feed (sin volver a pedir nada).
  useLayoutEffect(() => {
    const returning = previousId.current && !id
    previousId.current = id
    const frame = requestAnimationFrame(() => { if (returning) window.scrollTo(0, listScroll.current); else if (id) window.scrollTo(0, 0) })
    return () => cancelAnimationFrame(frame)
  }, [id])

  const updateNews = useCallback((updated: NewsItem) => {
    setFeed(prev => ({ ...prev, items: prev.items.map(item => item.id === updated.id ? { ...item, status: updated.status, verifiedAt: updated.verifiedAt, updatedAt: updated.updatedAt } : item) }))
  }, [])

  function change(patch: Partial<NewsQuery>) {
    setParams(newsSearch({ ...query, ...patch }), { preventScrollReset: true })
  }
  const activeFilters = Boolean(query.type || query.priority || query.status)
  const detailSearch = key ? `?${key}` : ''
  const context: NewsOutletContext = { updateNews }

  return <ConsoleLayout>
    <div hidden={Boolean(id)}>
      <div className="mb-7"><h1 className="font-serif text-[31px] leading-tight tracking-tight md:text-4xl">Noticias del mundo</h1><p className="mt-3 text-sm text-muted">Lo que traen las News Coo desde todos los mares.</p></div>
      <form className="grid gap-4 border-y border-line py-6 sm:grid-cols-2 lg:grid-cols-4" onSubmit={event => event.preventDefault()}>
        <div><label className={labelClass} htmlFor="news-type">Tipo</label><select id="news-type" className={controlClass} value={query.type} onChange={event => change({ type: event.target.value as NewsQuery['type'] })}><option value="">Todos los tipos</option>{newsTypes.map(type => <option key={type} value={type}>{newsTypeLabels[type]}</option>)}</select></div>
        <div><label className={labelClass} htmlFor="news-priority">Prioridad</label><select id="news-priority" className={controlClass} value={query.priority} onChange={event => change({ priority: event.target.value as NewsQuery['priority'] })}><option value="">Todas las prioridades</option>{newsPriorities.map(priority => <option key={priority} value={priority}>{newsPriorityLabels[priority]}</option>)}</select></div>
        <div><label className={labelClass} htmlFor="news-status">Estado</label><select id="news-status" className={controlClass} value={query.status} onChange={event => change({ status: event.target.value as NewsQuery['status'] })}><option value="">Todos los estados</option>{newsStatuses.map(status => <option key={status} value={status}>{newsStatusLabels[status]}</option>)}</select></div>
        <div className="flex items-end"><button type="button" className={textButton} onClick={() => change({ type: '', priority: '', status: '' })} disabled={!activeFilters}>Limpiar filtros</button></div>
      </form>

      {feed.locked ? <div className="mt-6"><GrandLineLocked /></div> : <>
        <p className="flex min-h-14 items-center text-xs text-muted" aria-live="polite">{feed.items.length > 0 ? `${feed.items.length} ${feed.items.length === 1 ? 'noticia cargada' : 'noticias cargadas'}` : feed.status === 'error' ? 'Carga interrumpida' : feed.hasMore ? 'Buscando noticias…' : ''}</p>
        {feed.items.length > 0 && <ol className="divide-y divide-line border-y border-line" aria-label="Noticias">{feed.items.map(item => <li key={item.id}>
          <article className="py-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"><span className={`rounded-sm px-1.5 py-0.5 font-semibold ${statusTone[item.status]}`}>{newsStatusLabels[item.status]}</span><span className="text-muted">{newsTypeLabels[item.type]}</span><span className={`font-semibold ${priorityTone[item.priority]}`}>Prioridad {newsPriorityLabels[item.priority].toLowerCase()}</span></div>
            <h2 className="mt-2 font-serif text-xl break-words md:text-2xl"><Link className="underline-offset-4 hover:underline" to={`/news/${encodeURIComponent(item.id)}${detailSearch}`} onClick={() => { listScroll.current = window.scrollY }}>{item.title}</Link></h2>
            <p className="mt-2 max-w-prose text-sm break-words text-muted">{item.summary}</p>
            <p className="mt-2 text-xs text-muted">{item.source} · {item.island} · <time dateTime={item.publishedAt}>{dateTime(item.publishedAt)}</time></p>
          </article>
        </li>)}</ol>}

        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        <div className="flex min-h-24 flex-col items-center justify-center gap-3 py-6 text-center">
          {feed.status === 'loading' ? <div className="flex items-center gap-3 text-sm text-muted" role="status"><Spinner />Cargando noticias…</div>
            : feed.status === 'error' ? <div className="w-full max-w-md"><Status tone="error">{feed.error}</Status><button className={primaryButton} onClick={loadMore}>Reintentar</button></div>
            : !feed.hasMore && feed.items.length === 0 ? <div className="flex min-h-60 flex-col items-center justify-center"><Compass className="mb-4 size-16 text-muted" /><h2 className="font-serif text-2xl">No hay noticias.</h2><p className="mt-3 max-w-sm text-sm text-muted">{activeFilters ? 'Prueba con otros filtros.' : 'Todavía no llegan noticias a tu tripulación.'}</p></div>
            : !feed.hasMore ? <p className="text-xs text-muted">No hay más noticias. Llegaste al final del feed.</p>
            : null}
        </div>
      </>}
    </div>
    <Outlet context={context} />
  </ConsoleLayout>
}

type DetailState = { id: string; status: 'loading' } | { id: string; status: 'error'; message: string; missing: boolean; locked: boolean } | { id: string; status: 'ready'; data: NewsDetailData }
interface VerifyState { pending: VerifiedStatus | null; failed: VerifiedStatus | null; error: string; success: string }
const idleVerify: VerifyState = { pending: null, failed: null, error: '', success: '' }

export function NewsDetail() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { state: auth, gateway, logout } = useAuth()
  const { updateNews } = useOutletContext<NewsOutletContext>()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<DetailState>({ id, status: 'loading' })
  const [verify, setVerify] = useState<VerifyState>(idleVerify)
  const verifying = useRef(false)
  const token = auth.status === 'authenticated' ? auth.session.token : ''
  const visible = state.id === id ? state : { id, status: 'loading' as const }

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setState({ id, status: 'loading' })
    setVerify(idleVerify)
    gateway.newsDetail(token, id, controller.signal).then(data => { if (!controller.signal.aborted) setState({ id, status: 'ready', data }) }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setState({ id, status: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar la noticia.', missing: error instanceof ServiceError && error.kind === 'not-found', locked: error instanceof ServiceError && error.kind === 'locked' })
    })
    return () => controller.abort()
  }, [token, id, gateway, logout, attempt])

  async function verifyAs(status: VerifiedStatus) {
    // La acción queda deshabilitada mientras la request está en vuelo.
    if (verifying.current || !token) return
    verifying.current = true
    setVerify({ ...idleVerify, pending: status })
    try {
      const updated = await gateway.verifyNews(token, id, status)
      setState({ id, status: 'ready', data: updated })
      updateNews(updated)
      setVerify({ ...idleVerify, success: `Listo: la noticia quedó marcada como ${newsStatusLabels[updated.status].toLowerCase()}.` })
    } catch (error: unknown) {
      if (error instanceof ServiceError && error.kind === 'unauthorized') { logout(); return }
      // 409: alguien ya la verificó con el otro estado. Se muestra el estado actual que manda el servidor.
      if (error instanceof ServiceError && error.code === 'NEWS_ALREADY_VERIFIED' && error.current) {
        try {
          const current = readNewsDetail(error.current)
          setState({ id, status: 'ready', data: current })
          updateNews(current)
          setVerify({ ...idleVerify, error: `Esta noticia ya había sido verificada como ${newsStatusLabels[current.status].toLowerCase()}. Te mostramos su estado actual.` })
          return
        } catch { /* Si `current` no es válido, se trata como un error normal. */ }
      }
      // Si falla, se conserva el estado anterior y se puede reintentar la misma acción.
      setVerify({ ...idleVerify, failed: status, error: error instanceof Error ? error.message : 'No pudimos verificar la noticia.' })
    } finally {
      verifying.current = false
    }
  }

  const item = visible.status === 'ready' ? visible.data : null
  const backTo = `/news${params.toString() ? `?${params}` : ''}`
  return <section>
    <Link className={textButton} to={backTo}>← Volver a las noticias</Link>
    <div className="mt-6 min-h-120">
      {visible.status === 'loading' ? <Loading>Cargando noticia…</Loading>
        : visible.status === 'error' ? visible.locked ? <GrandLineLocked /> : <><h1 className="mb-5 font-serif text-3xl">{visible.missing ? 'Esta noticia no está disponible.' : 'No pudimos abrir la noticia.'}</h1><Status tone="error">{visible.message}</Status>{!visible.missing && <button className={primaryButton} onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}</>
        : item && <article>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className={`rounded-sm px-1.5 py-0.5 font-semibold ${statusTone[item.status]}`}>{newsStatusLabels[item.status]}</span><span className="text-muted">{newsTypeLabels[item.type]}</span><span className={`font-semibold ${priorityTone[item.priority]}`}>Prioridad {newsPriorityLabels[item.priority].toLowerCase()}</span></div>
          <h1 className="mt-4 font-serif text-3xl leading-tight break-words md:text-5xl">{item.title}</h1>
          <p className="mt-4 text-lg break-words text-muted">{item.summary}</p>
          <p className="mt-4 text-xs text-muted">{item.source} · {item.island} · Publicada <time dateTime={item.publishedAt}>{dateTime(item.publishedAt)}</time>{item.verifiedAt && <> · Verificada <time dateTime={item.verifiedAt}>{dateTime(item.verifiedAt)}</time></>}</p>
          <div className="mt-8 max-w-prose space-y-4 text-sm leading-7">{item.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          {item.relatedWanted && <p className="mt-6 text-sm">Cartel relacionado: <Link className="font-semibold underline underline-offset-4" to={`/wanted/${encodeURIComponent(item.relatedWanted.id)}`}>{item.relatedWanted.name}</Link></p>}

          <section className="mt-10 rounded-md border border-[#d4ddc9] bg-moss p-5 md:p-6" aria-labelledby="verify-title">
            <h2 id="verify-title" className="text-[15px] font-semibold">Verificación</h2>
            {item.status === 'RUMOR' ? <>
              <p className="mt-2 text-xs text-[#52634e]">Este rumor aún no se ha verificado. ¿Qué dicen tus fuentes?</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {(['CONFIRMED', 'DEBUNKED'] as const).map(status => <button key={status} className={primaryButton} disabled={verify.pending !== null} aria-busy={verify.pending === status} onClick={() => verifyAs(status)}>{verify.pending === status ? <><Spinner />Enviando…</> : status === 'CONFIRMED' ? 'Confirmar noticia' : 'Desmentir noticia'}</button>)}
              </div>
            </> : <p className="mt-2 text-xs text-[#52634e]">Esta noticia ya está {newsStatusLabels[item.status].toLowerCase()}.</p>}
            {verify.success && <div className="mt-4"><Status>{verify.success}</Status></div>}
            {verify.error && <div className="mt-4"><Status tone="error">{verify.error}</Status>{verify.failed && <button className={primaryButton} disabled={verify.pending !== null} onClick={() => verify.failed && verifyAs(verify.failed)}>Reintentar: {verify.failed === 'CONFIRMED' ? 'confirmar' : 'desmentir'}</button>}</div>}
          </section>
        </article>}
    </div>
  </section>
}
