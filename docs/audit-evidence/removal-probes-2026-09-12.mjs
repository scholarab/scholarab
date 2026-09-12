// Run from the repository root after npm ci. Historical baseline models; no outbound requests.
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
const baselineRevision = 'c2d93ad';
const baselineFile = path => execFileSync('git', ['show', `${baselineRevision}:${path}`], { encoding: 'utf8' });
const analytics = baselineFile('src/components/sab/Analytics.astro').match(/<script>\s*([\s\S]*?)<\/script>/)[1].replace(/import \{[^}]+\} from '[^']+';/, '').replaceAll('import.meta.env.MODE', "'production'");
const { transformSync } = await import('esbuild');
function gaProbe(source) {
 const events = [], listeners = {};
 let choice = 'granted';
 const context = {window:{__sabGaId:'G-AUDIT',gtag:(...args)=>events.push(args)},document:{title:'Audit',head:{appendChild(){}},createElement:()=>({}),getElementById:()=>({hidden:true}),addEventListener:(name,fn)=>listeners[name]=fn},location:{hostname:'www.scholarab.ca',href:'https://www.scholarab.ca/',pathname:'/',search:''},navigator:{webdriver:false},readConsent:()=>choice,setConsent:c=>choice=c,analyticsAllowedHere:()=>true,syncConsentReset(){}};
 vm.runInNewContext(transformSync(source,{loader:'ts'}).code,context);
 listeners['astro:page-load']();
 const initial=events.filter(e=>e[0]==='event'&&e[1]==='page_view').length;
 context.location.href='https://www.scholarab.ca/saved/';context.location.pathname='/saved/';listeners['astro:page-load']();
 listeners.click({target:{closest:()=>({getAttribute:()=> 'denied'})}});
 return {initial,afterNavigation:events.filter(e=>e[0]==='event'&&e[1]==='page_view').length,denialUpdates:events.filter(e=>e[0]==='consent'&&e[1]==='update'&&e[2]?.analytics_storage==='denied').length};
}
const gaDeleted = analytics.replace('        sendPageView();','').replace("if (value === 'granted') loadGa();","if (value === 'granted') { loadGa(); sendPageView(); }").replace(/\n\s*apply\(\);\s*$/, '\n');
const sw = baselineFile('public/sw.js');
async function swProbe(source) {
 const calls=[], listeners={},cache=new Map();
 const context = {URL,Set,Promise,fetch:async req=>{throw Error('offline');},caches:{open:async()=>({add:async p=>{calls.push(p);cache.set(p,{url:p});}}),match:async req=>cache.get(typeof req==='string'?req:new URL(req.url).pathname)},self:{location:{origin:'https://www.scholarab.ca'},addEventListener:(n,fn)=>listeners[n]=fn,skipWaiting(){}}};
 vm.runInNewContext(source,context);
 let install;listeners.install({waitUntil:p=>install=p});await install;
 let response;listeners.fetch({request:{url:'https://www.scholarab.ca/scholarships/',method:'GET',mode:'navigate'},respondWith:p=>response=p});
 return {installRequests:calls,offlineScholarships:(await response)?.url};
}
const reducedSw=sw.replace("['/', '/scholarships/', '/programs/', '/saved/', '/about/', '/offline']","['/offline']");
const results={baselineRevision,ga:{baseline:gaProbe(analytics),deletedDuplicateCalls:gaProbe(gaDeleted)},sw:{baseline:await swProbe(sw),deletedPageSeeds:await swProbe(reducedSw)}};
console.log(JSON.stringify(results,null,2));
