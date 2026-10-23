// Typed calls to the Dexter API. Everything here is in cm and radians (the API contract);
// units.ts converts for display. In development, Vite forwards /api to FastAPI (vite.config.ts).

export type Range = [number, number]
export type Rect = [number, number, number, number] // x_min, x_max, y_min, y_max (cm)

export interface Config {
  link_min: number
  link_max: number
  max_total: number
  min_coverage: number // fraction 0..1
  theta1_limits: Range // rad
  theta2_limits: Range // rad
  task_rects: Rect[] // 1 to 4 task areas (A, B, C, D)
  grid_spacing: number
}

export interface Scores {
  coverage: number
  dexterity: number
  length: number
  feasible: boolean
  shortfall: number // worst area's miss of the coverage floor
  area_coverage: number[] // coverage of each task area
}

export interface Design extends Scores {
  l1: number
  l2: number
}

export interface GenerationLog {
  gen: number
  n_feasible: number
  best_coverage: number
}

export interface OptimizeResult {
  front: Design[]
  feasible_found: boolean
  log: GenerationLog[]
  evaluations: number
}

export interface IkSolution {
  elbow: 1 | -1
  theta1: number | null
  theta2: number | null
  reachable: boolean
  within_limits: boolean
}

export interface WorkspaceResult {
  x: number[]
  y: number[]
  covered: boolean[]
  dexterity: (number | null)[] // null where not covered
  task: { x: number[]; y: number[]; covered: boolean[]; area: number[]; area_coverage: number[] }
}

// One entry of FastAPI's 422 "detail" list.
export interface ValidationError {
  loc: (string | number)[]
  msg: string
}

export class ApiError extends Error {
  messages: string[]

  constructor(messages: string[]) {
    super(messages.join('\n'))
    this.messages = messages
  }
}

const PREFIX = 'Value error, '

/** Turn FastAPI's 422 detail into readable lines, one per error.
 *  Our own rules already name their field, so only the "Value error, " prefix is removed.
 *  Pydantic's built-in messages ("Field required") get the field name from the end of loc. */
export function formatApiErrors(detail: ValidationError[]): string[] {
  return detail.map(({ loc, msg }) => {
    if (msg.startsWith(PREFIX)) return msg.slice(PREFIX.length)
    const field = loc[loc.length - 1]
    return typeof field === 'string' && field !== 'body' ? `${field}: ${msg}` : msg
  })
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const init =
    body === undefined
      ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  const res = await fetch(`/api${path}`, init)
  if (res.status === 422) {
    const data = await res.json()
    throw new ApiError(formatApiErrors(data.detail))
  }
  if (!res.ok) throw new ApiError([`Server error ${res.status} (is the backend running?)`])
  return (await res.json()) as T
}

export const getDefaults = () => request<Config>('/defaults')

export const evaluateDesign = (config: Config, l1: number, l2: number) =>
  request<Scores>('/evaluate', { config, l1, l2 })

export const optimize = (config: Config) => request<OptimizeResult>('/optimize', config)

export const solveIk = (config: Config, l1: number, l2: number, x: number, y: number) =>
  request<{ solutions: IkSolution[] }>('/ik', { config, l1, l2, x, y })

export const getWorkspace = (config: Config, l1: number, l2: number) =>
  request<WorkspaceResult>('/workspace', { config, l1, l2 })
