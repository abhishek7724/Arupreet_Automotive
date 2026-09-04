function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function parseBody_(e) { try{return JSON.parse(e&&e.postData&&e.postData.contents||'{}')}catch(err){throw new Error('Invalid JSON body.')} }

function doGet(e) {
  try {
    const action=String((e&&e.parameter&&e.parameter.action)||'ping');
    if(action==='ping')return json_({ok:true,service:'ACS Digital API',version:'0.3.4'});
    return json_({ok:false,error:'GET action not allowed'});
  } catch(err) { return json_({ok:false,error:String(err.message||err)}); }
}

function doPost(e) {
  try {
    const b=parseBody_(e), action=String(b.action||'');
    if(action==='login')return json_({ok:true,data:login_(b.email,b.password)});
    if(action==='publicBooking')return json_({ok:true,data:withWriteLock_(()=>publicBooking_(b.payload||b))});
    const user=requireSession_(b.token);
    let data;
    if(action==='logout')data=logout_(b.token);
    else if(action==='loadAll')data=loadAll_(user,!!b.force);
    else if(action==='getDataVersion')data=dataVersion_();
    else if(action==='insert')data=withWriteLock_(()=>insertApi_(user,b.table,b.row||{}));
    else if(action==='update')data=withWriteLock_(()=>updateApi_(user,b.table,b.id,b.patch||{}));
    else if(action==='remove')data=withWriteLock_(()=>removeApi_(user,b.table,b.id));
    else if(action==='replaceJobLines')data=withWriteLock_(()=>replaceJobLinesApi_(user,b.jobId,b.lines||[],b.workshopId));
    else if(action==='checkInService')data=withWriteLock_(()=>checkInService_(user,b.payload||{}));
    else if(action==='saveBill')data=withWriteLock_(()=>saveBill_(user,b.payload||{}));
    else if(action==='inventoryMovement')data=withWriteLock_(()=>inventoryMovement_(user,b.payload||{}));
    else if(action==='sendWhatsApp')data=sendWhatsApp_(user,b.payload||{});
    else throw new Error('Unknown action: '+action);
    return json_({ok:true,data:data,meta:{dataVersion:dataVersion_()}});
  } catch(err) {
    const message=String(err.message||err); return json_({ok:false,error:message,code:message==='AUTH_REQUIRED'?'AUTH_REQUIRED':'ERROR'});
  }
}

function loadAll_(user, force) {
  const wid=user.workshop_id||ACS_WORKSHOP_ID, cache=CacheService.getScriptCache(), key=dataCacheKey_(wid);
  let base=null;
  if(!force){
    try{const cached=cache.get(key);if(cached)base=JSON.parse(cached)}catch(e){}
  }
  if(!base){
    const cfg=readConfig_();
    base={workshop:{id:cfg.workshop_id||ACS_WORKSHOP_ID,name:cfg.workshop_name||'Arupreet Car Service',slug:cfg.workshop_slug||'acs-electronic-city',phone:cfg.phone||'',address:cfg.address||'',daily_capacity:Number(cfg.daily_capacity||3)},_mode:'sheets',_version:'0.3.4',_dataVersion:dataVersion_()};
    Object.keys(ACS_TABLE_MAP).forEach(k=>base[k]=rows_(ACS_TABLE_MAP[k]).filter(r=>!r.workshop_id||String(r.workshop_id)===String(wid)));
    try{cache.put(key,JSON.stringify(base),10)}catch(e){}
  }
  base.profile={user_id:user.id,workshop_id:wid,full_name:user.full_name,role:user.role};
  return base;
}

function validateTable_(table) { const name=ACS_TABLE_MAP[table]; if(!name)throw new Error('Unsupported table: '+table); return name; }
function changed_(){invalidateDataCache_();touchDataVersion_()}

