export const wantedStatuses = ['AT_LARGE', 'CAPTURED', 'MISSING'] as const
export const fruitTypes = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'] as const
export const wantedSorts = ['bounty,desc', 'name,asc', 'updatedAt,desc'] as const
export type WantedStatus = typeof wantedStatuses[number]
export type FruitType = typeof fruitTypes[number]
export interface WantedQuery {
  page: number; size: 10 | 20 | 50; sort: typeof wantedSorts[number]
  status: WantedStatus | ''; fruit: FruitType | ''; crewId: string; q: string
}
export interface PirateCrew { id: string; name: string }
export interface WantedItem {
  id: string; name: string; epithet: string; bounty: number; status: WantedStatus
  crew: PirateCrew; role: string; devilFruit: { name: string; type: string } | null
  threatLevel: number; lastSeenIsland: string; updatedAt: string
}
export interface WantedPageData { content: WantedItem[]; totalElements: number; totalPages: number; page: number; size: number }
export interface WantedDetailData extends WantedItem {
  age: number; heightCm: number; bio: string
  lastSeen: { island: string; seenAt: string }
  bountyHistory: { amount: number; issuedAt: string }[]
}
export const statusLabels: Record<WantedStatus, string> = { AT_LARGE: 'En libertad', CAPTURED: 'Capturado', MISSING: 'Desaparecido' }
export const fruitLabels: Record<FruitType, string> = { PARAMECIA: 'Paramecia', ZOAN: 'Zoan', LOGIA: 'Logia', NONE: 'Sin fruta' }
export const roleLabels: Record<string, string> = { CAPTAIN: 'Capitán', FIRST_MATE: 'Primer oficial', NAVIGATOR: 'Navegante', SNIPER: 'Tirador', COOK: 'Cocinero', DOCTOR: 'Médico', SHIPWRIGHT: 'Carpintero naval', MUSICIAN: 'Músico', ARCHAEOLOGIST: 'Arqueólogo', HELMSMAN: 'Timonel', FIGHTER: 'Combatiente' }

export function readWantedQuery(params: URLSearchParams): WantedQuery {
  const rawPage = params.get('page') ?? '0'
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 0
  const size = Number(params.get('size') ?? 20)
  const status = params.get('status') ?? ''
  const fruit = params.get('fruit') ?? ''
  const sort = params.get('sort') ?? ''
  const crewId = params.get('crewId')?.trim() ?? ''
  return {
    page: Number.isSafeInteger(page) ? page : 0,
    size: size === 10 || size === 50 ? size : 20,
    sort: wantedSorts.find(value => value === sort) ?? 'bounty,desc',
    status: wantedStatuses.find(value => value === status) ?? '',
    fruit: fruitTypes.find(value => value === fruit) ?? '',
    crewId: crewId.length <= 200 ? crewId : '',
    q: (params.get('q') ?? '').trim().slice(0, 100),
  }
}
export function wantedSearch(query: WantedQuery): string {
  const params = new URLSearchParams({ page: String(query.page), size: String(query.size), sort: query.sort })
  for (const key of ['status', 'crewId', 'fruit', 'q'] as const) if (query[key]) params.set(key, query[key])
  return params.toString()
}
