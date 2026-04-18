export interface DocMetadata {
  title: string
  description: string
  date: string
  updatedAt?: string
  category: string
  tags?: string[]
  author?: string
  image?: string
}

export interface NewsMetadata {
  title: string
  description: string
  date: string
  updatedAt?: string
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
  useCases?: string[]
  alternatives?: string[]
  updatedAt?: string
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
  updatedAt?: string
  status: string
  contextWindow?: string
  modalities?: string[]
  tags?: string[]
  useCases?: string[]
  pricing?: string
  image?: string
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

export interface AutomationReviewCandidate {
  sourceId: string
  sourceName: string
  reason: string
  title: string
  link: string
  date?: string
  description?: string
}

export interface AutomationReviewReport {
  kind: string
  lastRunAt: string
  candidateCount: number
  candidates: AutomationReviewCandidate[]
}

export type QuantizationId = "fp16" | "bf16" | "int8" | "q8" | "q6" | "q5" | "q4"

export type BackendId = "ollama" | "llama.cpp" | "vllm" | "mlx" | "lm-studio" | "exllama"

export type DeploymentWorkloadId = "chat" | "rag" | "coding" | "long-context" | "vision"

export interface DeploymentModelProfile {
  id: string
  slug: string
  name: string
  provider: string
  family: string
  paramsB: number
  architecture: string
  topology: "dense" | "moe"
  layers: number
  hiddenSize: number
  numAttentionHeads: number
  numKvHeads: number
  contextMax: number
  modalities: string[]
  aliases?: string[]
  useCases: string[]
  recommendedBackends: BackendId[]
  quantizations: QuantizationId[]
  notes?: string[]
}

export interface HardwareProfile {
  id: string
  slug: string
  name: string
  vendor: string
  type: "discrete-gpu" | "unified-memory" | "cpu"
  class: "entry" | "prosumer" | "workstation" | "server"
  vramGB?: number
  unifiedMemoryGB?: number
  systemRamGB: number
  bandwidthGBps: number
  formFactor: "desktop" | "laptop" | "server"
  backendSupport: BackendId[]
  notes: string[]
}

export interface QuantizationProfile {
  id: QuantizationId
  label: string
  bytesPerParam: number
  overheadFactor: number
  speedFactor: number
}

export interface DeploymentEstimate {
  fitTier: "no" | "barely" | "yes" | "comfortable"
  fits: boolean
  needsOffload: boolean
  weightMemoryGB: number
  kvCacheGB: number
  runtimeOverheadGB: number
  totalRequiredGB: number
  offloadGB: number
  availableAcceleratorMemoryGB: number
  availableSystemMemoryGB: number
  estimatedTokensPerSecond: number
  estimatedTokensPerSecondRange: string
  performanceTier: "low" | "medium" | "high"
  recommendation: string
  backendNote: string
  workloadNote?: string
  assumptions: string[]
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
