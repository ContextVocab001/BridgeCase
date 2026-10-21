import type { LanguageCode } from '../config/languages'
import type { UserInputStructure } from '../types/workflow'
export type AppLanguage = 'en' | 'ja' | 'es'
export type UploadedSource = { name: string; type: string; size: number; text?: string }
export type OcrPage = { page: number; text: string; lines: string[] }
export type OcrResult = { text: string; pages: OcrPage[] }
export type CaseFact = { label: string; value: string; source?: 'document' | 'message' | 'user' }
export type MissingField = { key: string; label: string; reason: string; alternatives?: string[] }
export type ContactCandidate = { label: string; url: string; reason: string; kind: 'official-site' | 'contact-form' | 'email' | 'search'; recommended?: boolean }
export type CaseAnalysis = {
  confirmedFacts: CaseFact[]
  userStatements: string[]
  requestedOutcome: string
  readiness: { ready: boolean; targetIdentified: boolean; transactionIdentified: boolean; issueIdentified: boolean; outcomeIdentified: boolean; missingFields: MissingField[] }
  messageSource: { senderName?: string; senderEmail?: string; replyTo?: string; subject?: string; date?: string; isForwarded: boolean; isNoReply: boolean; noReplyReason?: string; attachments: string[] }
  referenceInformation: CaseFact[]
  contactCandidates: ContactCandidate[]
  draft: { subject: string; body: string }
  meta: { mode: 'nebius'; model?: string }
}

export type StructureUserInputInput = {
  userText: string
  interfaceLanguage: LanguageCode
  draftLanguage: LanguageCode
}
export type AnalyzeCaseInput = { mode?: 'analyze' | 'translate' | 'structure-user-input'; originalMessage: string; userRequest: string; interfaceLanguage: LanguageCode; recipientLanguage: LanguageCode; documents: UploadedSource[]; documentText?: string; approvedSubject?: string; approvedBody?: string; additionalInformation?: Record<string,string> }

async function readJson(response: Response) {
  const raw = await response.text()
  if (!raw) return null
  try { return JSON.parse(raw) } catch {
    console.error('API returned non-JSON content', response.status, raw.slice(0, 300))
    return null
  }
}
async function post(input: AnalyzeCaseInput) {
  const response = await fetch('/api/analyze-case', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input) })
  const payload = await readJson(response)
  if (!response.ok) throw new Error(payload?.error ?? payload?.message ?? `Case analysis failed (${response.status}).`)
  if (!payload) throw new Error('Case analysis returned an empty or invalid response.')
  return payload
}
export async function analyzeCase(input: AnalyzeCaseInput): Promise<CaseAnalysis> { return post({...input,mode:'analyze'}) }
export async function structureUserInput(input: StructureUserInputInput): Promise<UserInputStructure> { return post({...input,mode:'structure-user-input',originalMessage:'',userRequest:input.userText,recipientLanguage:input.draftLanguage,documents:[]}) }
export async function translateApprovedDraft(input: AnalyzeCaseInput): Promise<{subject:string;body:string}> { return post({...input,mode:'translate'}) }
export async function runOcr(images:string[]):Promise<OcrResult> {
  if (!images.length) return { text:'', pages:[] }
  const response = await fetch('/api/nvidia-ocr-test', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({images}) })
  const payload = await readJson(response)
  if (!response.ok) throw new Error(payload?.message ?? `OCR request failed (${response.status}).`)
  if (!payload || typeof payload.text !== 'string' || !Array.isArray(payload.pages)) throw new Error('OCR returned an unexpected response.')
  if (!payload.text.trim()) throw new Error('OCR completed, but no readable text was found in the uploaded file.')
  const pages: OcrPage[] = payload.pages.map((page: unknown, index: number) => {
    const value = page && typeof page === 'object' ? page as Record<string, unknown> : {}
    const text = typeof value.text === 'string' ? value.text : ''
    const lines = Array.isArray(value.lines) ? value.lines.filter((line): line is string => typeof line === 'string' && Boolean(line.trim())) : text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    return { page:typeof value.page === 'number' ? value.page : index + 1, text, lines }
  })
  return { text:payload.text, pages }
}