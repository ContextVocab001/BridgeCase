const URL='https://api.tokenfactory.nebius.com/v1/chat/completions'
const MODEL='nvidia/Nemotron-3_5-Lightning'
const names={en:'English',ja:'Japanese',es:'Spanish','zh-CN':'Simplified Chinese','zh-TW':'Traditional Chinese','hi-IN':'Hindi'}
const str=x=>typeof x==='string'?x.trim():''
const arr=x=>Array.isArray(x)?x.map(str).filter(Boolean):[]
function parse(content){const raw=typeof content==='string'?content:Array.isArray(content)?content.map(x=>typeof x==='string'?x:x?.text||'').join('\n'):'';const text=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/```(?:json)?/gi,'').trim();try{return JSON.parse(text)}catch{}const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(text.slice(a,b+1));throw new Error('Invalid AI JSON')}
async function call(key,model,messages,max_tokens=3800,temperature=.1){const r=await fetch(URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages,temperature,max_tokens,response_format:{type:'json_object'},chat_template_kwargs:{enable_thinking:false},stream:false})});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data=null}if(!r.ok)throw new Error(data?.error?.message||`Nebius ${r.status}`);if(data?.choices?.[0]?.finish_reason==='length')throw new Error('AI response was cut off.');return parse(data?.choices?.[0]?.message?.content)}
function search(label){return `https://www.google.com/search?q=${encodeURIComponent(`${label} official website contact`)}`}
function urlsIn(text){return new Set((str(text).match(/https?:\/\/[^\s<>"')\]]+/gi)||[]).map(x=>x.replace(/[.,;:!?]+$/,'')))}
function isUnrelatedIntermediary(label){return /(?:clover|stripe|square|adyen|braintree|worldpay|fiserv|first data|toast|lightspeed|shopify payments|visa|mastercard|american express|amex|discover|card issuer|payment processor|payment gateway|pos support|決済代行|決済処理|カード会社|カードブランド|銀行|pos事業者|posサポート)/i.test(str(label))}
function cleanDraftText(value){return str(value).split(/\r?\n/).filter(line=>!/^\s*(?:\[?your name\]?|\[?your contact information\]?|name\s*[:：]\s*|contact information\s*[:：]\s*)\s*$/i.test(line)).join('\n').replace(/\n{3,}/g,'\n\n').trim()}
function detectDocumentCurrency(text){
  const value=str(text)
  if(/\$|\bUSD\b/i.test(value))return{code:'USD',symbol:'$'}
  if(/€|\bEUR\b/i.test(value))return{code:'EUR',symbol:'€'}
  if(/£|\bGBP\b/i.test(value))return{code:'GBP',symbol:'£'}
  if(/¥|￥|\bJPY\b|円/.test(value))return{code:'JPY',symbol:'¥'}
  return{code:'',symbol:''}
}
function parseTrailingAmount(line){
  const match=str(line).match(/([$€£¥￥]?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|[$€£¥￥]?\s*-?\d+\.\d{2})\s*(?:USD|EUR|GBP|JPY)?\s*$/i)
  if(!match)return null
  const amount=Number(match[1].replace(/[$€£¥￥,\s]/g,''))
  return Number.isFinite(amount)?Math.round(amount*100)/100:null
}
function normalizeOcrText(value){return str(value).toLowerCase().replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').trim()}
function allOccurrences(text,needle){const result=[];let from=0;while(needle&&from<text.length){const index=text.indexOf(needle,from);if(index<0)break;result.push(index);from=index+Math.max(1,needle.length)}return result}
function chargeOccurrenceWindows(documentText,selectedLabel){
  const normalizedText=normalizeOcrText(documentText),normalizedLabel=normalizeOcrText(selectedLabel),positions=allOccurrences(normalizedText,normalizedLabel)
  return positions.map((position,index)=>{
    const next=positions[index+1]??Math.min(normalizedText.length,position+420)
    const previous=index?positions[index-1]+normalizedLabel.length:Math.max(0,position-120)
    const start=Math.max(previous,position-120),end=Math.min(normalizedText.length,Math.max(position+normalizedLabel.length+180,next))
    return{occurrence:index+1,text:normalizedText.slice(start,end)}
  })
}
function fallbackOccurrenceAggregation(documentText,selectedLabel){
  const currency=detectDocumentCurrency(documentText),windows=chargeOccurrenceWindows(documentText,selectedLabel),matches=[]
  for(const window of windows){
    const label=normalizeOcrText(selectedLabel),after=window.text.slice(window.text.indexOf(label)+label.length)
    const values=[...after.matchAll(/-?\d{1,3}(?:,\d{3})*\.\d{2}/g)].map(match=>Number(match[0].replace(/,/g,''))).filter(Number.isFinite)
    if(values.length)matches.push({amount:values[0],evidence:window.text})
  }
  const grouped=new Map()
  for(const match of matches){const key=match.amount.toFixed(2),current=grouped.get(key)||{unitAmount:match.amount,count:0,subtotal:0};current.count+=1;current.subtotal=Math.round((current.subtotal+match.amount)*100)/100;grouped.set(key,current)}
  return{selectedLabel:str(selectedLabel),currencyCode:currency.code,currencySymbol:currency.symbol,lineCount:matches.length,totalAmount:Math.round(matches.reduce((sum,match)=>sum+match.amount,0)*100)/100,amountGroups:[...grouped.values()],evidenceLines:matches.map(match=>match.evidence)}
}
function validateChargeBlocks(raw,documentText,selectedLabel){
  const text=normalizeOcrText(documentText),label=normalizeOcrText(selectedLabel),blocks=Array.isArray(raw?.blocks)?raw.blocks:[],valid=[]
  for(const block of blocks){
    const quote=normalizeOcrText(block?.evidenceQuote),effectiveAmount=Number(block?.effectiveAmount),quantity=Number(block?.quantity||1),role=str(block?.role)
    if(!quote||!text.includes(quote)||!quote.includes(label)||!Number.isFinite(effectiveAmount)||!Number.isFinite(quantity)||quantity<=0)continue
    if(!['recurring-charge','single-charge','quantity-subtotal','adjustment','refund'].includes(role))continue
    const numericTokens=[...quote.matchAll(/-?\d{1,3}(?:,\d{3})*\.\d{2}/g)].map(match=>Number(match[0].replace(/,/g,'')))
    if(!numericTokens.some(value=>Math.abs(Math.abs(value)-Math.abs(effectiveAmount))<0.001))continue
    valid.push({evidenceQuote:quote,effectiveAmount:Math.round(effectiveAmount*100)/100,quantity,role})
  }
  return valid
}
function aggregateValidatedBlocks(documentText,selectedLabel,blocks){
  const currency=detectDocumentCurrency(documentText),grouped=new Map(),evidenceLines=[]
  for(const block of blocks){
    const perItem=block.quantity>1?Math.round(block.effectiveAmount/block.quantity*100)/100:block.effectiveAmount
    const key=perItem.toFixed(2),current=grouped.get(key)||{unitAmount:perItem,count:0,subtotal:0}
    current.count+=block.quantity;current.subtotal=Math.round((current.subtotal+block.effectiveAmount)*100)/100;grouped.set(key,current);evidenceLines.push(block.evidenceQuote)
  }
  return{selectedLabel:str(selectedLabel),currencyCode:currency.code,currencySymbol:currency.symbol,lineCount:blocks.reduce((sum,block)=>sum+block.quantity,0),totalAmount:Math.round(blocks.reduce((sum,block)=>sum+block.effectiveAmount,0)*100)/100,amountGroups:[...grouped.values()],evidenceLines}
}
const IDENTIFIER_RULES={
  hotel:[
    {type:'FOLIO_NUMBER',label:'Folio Number',pattern:/\bFolio\s*(?:Number|No\.?|#)?\s*[:#-]?\s*([A-Z0-9-]{3,})/i,priority:1},
    {type:'CONFIRMATION_NUMBER',label:'Confirmation Number',pattern:/\bConfirmation\s*(?:Number|No\.?|#|Code)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:2},
    {type:'RESERVATION_NUMBER',label:'Reservation Number',pattern:/\bReservation\s*(?:Number|No\.?|#|ID)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:3},
    {type:'REFERENCE_ID',label:'Reference ID',pattern:/\bReference\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:4}
  ],
  'rental-car':[
    {type:'RENTAL_AGREEMENT_NUMBER',label:'Rental Agreement Number',pattern:/\b(?:Rental\s+Agreement|Rental\s+Record|Agreement)\s*(?:Number|No\.?|#)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:1},
    {type:'RESERVATION_NUMBER',label:'Reservation Number',pattern:/\bReservation\s*(?:Number|No\.?|#|ID)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:2},
    {type:'CONFIRMATION_NUMBER',label:'Confirmation Number',pattern:/\bConfirmation\s*(?:Number|No\.?|#|Code)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:3},
    {type:'REFERENCE_ID',label:'Reference ID',pattern:/\bReference\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:4}
  ],
  airline:[
    {type:'TICKET_NUMBER',label:'Ticket Number',pattern:/\bTicket\s*(?:Number|No\.?|#)?\s*[:#-]?\s*([A-Z0-9-]{6,})/i,priority:1},
    {type:'PNR',label:'PNR',pattern:/\b(?:PNR|Booking\s+Reference)\s*[:#-]?\s*([A-Z0-9]{5,8})/i,priority:2},
    {type:'CONFIRMATION_NUMBER',label:'Confirmation Number',pattern:/\bConfirmation\s*(?:Number|No\.?|#|Code)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:3}
  ],
  retail:[
    {type:'ORDER_NUMBER',label:'Order Number',pattern:/\bOrder\s*(?:Number|No\.?|#|ID)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:1},
    {type:'INVOICE_NUMBER',label:'Invoice Number',pattern:/\bInvoice\s*(?:Number|No\.?|#|ID)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:2},
    {type:'TRANSACTION_ID',label:'Transaction ID',pattern:/\bTransaction\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:3},
    {type:'REFERENCE_ID',label:'Reference ID',pattern:/\bReference\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:4}
  ],
  payment:[
    {type:'REFERENCE_ID',label:'Reference ID',pattern:/\bReference\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:1},
    {type:'TRANSACTION_ID',label:'Transaction ID',pattern:/\bTransaction\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:2},
    {type:'RECEIPT_NUMBER',label:'Receipt Number',pattern:/\bReceipt\s*(?:Number|No\.?|#|ID)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:3}
  ]
}
const GENERIC_IDENTIFIER_RULES=[
  {type:'REFERENCE_ID',label:'Reference ID',pattern:/\bReference\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:50},
  {type:'TRANSACTION_ID',label:'Transaction ID',pattern:/\bTransaction\s*(?:ID|Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:51},
  {type:'CONFIRMATION_NUMBER',label:'Confirmation Number',pattern:/\bConfirmation\s*(?:Number|No\.?|#|Code)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i,priority:52}
]
function selectPrimaryIdentifier(documentText,caseType){
  const text=str(documentText),rules=[...(IDENTIFIER_RULES[caseType]||[]),...GENERIC_IDENTIFIER_RULES],seen=new Set(),candidates=[]
  for(const rule of rules){
    const match=rule.pattern.exec(text)
    if(!match)continue
    const value=str(match[1]),key=`${rule.type}|${value}`
    if(!value||seen.has(key))continue
    seen.add(key)
    const sourceLine=text.split('\n').map(line=>line.replace(/\r$/,'').trim()).find(line=>line.includes(match[0]))||str(match[0])
    candidates.push({type:rule.type,label:rule.label,value,priority:rule.priority,source:'document',sourceLine})
  }
  candidates.sort((a,b)=>a.priority-b.priority)
  return{caseType,candidates,primaryIdentifier:candidates[0]||null,supplementaryIdentifiers:[]}
}
function normalize(raw,model,sourceText=''){
  const facts=Array.isArray(raw?.confirmedFacts)?raw.confirmedFacts.map(x=>({label:str(x?.label),value:str(x?.value),source:['document','message','user'].includes(x?.source)?x.source:'document'})).filter(x=>x.label&&x.value):[]
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
    if(i.mode==='structure-user-input'){
      const userText=str(i.userText||i.userRequest)
      if(!userText){res.status(400).json({error:'User explanation is required.'});return}
      const structureSystem=`You structure only the user's own explanation. Return JSON only.
OUTPUT SHAPE:
{"sourceLanguage":"","claims":[{"code":"","statement":"","sourceQuote":""}],"requestedAction":{"code":"REFUND|EXPLANATION|CORRECTION|CANCELLATION|REPLACEMENT|OTHER","statement":""},"tone":"polite-neutral"}
RULES:
- Use only USER_TEXT. Do not use documents, OCR text, merchant data, prior cases, or general knowledge.
- Preserve the user's meaning, negation, uncertainty, and requested action.
- Each claim must be something the user explicitly stated. sourceQuote must be a short exact quote from USER_TEXT.
- statement and requestedAction.statement must be written in ${ui}.
- Keep claims concise and non-duplicative.
- Do not calculate amounts, dates, quantities, nights, days, taxes, or totals.
- Do not invent organization names, transaction details, identifiers, personal details, or evidence.
- Do not add evaluative or accusatory wording such as unfair, fraudulent, unauthorized, improper, illegal, double charged, or double taxed unless the user explicitly used that characterization.
- requestedAction.code describes only what the user asked the recipient to do.
- tone must always be polite-neutral in this step.
- Do not write an inquiry, salutation, subject, closing, or translation.`
      const structured=await call(key,model,[{role:'system',content:structureSystem},{role:'user',content:`USER_TEXT:
${userText}`}],1400,0)
      const allowedActions=new Set(['REFUND','EXPLANATION','CORRECTION','CANCELLATION','REPLACEMENT','OTHER'])
      const claims=Array.isArray(structured?.claims)?structured.claims.map(x=>({code:str(x?.code).toUpperCase().replace(/[^A-Z0-9_]/g,'_')||'USER_STATEMENT',statement:str(x?.statement),sourceQuote:str(x?.sourceQuote),source:'user'})).filter(x=>x.statement&&x.sourceQuote&&userText.includes(x.sourceQuote)).slice(0,12):[]
      const actionCode=str(structured?.requestedAction?.code).toUpperCase()
      const requestedAction={code:allowedActions.has(actionCode)?actionCode:'OTHER',statement:str(structured?.requestedAction?.statement)}
      if(!claims.length||!requestedAction.statement){throw new Error('AI could not structure the user explanation. Please try again.')}
      res.status(200).json({sourceLanguage:str(i.draftLanguage||i.interfaceLanguage)||'en',originalText:userText,claims,requestedAction,tone:'polite-neutral'});return
    }
    if(i.mode==='select-charge-label'){
      const userStructure=i.userStructure&&typeof i.userStructure==='object'?i.userStructure:null
      const documentText=str(i.documentText)
      if(!userStructure||!documentText){res.status(400).json({error:'Structured user explanation and OCR text are required.'});return}
      const claims=Array.isArray(userStructure.claims)?userStructure.claims.map(x=>str(x?.statement)).filter(Boolean):[]
      const requestedAction=str(userStructure?.requestedAction?.statement)
      if(!claims.length||!requestedAction){res.status(400).json({error:'Structured user explanation is incomplete.'});return}
      const selectionSystem=`Select only the document line-item label most directly related to the user's issue. Return JSON only.
OUTPUT SHAPE:
{"selectedLabel":"","documentQuotes":[""],"userClaimCodes":[""],"confidence":"high|medium|low","reason":""}
RULES:
- USER_STRUCTURE contains the user's already-validated claims and requested action. Do not reinterpret or strengthen them.
- OCR_TEXT is evidence. Select a label only when it appears verbatim in OCR_TEXT.
- selectedLabel must be the exact recurring or disputed line-item description as printed in OCR_TEXT, without a date, amount, currency, quantity, or calculated total.
- documentQuotes must contain 1 to 5 exact OCR_TEXT lines that include selectedLabel.
- userClaimCodes must contain only codes present in USER_STRUCTURE.claims that support the selection.
- This step selects a label only. Do not count occurrences, calculate totals, infer nights/days, select identifiers, draft a message, translate, or judge whether the charge is valid.
- Do not select payment methods, card brands, balances, grand totals, addresses, names, room numbers, authorization codes, or generic headers such as DATE, DESCRIPTION, CHARGES, CREDITS.
- If no line item clearly matches, return selectedLabel as an empty string, documentQuotes as an empty array, confidence as low, and explain the missing match neutrally.
- reason must be written in ${ui} and must not include new facts.`
      const selectionUser=`USER_STRUCTURE:
${JSON.stringify(userStructure)}

OCR_TEXT:
${documentText}`
      const selected=await call(key,model,[{role:'system',content:selectionSystem},{role:'user',content:selectionUser}],1300,0)
      const selectedLabel=str(selected?.selectedLabel)
      const documentLines=documentText.split('\n').map(line=>line.replace(/\r$/,'').trim()).filter(Boolean)
      const documentQuotes=arr(selected?.documentQuotes).filter(quote=>documentLines.includes(quote)&&(!selectedLabel||quote.includes(selectedLabel))).slice(0,5)
      const permittedCodes=new Set(Array.isArray(userStructure.claims)?userStructure.claims.map(x=>str(x?.code)).filter(Boolean):[])
      const userClaimCodes=arr(selected?.userClaimCodes).filter(code=>permittedCodes.has(code))
      const confidence=['high','medium','low'].includes(str(selected?.confidence))?str(selected.confidence):'low'
      if(selectedLabel&&(!documentText.includes(selectedLabel)||!documentQuotes.length)){throw new Error('AI selected a charge label without exact document evidence.')}
      res.status(200).json({selectedLabel,documentQuotes,userClaimCodes,confidence,reason:str(selected?.reason)});return
    }
    if(i.mode==='aggregate-selected-charge'){
      const selectedLabel=str(i.selectedLabel),documentText=str(i.documentText)
      if(!selectedLabel||!documentText){res.status(400).json({error:'Selected charge label and OCR text are required.'});return}
      if(!normalizeOcrText(documentText).includes(normalizeOcrText(selectedLabel))){res.status(400).json({error:'Selected charge label was not found in OCR text.'});return}
      const windows=chargeOccurrenceWindows(documentText,selectedLabel)
      const blockSystem=`Structure every occurrence of the selected disputed charge into independent charge blocks. Return JSON only.
OUTPUT SHAPE:
{"blocks":[{"evidenceQuote":"","role":"recurring-charge|single-charge|quantity-subtotal|adjustment|refund","quantity":1,"unitAmount":0,"subtotal":0,"effectiveAmount":0}]}
RULES:
- Use only OCR_TEXT and SELECTED_LABEL.
- Find every occurrence of SELECTED_LABEL, including repeated occurrences inside one long OCR line.
- evidenceQuote must be an exact contiguous quote from OCR_TEXT containing SELECTED_LABEL and the amount used for that block.
- If one occurrence is a normal repeated charge, quantity is 1 and effectiveAmount is that occurrence's charge.
- If one occurrence states quantity, unit price, and subtotal, use role quantity-subtotal and effectiveAmount equal to the subtotal. Do not add both unit price and subtotal.
- If the same selected charge appears separately for different dates, segments, passengers, or rental days, return one block per occurrence.
- Include a negative adjustment or refund only when the quote explicitly connects it to SELECTED_LABEL. Use a negative effectiveAmount.
- Do not infer quantity from date ranges, hotel nights, rental duration, flight segments, or passenger count.
- Do not include taxes unless the quote explicitly identifies that tax as part of SELECTED_LABEL.
- Ignore unrelated totals, balances, deposits, payment lines, and card transactions.
- Do not draft text or decide whether the charge is valid.`
      const structured=await call(key,model,[{role:'system',content:blockSystem},{role:'user',content:`SELECTED_LABEL:\n${selectedLabel}\n\nOCCURRENCE_WINDOWS:\n${JSON.stringify(windows)}\n\nOCR_TEXT:\n${documentText}`}],2200,0)
      const blocks=validateChargeBlocks(structured,documentText,selectedLabel)
      const aggregation=blocks.length?aggregateValidatedBlocks(documentText,selectedLabel,blocks):fallbackOccurrenceAggregation(documentText,selectedLabel)
      if(!aggregation.lineCount){res.status(422).json({error:'No validated charge occurrences matched the selected charge label.'});return}
      res.status(200).json(aggregation);return
    }
    if(i.mode==='extract-case-context'){
      const documentText=str(i.documentText),caseType=str(i.caseType)||'other'
      if(!documentText){res.status(400).json({error:'OCR text is required.'});return}
      const contextSystem=`Extract only the organization and transaction/service date range from OCR_TEXT. Return JSON only.
OUTPUT SHAPE:
{"organizationName":"","organizationQuote":"","startDate":"","endDate":"","dateQuotes":[""]}
RULES:
- Use only OCR_TEXT. Do not use outside knowledge.
- organizationName must be the exact organization/property/company name printed in OCR_TEXT, without address, phone, URL, card brand, processor, or legal explanation.
- organizationQuote must be one exact OCR_TEXT line containing the organizationName.
- For hotel, rental-car, and airline cases, startDate/endDate are the printed service/usage dates when clearly labeled. For other cases, use transaction/order/service dates only when clearly supported.
- Keep dates in the exact source format. Do not calculate duration, nights, days, or quantities.
- dateQuotes must contain exact OCR_TEXT lines supporting the dates.
- If a field is not clearly supported, return an empty string or empty array.
- Do not extract charges, totals, identifiers, personal names, room numbers, card details, addresses, or write a message.
- CURRENT_CASE_TYPE is ${caseType}.`
      const extracted=await call(key,model,[{role:'system',content:contextSystem},{role:'user',content:`OCR_TEXT:
${documentText}`}],1000,0)
      const documentLines=documentText.split('\n').map(line=>line.replace(/\r$/,'').trim()).filter(Boolean)
      const organizationName=str(extracted?.organizationName)
      const organizationQuote=str(extracted?.organizationQuote)
      const normalizedDocument=normalizeOcrText(documentText),normalizedOrganization=normalizeOcrText(organizationName),normalizedQuote=normalizeOcrText(organizationQuote)
      const quoteFoundInOcr=Boolean(normalizedQuote&&normalizedDocument.includes(normalizedQuote))
      const nameFoundInQuote=Boolean(normalizedOrganization&&normalizedQuote.includes(normalizedOrganization))
      const validOrganization=organizationName&&organizationQuote&&quoteFoundInOcr&&nameFoundInQuote
      const diagnosticHeader=documentLines.slice(0,40)
      const organizationTokenMatches=documentLines.filter(line=>/residence|inn|hotel|motel|resort|marriott|corona|riverside/i.test(line)).slice(0,20)
      console.log('TELTRUVA_CONTEXT_DIAGNOSTIC',JSON.stringify({caseType,ocrHeaderLines:diagnosticHeader,organizationTokenMatches,aiOrganizationName:organizationName,aiOrganizationQuote:organizationQuote,normalizedOrganization,normalizedQuote,quoteFoundInOcr,nameFoundInQuote,organizationAccepted:Boolean(validOrganization),aiStartDate:str(extracted?.startDate),aiEndDate:str(extracted?.endDate)}))
      const dateQuotes=arr(extracted?.dateQuotes).filter(quote=>documentLines.includes(quote)).slice(0,3)
      const startDate=str(extracted?.startDate),endDate=str(extracted?.endDate)
      const supportedDate=value=>!value||dateQuotes.some(quote=>quote.includes(value))
      res.status(200).json({organizationName:validOrganization?organizationName:'',organizationQuote:validOrganization?organizationQuote:'',startDate:supportedDate(startDate)?startDate:'',endDate:supportedDate(endDate)?endDate:'',dateQuotes});return
    }
    if(i.mode==='classify-case-type'){
      const documentText=str(i.documentText)
      const userStructure=i.userStructure&&typeof i.userStructure==='object'?i.userStructure:null
      if(!documentText||!userStructure){res.status(400).json({error:'OCR text and structured user explanation are required.'});return}
      const classificationSystem=`Classify the CURRENT case into exactly one category. Return JSON only.
OUTPUT SHAPE:
{"caseType":"hotel|rental-car|airline|retail|restaurant|subscription|payment|other","confidence":"high|medium|low","documentQuotes":[""],"reason":""}
RULES:
- Use only OCR_TEXT and USER_STRUCTURE.
- Select the business/transaction category, not the user's preferred remedy.
- hotel includes hotel, lodging, motel, resort, and accommodation folios.
- rental-car includes vehicle rental agreements and return receipts.
- airline includes flight tickets, PNRs, baggage, and airline itineraries.
- retail includes store, ecommerce, order, invoice, and shipped-goods transactions.
- restaurant includes dining and food-service receipts.
- subscription includes recurring membership and digital-service billing.
- payment is only for a generic payment/processor receipt when no more specific business category is supported.
- other is required when evidence is insufficient.
- documentQuotes must contain 1 to 3 exact lines from OCR_TEXT supporting the category.
- Do not identify a charge, count lines, calculate amounts, select an identifier, draft a message, or translate.
- reason must be concise and written in ${ui}.`
      const classified=await call(key,model,[{role:'system',content:classificationSystem},{role:'user',content:`USER_STRUCTURE:
${JSON.stringify(userStructure)}

OCR_TEXT:
${documentText}`}],900,0)
      const allowedTypes=new Set(['hotel','rental-car','airline','retail','restaurant','subscription','payment','other'])
      const caseType=allowedTypes.has(str(classified?.caseType))?str(classified.caseType):'other'
      const documentLines=documentText.split('\n').map(line=>line.replace(/\r$/,'').trim()).filter(Boolean)
      const documentQuotes=arr(classified?.documentQuotes).filter(quote=>documentLines.includes(quote)).slice(0,3)
      const confidence=['high','medium','low'].includes(str(classified?.confidence))?str(classified.confidence):'low'
      res.status(200).json({caseType,confidence,documentQuotes,reason:str(classified?.reason)});return
    }
    if(i.mode==='select-primary-identifier'){
      const documentText=str(i.documentText),caseType=str(i.caseType)||'other'
      if(!documentText){res.status(400).json({error:'OCR text is required.'});return}
      const result=selectPrimaryIdentifier(documentText,caseType)
      res.status(200).json(result);return
    }
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
- Keep the subject neutral: requested action + disputed item + exact primary identifier type/value. Avoid accusatory wording unless explicitly requested.
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