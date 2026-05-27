import { getMockResponse } from '../lib/streaming'

describe('getMockResponse', () => {
  it('returns dragon response for dragon keyword', () => {
    const r = getMockResponse('I want a dragon tattoo')
    expect(r).toContain('Dragon')
  })

  it('returns floral response for flower keyword', () => {
    const r = getMockResponse('a floral forearm piece')
    expect(r.toLowerCase()).toContain('floral')
  })

  it('returns Japanese response for japanese keyword', () => {
    const r = getMockResponse('Japanese sleeve tattoo')
    expect(r.toLowerCase()).toContain('japanese')
  })

  it('returns geometric response for mandala keyword', () => {
    const r = getMockResponse('I want a mandala back piece')
    expect(r.toLowerCase()).toContain('dotwork')
  })

  it('returns minimal response for minimalist keyword', () => {
    const r = getMockResponse('something minimalist and simple')
    expect(r.toLowerCase()).toContain('minimal')
  })

  it('returns default response for unmatched prompt', () => {
    const r = getMockResponse('zzz no keywords here at all xyz')
    expect(typeof r).toBe('string')
    expect(r.length).toBeGreaterThan(50)
  })

  it('is case-insensitive', () => {
    const lower = getMockResponse('dragon tattoo')
    const upper = getMockResponse('DRAGON TATTOO')
    expect(lower).toBe(upper)
  })
})
