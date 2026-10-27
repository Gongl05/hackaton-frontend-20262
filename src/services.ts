import type { PirateCrew, WantedItem, WantedQuery, WantedPageData, WantedDetailData } from './wanted-models'
import { wantedSearch, wantedStatuses } from './wanted-models'
import type { NewsDetailData, NewsFeedPage, NewsItem, NewsQuery, VerifiedStatus } from './news-models'
import { newsPriorities, newsSearch, newsStatuses, newsTypes } from './news-models'
import type { Palette, SagaStage, SagaStory, SagaSummary } from './saga-models'
// Modelo del frontend, adaptado al contrato público /docs/json.
export interface Crew { teamName: string; teamCode: string; email: string }
export interface Session { token: string; crew: Crew }
export interface Credentials { email: string; password: string }
export interface Registration extends Credentials { teamName: string }
export type FieldErrors = Partial<Record<keyof Registration, string>>
export interface SummaryItem { label: string; value: number | string }
export interface DashboardData {
  items: SummaryItem[]
  logPose: 'pending' | 'unlocked'
  logPoseMessage?: string
  topBounties?: { id: string; name: string; epithet: string; bounty: number }[]
  mostWantedCrew?: string | null
  generatedAt?: string
}

export class ServiceError extends Error {
  // locked: endpoint del Grand Line sin Log Pose (423).
  readonly kind: 'offline' | 'unauthorized' | 'validation' | 'network' | 'not-found' | 'locked'
  readonly fields: FieldErrors
  // Código estable de la API (p. ej. NEWS_ALREADY_VERIFIED) y la noticia actual que trae el 409.
  readonly code: string
  readonly current: unknown
  constructor(message: string, kind: ServiceError['kind'], fields: FieldErrors = {}, code = '', current: unknown = null) {
    super(message)
    this.name = 'ServiceError'
    this.kind = kind
    this.fields = fields
    this.code = code
    this.current = current
  }
}

export interface Gateway {
  login(credentials: Credentials): Promise<Session>
  register(registration: Registration): Promise<Session>
  restore(token: string, signal: AbortSignal): Promise<Crew>
  dashboard(token: string, signal: AbortSignal): Promise<DashboardData>
  crews(token: string, signal: AbortSignal): Promise<PirateCrew[]>
  wanted(token: string, query: WantedQuery, signal: AbortSignal): Promise<WantedPageData>
  wantedDetail(token: string, id: string, signal: AbortSignal): Promise<WantedDetailData>
  newsFeed(token: string, query: NewsQuery, cursor: string | null, signal: AbortSignal): Promise<NewsFeedPage>
  newsDetail(token: string, id: string, signal: AbortSignal): Promise<NewsDetailData>
  verifyNews(token: string, id: string, status: VerifiedStatus): Promise<NewsDetailData>
  sagas(token: string, signal: AbortSignal): Promise<SagaSummary[]>
  sagaStory(token: string, id: string, signal: AbortSignal): Promise<SagaStory>
}

