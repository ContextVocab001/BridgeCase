export type LanguageCode = 'en' | 'ja' | 'es' | 'zh-CN' | 'zh-TW' | 'hi-IN'

export type TextDirection = 'ltr' | 'rtl'

export type LanguageConfig = {
  code: LanguageCode
  displayName: string
  locale: string
  direction: TextDirection
  enabled: boolean
  draftEnabled: boolean
  recipientEnabled: boolean
}

export const LANGUAGE_CONFIG: Readonly<Record<LanguageCode, LanguageConfig>> = {
  en: {
    code: 'en',
    displayName: 'English',
    locale: 'en-US',
    direction: 'ltr',
    enabled: true,
    draftEnabled: true,
    recipientEnabled: true,
  },
  ja: {
    code: 'ja',
    displayName: '日本語',
    locale: 'ja-JP',
    direction: 'ltr',
    enabled: true,
    draftEnabled: true,
    recipientEnabled: true,
  },
  es: {
    code: 'es',
    displayName: 'Español',
    locale: 'es-US',
    direction: 'ltr',
    enabled: true,
    draftEnabled: true,
    recipientEnabled: true,
  },
  'zh-CN': {
    code: 'zh-CN',
    displayName: '中文（简体）',
    locale: 'zh-CN',
    direction: 'ltr',
    enabled: false,
    draftEnabled: false,
    recipientEnabled: false,
  },
  'zh-TW': {
    code: 'zh-TW',
    displayName: '中文（繁體）',
    locale: 'zh-TW',
    direction: 'ltr',
    enabled: false,
    draftEnabled: false,
    recipientEnabled: false,
  },
  'hi-IN': {
    code: 'hi-IN',
    displayName: 'हिन्दी',
    locale: 'hi-IN',
    direction: 'ltr',
    enabled: false,
    draftEnabled: false,
    recipientEnabled: false,
  },
}

export type LanguageSelection = {
  interfaceLanguage: LanguageCode
  draftLanguage: LanguageCode
  recipientLanguage: LanguageCode
}

export const getEnabledInterfaceLanguages = () =>
  Object.values(LANGUAGE_CONFIG).filter((language) => language.enabled)

export const getEnabledDraftLanguages = () =>
  Object.values(LANGUAGE_CONFIG).filter((language) => language.draftEnabled)

export const getEnabledRecipientLanguages = () =>
  Object.values(LANGUAGE_CONFIG).filter((language) => language.recipientEnabled)
