import type { LanguageCode } from '../config/languages'

export type EvidenceSource = 'document' | 'message' | 'user' | 'program'

export type CaseType =
  | 'hotel'
  | 'rental-car'
  | 'airline'
  | 'retail'
  | 'restaurant'
  | 'subscription'
  | 'payment'
  | 'other'

export type RequestedActionCode =
  | 'REFUND'
  | 'EXPLANATION'
  | 'CORRECTION'
  | 'CANCELLATION'
  | 'REPLACEMENT'
  | 'OTHER'

export type ToneCode = 'polite-neutral' | 'firm-neutral'

export type MoneyValue = {
  amount: number
  currency: string
  source: EvidenceSource
}

export type SourceEvidence = {
  sourceId: string
  page?: number
  line?: number
  rawText: string
}

export type OcrSourceLine = {
  page: number
  line: number
  rawText: string
}

export type OcrSourcePage = {
  page: number
  rawText: string
  lines: OcrSourceLine[]
}

export type OcrSourceDocument = {
  fullText: string
  pages: OcrSourcePage[]
}

export type NormalizedClaim = {
  code: string
  source: 'user'
  originalText?: string
}

export type StructuredUserClaim = {
  code: string
  statement: string
  sourceQuote: string
  source: 'user'
}

export type UserInputStructure = {
  sourceLanguage: LanguageCode
  originalText: string
  claims: StructuredUserClaim[]
  requestedAction: {
    code: RequestedActionCode
    statement: string
  }
  tone: 'polite-neutral'
}

export type ChargeSelectionConfidence = 'high' | 'medium' | 'low'

export type ChargeLabelSelection = {
  selectedLabel: string
  documentQuotes: string[]
  userClaimCodes: string[]
  confidence: ChargeSelectionConfidence
  reason: string
}

export type ChargeAmountGroup = {
  unitAmount: number
  count: number
  subtotal: number
}

export type ChargeAggregation = {
  selectedLabel: string
  currencyCode: string
  currencySymbol: string
  lineCount: number
  totalAmount: number
  amountGroups: ChargeAmountGroup[]
  evidenceLines: string[]
}

export type ChargeEvidence = {
  label: string
  unitAmount?: MoneyValue
  count?: number
  totalAmount?: MoneyValue
  evidence: SourceEvidence[]
}

export type IdentifierCandidate = {
  type: string
  label: string
  value: string
  source: EvidenceSource
  priority: number
  sourceLine: string
}

export type PrimaryIdentifier = IdentifierCandidate

export type IdentifierSelection = {
  caseType: CaseType
  candidates: IdentifierCandidate[]
  primaryIdentifier: PrimaryIdentifier | null
  supplementaryIdentifiers: IdentifierCandidate[]
}

export type CaseTypeClassification = {
  caseType: CaseType
  confidence: ChargeSelectionConfidence
  documentQuotes: string[]
  reason: string
}

export type CaseContext = {
  guestName: string
  guestNameQuote: string
  organizationName: string
  organizationQuote: string
  startDate: string
  endDate: string
  dateQuotes: string[]
}

export type CaseReviewFact = {
  key: string
  label: string
  value: string
  source: EvidenceSource
}

export type CaseReviewData = {
  caseType: CaseType
  confirmedFacts: CaseReviewFact[]
  userStatements: string[]
  requestedOutcome: {
    code: RequestedActionCode
    statement: string
    amount?: number
    currency?: string
  }
  primaryIdentifier: PrimaryIdentifier | null
  readiness: {
    ready: boolean
    hasOrganization: boolean
    hasGuestName: boolean
    hasIssue: boolean
    hasOutcome: boolean
    hasPrimaryIdentifier: boolean
  }
}

export type CasePreparation = {
  userStructure: UserInputStructure
  caseClassification: CaseTypeClassification
  caseContext: CaseContext
  chargeSelection: ChargeLabelSelection
  chargeAggregation: ChargeAggregation | null
  identifierSelection: IdentifierSelection
}

export type LanguageIndependentCase = {
  caseType: CaseType
  organizationName?: string
  claims: NormalizedClaim[]
  requestedAction: {
    code: RequestedActionCode
    amount?: MoneyValue
  }
  disputedCharge?: ChargeEvidence
  identifierCandidates: IdentifierCandidate[]
  primaryIdentifier?: PrimaryIdentifier
  tone: ToneCode
}

export type DraftSections = {
  salutation: string
  context: string
  userStatement: string
  evidence: string
  request: string
  identifier: string
  closing: string
}

export type StructuredDraft = {
  language: LanguageCode
  subject: string
  sections: DraftSections
}

export type ApprovedDraft = StructuredDraft & {
  approved: true
  approvedAt: string
}

export type TranslatedDraft = {
  sourceLanguage: LanguageCode
  targetLanguage: LanguageCode
  subject: string
  sections: DraftSections
}
