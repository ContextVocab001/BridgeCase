const URL='https://api.tokenfactory.nebius.com/v1/chat/completions'
const MODEL='nvidia/Nemotron-3_5-Lightning'
const names={en:'English',ja:'Japanese',es:'Spanish'}
const str=x=>typeof x==='string'?x.trim():''
const arr=x=>Array.isArray(x)?x.map(str).filter(Boolean):[]
function parse(content){const raw=typeof content==='string'?content:Array.isArray(content)?content.map(x=>typeof x==='string'?x:x?.text||'').join('\n'):'';const text=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/```(?:json)?/gi,'').trim();try{return JSON.parse(text)}catch{}const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(text.slice(a,b+1));throw new Error('Invalid AI JSON')}
async function call(key,model,messages,max_tokens=3800,temperature=.1){const r=await fetch(URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages,temperature,max_tokens,response_format:{type:'json_object'},chat_template_kwargs:{enable_thinking:false},stream:false})});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data=null}if(!r.ok)throw new Error(data?.error?.message||`Nebius ${r.status}`);if(data?.choices?.[0]?.finish_reason==='length')throw new Error('AI response was cut off.');return parse(data?.choices?.[0]?.message?.content)}
function search(label){return `https://www.google.com/search?q=${encodeURIComponent(`${label} official website contact`)}`}
function urlsIn(text){return new Set((str(text).match(/https?:\/\/[^\s<>"')\]]+/gi)||[]).map(x=>x.replace(/[.,;:!?]+$/,'')))}
function isUnrelatedIntermediary(label){return /(?:clover|stripe|square|adyen|braintree|worldpay|fiserv|first data|toast|lightspeed|shopify payments|visa|mastercard|american express|amex|discover|card issuer|payment processor|payment gateway|pos support|決済代行|決済処理|カード会社|カードブランド|銀行|pos事業者|posサポート)/i.test(str(label))}
function cleanDraftText(value){
  const lines=str(value).split(/\r?\n/)
  const out=[]
  let closed=false
  for(const rawLine of lines){
    const line=rawLine.trimEnd(),t=line.trim()
    if(!t){if(out.length&&out[out.length-1]!=='')out.push('');continue}
    if(/^\s*(?:\[?your name\]?|\[?your contact information\]?|name\s*[:：]?|contact information\s*[:：]?|taro yamada)\s*$/i.test(t))continue
    if(/^\s*[【\[]?(?:取引詳細|transaction details)[】\]]?\s*$/i.test(t))continue
    if(/^\s*[-•]\s*/.test(t)){
      const keepIdentifier=/(?:reference\s*(?:id|number)?|reservation\s*(?:id|number)?|confirmation\s*(?:code|number)?|folio\s*(?:number)?|pnr|ticket\s*(?:number)?|rental agreement\s*(?:number)?|order\s*(?:id|number)?|invoice\s*(?:id|number)?|参照番号|予約番号|確認番号|フォリオ番号|航空券番号|レンタル契約番号|注文番号|請求書番号)/i.test(t)
      if(!keepIdentifier)continue
    }
    if(closed)continue
    out.push(line)
    if(/^(?:best regards,?|sincerely,?|yours sincerely,?|atentamente,?)$/i.test(t))closed=true
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim()
}
function isDisplayFact(label){
  const x=str(label)
  if(/(?:store|merchant|property|facility|location|address|payment method|card|brand|auth|authorization|mid|aid|avs|cvv|cvm|subtotal|tax rate|installment|店舗|店名|施設名|取引先|場所|住所|支払方法|カード|ブランド|認証|小計|税率|支払回数)/i.test(x))return false
  return true
}
function cleanFactValue(label,value){
  const l=str(label),v=str(value)
  if(/(?:date and time|transaction date|payment date|取引日時|支払日時)/i.test(l))return v.replace(/([0-9]{4}[-年][0-9]{1,2}[-月][0-9]{1,2}日?)(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?/,'$1')
  return v
}
function normalize(raw,model,sourceText=''){
  const facts=Array.isArray(raw?.confirmedFacts)?raw.confirmedFacts.map(x=>({label:str(x?.label),value:cleanFactValue(x?.label,x?.value),source:['document','message','user'].includes(x?.source)?x.source:'document'})).filter(x=>x.label&&x.value&&isDisplayFact(x.label)):[]
  const missing=Array.isArray(raw?.readiness?.missingFields)?raw.readiness.missingFields.map(x=>({key:str(x?.key),label:str(x?.label),reason:str(x?.reason),alternatives:arr(x?.alternatives)})).filter(x=>x.key&&x.label):[]
  const info=Array.isArray(raw?.referenceInformation)?raw.referenceInformation.map(x=>({label:str(x?.label),value:str(x?.value),source:['document','message','user'].includes(x?.source)?x.source:'document'})).filter(x=>x.label&&x.value):[]
  const suppliedUrls=urlsIn(sourceText)
  const seen=new Set()
  const contacts=Array.isArray(raw?.contactCandidates)?raw.contactCandidates.map(x=>{
    const label=str(x?.label),proposed=str(x?.url).replace(/[.,;:!?]+$/,'')
    if(!label||seen.has(label.toLowerCase())||isUnrelatedIntermediary(label))return null
    seen.add(label.toLowerCase())
    const directlySupplied=suppliedUrls.has(proposed)&&/^https:\/\//i.test(proposed)&&!/google\.|bing\./i.test(proposed)
    return{label,url:directlySupplied?proposed:search(label),reason:str(x?.reason),kind:directlySupplied?'official-site':'search',recommended:Boolean(x?.recommended)}
  }).filter(Boolean).slice(0,3):[]
  const m=raw?.messageSource||{}
  const coreReady=Boolean(raw?.readiness?.targetIdentified&&raw?.readiness?.transactionIdentified&&raw?.readiness?.issueIdentified&&raw?.readiness?.outcomeIdentified)
  return{confirmedFacts:facts,userStatements:arr(raw?.userStatements),requestedOutcome:str(raw?.requestedOutcome),readiness:{ready:coreReady,targetIdentified:Boolean(raw?.readiness?.targetIdentified),transactionIdentified:Boolean(raw?.readiness?.transactionIdentified),issueIdentified:Boolean(raw?.readiness?.issueIdentified),outcomeIdentified:Boolean(raw?.readiness?.outcomeIdentified),missingFields:coreReady?[]:missing},messageSource:{senderName:str(m.senderName),senderEmail:str(m.senderEmail),replyTo:str(m.replyTo),subject:str(m.subject),date:str(m.date),isForwarded:Boolean(m.isForwarded),isNoReply:Boolean(m.isNoReply),noReplyReason:str(m.noReplyReason),attachments:arr(m.attachments)},referenceInformation:info,contactCandidates:contacts,draft:{subject:str(raw?.draft?.subject),body:cleanDraftText(raw?.draft?.body)},meta:{mode:'nebius',model}}
}
export const config={maxDuration:60}
export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed.'});return}
  const key=process.env.NEBIUS_API_KEY
  if(!key){res.status(503).json({error:'NEBIUS_API_KEY is not configured.'});return}
  try{
    const i=req.body||{},model=process.env.NEBIUS_MODEL||MODEL,ui=names[i.interfaceLanguage]||'English',recipient=names[i.recipientLanguage]||'English'
    if(i.mode==='translate'){
      if(!str(i.approvedSubject)||!str(i.approvedBody)){res.status(400).json({error:'Approved text is required.'});return}
      const translationSystem=`You convert the CURRENT approved consumer inquiry from ${ui} to ${recipient}. Return JSON only as {"subject":"","body":""}.
CONTENT:
- Use only the current approved subject and body. Never reuse examples, prior cases, or another industry.
- Preserve every fact, official name, identifier type and value, date, amount, currency, quantity, negation, and requested action.
- A Folio Number remains Folio Number; a Reservation ID remains Reservation ID; a Rental Agreement Number remains Rental Agreement Number.
- Every monetary value must keep an explicit currency symbol or ISO code. Never output a bare monetary number.
- Do not add allegations, requests, evidence, promises, deadlines, or explanations.
FORMAT:
- Produce a complete, send-ready message with exactly one salutation and one closing/signature block.
- Never address the message to the customer, guest, passenger, renter, or account holder.
- English: "Dear [Organization] Team," or "To whom it may concern,"; then the body; "Thank you for your assistance."; "Best regards,". Add the sender's actual name only when it is explicitly verified in the approved text. Never output placeholders such as [Your Name] or [Your Contact Information].
- Japanese: "[Organization] ご担当者様" or "ご担当者様"; end with a natural polite request. Add an actual sender name only when it is explicitly verified; never output a name/contact placeholder.
- Spanish: "Al equipo de [Organización]:" or "A quien corresponda:"; "Gracias por su ayuda."; "Atentamente,". Add the actual sender name only when it is explicitly verified; never output placeholders.
- Email addresses and contact details normally belong in the email sender information or dedicated form fields, not in the message body or signature.
- Do not add any personal name after the closing. End at "Best regards," / "Atentamente," unless the approved body already contains an intentional signed name.
- Do not create a Transaction Details list. Preserve the concise structure of the approved text and include only the primary identifier needed to locate the case.
- Keep the subject neutral and construct it only from the current requested action, disputed item, and exact primary identifier type/value.`
      const result=await call(key,model,[{role:'system',content:translationSystem},{role:'user',content:`APPROVED SUBJECT:\n${i.approvedSubject}\n\nAPPROVED BODY:\n${i.approvedBody}`}],2600,0)
      res.status(200).json({subject:str(result.subject),body:cleanDraftText(result.body)});return
    }
    const schema='{"confirmedFacts":[{"label":"","value":"","source":"document|message|user"}],"userStatements":[""],"requestedOutcome":"","readiness":{"targetIdentified":true,"transactionIdentified":true,"issueIdentified":true,"outcomeIdentified":true,"missingFields":[{"key":"","label":"","reason":"","alternatives":[""]}]},"messageSource":{"senderName":"","senderEmail":"","replyTo":"","subject":"","date":"","isForwarded":false,"isNoReply":false,"noReplyReason":"","attachments":[""]},"referenceInformation":[{"label":"","value":"","source":"document|message|user"}],"contactCandidates":[{"label":"","url":"","reason":"","kind":"official-site|search","recommended":true}],"draft":{"subject":"","body":""}}'
    const system=`Use ${ui}. Return JSON only in the supplied shape.

EVIDENCE AND ACCURACY
- Use only the original message, OCR document text, uploaded-file metadata, user request, and additional information supplied in THIS request. Never reuse examples or details from another case.
- Never invent, translate, expand, normalize, or correct official organization/property names, personal names, addresses, codes, abbreviations, or identifiers.
- Never infer a state/country from a city, abbreviation, or postal code. Never add Apt., Suite, Unit, Room, Terminal, Gate, or similar qualifiers unless explicitly shown.
- If sources conflict, do not merge them or choose by plausibility. Omit the disputed value from the draft and ask only if essential.
- Label AI calculations as estimates/calculations, not document facts.

USER-FACING LANGUAGE AND PRIVACY
- Write every user-facing label, summary, reason, requested outcome, and draft in ${ui}. Preserve proper names, official names, identifiers, codes, vehicle models, amounts, and currencies.
- Omit internal/test-authoring text such as OCR note, AI note, Purposeful test condition, training note, test note, or instructions explaining how a test document was constructed.
- Every monetary value must include a currency symbol or ISO code in every field. Never output bare 42.00 when it means money.
- Do not include passwords, full card numbers, card expiry, approval/AID/AVS/CVV/CVM codes, processor data, or personal addresses in the draft.

CASE ORGANIZATION
- Separate confirmed document/message facts from user statements. Never present the user's statement as a document fact.
- Missing information may block only: identifying the responsible organization/facility, locating the transaction/reservation, identifying the issue, or understanding the requested outcome.
- If those four elements are identified, mark all four readiness flags true and do not block progress for optional details.
- Prefer identifiers by context: hotel reservation/folio; airline PNR/ticket; rental reservation/rental agreement; retail order/invoice; subscription account/invoice.
- When a strong identifier exists, omit card brand/last-four and lower-priority identifiers from the draft.
- Include only the minimum identifiers the recipient needs to locate the case.
- In confirmedFacts, show only user-relevant case facts: the exact primary identifier, the disputed item/amount, the total when useful, and a date only when useful. Do not show merchant/store/property name, address, payment method, card brand/last four, exact time, authorization codes, MID/AID/AVS/CVV/CVM, subtotal, tax rate, or installment count. Organization/property identity belongs in the contact candidate and salutation, not as a transaction-detail card.
- Never split one OCR line into invented sibling fields. If the receipt contains one line labeled "Tax 2" with a rate and amount, represent it as one Tax 2 fact. Never invent Tax 1.
- A label such as "Tax 2" does not by itself prove duplicate taxation. Describe it neutrally, ask what the charge is and how it was calculated, and request a refund only if it was charged in error.
- For daily charges, calculate unit amount x relevant quantity and use the total when supported. If totals genuinely conflict, do not choose silently.

MESSAGE SOURCE
- Detect forwarded messages and use the innermost original business message.
- Detect no-reply from From, Reply-To, headers, and body wording. Never offer a no-reply address as a contact route.
- Never use the customer or a forwarding sender/recipient as the inquiry addressee.

CONTACT CANDIDATES - SIMPLE SCOPE
- Teltruva prepares the inquiry; it does not crawl websites, auto-select a recipient, or claim that a contact route has been verified.
- Return only organizations that can reasonably investigate, correct, or refund the issue described by the user. Prefer the actual merchant, hotel, airline, rental company, seller, subscription provider, or responsible parent brand.
- A company merely printed on a receipt is not automatically responsible. Exclude payment processors, POS/receipt-system providers, payment gateways, card networks, card issuers, banks, booking-system vendors, and technology providers unless the user's issue specifically concerns that provider's own service and that provider can perform the requested action.
- For a hotel charge or tax question, return the hotel/property or its responsible brand, not Clover or another card/POS processor.
- Return 1-3 responsible organization/property candidates only. Prefer the most specific verified facility, branch, seller, or provider from the current evidence; a parent brand is secondary.
- Do not return phone, live chat, social media, review sites, or third-party directories.
- Do not invent a URL or email address. Copy a URL only when it appears verbatim in the supplied message/document; otherwise leave url empty so the app creates a Google search link.
- If several similarly named organizations/properties are plausible, return separate candidates and explain exactly what matches or remains uncertain.
- Candidate reasons must tell the user to confirm the official site, facility name, and location. Do not imply that the displayed route is confirmed.

DRAFT
- Write a concise, complete, first-person inquiry in ${ui} with one appropriate salutation, the issue, exact requested action, and a polite closing.
- Never output unfinished placeholders such as [Your Name], [Your Contact Information], Name:, Contact Information:, or localized equivalents.
- Include the sender's actual name only when it is explicitly verified in the current evidence or user input. Otherwise end cleanly after the closing. Do not ask for a name merely to complete the signature.
- Do not repeat an email address, phone number, or other contact details in the body/signature when the email sender or inquiry form already provides them.
- Do not create a Transaction Details section or dump OCR fields into the draft. The draft should normally contain: salutation; 1-2 short paragraphs explaining the disputed item; the requested review/refund; one exact primary identifier; polite closing. Do not include store/property name, address, card or payment method, exact time, authorization codes, MID, subtotal, tax rate, or total unless the total itself is the disputed issue.
- If a receipt says "Tax 2", do not call it duplicate tax unless separate evidence proves two tax charges. Ask for the meaning and calculation basis of Tax 2, and request a refund if it was charged in error.
- Never invent a sender name. End the English draft at "Best regards," with nothing after it.
- Keep the subject neutral: requested action + disputed item + exact primary identifier type/value. Preserve the exact identifier label from evidence, for example Reference ID must not become Transaction ID. Avoid accusatory wording unless explicitly requested.
- Never rename identifier types.
- Do not add requests the user did not make.

OUTPUT QUALITY
- Do not expose internal reasoning.
- Keep the draft easy to process in one pass.`
    const user=`SHAPE:${schema}\nMESSAGE:\n${str(i.originalMessage)||'(none)'}\nUSER REQUEST:\n${str(i.userRequest)||'(none)'}\nOCR DOCUMENT TEXT:\n${str(i.documentText)||'(none)'}\nFILES:${JSON.stringify(i.documents||[])}\nADDITIONAL:${JSON.stringify(i.additionalInformation||{})}`
    const sourceText=[i.originalMessage,i.documentText,JSON.stringify(i.documents||[])].filter(Boolean).join('\n')
    let raw=await call(key,model,[{role:'system',content:system},{role:'user',content:user}])
    let result=normalize(raw,model,sourceText)
    if(!result.requestedOutcome){const repair=`Return the complete JSON shape again. requestedOutcome is missing. Summarize only the action explicitly requested by the CURRENT user in ${ui}.`;raw=await call(key,model,[{role:'system',content:system},{role:'user',content:user},{role:'assistant',content:JSON.stringify(raw)},{role:'user',content:repair}],4000,0);result=normalize(raw,model,sourceText)}
    if(!result.requestedOutcome)throw new Error('AI could not identify the requested outcome. Please state what you want the company to do.')
    if(result.readiness.ready&&(!result.draft.subject||!result.draft.body)){const repair=`Return the complete JSON shape again. The CURRENT case is ready but its draft is incomplete. Build the subject and body only from this request and evidence.`;raw=await call(key,model,[{role:'system',content:system},{role:'user',content:user},{role:'assistant',content:JSON.stringify(raw)},{role:'user',content:repair}],4300,0);result=normalize(raw,model,sourceText)}
    if(result.readiness.ready&&(!result.draft.subject||!result.draft.body))throw new Error('AI could not prepare the inquiry draft. Please review the requested outcome and try again.')
    res.status(200).json(result)
  }catch(e){console.error('analyze-case',e);res.status(502).json({error:e instanceof Error?e.message:'Analysis failed.'})}
}
