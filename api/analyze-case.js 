const NEBIUS_URL = 'https://api.tokenfactory.nebius.com/v1/chat/completions'
const DEFAULT_MODEL = 'nvidia/Nemotron-3_5-Lightning'

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

function languageName(code) {
  return ({ en: 'English', ja: 'Japanese', es: 'Spanish' })[code] || 'English'
}

function fixedGreeting(language) {
  if (language === 'Japanese') return 'ご担当者様'
  if (language === 'Spanish') return 'Estimado equipo de atención:'
  return 'Dear Support Team,'
}

function contentToText(content) {
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (typeof part?.text === 'string') return part.text
        if (typeof part?.content === 'string') return part.content
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

function balancedJsonObjects(text) {
  const candidates = []

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{') continue

    let depth = 0
    let inString = false
    let escaped = false

    for (let index = start; index < text.length; index += 1) {
      const char = text[index]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }

      if (char === '"') {
        inString = true
      } else if (char === '{') {
        depth += 1
      } else if (char === '}') {
        depth -= 1
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1))
          break
        }
      }
    }
  }

  return candidates
}

function extractJson(content) {
  const text = contentToText(content)
  if (!text.trim()) {
    throw new Error('The AI returned an empty response.')
  }

  const cleaned = text
    .trim()
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()

  const attempts = [cleaned, ...balancedJsonObjects(cleaned)]

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate)

      // Some models return the JSON object as an escaped JSON string.
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed)
        } catch {
          continue
        }
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('The AI response was not valid JSON.')
}

function stringArray(value) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

function normalizeAnalysis(value, model) {
  const facts = Array.isArray(value?.confirmedFacts)
    ? value.confirmedFacts
        .filter(
          (item) =>
            item &&
            typeof item.label === 'string' &&
            typeof item.value === 'string',
        )
        .map((item) => ({
          label: item.label.trim(),
          value: item.value.trim(),
        }))
        .filter((item) => item.label && item.value)
    : []

  return {
    confirmedFacts: facts,
    userStatements: stringArray(value?.userStatements),
    requestedOutcome:
      typeof value?.requestedOutcome === 'string'
        ? value.requestedOutcome.trim()
        : '',
    unconfirmedInformation: stringArray(value?.unconfirmedInformation),
    followUpQuestions: stringArray(value?.followUpQuestions),
    draft: {
      subject:
        typeof value?.draft?.subject === 'string'
          ? value.draft.subject.trim()
          : '',
      body:
        typeof value?.draft?.body === 'string'
          ? value.draft.body.trim()
          : '',
    },
    meta: { mode: 'nebius', model },
  }
}

