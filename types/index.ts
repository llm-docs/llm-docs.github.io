export interface DocMetadata {
  title: string
  description: string
  date: string
  category: string
  tags?: string[]
  author?: string
}

export interface NewsMetadata {
  title: string
  description: string
  date: string
  author: string
  image?: string
  tags?: string[]
  source?: string
}

export interface AgentMetadata {
  name: string
  description: string
  category: string
  url?: string
  github?: string
  tags?: string[]
  features?: string[]
}

export interface SearchResult {
  id: string
  title: string
  description: string
  content: string
  type: 'doc' | 'news' | 'agent' | 'model'
  url: string
  tags?: string[]
}

export interface ModelMetadata {
  name: string
  description: string
  provider: string
  releaseDate: string
  status: string
  contextWindow?: string
  modalities?: string[]
  tags?: string[]
}

export interface AutomationSourceStatus {
  sourceId: string
  sourceName: string
  status: string
  written: number
  scanned?: number
  matched?: number
  error?: string
}

export interface AutomationStatus {
  kind: string
  lastRunAt: string
  totalWritten: number
  sources: AutomationSourceStatus[]
}

export interface ModelComparison {
  slug: string
  title: string
  description: string
  category: string
  keywords: string[]
  left: {
    slug: string
    name: string
    provider: string
    description: string
    status: string
    contextWindow?: string
    modalities?: string[]
  }
  right: {
    slug: string
    name: string
    provider: string
    description: string
    status: string
    contextWindow?: string
    modalities?: string[]
  }
}
