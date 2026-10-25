import type { LanguageCode } from '../config/languages'
import type { CaseContext, CasePreparation, CaseReviewData, CaseType, CaseTypeClassification, ChargeAggregation, ChargeLabelSelection, IdentifierSelection, UserInputStructure } from '../types/workflow'
export type AppLanguage = 'en' | 'ja' | 'es'
export type UploadedSource = { name: string; type: string; size: number; text?: string }
export type OcrDetection = { text:string; x1:number; y1:number; x2:number; y2:number }
export type OcrPage = { page:number; text:string; lines:string[]; detections:OcrDetection[] }
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

export type DraftCaseReviewData = CaseReviewData

export type StructureUserInputInput = {
  userText: string
  interfaceLanguage: LanguageCode
  draftLanguage: LanguageCode
}

export type SelectChargeLabelInput = {
  interfaceLanguage: LanguageCode
  userStructure: UserInputStructure
  documentText: string
}

export type AggregateSelectedChargeInput = {
  interfaceLanguage: LanguageCode
  selectedLabel: string
  documentText: string
}

export type SelectPrimaryIdentifierInput = {
  interfaceLanguage: LanguageCode
  caseType: CaseType
  documentText: string
  ocrPages?: OcrPage[]
}

export type ClassifyCaseTypeInput = {
  interfaceLanguage: LanguageCode
  userStructure: UserInputStructure
  documentText: string
}

export type ExtractCaseContextInput = {
  interfaceLanguage: LanguageCode
  caseType: CaseType
  documentText: string
}

export type PrepareCaseInput = {
  interfaceLanguage: LanguageCode
  draftLanguage: LanguageCode
  userText: string
  documentText: string
  ocrPages?: OcrPage[]
}
export type AnalyzeCaseInput = { mode?: 'analyze' | 'translate' | 'structure-user-input' | 'select-charge-label' | 'aggregate-selected-charge' | 'extract-case-context' | 'classify-case-type' | 'select-primary-identifier' | 'generate-protected-draft'; originalMessage: string; userRequest: string; interfaceLanguage: LanguageCode; recipientLanguage: LanguageCode; documents: UploadedSource[]; documentText?: string; ocrPages?: OcrPage[]; approvedSubject?: string; approvedBody?: string; additionalInformation?: Record<string,string>; review?: DraftCaseReviewData; currentSubject?: string; currentBody?: string }

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
export async function generateProtectedDraft(input: { interfaceLanguage: LanguageCode; review: DraftCaseReviewData; currentSubject?: string; currentBody?: string }): Promise<{subject:string;body:string;generationMode:'ai'|'safe-template';validationAttempts:number}> {
  return post({mode:'generate-protected-draft',interfaceLanguage:input.interfaceLanguage,recipientLanguage:input.interfaceLanguage,review:input.review,currentSubject:input.currentSubject,currentBody:input.currentBody,originalMessage:'',userRequest:'',documents:[]})
}

