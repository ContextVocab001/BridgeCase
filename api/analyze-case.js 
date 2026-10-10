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

function extractJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('The AI returned an empty response.')
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error('The AI response was not valid JSON.')
  }
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
        max_tokens: 1800,
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

    const content = upstreamPayload?.choices?.[0]?.message?.content
    const parsed = extractJson(content)
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