type JsonObject = Record<string, unknown>
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ServiceError('El servidor devolvió una respuesta inesperada. Reintenta la operación.', 'network')
  return value as JsonObject
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new ServiceError('La respuesta del servidor está incompleta. Reintenta la operación.', 'network')
  return value
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new ServiceError('Los indicadores recibidos no tienen el formato esperado.', 'network')
  return value
}
function readCrew(payload: JsonObject): Crew {
  const team = object(payload.team)
  const user = object(payload.user)
  return { teamName: text(team.name), teamCode: text(team.code), email: text(user.email) }
}
function readWanted(value: unknown): WantedItem {
  const item = object(value)
  const crew = object(item.crew)
  const status = wantedStatuses.find(status => status === item.status)
  if (!status) throw new ServiceError('El cartel contiene un estado desconocido. Reintenta la consulta.', 'network')
  const fruit = item.devilFruit === null ? null : object(item.devilFruit)
  return {
    id: text(item.id), name: text(item.name), epithet: text(item.epithet), bounty: count(item.bounty), status,
    crew: { id: text(crew.id), name: text(crew.name) }, role: text(item.role),
    devilFruit: fruit ? { name: text(fruit.name), type: text(fruit.type) } : null,
    threatLevel: count(item.threatLevel), lastSeenIsland: text(item.lastSeenIsland), updatedAt: text(item.updatedAt),
  }
}
function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ServiceError('Los datos recibidos no tienen el formato esperado.', 'network')
  return value
}
function color(value: unknown): string {
  const hex = text(value)
  if (!/^#[0-9a-f]{3,8}$/i.test(hex)) throw new ServiceError('La paleta recibida no tiene el formato esperado.', 'network')
  return hex
}
function texts(value: unknown): string[] {
  if (!Array.isArray(value)) throw new ServiceError('La respuesta del servidor está incompleta. Reintenta la operación.', 'network')
  return value.map(text)
}
function oneOf<T extends string>(options: readonly T[], value: unknown): T {
  const match = options.find(option => option === value)
  if (!match) throw new ServiceError('La respuesta contiene un valor desconocido. Reintenta la operación.', 'network')
  return match
}
function readNews(value: unknown): NewsItem {
  const item = object(value)
  const related = item.relatedWanted === null ? null : object(item.relatedWanted)
  return {
    id: text(item.id), type: oneOf(newsTypes, item.type), priority: oneOf(newsPriorities, item.priority), status: oneOf(newsStatuses, item.status),
    title: text(item.title), summary: text(item.summary), source: text(item.source), island: text(item.island),
    relatedWanted: related ? { id: text(related.id), name: text(related.name) } : null,
    publishedAt: text(item.publishedAt), updatedAt: text(item.updatedAt), verifiedAt: item.verifiedAt === null ? null : text(item.verifiedAt),
  }
}
export function readNewsDetail(value: unknown): NewsDetailData {
  return { ...readNews(value), body: texts(object(value).body) }
}
function readPalette(value: unknown): Palette {
  const palette = object(value)
  return { background: color(palette.background), surface: color(palette.surface), primary: color(palette.primary), accent: color(palette.accent), text: color(palette.text) }
}
function readSaga(value: unknown): SagaSummary {
  const saga = object(value)
  return {
    id: text(saga.id), order: count(saga.order), title: text(saga.title), subtitle: text(saga.subtitle), synopsis: text(saga.synopsis),
    stageCount: count(saga.stageCount), totalDistanceNm: count(saga.totalDistanceNm), firstIsland: text(saga.firstIsland), lastIsland: text(saga.lastIsland),
    palette: readPalette(saga.palette),
  }
}
function readStage(value: unknown): SagaStage {
  const stage = object(value)
  const island = object(stage.island)
  if (!Array.isArray(stage.metrics)) throw new ServiceError('Las métricas de la etapa están incompletas.', 'network')
  return {
    id: text(stage.id), order: count(stage.order), slug: text(stage.slug), title: text(stage.title), narrative: texts(stage.narrative),
    island: { id: text(island.id), name: text(island.name), x: finite(island.x), y: finite(island.y) },
    palette: readPalette(stage.palette),
    metrics: stage.metrics.map(entry => { const metric = object(entry); return { key: text(metric.key), label: text(metric.label), value: finite(metric.value), unit: text(metric.unit) } }),
  }
}
function apiError(payload: unknown, status: number, retryAfter: string | null): ServiceError {
  const data = payload && typeof payload === 'object' ? payload as JsonObject : {}
  const code = typeof data.code === 'string' ? data.code : ''
  let message = typeof data.message === 'string' ? data.message : 'No pudimos completar la solicitud. Inténtalo otra vez.'
  const fields: FieldErrors = {}
  if (Array.isArray(data.details)) {
    for (const detail of data.details) {
      if (!detail || typeof detail !== 'object') continue
      const entry = detail as JsonObject
      if ((entry.field === 'teamName' || entry.field === 'email' || entry.field === 'password') && typeof entry.message === 'string') fields[entry.field] = entry.message
    }
  }
  if (code === 'EMAIL_ALREADY_REGISTERED') fields.email = message
  if (code === 'TEAM_NAME_TAKEN') fields.teamName = message
  if (code === 'REGISTRATION_CLOSED') message = 'El registro de tripulaciones está cerrado. Consulta con un profesor o asistente.'
  if (status === 429) {
    const seconds = Number(retryAfter ?? data.retryAfterSeconds)
    message = Number.isFinite(seconds) && seconds > 0 ? `Demasiadas solicitudes. Espera ${Math.ceil(seconds)} segundos antes de reintentar.` : 'Demasiadas solicitudes. Espera un momento antes de reintentar.'
  }
  if (status === 423) message = 'El Grand Line sigue bloqueado: la tripulación necesita el Log Pose de la inspección del CP3.'
  const kind = status === 404 ? 'not-found' : status === 423 ? 'locked' : status === 401 && code !== 'INVALID_CREDENTIALS' ? 'unauthorized' : status < 500 ? 'validation' : 'network'
  return new ServiceError(message, kind, fields, code, data.current ?? null)
}

export function createHttpGateway(baseUrl: string, fetcher: typeof fetch = (...args) => fetch(...args)): Gateway {
  const base = baseUrl.trim().replace(/\/+$/, '')
  async function requestJson(path: string, options: { token?: string; method?: 'GET' | 'POST' | 'PATCH'; body?: Credentials | Registration | { status: VerifiedStatus }; signal?: AbortSignal } = {}): Promise<unknown> {
    if (!base) throw new ServiceError('Falta configurar VITE_API_BASE_URL. Revisa el archivo .env y reinicia la aplicación.', 'offline')
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (options.signal?.aborted) controller.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 30_000)
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (options.token) headers.Authorization = `Bearer ${options.token}`
      if (options.body) headers['Content-Type'] = 'application/json'
      const response = await fetcher(`${base}${path}`, {
        method: options.method ?? (options.body ? 'POST' : 'GET'), headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw apiError(payload, response.status, response.headers.get('Retry-After'))
      return payload
    } catch (error: unknown) {
      if (options.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
      if (error instanceof ServiceError) throw error
      throw new ServiceError(controller.signal.aborted ? 'El servidor tardó demasiado en responder. Vuelve a intentarlo; puede estar iniciando.' : 'No pudimos conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.', 'network')
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', abort)
    }
  }
  async function request(path: string, options: Parameters<typeof requestJson>[1] = {}): Promise<JsonObject> {
    return object(await requestJson(path, options))
  }
  async function authenticate(path: string, body: Credentials | Registration): Promise<Session> {
    const payload = await request(path, { body })
    const token = text(payload.token)
    if (!token.trim()) throw new ServiceError('El servidor no devolvió una sesión válida. Reintenta el acceso.', 'network')
    return { token, crew: readCrew(payload) }
  }
  return {
    login: data => authenticate('/auth/login', data),
    register: data => authenticate('/auth/register', data),
    restore: async (token, signal) => readCrew(await request('/auth/me', { token, signal })),
    crews: async (token, signal) => {
      const payload = await requestJson('/crews', { token, signal })
      if (!Array.isArray(payload)) throw new ServiceError('No pudimos leer las tripulaciones. Reintenta la carga.', 'network')
      return payload.map(value => { const crew = object(value); return { id: text(crew.id), name: text(crew.name) } })
    },
    wanted: async (token, query, signal) => {
      const payload = await request(`/wanted?${wantedSearch(query)}`, { token, signal })
      if (!Array.isArray(payload.content)) throw new ServiceError('No pudimos leer los carteles. Reintenta la carga.', 'network')
      const page = count(payload.page)
      const size = count(payload.size)
      if (page !== query.page || size !== query.size) throw new ServiceError('El servidor devolvió una página distinta a la solicitada. Reintenta la carga.', 'network')
      return { content: payload.content.map(readWanted), totalElements: count(payload.totalElements), totalPages: count(payload.totalPages), page, size }
    },
    wantedDetail: async (token, id, signal) => {
      const payload = await request(`/wanted/${encodeURIComponent(id)}`, { token, signal })
      const lastSeen = object(payload.lastSeen)
      if (!Array.isArray(payload.bountyHistory)) throw new ServiceError('El historial del cartel está incompleto. Reintenta la carga.', 'network')
      return {
        ...readWanted(payload), age: count(payload.age), heightCm: count(payload.heightCm), bio: text(payload.bio),
        lastSeen: { island: text(lastSeen.island), seenAt: text(lastSeen.seenAt) },
        bountyHistory: payload.bountyHistory.map(value => { const entry = object(value); return { amount: count(entry.amount), issuedAt: text(entry.issuedAt) } }),
      }
    },
    newsFeed: async (token, query, cursor, signal) => {
      const params = new URLSearchParams(newsSearch(query))
      params.set('limit', '20')
      // El cursor queda ligado a los filtros: siempre se envía con los mismos filtros con los que se obtuvo.
      if (cursor) params.set('cursor', cursor)
      const payload = await request(`/news/feed?${params}`, { token, signal })
      if (!Array.isArray(payload.items) || typeof payload.hasMore !== 'boolean') throw new ServiceError('No pudimos leer las noticias. Reintenta la carga.', 'network')
      return { items: payload.items.map(readNews), nextCursor: payload.nextCursor === null ? null : text(payload.nextCursor), hasMore: payload.hasMore }
    },
    newsDetail: async (token, id, signal) => readNewsDetail(await request(`/news/${encodeURIComponent(id)}`, { token, signal })),
    verifyNews: async (token, id, status) => readNewsDetail(await request(`/news/${encodeURIComponent(id)}/status`, { token, method: 'PATCH', body: { status } })),
    sagas: async (token, signal) => {
      const payload = await requestJson('/sagas', { token, signal })
      if (!Array.isArray(payload)) throw new ServiceError('No pudimos leer las sagas. Reintenta la carga.', 'network')
      return payload.map(readSaga)
    },
    sagaStory: async (token, id, signal) => {
      const payload = await request(`/sagas/${encodeURIComponent(id)}/story`, { token, signal })
      const saga = object(payload.saga)
      const map = object(payload.map)
      if (!Array.isArray(payload.stages) || payload.stages.length === 0) throw new ServiceError('La historia de la saga no tiene etapas.', 'network')
      return {
        saga: { ...readSaga(saga), intro: text(saga.intro) },
        map: { width: count(map.width), height: count(map.height) },
        stages: payload.stages.map(readStage).sort((a, b) => a.order - b.order),
      }
    },
    dashboard: async (token, signal) => {
      const [summary, pose] = await Promise.all([
        request('/dashboard/summary', { token, signal }),
        request('/log-pose', { token, signal }),
      ])
      const wanted = object(summary.wanted)
      const crews = object(summary.crews)
      const byStatus = object(wanted.byStatus)
      const total = count(wanted.total)
      if (pose.status !== 'LOCKED' && pose.status !== 'UNLOCKED') throw new ServiceError('El estado del Log Pose no tiene el formato esperado.', 'network')
      if (typeof pose.grandLineUnlocked !== 'boolean' || pose.grandLineUnlocked !== (pose.status === 'UNLOCKED')) throw new ServiceError('El servidor devolvió un estado inconsistente del Log Pose. Reintenta la consulta.', 'network')
      if (!Array.isArray(summary.topBounties)) throw new ServiceError('El resumen recibido está incompleto.', 'network')
      const berries = (value: unknown) => `${count(value).toLocaleString('es-PE')} berries`
      return {
        items: total === 0 ? [] : [
          { label: 'Carteles de Se Busca', value: total },
          { label: 'Recompensa total', value: berries(wanted.totalBounty) },
          { label: 'Recompensa promedio', value: berries(wanted.averageBounty) },
          { label: 'Tripulaciones piratas', value: count(crews.total) },
          { label: 'En libertad', value: count(byStatus.AT_LARGE) },
          { label: 'Capturados', value: count(byStatus.CAPTURED) },
          { label: 'Desaparecidos', value: count(byStatus.MISSING) },
        ],
        logPose: pose.grandLineUnlocked ? 'unlocked' : 'pending',
        logPoseMessage: text(pose.message),
        generatedAt: text(summary.generatedAt),
        mostWantedCrew: crews.mostWanted === null ? null : text(object(crews.mostWanted).name),
        topBounties: summary.topBounties.map(value => {
          const item = object(value)
          return { id: text(item.id), name: text(item.name), epithet: text(item.epithet), bounty: count(item.bounty) }
        }),
      }
    },
  }
}

export const apiConfigured = Boolean(import.meta.env.VITE_API_BASE_URL?.trim())
export const configuredGateway = createHttpGateway(import.meta.env.VITE_API_BASE_URL ?? '')