export async function structureUserInput(input: StructureUserInputInput): Promise<UserInputStructure> { return post({...input,mode:'structure-user-input',originalMessage:'',userRequest:input.userText,recipientLanguage:input.draftLanguage,documents:[]}) }
export async function selectChargeLabel(input: SelectChargeLabelInput): Promise<ChargeLabelSelection> { return post({...input,mode:'select-charge-label',originalMessage:'',userRequest:input.userStructure.originalText,recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function aggregateSelectedCharge(input: AggregateSelectedChargeInput): Promise<ChargeAggregation> { return post({...input,mode:'aggregate-selected-charge',originalMessage:'',userRequest:'',recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function classifyCaseType(input: ClassifyCaseTypeInput): Promise<CaseTypeClassification> { return post({...input,mode:'classify-case-type',originalMessage:'',userRequest:input.userStructure.originalText,recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function extractCaseContext(input: ExtractCaseContextInput): Promise<CaseContext> { return post({...input,mode:'extract-case-context',originalMessage:'',userRequest:'',recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function selectPrimaryIdentifier(input: SelectPrimaryIdentifierInput): Promise<IdentifierSelection> { return post({...input,mode:'select-primary-identifier',originalMessage:'',userRequest:'',recipientLanguage:input.interfaceLanguage,documents:[],ocrPages:input.ocrPages}) }
export async function prepareStructuredCase(input: PrepareCaseInput): Promise<CasePreparation> {
  const userStructure = await structureUserInput({ userText:input.userText, interfaceLanguage:input.interfaceLanguage, draftLanguage:input.draftLanguage })
  const caseClassification = await classifyCaseType({ interfaceLanguage:input.interfaceLanguage, userStructure, documentText:input.documentText })
  const caseContext = await extractCaseContext({ interfaceLanguage:input.interfaceLanguage, caseType:caseClassification.caseType, documentText:input.documentText })
  const chargeSelection = await selectChargeLabel({ interfaceLanguage:input.interfaceLanguage, userStructure, documentText:input.documentText })
  const chargeAggregation = chargeSelection.selectedLabel ? await aggregateSelectedCharge({ interfaceLanguage:input.interfaceLanguage, selectedLabel:chargeSelection.selectedLabel, documentText:input.documentText }) : null
  const identifierSelection = await selectPrimaryIdentifier({ interfaceLanguage:input.interfaceLanguage, caseType:caseClassification.caseType, documentText:input.documentText, ocrPages:input.ocrPages })
  return { userStructure, caseClassification, caseContext, chargeSelection, chargeAggregation, identifierSelection, documentText:input.documentText }
}


function sourceUrls(text: string) {
  return [...new Set((text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? []).map(url => url.replace(/[.,;:!?]+$/, '')))]
}
function googleSearch(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
function contactCaseWords(caseType: CasePreparation['caseClassification']['caseType']) {
  if (caseType === 'hotel') return 'billing refund contact form'
  if (caseType === 'rental-car') return 'past rental billing refund contact form'
  if (caseType === 'airline') return 'payment refund customer contact form'
  if (caseType === 'retail') return 'order billing refund contact form'
  if (caseType === 'restaurant') return 'billing refund contact'
  if (caseType === 'subscription') return 'billing cancellation refund support form'
  return 'billing refund customer support contact form'
}
function buildContactCandidates(preparation: CasePreparation) {
  const context = preparation.caseContext
  const entity = (context.contactSearchName || context.organizationName).trim()
  const location = context.locationName.trim()
  const sourceCandidates: CaseReviewData['contactCandidates'] = sourceUrls(preparation.documentText).slice(0, 2).map(url => ({
    label:url, url, kind:'source-page', purpose:'source-page', searchEntity:entity || url, locationName:location || undefined
  }))
  if (!entity) return sourceCandidates
  const located = [entity, location].filter(Boolean).join(' ')
  // One fallback only. /api/search-contact-routes replaces this after it reads and classifies current official pages.
  return [...sourceCandidates, {
    label:located,
    url:googleSearch(`${located} official ${contactCaseWords(preparation.caseClassification.caseType)}`),
    kind:'search' as const,
    purpose:'case-contact' as const,
    searchEntity:entity,
    locationName:location || undefined,
    recommended:true
  }].slice(0, 3)
}
export function buildCaseReviewData(preparation: CasePreparation): DraftCaseReviewData {
  const confirmedFacts: CaseReviewData['confirmedFacts'] = []
  if (preparation.caseContext.guestName) confirmedFacts.push({ key:'guestName', label:'Guest name', value:preparation.caseContext.guestName, source:'document' })
  if (preparation.caseContext.organizationName) confirmedFacts.push({ key:'organization', label:'Organization', value:preparation.caseContext.organizationName, source:'document' })
  if (preparation.caseContext.startDate) confirmedFacts.push({ key:'startDate', label:'Start date', value:preparation.caseContext.startDate, source:'document' })
  if (preparation.caseContext.endDate) confirmedFacts.push({ key:'endDate', label:'End date', value:preparation.caseContext.endDate, source:'document' })
  const aggregation = preparation.chargeAggregation
  if (aggregation) {
    confirmedFacts.push({ key:'chargeLabel', label:'Disputed item', value:aggregation.selectedLabel, source:'document' })
  }
  const primary = preparation.identifierSelection.primaryIdentifier
  if (primary) confirmedFacts.push({ key:'primaryIdentifier', label:primary.label, value:primary.value, source:'document' })
  return {
    caseType:preparation.caseClassification.caseType,
    confirmedFacts,
    userStatements:preparation.userStructure.claims.map(claim=>claim.statement),
    userOriginalText:preparation.userStructure.originalText,
    chargeAggregation:aggregation,
    contactCandidates:buildContactCandidates(preparation),
    requestedOutcome:{ code:preparation.userStructure.requestedAction.code, statement:preparation.userStructure.requestedAction.statement, amount:aggregation?.amountStatus==='verified'?aggregation.totalAmount:undefined, currency:aggregation?.amountStatus==='verified'?aggregation.currencyCode:undefined },
    primaryIdentifier:primary,
    readiness:{ ready:Boolean((preparation.chargeSelection.selectedLabel||preparation.userStructure.claims.length)&&preparation.userStructure.requestedAction.statement), hasOrganization:Boolean(preparation.caseContext.organizationName), hasGuestName:Boolean(preparation.caseContext.guestName), hasIssue:Boolean(preparation.chargeSelection.selectedLabel||preparation.userStructure.claims.length), hasOutcome:Boolean(preparation.userStructure.requestedAction.statement), hasPrimaryIdentifier:Boolean(primary) }
  }
}
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
    const detections = Array.isArray(value.detections) ? value.detections.map(item => {
      const detection = item && typeof item === 'object' ? item as Record<string,unknown> : {}
      return { text:typeof detection.text==='string'?detection.text:'', x1:Number(detection.x1), y1:Number(detection.y1), x2:Number(detection.x2), y2:Number(detection.y2) }
    }).filter(item => item.text && [item.x1,item.y1,item.x2,item.y2].every(Number.isFinite)) : []
    return { page:typeof value.page === 'number' ? value.page : index + 1, text, lines, detections }
  })
  return { text:payload.text, pages }
}
