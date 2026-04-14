export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface CheckResult {
  name: string
  status: CheckStatus
  detail: string
  recommendation?: string
  score: number
  maxScore: number
}

export interface PageAudit {
  url: string
  score: number
  maxScore: number
  responseTime: number
  checks: CheckResult[]
}

export interface DomainAudit {
  domain: string
  inputUrl: string
  date: string
  globalScore: number
  globalMaxScore: number
  domainChecks: CheckResult[]
  pages: PageAudit[]
  recommendations: RecommendationItem[]
}

export interface RecommendationItem {
  priority: 'high' | 'medium' | 'low'
  status: CheckStatus
  check: string
  page?: string
  text: string
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>
