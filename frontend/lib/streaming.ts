export const IMAGE_ANALYSIS_RESPONSE = `Thanks for sharing that reference image! Here's my analysis:\n\n**Style detected:** Fine line / Neo-traditional hybrid\n**Key elements I can see:**\n- Clean linework with minimal shading\n- Organic, flowing composition\n- Strong use of negative space\n\n**My recommendations based on this:**\n- This style works beautifully at medium scale (4–8 inches)\n- A skilled fine-line specialist would be ideal for this\n- Placement: forearm, upper arm, or shoulder blade\n\nWould you like me to generate a similar concept adapted to your specific idea? If so, just say the word and I'll create a concept image for you.`

// Responses for when the user confirms they want an image generated
const GENERATE_CONFIRMATION_KEYWORDS = [
  'yes', 'yeah', 'yep', 'sure', 'go ahead', 'generate', 'make it', 'create it',
  'do it', 'let\'s do it', 'sounds good', 'please', 'generate the',
]

const MOCK_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ['dragon'],
    response: `Great choice! Dragons are one of the most iconic tattoo subjects. Here's what I'd recommend:\n\n**Style: Japanese Irezumi**\n- Elongated dragon body following your arm's natural contour\n- Bold black outlines with grey wash shading\n- Subtle cloud motifs or waves for context\n\n**Placement tips:**\n- Forearm: horizontal or diagonal orientation\n- Upper arm: vertical, wrapping around the bicep\n\n**Color vs. Black & Grey:**\n- For a timeless look, stick to black and grey\n- A single red or blue accent can add real drama\n\nWould you like me to generate a concept image for this dragon design?`,
  },
  {
    keywords: ['flower', 'floral', 'rose', 'peony', 'lily', 'botanical'],
    response: `Floral tattoos are timeless and endlessly versatile! Here are my style recommendations:\n\n**1. Fine Line Botanical** (most popular minimal style)\n- Single-needle linework for delicate detail\n- Recommended flowers: peony, ranunculus, wildflowers\n- Flowing composition that follows the body's curves\n\n**2. Blackwork**\n- Bold but sparse — high contrast and long-lasting\n- Great for geometric or stacked arrangements\n\n**3. Neo-Traditional**\n- Thick outlines with flat colour fills\n- Vivid, illustrative look that pops\n\nWhat placement were you thinking — forearm, shoulder, or ribcage? And which of these three styles speaks to you?`,
  },
  {
    keywords: ['japanese', 'irezumi', 'sleeve', 'koi', 'wave'],
    response: `Japanese irezumi is one of the richest tattoo traditions. For a sleeve:\n\n**Classic elements to consider:**\n- **Main subject**: Dragon, koi, tiger, or phoenix\n- **Background**: Wind bars, waves, or cherry blossoms\n- **Secondary elements**: Peonies, chrysanthemums, maple leaves\n\n**Style guidelines:**\n- Bold black outlines with smooth colour fills\n- Negative space used intentionally (not everything needs filling)\n- The sleeve should read as a unified composition\n\n**Timeline:** A full sleeve typically takes 20–40 hours across multiple sessions.\n\nWhat main subject resonates with you most? Once you decide, I can generate a concept to show the direction.`,
  },
  {
    keywords: ['geometric', 'mandala', 'sacred', 'dotwork'],
    response: `Geometric and dotwork tattoos are stunning in their precision! Here's what I suggest:\n\n**1. Dotwork Mandala**\n- Created entirely with stippled dots — incredibly detailed\n- Works beautifully on the back, chest, or thigh\n\n**2. Geometric Blackwork**\n- Clean lines, precise angles, mathematical patterns\n- Great for arms, forearms, or behind the ear\n\n**3. Sacred Geometry**\n- Metatron's Cube, Flower of Life, Sri Yantra\n- Carries spiritual meaning for many wearers\n\nWould you like me to generate a concept based on any of these directions? Just let me know which one interests you most.`,
  },
  {
    keywords: ['minimal', 'minimalist', 'simple', 'fine line', 'small'],
    response: `Minimalist tattoos are incredibly powerful when done well. Here's my approach:\n\n**1. Fine Line (single needle)**\n- Ultra-thin lines that create a delicate, sketch-like quality\n- Best for small to medium-sized designs\n\n**2. Negative Space**\n- The absence of ink creates form — very striking\n- Works well for geometric shapes and silhouettes\n\n**3. Micro Realism**\n- Tiny photorealistic elements (portraits, animals, objects)\n- Requires exceptional skill, can be as small as a coin\n\nWhat subject or theme are you drawn to? Once we lock in the concept, I can generate a visual for you.`,
  },
]

