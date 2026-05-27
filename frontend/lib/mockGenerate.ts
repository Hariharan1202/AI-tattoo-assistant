export interface StyleConfig {
  name: string
  gradient: string[]
  symbol: string
  colors: string
}

const STYLE_MAP: { keywords: string[]; config: StyleConfig }[] = [
  {
    keywords: ['japanese', 'irezumi', 'koi', 'wave', 'dragon'],
    config: {
      name: 'Japanese Irezumi',
      gradient: ['#1a1a2e', '#16213e', '#0f3460'],
      symbol: '龍',
      colors: '#e94560,#0f3460',
    },
  },
  {
    keywords: ['geometric', 'mandala', 'sacred', 'dotwork'],
    config: {
      name: 'Geometric Dotwork',
      gradient: ['#0a0a0a', '#1a1a1a', '#2a2a2a'],
      symbol: '◈',
      colors: '#c9a84c,#ffffff',
    },
  },
  {
    keywords: ['watercolor', 'colour', 'color', 'vibrant'],
    config: {
      name: 'Watercolor',
      gradient: ['#667eea', '#764ba2', '#f093fb'],
      symbol: '✿',
      colors: '#ffffff,#ffe0f0',
    },
  },
  {
    keywords: ['flower', 'floral', 'botanical', 'rose', 'peony', 'lily'],
    config: {
      name: 'Fine Line Botanical',
      gradient: ['#1a1a1a', '#2d2d2d', '#1a1a1a'],
      symbol: '✾',
      colors: '#c9a84c,#e8d5a3',
    },
  },
  {
    keywords: ['tribal', 'polynesian', 'maori', 'blackwork'],
    config: {
      name: 'Tribal Blackwork',
      gradient: ['#000000', '#111111', '#000000'],
      symbol: '⬟',
      colors: '#333333,#666666',
    },
  },
  {
    keywords: ['minimal', 'minimalist', 'simple', 'fine line', 'small'],
    config: {
      name: 'Fine Line Minimal',
      gradient: ['#141414', '#1c1c1c', '#141414'],
      symbol: '✦',
      colors: '#c9a84c,#888888',
    },
  },
]

const DEFAULT_STYLE: StyleConfig = {
  name: 'Black & Grey Realism',
  gradient: ['#111111', '#222222', '#111111'],
  symbol: '✦',
  colors: '#888888,#cccccc',
}

export function extractStyle(prompt: string): StyleConfig {
  const lower = prompt.toLowerCase()
  for (const { keywords, config } of STYLE_MAP) {
    if (keywords.some((k) => lower.includes(k))) return config
  }
  return DEFAULT_STYLE
}

export function generateMockImageUrl(prompt: string): string {
  const style = extractStyle(prompt)
  const [c1, c2, c3] = style.gradient
  const [tc1, tc2] = style.colors.split(',')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}" />
      <stop offset="50%" style="stop-color:${c2}" />
      <stop offset="100%" style="stop-color:${c3}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${tc1};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${tc1};stop-opacity:0" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  <ellipse cx="256" cy="256" rx="200" ry="200" fill="url(#glow)" />
  <circle cx="256" cy="256" r="160" fill="none" stroke="${tc1}" stroke-width="0.8" stroke-dasharray="4 8" opacity="0.4" />
  <circle cx="256" cy="256" r="120" fill="none" stroke="${tc2}" stroke-width="0.5" stroke-dasharray="2 6" opacity="0.3" />
  <text x="256" y="290" font-family="serif" font-size="96" fill="${tc1}" text-anchor="middle" opacity="0.85">${style.symbol}</text>
  <text x="256" y="370" font-family="sans-serif" font-size="13" fill="${tc2}" text-anchor="middle" opacity="0.6" letter-spacing="3">${style.name.toUpperCase()}</text>
  <text x="256" y="420" font-family="sans-serif" font-size="9" fill="${tc2}" text-anchor="middle" opacity="0.35" letter-spacing="1">AI CONCEPT · INK AI</text>
</svg>`

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}
