import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const sendJson = (response: ServerResponse, status: number, payload: unknown) => {
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
      outcome: '利用者が希望する対応を明確にし、企業へ伝える。',
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
        { label: 'Fuentes recibidas', value: 'Mensaje original y explicación del usuario' },
        { label: 'Documentos', value: 'Nombres y metadatos recibidos' },
      ],
      statements: [requestText || 'La explicación del usuario aparecerá aquí.'],
      outcome: 'Comunicar claramente a la empresa la solución solicitada.',
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
      { label: 'Sources received', value: 'Original message and user explanation' },
      { label: 'Documents', value: 'File names and metadata received' },
    ],
    statements: [requestText || 'The user explanation will be organized here.'],
    outcome: 'Clearly communicate the requested resolution to the company.',
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

const teltruvaApiPlugin = (env: Record<string, string>): Plugin => ({
  name: 'teltruva-local-api',
  configureServer(server) {
    server.middlewares.use('/api/analyze-case', async (request, response) => {
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed.' })
        return
      }

      try {
        const body = await readJsonBody(request)

        if (!body.userRequest?.trim()) {
          sendJson(response, 400, { error: 'A requested outcome is required.' })
          return
        }

        // Today this endpoint returns a safe mock response.
        // After NEBIUS_API_KEY is available, replace mockAnalyzeCase with
        // an OpenAI-compatible call to Nebius Token Factory.
        const result = mockAnalyzeCase(body)
        sendJson(response, 200, result)
      } catch (error) {
        console.error('Teltruva analysis error:', error)
        sendJson(response, 500, { error: 'The case could not be organized.' })
      }
    })
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), teltruvaApiPlugin(env)],
  }
})
