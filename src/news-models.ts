export const newsTypes = ['BOUNTY_UPDATE', 'BATTLE', 'MARINE_OPERATION', 'WORLD_GOVERNMENT', 'DISCOVERY'] as const
export const newsPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const newsStatuses = ['RUMOR', 'CONFIRMED', 'DEBUNKED'] as const
export type NewsType = typeof newsTypes[number]
export type NewsPriority = typeof newsPriorities[number]
export type NewsStatus = typeof newsStatuses[number]
export type VerifiedStatus = Exclude<NewsStatus, 'RUMOR'>

export interface NewsQuery { type: NewsType | ''; priority: NewsPriority | ''; status: NewsStatus | '' }
export interface NewsItem {
  id: string; type: NewsType; priority: NewsPriority; status: NewsStatus
  title: string; summary: string; source: string; island: string
  relatedWanted: { id: string; name: string } | null
  publishedAt: string; updatedAt: string; verifiedAt: string | null
}
export interface NewsDetailData extends NewsItem { body: string[] }
export interface NewsFeedPage { items: NewsItem[]; nextCursor: string | null; hasMore: boolean }

export const newsTypeLabels: Record<NewsType, string> = { BOUNTY_UPDATE: 'Recompensas', BATTLE: 'Batalla', MARINE_OPERATION: 'Operación de la Marina', WORLD_GOVERNMENT: 'Gobierno Mundial', DISCOVERY: 'Descubrimiento' }
export const newsPriorityLabels: Record<NewsPriority, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica' }
export const newsStatusLabels: Record<NewsStatus, string> = { RUMOR: 'Rumor', CONFIRMED: 'Confirmada', DEBUNKED: 'Desmentida' }

// Los filtros viven en la URL: un valor fuera del contrato se descarta en vez de romper la vista.
export function readNewsQuery(params: URLSearchParams): NewsQuery {
  const type = params.get('type') ?? ''
  const priority = params.get('priority') ?? ''
  const status = params.get('status') ?? ''
  return {
    type: newsTypes.find(value => value === type) ?? '',
    priority: newsPriorities.find(value => value === priority) ?? '',
    status: newsStatuses.find(value => value === status) ?? '',
  }
}
export function newsSearch(query: NewsQuery): string {
  const params = new URLSearchParams()
  for (const key of ['type', 'priority', 'status'] as const) if (query[key]) params.set(key, query[key])
  return params.toString()
}