function insertApi_(user, table, row) {
  const name=validateTable_(table), rec=Object.assign({},row,{workshop_id:user.workshop_id||ACS_WORKSHOP_ID});
  if(name==='Service_Jobs'&&!rec.job_no)rec.job_no=nextNumber_('Service_Jobs','job_no',1001);
  if(name==='Invoices'&&!rec.invoice_no)rec.invoice_no=nextNumber_('Invoices','invoice_no',2001);
  const out=append_(name,rec); audit_(user,'insert',table,out.id,out); changed_(); return out;
}

function updateApi_(user, table, id, patch) {
  const name=validateTable_(table), existing=findOne_(name,r=>String(r.id)===String(id));
  if(!existing||String(existing.workshop_id)!==String(user.workshop_id))throw new Error('Record not found.');
  const out=updateByKey_(name,'id',id,patch); audit_(user,'update',table,id,patch); changed_(); return out;
}

function removeApi_(user, table, id) {
  const name=validateTable_(table), existing=findOne_(name,r=>String(r.id)===String(id));
  if(!existing||String(existing.workshop_id)!==String(user.workshop_id))throw new Error('Record not found.');
  deleteByKey_(name,'id',id); audit_(user,'delete',table,id,{}); changed_(); return {ok:true,id:id};
}

function replaceJobLinesApi_(user, jobId, lines, workshopId) {
  const job=findOne_('Service_Jobs',r=>String(r.id)===String(jobId)); if(!job||String(job.workshop_id)!==String(user.workshop_id))throw new Error('Job not found.');
  deleteWhere_('Job_Lines','job_id',jobId);
  const out=appendMany_('Job_Lines',lines.map(l=>Object.assign({},l,{workshop_id:workshopId||user.workshop_id,job_id:jobId,approved:true})));
  audit_(user,'replace_lines','service_jobs',jobId,{count:out.length}); changed_(); return out;
}

// One server round trip for check-in: customer/vehicle reuse + job + appointment update.
function checkInService_(user,p) {
  const wid=user.workshop_id||ACS_WORKSHOP_ID;
  const name=String(p.name||'').trim(), phone=String(p.phone||'').trim(), reg=String(p.registration||'').trim().toUpperCase();
  if(!name||!phone||!reg)throw new Error('Name, mobile and registration are required.');
  let v=findOne_('Vehicles',x=>String(x.workshop_id)===String(wid)&&String(x.registration||'').replace(/\s/g,'').toUpperCase()===reg.replace(/\s/g,''));
  let c=v?findOne_('Customers',x=>String(x.id)===String(v.customer_id)):findOne_('Customers',x=>String(x.workshop_id)===String(wid)&&String(x.phone)===phone);
  if(!c)c=append_('Customers',{workshop_id:wid,name:name,phone:phone});
  else if(String(c.name)!==name || String(c.phone)!==phone)c=updateByKey_('Customers','id',c.id,{name:name,phone:phone});
  if(!v)v=append_('Vehicles',{workshop_id:wid,customer_id:c.id,registration:reg,make:String(p.make||''),model:String(p.model||''),odometer_km:Number(p.odometer||0)});
  else v=updateByKey_('Vehicles','id',v.id,{customer_id:c.id,make:String(p.make||v.make||''),model:String(p.model||v.model||''),odometer_km:Number(p.odometer||v.odometer_km||0)});
  const j=append_('Service_Jobs',{workshop_id:wid,job_no:nextNumber_('Service_Jobs','job_no',1001),appointment_id:p.appointmentId||'',customer_id:c.id,vehicle_id:v.id,bay:p.bay||'',odometer_km:Number(p.odometer||0),complaint:String(p.complaint||''),inspection_notes:'',approval_status:'',approval_token:'',status:'Open',check_in_at:new Date().toISOString(),job_card_generated:false});
  let appointment=null;
  if(p.appointmentId){appointment=updateByKey_('Appointments','id',p.appointmentId,{status:'Checked In'});}
  audit_(user,'check_in','service_jobs',j.id,{appointment_id:p.appointmentId||'',vehicle_id:v.id}); changed_();
  return {customer:c,vehicle:v,job:j,appointment:appointment};
}

