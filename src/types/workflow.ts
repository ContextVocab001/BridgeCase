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

export type NormalizedClaim = {
  code: string
  source: 'user'
  originalText?: string
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
  value: string
  source: EvidenceSource
  priority?: number
}

export type PrimaryIdentifier = {
  type: string
  value: string
  source: EvidenceSource
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
