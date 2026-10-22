const NVIDIA_OCR_URL = process.env.NVIDIA_OCR_URL || 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2'
const MAX_IMAGES = 8
const REQUEST_TIMEOUT_MS = 55000

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
function finiteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
function readBox(value) {
  if (!value || typeof value !== 'object') return null
  const candidate = value.bbox || value.box || value.bounding_box || value.boundingBox || value.bounds
  if (Array.isArray(candidate) && candidate.length >= 4) {
    const numbers = candidate.flat(Infinity).map(finiteNumber).filter(number => number !== null)
    if (numbers.length >= 4) {
      if (numbers.length >= 8) {
        const xs = numbers.filter((_, index) => index % 2 === 0)
        const ys = numbers.filter((_, index) => index % 2 === 1)
        return { x1:Math.min(...xs), y1:Math.min(...ys), x2:Math.max(...xs), y2:Math.max(...ys) }
      }
      return { x1:numbers[0], y1:numbers[1], x2:numbers[2], y2:numbers[3] }
    }
  }
  if (candidate && typeof candidate === 'object') {
    const x1 = finiteNumber(candidate.x1 ?? candidate.left ?? candidate.x)
    const y1 = finiteNumber(candidate.y1 ?? candidate.top ?? candidate.y)
    const x2 = finiteNumber(candidate.x2 ?? candidate.right ?? (x1 !== null && finiteNumber(candidate.width) !== null ? x1 + Number(candidate.width) : null))
    const y2 = finiteNumber(candidate.y2 ?? candidate.bottom ?? (y1 !== null && finiteNumber(candidate.height) !== null ? y1 + Number(candidate.height) : null))
    if ([x1,y1,x2,y2].every(number => number !== null)) return { x1, y1, x2, y2 }
  }
  return null
}
function readConfidence(value) {
  if (!value || typeof value !== 'object') return null
  return finiteNumber(value.confidence ?? value.score ?? value.confidence_score ?? value.probability)
}
function collectDetections(value, out = [], path = 'root') {
  if (!value) return out
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDetections(item, out, `${path}[${index}]`))
    return out
  }
  if (typeof value !== 'object') return out
  const text = typeof value.text === 'string' ? value.text.trim() : typeof value.parsed_text === 'string' ? value.parsed_text.trim() : ''
  const box = readBox(value)
  if (text && box) out.push({ text, ...box, confidence:readConfidence(value), path })
  Object.entries(value).forEach(([key, item]) => collectDetections(item, out, `${path}.${key}`))
  return out
}
function deduplicateByPosition(detections) {
  const seen = new Set()
  return detections.filter(detection => {
    const key = [detection.text, detection.x1, detection.y1, detection.x2, detection.y2].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
function sortReadingOrder(detections) {
  if (!detections.length) return []
  const heights = detections.map(item => Math.max(1, item.y2 - item.y1)).sort((a,b) => a-b)
  const medianHeight = heights[Math.floor(heights.length / 2)] || 10
  const tolerance = Math.max(4, medianHeight * 0.65)
  return [...detections].sort((a,b) => {
    const vertical = a.y1 - b.y1
    if (Math.abs(vertical) > tolerance) return vertical
    return a.x1 - b.x1
  })
}
function buildLayoutText(detections) {
  if (!detections.length) return ''
  const heights = detections.map(item => Math.max(1, item.y2 - item.y1)).sort((a,b) => a-b)
  const medianHeight = heights[Math.floor(heights.length / 2)] || 10
  const tolerance = Math.max(4, medianHeight * 0.65)
  const rows = []
  for (const detection of sortReadingOrder(detections)) {
    const row = rows.find(candidate => Math.abs(candidate.y - detection.y1) <= tolerance)
    if (row) {
      row.items.push(detection)
      row.y = (row.y * (row.items.length - 1) + detection.y1) / row.items.length
    } else rows.push({ y:detection.y1, items:[detection] })
  }
  rows.sort((a,b) => a.y - b.y)
  return rows.map(row => row.items.sort((a,b) => a.x1 - b.x1).map(item => item.text).join(' ')).join('\n')
}
function collectFallbackText(value, out = []) {
  if (!value) return out
  if (Array.isArray(value)) { value.forEach(item => collectFallbackText(item, out)); return out }
  if (typeof value !== 'object') return out
  if (typeof value.text === 'string' && value.text.trim()) out.push(value.text.trim())
  Object.values(value).forEach(item => collectFallbackText(item, out))
  return out
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
          body:JSON.stringify({ input:[{ type:'image_url', url:images[index] }], merge_levels:['word'] }),
        })
      } finally { clearTimeout(timeout) }

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

      const detections = deduplicateByPosition(collectDetections(payload))
      const layoutText = buildLayoutText(detections)
      const fallbackText = collectFallbackText(payload).join('\n')
      const text = layoutText || fallbackText
      pages.push({ page:index + 1, text, detections })
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
    response.status(502).json({ message:timedOut ? 'OCR timed out. Please retry with fewer or smaller pages.' : 'OCR request failed.' })
  }
}
