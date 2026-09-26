import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type Step = 'email' | 'documents' | 'request'
type Language = 'en' | 'ja' | 'es'

type LanguageOption = {
  value: Language
  label: string
}

const MAX_FILES = 5
const MAX_TOTAL_SIZE = 25 * 1024 * 1024

const interfaceLanguageOptions: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
]

const recipientLanguageOptions: Record<
  Language,
  LanguageOption[]
> = {
  en: [
    { value: 'en', label: 'English' },
    { value: 'ja', label: 'Japanese' },
    { value: 'es', label: 'Spanish' },
  ],

  ja: [
    { value: 'en', label: '英語' },
    { value: 'ja', label: '日本語' },
    { value: 'es', label: 'スペイン語' },
  ],

  es: [
    { value: 'en', label: 'Inglés' },
    { value: 'ja', label: 'Japonés' },
    { value: 'es', label: 'Español' },
  ],
}

const translations = {
  en: {
    brandTagline:
      'Cross-border support in your language',

    aiLabelFirst:
      'AI-powered',

    aiLabelSecond:
      'Review and edit before translation',

    heroLineOne:
      'Resolve consumer issues',

    heroLineTwo:
      'in your own language',

    heroDescriptionOne:
      'Add your original message and documents',

    heroDescriptionTwo:
      'Review the case summary and draft in your language',

    heroApproval:
      'Nothing is translated or sent without your approval',

    visualInputLabel:
      'Your language',

    visualInputText:
      'I canceled but was charged again',

    visualBridgeLineOne:
      'Organizes your case',

    visualBridgeLineTwo:
      'and keeps your request clear',

    visualOutputLabel:
      'Company language',

    visualOutputText:
      'Clear and professional refund request',

    cardOneTitle:
      'Review and edit every message',

    cardOneDescription:
      'Check the complete draft in your language before translation.',

    cardTwoTitle:
      'Nothing is sent automatically',

    cardTwoDescription:
      'You decide before any message is sent or offer is accepted.',

    cardThreeDirection:
      'Example: English → Spanish',

    cardThreeTitle:
      'Translation checked against your approved message',

    cardThreeDescription:
      'Amounts, dates, and requested outcomes are checked against the English version you approved.',

    approvedRequest:
      'Approved in English',

    approvedExample:
      'I am requesting a full refund of $250',

    translatedMessage:
      'Translated into Spanish',

    translatedExample:
      'Solicito un reembolso completo de $250',

    detailsMatch:
      'Key details match',

    newCase:
      'NEW CASE',

    caseTitle:
      'Tell us what happened',

    caseDescription:
      'Enter your request and add an original message or relevant documents.',

    originalMessage:
      'Original message',

    documents:
      'Documents',

    yourRequest:
      'Your request',

    emailTitle:
      'Copy and paste the message you received',

    emailDescription:
      'Paste the original email or support message below. Include the sender, recipient, subject, and date if available.',

    windows:
      'Windows',

    mac:
      'Mac',

    mobile:
      'Mobile',

    mobileAction:
      'Press and hold → Copy → Paste',

    emailPlaceholder:
      'Paste the original email or support message here...',

    controlNoticeTitle:
      'You stay in control',

    controlNotice:
      'BridgeCase identifies confirmed facts, your statements, and missing information. Nothing is sent without your approval.',

    documentTitle:
      'Upload receipts and relevant documents',

    documentDescription:
      'If you have the original PDF, upload the complete file. BridgeCase will identify the relevant pages.',

    evidenceTitle:
      'Make sure the following information is readable',

    evidenceDescription:
      'Clear and readable documents help prevent mistakes.',

    checks: [
      'Company or seller',
      'Amount and currency',
      'Purchase or charge date',
      'Order, booking, or account number',
      'Product, service, or subscription',
      'Cancellation, refund, or additional charge details',
    ],

    chooseFiles:
      'Choose PDF or image files',

    chooseFilesAction:
      'Select files from your device',

    fileLimits:
      'Up to 5 files • 20 PDF pages • 25 MB total',

    fileTypes:
      'PDF, JPG, JPEG, or PNG',

    noCompressionTitle:
      'No compression needed',

    noCompression:
      'Upload the original files whenever possible. There is no need to compress or crop them first.',

    selectedFiles:
      'Selected files',

    remove:
      'Remove',

    requestTitle:
      'What would you like the company to do?',

    requestDescription:
      'Write naturally in your own language. A normal paragraph is fine, even if it includes frustration. BridgeCase will organize the information and create a clear, professional email.',

    naturalInputTitle:
      'Write naturally in your own words',

    naturalInputNote:
      'You do not need to organize the information first. BridgeCase will do that for you.',

    naturalInputExample:
      'Example: I did not use the hotel parking lot. I told the front desk, and they said I would not be charged. However, the parking fee still appeared on my final bill. I would like a full refund.',

    seeExample:
      'See how BridgeCase will organize it',

    hideExample:
      'Hide the organized example',

    organizedExampleTitle:
      'BridgeCase will separate your message into:',

    organizedExamples: [
      'What happened',
      'What you want the company to do',
      'What the company should confirm',
    ],

    requestPlaceholder:
      'Describe what happened in your own words...',

    recipientLanguageTitle:
      'Company language',

    recipientLanguageDescription:
      'Choose the language the company should receive.',

    privacyTitle:
      'Protect your private information',

    privacyDescription:
      'Do not include passwords, full card numbers, or government ID numbers.',

    saveLater:
      'Save for later',

    continue:
      'Continue',

    analyze:
      'Analyze case',

    modalEyebrow:
      'CASE INTAKE REVIEW',

    modalReadyTitle:
      'Ready to organize your case',

    modalMissingTitle:
      'More information is needed',

    modalItemsReviewed:
      'intake items reviewed',

    modalOriginalMessage:
      'Original message',

    modalOriginalAdded:
      'Added',

    modalOriginalFromDocuments:
      'No original message was added. We will look for the company and case details in the documents.',

    modalOriginalMissing:
      'Add an original message or at least one document',

    modalDocuments:
      'Documents',

    modalDocumentsSelected:
      'file(s) selected',

    modalDocumentsOptional:
      'Optional, but documents may improve accuracy',

    modalRequest:
      'Requested outcome',

    modalRequestAdded:
      'Added',

    modalRequestMissing:
      'Tell us what you want the company to do',

    modalNextTitle:
      'What you will review next',

    modalNextDescription:
      'AI will organize these items in your language',

    reviewItems: [
      'Confirmed facts',
      'Your statements',
      'Information not yet confirmed',
      'Requested outcome',
    ],

    modalReview:
      'Review inputs',

    modalAddMissing:
      'Add missing information',

    modalOrganize:
      'Organize case',

    howItWorks:
      'HOW IT WORKS',

    howItWorksTitle:
      'AI prepares. You decide.',

    features: [
      {
        icon: 'AI',
        title: 'AI organizes your case',
        description:
          'Confirmed facts, your statements, and details that still need confirmation are clearly separated.',
      },
      {
        icon: 'Aa',
        title: 'Review in your language',
        description:
          'Review and edit the complete email in your language before translation.',
      },
      {
        icon: '⇄',
        title: 'Translation details checked',
        description:
          'Amounts, dates, and requested outcomes are checked against the version you approved.',
      },
    ],
  },

  ja: {
    brandTagline:
      '海外企業との問題をあなたの言語で',

    aiLabelFirst:
      'AIを活用',

    aiLabelSecond:
      '翻訳前に確認・修正',

    heroLineOne:
      '海外企業との問題を',

    heroLineTwo:
      '日本語で解決へ',

    heroDescriptionOne:
      '元のメッセージと資料を入力',

    heroDescriptionTwo:
      '整理された案件内容とメール案を日本語で確認できます',

    heroApproval:
      'あなたの承認なしに翻訳・送信されることはありません',

    visualInputLabel:
      'あなたの言語',

    visualInputText:
      '解約後に再請求されました',

    visualBridgeLineOne:
      '案件を整理し',

    visualBridgeLineTwo:
      '希望を明確にします',

    visualOutputLabel:
      '相手企業の言語',

    visualOutputText:
      '丁寧で明確な返金依頼',

    cardOneTitle:
      'すべての文面を確認・修正',

    cardOneDescription:
      '翻訳前に日本語で全文を確認し、必要な部分を修正できます。',

    cardTwoTitle:
      '自動で送信・合意しません',

    cardTwoDescription:
      'メッセージの送信や相手の提案への合意は、必ずあなたが判断します。',

    cardThreeDirection:
      '例：日本語 → 英語',

    cardThreeTitle:
      '翻訳後の内容を照合',

    cardThreeDescription:
      '金額、日付、希望する対応が、承認した内容と一致しているか確認します。',

    approvedRequest:
      '日本語で承認',

    approvedExample:
      '250ドルの全額返金を希望します',

    translatedMessage:
      '英語へ翻訳',

    translatedExample:
      'I am requesting a full refund of $250',

    detailsMatch:
      '金額と希望する対応が一致',

    newCase:
      '新しい案件',

    caseTitle:
      '何が起きたか教えてください',

    caseDescription:
      '希望する対応を入力し、元のメッセージまたは関連資料を追加してください。',

    originalMessage:
      '元のメッセージ',

    documents:
      '関連資料',

    yourRequest:
      '希望する対応',

    emailTitle:
      '受け取ったメッセージをコピーして貼り付け',

    emailDescription:
      '元のメールやサポートメッセージを貼り付けてください。可能であれば、送信者、受信者、件名、日付も含めてください。',

    windows:
      'Windows',

    mac:
      'Mac',

    mobile:
      'スマートフォン',

    mobileAction:
      '長押し → コピー → 貼り付け',

    emailPlaceholder:
      '受け取ったメールやサポートメッセージを貼り付けてください...',

    controlNoticeTitle:
      '最終判断はあなたが行います',

    controlNotice:
      'BridgeCaseが確認できた事実、利用者の説明、不足情報を整理します。承認なしに送信されることはありません。',

    documentTitle:
      '領収書や関連資料をアップロード',

    documentDescription:
      '元のPDFがある場合は、ファイル全体をアップロードしてください。BridgeCaseが関連ページを見つけます。',

    evidenceTitle:
      '次の情報が読めることを確認',

    evidenceDescription:
      '明確に読める資料を使用することで、誤りを防ぎやすくなります。',

    checks: [
      '会社名または販売者名',
      '金額と通貨',
      '購入日または請求日',
      '注文番号、予約番号、アカウント番号',
      '商品、サービス、契約プラン',
      '解約、返金、追加請求に関する情報',
    ],

    chooseFiles:
      'PDFまたは画像を選択',

    chooseFilesAction:
      '端末からファイルを選択',

    fileLimits:
      '最大5ファイル • PDF合計20ページ • 合計25MB',

    fileTypes:
      'PDF、JPG、JPEG、PNG',

    noCompressionTitle:
      '圧縮する必要はありません',

    noCompression:
      '可能な限り元のファイルをアップロードしてください。事前の圧縮や切り抜きは不要です。',

    selectedFiles:
      '選択したファイル',

    remove:
      '削除',

    requestTitle:
      '企業にどのような対応を希望しますか？',

    requestDescription:
      '自分の言葉で普通に書いてください。文章でも、箇条書きでも、多少フラストレーションが含まれていても大丈夫です。BridgeCaseが内容を整理し、適切で丁寧なメールを作成します。',

    naturalInputTitle:
      '自然な文章で入力できます',

    naturalInputNote:
      '最初から内容を整理する必要はありません。BridgeCaseが整理します。',

    naturalInputExample:
      '例：ホテルの駐車場は利用していません。フロントにも利用していないと伝え、その際には請求されないと言われました。しかし、最終明細には駐車料金が入っていました。誤って請求された駐車料金を返金してほしいです。',

    seeExample:
      'BridgeCaseが整理する内容を見る',

    hideExample:
      '整理する内容を閉じる',

    organizedExampleTitle:
      'BridgeCaseが次の内容に整理します',

    organizedExamples: [
      '何が起きたか',
      '企業に何をしてほしいか',
      '何を確認してほしいか',
    ],

    requestPlaceholder:
      '起きたことを自分の言葉で入力してください...',

    recipientLanguageTitle:
      '相手企業へ送る言語',

    recipientLanguageDescription:
      '相手企業が受け取るメールの言語を選択してください。',

    privacyTitle:
      '個人情報を保護してください',

    privacyDescription:
      'パスワード、カード番号全体、公的な身分証番号は入力しないでください。',

    saveLater:
      '後で保存',

    continue:
      '続ける',

    analyze:
      '案件を分析',

    modalEyebrow:
      '入力内容の確認',

    modalReadyTitle:
      '案件内容を整理する準備ができました',

    modalMissingTitle:
      '追加情報が必要です',

    modalItemsReviewed:
      '件の入力項目を確認しました',

    modalOriginalMessage:
      '元のメッセージ',

    modalOriginalAdded:
      '入力されています',

    modalOriginalFromDocuments:
      '元のメッセージはありません。関連資料から会社名や案件情報を確認します。',

    modalOriginalMissing:
      '元のメッセージまたは関連資料を追加してください',

    modalDocuments:
      '関連資料',

    modalDocumentsSelected:
      '件のファイルを選択済み',

    modalDocumentsOptional:
      '任意ですが、資料を追加すると精度が上がります',

    modalRequest:
      '希望する対応',

    modalRequestAdded:
      '入力されています',

    modalRequestMissing:
      '企業に何をしてほしいか入力してください',

    modalNextTitle:
      '分析後に確認する内容',

    modalNextDescription:
      'AIが次の項目を日本語で整理します',

    reviewItems: [
      '確認できた事実',
      '利用者が説明した内容',
      'まだ確認できない情報',
      '企業へ希望する対応',
    ],

    modalReview:
      '入力内容を確認',

    modalAddMissing:
      '不足情報を入力',

    modalOrganize:
      '案件内容を整理',

    howItWorks:
      '仕組み',

    howItWorksTitle:
      'AIが整理し、あなたが判断',

    features: [
      {
        icon: 'AI',
        title: 'AIが案件内容を整理',
        description:
          '確認できた事実、利用者の説明、まだ確認が必要な情報を分けて整理します。',
      },
      {
        icon: 'Aa',
        title: '日本語で全文を確認',
        description:
          '翻訳前にメール全体を日本語で確認し、自由に修正できます。',
      },
      {
        icon: '⇄',
        title: '翻訳後の内容を照合',
        description:
          '金額、日付、希望する対応が、承認した内容と一致しているか確認します。',
      },
    ],
  },

  es: {
    brandTagline:
      'Asistencia internacional en tu idioma',

    aiLabelFirst:
      'Con tecnología de IA',

    aiLabelSecond:
      'Revisa y edita antes de traducir',

    heroLineOne:
      'Resuelve problemas con empresas',

    heroLineTwo:
      'en tu propio idioma',

    heroDescriptionOne:
      'Añade el mensaje original y los documentos',

    heroDescriptionTwo:
      'Revisa en español el resumen del caso y el borrador',

    heroApproval:
      'Nada se traduce ni se envía sin tu aprobación',

    visualInputLabel:
      'Tu idioma',

    visualInputText:
      'Cancelé el servicio pero me cobraron de nuevo',

    visualBridgeLineOne:
      'Organiza tu caso',

    visualBridgeLineTwo:
      'y aclara lo que solicitas',

    visualOutputLabel:
      'Idioma de la empresa',

    visualOutputText:
      'Solicitud de reembolso clara y profesional',

    cardOneTitle:
      'Revisa y edita cada mensaje',

    cardOneDescription:
      'Revisa el borrador completo en español antes de traducirlo.',

    cardTwoTitle:
      'Nada se envía automáticamente',

    cardTwoDescription:
      'Tú decides antes de enviar un mensaje o aceptar una oferta.',

    cardThreeDirection:
      'Ejemplo: Español → Inglés',

    cardThreeTitle:
      'Verificamos la traducción',

    cardThreeDescription:
      'Comprobamos que los importes, las fechas y lo que solicitaste coincidan con la versión que aprobaste.',

    approvedRequest:
      'Aprobado en español',

    approvedExample:
      'Solicito un reembolso completo de $250',

    translatedMessage:
      'Traducido al inglés',

    translatedExample:
      'I am requesting a full refund of $250',

    detailsMatch:
      'Los datos clave coinciden',

    newCase:
      'NUEVO CASO',

    caseTitle:
      'Cuéntanos qué ocurrió',

    caseDescription:
      'Escribe lo que necesitas y añade el mensaje original o los documentos relacionados.',

    originalMessage:
      'Mensaje original',

    documents:
      'Documentos',

    yourRequest:
      'Tu solicitud',

    emailTitle:
      'Copia y pega el mensaje que recibiste',

    emailDescription:
      'Copia el correo o mensaje de soporte original y pégalo abajo. Incluye el remitente, el destinatario, el asunto y la fecha si están disponibles.',

    windows:
      'Windows',

    mac:
      'Mac',

    mobile:
      'Móvil',

    mobileAction:
      'Mantén pulsado → Copiar → Pegar',

    emailPlaceholder:
      'Pega aquí el correo o mensaje de soporte original...',

    controlNoticeTitle:
      'Tú mantienes el control',

    controlNotice:
      'BridgeCase identifica los hechos confirmados, lo que explicaste y la información que falta. Nada se envía sin tu aprobación.',

    documentTitle:
      'Sube recibos y documentos relacionados',

    documentDescription:
      'Si tienes el PDF original, sube el archivo completo. BridgeCase identificará las páginas relevantes.',

    evidenceTitle:
      'Comprueba que esta información sea legible',

    evidenceDescription:
      'Los documentos claros y legibles ayudan a evitar errores.',

    checks: [
      'Empresa o vendedor',
      'Importe y moneda',
      'Fecha de compra o cobro',
      'Número de pedido, reserva o cuenta',
      'Producto, servicio o suscripción',
      'Detalles de cancelación, reembolso o cobro adicional',
    ],

    chooseFiles:
      'Elige archivos PDF o imágenes',

    chooseFilesAction:
      'Selecciona archivos de tu dispositivo',

    fileLimits:
      'Hasta 5 archivos • 20 páginas PDF • 25 MB en total',

    fileTypes:
      'PDF, JPG, JPEG o PNG',

    noCompressionTitle:
      'No necesitas comprimirlos',

    noCompression:
      'Sube los archivos originales siempre que sea posible. No es necesario comprimirlos ni recortarlos.',

    selectedFiles:
      'Archivos seleccionados',

    remove:
      'Eliminar',

    requestTitle:
      '¿Qué quieres que haga la empresa?',

    requestDescription:
      'Escribe con naturalidad en tu idioma. Puedes usar un párrafo, viñetas o expresar tu frustración. BridgeCase organizará la información y creará un correo claro y profesional.',

    naturalInputTitle:
      'Escribe con naturalidad',

    naturalInputNote:
      'No necesitas organizar la información primero. BridgeCase lo hará por ti.',

    naturalInputExample:
      'Ejemplo: No utilicé el estacionamiento del hotel. Se lo dije a recepción y me dijeron que no me cobrarían. Sin embargo, el cargo apareció en la factura final. Quiero que me reembolsen el cargo.',

    seeExample:
      'Ver cómo BridgeCase organizará el mensaje',

    hideExample:
      'Ocultar la estructura',

    organizedExampleTitle:
      'BridgeCase separará el mensaje en:',

    organizedExamples: [
      'Qué ocurrió',
      'Qué quieres que haga la empresa',
      'Qué debe confirmar la empresa',
    ],

    requestPlaceholder:
      'Describe lo ocurrido con tus propias palabras...',

    recipientLanguageTitle:
      'Idioma para la empresa',

    recipientLanguageDescription:
      'Elige el idioma del correo que recibirá la empresa.',

    privacyTitle:
      'Protege tu información privada',

    privacyDescription:
      'No incluyas contraseñas, números completos de tarjetas ni números de identificación oficial.',

    saveLater:
      'Guardar para después',

    continue:
      'Continuar',

    analyze:
      'Analizar el caso',

    modalEyebrow:
      'REVISIÓN DE DATOS',

    modalReadyTitle:
      'Todo está listo para organizar el caso',

    modalMissingTitle:
      'Se necesita más información',

    modalItemsReviewed:
      'elementos revisados',

    modalOriginalMessage:
      'Mensaje original',

    modalOriginalAdded:
      'Añadido',

    modalOriginalFromDocuments:
      'No hay un mensaje original. Buscaremos la empresa y los datos del caso en los documentos.',

    modalOriginalMissing:
      'Añade el mensaje original o al menos un documento',

    modalDocuments:
      'Documentos',

    modalDocumentsSelected:
      'archivo(s) seleccionado(s)',

    modalDocumentsOptional:
      'Es opcional, pero puede mejorar la precisión',

    modalRequest:
      'Resultado solicitado',

    modalRequestAdded:
      'Añadido',

    modalRequestMissing:
      'Indica qué quieres que haga la empresa',

    modalNextTitle:
      'Qué revisarás después',

    modalNextDescription:
      'La IA organizará esta información en español',

    reviewItems: [
      'Hechos confirmados',
      'Lo que explicaste',
      'Información aún no confirmada',
      'Lo que solicitas a la empresa',
    ],

    modalReview:
      'Revisar los datos',

    modalAddMissing:
      'Añadir la información',

    modalOrganize:
      'Organizar el caso',

    howItWorks:
      'CÓMO FUNCIONA',

    howItWorksTitle:
      'La IA prepara. Tú decides.',

    features: [
      {
        icon: 'AI',
        title: 'La IA organiza tu caso',
        description:
          'Los hechos confirmados, lo que explicaste y los datos que aún deben verificarse se separan claramente.',
      },
      {
        icon: 'Aa',
        title: 'Revisa todo en español',
        description:
          'Revisa y edita el correo completo en español antes de traducirlo.',
      },
      {
        icon: '⇄',
        title: 'Verificamos la traducción',
        description:
          'Comprobamos que los importes, las fechas y lo que solicitaste coincidan con la versión que aprobaste.',
      },
    ],
  },
}

