const URL='https://api.tokenfactory.nebius.com/v1/chat/completions'
const MODEL='nvidia/Nemotron-3_5-Lightning'
const names={en:'English',ja:'Japanese',es:'Spanish'}
const str=x=>typeof x==='string'?x.trim():''
const arr=x=>Array.isArray(x)?x.map(str).filter(Boolean):[]
function parse(content){const raw=typeof content==='string'?content:Array.isArray(content)?content.map(x=>typeof x==='string'?x:x?.text||'').join('\n'):'';const text=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/```(?:json)?/gi,'').trim();try{return JSON.parse(text)}catch{}const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(text.slice(a,b+1));throw new Error('Invalid AI JSON')}
async function call(key,model,messages,max_tokens=3500,temperature=.1){const r=await fetch(URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages,temperature,max_tokens,response_format:{type:'json_object'},chat_template_kwargs:{enable_thinking:false},stream:false})});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data=null}if(!r.ok)throw new Error(data?.error?.message||`Nebius ${r.status}`);if(data?.choices?.[0]?.finish_reason==='length')throw new Error('AI response was cut off.');return parse(data?.choices?.[0]?.message?.content)}
function search(label){return `https://www.google.com/search?q=${encodeURIComponent(`${label} official contact`)}`}
function normalize(raw,model){const facts=Array.isArray(raw?.confirmedFacts)?raw.confirmedFacts.map(x=>({label:str(x?.label),value:str(x?.value),source:['document','message','user'].includes(x?.source)?x.source:'document'})).filter(x=>x.label&&x.value):[];const missing=Array.isArray(raw?.readiness?.missingFields)?raw.readiness.missingFields.map(x=>({key:str(x?.key),label:str(x?.label),reason:str(x?.reason),alternatives:arr(x?.alternatives)})).filter(x=>x.key&&x.label):[];const info=Array.isArray(raw?.referenceInformation)?raw.referenceInformation.map(x=>({label:str(x?.label),value:str(x?.value),source:['document','message','user'].includes(x?.source)?x.source:'document'})).filter(x=>x.label&&x.value):[];const contacts=Array.isArray(raw?.contactCandidates)?raw.contactCandidates.map(x=>{const label=str(x?.label),url=str(x?.url),official=/^https:\/\//i.test(url)&&!/google\.|bing\./i.test(url);return{label,url:official?url:search(label),reason:str(x?.reason),kind:official?(x?.kind||'official-site'):'search',recommended:Boolean(x?.recommended)}}).filter(x=>x.label):[];const m=raw?.messageSource||{};return{confirmedFacts:facts,userStatements:arr(raw?.userStatements),requestedOutcome:str(raw?.requestedOutcome),readiness:{ready:Boolean(raw?.readiness?.targetIdentified&&raw?.readiness?.transactionIdentified&&raw?.readiness?.issueIdentified&&raw?.readiness?.outcomeIdentified),targetIdentified:Boolean(raw?.readiness?.targetIdentified),transactionIdentified:Boolean(raw?.readiness?.transactionIdentified),issueIdentified:Boolean(raw?.readiness?.issueIdentified),outcomeIdentified:Boolean(raw?.readiness?.outcomeIdentified),missingFields:(raw?.readiness?.targetIdentified&&raw?.readiness?.transactionIdentified&&raw?.readiness?.issueIdentified&&raw?.readiness?.outcomeIdentified)?[]:missing},messageSource:{senderName:str(m.senderName),senderEmail:str(m.senderEmail),replyTo:str(m.replyTo),subject:str(m.subject),date:str(m.date),isForwarded:Boolean(m.isForwarded),isNoReply:Boolean(m.isNoReply),noReplyReason:str(m.noReplyReason),attachments:arr(m.attachments)},referenceInformation:info,contactCandidates:contacts,draft:{subject:str(raw?.draft?.subject),body:str(raw?.draft?.body)},meta:{mode:'nebius',model}}}
export const config={maxDuration:60}
export default async function handler(req,res){if(req.method!=='POST'){res.status(405).json({error:'Method not allowed.'});return}const key=process.env.NEBIUS_API_KEY;if(!key){res.status(503).json({error:'NEBIUS_API_KEY is not configured.'});return}try{const i=req.body||{},model=process.env.NEBIUS_MODEL||MODEL,ui=names[i.interfaceLanguage]||'English',recipient=names[i.recipientLanguage]||'English';if(i.mode==='translate'){
if(!str(i.approvedSubject)||!str(i.approvedBody)){res.status(400).json({error:'Approved text is required.'});return}
const translationSystem=`You convert an approved consumer inquiry from ${ui} to ${recipient}. Return JSON only as {"subject":"","body":""}.

NON-NEGOTIABLE CONTENT RULES
- Preserve every fact, proper name, official organization/property name, date, identifier, amount, currency, quantity, negation, and requested action.
- Never add a new allegation, request, promise, deadline, evidence, or apology.
- Every monetary value must retain an explicit currency symbol or ISO code. If the approved text establishes USD or uses $, render 10.00 as $10.00 and 50.00 as $50.00. Never output a bare monetary number.
- Keep the highest-priority case identifiers already present, such as reservation/confirmation/PNR, ticket, folio, invoice, order, or transaction number.

EMAIL FORMAT
- Produce a complete, send-ready message, not a literal fragment-by-fragment translation.
- Never use the customer/guest/passenger/account holder as the recipient or salutation.
- If the approved text identifies an organization/property, address that organization. If not, use the language's neutral generic addressee.
- English format: "Dear [Organization] Team," or "To whom it may concern,"; close with "Thank you for your assistance." then "Best regards," and the sender name.
- Japanese format: "[組織名] ご担当者様" or "ご担当者様"; close politely and include the sender name.
- Spanish format: "Al equipo de [Organización]:" or "A quien corresponda:"; close with "Gracias por su ayuda." then "Atentamente," and the sender name.
- Do not place a thank-you sentence before the salutation.
- Include exactly one salutation and one closing/signature block.
- Keep the subject neutral, concise, and action-oriented. Describe the requested action without accusing the recipient of misconduct.
- For ordinary refund requests, prefer wording such as "Request for Refund of Parking Charges (Folio Number: 76941)". Do not use "dispute", "unfair charge", "unauthorized charge", "fraudulent charge", "improper charge", or equivalent accusatory wording unless the user expressly chose that tone.
- Include the best primary identifier when available and preserve its exact type. A Folio Number must remain "Folio Number" and must not be renamed Reservation Number, Confirmation Number, Booking ID, PNR, Invoice ID, or another identifier type.
- Prefer the most specific verified organization or property name over a parent brand.
- If a strong identifier such as a reservation number, confirmation code, PNR, ticket number, folio number, invoice ID, or order number is present, omit card brand and card last-four unless the user expressly asks to include them or the recipient explicitly requires them.`
const result=await call(key,model,[{role:'system',content:translationSystem},{role:'user',content:`APPROVED SUBJECT:
${i.approvedSubject}

APPROVED BODY:
${i.approvedBody}`}],2400,0)
res.status(200).json({subject:str(result.subject),body:str(result.body)});return}
const schema='{"confirmedFacts":[{"label":"","value":"","source":"document|message|user"}],"userStatements":[""],"requestedOutcome":"","readiness":{"targetIdentified":true,"transactionIdentified":true,"issueIdentified":true,"outcomeIdentified":true,"missingFields":[{"key":"","label":"","reason":"","alternatives":[""]}]},"messageSource":{"senderName":"","senderEmail":"","replyTo":"","subject":"","date":"","isForwarded":false,"isNoReply":false,"noReplyReason":"","attachments":[""]},"referenceInformation":[{"label":"","value":"","source":"document|message|user"}],"contactCandidates":[{"label":"","url":"","reason":"","kind":"official-site|contact-form|email","recommended":true}],"draft":{"subject":"","body":""}}';const system=`You prepare a consumer inquiry as an assistant, not as an infallible auditor. Return JSON only.

LANGUAGE AND PERSPECTIVE
- Write every user-facing label, summary, reason, requestedOutcome, missing-field explanation, contact reason, and the entire draft in ${ui}, the interface language.
- Keep proper names, official company/property names, email addresses, URLs, identifiers, room/order/booking/folio/ticket numbers, card brands, last four digits, amounts, and currency codes/symbols unchanged unless normal locale formatting is unambiguous.
- The draft is the user's own editable message. Write in first person (for example I / 私 / yo), never as a third-party report such as "the guest states".
- Do not translate the draft into ${recipient}; translation happens only after the user approves the ${ui} draft.

FACTS AND USER STATEMENTS
- Separate facts found in documents/messages from statements supplied by the user. Never convert a user allegation into a confirmed document fact.
- Never invent facts, totals, dates, quantities, assurances, contact details, or requests.
- Do not add requests the user did not make, including evidence, apologies, explanations, or written confirmation.
- Detect forwarded messages and use the innermost original business message.
- Detect no-reply status from From, Reply-To, and body wording. Never recommend a no-reply address.
- Never invent an official URL. Copy a URL only from supplied content; otherwise leave it empty and allow the application to offer a search link.

AMOUNT REASONING
- Distinguish unit rate, billing unit, quantity/days/nights, stated total, calculated total, disputed amount, and requested refund. Never treat a daily or per-item rate as the total merely because it is the clearest amount in OCR text.
- Use calendar arithmetic when dates establish a quantity. For hotel stays, checkout date minus check-in date is normally the number of nights. Example: Sep 13 to Sep 18 is 5 nights, not 1 and not 6.
- If the user says the service was not used for the whole stay/period and the document shows a daily charge, calculate daily rate × relevant nights/days and use that result as the estimated disputed total. Include localized confirmedFacts for the unit rate, quantity, calculation, and estimated disputed total.
- Do not create a missing field when the unit rate and quantity can be derived from the supplied dates or documents. In particular, never ask the user to re-enter a daily rate that OCR already found.
- A unit rate such as "$10.00/day" is not an answer to a question about the amount to dispute or refund. RequestedOutcome and the draft must use the estimated TOTAL, such as "$50.00" for $10.00 × 5 nights.
- Prefer an explicit document total when it clearly applies to the disputed item. If an explicit document total genuinely conflicts with rate × quantity, do not silently choose one. Ask only for the TOTAL amount the user wants disputed or refunded, not the daily/unit amount.
- When a total must be confirmed, make the missing-field label explicitly mean total, for example "Total refund amount" / "返金を希望する合計額" / "Importe total del reembolso". State the calculated suggestion in the reason and put the suggested total as the first alternative, for example "$50.00（$10.00 × 5泊）". Never use an ambiguous label such as "Parking charge amount".
- If the evidence supports a reasonable estimate without a genuine conflict, use it without blocking progress and describe it as an estimate derived from the supplied information. The user can edit the resulting draft.
- Check arithmetic once before returning JSON. Every amount in requestedOutcome, draft subject, and draft body must agree with the selected disputed amount.

RECIPIENT, IDENTIFIERS, AND MESSAGE MINIMIZATION
- Never address the inquiry to the user, customer, guest, passenger, cardholder, account holder, or any person appearing only in To/Cc/forwarding headers. Forwarded-message senders and recipients are not recipient candidates.
- If a verified recipient employee or department is not available, use a neutral organization salutation in ${ui}: Japanese "[Organization] ご担当者様"; English "Dear [Organization] Team,"; Spanish "Al equipo de [Organization]:". If the organization is unknown, use the language's generic equivalent.
- The sender/customer name belongs only in the identification details and signature, never as the salutation.
- Extract broadly for confirmedFacts, but put only the minimum identifiers needed to locate the case in the draft.
- Identifier priority by case type:
  * Hotel/lodging: reservation or confirmation number; folio number; invoice ID; guest name and stay dates; room number; transaction ID only if needed.
  * Airline: PNR/confirmation code; ticket number; passenger name; flight number/date/route; baggage or case number if relevant.
  * Retail/e-commerce: order number; purchaser name; purchase date; item; invoice/transaction number if needed.
  * Rental car: reservation or rental agreement number; renter name; pickup/return dates and location.
  * Subscription/service: account email or customer ID; invoice number; billing date and plan.
- Use lower-priority payment data only when higher-priority identifiers are absent or clearly insufficient. Card brand and last four digits are fallback identifiers, not default message content.
- Never place card expiry, approval code, AID, AVS/CVV/CVM response, masked full card pattern, processor codes, or other terminal data in the draft.
- Do not mechanically list merchant, location, card type, and every OCR field. Mention the organization naturally and omit duplicated or irrelevant fields.
- For a request for an itemized receipt, prefer a compact block such as invoice ID, transaction ID only if useful, payment date, and charged amount.
- The draft must be a complete email in ${ui}: one appropriate salutation, concise body, polite closing, and sender signature.
- Currency must be explicit everywhere in the draft. Never write a disputed monetary value as a bare number such as 50.00.

SOURCE FIDELITY AND ANTI-HALLUCINATION
- Treat OCR text, uploaded documents, original messages, and user-entered statements as the only evidence. Do not use general knowledge to fill gaps in names, addresses, locations, state/province names, room/unit types, dates, or identifiers.
- Preserve official organization/property names, personal names, addresses, codes, abbreviations, and identifiers exactly as supplied. Do not translate, transliterate, expand, normalize, correct, or make them sound more natural.
- Never expand a place abbreviation such as CA, FL, AK, UK, or similar into a state, province, or country name. Never infer a state from a city or postal code.
- Never add Apt., Suite, Unit, Room, Terminal, Gate, or similar qualifiers unless the exact qualifier appears in the evidence.
- If sources conflict, do not merge them into a new value or choose by plausibility. Omit the disputed value from the draft and ask for confirmation only if essential.
- Before returning JSON, verify each proper name, address, location, date, amount, and identifier against the supplied evidence. If support cannot be found, remove the value.
- Personal addresses are normally unnecessary. Do not include or prioritize a home address when a reservation number, confirmation code, PNR, ticket number, folio number, invoice ID, order number, transaction ID, stay/travel dates, or room number is available.
- confirmedFacts may contain only values directly supported by evidence. Label AI calculations as estimates or calculations, never as document facts.

NEUTRAL SUBJECTS AND EXACT IDENTIFIER TYPES
- Keep the draft subject neutral, concise, and action-oriented. State the requested action and the best primary identifier without accusing the recipient of misconduct.
- For ordinary refund requests, prefer localized equivalents of "Request for Refund of Parking Charges (Folio Number: 76941)". Avoid "dispute", "unfair charge", "unauthorized charge", "fraudulent charge", "improper charge", "不当請求", "不正請求", and equivalent accusatory wording unless the user expressly chose it.
- Preserve identifier types exactly as written in the evidence. A Folio Number must remain Folio Number. Never rename it Reservation Number, Confirmation Number, Booking ID, PNR, Invoice ID, or another identifier type.
- Prefer the most specific verified organization/property/seller name over a parent brand in the subject, salutation, and contact candidate.
- If a strong identifier such as reservation/confirmation number, PNR, ticket number, folio number, invoice ID, order number, or rental agreement number is available, omit card brand and card last-four from the draft and final referenceInformation unless the user expressly asks for them or the recipient explicitly requires them.

OUTPUT QUALITY
- Localize generic labels such as Guest Name, Stay Dates, Property, Guest Statement, Payment Method, and Disputed Amount into ${ui}. Do not localize the underlying proper names or identifiers.
- The draft must include only the available identifiers needed to process the case. Do not automatically include card last-four digits when name, dates, and reservation/folio/order number are sufficient.
- Missing information may block only identification of the responsible organization/facility, transaction/reservation, issue, or requested outcome.
- Keep the draft concise, professional, and easy for the recipient to process in one pass.`;const user=`SHAPE:${schema}\nMESSAGE:\n${str(i.originalMessage)||'(none)'}\nUSER REQUEST:\n${str(i.userRequest)||'(none)'}\nOCR DOCUMENT TEXT:\n${str(i.documentText)||'(none)'}\nFILES:${JSON.stringify(i.documents||[])}\nADDITIONAL:${JSON.stringify(i.additionalInformation||{})}`;const raw=await call(key,model,[{role:'system',content:system},{role:'user',content:user}]);const result=normalize(raw,model);if(!result.requestedOutcome||!result.draft.subject||!result.draft.body)throw new Error('Incomplete AI analysis.');res.status(200).json(result)}catch(e){console.error('analyze-case',e);res.status(502).json({error:e instanceof Error?e.message:'Analysis failed.'})}}
