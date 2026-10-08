import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const NEBIUS_API_BASE_URL = 'https://api.tokenfactory.nebius.com/v1'
const NEBIUS_TEST_MODEL = 'nvidia/Nemotron-3_5-Lightning'

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const sendJson = (
  response: ServerResponse,
  status: number,
  payload: unknown,
) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

const pickLanguageCopy = (language: string, requestText: string) => {
  if (language === 'ja') {
    return {
      facts: [
        { label: '入力元', value: '元のメッセージと利用者の説明' },
        { label: '関連資料', value: 'ファイル名と基本情報を受信済み' },
      ],
      statements: [
        requestText || '利用者が入力した説明をここへ整理します。',
      ],
      outcome: '利用者が希望する対応を明確にし、相手先へ伝える。',
      unknown: [
        '資料本文の読み取りはOCR接続後に有効になります。',
        '請求額や日付は現在のモック処理では確定しません。',
      ],
      subject: '請求内容の確認と対応のお願い',
      body: `ご担当者様

請求内容について確認をお願いしたく、ご連絡いたしました。

${requestText || '入力した問題の内容を、AIが丁寧な文章へ整理します。'}

内容をご確認のうえ、適切な対応をお願いいたします。

よろしくお願いいたします。`,
    }
  }

  if (language === 'es') {
    return {
      facts: [
        {
          label: 'Fuentes recibidas',
          value: 'Mensaje original y explicación del usuario',
        },
        {
          label: 'Documentos',
          value: 'Nombres y metadatos recibidos',
        },
      ],
      statements: [
        requestText || 'La explicación del usuario aparecerá aquí.',
      ],
      outcome: 'Comunicar claramente al destinatario la solución solicitada.',
      unknown: [
        'La lectura del contenido de los documentos se activará al conectar OCR.',
        'Los importes y las fechas no se confirman en el modo de prueba.',
      ],
      subject: 'Solicitud de revisión del cargo',
      body: `Estimado equipo de atención:

Me pongo en contacto para solicitar una revisión del cargo.

${requestText || 'La IA convertirá la explicación del usuario en un mensaje profesional.'}

Les agradecería que revisaran la información y ofrecieran una solución adecuada.

Gracias por su ayuda.`,
    }
  }

  return {
    facts: [
      {
        label: 'Sources received',
        value: 'Original message and user explanation',
      },
      {
        label: 'Documents',
        value: 'File names and metadata received',
      },
    ],
    statements: [
      requestText || 'The user explanation will be organized here.',
    ],
    outcome: 'Clearly communicate the requested resolution to the recipient.',
    unknown: [
      'Document contents will be available after OCR is connected.',
      'Amounts and dates are not confirmed in mock mode.',
    ],
    subject: 'Request to review a disputed charge',
    body: `Dear Support Team,

I am contacting you to request a review of a disputed charge.

${requestText || 'AI will turn the user explanation into a professional message.'}

Please review the information and provide an appropriate resolution.

Thank you for your assistance.`,
  }
}

const mockAnalyzeCase = (body: any) => {
  const copy = pickLanguageCopy(body.interfaceLanguage, body.userRequest)

  return {
    confirmedFacts: copy.facts,
    userStatements: copy.statements,
    requestedOutcome: copy.outcome,
    unconfirmedInformation: copy.unknown,
    followUpQuestions: [],
    draft: {
      subject: copy.subject,
      body: copy.body,
    },
    meta: {
      mode: 'mock',
    },
  }
}

