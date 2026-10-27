import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { AuthProvider, safeReturnPath } from './auth'
import type { Crew, Gateway, Session } from './services'
import { disconnectedGateway, ServiceError } from './services'

const crew: Crew = { teamName: 'Equipo de prueba', teamCode: 'TEST', email: 'test@example.com' }
const session: Session = { token: 'local-test-token', crew }
// Este adaptador sólo existe en tests. No se importa desde la aplicación.
function gateway(overrides: Partial<Gateway> = {}): Gateway {
  return {
    login: vi.fn().mockResolvedValue(session),
    register: vi.fn().mockResolvedValue(session),
    restore: vi.fn().mockResolvedValue(crew),
    dashboard: vi.fn().mockResolvedValue({ items: [], logPose: 'pending' }),
    ...overrides,
  }
}
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output> }
function mount(path: string, service: Gateway = disconnectedGateway) {
  render(<MemoryRouter initialEntries={[path]}><AuthProvider gateway={service}><App /><Location /></AuthProvider></MemoryRouter>)
}
async function fillLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email de la tripulación'), 'test@example.com')
  await user.type(screen.getByLabelText('Contraseña', { exact: true }), 'local-password')
}

describe('CP1 sin conexión al curso', () => {
  it('redirige una ruta privada y conserva parámetros y fragmento', async () => {
    mount('/dashboard?tab=crew#log-pose')
    await screen.findByRole('heading', { name: 'Bienvenido a bordo.' })
    expect(screen.getByTestId('location')).toHaveTextContent('/login?returnTo=%2Fdashboard%3Ftab%3Dcrew%23log-pose')
  })

  it('no hace peticiones de red al intentar iniciar sesión', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Red bloqueada en test'))
    try {
      const user = userEvent.setup()
      mount('/login')
      await fillLogin(user)
      await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('No se envió ningún dato')
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(localStorage.getItem('log-pose:session')).toBeNull()
    } finally { fetchSpy.mockRestore() }
  })

  it('no hace peticiones de red al intentar registrar una tripulación', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    try {
      const user = userEvent.setup()
      mount('/register')
      await user.type(await screen.findByLabelText('Nombre de la tripulación'), 'Prueba local')
      await fillLogin(user)
      await user.click(screen.getByRole('button', { name: 'Crear tripulación' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('desactivada')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally { fetchSpy.mockRestore() }
  })

  it('la vista previa no llama ni a sesión ni a indicadores', async () => {
    const service = gateway()
    mount('/preview', service)
    expect(await screen.findByRole('heading', { name: 'Los indicadores esperan tu conexión.' })).toBeVisible()
    expect(service.dashboard).not.toHaveBeenCalled()
    expect(service.restore).not.toHaveBeenCalled()
  })

  it('muestra validación por campo sin llamar al servicio', async () => {
    const service = gateway()
    const user = userEvent.setup()
    mount('/register', service)
    await user.click(await screen.findByRole('button', { name: 'Crear tripulación' }))
    expect(screen.getByLabelText('Nombre de la tripulación')).toHaveAccessibleDescription('Escribe el nombre de tu tripulación.')
    expect(screen.getByLabelText('Email de la tripulación')).toHaveAttribute('aria-invalid', 'true')
    expect(service.register).not.toHaveBeenCalled()
  })
})

describe('Flujo de sesión con adaptador exclusivo de pruebas', () => {
  it('vuelve a la dirección solicitada al iniciar sesión', async () => {
    const user = userEvent.setup()
    mount('/login?returnTo=%2Fdashboard%3Ftab%3Dcrew%23log-pose', gateway())
    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await screen.findByRole('heading', { name: 'Bitácora de la tripulación' })
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard?tab=crew#log-pose')
  })

  it('entra directamente al dashboard después del registro', async () => {
    const user = userEvent.setup()
    const service = gateway()
    mount('/register', service)
    await user.type(await screen.findByLabelText('Nombre de la tripulación'), 'Prueba local')
    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Crear tripulación' }))
    await screen.findByRole('heading', { name: 'Bitácora de la tripulación' })
    expect(localStorage.getItem('log-pose:session')).toBe(session.token)
    expect(service.register).toHaveBeenCalledWith({ teamName: 'Prueba local', email: 'test@example.com', password: 'local-password' })
  })

  it('no muestra el login mientras verifica una sesión guardada', async () => {
    localStorage.setItem('log-pose:session', session.token)
    let resolveRestore!: (value: Crew) => void
    const service = gateway({ restore: () => new Promise(resolve => { resolveRestore = resolve }) })
    mount('/dashboard', service)
    expect(screen.getByText('Comprobando tu sesión…')).toBeVisible()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    await act(async () => resolveRestore(crew))
    expect(await screen.findByRole('heading', { name: 'Bitácora de la tripulación' })).toBeVisible()
  })

  it('elimina una sesión expirada y vuelve al login', async () => {
    localStorage.setItem('log-pose:session', session.token)
    mount('/dashboard', gateway({ restore: vi.fn().mockRejectedValue(new ServiceError('Sesión vencida', 'unauthorized')) }))
    await screen.findByRole('heading', { name: 'Bienvenido a bordo.' })
    expect(localStorage.getItem('log-pose:session')).toBeNull()
  })

  it('conserva el token y permite reintentar si falla la conexión al restaurar', async () => {
    localStorage.setItem('log-pose:session', session.token)
    const restore = vi.fn().mockRejectedValueOnce(new ServiceError('Sin conexión', 'network')).mockResolvedValue(crew)
    const user = userEvent.setup()
    mount('/dashboard', gateway({ restore }))
    await screen.findByRole('heading', { name: 'No pudimos verificar tu sesión' })
    expect(localStorage.getItem('log-pose:session')).toBe(session.token)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('heading', { name: 'Bitácora de la tripulación' })
  })

  it('reintenta los indicadores y cierra la sesión local', async () => {
    localStorage.setItem('log-pose:session', session.token)
    const dashboard = vi.fn().mockRejectedValueOnce(new ServiceError('Error temporal', 'network')).mockResolvedValue({ items: [], logPose: 'pending' })
    const user = userEvent.setup()
    mount('/dashboard', gateway({ dashboard }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Error temporal')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('heading', { name: 'Todavía no hay indicadores.' })
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await screen.findByRole('heading', { name: 'Bienvenido a bordo.' })
    expect(localStorage.getItem('log-pose:session')).toBeNull()
  })

  it('muestra errores del servidor junto al campo correspondiente', async () => {
    const user = userEvent.setup()
    mount('/register', gateway({ register: vi.fn().mockRejectedValue(new ServiceError('Revisa tus datos', 'validation', { email: 'Este email ya está registrado.' })) }))
    await user.type(await screen.findByLabelText('Nombre de la tripulación'), 'Prueba')
    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Crear tripulación' }))
    await waitFor(() => expect(screen.getByLabelText('Email de la tripulación')).toHaveAccessibleDescription('Este email ya está registrado.'))
  })

  it('rechaza destinos externos y conserva destinos locales válidos', () => {
    for (const value of ['//example.com', 'https://example.com', '/\\example.com', '/login', '/register']) expect(safeReturnPath(value)).toBe('/dashboard')
    expect(safeReturnPath('/dashboard?tab=crew#log-pose')).toBe('/dashboard?tab=crew#log-pose')
  })

  it('muestra una página 404 sin inventar una ruta', async () => {
    mount('/ruta-inexistente')
    expect(await screen.findByRole('heading', { name: 'Este rumbo no está en el mapa.' })).toBeVisible()
  })
})
