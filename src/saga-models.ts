export interface Palette { background: string; surface: string; primary: string; accent: string; text: string }
export interface SagaSummary {
  id: string; order: number; title: string; subtitle: string; synopsis: string
  stageCount: number; totalDistanceNm: number; firstIsland: string; lastIsland: string; palette: Palette
}
export interface StageMetric { key: string; label: string; value: number; unit: string }
export interface SagaStage {
  id: string; order: number; slug: string; title: string; narrative: string[]
  island: { id: string; name: string; x: number; y: number }
  palette: Palette; metrics: StageMetric[]
}
export interface SagaStory {
  saga: SagaSummary & { intro: string }
  map: { width: number; height: number }
  stages: SagaStage[]
}