async function handlePost(request) {
  const apiKey = process.env.NEBIUS_API_KEY

  if (!apiKey) {
    console.error('analyze-case: NEBIUS_API_KEY is not configured')
    return json(
      {
        error:
          'The analysis service is not configured. Add NEBIUS_API_KEY in Vercel and redeploy.',
      },
      500,
    )
  }

  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: 'The request body must be valid JSON.' }, 400)
  }

  const originalMessage =
    typeof input?.originalMessage === 'string'
      ? input.originalMessage.trim()
      : ''
  const userRequest =
    typeof input?.userRequest === 'string' ? input.userRequest.trim() : ''
  const documents = Array.isArray(input?.documents)
    ? input.documents.slice(0, 5)
    : []

  if ((!originalMessage && documents.length === 0) || !userRequest) {
    return json(
      {
        error:
          'An original message or document and the requested outcome are required.',
      },
      400,
    )
  }

  const interfaceLanguage = languageName(input?.interfaceLanguage)
  const recipientLanguage = languageName(input?.recipientLanguage)
  const greeting = fixedGreeting(interfaceLanguage)
  const model = process.env.NEBIUS_MODEL || DEFAULT_MODEL

  const documentSummary = documents.length
    ? documents
        .map(
          (doc, index) =>
            `${index + 1}. ${String(doc?.name || 'Unnamed file')} (${String(
              doc?.type || 'unknown type',
            )}, ${Number(doc?.size || 0)} bytes)`,
        )
        .join('\n')
    : 'No documents were attached.'

  const systemPrompt = `You organize consumer complaints and draft accurate, professional emails.

STRICT SOURCE-SEPARATION RULES:
- confirmedFacts may contain only details explicitly present in ORIGINAL MESSAGE.
- userStatements may contain only events and experiences described in USER'S REQUEST.
- requestedOutcome may contain only actions requested in USER'S REQUEST.
- Do not duplicate requested outcomes in userStatements.
- Do not place user statements in confirmedFacts.
- Attached-file information is metadata only. Never claim to have read its contents.
- Never invent names, dates, amounts, reservation numbers, company details, or document contents.
- Put missing or uncertain details in unconfirmedInformation.

DRAFT RULES:
- Write the draft as the user personally sending the email, in first person.
- Never use third-person labels such as user, customer, guest, claimant, or equivalent terms.
- Use exactly this generic greeting and do not invent a recipient name: ${greeting}
- Preserve all source amounts, currencies, dates, and identifiers exactly.
- Do not add legal claims, compensation demands, deadlines, or accusations.
- Write all analysis fields and the draft in ${interfaceLanguage}.
- Translation to ${recipientLanguage} happens later.
- Return JSON only, with no markdown or commentary.`

  const userPrompt = `Return exactly this JSON structure:
{
  "confirmedFacts": [{"label": "string", "value": "string"}],
  "userStatements": ["string"],
  "requestedOutcome": "string",
  "unconfirmedInformation": ["string"],
  "followUpQuestions": ["string"],
  "draft": {"subject": "string", "body": "string"}
}

ORIGINAL MESSAGE:
${originalMessage || '[Not provided]'}

USER'S REQUEST:
${userRequest}

ATTACHED FILE METADATA ONLY:
${documentSummary}

Interface language: ${interfaceLanguage}
Future recipient language: ${recipientLanguage}`

  try {
    const upstream = await fetch(NEBIUS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    })

    const upstreamText = await upstream.text()
    let upstreamPayload = null

    try {
      upstreamPayload = JSON.parse(upstreamText)
    } catch {
      // The status and a safe generic error are returned below.
    }

    if (!upstream.ok) {
      const detail =
        upstreamPayload?.error?.message ||
        upstreamPayload?.message ||
        upstreamText ||
        `HTTP ${upstream.status}`

      console.error(
        'analyze-case: Nebius request failed',
        upstream.status,
        detail,
      )

      return json(
        {
          error: `The AI analysis service returned an error (${upstream.status}).`,
        },
        502,
      )
    }

    const choice = upstreamPayload?.choices?.[0]
    const content = choice?.message?.content

    let parsed
    try {
      parsed = extractJson(content)
    } catch (parseError) {
      const safePreview = contentToText(content)
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
        .slice(0, 1200)

      console.error('analyze-case: invalid model JSON', {
        finishReason: choice?.finish_reason || 'unknown',
        contentType: Array.isArray(content) ? 'array' : typeof content,
        contentLength: contentToText(content).length,
        preview: safePreview,
      })

      return json(
        {
          error:
            choice?.finish_reason === 'length'
              ? 'The AI response was cut off before completion. Please try again.'
              : 'The AI returned an invalid analysis format. Please try again.',
        },
        502,
      )
    }

    const result = normalizeAnalysis(parsed, model)

    if (
      !result.requestedOutcome ||
      !result.draft.subject ||
      !result.draft.body
    ) {
      console.error('analyze-case: incomplete model result')
      return json(
        { error: 'The AI returned an incomplete analysis. Please try again.' },
        502,
      )
    }

    return json(result)
  } catch (error) {
    console.error('analyze-case: unexpected failure', error)
    return json(
      {
        error:
          'The analysis request failed on the server. Check the Vercel function logs.',
      },
      500,
    )
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          Allow: 'POST, OPTIONS',
        },
      })
    }

    if (request.method !== 'POST') {
      return json(
        { error: 'Method not allowed.' },
        405,
        { Allow: 'POST, OPTIONS' },
      )
    }

    return handlePost(request)
  },
}