const getNebiusStatus = async (apiKey: string) => {
  if (!apiKey) {
    return {
      status: 503,
      payload: {
        configured: false,
        connected: false,
        message: 'NEBIUS_API_KEY is not available to the Vite server.',
      },
    }
  }

  try {
    const nebiusResponse = await fetch(`${NEBIUS_API_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!nebiusResponse.ok) {
      return {
        status: 502,
        payload: {
          configured: true,
          connected: false,
          upstreamStatus: nebiusResponse.status,
          message: 'Nebius received the request but did not accept it.',
        },
      }
    }

    const data = (await nebiusResponse.json()) as {
      data?: Array<{ id?: string }>
    }

    const modelIds = Array.isArray(data.data)
      ? data.data
          .map((model) => model.id)
          .filter((id): id is string => Boolean(id))
      : []

    const nvidiaModels = modelIds
      .filter((id) => id.toLowerCase().includes('nvidia'))
      .slice(0, 20)

    return {
      status: 200,
      payload: {
        configured: true,
        connected: true,
        modelCount: modelIds.length,
        nvidiaModels,
      },
    }
  } catch (error) {
    console.error('Nebius connection error:', error)

    return {
      status: 502,
      payload: {
        configured: true,
        connected: false,
        message: 'The Vite server could not reach Nebius Token Factory.',
      },
    }
  }
}

const runNebiusInferenceTest = async (apiKey: string) => {
  if (!apiKey) {
    return {
      status: 503,
      payload: {
        success: false,
        configured: false,
        message: 'NEBIUS_API_KEY is not available to the Vite server.',
      },
    }
  }

  try {
    const nebiusResponse = await fetch(
      `${NEBIUS_API_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: NEBIUS_TEST_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'Follow the user instruction exactly. Return only the requested text.',
            },
            {
              role: 'user',
              content: 'Reply with exactly: Teltruva connection successful',
            },
          ],
          temperature: 0,
          max_tokens: 30,
          stream: false,
        }),
      },
    )

    const responseText = await nebiusResponse.text()

    if (!nebiusResponse.ok) {
      console.error(
        'Nebius inference test failed:',
        nebiusResponse.status,
        responseText,
      )

      return {
        status: 502,
        payload: {
          success: false,
          configured: true,
          connected: true,
          upstreamStatus: nebiusResponse.status,
          model: NEBIUS_TEST_MODEL,
          message: 'Nebius received the inference request but did not accept it.',
        },
      }
    }

    const data = JSON.parse(responseText) as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
      }
    }

    const modelResponse = data.choices?.[0]?.message?.content?.trim() || ''

    if (!modelResponse) {
      return {
        status: 502,
        payload: {
          success: false,
          configured: true,
          connected: true,
          model: NEBIUS_TEST_MODEL,
          message: 'Nebius returned a response without assistant text.',
        },
      }
    }

    return {
      status: 200,
      payload: {
        success: true,
        configured: true,
        connected: true,
        model: NEBIUS_TEST_MODEL,
        response: modelResponse,
        usage: data.usage || null,
      },
    }
  } catch (error) {
    console.error('Nebius inference test error:', error)

    return {
      status: 502,
      payload: {
        success: false,
        configured: true,
        connected: false,
        model: NEBIUS_TEST_MODEL,
        message: 'The Vite server could not complete the Nemotron test.',
      },
    }
  }
}

const teltruvaApiPlugin = (env: Record<string, string>): Plugin => {
  const apiKey = env.NEBIUS_API_KEY || process.env.NEBIUS_API_KEY || ''

  return {
    name: 'teltruva-local-api',

    configureServer(server) {
      server.middlewares.use(
        '/api/nebius-status',
        async (request, response) => {
          if (request.method !== 'GET') {
            sendJson(response, 405, { error: 'Method not allowed.' })
            return
          }

          const result = await getNebiusStatus(apiKey)
          sendJson(response, result.status, result.payload)
        },
      )

      server.middlewares.use(
        '/api/nebius-test',
        async (request, response) => {
          if (request.method !== 'GET') {
            sendJson(response, 405, { error: 'Method not allowed.' })
            return
          }

          const result = await runNebiusInferenceTest(apiKey)
          sendJson(response, result.status, result.payload)
        },
      )

      server.middlewares.use(
        '/api/analyze-case',
        async (request, response) => {
          if (request.method !== 'POST') {
            sendJson(response, 405, { error: 'Method not allowed.' })
            return
          }

          try {
            const body = await readJsonBody(request)

            if (!body.userRequest?.trim()) {
              sendJson(response, 400, {
                error: 'A requested outcome is required.',
              })
              return
            }

            // Keep case analysis in safe mock mode until the minimal
            // Nemotron inference test succeeds.
            const result = mockAnalyzeCase(body)
            sendJson(response, 200, result)
          } catch (error) {
            console.error('Teltruva analysis error:', error)
            sendJson(response, 500, {
              error: 'The case could not be organized.',
            })
          }
        },
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), teltruvaApiPlugin(env)],
  }
})
