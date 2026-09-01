import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { launchOptions } from '/home/user/PRISM/scripts/_browser.mjs'
const ROOT = '/home/user/PRISM/dist'
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon' }
const server = createServer(async (req,res)=>{ try{
  const url=new URL(req.url??'/','http://localhost'); let p=normalize(decodeURIComponent(url.pathname))
  if(p==='/'||!extname(p))p='/index.html'
  if(p==='/prism-config.json'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({url:'',anonKey:''}));return}
  const body=await readFile(join(ROOT,p)); res.writeHead(200,{'content-type':MIME[extname(p)]??'application/octet-stream'}); res.end(body)
}catch{res.writeHead(404);res.end('nf')}})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const port=server.address().port
const browser=await chromium.launch(launchOptions())
const page=await browser.newPage({viewport:{width:1440,height:950}})
const errs=[]
page.on('pageerror',e=>errs.push(String(e.message)))
page.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
for(const route of process.argv.slice(2)){
  await page.goto(`http://127.0.0.1:${port}/#${route}`,{waitUntil:'networkidle'})
  await page.waitForTimeout(400)
  const t=await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').trim())
  console.log(`\n=== ${route} (${t.length} chars) ===`)
  console.log(t.slice(0,700))
}
if(errs.length)console.log('\nERRORS:',errs.slice(0,5))
await browser.close(); server.close()
