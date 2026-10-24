const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search'
const BLOCKED_HOSTS = [
  'facebook.com','instagram.com','x.com','twitter.com','linkedin.com','youtube.com','wikipedia.org','reddit.com',
  'yelp.com','tripadvisor.com','yellowpages.com','mapquest.com','bbb.org','pissedconsumer.com','gethuman.com',
  'allstays.com','complaintsboard.com','customerservicenumber.com','customer-service.com','booking.com','expedia.com',
  'hotels.com','trip.com','agoda.com','kayak.com','priceline.com','justanswer.com'
]
const AGGREGATOR_WORDS = /reviews?|complaints?|consumer|phone number|customer service number|how to reach|faq|directory|travel guide|book now|compare prices/i
const CONTACT_WORDS = /contact us|support|customer care|billing|billing issue|charges?|refund|past rental|receipt|submit a question|feedback|claim|concern/i
const LOCATION_WORDS = /location|airport|hotel|property|branch|station|office|our location/i
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
function purposeScore(result,purpose,entity,location,index){
  const text=`${result.title} ${result.description} ${result.url}`
  let score=Math.max(0,6-index)+termCoverage(text,entity)*5
  if(purpose==='case-contact'&&CONTACT_WORDS.test(text))score+=10
  if(purpose==='location-page')score+=termCoverage(text,location)*10+(LOCATION_WORDS.test(text)?4:0)
  if(purpose==='general-support'&&/contact us|support|help|customer care/i.test(text))score+=8
  if(AGGREGATOR_WORDS.test(text))score-=15
  return score
}
function purposeLabel(purpose){
  if(purpose==='case-contact')return'Official billing / refund contact page'
  if(purpose==='location-page')return'Official location or property page'
  return'Official customer support page'
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
      {purpose:'case-contact',query:`site:${officialDomain} ${task} contact form`},
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
    const candidates=[],usedUrls=new Set()
    for(const {plan,results} of batches){
      const ranked=results.map((result,index)=>({...result,score:purposeScore(result,plan.purpose,entity,location,index)})).filter(result=>result.score>=7).sort((a,b)=>b.score-a.score)
      const picked=ranked.find(result=>!usedUrls.has(result.url))
      if(!picked)continue
      usedUrls.add(picked.url)
      candidates.push({label:purposeLabel(plan.purpose),url:picked.url,kind:'official-page',purpose:plan.purpose,searchEntity:entity,locationName:location||undefined,recommended:plan.purpose==='case-contact',reason:picked.description||picked.title,sourceTitle:picked.title,sourceHost:hostOf(picked.url)})
    }
    if(!candidates.some(item=>item.purpose==='location-page')){
      candidates.push({label:purposeLabel('location-page'),url:officialPage.url,kind:'official-page',purpose:'location-page',searchEntity:entity,locationName:location||undefined,recommended:false,reason:officialPage.description||officialPage.title,sourceTitle:officialPage.title,sourceHost:hostOf(officialPage.url)})
    }
    const finalCandidates=candidates.slice(0,3)
    console.info('Official contact lookup completed',{mode:'deep-search',officialDomain,candidateCount:finalCandidates.length,urls:finalCandidates.map(item=>item.url)})
    res.status(200).json({candidates:finalCandidates,mode:'deep-search',officialDomain})
  }catch(error){
    console.error('Official contact lookup failed',error)
    res.status(200).json({candidates:[fallbackSearch(entity,location,caseType)],mode:'search-fallback',warning:'Official contact lookup failed.'})
  }
}
