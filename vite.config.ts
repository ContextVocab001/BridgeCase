import axios from 'axios'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const NEBIUS_API_BASE_URL = 'https://api.tokenfactory.nebius.com/v1'
const NEBIUS_TEST_MODEL = 'nvidia/Nemotron-3_5-Lightning'
const NVIDIA_OCR_URL =
  'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2'
const OCR_TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAABLAAAAEsCAIAAABc390HAAATEklEQVR4nO3de5BWdf3A8bPL5sJGwzqAAxqOwQxMuLmwgIaw7lKCBNJCIWOSA0Q2jIowNCEViTOWC2GWF7KgEHGaoUTIabkqISaBTIMIruCFbriGEhPLLVjYPb8/ntzhtzcXxRz6vF5/ned8z3nO93v46z3nPEtWmqYJAAAA8WR/1BMAAADgoyEIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAI6vwIwpUrV5aWlpaWlubk5GQ2li9fnpeXV/qu+++/P0mS/Pz8Vp5VUlJSVFS0adOmBmdltmfOnPnLX/6yfuewYcNeeumlJEl+8Ytf5Obmvv3222de5dFHH+3Xr9/AgQP79ev32GOPZXYuWrSoqKiopKRk5MiR+/bty+xsfOnWL2379u3Dhg0bMmTI0KFD9+3b1+RZ5/KOAwAAAWSlafpRz+Es5OfnHzp0qPF2c3taOGvXrl3jx4/fuXNn49HnnnvuwQcfzCTW0aNH+/fvv2fPniRJysrKevbs2bt370mTJmWOX7du3T333FNRUZE58frrr7/77rvTNC0vL1+1alW7du3WrFlz3333bdiwoclLt35pffr0qaio+OQnP/nkk0/+5je/+fWvf93ykgEAAN7T+fGE8MNQUFBQVVXV5NCgQYNefPHF06dPJ0nyzDPPDB8+PEmS48ePHzt27Otf/3pFRUX9kfPnz58/f37muWJ+fv4Pf/jDefPm3Xfffffee2+7du2SJPnCF77Qo0ePU6dOtfLSzXnnnXdOnDiRJMkXv/jF22+//azOBQAAaFLcIFy/fv3nPve5JofatGnz2c9+duvWrUmSrFq1qqysLEmSdevWDR8+vFevXn/9619ramoyR+7evbtv3771JxYVFb3yyiuVlZVn7ly4cOHHPvaxVl66Offee29xcfHkyZOff/754uLiszoXAACgSTkf9QTev5qamtLS0sx2eXn5wIEDW3/WqVOn9uzZU1lZ2dxho0aNWrNmzeDBg7du3frII48kSfLUU0/t2LFj+fLlb7311qZNm4YOHdr4rDRNs7KyamtrP8ilm1zaxIkTy8rKfvvb306fPn3MmDF33313axYLAADQgvP4CeEFF1zw7LtaWYP1Z23evPnOO+9csmRJkiTZ2dmZhDt9+nROzn8Kefjw4Rs2bHjxxRf79u2bk5NTW1v72muv7dixY+vWrUuWLKl/a7R3797bt2+v//Lt27dffvnlPXv23LFjR2ZPmqYTJkxo7tKtXNqBAwf++Mc/XnjhhZMmTXrmmWd+9rOftfYeAQAANO88DsIPaOjQodu2bUuSZMCAAU8//XSSJOvWrRswYEBmND8/Py8vb/HixaNHj06SZPPmzYWFhZmh4uLi9evXZ7a/9a1vzZw5s7q6OkmSQ4cO3XnnnTNnzrz11ltnz5598uTJJEmWLVuW2Wjy0q2UlZU1bty4zF8rPXjw4KWXXvr+lw0AAPCu/5FXRgcOHFheXl5TUzN48ODMnkGDBs2bN6+F03v16rVz5866urqHHnrolltuKS8vT5Jk0aJF9Qdcf/31c+bMmTt3bpIkTz31VP2v/vLy8i666KLdu3d/+tOfHjZs2JtvvjlkyJDc3NyampqpU6d+/vOfT5Lk9ddf79evX+fOnS+66KIFCxY0d+ns7KaDvPHSFi5ceMMNN7Rr165NmzaLFy8+qxsFAADQpPPsv50AAADgXIn7yigAAEBwghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIefS3LlzP+opAAAArXXeBGFeXl5paWlJSUlRUdGmTZs+1GtlqqaysvKRRx4523Pz8/Mbf1y5cmVpaWlpaWlOTk5mY/ny5Q2OPNPixYuLi4v79Omzfv36JEmqq6tHjx49ePDg0aNHV1dXJ0myYcOGq6++esiQIcXFxVu2bDnz3NWrV7dr1y6zfejQoYkTJ3bo0KG5CzU5sQbHNNd4DeZ/+PDh73//+3fdddcPfvCDkydPNjeBBnuefvrp7t27Zy49e/bs5uYJAAB8GLLSNP2o59Aq+fn5hw4dSpJk165d48eP37lz53/hWh/83BY+NneVAwcOjB07duPGja+99tqYMWN27949c+bMLl26zJgx40c/+tGBAwfmzp172WWXbdy48VOf+tTevXtHjRr1yiuvZM49cuTIdddd9/LLLx8+fDhJkuLi4nHjxn3ve997z+W0sOTmhhrsHzly5IgRI77zne/MmjVr//79DzzwQJMTaLDn8ccfP3bs2JQpU1qeHgAA8GE4b54Q1isoKKiqqvrXv/711a9+9dprr73mmmu2bduWJMlDDz3Ut2/foqKi9evXNx5NkiQ/P3/SpEkPPvhgnz59qqqqkiQ5efJkz549d+3aNXjw4IKCgh//+MdJksyZM+fo0aPDhg1L3n0Itn///hEjRlxzzTUjRozYv39/Zv93v/vdkpKSwsLClStXntsFHjx48Pbbb8/Ozu7WrdvBgweTJFm9evWNN96YJMmNN964atWqJEk6duyYGTp48OCxY8fqz501a9b06dOzs//zz/rEE09MnTr1rK7eYLH1d6OysvLMu9TYCy+8MGHChKysrGnTpvXq1au5CTTY849//KNr165nNUMAAOCcSc8THTp0yGysXbt27NixkydP3rp1a5qmf/vb3woLC9M07dy58+HDh3fv3n3zzTc3Hk3TtG3btmvXrk3T9J577vnpT3+apumaNWumTp06ZcqU55577uDBg127dm1wrczGTTfdtHTp0jRNly5dOn78+DRN27Vrd//996dpunfv3m7dujU5z/f82GCosSVLlnzta19L07RTp061tbVpmtbW1nbu3DlN023btuXm5hYUFOTm5v7ud7/LHP+HP/xh9OjR7zmHJtUf03ixmaEW7lLG2LFjb7jhhry8vAMHDjT35Y33TJ8+/ZZbbhk0aNCoUaPeeOON95wnAABwDp03r4zm5eVdeeWVp06d2rNnT2Vl5YABA3r06JEZqqqq2rNnz+TJk6urq2+99dahQ4d269atwWibNm3at29/+PDh7OzsV199ddq0aWvXrr3tttu+8pWvFBYWLlu27I033liwYMHRo0eTM16GzGxccsklf/7zn3Nzc0+ePNm9e/eqqqq2bdvu378/8/ywQ4cOmd/1nTnP+o/btm07fvx4/ccWXhmdPXv2888/P23atDFjxiRJsnfv3rKyso0bN3bu3Llz585vv/12dnZ2XV1dly5d3nnnnZKSkjvuuOPLX/7yE088sWbNmsWLF588ebKkpGTFihUXX3xxy6+tNqn+mMaLzQwdOXKkubuUUVNT8/Of/3zGjBkdO3Z8+OGHx44d28IE6vfMmDGjR48et91224oVKx5++OHf//73Lc8TAAA4lz7qIm2t+mdK8+bNKy8v79Kly7///e80TWtrazdt2pQZ2rRp05gxYyZOnNjk6JnPqfr3719dXT1w4MC6urrrrrtu4cKF+/bt+8QnPtHgyMxG165dT5w4kabpiRMnLr744jRN649Mz+aRYNrqJ4RHjhzp169f5iFnmqaXX355VVVVmqZvvvlmQUFBmqYXXnhh5pnh6dOnO3bsmKbpr371q969e5eUlJSUlLRp0+bmm29uzYUaH9N4sZmhFu5Sg+95+eWXL7300uZW3WDPX/7yl9OnT2cW0qlTp/ecJwAAcA6df78hHDp06LZt2wYNGpT58d6aNWvKy8urq6tLSkoGDhz4+OOPr169usFo4y8pKyubO3fulVdemZWV9ac//WncuHEnTpyo/9uYdXV1dXV19QcPGTIk87c3ly9fXlpamiRJ/Y/0Pgxpmk6YMOGb3/zmVVddldkzYsSIZcuWJUmybNmyESNGJEnSq1evzZs3J0myZcuWyy67LEmSm266qbKy8tlnn3322Wfbt2+/dOnS93f1xovN3I3Gd6mB0tLSmpqaJEkuueSSCy64oJWXmzVrVkVFRZIkL7zwwmc+85n3N2cAAOD9OW9eGa1/yfD48eNXXHHFhg0bpkyZcvz48ZycnEWLFnXv3n3+/PnLli2rq6ubPHlyWVnZN77xjTNHk///4uKrr756xRVXbNy48eqrr77rrruefPLJwsLCDRs2/P3vf8/NzR05cmRWVlZFRUXmlLfeemvy5MnHjh37+Mc/vnjx4q5du7bw5mfrP+bl5RUVFWW2Bw0aNG/evMz2o48+OnXq1P79+ydJ0r59+4qKiurq6gkTJvzzn//s1KnTY4891qFDh5deeumOO+5IkiQrK+snP/lJnz59mrxXTX5s+fY2XmzmbhQVFTW4SwMGDPjSl7707W9/O/MNK1aseOCBB7Zs2XLVVVfNmTPn2muvbWEC9Xtef/31SZMm5eTktG3bdsGCBfUv+gIAAP8F500Qcl74IP9jBwAA8F8mCAEAAII6/35DCAAAwDkhCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABDU/wFmigujRPS2WQAAAABJRU5ErkJggg=='

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


