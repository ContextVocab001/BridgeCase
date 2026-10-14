import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
// @ts-expect-error JavaScript Vercel function has no TypeScript declaration file.
import analyzeHandler from './api/analyze-case.js'
// @ts-expect-error JavaScript Vercel function has no TypeScript declaration file.
import ocrHandler from './api/nvidia-ocr-test.js'

type ApiResponse=ServerResponse&{status:(code:number)=>ApiResponse;json:(value:unknown)=>void}
type ApiHandler=(request:IncomingMessage&{body?:unknown},response:ApiResponse)=>Promise<void>
async function readBody(request:IncomingMessage){const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));if(!chunks.length)return undefined;const text=Buffer.concat(chunks).toString('utf8');try{return JSON.parse(text)}catch{return text}}
function localApi():Plugin{return{name:'teltruva-local-api',configureServer(server){const mount=(route:string,handler:ApiHandler)=>server.middlewares.use(route,async(request,response)=>{try{const apiRequest=request as IncomingMessage&{body?:unknown};apiRequest.body=await readBody(request);const api=response as ApiResponse;api.status=(code)=>{api.statusCode=code;return api};api.json=(value)=>{api.setHeader('Content-Type','application/json');api.end(JSON.stringify(value))};await handler(apiRequest,api)}catch(error){console.error(route,error);response.statusCode=500;response.end(JSON.stringify({error:'Local API failed.'}))}});mount('/api/analyze-case',analyzeHandler as ApiHandler);mount('/api/nvidia-ocr-test',ocrHandler as ApiHandler)}}}
export default defineConfig(({mode})=>{Object.assign(process.env,loadEnv(mode,process.cwd(),''));return{plugins:[react(),localApi()]}})