// One atomic save for the final bill: lines + invoice + stock issue + history + reminder + job completion.
function saveBill_(user,p) {
  const wid=user.workshop_id||ACS_WORKSHOP_ID, jobId=String(p.jobId||'');
  const job=findOne_('Service_Jobs',r=>String(r.id)===jobId&&String(r.workshop_id)===String(wid));
  if(!job)throw new Error('Service job not found.');
  if(findOne_('Invoices',r=>String(r.job_id)===jobId))throw new Error('This service job already has an invoice.');
  const lines=(p.lines||[]).map(l=>({workshop_id:wid,job_id:jobId,line_type:String(l.line_type||'Labour'),inventory_item_id:l.inventory_item_id||'',description:String(l.description||'').trim(),quantity:Number(l.quantity||0),unit:String(l.unit||''),rate:Number(l.rate||0),approved:true})).filter(l=>l.description&&l.quantity>0);
  if(!lines.length)throw new Error('Add at least one bill line.');
  deleteWhere_('Job_Lines','job_id',jobId);
  const savedLines=appendMany_('Job_Lines',lines);
  const stockChanges=[], movements=[];
  savedLines.filter(l=>l.inventory_item_id&&['Part','Consumable'].includes(l.line_type)).forEach(l=>{
    const item=findOne_('Inventory_Items',r=>String(r.id)===String(l.inventory_item_id)&&String(r.workshop_id)===String(wid));
    if(!item)return;
    const before=Number(item.on_hand||0), qty=Number(l.quantity||0), after=Math.max(0,before-qty);
    const updated=updateByKey_('Inventory_Items','id',item.id,{on_hand:after}); stockChanges.push(updated);
    movements.push({workshop_id:wid,inventory_item_id:item.id,job_id:jobId,movement_type:'Issue',quantity:-qty,unit:item.unit||l.unit||'',unit_cost:Number(item.cost||0),note:'Used on bill for service job '+(job.job_no||job.id)});
  });
  const savedMovements=appendMany_('Stock_Movements',movements);
  const subtotal=savedLines.reduce((s,l)=>s+Number(l.quantity||0)*Number(l.rate||0),0), discount=Number(p.discount||0), tax=Number(p.tax||0), total=Math.max(0,subtotal-discount+tax);
  const invoice=append_('Invoices',{workshop_id:wid,invoice_no:nextNumber_('Invoices','invoice_no',2001),job_id:jobId,customer_id:job.customer_id,vehicle_id:job.vehicle_id,subtotal:subtotal,discount:discount,tax:tax,total:total,payment_method:String(p.payment||'UPI'),payment_status:String(p.payment||'UPI')==='Pending'?'Pending':'Paid'});
  const serviceDate=String(p.serviceDate||new Date().toISOString().slice(0,10)), months=Number(p.reminderMonths||0);
  const next=months?addMonthsServer_(serviceDate,months):'';
  const history=append_('Service_History',{workshop_id:wid,vehicle_id:job.vehicle_id,job_id:jobId,service_date:serviceDate,odometer_km:job.odometer_km,summary:savedLines.map(l=>l.description).join(', '),amount:total,next_service_date:next});
  const reminder=next?append_('Reminders',{workshop_id:wid,vehicle_id:job.vehicle_id,due_date:next,reminder_type:'Service due',status:'Upcoming'}):null;
  const completedJob=updateByKey_('Service_Jobs','id',jobId,{status:'Completed',completed_at:new Date().toISOString()});
  const appointment=job.appointment_id?updateByKey_('Appointments','id',job.appointment_id,{status:'Completed'}):null;
  audit_(user,'save_bill','service_jobs',jobId,{invoice_id:invoice.id,total:total,line_count:savedLines.length}); changed_();
  return {invoice:invoice,job:completedJob,appointment:appointment,lines:savedLines,inventory_items:stockChanges,stock_movements:savedMovements,service_history:history,reminder:reminder};
}