const extractJsonObject = (text: string) => {
  const trimmed = text.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fencedMatch?.[1]?.trim() || trimmed

  try {
    return JSON.parse(candidate)
  } catch {
    const firstBrace = candidate.indexOf('{')
    const lastBrace = candidate.lastIndexOf('}')

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1))
    }

    throw new Error('No valid JSON object was found in the model response.')
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
              role: 'user',
              content: 'Reply with exactly: Teltruva connection successful',
            },
          ],
          temperature: 0,
          max_tokens: 120,
          stream: false,
          extra_body: {
            chat_template_kwargs: { enable_thinking: false },
          },
        }),
      },
    )

    const responseText = await nebiusResponse.text()

    if (!nebiusResponse.ok) {
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
      choices?: Array<{ message?: { content?: string } }>
      usage?: Record<string, unknown>
    }

    return {
      status: 200,
      payload: {
        success: true,
        configured: true,
        connected: true,
        model: NEBIUS_TEST_MODEL,
        response: data.choices?.[0]?.message?.content?.trim() || '',
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

const runNebiusCaseJsonTest = async (apiKey: string) => {
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

  const sampleCase = {
    originalMessage: 'The hotel final bill includes a $50 parking charge.',
    userRequest:
      'I did not use the hotel parking lot. I told the front desk, and they said I would not be charged. The fee still appeared on my final bill. I want the full parking charge refunded.',
  }

  const systemPrompt = `You organize cross-border consumer complaints.
Return one valid JSON object and no other text.

SOURCE SEPARATION RULES:
1. confirmedFacts may contain ONLY information explicitly stated in the Original message or extracted documents.
2. Never place a claim from User explanation in confirmedFacts, even when it sounds plausible.
3. Never place the requested remedy in confirmedFacts. requestedOutcome is the only field for what the user wants.
4. userStatements must contain claims made by the user that are not independently confirmed by the Original message or documents.
5. unconfirmedInformation must contain facts needed to resolve the case that neither source confirms.
6. Do not infer, combine, strengthen, or invent facts.
7. Do not call a charge unauthorized, fraudulent, illegal, or deceptive unless the Original message or documents explicitly use that description.
8. Use neutral wording in the draft. Ask the recipient to review the charge and provide the requested remedy.
9. The draft may present userStatements as the user's account, but must not present them as documented facts.
10. Preserve exact amounts, currencies, dates, and reference numbers.

For this test, the only confirmed fact should be the $50 parking charge shown on the final bill.
The statements about not parking, speaking with the front desk, and being told there would be no charge are userStatements.
The refund request belongs only in requestedOutcome.

Use concise professional English.

Required JSON schema:
{
  "confirmedFacts": [{ "label": "string", "value": "string" }],
  "userStatements": ["string"],
  "requestedOutcome": "string",
  "unconfirmedInformation": ["string"],
  "followUpQuestions": ["string"],
  "draft": {
    "subject": "string",
    "body": "string"
  }
}`

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
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Organize this case.\n\nOriginal message:\n${sampleCase.originalMessage}\n\nUser explanation and requested outcome:\n${sampleCase.userRequest}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          top_p: 0.95,
          max_tokens: 1200,
          stream: false,
          extra_body: {
            chat_template_kwargs: { enable_thinking: false },
          },
        }),
      },
    )

    const responseText = await nebiusResponse.text()

    if (!nebiusResponse.ok) {
      console.error('Nebius case JSON test failed:', nebiusResponse.status, responseText)
      return {
        status: 502,
        payload: {
          success: false,
          configured: true,
          connected: true,
          upstreamStatus: nebiusResponse.status,
          model: NEBIUS_TEST_MODEL,
          message: 'Nebius received the case test but did not accept it.',
        },
      }
    }

    const data = JSON.parse(responseText) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: Record<string, unknown>
    }

    const content = data.choices?.[0]?.message?.content?.trim() || ''
    const analysis = extractJsonObject(content)

    return {
      status: 200,
      payload: {
        success: true,
        configured: true,
        connected: true,
        model: NEBIUS_TEST_MODEL,
        testCase: sampleCase,
        analysis,
        usage: data.usage || null,
      },
    }
  } catch (error) {
    console.error('Nebius case JSON test error:', error)
    return {
      status: 502,
      payload: {
        success: false,
        configured: true,
        connected: false,
        model: NEBIUS_TEST_MODEL,
        message:
          error instanceof Error
            ? error.message
            : 'The Vite server could not complete the case JSON test.',
      },
    }
  }
}


