import { describe, expect, it, vi } from 'vitest'
import { createHttpGateway, ServiceError } from './services'
import examples from './fixtures/cp1.json'

const me = { user: { id: 'test-user', name: 'Prueba', email: 'local@example.test' }, team: { code: 'TEST-ONLY', name: 'Prueba' }, expiresAt: '2099-01-01T00:00:00Z' }
const login = { ...me, token: 'local-test-token', tokenType: 'Bearer' }
function reply(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}
const signal = () => new AbortController().signal

describe('Adaptador HTTP según el contrato público', () => {
  it('registra los campos reales y transforma la sesión sin una segunda llamada de login', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply(login, 201))
    const api = createHttpGateway('https://example.test/api/v1/', fetcher)
    const data = { teamName: 'Prueba', email: 'local@example.test', password: 'prueba-local' }
    expect(await api.register(data)).toEqual({ token: login.token, crew: { teamName: 'Prueba', teamCode: 'TEST-ONLY', email: 'local@example.test' } })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('https://example.test/api/v1/auth/register', expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }))
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization')
  })
  it('inicia sesión por POST con email y contraseña', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply(login))
    await createHttpGateway('https://example.test/api/v1', fetcher).login({ email: 'local@example.test', password: 'prueba-local' })
    expect(fetcher.mock.calls[0][0]).toBe('https://example.test/api/v1/auth/login')
    expect(fetcher.mock.calls[0][1]?.body).toBe(JSON.stringify({ email: 'local@example.test', password: 'prueba-local' }))
  })
  it('restaura la sesión enviando el token Bearer', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply(me))
    expect(await createHttpGateway('https://example.test/api/v1', fetcher).restore('token-prueba', signal())).toEqual({ teamName: 'Prueba', teamCode: 'TEST-ONLY', email: 'local@example.test' })
    expect(fetcher.mock.calls[0][1]?.headers).toHaveProperty('Authorization', 'Bearer token-prueba')
  })
  it('consulta ambos endpoints del dashboard y conserva sus indicadores y Log Pose', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async url => reply(String(url).endsWith('/log-pose') ? examples.logPose : examples.summary))
    const result = await createHttpGateway('https://example.test/api/v1', fetcher).dashboard('token-prueba', signal())
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.items[0].value).toBe(examples.summary.wanted.total)
    expect(result.topBounties?.[0].name).toBe(examples.summary.topBounties[0].name)
    expect(result.logPose).toBe('pending')
    expect(result.logPoseMessage).toBe(examples.logPose.message)
  })
  it('reconoce wanted.total=0 como workspace vacío y conserva Log Pose desbloqueado', async () => {
    const empty = { ...examples.summary, wanted: { ...examples.summary.wanted, total: 0 }, topBounties: [], crews: { total: 0, mostWanted: null } }
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async url => reply(String(url).endsWith('/log-pose') ? { ...examples.logPose, status: 'UNLOCKED', grandLineUnlocked: true } : empty))
    const result = await createHttpGateway('https://example.test/api/v1', fetcher).dashboard('token-prueba', signal())
    expect(result.items).toEqual([])
    expect(result.logPose).toBe('unlocked')
    expect(result.mostWantedCrew).toBeNull()
  })
  it.each([['EMAIL_ALREADY_REGISTERED', 'email'], ['TEAM_NAME_TAKEN', 'teamName']])('sitúa %s en su campo', async (code, field) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply({ code, message: 'Ya está registrado.' }, 409))
    await expect(createHttpGateway('https://example.test', fetcher).register({ teamName: 'Prueba', email: 'local@example.test', password: 'prueba-local' })).rejects.toMatchObject({ fields: { [field]: 'Ya está registrado.' } })
  })
  it('mapea errores details de validación por campo', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply({ code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ field: 'password', message: 'Mínimo 8 caracteres.' }] }, 400))
    await expect(createHttpGateway('https://example.test', fetcher).register({ teamName: 'Prueba', email: 'local@example.test', password: 'x' })).rejects.toMatchObject({ fields: { password: 'Mínimo 8 caracteres.' } })
  })
  it('distingue credenciales incorrectas de una sesión vencida', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas.' }, 401)).mockResolvedValueOnce(reply({ code: 'TOKEN_EXPIRED', message: 'Sesión vencida.' }, 401))
    const api = createHttpGateway('https://example.test', fetcher)
    await expect(api.login({ email: 'local@example.test', password: 'x' })).rejects.toMatchObject({ kind: 'validation' })
    await expect(api.restore('test-token', signal())).rejects.toMatchObject({ kind: 'unauthorized' })
  })
  it('muestra Retry-After sin reintentar automáticamente', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply({ code: 'RATE_LIMITED' }, 429, { 'Retry-After': '5' }))
    await expect(createHttpGateway('https://example.test', fetcher).restore('test-token', signal())).rejects.toThrow('Espera 5 segundos')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('rechaza una respuesta de sesión con formato incorrecto', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply({ token: 'test' }))
    await expect(createHttpGateway('https://example.test', fetcher).login({ email: 'test@example.test', password: 'prueba-local' })).rejects.toBeInstanceOf(ServiceError)
  })
  it('presenta un error recuperable ante una caída de red', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(createHttpGateway('https://example.test', fetcher).restore('test-token', signal())).rejects.toMatchObject({ kind: 'network', message: expect.stringContaining('Comprueba tu conexión') })
  })
  it('no solicita nada si falta la URL base', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(createHttpGateway('', fetcher).restore('test-token', signal())).rejects.toMatchObject({ kind: 'offline' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
