import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, evaluateDesign, formatApiErrors, getDefaults, type Config } from './api'

const CONFIG: Config = {
  link_min: 5, link_max: 30, max_total: 45, min_coverage: 0.5,
  theta1_limits: [-Math.PI, Math.PI], theta2_limits: [-2.618, 2.618],
  task_rect: [10, 25, 5, 20], grid_spacing: 1,
}

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('formatApiErrors', () => {
  it('strips "Value error, " from our own rule messages', () => {
    const lines = formatApiErrors([
      { loc: ['body'], msg: 'Value error, link_min must be greater than 0; min_coverage must be between 0 and 1' },
    ])
    expect(lines).toEqual(['link_min must be greater than 0; min_coverage must be between 0 and 1'])
  })

  it('keeps a message that itself contains "; " in one piece', () => {
    const lines = formatApiErrors([
      { loc: ['body'], msg: 'Value error, 22801 task points exceeds the cap of 2500; use a larger spacing' },
    ])
    expect(lines).toEqual(['22801 task points exceeds the cap of 2500; use a larger spacing'])
  })

  it('adds the field name to Pydantic messages', () => {
    const lines = formatApiErrors([
      { loc: ['body', 'x'], msg: 'Field required' },
      { loc: ['body', 'y'], msg: 'Field required' },
      { loc: ['body', 'l1'], msg: 'Input should be greater than 0' },
    ])
    expect(lines).toEqual(['x: Field required', 'y: Field required', 'l1: Input should be greater than 0'])
  })

  it('leaves messages without a field name as they are', () => {
    expect(formatApiErrors([{ loc: ['body', 0], msg: 'JSON decode error' }])).toEqual(['JSON decode error'])
  })
})

describe('request', () => {
  it('GETs /api/defaults through the proxy path', async () => {
    const fetchMock = mockFetch(200, CONFIG)
    expect(await getDefaults()).toEqual(CONFIG)
    expect(fetchMock).toHaveBeenCalledWith('/api/defaults', undefined)
  })

  it('POSTs the design as JSON', async () => {
    const fetchMock = mockFetch(200, { coverage: 0.97265625, dexterity: 0.892, length: 30, feasible: true, shortfall: 0 })
    const scores = await evaluateDesign(CONFIG, 15, 15)
    expect(scores.coverage).toBe(0.97265625)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/evaluate')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ config: CONFIG, l1: 15, l2: 15 })
  })

  it('throws ApiError with readable messages on 422', async () => {
    mockFetch(422, { detail: [{ loc: ['body'], msg: 'Value error, link_min must be greater than 0' }] })
    const err = await evaluateDesign(CONFIG, 15, 15).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.messages).toEqual(['link_min must be greater than 0'])
  })

  it('throws a clear message on other server errors', async () => {
    mockFetch(500, {})
    const err = await getDefaults().catch((e) => e)
    expect(err.messages).toEqual(['Server error 500 (is the backend running?)'])
  })
})