const getLanguageName = (language: string) => {
  if (language === 'ja') return 'Japanese'
  if (language === 'es') return 'Spanish'
  return 'English'
}

const validateCaseAnalysis = (value: any) => {
  if (!value || typeof value !== 'object') {
    throw new Error('The model did not return a JSON object.')
  }

  if (!Array.isArray(value.confirmedFacts)) {
    throw new Error('confirmedFacts must be an array.')
  }

  if (!Array.isArray(value.userStatements)) {
    throw new Error('userStatements must be an array.')
  }

  if (typeof value.requestedOutcome !== 'string') {
    throw new Error('requestedOutcome must be a string.')
  }

  if (!Array.isArray(value.unconfirmedInformation)) {
    throw new Error('unconfirmedInformation must be an array.')
  }

  if (!Array.isArray(value.followUpQuestions)) {
    throw new Error('followUpQuestions must be an array.')
  }

  if (
    !value.draft ||
    typeof value.draft.subject !== 'string' ||
    typeof value.draft.body !== 'string'
  ) {
    throw new Error('draft.subject and draft.body must be strings.')
  }

  return {
    confirmedFacts: value.confirmedFacts
      .filter(
        (fact: any) =>
          fact &&
          typeof fact.label === 'string' &&
          typeof fact.value === 'string',
      )
      .map((fact: any) => ({
        label: fact.label.trim(),
        value: fact.value.trim(),
      })),
    userStatements: value.userStatements
      .filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean),
    requestedOutcome: value.requestedOutcome.trim(),
    unconfirmedInformation: value.unconfirmedInformation
      .filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean),
    followUpQuestions: value.followUpQuestions
      .filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean),
    draft: {
      subject: value.draft.subject.trim(),
      body: value.draft.body.trim(),
    },
  }
}


