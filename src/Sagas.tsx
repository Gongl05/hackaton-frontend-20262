import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from './auth'
import { ConsoleLayout } from './ConsoleLayout'
import { Compass, GrandLineLocked, Loading, primaryButton, Status, textButton } from './components'
import { ServiceError } from './services'
import type { Palette, SagaStage, SagaStory, SagaSummary } from './saga-models'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Nombre para la View Transition: el título de la tarjeta "se convierte" en el título de la historia.
const transitionName = (id: string) => `saga-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
const formatMetric = (value: number, unit: string) => `${value.toLocaleString('es-PE')}${unit.startsWith('%') || unit.startsWith('/') ? '' : ' '}${unit}`
const paletteVars = (palette: Palette) => ({
  '--saga-bg': palette.background, '--saga-surface': palette.surface, '--saga-primary': palette.primary,
  '--saga-accent': palette.accent, '--saga-text': palette.text,
}) as CSSProperties

// View Transition API cuando existe soporte; si no (o con reduced motion), navegación normal.
function useTransitionNavigate() {
  const navigate = useNavigate()
  return useCallback((event: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (typeof document.startViewTransition !== 'function' || reducedMotion()) return
    event.preventDefault()
    // flushSync hace que React pinte la nueva ruta dentro de la transición.
    document.startViewTransition(() => { flushSync(() => navigate(to)) })
  }, [navigate])
}

type ListState = { status: 'loading' } | { status: 'error'; message: string; locked: boolean } | { status: 'ready'; sagas: SagaSummary[] }

export function SagasPage() {
  const { state: auth, gateway, logout } = useAuth()
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const transitionTo = useTransitionNavigate()
  const token = auth.status === 'authenticated' ? auth.session.token : ''

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setState({ status: 'loading' })
    gateway.sagas(token, controller.signal).then(sagas => { if (!controller.signal.aborted) setState({ status: 'ready', sagas }) }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setState({ status: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar las sagas.', locked: error instanceof ServiceError && error.kind === 'locked' })
    })
    return () => controller.abort()
  }, [token, gateway, logout, attempt])

  return <ConsoleLayout>
    <div className="mb-7"><h1 className="font-serif text-[31px] leading-tight tracking-tight md:text-4xl">Los Poneglyphs</h1><p className="mt-3 text-sm text-muted">Cada saga guarda una parte de la verdadera historia del mundo.</p></div>
    {state.status === 'loading' ? <Loading>Cargando sagas…</Loading>
      : state.status === 'error' ? state.locked ? <GrandLineLocked /> : <div className="grid min-h-60 content-center"><Status tone="error">{state.message}</Status><button className={`${primaryButton} justify-self-center`} onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>
      : state.sagas.length === 0 ? <div className="flex min-h-60 flex-col items-center justify-center text-center"><Compass className="mb-4 size-16 text-muted" /><h2 className="font-serif text-2xl">Todavía no hay sagas.</h2></div>
      : <ul className="grid gap-5 md:grid-cols-2">{state.sagas.map(saga => <li key={saga.id}>
        <Link to={`/sagas/${encodeURIComponent(saga.id)}`} onClick={event => transitionTo(event, `/sagas/${encodeURIComponent(saga.id)}`)} className="group block h-full overflow-hidden rounded-lg border border-line no-underline transition-shadow hover:shadow-lg motion-reduce:transition-none" style={paletteVars(saga.palette)}>
          <div className="bg-[var(--saga-bg)] px-6 pt-6 pb-5 text-[var(--saga-text)]">
            <p className="text-[11px] font-semibold tracking-wider text-[var(--saga-accent)] uppercase">Saga {saga.order} · {saga.stageCount} etapas</p>
            <h2 className="mt-2 font-serif text-2xl leading-tight" style={{ viewTransitionName: transitionName(saga.id) }}>{saga.title}</h2>
            <p className="mt-2 text-sm opacity-80">{saga.subtitle}</p>
            <div className="mt-5 flex gap-1.5" aria-hidden="true">{(['primary', 'accent', 'surface'] as const).map(key => <span key={key} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: saga.palette[key] }} />)}</div>
          </div>
          <div className="bg-white px-6 py-5">
            <p className="text-sm text-muted">{saga.synopsis}</p>
            <p className="mt-4 text-xs text-muted">{saga.firstIsland} → {saga.lastIsland} · {saga.totalDistanceNm.toLocaleString('es-PE')} millas</p>
            <span className="mt-4 inline-block text-xs font-semibold text-sea underline-offset-4 group-hover:underline">Leer la saga →</span>
          </div>
        </Link>
      </li>)}</ul>}
  </ConsoleLayout>
}

type StoryState = { id: string; status: 'loading' } | { id: string; status: 'error'; message: string; missing: boolean; locked: boolean } | { id: string; status: 'ready'; story: SagaStory }

export function SagaStoryPage() {
  const { id = '' } = useParams()
  const { state: auth, gateway, logout } = useAuth()
  const [state, setState] = useState<StoryState>({ id, status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const token = auth.status === 'authenticated' ? auth.session.token : ''
  const visible = state.id === id ? state : { id, status: 'loading' as const }

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setState({ id, status: 'loading' })
    gateway.sagaStory(token, id, controller.signal).then(story => { if (!controller.signal.aborted) setState({ id, status: 'ready', story }) }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ServiceError && error.kind === 'unauthorized') logout()
      else setState({ id, status: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar la saga.', missing: error instanceof ServiceError && error.kind === 'not-found', locked: error instanceof ServiceError && error.kind === 'locked' })
    })
    return () => controller.abort()
  }, [token, id, gateway, logout, attempt])

  if (visible.status === 'ready') return <Story key={visible.story.saga.id} story={visible.story} />
  return <ConsoleLayout>
    <Link className={textButton} to="/sagas">← Volver a las sagas</Link>
    <div className="mt-6">
      {visible.status === 'loading' ? <Loading>Descifrando el Poneglyph…</Loading>
        : visible.locked ? <GrandLineLocked />
        : <><h1 className="mb-5 font-serif text-3xl">{visible.missing ? 'Esta saga no existe.' : 'No pudimos abrir la saga.'}</h1><Status tone="error">{visible.message}</Status>{!visible.missing && <button className={primaryButton} onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}</>}
    </div>
  </ConsoleLayout>
}

function Story({ story }: { story: SagaStory }) {
  const { saga, map, stages } = story
  const [params, setParams] = useSearchParams()
  const transitionTo = useTransitionNavigate()
  // La URL indica la etapa activa (?etapa=slug). Un slug inválido lleva a la primera etapa.
  const [initialIndex] = useState(() => Math.max(0, stages.findIndex(stage => stage.slug === params.get('etapa'))))
  const [active, setActive] = useState(initialIndex)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const stage = stages[active]

  // Abrir la URL de una etapa lleva directo a ella.
  useLayoutEffect(() => {
    if (initialIndex > 0) sectionRefs.current[initialIndex]?.scrollIntoView({ block: 'center' })
    else window.scrollTo(0, 0)
  }, [initialIndex])

  // La etapa activa es la que cruza la franja central de la pantalla.
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = Number((entry.target as HTMLElement).dataset.index)
        if (Number.isInteger(index)) setActive(index)
      }
    }, { rootMargin: '-55% 0px -35% 0px' })
    for (const node of sectionRefs.current) if (node) observer.observe(node)
    return () => observer.disconnect()
  }, [stages])

  // Se refleja la etapa activa en la URL sin crear una entrada nueva en el historial.
  useEffect(() => {
    if (params.get('etapa') !== stage.slug) setParams(previous => { const next = new URLSearchParams(previous); next.set('etapa', stage.slug); return next }, { replace: true, preventScrollReset: true })
  }, [stage.slug, params, setParams])

  // Sin soporte de animaciones ligadas al scroll (o con reduced motion), la barra de progreso se actualiza con JS.
  useEffect(() => {
    const supported = CSS.supports('animation-timeline: scroll()') && !reducedMotion()
    if (supported) return
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      rootRef.current?.style.setProperty('--saga-scroll', String(max > 0 ? Math.min(1, window.scrollY / max) : 0))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])

  const goTo = useCallback((index: number) => {
    const target = Math.min(stages.length - 1, Math.max(0, index))
    const node = sectionRefs.current[target]
    if (!node) return
    setActive(target)
    node.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
    node.focus({ preventScroll: true })
  }, [stages.length])

  // Navegación por teclado: flechas, Inicio y Fin mueven entre etapas.
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const keys: Record<string, number> = { ArrowDown: active + 1, ArrowRight: active + 1, ArrowUp: active - 1, ArrowLeft: active - 1, Home: 0, End: stages.length - 1 }
    if (!(event.key in keys)) return
    event.preventDefault()
    goTo(keys[event.key])
  }

  const points = stages.map(item => `${item.island.x},${item.island.y}`)
  const labelSize = Math.max(map.width, map.height) / 48
  const progress = (active + 1) / stages.length

  return <div ref={rootRef} className="min-h-svh bg-[var(--saga-bg)] text-[var(--saga-text)] transition-colors duration-700 motion-reduce:transition-none" style={paletteVars(stage.palette)}>
    <div className="saga-scroll-progress fixed inset-x-0 top-0 z-30 h-1 bg-[var(--saga-accent)]" aria-hidden="true" />

    <header className="mx-auto max-w-6xl px-5 pt-8 pb-10 md:px-10 md:pt-12">
      <Link className="text-xs underline underline-offset-4 opacity-80" to="/sagas" onClick={event => transitionTo(event, '/sagas')}>← Volver a las sagas</Link>
      <p className="mt-8 text-[11px] font-semibold tracking-wider text-[var(--saga-accent)] uppercase">Saga {saga.order} · {saga.stageCount} etapas · {saga.totalDistanceNm.toLocaleString('es-PE')} millas</p>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight md:text-6xl" style={{ viewTransitionName: transitionName(saga.id) }}>{saga.title}</h1>
      <p className="mt-4 max-w-2xl text-lg opacity-85">{saga.subtitle}</p>
      <p className="mt-6 max-w-2xl text-sm leading-7 opacity-80">{saga.intro}</p>
    </header>

    {/* En mobile es un bloque normal (el panel queda fijo arriba); en desktop, dos columnas. */}
    <div className="mx-auto max-w-6xl px-5 pb-24 md:px-10 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-10">
      {/* Panel persistente: mapa, progreso y métricas de la etapa activa. */}
      <aside className="sticky top-0 z-20 -mx-5 bg-[var(--saga-bg)] px-5 pt-3 pb-3 transition-colors duration-700 motion-reduce:transition-none md:-mx-10 md:px-10 lg:mx-0 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:self-start lg:px-0 lg:py-8" aria-label="Mapa y progreso del recorrido">
        <svg viewBox={`0 0 ${map.width} ${map.height}`} className="mx-auto max-h-[24svh] w-full rounded-lg lg:max-h-none" style={{ backgroundColor: 'var(--saga-surface)' }} role="img" aria-label={`Mapa del Grand Line. El barco está en ${stage.island.name}, etapa ${active + 1} de ${stages.length}.`}>
          <polyline points={points.join(' ')} fill="none" strokeWidth={3} strokeDasharray="4 10" strokeLinecap="round" style={{ stroke: 'var(--saga-text)', opacity: 0.35 }} />
          <polyline points={points.slice(0, active + 1).join(' ')} fill="none" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--saga-primary)' }} />
          {stages.map((item, index) => <g key={item.id}>
            <circle cx={item.island.x} cy={item.island.y} r={index === active ? 14 : 9} strokeWidth={3} style={{ fill: index <= active ? 'var(--saga-accent)' : 'var(--saga-surface)', stroke: 'var(--saga-text)' }} />
            <text x={item.island.x} y={item.island.y + (item.island.y > map.height - 50 ? -24 : 34)} textAnchor="middle" fontSize={labelSize} fontWeight={index === active ? 700 : 400} style={{ fill: 'var(--saga-text)', opacity: index === active ? 1 : 0.7 }}>{item.island.name}</text>
          </g>)}
          {/* El barco se ubica en la isla de la etapa activa. */}
          <g className="transition-transform duration-700 ease-in-out motion-reduce:transition-none" style={{ transform: `translate(${stage.island.x}px, ${stage.island.y}px)` }}>
            <path d="M-22 -4 L22 -4 L14 10 L-14 10 Z" style={{ fill: 'var(--saga-primary)', stroke: 'var(--saga-text)' }} strokeWidth={2} />
            <path d="M0 -4 L0 -40 L20 -12 Z" style={{ fill: 'var(--saga-text)' }} />
          </g>
        </svg>

        <div className="mt-3 lg:mt-6">
          <div className="flex items-baseline justify-between gap-3 text-xs"><p aria-live="polite"><span className="font-semibold">Etapa {active + 1} de {stages.length}</span> · {stage.island.name}</p><p className="opacity-75">{Math.round(progress * 100)}%</p></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--saga-surface)]" role="progressbar" aria-label="Progreso del recorrido" aria-valuemin={1} aria-valuemax={stages.length} aria-valuenow={active + 1}><div className="h-full origin-left rounded-full bg-[var(--saga-primary)] transition-transform duration-500 motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} /></div>
        </div>

        {/* Las métricas visibles siempre corresponden a la etapa activa. */}
        <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:mt-6 lg:grid-cols-2 lg:gap-3">{stage.metrics.map(metric => <div key={metric.key} className="min-w-0 rounded-md bg-[var(--saga-surface)] px-2 py-1.5 sm:p-2 lg:p-4">
          <dt className="truncate text-[10px] opacity-75 lg:text-xs">{metric.label}</dt>
          <dd className="truncate font-serif text-sm tabular-nums sm:mt-1 lg:text-2xl">{formatMetric(metric.value, metric.unit)}</dd>
        </div>)}</dl>

        <nav className="mt-3 hidden items-center justify-between gap-3 lg:mt-6 lg:flex" aria-label="Etapas de la saga">
          <button className="rounded-md border border-current px-3 py-2 text-xs disabled:opacity-40" onClick={() => goTo(active - 1)} disabled={active === 0}>← Anterior</button>
          <ol className="flex gap-1.5">{stages.map((item, index) => <li key={item.id}><button className="size-3 rounded-full border border-current" style={{ backgroundColor: index === active ? 'var(--saga-primary)' : 'transparent' }} aria-label={`Ir a la etapa ${index + 1}: ${item.title}`} aria-current={index === active ? 'step' : undefined} onClick={() => goTo(index)} /></li>)}</ol>
          <button className="rounded-md border border-current px-3 py-2 text-xs disabled:opacity-40" onClick={() => goTo(active + 1)} disabled={active === stages.length - 1}>Siguiente →</button>
        </nav>
      </aside>

      {/* Narrativa por etapas: cada sección activa su etapa al llegar al centro de la pantalla. */}
      <ol className="lg:col-start-2 lg:row-start-1" onKeyDown={onKeyDown}>
        {stages.map((item, index) => <StageSection key={item.id} stage={item} index={index} total={stages.length} active={index === active} sectionRef={node => { sectionRefs.current[index] = node }} onFocus={() => setActive(index)} />)}
      </ol>
    </div>
    <p className="pb-12 text-center text-xs opacity-75">Usa las flechas del teclado para moverte entre etapas.</p>
  </div>
}

function StageSection({ stage, index, total, active, sectionRef, onFocus }: { stage: SagaStage; index: number; total: number; active: boolean; sectionRef: (node: HTMLElement | null) => void; onFocus: () => void }) {
  return <li className="flex min-h-[75svh] items-center py-10 lg:min-h-svh">
    <section ref={sectionRef} data-index={index} id={`etapa-${stage.slug}`} tabIndex={0} onFocus={onFocus} aria-labelledby={`etapa-${stage.slug}-title`}
      className={`saga-stage-card w-full rounded-lg border p-6 outline-offset-4 transition-[border-color,opacity] duration-500 motion-reduce:transition-none md:p-8 ${active ? 'border-[var(--saga-primary)] opacity-100' : 'border-transparent opacity-75'}`}
      style={{ ...paletteVars(stage.palette), backgroundColor: 'var(--saga-surface)', color: 'var(--saga-text)' }}>
      <p className="text-[11px] font-semibold tracking-wider text-[var(--saga-accent)] uppercase">Etapa {index + 1} de {total} · {stage.island.name}</p>
      <h2 id={`etapa-${stage.slug}-title`} className="mt-3 font-serif text-2xl leading-tight md:text-3xl">{stage.title}</h2>
      <div className="mt-5 space-y-4 text-sm leading-7 opacity-90">{stage.narrative.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div>
    </section>
  </li>
}
