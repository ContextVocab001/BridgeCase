const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search'
const BLOCKED_HOSTS = [
  'facebook.com','instagram.com','x.com','twitter.com','linkedin.com','yelp.com','tripadvisor.com',
  'yellowpages.com','mapquest.com','reddit.com','youtube.com','wikipedia.org','bbb.org'
]
const CONTACT_WORDS = /contact|support|customer service|customer care|billing|charge|refund|past rental|receipt|help|question|complaint|form/i
const LOCATION_WORDS = /location|airport|hotel|property|branch|station|office/i
const FORM_WORDS = /contact|support|submit|question|request|claim|case|feedback|customer/i

const clean = value => typeof value === 'string' ? value.trim() : ''
const tokens = value => clean(value).toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2)
const unique = values => [...new Set(values)]
function hostOf(value){ try { return new URL(value).hostname.toLowerCase().replace(/^www\./,'') } catch { return '' } }
function isBlocked(url){ const host=hostOf(url); return !host || BLOCKED_HOSTS.some(item=>host===item||host.endsWith(`.${item}`)) }
function entityMatch(result,entity){
  const haystack=`${clean(result.title)} ${clean(result.description)} ${hostOf(result.url)}`.toLowerCase()
  const wanted=tokens(entity)
  return wanted.length ? wanted.filter(token=>haystack.includes(token)).length / wanted.length : 0
}
function score(result,entity,location,purpose){
  const text=`${clean(result.title)} ${clean(result.description)} ${result.url}`
  let value=entityMatch(result,entity)*10
  if(CONTACT_WORDS.test(text))value+=purpose==='case-contact'?6:2
  if(FORM_WORDS.test(result.url))value+=purpose==='case-contact'?5:1
  if(location && tokens(location).some(token=>text.toLowerCase().includes(token)))value+=purpose==='location-page'?6:3
  if(LOCATION_WORDS.test(text))value+=purpose==='location-page'?4:0
  if(/^https:\/\//i.test(result.url))value+=1
  return value
}
function purposeLabel(purpose){
  if(purpose==='case-contact')return'Official billing / refund contact page'
  if(purpose==='location-page')return'Official location or property page'
  return'Official customer support page'
}
async function braveSearch(key,query,count=8){
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
  return {label:'Search official site and contact route',url:`https://www.google.com/search?q=${encodeURIComponent(query)}`,kind:'search',purpose:'case-contact',searchEntity:entity,locationName:location||undefined,recommended:true,reason:'Search fallback'}
}
export const config={maxDuration:30}
export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed.'});return}
  const body=req.body||{}
  const entity=clean(body.entity)
  const location=clean(body.location)
  const caseType=clean(body.caseType)||'other'
  if(!entity){res.status(200).json({candidates:[],mode:'no-entity'});return}
  const key=process.env.BRAVE_SEARCH_API_KEY
  if(!key){res.status(200).json({candidates:[fallbackSearch(entity,location,caseType)],mode:'search-fallback',warning:'BRAVE_SEARCH_API_KEY is not configured.'});return}
  const task=caseType==='rental-car'?'past rental billing refund':caseType==='hotel'?'billing refund':caseType==='airline'?'payment refund':'billing refund'
  const plans=[
    {purpose:'case-contact',query:`${entity} ${location} official ${task} contact form email`},
    {purpose:'location-page',query:`${entity} ${location} official location`},
    {purpose:'general-support',query:`${entity} official customer support contact`}
  ]
  try{
    const batches=await Promise.all(plans.map(async plan=>({plan,results:await braveSearch(key,plan.query)})))
    const usedHosts=new Set(),usedUrls=new Set(),candidates=[]
    for(const {plan,results} of batches){
      const ranked=results.filter(result=>!isBlocked(result.url)&&entityMatch(result,entity)>=0.34).sort((a,b)=>score(b,entity,location,plan.purpose)-score(a,entity,location,plan.purpose))
      const picked=ranked.find(result=>!usedUrls.has(result.url)&&(plan.purpose==='location-page'||!usedHosts.has(hostOf(result.url))))||ranked[0]
      if(!picked)continue
      usedUrls.add(picked.url);usedHosts.add(hostOf(picked.url))
      candidates.push({label:purposeLabel(plan.purpose),url:picked.url,kind:'official-page',purpose:plan.purpose,searchEntity:entity,locationName:location||undefined,recommended:plan.purpose==='case-contact',reason:picked.description||picked.title,sourceTitle:picked.title,sourceHost:hostOf(picked.url)})
    }
    if(!candidates.length)candidates.push(fallbackSearch(entity,location,caseType))
    res.status(200).json({candidates,mode:candidates[0]?.kind==='search'?'search-fallback':'deep-search'})
  }catch(error){
    console.error('Contact route search failed',error)
    res.status(200).json({candidates:[fallbackSearch(entity,location,caseType)],mode:'search-fallback',warning:'Contact route search failed.'})
  }
}
