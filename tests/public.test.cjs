const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const http=require('http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));});
const {chromium}=require(process.env.ACS_PLAYWRIGHT||'playwright');
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://script.google.com/**',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);
 for(const width of [360,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'})});
  await page.screenshot({path:out+'/redesign-'+width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);
  assert.equal(await page.locator('.hero-visual img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.service-card[data-service="AC and electrical"]').click();
 assert.equal(await page.locator('[name=issue]').inputValue(),'AC and electrical');
 await page.locator('[name=issue]').fill('My own detailed concern');
 await page.locator('.service-card[data-service="Periodic service"]').click();
 assert.equal(await page.locator('[name=issue]').inputValue(),'My own detailed concern');
 await page.locator('[name=phone]').focus();assert.equal(await page.locator('.mobile-contact').isVisible(),false);
 await page.locator('[name=phone]').blur();assert.equal(await page.locator('.mobile-contact').isVisible(),true);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.locator('.menu-toggle').click();
 assert.equal(await page.locator('#siteMenu').isVisible(),true);await page.keyboard.press('Escape');
 assert.equal(await page.locator('#siteMenu').isVisible(),false);
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  for(const selector of ['#services','#why','#process','#booking','#contact']){
   await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).screenshot({path:out+'/section-'+selector.slice(1)+'-'+width+'.png'});
  }
 }
 // Simulate doubled text sizes, leaving layout and controls at their original viewport widths.
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const all=[...document.querySelectorAll('body *')];const sizes=all.map(el=>parseFloat(getComputedStyle(el).fontSize));all.forEach((el,i)=>el.style.fontSize=sizes[i]*2+'px');});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'200% text overflow');
 assert.deepEqual(errors,[]);console.log('Public design QA passed: six widths, image loads, service selection, notes preserved, touch bar, Escape navigation, 200% text.');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
