import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './App.css'
import { analyzeCase } from './api/caseAnalysis'
import type { CaseAnalysis } from './api/caseAnalysis'

type Lang = 'en' | 'ja' | 'es'
type Step = 'email' | 'documents' | 'request'
type View = 'intake' | 'review' | 'draft' | 'translation'

type Option = { value: Lang; label: string }
type Fact = { label: string; value: string }

const MAX_FILES = 5
const MAX_TOTAL_SIZE = 25 * 1024 * 1024

const uiOptions: Option[] = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
]

const recipientOptions: Record<Lang, Option[]> = {
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

const copy = {
  en: {
    tagline: 'Tell. Translate. Trust.',
    heroA: 'Resolve consumer issues', heroB: 'in your own language',
    heroText: 'Add the original message and documents. Review the organized case and email draft in your language.',
    approval: 'Nothing is translated or sent without your approval',
    flowIn: 'Your language', flowInText: 'I canceled but was charged again',
    flowOut: 'Company language', flowOutText: 'Clear and professional refund request',
    bridgeA: 'Organizes your case', bridgeB: 'and keeps your request clear',
    safety: [
      ['✓','Review and edit every message','Check the complete draft in your language before translation.'],
      ['●','Nothing is sent automatically','You decide before any message is sent or offer is accepted.'],
      ['⇄','Translation checked against your approval','Amounts, dates, and requested outcomes are checked after translation.'],
    ],
    direction: 'Example: English → Spanish', approved: 'Approved in English', approvedText: 'I am requesting a full refund of $250', translated: 'Translated into Spanish', translatedText: 'Solicito un reembolso completo de $250', match: 'Key details match',
    newCase: 'NEW CASE', caseTitle: 'Tell us what happened', caseHelp: 'Describe what you need and add the original message or relevant documents.',
    tabs: ['Original message','Documents','Your request'],
    emailTitle: 'Copy and paste the message you received', emailHelp: 'Paste the original email or support message. Include the sender, recipient, subject, and date if available.', emailPlaceholder: 'Paste the original email or support message here...',
    controlTitle: 'You stay in control', controlText: 'Teltruva separates confirmed facts, your statements, and missing information.',
    docsTitle: 'Upload receipts and relevant documents', docsHelp: 'Upload the complete original file whenever possible.',
    checks: ['Company or seller','Amount and currency','Purchase or charge date','Order, booking, or account number','Product, service, or subscription','Cancellation, refund, or additional-charge details'],
    choose: 'Drop PDF or image files here', select: 'or select files from your device', limits: 'Up to 5 files • 25 MB total', noCompress: 'No compression needed', noCompressText: 'Upload original files whenever possible.', selected: 'Selected files', remove: 'Remove',
    requestTitle: 'What would you like the company to do?', requestHelp: 'Write naturally in your own language. A normal paragraph is fine, even if it includes frustration. Teltruva will organize it and create a clear, professional email.',
    naturalTitle: 'Write naturally in your own words', naturalNote: 'You do not need to organize the information first.', naturalExample: 'Example: I did not use the hotel parking lot. I told the front desk and was told I would not be charged, but the fee appeared on my final bill. I want a refund.',
    showStructure: 'See how Teltruva will organize it', hideStructure: 'Hide the organized example', structure: ['What happened','What you want the company to do','What the company should confirm'], placeholder: 'Describe what happened in your own words...',
    companyLang: 'Company language', companyLangHelp: 'Choose the language the company should receive.', privacy: 'Protect your private information', privacyText: 'Do not include passwords, full card numbers, or government ID numbers.', save: 'Save as draft', next: 'Continue', analyze: 'Analyze case',
    modalLabel: 'CASE INTAKE REVIEW', ready: 'Ready to organize your case', missing: 'More information is needed', sourceMissing: 'Add an original message or at least one document', sourceFromDocs: 'No message was added. Company and case details will be checked in the documents.', requestMissing: 'Tell us what you want the company to do', optionalDocs: 'Optional, but documents may improve accuracy', added: 'Added', organize: 'Organize case', reviewInputs: 'Review inputs',
    progress: ['Intake','Case review','Draft','Translation'],
    demo: 'CASE REVIEW', reviewTitle: 'Review the organized case', reviewHelp: 'Teltruva organized the information you provided. Review and edit it before creating the email.', demoTitle: 'Current analysis status', demoText: 'Your message was organized with NVIDIA Nemotron through Nebius Token Factory. Uploaded document contents will be analyzed after OCR is connected.',
    sections: ['Confirmed from documents','Your statements','Requested outcome','Not yet confirmed','Add to the email'], edit: 'Edit', done: 'Done', back: 'Back to inputs', createDraft: 'Create email draft',
    factLabels: ['Company or property','Stay dates','Reservation number','Disputed charge','Disputed amount','Contact method'], factValues: ['Example Hotel','September 13–18, 2026','HTL-12345','Daily parking fee','$50.00','Billing department listed on the receipt'],
    statements: ['I did not use the hotel parking lot.','I told the front desk that I was not parking a car.','The front desk said that I would not be charged.','The parking fee still appeared on the final bill.'],
    outcome: 'Refund the full parking charge of $50.', unknown: ['The type of parking document provided by the front desk','Why the hotel recorded parking use','When the refund will be processed'], options: ['Ask why the parking charge was added','Ask when the refund will be processed','Ask for written confirmation of the refund'],
    draftLabel: 'EMAIL DRAFT', draftTitle: 'Review the email in your language', draftHelp: 'Edit the complete email before translation. Nothing will be translated or sent until you approve it.', draftNoticeTitle: 'Review before translation', draftNoticeText: 'Edit the subject and message above. When everything looks right, approve the draft to continue to translation.', draftNoticeFootnote: 'Approving the draft will not send the email.', subject: 'Subject', message: 'Message',
    draftSubject: 'Request for refund of incorrect parking charges',
    draftBody: `Dear Billing Team,\n\nI reviewed the final bill for my stay and found parking charges that I believe were added incorrectly.\n\nI did not use the hotel parking lot during my stay. I also informed the front desk that I was not parking a car, and I was told that I would not be charged. However, the parking charges still appeared on my final bill.\n\nPlease review these charges and refund the full parking amount of $50. I would also appreciate an explanation of why the charges were added and confirmation of when the refund will be processed.\n\nThank you for your assistance.`,
    polite: 'Make more polite', shorter: 'Make shorter', restore: 'Restore original draft', approveDraft: 'Approve and translate',
    translationLabel: 'TRANSLATION REVIEW', translationTitle: 'Review the translated email', translationHelp: 'Compare the translated email with the approved version. The email has not been sent.', approvedVersion: 'Approved version', translatedVersion: 'Translated version', verify: 'Important details verified', safe: 'The important details match the approved version.', verification: ['$50 refund request','Parking charge dispute','Request for an explanation','Request for the refund date'], backDraft: 'Back to draft', approveTranslation: 'Approve translation', completion: 'Translation approved', completionText: 'Your translated email is ready.', nextStepTitle: 'Choose the next step', nextStepText: 'Copy the subject and message into your email, or open a prepared draft in your email app. Review the recipient and content, then send the email yourself.', nextStepFootnote: 'Nothing will be sent automatically.', copyEmail: 'Copy email', copySubject: 'Copy subject', copyMessage: 'Copy message', subjectCopied: 'Subject copied', messageCopied: 'Message copied', copyFailed: 'Copy failed', openEmail: 'Open in email app', notSent: 'Nothing has been sent', editTranslation: 'Edit translation', approvalEditNote: 'Returning to an earlier step will require translation approval again.', addMissing: 'Add missing information',
  },
  ja: {
    tagline: 'Tell. Translate. Trust.',
    heroA: '海外企業との問題を', heroB: '日本語で解決へ',
    heroText: '元のメッセージと資料を入力し、整理された案件内容とメール案を日本語で確認できます', approval: 'あなたの承認なしに翻訳・送信されることはありません',
    flowIn: 'あなたの言語', flowInText: '解約後に再請求されました', flowOut: '相手企業の言語', flowOutText: '丁寧で明確な返金依頼', bridgeA: '案件を整理し', bridgeB: '希望を明確にします',
    safety: [['✓','すべての文面を確認・修正','翻訳前に日本語で全文を確認し、必要な部分を修正できます。'],['●','自動で送信・合意しません','メッセージの送信や相手の提案への合意は、必ずあなたが判断します。'],['⇄','翻訳後の内容を照合','金額、日付、希望する対応が承認した内容と一致しているか確認します。']],
    direction: '例：日本語 → 英語', approved: '日本語で承認', approvedText: '250ドルの全額返金を希望します', translated: '英語へ翻訳', translatedText: 'I am requesting a full refund of $250', match: '金額と希望する対応が一致',
    newCase: '新しい案件', caseTitle: '何が起きたか教えてください', caseHelp: '希望する対応を入力し、元のメッセージまたは関連資料を追加してください。', tabs: ['元のメッセージ','関連資料','希望する対応'],
    emailTitle: '受け取ったメッセージをコピーして貼り付け', emailHelp: '元のメールやサポートメッセージを貼り付けてください。可能であれば送信者、受信者、件名、日付も含めてください。', emailPlaceholder: '受け取ったメールやサポートメッセージを貼り付けてください...', controlTitle: '最終判断はあなたが行います', controlText: 'Teltruvaが確認できた事実、利用者の説明、不足情報を整理します。',
    docsTitle: '領収書や関連資料をアップロード', docsHelp: '可能な限り元のファイル全体をアップロードしてください。', checks: ['会社名または販売者名','金額と通貨','購入日または請求日','注文番号、予約番号、アカウント番号','商品、サービス、契約プラン','解約、返金、追加請求に関する情報'], choose: 'PDFまたは画像をここにドロップ', select: 'または端末からファイルを選択', limits: '最大5ファイル • 合計25MB', noCompress: '圧縮する必要はありません', noCompressText: '可能な限り元のファイルをアップロードしてください。', selected: '選択したファイル', remove: '削除',
    requestTitle: '企業にどのような対応を希望しますか？', requestHelp: '自分の言葉で普通に書いてください。文章でも、箇条書きでも、多少フラストレーションが含まれていても大丈夫です。Teltruvaが内容を整理し、適切で丁寧なメールを作成します。', naturalTitle: '自然な文章で入力できます', naturalNote: '最初から内容を整理する必要はありません。', naturalExample: '例：ホテルの駐車場は利用していません。フロントにも利用していないと伝え、請求されないと言われましたが、最終明細に駐車料金が入っていました。返金してほしいです。', showStructure: 'Teltruvaが整理する内容を見る', hideStructure: '整理する内容を閉じる', structure: ['何が起きたか','企業に何をしてほしいか','何を確認してほしいか'], placeholder: '起きたことを自分の言葉で入力してください...', companyLang: '相手企業へ送る言語', companyLangHelp: '相手企業が受け取るメールの言語を選択してください。', privacy: '個人情報を保護してください', privacyText: 'パスワード、カード番号全体、公的な身分証番号は入力しないでください。', save: '下書きとして保存', next: '続ける', analyze: '案件を分析',
    modalLabel: '入力内容の確認', ready: '案件内容を整理する準備ができました', missing: '追加情報が必要です', sourceMissing: '元のメッセージまたは関連資料を追加してください', sourceFromDocs: '元のメッセージはありません。関連資料から会社名や案件情報を確認します。', requestMissing: '企業に何をしてほしいか入力してください', optionalDocs: '任意ですが、資料を追加すると精度が上がります', added: '入力されています', organize: '案件内容を整理', reviewInputs: '入力内容を確認',
    progress: ['入力','案件確認','メール案','翻訳確認'], demo: '案件内容の確認', reviewTitle: '整理された案件内容を確認', reviewHelp: 'Teltruvaが入力内容を整理しました。メール案を作成する前に、内容を確認・修正してください。', demoTitle: '現在の分析状況', demoText: '入力内容をNebius Token Factory上のNVIDIA Nemotronで整理しました。アップロード資料の本文はOCR接続後に分析されます。', sections: ['資料から確認できた内容','あなたが説明した内容','希望する対応','まだ確認できない内容','メールへ追加する内容'], edit: '編集', done: '完了', back: '入力画面へ戻る', createDraft: '日本語のメール案を作成',
    factLabels: ['会社・施設名','宿泊期間','予約番号','問題の請求項目','問題の請求額','連絡先'], factValues: ['Example Hotel','2026年9月13日〜18日','HTL-12345','1日ごとの駐車料金','50.00ドル','領収書に記載された請求担当窓口'], statements: ['ホテルの駐車場を利用していません。','フロントで駐車していないことを伝えました。','フロントから駐車料金は請求されないと説明されました。','最終明細には駐車料金が記載されていました。'], outcome: '誤って請求された駐車料金50ドルを全額返金してほしい。', unknown: ['フロントで渡された駐車に関する書類の種類','ホテルが駐車場を利用したと判断した理由','返金が処理される予定日'], options: ['駐車料金が追加された理由を確認する','返金処理の予定日を確認する','返金の書面による確認を依頼する'],
    draftLabel: 'メール案', draftTitle: '日本語のメール案を確認', draftHelp: '翻訳前にメール全文を確認・修正してください。承認するまで翻訳も送信も行いません。', draftNoticeTitle: '翻訳前に内容を確認', draftNoticeText: '上の件名と本文は自由に修正できます。内容に問題がなければ、メール案を承認して翻訳へ進んでください。', draftNoticeFootnote: 'メール案を承認しても、メールは送信されません。', subject: '件名', message: '本文', draftSubject: '誤って請求された駐車料金の返金について', draftBody: `ご担当者様\n\n宿泊後に受け取った最終明細を確認したところ、誤って追加されたと思われる駐車料金が記載されていました。\n\n私は宿泊中にホテルの駐車場を利用していません。フロントにも駐車していないことを伝え、その際には駐車料金は請求されないとの説明を受けました。しかし、最終明細には駐車料金が含まれていました。\n\n請求内容をご確認のうえ、誤って請求された駐車料金50ドルを全額返金していただけますでしょうか。また、駐車料金が追加された理由と、返金処理の予定日についてもご連絡をお願いいたします。\n\nよろしくお願いいたします。`, polite: 'さらに丁寧にする', shorter: '短くする', restore: '元のメール案へ戻す', approveDraft: '承認して翻訳',
    translationLabel: '翻訳内容の確認', translationTitle: '翻訳後のメールを確認', translationHelp: '承認した日本語と翻訳後のメールを比較してください。メールはまだ送信されていません。', approvedVersion: '承認した日本語', translatedVersion: '英語への翻訳', verify: '重要事項を照合済み', safe: '重要事項は承認した日本語と一致しています。', verification: ['50ドルの全額返金','駐車料金の誤請求','請求理由の確認','返金予定日の確認'], backDraft: 'メール案へ戻る', approveTranslation: '翻訳内容を承認', completion: '翻訳後のメールを承認しました', completionText: '翻訳後のメールを使用できます。', nextStepTitle: '次の操作を選択してください', nextStepText: '件名と本文をコピーしてメールへ貼り付けるか、メールアプリで作成済みの下書きを開いてください。宛先と内容を確認し、送信するのはあなた自身です。', nextStepFootnote: '自動で送信されることはありません。', copyEmail: 'メールをコピー', copySubject: '件名をコピー', copyMessage: '本文をコピー', subjectCopied: '件名をコピーしました', messageCopied: '本文をコピーしました', copyFailed: 'コピーできませんでした', openEmail: 'メールアプリで下書きを開く', notSent: 'まだ何も送信されていません', editTranslation: '翻訳内容を修正', approvalEditNote: '前の画面で内容を変更した場合は、翻訳内容の再確認が必要です。', addMissing: '不足情報を入力',
  },
  es: {
    tagline: 'Tell. Translate. Trust.', heroA: 'Resuelve problemas', heroB: 'en tu propio idioma', heroText: 'Añade el mensaje original y los documentos. Revisa el caso y el borrador en español.', approval: 'Nada se traduce ni se envía sin tu aprobación', flowIn: 'Tu idioma', flowInText: 'Me cobraron después de cancelar', flowOut: 'Idioma de la empresa', flowOutText: 'Solicitud clara de reembolso', bridgeA: 'Organiza tu caso', bridgeB: 'y aclara lo que solicitas',
    safety: [['✓','Revisa y edita cada mensaje','Revisa el borrador completo en español antes de traducirlo.'],['●','Nada se envía automáticamente','Tú decides antes de enviar un mensaje o aceptar una oferta.'],['⇄','Verificamos la traducción','Comprobamos los importes, las fechas y lo solicitado después de traducir.']], direction: 'Ejemplo: Español → Inglés', approved: 'Aprobado en español', approvedText: 'Solicito un reembolso completo de $250', translated: 'Traducido al inglés', translatedText: 'I am requesting a full refund of $250', match: 'Los datos clave coinciden',
    newCase: 'NUEVO CASO', caseTitle: 'Cuéntanos qué ocurrió', caseHelp: 'Escribe lo que necesitas y añade el mensaje original o documentos.', tabs: ['Mensaje original','Documentos','Tu solicitud'], emailTitle: 'Copia y pega el mensaje que recibiste', emailHelp: 'Pega el correo o mensaje original. Incluye remitente, destinatario, asunto y fecha si están disponibles.', emailPlaceholder: 'Pega aquí el mensaje original...', controlTitle: 'Tú mantienes el control', controlText: 'Teltruva separa los hechos confirmados, tus explicaciones y la información que falta.', docsTitle: 'Sube recibos y documentos relacionados', docsHelp: 'Sube el archivo original completo siempre que sea posible.', checks: ['Empresa o vendedor','Importe y moneda','Fecha de compra o cobro','Número de pedido, reserva o cuenta','Producto, servicio o suscripción','Detalles de cancelación, reembolso o cobro adicional'], choose: 'Suelta aquí los archivos PDF o las imágenes', select: 'o selecciona archivos de tu dispositivo', limits: 'Hasta 5 archivos • 25 MB en total', noCompress: 'No necesitas comprimirlos', noCompressText: 'Sube los archivos originales siempre que sea posible.', selected: 'Archivos seleccionados', remove: 'Eliminar',
    requestTitle: '¿Qué quieres que haga la empresa?', requestHelp: 'Escribe con naturalidad. Puedes usar un párrafo, viñetas o expresar tu frustración. Teltruva organizará la información y creará un correo profesional.', naturalTitle: 'Escribe con naturalidad', naturalNote: 'No necesitas organizar la información primero.', naturalExample: 'Ejemplo: No utilicé el estacionamiento. Se lo dije a recepción y me dijeron que no me cobrarían, pero el cargo apareció en la factura. Quiero un reembolso.', showStructure: 'Ver cómo Teltruva organizará el mensaje', hideStructure: 'Ocultar la estructura', structure: ['Qué ocurrió','Qué quieres que haga la empresa','Qué debe confirmar la empresa'], placeholder: 'Describe lo ocurrido con tus propias palabras...', companyLang: 'Idioma para la empresa', companyLangHelp: 'Elige el idioma del correo que recibirá la empresa.', privacy: 'Protege tu información privada', privacyText: 'No incluyas contraseñas, números completos de tarjetas ni identificación oficial.', save: 'Guardar como borrador', next: 'Continuar', analyze: 'Analizar el caso', modalLabel: 'REVISIÓN DE DATOS', ready: 'Todo está listo para organizar el caso', missing: 'Se necesita más información', sourceMissing: 'Añade el mensaje original o al menos un documento', sourceFromDocs: 'No hay mensaje. Buscaremos los datos del caso en los documentos.', requestMissing: 'Indica qué quieres que haga la empresa', optionalDocs: 'Opcional, pero puede mejorar la precisión', added: 'Añadido', organize: 'Organizar el caso', reviewInputs: 'Revisar los datos',
    progress: ['Datos','Revisión','Borrador','Traducción'], demo: 'REVISIÓN DEL CASO', reviewTitle: 'Revisa el caso organizado', reviewHelp: 'Teltruva organizó la información que proporcionaste. Revísala y edítala antes de crear el correo.', demoTitle: 'Estado actual del análisis', demoText: 'NVIDIA Nemotron organizó tu información mediante Nebius Token Factory. El contenido de los documentos se analizará cuando se conecte el OCR.', sections: ['Confirmado en los documentos','Lo que explicaste','Resultado solicitado','Aún no confirmado','Añadir al correo'], edit: 'Editar', done: 'Listo', back: 'Volver a los datos', createDraft: 'Crear borrador', factLabels: ['Empresa o alojamiento','Fechas de estancia','Número de reserva','Cargo cuestionado','Importe cuestionado','Método de contacto'], factValues: ['Example Hotel','13–18 de septiembre de 2026','HTL-12345','Cargo diario de estacionamiento','$50.00','Departamento de facturación del recibo'], statements: ['No utilicé el estacionamiento del hotel.','Informé a recepción de que no había estacionado.','Recepción dijo que no se me cobraría.','El cargo apareció en la factura final.'], outcome: 'Reembolso completo del cargo de estacionamiento de $50.', unknown: ['Tipo de documento entregado en recepción','Por qué el hotel registró el uso','Cuándo se procesará el reembolso'], options: ['Preguntar por qué se añadió el cargo','Preguntar cuándo se procesará el reembolso','Solicitar confirmación escrita'],
    draftLabel: 'BORRADOR', draftTitle: 'Revisa el correo en español', draftHelp: 'Edita el correo antes de traducirlo. Nada se enviará hasta que lo apruebes.', draftNoticeTitle: 'Revisa el contenido antes de traducir', draftNoticeText: 'Puedes editar el asunto y el mensaje. Cuando todo esté correcto, aprueba el borrador para continuar con la traducción.', draftNoticeFootnote: 'Aprobar el borrador no enviará el correo.', subject: 'Asunto', message: 'Mensaje', draftSubject: 'Solicitud de reembolso por cargos incorrectos de estacionamiento', draftBody: `Estimado equipo de facturación:\n\nRevisé la factura final y encontré cargos de estacionamiento que considero incorrectos.\n\nNo utilicé el estacionamiento del hotel. Informé a recepción y me dijeron que no se me cobraría. Sin embargo, el cargo apareció en la factura final.\n\nSolicito el reembolso completo de $50. También agradecería una explicación y la confirmación de cuándo se procesará el reembolso.\n\nGracias por su ayuda.`, polite: 'Hacer más formal', shorter: 'Hacer más breve', restore: 'Restaurar borrador', approveDraft: 'Aprobar y traducir', translationLabel: 'REVISIÓN DE LA TRADUCCIÓN', translationTitle: 'Revisa el correo traducido', translationHelp: 'Compara el correo traducido con la versión aprobada. Aún no se ha enviado.', approvedVersion: 'Versión aprobada', translatedVersion: 'Traducción al inglés', verify: 'Datos importantes verificados', safe: 'Los datos importantes coinciden con la versión aprobada.', verification: ['Reembolso de $50','Disputa del cargo','Solicitud de explicación','Fecha del reembolso'], backDraft: 'Volver al borrador', approveTranslation: 'Aprobar la traducción', completion: 'Traducción aprobada', completionText: 'El correo traducido está listo.', nextStepTitle: 'Elige el siguiente paso', nextStepText: 'Copia el asunto y el mensaje en tu correo, o abre un borrador preparado en tu aplicación de correo. Revisa el destinatario y el contenido antes de enviarlo.', nextStepFootnote: 'Nada se enviará automáticamente.', copyEmail: 'Copiar correo', copySubject: 'Copiar asunto', copyMessage: 'Copiar mensaje', subjectCopied: 'Asunto copiado', messageCopied: 'Mensaje copiado', copyFailed: 'No se pudo copiar', openEmail: 'Abrir borrador en la aplicación de correo', notSent: 'No se ha enviado nada', editTranslation: 'Editar la traducción', approvalEditNote: 'Si cambias un paso anterior, tendrás que aprobar de nuevo la traducción.', addMissing: 'Añadir la información',
  },
}

const translatedEmail = {
  en: {
    subject: 'Solicitud de reembolso por cargos incorrectos de estacionamiento',
    body: `Estimado equipo de facturación:\n\nRevisé la factura final de mi estancia y encontré cargos de estacionamiento que considero que se añadieron por error.\n\nNo utilicé el estacionamiento del hotel durante mi estancia. También informé a la recepción de que no había estacionado ningún vehículo y me dijeron que no se me cobraría. Sin embargo, los cargos aparecieron en la factura final.\n\nSolicito el reembolso completo de $50 y la confirmación del motivo del cargo y de la fecha prevista para el reembolso.\n\nGracias por su ayuda.`,
  },
  ja: {
    subject: 'Request for Refund of Incorrect Parking Charges',
    body: `Dear Billing Team,\n\nI reviewed the final bill for my stay and found parking charges that I believe were added incorrectly.\n\nI did not use the hotel parking lot during my stay. I informed the front desk that I was not parking a car and was told that I would not be charged. However, the parking charges still appeared on my final bill.\n\nPlease refund the full parking amount of $50. I would also appreciate an explanation of why the charges were added and confirmation of when the refund will be processed.\n\nThank you for your assistance.`,
  },
  es: {
    subject: 'Request for Refund of Incorrect Parking Charges',
    body: `Dear Billing Team,\n\nI reviewed the final bill and found parking charges that I believe were added incorrectly.\n\nI did not use the hotel parking lot. I informed the front desk and was told that I would not be charged. However, the charge appeared on the final bill.\n\nPlease refund the full $50 and confirm why the charge was added and when the refund will be processed.\n\nThank you for your assistance.`,
  },
}

function App() {
  const [language, setLanguage] = useState<Lang>('en')
  const [recipientLanguage, setRecipientLanguage] = useState<Lang>('en')
  const [step, setStep] = useState<Step>('email')
  const [view, setView] = useState<View>('intake')
  const [message, setMessage] = useState('')
  const [request, setRequest] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'subject' | 'message' | 'error' | null>(null)
  const [showStructure, setShowStructure] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [facts, setFacts] = useState<Fact[]>([])
  const [statements, setStatements] = useState<string[]>([])
  const [outcome, setOutcome] = useState('')
  const [unknown, setUnknown] = useState<string[]>([])
  const [options, setOptions] = useState([true, true, false])
  const [editingFacts, setEditingFacts] = useState(false)
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [translationApproved, setTranslationApproved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const t = copy[language]

  const hasMessage = message.trim().length > 0
  const hasFiles = files.length > 0
  const hasRequest = request.trim().length > 0
  const canAnalyze = (hasMessage || hasFiles) && hasRequest

  const applyAnalysis = (analysis: CaseAnalysis) => {
    setFacts(analysis.confirmedFacts)
    setStatements(analysis.userStatements)
    setOutcome(analysis.requestedOutcome)
    setUnknown(analysis.unconfirmedInformation)
    setDraftSubject(analysis.draft.subject)
    setDraftBody(analysis.draft.body)
  }
  const analyzeCurrentCase = async () => {
    setIsAnalyzing(true)
    setAnalysisError('')
    try {
      const [analysis] = await Promise.all([
        analyzeCase({ originalMessage: message, userRequest: request, interfaceLanguage: language, recipientLanguage, documents: files.map(file => ({ name:file.name, type:file.type, size:file.size })) }),
        new Promise(resolve => window.setTimeout(resolve, 450)),
      ])
      applyAnalysis(analysis)
      setShowModal(false)
      go('review')
    } catch (error) {
      const fallback = language==='ja' ? '案件を整理できませんでした。もう一度試してください。' : language==='es' ? 'No se pudo organizar el caso. Inténtalo de nuevo.' : 'The case could not be organized. Please try again.'
      setAnalysisError(error instanceof Error ? error.message : fallback)
    } finally { setIsAnalyzing(false) }
  }

  const changeLanguage = (lang: Lang) => {
    setLanguage(lang)
  }

  const addFiles = (added: File[]) => {
    const next = [...files, ...added]
    setFileError('')
    if (next.length > MAX_FILES) { setFileError(`Maximum ${MAX_FILES} files.`); return }
    if (added.some(file => !['application/pdf','image/jpeg','image/png'].includes(file.type))) { setFileError('PDF, JPG, JPEG, or PNG only.'); return }
    if (next.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) { setFileError('Maximum total size is 25 MB.'); return }
    setFiles(next)
  }
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }
  const onDropFiles = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(event.dataTransfer.files ?? []))
  }
  const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
  const copyText = async (kind: 'subject' | 'message', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(kind)
      window.setTimeout(() => setCopyStatus(null), 2200)
    } catch {
      setCopyStatus('error')
      window.setTimeout(() => setCopyStatus(null), 3000)
    }
  }
  const go = (next: View) => { setView(next); window.scrollTo(0,0) }
  const viewOrder: View[] = ['intake','review','draft','translation']
  const currentViewIndex = viewOrder.indexOf(view)
  const navigateProgress = (target: View, targetIndex: number) => {
    if (targetIndex > currentViewIndex) return
    if (targetIndex < currentViewIndex) setTranslationApproved(false)
    if (target === 'intake') setStep('request')
    go(target)
  }

  const progress = (active: number) => (
    <nav className="progress-strip" aria-label="Workflow progress">
      {t.progress.map((label, i) => {
        const target = viewOrder[i]
        const isCompleted = i < active
        const isCurrent = i === active - 1
        const isAvailable = i <= currentViewIndex
        return (
          <button
            type="button"
            className={`progress-item ${isCompleted ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isAvailable ? 'clickable' : ''}`}
            key={label}
            disabled={!isAvailable}
            onClick={() => navigateProgress(target, i)}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span>{i + 1}</span>
            <strong>{label}</strong>
          </button>
        )
      })}
    </nav>
  )
  const header = (
    <header className="header"><div className="header-inner">
      <button className="brand brand-button" onClick={()=>go('intake')}><div className="brand-icon">T</div><div><p className="brand-name">Teltruva</p><p className="brand-tagline">{t.tagline}</p></div></button>
      <select className="language-select" value={language} onChange={e=>changeLanguage(e.target.value as Lang)}>{uiOptions.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select>
    </div></header>
  )

  const intake = (
    <main className="main">
      <section className="hero">
        <div className="hero-label"><span>✓</span><strong>AI</strong><i>•</i><strong>{language==='ja'?'翻訳前に確認・修正':language==='es'?'Revisa antes de traducir':'Review before translation'}</strong></div>
        <h1><span>{t.heroA}</span><span>{t.heroB}</span></h1><div className="hero-copy"><p>{t.heroText}</p><div className="approval-badge"><span>✓</span><strong>{t.approval}</strong></div></div>
        <div className="language-flow"><article className="flow-card flow-card-input"><small>{t.flowIn}</small><p>{t.flowInText}</p></article><div className="bridge-center"><div className="bridge-logo">T</div><b>Teltruva</b><p>{t.bridgeA}<br/>{t.bridgeB}</p></div><article className="flow-card flow-card-output"><small>{t.flowOut}</small><p>{t.flowOutText}</p></article></div>
        <div className="difference-grid">{t.safety.map((x,i)=><article className={`difference-card c${i}`} key={x[1]}><span className="difference-icon">{i===1?'✉':x[0]}</span>{i===2&&<em>{t.direction}</em>}<h2>{x[1]}</h2><p>{x[2]}</p>{i===0&&<div className="feature-preview review-preview"><label>{language==='ja'?'あなたの入力':language==='es'?'TU MENSAJE':'YOUR INPUT'}</label><b>{language==='ja'?'身に覚えのない駐車料金が請求された。返金してほしい。':language==='es'?'Me cobraron el estacionamiento. No lo utilicé. Quiero un reembolso.':'I was charged for parking. I never parked there. I want a refund.'}</b><mark>✓ {language==='ja'?'自分の言葉で入力':language==='es'?'Escribe con tus propias palabras':'Write in your own words'}</mark></div>}{i===1&&<div className="feature-preview approval-preview"><label>{language==='ja'?'メールを準備しました':language==='es'?'MENSAJE PREPARADO':'MESSAGE PREPARED'}</label><b>{language==='ja'?'利用していない駐車場の料金が請求されていました。ご確認のうえ、返金をお願いします。':language==='es'?'Me cobraron un estacionamiento que no utilicé. Solicito que revisen el cargo y procesen el reembolso.':'I was charged for parking that I did not use. Please review the charge and issue a refund.'}</b><mark>🔒 {language==='ja'?'未送信・承認待ち':language==='es'?'No enviado • Requiere aprobación':'Not sent • Approval required'}</mark></div>}{i===2&&<div className="comparison"><label>{t.approved}</label><b>{t.approvedText}</b><span>↓</span><label>{t.translated}</label><b>{t.translatedText}</b><mark>✓ {t.match}</mark></div>}</article>)}</div>
      </section>
      <section className="case-card"><div className="case-head"><p>{t.newCase}</p><h2>{t.caseTitle}</h2><span>{t.caseHelp}</span></div>
        <div className="step-tabs">{(['email','documents','request'] as Step[]).map((s,i)=><button className={step===s?'active':''} onClick={()=>setStep(s)} key={s}><span>{i+1}</span>{t.tabs[i]}</button>)}</div>
        <div className="form-area">
          {step==='email'&&<><h3>{t.emailTitle}</h3><p className="help">{t.emailHelp}</p><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder={t.emailPlaceholder}/><div className="notice success"><b>✓ {t.controlTitle}</b><p>{t.controlText}</p></div></>}
          {step==='documents'&&<><h3>{t.docsTitle}</h3><p className="help">{t.docsHelp}</p><div className="requirements">{t.checks.map(x=><span key={x}>✓ {x}</span>)}</div><input className="hidden" ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={onFiles}/><button type="button" className={`upload ${isDragging?'dragging':''} ${files.length?'has-files':''}`} onClick={()=>inputRef.current?.click()} onDragEnter={event=>{event.preventDefault();setIsDragging(true)}} onDragOver={event=>event.preventDefault()} onDragLeave={()=>setIsDragging(false)} onDrop={onDropFiles}>{files.length===0?<><strong>↑</strong><b>{isDragging?(language==='ja'?'ここにファイルをドロップ':language==='es'?'Suelta los archivos aquí':'Drop files here'):t.choose}</b><span>{t.select}</span><small>{t.limits}</small></>:<><strong>✓</strong><b>{language==='ja'?`${files.length}件のファイルを追加しました`:language==='es'?`${files.length} archivo(s) añadido(s)`:`${files.length} file(s) added`}</b><div className="upload-file-list">{files.map(file=><span key={`${file.name}-${file.lastModified}`}><b>{file.name}</b><small>{formatSize(file.size)}</small></span>)}</div><span>{language==='ja'?'クリックまたはドロップしてさらに追加':language==='es'?'Haz clic o suelta más archivos':'Click or drop to add more'}</span></>}</button><div className="notice success"><b>✓ {t.noCompress}</b><p>{t.noCompressText}</p></div>{fileError&&<div className="notice error">{fileError}</div>}{files.length>0&&<div className="files"><header><b>{t.selected}</b><span>{files.length}/{MAX_FILES}</span></header>{files.map((f,i)=><div className="file" key={`${f.name}-${f.lastModified}`}><span><b>{f.type==='application/pdf'?'PDF':'IMG'}</b> {f.name} <small>{formatSize(f.size)}</small></span><button onClick={()=>setFiles(v=>v.filter((_,n)=>n!==i))}>{t.remove}</button></div>)}</div>}</>}
          {step==='request'&&<><h3>{t.requestTitle}</h3><p className="help">{t.requestHelp}</p><div className="natural"><b>{t.naturalTitle}</b><p>{t.naturalNote}</p><blockquote>{t.naturalExample}</blockquote></div><button className="text-button" onClick={()=>setShowStructure(v=>!v)}>{showStructure?'▴':'▾'} {showStructure?t.hideStructure:t.showStructure}</button>{showStructure&&<div className="structure">{t.structure.map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b></div>)}</div>}<textarea className="request-area" value={request} onChange={e=>setRequest(e.target.value)} placeholder={t.placeholder}/><div className="recipient"><div><b>{t.companyLang}</b><p>{t.companyLangHelp}</p></div><select value={recipientLanguage} onChange={e=>setRecipientLanguage(e.target.value as Lang)}>{recipientOptions[language].map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select></div><div className="notice warning notice-with-icon"><span className="notice-icon">!</span><div><b>{t.privacy}</b><p>{t.privacyText}</p></div></div></>}
          <div className="actions"><button>{t.save}</button>{step!=='request'?<button className="primary" onClick={()=>setStep(step==='email'?'documents':'request')}>{t.next} →</button>:<button className="primary" onClick={()=>setShowModal(true)}>{t.analyze} →</button>}</div>
        </div>
      </section>
    </main>
  )

  const review = (
    <main className="workflow-main">{progress(2)}<section className="workflow-heading"><p>{t.demo}</p><h1>{t.reviewTitle}</h1><span>{t.reviewHelp}</span></section><div className="demo"><b>i</b><div><strong>{t.demoTitle}</strong><p>{t.demoText}</p></div></div>
      <section className="review-card"><header><h2>{t.sections[0]}</h2><button className="text-button" onClick={()=>setEditingFacts(v=>!v)}>{editingFacts?t.done:t.edit}</button></header><div className="facts">{facts.map((f,i)=><label key={`${f.label}-${i}`}><span>{f.label}</span>{editingFacts?<input value={f.value} onChange={e=>setFacts(v=>v.map((x,n)=>n===i?{...x,value:e.target.value}:x))}/>:<b>{f.value}</b>}</label>)}</div></section>
      <section className="review-card"><h2>{t.sections[1]}</h2><div className="editable">{statements.map((x,i)=><div key={i}><span>{i+1}</span><textarea value={x} onChange={e=>setStatements(v=>v.map((y,n)=>n===i?e.target.value:y))}/></div>)}</div></section>
      <section className="review-card"><h2>{t.sections[2]}</h2><textarea value={outcome} onChange={e=>setOutcome(e.target.value)}/></section>
      <section className="review-card unknown"><h2>{t.sections[3]}</h2><div className="editable">{unknown.map((x,i)=><div key={i}><span>?</span><textarea value={x} onChange={e=>setUnknown(v=>v.map((y,n)=>n===i?e.target.value:y))}/></div>)}</div></section>
      <section className="review-card"><h2>{t.sections[4]}</h2><div className="check-list">{t.options.map((x,i)=><label key={x}><input type="checkbox" checked={options[i]} onChange={e=>setOptions(v=>v.map((y,n)=>n===i?e.target.checked:y))}/><span>{x}</span></label>)}</div></section>
      <div className="workflow-actions"><button onClick={()=>go('intake')}>← {t.back}</button><button className="primary" onClick={()=>go('draft')}>{t.createDraft} →</button></div>
    </main>
  )

  const draft = (
    <main className="workflow-main">{progress(3)}<section className="workflow-heading"><p>{t.draftLabel}</p><h1>{t.draftTitle}</h1><span>{t.draftHelp}</span></section><section className="draft-card"><label><span>{t.subject}</span><input value={draftSubject} onChange={e=>setDraftSubject(e.target.value)}/></label><label><span>{t.message}</span><textarea className="draft-area" value={draftBody} onChange={e=>setDraftBody(e.target.value)}/></label><div className="notice success action-guidance"><b>✓ {t.draftNoticeTitle}</b><p>{t.draftNoticeText}</p><small>{t.draftNoticeFootnote}</small></div></section><div className="workflow-actions"><button onClick={()=>go('review')}>← {t.back}</button><button className="primary" onClick={()=>{setTranslationApproved(false);go('translation')}}>{t.approveDraft} →</button></div></main>
  )

  const translation = (
    <main className="workflow-main">{progress(4)}<section className="workflow-heading"><p>{t.translationLabel}</p><h1>{translationApproved?t.completion:t.translationTitle}</h1><span>{translationApproved?t.completionText:t.translationHelp}</span></section>{!translationApproved?<><section className="translation-grid"><article><header><span>Aa</span><b>{t.approvedVersion}</b></header><h2>{draftSubject}</h2><pre>{draftBody}</pre></article><article><header><span>⇄</span><b>{t.translatedVersion}</b></header><h2>{translatedEmail[language].subject}</h2><pre>{translatedEmail[language].body}</pre></article></section><section className="verify"><h2>✓ {t.verify}</h2><p>{t.safe}</p><div>{t.verification.map(x=><span key={x}>✓ {x}</span>)}</div></section><div className="workflow-actions"><button onClick={()=>go('draft')}>← {t.backDraft}</button><button className="primary" onClick={()=>{setTranslationApproved(true);window.scrollTo(0,0)}}>{t.approveTranslation} →</button></div></>:<section className="complete"><div className="complete-heading"><div className="complete-check">✓</div><div><h2>{t.completion}</h2><p>{t.completionText}</p></div></div><div className="notice success notice-with-icon action-guidance next-step-guidance"><span className="notice-icon next-icon">→</span><div><b>{t.nextStepTitle}</b><p>{t.nextStepText}</p><small>{t.nextStepFootnote}</small></div></div><p className="approval-edit-note">{t.approvalEditNote}</p><footer className="complete-actions"><button onClick={()=>{setTranslationApproved(false);window.scrollTo(0,0)}}>← {t.editTranslation}</button><div className="copy-actions"><button onClick={()=>copyText('subject',translatedEmail[language].subject)}>{copyStatus==='subject'?`✓ ${t.subjectCopied}`:t.copySubject}</button><button onClick={()=>copyText('message',translatedEmail[language].body)}>{copyStatus==='message'?`✓ ${t.messageCopied}`:t.copyMessage}</button></div><button className="primary open-email-button" onClick={()=>window.location.href=`mailto:?subject=${encodeURIComponent(translatedEmail[language].subject)}&body=${encodeURIComponent(translatedEmail[language].body)}`}>{t.openEmail} →</button></footer>{copyStatus==='error'&&<p className="copy-feedback error-text">{t.copyFailed}</p>}</section>}</main>
  )

  return <div className="app">{header}{view==='intake'&&intake}{view==='review'&&review}{view==='draft'&&draft}{view==='translation'&&translation}
    {showModal&&<div className="modal-bg" onMouseDown={()=>setShowModal(false)}><section className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowModal(false)}>×</button><header><span>AI</span><div><p>{t.modalLabel}</p><h2>{canAnalyze?t.ready:t.missing}</h2></div></header><div className="status"><div className={hasMessage?'ok':hasFiles?'info':'bad'}><span className="status-icon">{hasMessage?'✓':hasFiles?'i':'!'}</span><div><b>{t.tabs[0]}</b><p>{hasMessage?t.added:hasFiles?t.sourceFromDocs:t.sourceMissing}</p></div></div><div className={hasFiles?'ok':'info'}><span className="status-icon">{hasFiles?'✓':'i'}</span><div><b>{t.tabs[1]}</b><p>{hasFiles?`${files.length} ${t.added}`:t.optionalDocs}</p></div></div><div className={hasRequest?'ok':'bad'}><span className="status-icon">{hasRequest?'✓':'!'}</span><div><b>{t.tabs[2]}</b><p>{hasRequest?t.added:t.requestMissing}</p></div></div></div>{analysisError&&<div className="analysis-api-error" role="alert">{analysisError}</div>}<footer><button onClick={()=>setShowModal(false)} disabled={isAnalyzing}>{canAnalyze?t.reviewInputs:t.addMissing}</button>{canAnalyze&&<button className="primary" onClick={analyzeCurrentCase} disabled={isAnalyzing}>{isAnalyzing ? (language==='ja'?'整理しています…':language==='es'?'Organizando…':'Organizing…') : `${t.organize} →`}</button>}</footer></section></div>}
  </div>
}

export default App
