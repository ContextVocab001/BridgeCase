const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search'
const BLOCKED_HOSTS = [
  'facebook.com','instagram.com','x.com','twitter.com','linkedin.com','youtube.com','wikipedia.org','reddit.com',
  'yelp.com','tripadvisor.com','yellowpages.com','mapquest.com','bbb.org','pissedconsumer.com','gethuman.com',
  'allstays.com','complaintsboard.com','customerservicenumber.com','customer-service.com','booking.com','expedia.com',
  'hotels.com','trip.com','agoda.com','kayak.com','priceline.com','justanswer.com'
]
const AGGREGATOR_WORDS = /reviews?|complaints?|consumer|phone number|customer service number|how to reach|faq|directory|travel guide|book now|compare prices/i
const SENDABLE_WORDS = /contact us|contact form|customer support form|submit a question|submit (?:a )?request|send (?:us )?a message|email us|write to us|get in touch|feedback form/i
const GUIDE_WORDS = /billing issue|billing accuracy|charges?|refund|fees?|receipt|help article|topic detail|what do i do|frequently asked|faq/i
const LOCATION_WORDS = /location details|our location|airport|hotel information|property details|branch|station|office|address|hours/i
const GENERAL_INFO_WORDS = /about us|history|amenities|housekeeping|cleaning|travel guide|gallery|things to do|accommodations|rooms? & suites?/i
const clean = value => typeof value === 'string' ? value.trim() : ''
const tokens = value => clean(value).toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2)
function hostOf(value){ try { return new URL(value).hostname.toLowerCase().replace(/^www\./,'') } catch { return '' } }
function rootDomain(value){
  const host=hostOf(value)||clean(value).toLowerCase().replace(/^www\./,'')
  const parts=host.split('.').filter(Boolean)
  if(parts.length<=2)return host
  const compound=new Set(['co.uk','com.au','co.jp','co.nz','com.br','com.mx','co.in'])
  const lastTwo=parts.slice(-2).join('.')
  return compound.has(lastTwo)?parts.slice(-3).join('.'):lastTwo
}
function isBlocked(url){ const host=hostOf(url); return !host || BLOCKED_HOSTS.some(item=>host===item||host.endsWith(`.${item}`)) }
function termCoverage(text,value){
  const wanted=tokens(value)
  if(!wanted.length)return 0
  const haystack=clean(text).toLowerCase()
  return wanted.filter(token=>haystack.includes(token)).length/wanted.length
}
function officialDiscoveryScore(result,entity,location,index){
  const text=`${result.title} ${result.description} ${result.url}`
  let score=Math.max(0,8-index)
  score+=termCoverage(text,entity)*12
  score+=termCoverage(text,location)*7
  if(/^https:\/\//i.test(result.url))score+=1
  if(/official|welcome|our location|hotel information|contact us/i.test(text))score+=3
  if(AGGREGATOR_WORDS.test(text))score-=12
  if(/\/hotels?\/|\/locations?\/|\/property\//i.test(result.url))score+=2
  return score
}
function withinDomain(result,domain){ return rootDomain(result.url)===domain }
function normalizedPageTitle(value){
  return clean(value).toLowerCase().replace(/&amp;/g,'and').replace(/[^a-z0-9]+/g,' ').trim()
}
function normalizedPagePath(value){
  try{
    const url=new URL(value)
    return url.pathname.toLowerCase().replace(/\/+$/,'')||'/'
  }catch{return''}
}
function contentDuplicateKey(result){
  const title=normalizedPageTitle(result.title)
  const path=normalizedPagePath(result.url)
  return `${title}|${path}`
}
function roleSignals(result){
  const text=`${result.title} ${result.description}`
  const url=result.url.toLowerCase()
  const sendable=SENDABLE_WORDS.test(text)||/\/(?:contact|contact-us|support\/contact|customer-support-form)(?:[/.?]|$)/i.test(url)||/contact\.mi|customersupportform|submit.*question/i.test(url)
  const guide=GUIDE_WORDS.test(text)||/\/(?:article|topic|help|faq)(?:[/.?]|$)/i.test(url)
  const location=LOCATION_WORDS.test(text)||/\/(?:location|locations|hotels|hotel|property)(?:[/.?]|$)/i.test(url)
  const generalInfo=GENERAL_INFO_WORDS.test(text)&&!sendable&&!guide
  return{sendable,guide,location,generalInfo}
}
function purposeScore(result,purpose,entity,location,index){
  const text=`${result.title} ${result.description} ${result.url}`
  const signals=roleSignals(result)
  let score=Math.max(0,8-index)+termCoverage(text,entity)*4
  if(purpose==='contact-form')score+=signals.sendable?20:-8
  if(purpose==='case-guide')score+=signals.guide?14:-6
  if(purpose==='location-page')score+=termCoverage(text,location)*10+(signals.location?8:-4)
  if(purpose==='general-support')score+=signals.sendable?10:(/support|customer care|help/i.test(text)?4:-5)
  if(signals.generalInfo)score-=18
  if(AGGREGATOR_WORDS.test(text))score-=15
  return score
}
function purposeLabel(purpose){
  if(purpose==='contact-form')return'Official contact form'
  if(purpose==='case-guide')return'Official billing / refund guidance'
  if(purpose==='location-page')return'Official location or property page'
  return'Official customer support page'
}
function candidateRole(result,requestedPurpose){
  const signals=roleSignals(result)
  if(signals.sendable)return'contact-form'
  if(signals.guide)return'case-guide'
  if(signals.location)return'location-page'
  return requestedPurpose==='general-support'?'general-support':'general-information'
}
async function braveSearch(key,query,count=10){
  const url=new URL(BRAVE_URL)
  url.searchParams.set('q',query)
  url.searchParams.set('count',String(count))
  url.searchParams.set('safesearch','moderate')
  url.searchParams.set('text_decorations','false')
  const response=await fetch(url,{headers:{Accept:'application/json','Accept-Encoding':'gzip','X-Subscription-Token':key},signal:AbortSignal.timeout(9000)})
  if(!response.ok)throw new Error(`Brave Search ${response.status}`)
  const data=await response.json()
  return Array.isArray(data?.web?.results)?data.web.results.map(item=>({title:clean(item?.title),description:clean(item?.description),url:clean(item?.url)})).filter(item=>item.url):[]
}
function fallbackSearch(entity,location,caseType){
  const caseWords=caseType==='rental-car'?'past rental billing refund contact form':caseType==='hotel'?'billing refund contact form':caseType==='airline'?'payment refund contact form':'billing refund customer support contact form'
  const query=[entity,location,'official',caseWords].filter(Boolean).join(' ')
  return {label:'Search official site and contact route',url:`https://www.google.com/search?q=${encodeURIComponent(query)}`,kind:'search',purpose:'case-contact',searchEntity:entity,locationName:location||undefined,recommended:true,reason:'Official domain could not be confirmed automatically.'}
}
async function pause(){ await new Promise(resolve=>setTimeout(resolve,1100)) }
export const config={maxDuration:30}
export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed.'});return}
  const body=req.body||{}
  const entity=clean(body.entity),location=clean(body.location),caseType=clean(body.caseType)||'other'
  if(!entity){res.status(200).json({candidates:[],mode:'no-entity'});return}
  const key=process.env.BRAVE_SEARCH_API_KEY
  if(!key){res.status(200).json({candidates:[fallbackSearch(entity,location,caseType)],mode:'search-fallback',warning:'BRAVE_SEARCH_API_KEY is not configured.'});return}
  try{
    console.info('Official domain discovery started',{entity,location,caseType,keyConfigured:true})
    const discoveryQuery=[entity,location,'official website'].filter(Boolean).join(' ')
    const discoveryResults=await braveSearch(key,discoveryQuery,10)
    const discoveryRanked=discoveryResults
      .filter(result=>!isBlocked(result.url)&&termCoverage(`${result.title} ${result.description}`,entity)>=0.34)
      .map((result,index)=>({...result,score:officialDiscoveryScore(result,entity,location,index)}))
      .filter(result=>result.score>=8)
      .sort((a,b)=>b.score-a.score)
    const officialPage=discoveryRanked[0]
    if(!officialPage){
      console.warn('Official domain discovery failed',{resultCount:discoveryResults.length})
      res.status(200).json({candidates:[fallbackSearch(entity,location,caseType)],mode:'search-fallback',warning:'Official domain could not be confirmed.'});return
    }
    const officialDomain=rootDomain(officialPage.url)
    console.info('Official domain candidate selected',{officialDomain,sourceUrl:officialPage.url,score:officialPage.score})
    const task=caseType==='rental-car'?'past rental billing refund':caseType==='hotel'?'billing issue refund':caseType==='airline'?'payment refund':'billing refund'
    const plans=[
      {purpose:'contact-form',query:`site:${officialDomain} contact form submit question ${task}`},
      {purpose:'case-guide',query:`site:${officialDomain} ${task} help`},
      {purpose:'location-page',query:`site:${officialDomain} ${entity} ${location}`},
      {purpose:'general-support',query:`site:${officialDomain} contact us customer support`}
    ]
    const batches=[]
    for(const plan of plans){
      try{
        const results=await braveSearch(key,plan.query,8)
        batches.push({plan,results:results.filter(result=>withinDomain(result,officialDomain))})
        console.info('Official-domain query completed',{purpose:plan.purpose,resultCount:results.length,officialDomain})
      }catch(error){
        console.warn('Official-domain query failed',{purpose:plan.purpose,error:error instanceof Error?error.message:String(error)})
      }
      if(plan!==plans[plans.length-1])await pause()
    }
    const pooled=[]
    for(const {plan,results} of batches){
      for(const [index,result] of results.entries()){
        const role=candidateRole(result,plan.purpose)
        const score=purposeScore(result,plan.purpose,entity,location,index)
        pooled.push({...result,requestedPurpose:plan.purpose,role,score})
      }
    }
    const supportedRoles=new Set(['contact-form','case-guide','location-page','general-support'])
    const ranked=pooled
      .filter(result=>supportedRoles.has(result.role)&&!roleSignals(result).generalInfo&&result.score>=9)
      .sort((a,b)=>b.score-a.score)
    const rolePriority=['contact-form','case-guide','location-page','general-support']
    const candidates=[],usedUrls=new Set(),usedContent=new Set(),usedRoles=new Set()
    for(const role of rolePriority){
      if(role==='general-support'&&candidates.some(item=>item.purpose==='contact-form'))continue
      const picked=ranked.find(result=>result.role===role&&!usedUrls.has(result.url)&&!usedContent.has(contentDuplicateKey(result)))
      if(!picked)continue
      usedUrls.add(picked.url);usedContent.add(contentDuplicateKey(picked));usedRoles.add(role)
      candidates.push({label:purposeLabel(role),url:picked.url,kind:'official-page',purpose:role,searchEntity:entity,locationName:location||undefined,recommended:role==='contact-form',reason:picked.description||picked.title,sourceTitle:picked.title,sourceHost:hostOf(picked.url)})
    }
    // A verified official property/location page is useful only when it is distinct
    // from an already selected contact or guide page. Do not add generic pages to fill slots.
    if(!usedRoles.has('location-page')&&candidates.length<3){
      const signals=roleSignals(officialPage)
      if(signals.location&&!signals.generalInfo&&!usedUrls.has(officialPage.url)&&!usedContent.has(contentDuplicateKey(officialPage))){
        usedContent.add(contentDuplicateKey(officialPage));candidates.push({label:purposeLabel('location-page'),url:officialPage.url,kind:'official-page',purpose:'location-page',searchEntity:entity,locationName:location||undefined,recommended:false,reason:officialPage.description||officialPage.title,sourceTitle:officialPage.title,sourceHost:hostOf(officialPage.url)})
      }
    }
    // If the only strong result is one contact page, one result is correct. Never pad to three.
    const finalCandidates=candidates.slice(0,3)
    if(!finalCandidates.length){
      console.warn('No useful official contact candidate survived role classification',{officialDomain})
      res.status(200).json({candidates:[fallbackSearch(entity,location,caseType)],mode:'search-fallback',officialDomain,warning:'No useful official contact page was confirmed.'});return
    }
    console.info('Official contact lookup completed',{mode:'deep-search',officialDomain,candidateCount:finalCandidates.length,roles:finalCandidates.map(item=>item.purpose),urls:finalCandidates.map(item=>item.url)})
    res.status(200).json({candidates:finalCandidates,mode:'deep-search',officialDomain})
  }catch(error){
    console.error('Official contact lookup failed',error)
    res.status(200).json({candidates:[fallbackSearch(entity,location,caseType)],mode:'search-fallback',warning:'Official contact lookup failed.'})
  }
}
