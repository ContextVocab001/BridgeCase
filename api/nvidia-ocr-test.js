const NVIDIA_OCR_URL = process.env.NVIDIA_OCR_URL || 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2'
const MAX_IMAGES = 8
const REQUEST_TIMEOUT_MS = 55000

function collect(value, out = []) {
  if (!value) return out
  if (Array.isArray(value)) { value.forEach(item => collect(item, out)); return out }
  if (typeof value !== 'object') return out
  if (typeof value.text === 'string' && value.text.trim()) out.push(value.text.trim())
  Object.values(value).forEach(item => collect(item, out))
  return out
}
function isSupportedImage(value) {
  return typeof value === 'string' && /^data:image\/(png|jpe?g);base64,/i.test(value)
}
function safeMessage(status) {
  if (status === 401 || status === 403) return 'OCR authentication failed. Check NVIDIA_API_KEY.'
  if (status === 404) return 'The configured OCR endpoint was not found.'
  if (status === 413) return 'The uploaded image is too large for the OCR service.'
  if (status === 429) return 'The OCR service rate limit was reached. Please try again shortly.'
  if (status >= 500) return 'The OCR service is temporarily unavailable.'
  return `OCR service returned ${status}.`
}

export const config = { maxDuration: 60 }

export default async function handler(request, response) {
  if (request.method === 'GET') {
    response.status(200).json({ success:true, configured:Boolean(process.env.NVIDIA_API_KEY), endpoint:NVIDIA_OCR_URL })
    return
  }
  if (request.method !== 'POST') { response.status(405).json({ message:'Method not allowed.' }); return }

  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) { response.status(503).json({ message:'NVIDIA_API_KEY is not configured.' }); return }

  const images = Array.isArray(request.body?.images) ? request.body.images.slice(0, MAX_IMAGES) : []
  if (!images.length) { response.status(400).json({ message:'No OCR images were received.' }); return }
  if (images.some(image => !isSupportedImage(image))) {
    response.status(400).json({ message:'OCR accepts base64 PNG or JPEG images only.' })
    return
  }

  try {
    const pages = []
    for (let index = 0; index < images.length; index += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      let upstream
      try {
        upstream = await fetch(NVIDIA_OCR_URL, {
          method:'POST',
          signal:controller.signal,
          headers:{ Authorization:`Bearer ${apiKey}`, Accept:'application/json', 'Content-Type':'application/json' },
          body:JSON.stringify({ input:[{ type:'image_url', url:images[index] }], merge_levels:['paragraph'] }),
        })
      } finally {
        clearTimeout(timeout)
      }

      const raw = await upstream.text()
      if (!upstream.ok) {
        console.error('OCR upstream error', { page:index + 1, status:upstream.status, body:raw.slice(0, 800) })
        response.status(502).json({ message:safeMessage(upstream.status), upstreamStatus:upstream.status })
        return
      }

      let payload
      try { payload = raw ? JSON.parse(raw) : null } catch (error) {
        console.error('OCR JSON parse failure', { page:index + 1, contentType:upstream.headers.get('content-type'), body:raw.slice(0, 800), error })
        response.status(502).json({ message:'OCR returned an invalid response.' })
        return
      }
      const text = [...new Set(collect(payload))].join('\n')
      pages.push({ text })
    }

    const text = pages.map(page => page.text).filter(Boolean).join('\n\n--- PAGE ---\n\n')
    if (!text.trim()) {
      console.error('OCR completed without text', { pages:pages.length })
      response.status(422).json({ message:'OCR completed, but no readable text was found.' })
      return
    }
    response.status(200).json({ text, pages })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    console.error('OCR request failure', error)
    response.status(502).json({ message:timedOut ? 'OCR timed out. Please try a smaller or clearer file.' : 'Could not connect to the OCR service.' })
  }
}