function App() {
  const [language, setLanguage] =
    useState<Language>('en')

  const [
    recipientLanguage,
    setRecipientLanguage,
  ] = useState<Language>('en')

  const [activeStep, setActiveStep] =
    useState<Step>('email')

  const [
    originalMessage,
    setOriginalMessage,
  ] = useState('')

  const [
    userRequest,
    setUserRequest,
  ] = useState('')

  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<File[]>([])

  const [fileError, setFileError] =
    useState('')

  const [
    showExample,
    setShowExample,
  ] = useState(false)

  const [showModal, setShowModal] =
    useState(false)

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  const text = translations[language]

  const hasOriginalMessage =
    originalMessage.trim().length > 0

  const hasDocuments =
    selectedFiles.length > 0

  const hasRequest =
    userRequest.trim().length > 0

  const hasSource =
    hasOriginalMessage || hasDocuments

  const canAnalyze =
    hasSource && hasRequest

  const reviewedCount = [
    hasOriginalMessage,
    hasDocuments,
    hasRequest,
  ].filter(Boolean).length

  const handleContinue = () => {
    if (activeStep === 'email') {
      setActiveStep('documents')
      return
    }

    setActiveStep('request')
  }

  const handleFiles = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(
      event.target.files ?? [],
    )

    const combinedFiles = [
      ...selectedFiles,
      ...files,
    ]

    setFileError('')

    if (combinedFiles.length > MAX_FILES) {
      setFileError(
        language === 'ja'
          ? `最大${MAX_FILES}ファイルまで追加できます。`
          : language === 'es'
            ? `Puedes subir hasta ${MAX_FILES} archivos.`
            : `You can upload up to ${MAX_FILES} files.`,
      )

      event.target.value = ''
      return
    }

    const acceptedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]

    const invalidFile =
      files.some(
        (file) =>
          !acceptedTypes.includes(file.type),
      )

    if (invalidFile) {
      setFileError(
        language === 'ja'
          ? 'PDF、JPG、JPEG、PNGファイルを使用してください。'
          : language === 'es'
            ? 'Sube únicamente archivos PDF, JPG, JPEG o PNG.'
            : 'Please upload PDF, JPG, JPEG, or PNG files only.',
      )

      event.target.value = ''
      return
    }

    const totalSize =
      combinedFiles.reduce(
        (total, file) =>
          total + file.size,
        0,
      )

    if (totalSize > MAX_TOTAL_SIZE) {
      setFileError(
        language === 'ja'
          ? 'ファイルの合計サイズは25MBまでです。'
          : language === 'es'
            ? 'El tamaño total no puede superar los 25 MB.'
            : 'The total file size cannot exceed 25 MB.',
      )

      event.target.value = ''
      return
    }

    setSelectedFiles(combinedFiles)
    event.target.value = ''
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">
              B
            </div>

            <div>
              <p className="brand-name">
                BridgeCase
              </p>

              <p className="brand-tagline">
                {text.brandTagline}
              </p>
            </div>
          </div>

          <select
            className="language-select"
            value={language}
            onChange={(event) =>
              setLanguage(
                event.target
                  .value as Language,
              )
            }
          >
            {interfaceLanguageOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="hero-label">
            <span>✓</span>

            <strong>
              {text.aiLabelFirst}
            </strong>

            {language === 'en' && (
              <i>•</i>
            )}

            <strong>
              {text.aiLabelSecond}
            </strong>
          </div>

          <h1>
            <span>
              {text.heroLineOne}
            </span>

            <span>
              {text.heroLineTwo}
            </span>
          </h1>

          <div className="hero-description">
            <p>
              {text.heroDescriptionOne}
            </p>

            <p>
              {text.heroDescriptionTwo}
            </p>

            <strong>
              {text.heroApproval}
            </strong>
          </div>

          <div className="language-flow">
            <article className="flow-card">
              <small>
                {text.visualInputLabel}
              </small>

              <p>
                {text.visualInputText}
              </p>
            </article>

            <div className="bridge-center">
              <div className="bridge-logo">
                B
              </div>

              <strong>
                BridgeCase
              </strong>

              <div className="bridge-description">
                <span>
                  {text.visualBridgeLineOne}
                </span>

                <span>
                  {text.visualBridgeLineTwo}
                </span>
              </div>
            </div>

            <article className="flow-card">
              <small>
                {text.visualOutputLabel}
              </small>

              <p>
                {text.visualOutputText}
              </p>
            </article>
          </div>

          <div className="difference-grid">
            <article className="difference-card approval-card">
              <div className="difference-icon">
                ✓
              </div>

              <h2>
                {text.cardOneTitle}
              </h2>

              <p>
                {text.cardOneDescription}
              </p>
            </article>

            <article className="difference-card control-card">
              <div className="difference-icon">
                ●
              </div>

              <h2>
                {text.cardTwoTitle}
              </h2>

              <p>
                {text.cardTwoDescription}
              </p>
            </article>

            <article className="difference-card compare-card">
              <div className="difference-icon">
                ⇄
              </div>

              <span className="translation-direction">
                {text.cardThreeDirection}
              </span>

              <h2>
                {text.cardThreeTitle}
              </h2>

              <p>
                {text.cardThreeDescription}
              </p>

              <div className="translation-comparison">
                <div className="comparison-row">
                  <span>
                    {text.approvedRequest}
                  </span>

                  <strong>
                    {text.approvedExample}
                  </strong>
                </div>

                <div className="comparison-arrow">
                  ↓
                </div>

                <div className="comparison-row">
                  <span>
                    {text.translatedMessage}
                  </span>

                  <strong>
                    {text.translatedExample}
                  </strong>
                </div>

                <div className="comparison-result">
                  ✓ {text.detailsMatch}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="case-card">
          <div className="case-card-header">
            <p className="eyebrow">
              {text.newCase}
            </p>

            <h2>
              {text.caseTitle}
            </h2>

            <p>
              {text.caseDescription}
            </p>
          </div>

          <div className="step-tabs">
            {(
              [
                'email',
                'documents',
                'request',
              ] as Step[]
            ).map(
              (step, index) => (
                <button
                  type="button"
                  className={
                    activeStep === step
                      ? 'step active'
                      : 'step'
                  }
                  key={step}
                  onClick={() =>
                    setActiveStep(step)
                  }
                >
                  <span>
                    {index + 1}
                  </span>

                  {
                    [
                      text.originalMessage,
                      text.documents,
                      text.yourRequest,
                    ][index]
                  }
                </button>
              ),
            )}
          </div>

          <div className="form-area">
            {activeStep === 'email' && (
              <>
                <h3>
                  {text.emailTitle}
                </h3>

                <p className="field-help">
                  {text.emailDescription}
                </p>

                <div className="shortcut-guide">
                  <div>
                    <strong>
                      {text.windows}
                    </strong>

                    <span>
                      Ctrl+C → Ctrl+V
                    </span>
                  </div>

                  <div>
                    <strong>
                      {text.mac}
                    </strong>

                    <span>
                      ⌘C → ⌘V
                    </span>
                  </div>

                  <div>
                    <strong>
                      {text.mobile}
                    </strong>

                    <span>
                      {text.mobileAction}
                    </span>
                  </div>
                </div>

                <textarea
                  value={originalMessage}
                  onChange={(event) =>
                    setOriginalMessage(
                      event.target.value,
                    )
                  }
                  placeholder={
                    text.emailPlaceholder
                  }
                />

                <div className="notice-card success-card">
                  <strong>
                    ✓ {text.controlNoticeTitle}
                  </strong>

                  <p>
                    {text.controlNotice}
                  </p>
                </div>
              </>
            )}

            {activeStep ===
              'documents' && (
              <>
                <h3>
                  {text.documentTitle}
                </h3>

                <p className="field-help">
                  {text.documentDescription}
                </p>

                <div className="requirements-card">
                  <h4>
                    {text.evidenceTitle}
                  </h4>

                  <p>
                    {text.evidenceDescription}
                  </p>

                  <div className="requirements-grid">
                    {text.checks.map(
                      (item) => (
                        <div
                          className="requirement-item"
                          key={item}
                        >
                          <span>✓</span>
                          <p>{item}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  className="hidden-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  multiple
                  onChange={handleFiles}
                />

                <button
                  type="button"
                  className="upload-box"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <span className="large-upload-icon">
                    ↑
                  </span>

                  <strong>
                    {text.chooseFiles}
                  </strong>

                  <span>
                    {text.chooseFilesAction}
                  </span>

                  <small>
                    {text.fileLimits}
                  </small>

                  <small>
                    {text.fileTypes}
                  </small>
                </button>

                <div className="notice-card success-card">
                  <strong>
                    ✓ {text.noCompressionTitle}
                  </strong>

                  <p>
                    {text.noCompression}
                  </p>
                </div>

                {fileError && (
                  <div className="notice-card error-card">
                    {fileError}
                  </div>
                )}

                {selectedFiles.length >
                  0 && (
                  <div className="selected-files">
                    <div className="selected-files-header">
                      <strong>
                        {text.selectedFiles}
                      </strong>

                      <span>
                        {
                          selectedFiles.length
                        }{' '}
                        / {MAX_FILES}
                      </span>
                    </div>

                    {selectedFiles.map(
                      (file, index) => (
                        <div
                          className="selected-file"
                          key={`${file.name}-${file.lastModified}`}
                        >
                          <span>
                            <strong>
                              {file.type ===
                              'application/pdf'
                                ? 'PDF'
                                : 'IMG'}
                            </strong>{' '}
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFiles(
                                (current) =>
                                  current.filter(
                                    (
                                      _,
                                      currentIndex,
                                    ) =>
                                      currentIndex !==
                                      index,
                                  ),
                              )
                            }
                          >
                            {text.remove}
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </>
            )}

            {activeStep ===
              'request' && (
              <>
                <h3>
                  {text.requestTitle}
                </h3>

                <p className="field-help">
                  {text.requestDescription}
                </p>

                <div className="natural-input-guide">
                  <div className="natural-input-heading">
                    <span className="natural-input-icon">
                      ✎
                    </span>

                    <div>
                      <strong>
                        {
                          text.naturalInputTitle
                        }
                      </strong>

                      <p>
                        {
                          text.naturalInputNote
                        }
                      </p>
                    </div>
                  </div>

                  <div className="natural-input-example">
                    {
                      text.naturalInputExample
                    }
                  </div>
                </div>

                <button
                  type="button"
                  className="example-toggle"
                  onClick={() =>
                    setShowExample(
                      (current) =>
                        !current,
                    )
                  }
                >
                  {showExample
                    ? '▴'
                    : '▾'}{' '}
                  {showExample
                    ? text.hideExample
                    : text.seeExample}
                </button>

                {showExample && (
                  <div className="organized-example">
                    <strong>
                      {
                        text.organizedExampleTitle
                      }
                    </strong>

                    <div className="organized-example-list">
                      {text.organizedExamples.map(
                        (
                          item,
                          index,
                        ) => (
                          <div
                            className="organized-example-item"
                            key={item}
                          >
                            <span>
                              {index + 1}
                            </span>

                            <p>
                              {item}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <textarea
                  className="request-textarea"
                  value={userRequest}
                  onChange={(event) =>
                    setUserRequest(
                      event.target.value,
                    )
                  }
                  placeholder={
                    text.requestPlaceholder
                  }
                />

                <div className="recipient-language-card">
                  <div>
                    <strong>
                      {
                        text.recipientLanguageTitle
                      }
                    </strong>

                    <p>
                      {
                        text.recipientLanguageDescription
                      }
                    </p>
                  </div>

                  <select
                    value={
                      recipientLanguage
                    }
                    onChange={(event) =>
                      setRecipientLanguage(
                        event.target
                          .value as Language,
                      )
                    }
                  >
                    {recipientLanguageOptions[
                      language
                    ].map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="notice-card warning-card">
                  <strong>
                    ! {text.privacyTitle}
                  </strong>

                  <p>
                    {
                      text.privacyDescription
                    }
                  </p>
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="button">
                {text.saveLater}
              </button>

              {activeStep !==
              'request' ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    handleContinue
                  }
                >
                  {text.continue} →
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    setShowModal(true)
                  }
                >
                  {text.analyze} →
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <p className="eyebrow">
            {text.howItWorks}
          </p>

          <h2>
            {text.howItWorksTitle}
          </h2>

          <div className="feature-grid">
            {text.features.map(
              (
                feature,
                index,
              ) => (
                <article
                  className="feature-card"
                  key={
                    feature.title
                  }
                >
                  <span className="feature-icon">
                    {feature.icon}
                  </span>

                  <div className="feature-number">
                    0{index + 1}
                  </div>

                  <h3>
                    {feature.title}
                  </h3>

                  <p>
                    {
                      feature.description
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        </section>
      </main>

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={() =>
            setShowModal(false)
          }
        >
          <section
            className="analysis-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close-button"
              type="button"
              onClick={() =>
                setShowModal(false)
              }
            >
              ×
            </button>

            <div className="modal-heading">
              <span>AI</span>

              <div>
                <p>
                  {text.modalEyebrow}
                </p>

                <h2>
                  {canAnalyze
                    ? text.modalReadyTitle
                    : text.modalMissingTitle}
                </h2>

                <small>
                  {reviewedCount}{' '}
                  {
                    text.modalItemsReviewed
                  }
                </small>
              </div>
            </div>

            <div className="analysis-status-list">
              <div
                className={
                  hasOriginalMessage
                    ? 'status-item complete'
                    : hasDocuments
                      ? 'status-item optional'
                      : 'status-item missing'
                }
              >
                <strong>
                  {hasOriginalMessage
                    ? '✓'
                    : hasDocuments
                      ? 'i'
                      : '!'}{' '}
                  {
                    text.modalOriginalMessage
                  }
                </strong>

                <p>
                  {hasOriginalMessage
                    ? text.modalOriginalAdded
                    : hasDocuments
                      ? text.modalOriginalFromDocuments
                      : text.modalOriginalMissing}
                </p>
              </div>

              <div
                className={
                  hasDocuments
                    ? 'status-item complete'
                    : 'status-item optional'
                }
              >
                <strong>
                  {hasDocuments
                    ? '✓'
                    : 'i'}{' '}
                  {
                    text.modalDocuments
                  }
                </strong>

                <p>
                  {hasDocuments
                    ? `${selectedFiles.length} ${text.modalDocumentsSelected}`
                    : text.modalDocumentsOptional}
                </p>
              </div>

              <div
                className={
                  hasRequest
                    ? 'status-item complete'
                    : 'status-item missing'
                }
              >
                <strong>
                  {hasRequest
                    ? '✓'
                    : '!'}{' '}
                  {text.modalRequest}
                </strong>

                <p>
                  {hasRequest
                    ? text.modalRequestAdded
                    : text.modalRequestMissing}
                </p>
              </div>
            </div>

            <div className="analysis-preview">
              <h3>
                {text.modalNextTitle}
              </h3>

              <p>
                {
                  text.modalNextDescription
                }
              </p>

              <ul>
                {text.reviewItems.map(
                  (item) => (
                    <li key={item}>
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
              >
                {canAnalyze
                  ? text.modalReview
                  : text.modalAddMissing}
              </button>

              {canAnalyze && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    alert(
                      'Next: case review screen',
                    )
                  }
                >
                  {text.modalOrganize} →
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App