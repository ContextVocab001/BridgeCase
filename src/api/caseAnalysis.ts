export type AppLanguage = 'en' | 'ja' | 'es'

export type DocumentMetadata = {
  name: string
  type: string
  size: number
}

export type AnalyzeCaseInput = {
  originalMessage: string
  userRequest: string
  interfaceLanguage: AppLanguage
  recipientLanguage: AppLanguage
  documents: DocumentMetadata[]
}

export type CaseFact = {
  label: string
  value: string
}

export type CaseAnalysis = {
  confirmedFacts: CaseFact[]
  userStatements: string[]
  requestedOutcome: string
  unconfirmedInformation: string[]
  followUpQuestions: string[]
  draft: {
    subject: string
    body: string
  }
  meta: {
    mode: 'mock' | 'nebius'
    model?: string
  }
}

export async function analyzeCase(input: AnalyzeCaseInput): Promise<CaseAnalysis> {
  const response = await fetch('/api/analyze-case', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error ?? 'The analysis request failed.'
    throw new Error(message)
  }

  return payload as CaseAnalysis
}
