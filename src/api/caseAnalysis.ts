import type { LanguageCode } from '../config/languages'
import type { CaseContext, CasePreparation, CaseReviewData, CaseType, CaseTypeClassification, ChargeAggregation, ChargeLabelSelection, IdentifierSelection, UserInputStructure } from '../types/workflow'
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
}
export type AnalyzeCaseInput = { mode?: 'analyze' | 'translate' | 'structure-user-input' | 'select-charge-label' | 'aggregate-selected-charge' | 'extract-case-context' | 'classify-case-type' | 'select-primary-identifier'; originalMessage: string; userRequest: string; interfaceLanguage: LanguageCode; recipientLanguage: LanguageCode; documents: UploadedSource[]; documentText?: string; approvedSubject?: string; approvedBody?: string; additionalInformation?: Record<string,string> }

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
export async function generateProtectedDraft(input: { interfaceLanguage: LanguageCode; review: CaseReviewData }): Promise<{subject:string;body:string;generationMode:'ai'|'safe-template';validationAttempts:number}> { return post({mode:'generate-protected-draft',interfaceLanguage:input.interfaceLanguage,recipientLanguage:input.interfaceLanguage,review:input.review,originalMessage:'',userRequest:'',documents:[]} as AnalyzeCaseInput) }
export async function structureUserInput(input: StructureUserInputInput): Promise<UserInputStructure> { return post({...input,mode:'structure-user-input',originalMessage:'',userRequest:input.userText,recipientLanguage:input.draftLanguage,documents:[]}) }
export async function selectChargeLabel(input: SelectChargeLabelInput): Promise<ChargeLabelSelection> { return post({...input,mode:'select-charge-label',originalMessage:'',userRequest:input.userStructure.originalText,recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function aggregateSelectedCharge(input: AggregateSelectedChargeInput): Promise<ChargeAggregation> { return post({...input,mode:'aggregate-selected-charge',originalMessage:'',userRequest:'',recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function classifyCaseType(input: ClassifyCaseTypeInput): Promise<CaseTypeClassification> { return post({...input,mode:'classify-case-type',originalMessage:'',userRequest:input.userStructure.originalText,recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function extractCaseContext(input: ExtractCaseContextInput): Promise<CaseContext> { return post({...input,mode:'extract-case-context',originalMessage:'',userRequest:'',recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function selectPrimaryIdentifier(input: SelectPrimaryIdentifierInput): Promise<IdentifierSelection> { return post({...input,mode:'select-primary-identifier',originalMessage:'',userRequest:'',recipientLanguage:input.interfaceLanguage,documents:[]}) }
export async function prepareStructuredCase(input: PrepareCaseInput): Promise<CasePreparation> {
  const userStructure = await structureUserInput({ userText:input.userText, interfaceLanguage:input.interfaceLanguage, draftLanguage:input.draftLanguage })
  const caseClassification = await classifyCaseType({ interfaceLanguage:input.interfaceLanguage, userStructure, documentText:input.documentText })
  const caseContext = await extractCaseContext({ interfaceLanguage:input.interfaceLanguage, caseType:caseClassification.caseType, documentText:input.documentText })
  const chargeSelection = await selectChargeLabel({ interfaceLanguage:input.interfaceLanguage, userStructure, documentText:input.documentText })
  const chargeAggregation = chargeSelection.selectedLabel ? await aggregateSelectedCharge({ interfaceLanguage:input.interfaceLanguage, selectedLabel:chargeSelection.selectedLabel, documentText:input.documentText }) : null
  const identifierSelection = await selectPrimaryIdentifier({ interfaceLanguage:input.interfaceLanguage, caseType:caseClassification.caseType, documentText:input.documentText })
  return { userStructure, caseClassification, caseContext, chargeSelection, chargeAggregation, identifierSelection }
}

export function buildCaseReviewData(preparation: CasePreparation): CaseReviewData {
  const confirmedFacts: CaseReviewData['confirmedFacts'] = []
  if (preparation.caseContext.organizationName) confirmedFacts.push({ key:'organization', label:'Organization', value:preparation.caseContext.organizationName, source:'document' })
  if (preparation.caseContext.startDate) confirmedFacts.push({ key:'startDate', label:'Start date', value:preparation.caseContext.startDate, source:'document' })
  if (preparation.caseContext.endDate) confirmedFacts.push({ key:'endDate', label:'End date', value:preparation.caseContext.endDate, source:'document' })
  const aggregation = preparation.chargeAggregation
  if (aggregation) {
    confirmedFacts.push({ key:'chargeLabel', label:'Disputed item', value:aggregation.selectedLabel, source:'document' })
    confirmedFacts.push({ key:'chargeSummary', label:'Charge summary', value:JSON.stringify({ currencyCode:aggregation.currencyCode, currencySymbol:aggregation.currencySymbol, lineCount:aggregation.lineCount, totalAmount:aggregation.totalAmount, amountGroups:aggregation.amountGroups }), source:'program' })
  }
  const primary = preparation.identifierSelection.primaryIdentifier
  if (primary) confirmedFacts.push({ key:'primaryIdentifier', label:primary.label, value:primary.value, source:'document' })
  return {
    caseType:preparation.caseClassification.caseType,
    confirmedFacts,
    userStatements:preparation.userStructure.claims.map(claim=>claim.statement),
    requestedOutcome:{ code:preparation.userStructure.requestedAction.code, statement:preparation.userStructure.requestedAction.statement, amount:aggregation?.totalAmount, currency:aggregation?.currencyCode },
    primaryIdentifier:primary,
    readiness:{ ready:Boolean(preparation.caseContext.organizationName&&preparation.userStructure.requestedAction.statement), hasOrganization:Boolean(preparation.caseContext.organizationName), hasIssue:Boolean(preparation.chargeSelection.selectedLabel||preparation.userStructure.claims.length), hasOutcome:Boolean(preparation.userStructure.requestedAction.statement), hasPrimaryIdentifier:Boolean(primary) }
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
    return { page:typeof value.page === 'number' ? value.page : index + 1, text, lines }
  })
  return { text:payload.text, pages }
}
type DraftLanguage = 'en' | 'ja' | 'es'
type ReviewChargeSummary = {
  currencyCode: string
  currencySymbol: string
  lineCount: number
  totalAmount: number
  amountGroups: { unitAmount:number; count:number; subtotal:number }[]
}
function reviewFact(review: CaseReviewData, key: string) {
  return review.confirmedFacts.find(fact => fact.key === key)?.value.trim() ?? ''
}
function reviewChargeSummary(review: CaseReviewData): ReviewChargeSummary | null {
  const raw = reviewFact(review, 'chargeSummary')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ReviewChargeSummary>
    const totalAmount = Number(parsed.totalAmount)
    const lineCount = Number(parsed.lineCount)
    const amountGroups = Array.isArray(parsed.amountGroups)
      ? parsed.amountGroups.map(group => ({ unitAmount:Number(group.unitAmount), count:Number(group.count), subtotal:Number(group.subtotal) })).filter(group => Number.isFinite(group.unitAmount) && Number.isFinite(group.count) && Number.isFinite(group.subtotal))
      : []
    if (!Number.isFinite(totalAmount) || !Number.isFinite(lineCount)) return null
    return { currencyCode:String(parsed.currencyCode ?? ''), currencySymbol:String(parsed.currencySymbol ?? ''), lineCount, totalAmount, amountGroups }
  } catch { return null }
}
function money(amount: number, summary: ReviewChargeSummary) {
  const currency = summary.currencyCode || summary.currencySymbol
  return `${currency ? `${currency} ` : ''}${amount.toFixed(2)}`
}
function subjectFor(review: CaseReviewData, language: DraftLanguage) {
  const label = reviewFact(review, 'chargeLabel')
  const refund = review.requestedOutcome.code === 'REFUND'
  const parking = /parking|駐車|estacionamiento/i.test(label)
  if (language === 'ja') {
    if (refund && parking) return '駐車料金の返金依頼'
    if (refund) return label ? `${label}の返金依頼` : '料金の返金依頼'
    return label ? `${label}に関する確認のお願い` : '請求内容に関する確認のお願い'
  }
  if (language === 'es') {
    if (refund && parking) return 'Solicitud de reembolso del cargo de estacionamiento'
    if (refund) return label ? `Solicitud de reembolso: ${label}` : 'Solicitud de reembolso'
    return label ? `Consulta sobre ${label}` : 'Consulta sobre un cargo'
  }
  if (refund && parking) return 'Parking Fee Refund Request'
  if (refund) return label ? `Refund Request for ${label}` : 'Refund Request'
  return label ? `Inquiry About ${label}` : 'Billing Inquiry'
}
function evidenceSummary(summary: ReviewChargeSummary, language: DraftLanguage) {
  const groups = summary.amountGroups.map(group => `${money(group.unitAmount, summary)} × ${group.count}`).join(' + ')
  const total = money(summary.totalAmount, summary)
  if (language === 'ja') return groups ? `${groups} ＝ ${total}` : total
  return groups ? `${groups} = ${total}` : total
}
export function buildConfirmedDraft(review: CaseReviewData, language: DraftLanguage): { subject:string; body:string } {
  const identifier = review.primaryIdentifier
  const startDate = reviewFact(review, 'startDate')
  const endDate = reviewFact(review, 'endDate')
  const label = reviewFact(review, 'chargeLabel')
  const summary = reviewChargeSummary(review)
  const statements = review.userStatements.filter(Boolean)
  const identifierLine = identifier ? `${identifier.label}: ${identifier.value}` : ''
  const period = [startDate, endDate].filter(Boolean).join(' - ')
  const breakdown = summary ? evidenceSummary(summary, language) : ''
  const total = summary ? money(summary.totalAmount, summary) : ''
  const subject = subjectFor(review, language)

  if (language === 'ja') {
    const lines = [
      'ご担当者様', '',
      '以下の宿泊・取引についてお問い合わせいたします。', '',
      identifierLine,
      period ? `利用期間：${period}` : '',
      '',
      ...statements.map(statement => `・${statement}`),
      '',
      '資料で確認できた対象明細は以下のとおりです。', '',
      label ? `対象明細：${label}` : '',
      breakdown ? `内訳：${breakdown}` : '',
      total ? `対象金額：${total}` : '',
      '',
      total ? `上記対象金額 ${total} の返金をお願いいたします。` : review.requestedOutcome.statement,
      '',
      'ご確認のほど、よろしくお願いいたします。'
    ]
    return { subject, body:lines.filter((line,index,array) => line || (index > 0 && array[index-1])).join('\n').trim() }
  }
  if (language === 'es') {
    const lines = [
      'A la persona responsable:', '',
      'Me comunico en relación con la siguiente reserva o transacción.', '',
      identifierLine,
      period ? `Período: ${period}` : '', '',
      ...statements.map(statement => `- ${statement}`), '',
      'Los datos confirmados en el documento son los siguientes.', '',
      label ? `Cargo cuestionado: ${label}` : '',
      breakdown ? `Desglose: ${breakdown}` : '',
      total ? `Importe cuestionado: ${total}` : '', '',
      total ? `Solicito el reembolso del importe confirmado de ${total}.` : review.requestedOutcome.statement, '',
      'Gracias por revisar este asunto.'
    ]
    return { subject, body:lines.filter((line,index,array) => line || (index > 0 && array[index-1])).join('\n').trim() }
  }
  const lines = [
    'Dear Customer Service Team,', '',
    'I am contacting you regarding the following reservation or transaction.', '',
    identifierLine,
    period ? `Service period: ${period}` : '', '',
    ...statements.map(statement => `- ${statement}`), '',
    'The following disputed charge was confirmed in the document.', '',
    label ? `Disputed item: ${label}` : '',
    breakdown ? `Breakdown: ${breakdown}` : '',
    total ? `Disputed amount: ${total}` : '', '',
    total ? `I am requesting a refund of the confirmed disputed amount of ${total}.` : review.requestedOutcome.statement, '',
    'Thank you for reviewing this matter.'
  ]
  return { subject, body:lines.filter((line,index,array) => line || (index > 0 && array[index-1])).join('\n').trim() }
}