const generateFirstPersonReviewDraft = async (
  apiKey: string,
  interfaceLanguage: string,
  originalMessage: string,
  userRequest: string,
) => {
  const systemPrompt = `You create a user-reviewable consumer email for Teltruva.
Return exactly one valid JSON object and no other text.
Write the subject and body in ${interfaceLanguage}.

The user is the sender. Write the complete email in first-person singular.
Never call the sender "the user", "the customer", "the guest", "利用者", "ユーザー", "el usuario", or any other third-person label.
Never invent or infer a hotel name, company name, brand, property name, department name, employee name, recipient name, or sender name.
Even if the business type is obvious, do not create a proper noun.
The greeting is fixed and must be exactly:
- Japanese: ご担当者様
- English: Dear Support Team,
- Spanish: Estimado equipo de atención:
Do not replace the fixed greeting with a guessed organization or department.
Japanese: write natural business Japanese from the sender's perspective. Prefer short, direct forms such as "私は10月3日から6日まで、3泊しました。", "私は駐車場を利用していません。", "フロントから、駐車料金は請求されないとの説明を受けました。", and "115ドルの返金を希望します。" Do not use awkward honorific self-reference such as "ご利用いたしました". Do not use "〜としています", "〜とのことです", or third-person report style.
English: use "I", "me", and "my". Do not use "the user says" or "the guest states".
Spanish: use first-person wording such as "No utilicé...", "Informé...", and "Solicito...". Do not use "el usuario dice" or "la persona usuaria".

Preserve all exact amounts, currencies, dates, names, and reference numbers.
Treat unverified events as the sender's own account, not as independently proven facts.
Do not invent evidence, admissions, compensation, deadlines, threats, legal claims, or remedies.
Include only the remedies requested by the user.
Use neutral, professional, cooperative wording.
Do not translate into the recipient's language yet.
Include an appropriate greeting and closing.

Required JSON schema:
{
  "subject": "string",
  "body": "string"
}`

  const userPrompt = `Create the email from these sources.

ORIGINAL MESSAGE:
${originalMessage || '[Not provided]'}

USER EXPLANATION AND REQUEST:
${userRequest || '[Not provided]'}`

  const response = await fetch(`${NEBIUS_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NEBIUS_TEST_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      top_p: 0.95,
      max_tokens: 1400,
      stream: false,
      extra_body: {
        chat_template_kwargs: { enable_thinking: false },
      },
    }),
  })

  const responseText = await response.text()

  if (!response.ok) {
    console.error('Nebius first-person draft generation failed:', response.status, responseText)
    throw new Error(`Nebius rejected the draft request (${response.status}).`)
  }

  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim() || ''
  const parsed = extractJsonObject(content) as {
    subject?: unknown
    body?: unknown
  }

  if (typeof parsed.subject !== 'string' || typeof parsed.body !== 'string') {
    throw new Error('Nemotron did not return a valid first-person draft.')
  }

  return {
    subject: parsed.subject.trim(),
    body: parsed.body.trim(),
  }
}

const analyzeCaseWithNebius = async (apiKey: string, body: any) => {
  if (!apiKey) {
    throw new Error('NEBIUS_API_KEY is not configured.')
  }

  const interfaceLanguage = getLanguageName(body.interfaceLanguage)
  const recipientLanguage = getLanguageName(body.recipientLanguage)
  const originalMessage = String(body.originalMessage || '').trim()
  const userRequest = String(body.userRequest || '').trim()
  const documents = Array.isArray(body.documents) ? body.documents : []

  const documentMetadata = documents.length
    ? documents
        .map((file: any, index: number) => {
          const name = typeof file?.name === 'string' ? file.name : `File ${index + 1}`
          const type = typeof file?.type === 'string' ? file.type : 'unknown type'
          const size = typeof file?.size === 'number' ? `${file.size} bytes` : 'unknown size'
          return `- ${name} (${type}, ${size})`
        })
        .join('\n')
    : 'No document metadata was provided.'

  const systemPrompt = `You are the case-organization engine for Teltruva, a user-controlled multilingual communication service.
Return exactly one valid JSON object and no other text.

Your output language must be ${interfaceLanguage}.
The eventual recipient language is ${recipientLanguage}, but the draft in this response must remain in ${interfaceLanguage} so the user can review it before translation.

SOURCE SEPARATION RULES:
1. confirmedFacts may contain ONLY information explicitly stated in the Original message. Document filenames, file types, and file sizes are metadata, not evidence of their contents.
2. Never place claims from User explanation in confirmedFacts unless the Original message independently confirms the same information.
3. Never place the requested remedy in confirmedFacts. requestedOutcome is the only field for what the user wants.
4. userStatements must contain only relevant events and claims made by the user that are not independently confirmed by the Original message. Do not include requests, desired remedies, or follow-up requests in userStatements; place them only in requestedOutcome.
5. unconfirmedInformation must contain important information that neither source confirms, including document contents that have not yet been read by OCR.
6. Do not infer, combine, strengthen, or invent facts.
7. Do not call a charge unauthorized, fraudulent, illegal, deceptive, or proven incorrect unless the Original message explicitly establishes that characterization.
8. Preserve exact amounts, currencies, dates, names, and reference numbers. Never manufacture missing details.
9. If Original message is empty, confirmedFacts must be empty unless another text source explicitly confirms a fact.
10. If files are listed but their contents are unavailable, say document contents are not yet confirmed. Do not claim to have read them.

DRAFT RULES:
1. Return a minimal placeholder draft object because a dedicated second step will generate the final user-facing email. Use an empty subject and empty body if needed.
2. If you do provide draft text, write a complete, concise, professional email in ${interfaceLanguage} from the user's own point of view.
3. The user is the sender. Use first-person singular throughout the email.
3. Never describe the sender as "the user", "the customer", "the guest", "利用者", "ユーザー", "el usuario", or any other third-person label.
4. Japanese: use natural first-person wording such as "私は〜しました", "〜と説明を受けました", and "〜を希望します". Do not use "〜としています", "〜とのことです", or third-person case-summary language.
5. English: use "I", "me", and "my". Do not write "the user says" or "the guest states".
6. Spanish: use natural first-person wording such as "No utilicé...", "Informé...", and "Solicito...". Do not write "el usuario dice", "la persona usuaria", or third-person case-summary language.
7. Present uncertain information as the sender's own recollection or account, without claiming independent proof.
8. Use neutral wording and request only the remedy requested by the user.
9. Do not add compensation, threats, deadlines, legal claims, or remedies the user did not request.
10. Do not mention Teltruva, AI, the analysis process, confirmedFacts, userStatements, or the JSON fields in the email.
11. The email must include an appropriate greeting and closing and must be understandable to the user before translation.

Required JSON schema:
{
  "confirmedFacts": [{ "label": "string", "value": "string" }],
  "userStatements": ["string"],
  "requestedOutcome": "string",
  "unconfirmedInformation": ["string"],
  "followUpQuestions": ["string"],
  "draft": {
    "subject": "string",
    "body": "string"
  }
}`

  const userPrompt = `Organize the following case without inventing information.

ORIGINAL MESSAGE:
${originalMessage || '[Not provided]'}

USER EXPLANATION AND REQUEST:
${userRequest || '[Not provided]'}

UPLOADED FILE METADATA ONLY (file contents have not been read):
${documentMetadata}`

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        top_p: 0.95,
        max_tokens: 1800,
        stream: false,
        extra_body: {
          chat_template_kwargs: { enable_thinking: false },
        },
      }),
    },
  )

  const responseText = await nebiusResponse.text()

  if (!nebiusResponse.ok) {
    console.error(
      'Nebius live case analysis failed:',
      nebiusResponse.status,
      responseText,
    )
    throw new Error(`Nebius rejected the analysis request (${nebiusResponse.status}).`)
  }

  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: Record<string, unknown>
  }

  const content = data.choices?.[0]?.message?.content?.trim() || ''
  const parsed = extractJsonObject(content) as any

  // Always create the user-facing email with a separate, stricter prompt.
  // Case analysis remains neutral; the email must be written by the sender.
  parsed.draft = await generateFirstPersonReviewDraft(
    apiKey,
    interfaceLanguage,
    originalMessage,
    userRequest,
  )

  const analysis = validateCaseAnalysis(parsed)

  return {
    ...analysis,
    meta: {
      mode: 'nebius',
      model: NEBIUS_TEST_MODEL,
      usage: data.usage || null,
      documentContentsAnalyzed: false,
    },
  }
}


const collectOcrText = (payload: any) => {
  const texts: string[] = []
  const detections: Array<{
    text: string
    confidence: number | null
  }> = []

  const pages = Array.isArray(payload?.data) ? payload.data : []

  for (const page of pages) {
    const pageDetections = Array.isArray(page?.text_detections)
      ? page.text_detections
      : []

    for (const detection of pageDetections) {
      const text = String(detection?.text_prediction?.text || '').trim()
      if (!text) continue

      const rawConfidence = detection?.text_prediction?.confidence
      const confidence =
        typeof rawConfidence === 'number' ? rawConfidence : null

      texts.push(text)
      detections.push({ text, confidence })
    }
  }

  return {
    text: texts.join('\n'),
    detections,
  }
}

const runNvidiaOcr = async (
  apiKey: string,
  imageDataUrl: string,
  mergeLevel = 'paragraph',
) => {
  if (!apiKey) {
    return {
      status: 503,
      payload: {
        success: false,
        configured: false,
        connected: false,
        message: 'NVIDIA_API_KEY is not available to the Vite server.',
      },
    }
  }

  if (!/^data:image\/(png|jpeg);base64,/i.test(imageDataUrl)) {
    return {
      status: 400,
      payload: {
        success: false,
        configured: true,
        connected: false,
        message: 'OCR currently accepts PNG or JPEG data URLs only.',
      },
    }
  }

  try {
    const nvidiaResponse = await axios.post(
      NVIDIA_OCR_URL,
      {
        input: [
          {
            type: 'image_url',
            url: imageDataUrl,
          },
        ],
        merge_levels: [mergeLevel],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      },
    )

    if (nvidiaResponse.status < 200 || nvidiaResponse.status >= 300) {
      return {
        status: nvidiaResponse.status,
        payload: {
          success: false,
          configured: true,
          connected: true,
          upstreamStatus: nvidiaResponse.status,
          message: 'NVIDIA received the OCR request but did not accept it.',
          upstreamBody: JSON.stringify(nvidiaResponse.data).slice(0, 1000),
        },
      }
    }

    const data = nvidiaResponse.data
    const extracted = collectOcrText(data)

    return {
      status: 200,
      payload: {
        success: true,
        configured: true,
        connected: true,
        model: data?.model || 'nvidia/nemotron-ocr-v2',
        text: extracted.text,
        detections: extracted.detections,
        usage: data?.usage || null,
      },
    }
  } catch (error) {
    console.error('NVIDIA OCR connection error:', error)

    const errorCode =
      axios.isAxiosError(error) && typeof error.code === 'string'
        ? error.code
        : null
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown OCR connection error.'

    return {
      status: 502,
      payload: {
        success: false,
        configured: true,
        connected: false,
        transport: 'axios',
        errorCode,
        message: 'The Vite server could not complete the NVIDIA OCR request.',
        detail: errorMessage,
      },
    }
  }
}


const teltruvaApiPlugin = (env: Record<string, string>): Plugin => {
  const apiKey = env.NEBIUS_API_KEY || process.env.NEBIUS_API_KEY || ''
  const nvidiaApiKey =
    env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY || ''

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
        '/api/nebius-case-test',
        async (request, response) => {
          if (request.method !== 'GET') {
            sendJson(response, 405, { error: 'Method not allowed.' })
            return
          }

          const result = await runNebiusCaseJsonTest(apiKey)
          sendJson(response, result.status, result.payload)
        },
      )


      server.middlewares.use(
        '/api/nvidia-ocr-status',
        async (request, response) => {
          if (request.method !== 'GET') {
            sendJson(response, 405, { error: 'Method not allowed.' })
            return
          }

          sendJson(response, 200, {
            configured: Boolean(nvidiaApiKey),
            endpoint: NVIDIA_OCR_URL,
          })
        },
      )

      server.middlewares.use(
        '/api/nvidia-ocr-test',
        async (request, response) => {
          if (request.method !== 'GET' && request.method !== 'POST') {
            sendJson(response, 405, { error: 'Method not allowed.' })
            return
          }

          try {
            let imageDataUrl = `data:image/png;base64,${OCR_TEST_IMAGE_BASE64}`
            let mergeLevel = 'paragraph'

            if (request.method === 'POST') {
              const body = await readJsonBody(request)
              imageDataUrl = String(body.imageDataUrl || '')
              mergeLevel = String(body.mergeLevel || 'paragraph')
            }

            const result = await runNvidiaOcr(
              nvidiaApiKey,
              imageDataUrl,
              mergeLevel,
            )
            sendJson(response, result.status, result.payload)
          } catch (error) {
            console.error('NVIDIA OCR test error:', error)
            sendJson(response, 502, {
              success: false,
              configured: Boolean(nvidiaApiKey),
              connected: false,
              message:
                error instanceof Error
                  ? error.message
                  : 'The OCR test could not be completed.',
            })
          }
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

            const result = await analyzeCaseWithNebius(apiKey, body)
            sendJson(response, 200, result)
          } catch (error) {
            console.error('Teltruva analysis error:', error)
            sendJson(response, 502, {
              error:
                error instanceof Error
                  ? error.message
                  : 'The case could not be organized.',
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
