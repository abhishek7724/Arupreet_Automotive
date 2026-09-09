const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createBackend}=require('./backend-harness.cjs');
const {chromium}=require(process.env.ACS_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');fs.mkdirSync(out,{recursive:true});
const backend=createBackend(),errors=[];
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)){res.writeHead(404);return res.end();}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
  res.setHeader('Content-Type',mime[path.extname(target)]||'text/plain');res.end(fs.readFileSync(target));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:process.env.ACS_BROWSER_CHANNEL||'chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{
    localStorage.setItem('acsDigitalV3SheetsSession',JSON.stringify({token:'test-session',user:{id:'staff',workshop_id:'w'}}));
  });
  await context.route('https://script.google.com/**',async route=>{
    const b=JSON.parse(route.request().postData()||'{}');const result=backend.post(b.action,b,b.token);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html');
  for(const name of ['name','phone','vehicle','date','time','issue'])assert.equal(await page.locator(`[name=${name}]`).getAttribute('required'),'');
  assert.equal(await page.locator('[name=email]').getAttribute('required'),null);
  assert.equal(await page.locator('#emailHelp').textContent(),'(enter to receive receipt and job card)');
  await page.locator('[name=date]').fill('2030-01-10');await page.waitForFunction(()=>document.querySelector('[name=time]').options.length===7);
  await page.locator('[name=name]').fill('Sample Customer');await page.locator('[name=phone]').fill('9000000000');await page.locator('[name=vehicle]').fill('Hyundai i20');await page.locator('[name=registration]').fill('KA 01 AB 1234');await page.locator('[name=issue]').fill('Brake noise');await page.locator('[name=time]').selectOption('10:00');
  await page.locator('#bookingForm').screenshot({path:path.join(out,'booking-desktop.png')});
  await page.getByRole('button',{name:'Book service',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#bookingMsg').textContent.includes('Booking saved'));
  assert.equal(backend.tables.Appointments.length,1);
  await page.locator('[name=date]').fill('2030-01-10');await page.waitForFunction(()=>document.querySelector('[name=time]').options.length===6);
  assert.equal(await page.locator('[name=time] option[value="10:00"]').count(),0);
  await page.setViewportSize({width:390,height:844});await page.locator('#bookingForm').screenshot({path:path.join(out,'booking-mobile.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/app.html');await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
  assert.equal(await page.locator('[data-view=reminders]').count(),0);
  await page.locator('[data-view=appointments]').click();await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();
  await page.locator('[name=reason]').fill('Rescheduled by customer');await page.locator('#cancelForm button.btn.dark').click();await page.waitForFunction(()=>document.querySelector('#appContent').textContent.includes('Rescheduled by customer'));
  assert.equal(backend.tables.Appointments[0].status,'Cancelled');
  await page.getByRole('button',{name:'+ Appointment',exact:true}).click();
  await page.locator('#apptForm [name=vehicleId]').selectOption(backend.tables.Vehicles[0].id);await page.locator('#apptForm [name=date]').fill('2030-01-10');await page.waitForFunction(()=>document.querySelector('#apptForm [name=time]').options.length===7);
  await page.locator('#apptForm [name=time]').selectOption('10:00');await page.locator('#apptForm [name=issue]').fill('Brake noise');await page.getByRole('button',{name:'Save appointment',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#modalBackdrop').classList.contains('hidden'));
  await page.getByRole('button',{name:'Inspect',exact:true}).click();await page.locator('[name=odometer]').fill('48000');await page.getByRole('button',{name:'Start inspection',exact:true}).click();await page.getByRole('button',{name:'Add inspection',exact:true}).click();
  await page.locator('[name=notes]').fill('Brake dust buildup. Road test completed.');await page.locator('[name=work]').fill('Clean front brake assembly\nInspect pads and discs\nRoad test vehicle');await page.getByRole('button',{name:'Save inspection',exact:true}).click();
  await page.getByRole('button',{name:'Generate job card',exact:true}).click();await page.locator('.service-document').waitFor();
  assert.equal(await page.locator('.work-table tbody tr').count(),3);assert.match(await page.locator('.service-document').textContent(),/919999827339/);
  await page.locator('.service-document').screenshot({path:path.join(out,'job-card.png')});
  await page.pdf({path:path.join(out,'job-card.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-view=jobs]').click();await page.getByRole('button',{name:'Open',exact:true}).click();await page.getByRole('button',{name:'Generate bill',exact:true}).click();
  const part=page.locator('.bill-line-row').nth(0),labour=page.locator('.bill-line-row').nth(1);
  await part.locator('[name=description]').fill('Brake Cleaner');await part.locator('[name=quantity]').fill('2');await part.locator('[name=unit]').fill('can');await part.locator('[name=rate]').fill('200');await part.locator('[name=unit_cost]').fill('100');
  await labour.locator('[name=description]').fill('Brake cleaning labour');await labour.locator('[name=rate]').fill('500');
  assert.equal(await page.locator('#billTotal').textContent(),'₹900');
  assert.equal(await page.locator('[name=months]').count(),0);
  await page.locator('#modal').screenshot({path:path.join(out,'invoice-entry.png')});
  await page.getByRole('button',{name:'Save bill & reduce inventory',exact:true}).click();await page.locator('.service-document').waitFor();
  assert.equal(backend.tables.Service_Jobs[0].status,'Closed');assert.equal(backend.tables.Invoices.length,1);assert.equal(backend.tables.Inventory_Items.length,1);assert.equal(backend.tables.Invoices[0].total,900);
  assert.match(await page.locator('.document-meta').textContent(),/Job No. 1001/);
  await page.locator('.service-document').screenshot({path:path.join(out,'invoice.png')});await page.pdf({path:path.join(out,'invoice.pdf'),preferCSSPageSize:true,printBackground:true});
  // Exercise multipage print flow with long customer/vehicle/item data.
  await page.evaluate(()=>{const lines=Array.from({length:65},(_,i)=>({description:'Detailed service operation '+(i+1)+' — inspect, clean and refit the vehicle component',line_type:'Labour',quantity:1,unit:'job',rate:100}));showModal(ACSDocuments.invoice({name:'Arupreet Car Service',address:'Electronic City, Bengaluru',phone:'919999827339'},{invoice_no:9999,job_id:'long',created_at:'2030-01-10',subtotal:6500,total:6500,payment_status:'Paid',payment_method:'UPI'},{job_no:9999,odometer_km:48000},{name:'Sample Customer',phone:'9000000000'},{registration:'KA 01 AB 1234',make:'Hyundai',model:'i20'},lines)+ACSDocuments.actions())});
  await page.pdf({path:path.join(out,'invoice-multipage.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.service-document').evaluate(el=>el.scrollWidth>el.clientWidth),false);
  assert.deepEqual(errors,[]);console.log('Browser checks passed: public booking, availability, mobile, staff cancellation/check-in, work list, item creation, invoice close, PDF rendering; no page errors.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
