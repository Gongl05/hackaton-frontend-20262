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
  readonly kind: 'offline' | 'unauthorized' | 'validation' | 'network'
  readonly fields: FieldErrors
  constructor(message: string, kind: ServiceError['kind'], fields: FieldErrors = {}) {
    super(message)
    this.name = 'ServiceError'
    this.kind = kind
    this.fields = fields
  }
}

export interface Gateway {
  login(credentials: Credentials): Promise<Session>
  register(registration: Registration): Promise<Session>
  restore(token: string, signal: AbortSignal): Promise<Crew>
  dashboard(token: string, signal: AbortSignal): Promise<DashboardData>
}

const unavailable = async (): Promise<never> => {
  throw new ServiceError('La conexión con el curso está desactivada. No se envió ningún dato.', 'offline')
}

// Disponible para tests aislados y una configuración sin URL.
export const disconnectedGateway: Gateway = {
  login: unavailable, register: unavailable, restore: unavailable, dashboard: unavailable,
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
  return new ServiceError(message, status === 401 && code !== 'INVALID_CREDENTIALS' ? 'unauthorized' : status < 500 ? 'validation' : 'network', fields)
}

export function createHttpGateway(baseUrl: string, fetcher: typeof fetch = (...args) => fetch(...args)): Gateway {
  const base = baseUrl.trim().replace(/\/+$/, '')
  async function request(path: string, options: { token?: string; body?: Credentials | Registration; signal?: AbortSignal } = {}): Promise<JsonObject> {
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
        method: options.body ? 'POST' : 'GET', headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw apiError(payload, response.status, response.headers.get('Retry-After'))
      return object(payload)
    } catch (error: unknown) {
      if (options.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
      if (error instanceof ServiceError) throw error
      throw new ServiceError(controller.signal.aborted ? 'El servidor tardó demasiado en responder. Vuelve a intentarlo; puede estar iniciando.' : 'No pudimos conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.', 'network')
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', abort)
    }
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
