import { extractStyle, generateMockImageUrl } from '../lib/mockGenerate'

describe('extractStyle', () => {
  it('identifies Japanese style from prompt', () => {
    const style = extractStyle('I want a Japanese dragon tattoo')
    expect(style.name).toBe('Japanese Irezumi')
  })

  it('identifies geometric style from prompt', () => {
    const style = extractStyle('geometric mandala on my back')
    expect(style.name).toBe('Geometric Dotwork')
  })

  it('identifies fine line style', () => {
    const style = extractStyle('minimal fine line simple small design')
    expect(style.name).toBe('Fine Line Minimal')
  })

  it('identifies botanical style', () => {
    const style = extractStyle('botanical floral forearm piece')
    expect(style.name).toBe('Fine Line Botanical')
  })

  it('falls back to default style for unrecognised prompt', () => {
    const style = extractStyle('something completely random without any known keywords')
    expect(style.name).toBe('Black & Grey Realism')
  })

  it('returns a gradient array with three entries', () => {
    const style = extractStyle('dragon')
    expect(Array.isArray(style.gradient)).toBe(true)
    expect(style.gradient).toHaveLength(3)
  })

  it('returns a symbol string', () => {
    const style = extractStyle('dragon')
    expect(typeof style.symbol).toBe('string')
    expect(style.symbol.length).toBeGreaterThan(0)
  })
})

describe('generateMockImageUrl', () => {
  it('returns a data URL', () => {
    const url = generateMockImageUrl('dragon tattoo')
    expect(url).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it('produces different outputs for different styles', () => {
    const url1 = generateMockImageUrl('Japanese dragon irezumi')
    const url2 = generateMockImageUrl('watercolor phoenix')
    expect(url1).not.toBe(url2)
  })

  it('produces a non-empty base64 payload', () => {
    const url = generateMockImageUrl('mandala geometric dotwork')
    const [, payload] = url.split(',')
    expect(payload.length).toBeGreaterThan(100)
  })
})