const DEFAULT_RESPONSE = `Thanks for sharing that! Let me help you develop this concept.\n\n**Based on your description, here's what I'd recommend exploring:**\n\n**Style considerations:**\n- Think about how the tattoo will age — fine lines soften over time, bolder strokes hold better\n- Placement will significantly shape the design's silhouette and scale\n- Black & grey ages more predictably than colour\n\n**Next steps to refine this:**\n1. Tell me the size and placement you have in mind\n2. Share any reference images that inspire you\n3. Let me know your preference: bold or delicate, dark or light\n\nWhat matters most to you in this design?`

function isGenerateConfirmation(msg: string): boolean {
  const lower = msg.toLowerCase().trim()
  return GENERATE_CONFIRMATION_KEYWORDS.some((k) => lower.includes(k))
}

export function getMockResponse(userMessage: string, conversationContext?: string): string {
  const msg = userMessage.toLowerCase()

  // If the user is confirming they want a generated image, return a confirmation
  // with a [GENERATE: ...] marker so the UI shows the generate button.
  if (isGenerateConfirmation(msg)) {
    // Try to infer a style/subject from the conversation context or user message
    const context = (conversationContext ?? '') + ' ' + msg
    let subject = 'tattoo concept, detailed linework, black and grey'
    if (context.includes('dragon')) subject = 'Japanese irezumi dragon, black and grey, detailed scales, cloud motifs, forearm wrap'
    else if (context.includes('floral') || context.includes('flower') || context.includes('rose') || context.includes('peony')) subject = 'fine line botanical floral tattoo, single needle linework, delicate petals, forearm placement'
    else if (context.includes('japanese') || context.includes('koi') || context.includes('sleeve')) subject = 'Japanese irezumi sleeve, koi fish, cherry blossoms, waves, bold outlines, colour fills'
    else if (context.includes('geometric') || context.includes('mandala') || context.includes('dotwork')) subject = 'geometric dotwork mandala, stippled dots, symmetrical pattern, upper arm placement'
    else if (context.includes('minimal') || context.includes('fine line') || context.includes('small')) subject = 'minimalist fine line tattoo, single needle, delicate linework, small and elegant'

    return `Perfect! I'll create a concept image for you now.\n\nHere's the prompt I'll use for generation — let me know if you'd like to adjust anything before I finalise it.\n\n[GENERATE: ${subject}]`
  }

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

// How long to wait for the first token before giving up.
// The backend now has a 10s connect + 90s read timeout on Azure, so 100s here
// ensures the backend error always arrives before the frontend bails out.
const SSE_TIMEOUT_MS = 100_000

export function consumeSSE(
  url: string,
  body: Record<string, unknown>,
  token: string | null,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController()

  // Abort the fetch if the backend doesn't respond within the timeout.
  const timeoutId = setTimeout(() => {
    controller.abort()
    onError(new Error('The AI took too long to respond. Please check your Azure credentials and try again.'))
  }, SSE_TIMEOUT_MS)

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
          if (data === '[DONE]') {
            clearTimeout(timeoutId)
            onDone()
            return
          }
          try {
            const parsed = JSON.parse(data)
            // Surface backend errors (e.g. missing credentials) as a chat message
            if (parsed?.error) {
              clearTimeout(timeoutId)
              onChunk(`\n\n⚠️ ${parsed.error}`)
              onDone()
              return
            }
            const chunk = parsed?.choices?.[0]?.delta?.content ?? ''
            if (chunk) {
              clearTimeout(timeoutId) // First token received — cancel the timeout
              onChunk(chunk)
            }
          } catch { /* skip malformed lines */ }
        }
      }
      clearTimeout(timeoutId)
      onDone()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      if (err.name !== 'AbortError') onError(err)
    })

  return controller
}
