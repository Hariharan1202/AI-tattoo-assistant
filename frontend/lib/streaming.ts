export const IMAGE_ANALYSIS_RESPONSE = `Thanks for sharing that reference image! Here's my analysis:\n\n**Style detected:** Fine line / Neo-traditional hybrid\n**Key elements I can see:**\n- Clean linework with minimal shading\n- Organic, flowing composition\n- Strong use of negative space\n\n**My recommendations based on this:**\n- This style works beautifully at medium scale (4–8 inches)\n- A skilled fine-line specialist would be ideal for this\n- Placement: forearm, upper arm, or shoulder blade\n\nWould you like me to generate a similar concept adapted to your specific idea?`

const MOCK_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ['dragon'],
    response: `Great choice! Dragons are one of the most iconic tattoo subjects. Here's what I'd recommend:\n\n**Style: Japanese Irezumi / Fine Line**\n- Elongated dragon body following your arm's natural contour\n- Minimal shading with clean, single-needle linework\n- Subtle cloud motifs or waves for context\n\n**Placement tips:**\n- Forearm: horizontal or diagonal orientation\n- Upper arm: vertical, wrapping around the bicep\n\n**Color vs. Black & Grey:**\n- For a minimal look, stick to black and grey\n- A single red or blue accent can add real drama\n\nWould you like me to generate a concept image for this?`,
  },
  {
    keywords: ['flower', 'floral', 'rose', 'peony', 'lily', 'botanical'],
    response: `Floral tattoos are timeless and endlessly versatile! Here are my style recommendations:\n\n**Fine Line Botanical (most popular minimal style)**\n- Single-needle linework for delicate detail\n- Recommended flowers: peony, ranunculus, wildflowers\n- Flowing composition that follows the body's curves\n\n**Blackwork Minimal**\n- Bold but sparse — high contrast and long-lasting\n- Great for geometric or stacked arrangements\n\n**Neo-Traditional**\n- Thick outlines with flat colour fills\n- Vivid, illustrative look that pops\n\nWhat placement were you thinking — forearm, shoulder, or ribcage?`,
  },
  {
    keywords: ['japanese', 'irezumi', 'sleeve', 'koi', 'wave'],
    response: `Japanese irezumi is one of the richest tattoo traditions. For a sleeve:\n\n**Classic elements to consider:**\n- **Main subject**: Dragon, koi, tiger, or phoenix\n- **Background**: Wind bars, waves, or cherry blossoms\n- **Secondary elements**: Peonies, chrysanthemums, maple leaves\n\n**Style guidelines:**\n- Bold black outlines with smooth colour fills\n- Negative space used intentionally (not everything needs filling)\n- The sleeve should read as a unified composition\n\n**Timeline:** A full sleeve typically takes 20–40 hours across multiple sessions.\n\nWhat main subject resonates with you most?`,
  },
  {
    keywords: ['geometric', 'mandala', 'sacred', 'dotwork'],
    response: `Geometric and dotwork tattoos are stunning in their precision! Here's what I suggest:\n\n**Dotwork Mandala**\n- Created entirely with stippled dots — incredibly detailed\n- Works beautifully on the back, chest, or thigh\n- Fades more gracefully than linework over time\n\n**Geometric Blackwork**\n- Clean lines, precise angles, mathematical patterns\n- Great for arms, forearms, or behind the ear\n\n**Sacred Geometry**\n- Metatron's Cube, Flower of Life, Sri Yantra\n- Carries spiritual meaning for many wearers\n\nShould I generate a concept based on any of these directions?`,
  },
  {
    keywords: ['minimal', 'minimalist', 'simple', 'fine line', 'small'],
    response: `Minimalist tattoos are one of my favourite categories to work with — when done well, they're incredibly powerful. Here's my approach:\n\n**Fine Line (single needle)**\n- Ultra-thin lines that create a delicate, sketch-like quality\n- Best for small to medium-sized designs\n- Requires an experienced artist — very unforgiving of mistakes\n\n**Negative Space**\n- The absence of ink creates form — very striking\n- Works well for geometric shapes and silhouettes\n\n**Micro Realism**\n- Tiny photorealistic elements (portraits, animals, objects)\n- Requires exceptional skill, can be as small as a coin\n\nWhat subject or theme are you drawn to for your minimal piece?`,
  },
]

const DEFAULT_RESPONSE = `Thanks for sharing that! Let me help you develop this concept.\n\n**Based on your description, here's what I'd recommend exploring:**\n\n**Style considerations:**\n- Think about how the tattoo will age — fine lines soften over time, bolder strokes hold better\n- Placement will significantly shape the design's silhouette and scale\n- Black & grey ages more predictably than colour\n\n**Next steps to refine this:**\n1. Tell me the size and placement you have in mind\n2. Share any reference images that inspire you\n3. Let me know your preference: bold or delicate, dark or light\n\nI can generate concept images once we've locked in a direction. What matters most to you in this design?`

export function getMockResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase()
  for (const { keywords, response } of MOCK_RESPONSES) {
    if (keywords.some((k) => msg.includes(k))) return response
  }
  return DEFAULT_RESPONSE
}

export async function mockStream(
  text: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  delayMs = 16
): Promise<void> {
  const tokens = text.split(/(\s+)/)
  for (const token of tokens) {
    await new Promise<void>((res) => setTimeout(res, delayMs))
    onChunk(token)
  }
  onDone()
}

export function consumeSSE(
  url: string,
  body: Record<string, unknown>,
  token: string | null,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController()

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { onDone(); return }
          try {
            const chunk = JSON.parse(data)?.choices?.[0]?.delta?.content ?? ''
            if (chunk) onChunk(chunk)
          } catch { /* skip malformed lines */ }
        }
      }
      onDone()
    })
    .catch((err) => { if (err.name !== 'AbortError') onError(err) })

  return controller
}