function inventoryMovement_(user,p) {
  const wid=user.workshop_id||ACS_WORKSHOP_ID, id=String(p.inventoryItemId||'');
  let item=findOne_('Inventory_Items',r=>String(r.id)===id&&String(r.workshop_id)===String(wid));
  if(!item)throw new Error('Inventory item not found.');
  const qty=Number(p.quantity||0), movement=String(p.movementType||'Receipt'), unit=String(item.unit||p.unit||'');
  const patch={on_hand:Number(item.on_hand||0)+qty};
  if(movement==='Receipt' && Number(p.unitCost||0)>0)patch.cost=Number(p.unitCost);
  if(p.unit)patch.unit=String(p.unit);
  item=updateByKey_('Inventory_Items','id',id,patch);
  const movementRow=append_('Stock_Movements',{workshop_id:wid,inventory_item_id:id,job_id:'',movement_type:movement,quantity:qty,unit:item.unit||unit,unit_cost:movement==='Receipt'?Number(p.unitCost||item.cost||0):Number(item.cost||0),note:String(p.note||'')});
  audit_(user,'inventory_movement','inventory_items',id,{movement:movement,quantity:qty,unit_cost:movementRow.unit_cost}); changed_();
  return {item:item,movement:movementRow};
}

function addMonthsServer_(date,n){
  const d=new Date(String(date)+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(n||0));return Utilities.formatDate(d,'GMT','yyyy-MM-dd');
}

function publicBooking_(b) {
  const cfg=readConfig_(), slug=String(b.workshopSlug||'acs-electronic-city');
  if(String(cfg.workshop_slug||'acs-electronic-city')!==slug)throw new Error('Workshop not found.');
  const name=String(b.name||'').trim(),phone=String(b.phone||'').trim(),vehicleText=String(b.vehicle||'').trim(),registration=String(b.registration||'').trim().toUpperCase(),date=String(b.date||'').trim(),time=String(b.time||'09:00').trim(),issue=String(b.issue||'').trim();
  if(!name||!phone||!vehicleText||!date)throw new Error('Name, phone, vehicle and date are required.');
  const wid=cfg.workshop_id||ACS_WORKSHOP_ID, capacity=Number(cfg.daily_capacity||3);
  const active=['Booked','Checked In']; const booked=rows_('Appointments').filter(a=>String(a.workshop_id)===String(wid)&&String(a.preferred_date).slice(0,10)===date&&active.includes(String(a.status))).length;
  let c=findOne_('Customers',x=>String(x.workshop_id)===String(wid)&&String(x.phone)===phone);
  if(!c)c=append_('Customers',{workshop_id:wid,name:name,phone:phone});
  const parts=vehicleText.split(/\s+/),make=parts.shift()||'Vehicle',model=parts.join(' ')||'Not specified';
  let v=registration?findOne_('Vehicles',x=>String(x.workshop_id)===String(wid)&&String(x.registration).replace(/\s/g,'').toUpperCase()===registration.replace(/\s/g,'')):null;
  if(!v)v=append_('Vehicles',{workshop_id:wid,customer_id:c.id,registration:registration||('PENDING-'+Utilities.getUuid().slice(0,8).toUpperCase()),make:make,model:model,odometer_km:0});
  const a=append_('Appointments',{workshop_id:wid,customer_id:c.id,vehicle_id:v.id,preferred_date:date,preferred_time:time,issue:issue,status:'Booked',source:'Website',web_id:'WEB-'+Date.now()});
  changed_();
  return {ok:true,appointmentId:a.id,capacity:{booked:booked+1,dailyCapacity:capacity},message:booked>=capacity?'Booking saved. This day already looks busy, so ACS may contact you if timing needs adjustment.':'Booking saved. See you at ACS.'};
}

function audit_(user, action, entity, entityId, details) {
  try{append_('Audit_Log',{workshop_id:user.workshop_id||ACS_WORKSHOP_ID,user_id:user.id,action:action,entity:entity,entity_id:entityId||'',details:JSON.stringify(details||{})})}catch(e){}
}
