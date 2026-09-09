function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function parseBody_(e) { try{return JSON.parse(e&&e.postData&&e.postData.contents||'{}')}catch(err){throw new Error('Invalid JSON body.')} }

function doGet(e) {
  try {
    const action=String((e&&e.parameter&&e.parameter.action)||'ping');
    if(action==='ping')return json_({ok:true,service:'ACS Digital API',version:'0.4.0'});
    return json_({ok:false,error:'GET action not allowed'});
  } catch(err) { return json_({ok:false,error:String(err.message||err)}); }
}

function doPost(e) {
  try {
    const b=parseBody_(e), action=String(b.action||'');
    if(action==='login')return json_({ok:true,data:login_(b.email,b.password)});
    if(action==='publicBooking')return json_({ok:true,data:withWriteLock_(()=>publicBooking_(b.payload||b))});
    if(action==='slotAvailability')return json_({ok:true,data:slotAvailability_(b.payload||b)});
    const user=requireSession_(b.token);
    let data;
    if(action==='logout')data=logout_(b.token);
    else if(action==='loadAll')data=loadAll_(user,!!b.force);
    else if(action==='getDataVersion')data=dataVersion_();
    else if(action==='insert')data=withWriteLock_(()=>insertApi_(user,b.table,b.row||{}));
    else if(action==='update')data=withWriteLock_(()=>updateApi_(user,b.table,b.id,b.patch||{}));
    else if(action==='remove')data=withWriteLock_(()=>removeApi_(user,b.table,b.id));
    else if(action==='replaceJobLines')data=withWriteLock_(()=>replaceJobLinesApi_(user,b.jobId,b.lines||[],b.workshopId));
    else if(action==='cancelAppointment')data=withWriteLock_(()=>cancelAppointment_(user,b.id,b.reason));
    else if(action==='checkInService')data=withWriteLock_(()=>checkInService_(user,b.payload||{}));
    else if(action==='saveBill')data=withWriteLock_(()=>saveBill_(user,b.payload||{}));
    else if(action==='inventoryMovement')data=withWriteLock_(()=>inventoryMovement_(user,b.payload||{}));
    else if(action==='sendWhatsApp')data=sendWhatsApp_(user,b.payload||{});
    else throw new Error('Unknown action: '+action);
    return json_({ok:true,data:data,meta:{dataVersion:dataVersion_()}});
  } catch(err) {
    const message=String(err.message||err); return json_({ok:false,error:message,code:err.code||(message==='AUTH_REQUIRED'?'AUTH_REQUIRED':'ERROR')});
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
    base={workshop:{id:cfg.workshop_id||ACS_WORKSHOP_ID,name:cfg.workshop_name||'Arupreet Car Service',slug:cfg.workshop_slug||'acs-electronic-city',phone:cfg.phone||'',address:cfg.address||'',daily_capacity:6},_mode:'sheets',_version:'0.4.0',_dataVersion:dataVersion_()};
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
  if(['Invoices','Job_Lines','Stock_Movements','Service_History'].includes(name))throw new Error('Use the service billing or stock movement action.');
  if(name==='Appointments'){
    rec.status='Booked'; validateAppointment_(rec);
    const v=findOne_('Vehicles',v=>String(v.id)===String(rec.vehicle_id)&&String(v.workshop_id)===String(rec.workshop_id));
    if(!v)throw new Error('Vehicle not found.'); rec.customer_id=v.customer_id;
  }
  if(name==='Service_Jobs'&&!rec.job_no)rec.job_no=nextNumber_('Service_Jobs','job_no',1001);
  if(name==='Invoices'&&!rec.invoice_no)rec.invoice_no=nextNumber_('Invoices','invoice_no',2001);
  const out=append_(name,rec); audit_(user,'insert',table,out.id,out); changed_(); return out;
}

function updateApi_(user, table, id, patch) {
  const name=validateTable_(table), existing=findOne_(name,r=>String(r.id)===String(id));
  if(!existing||String(existing.workshop_id)!==String(user.workshop_id))throw new Error('Record not found.');
  patch=Object.assign({},patch); delete patch.id; delete patch.workshop_id;
  if(['Invoices','Job_Lines','Stock_Movements','Service_History'].includes(name))throw new Error('Saved billing records cannot be changed here.');
  if(name==='Appointments')throw new Error('Use cancelAppointment or checkInService to change an appointment.');
  if(name==='Service_Jobs'){
    if(findOne_('Invoices',r=>String(r.job_id)===String(id)))throw new Error('A billed service job is closed and cannot be edited.');
    patch=Object.keys(patch).filter(k=>['inspection_notes','work_to_be_done','job_card_generated','job_card_created_at','bay','odometer_km','complaint'].includes(k)).reduce((o,k)=>(o[k]=patch[k],o),{});
  }
  const out=updateByKey_(name,'id',id,patch); audit_(user,'update',table,id,patch); changed_(); return out;
}

function removeApi_(user, table, id) {
  const name=validateTable_(table), existing=findOne_(name,r=>String(r.id)===String(id));
  if(!existing||String(existing.workshop_id)!==String(user.workshop_id))throw new Error('Record not found.');
  if(['Appointments','Service_Jobs','Invoices','Job_Lines','Stock_Movements','Service_History','Inventory_Items'].includes(name))throw new Error('Keep service and inventory history. Cancel appointments using cancelAppointment.');
  deleteByKey_(name,'id',id); audit_(user,'delete',table,id,{}); changed_(); return {ok:true,id:id};
}

function replaceJobLinesApi_(user, jobId, lines, workshopId) {
  const job=findOne_('Service_Jobs',r=>String(r.id)===String(jobId)); if(!job||String(job.workshop_id)!==String(user.workshop_id))throw new Error('Job not found.');
  if(findOne_('Invoices',r=>String(r.job_id)===String(jobId)))throw new Error('A billed service job is closed.');
  deleteWhere_('Job_Lines','job_id',jobId);
  const out=appendMany_('Job_Lines',lines.map(l=>Object.assign({},l,{workshop_id:user.workshop_id,job_id:jobId,approved:true})));
  audit_(user,'replace_lines','service_jobs',jobId,{count:out.length}); changed_(); return out;
}

// One server round trip for check-in: customer/vehicle reuse + job + appointment update.
function checkInService_(user,p) {
  const wid=user.workshop_id||ACS_WORKSHOP_ID;
  const name=String(p.name||'').trim(), phone=String(p.phone||'').trim(), reg=String(p.registration||'').trim().toUpperCase();
  if(!name||!phone||!reg)throw new Error('Name, mobile and registration are required.');
  if(p.appointmentId){
    const a=findOne_('Appointments',a=>String(a.id)===String(p.appointmentId)&&String(a.workshop_id)===String(wid));
    if(!a||a.status!=='Booked')throw new Error('Appointment is no longer available for check-in.');
    if(findOne_('Service_Jobs',j=>String(j.appointment_id)===String(a.id)))throw new Error('Appointment already checked in.');
  }
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

// Serialized save with validation before writes and compensating rollback on errors.
// Sheets is not a transactional database; deployment checks cover live service failures.
function saveBill_(user,p) {
  const wid=user.workshop_id||ACS_WORKSHOP_ID, jobId=String(p.jobId||'');
  const job=findOne_('Service_Jobs',r=>String(r.id)===jobId&&String(r.workshop_id)===String(wid));
  if(!job)throw new Error('Service job not found.');
  const previous=findOne_('Invoices',r=>String(r.job_id)===jobId&&String(r.workshop_id)===String(wid));
  if(previous)return billResult_(previous,job);
  if(['Closed','Completed','Cancelled'].includes(job.status))throw new Error('This service job is closed.');
  const amount=(v,label)=>{const n=Number(v||0);if(!Number.isFinite(n)||n<0)throw new Error(label+' must be a non-negative number.');return n;};
  const discount=amount(p.discount,'Discount'),tax=amount(p.tax,'Tax');
  const payment=String(p.payment||'UPI');
  if(!['UPI','Cash','Card','Pending'].includes(payment))throw new Error('Choose a valid payment method.');
  const serviceDate=bookingDate_(p.serviceDate||workshopToday_());
  if(!Array.isArray(p.lines)||!p.lines.length||p.lines.length>150)throw new Error('Add between 1 and 150 bill lines.');
  const inventory=rows_('Inventory_Items').filter(r=>String(r.workshop_id)===String(wid));
  const history=rows_('Job_Lines').filter(r=>String(r.workshop_id)===String(wid));
  const key=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
  const planned=new Map();
  const lines=p.lines.map(l=>{
    const type=String(l.line_type||'Labour'),desc=String(l.description||'').trim(),qty=amount(l.quantity,'Quantity'),rate=amount(l.rate,'Rate');
    if(!['Part','Consumable','Labour','Other'].includes(type)||!desc||qty<=0)throw new Error('Every line needs a type, description and positive quantity.');
    if(!Number.isFinite(qty*rate))throw new Error('Line amount is too large.');
    let item=null,unit=String(l.unit||'').trim();
    if(['Part','Consumable'].includes(type)){
      if(l.inventory_item_id){item=inventory.find(i=>String(i.id)===String(l.inventory_item_id));if(!item)throw new Error('Selected inventory item no longer exists.');}
      else {
        const matches=inventory.filter(i=>key(i.name)===key(desc));
        const exact=matches.filter(i=>!unit||key(i.unit)===key(unit));
        if(exact.length>1)throw new Error('Multiple masters match '+desc+'. Select the intended inventory item.');
        item=exact[0]||null;
        if(!item&&matches.length)throw new Error('UOM differs from the existing master for '+desc+'. Select that item or use a distinct name.');
      }
      if(item&&String(item.active).toLowerCase()==='false')throw new Error('Reactivate the existing master for '+desc+' before billing.');
      if(!item){
        const latest=history.filter(h=>['Part','Consumable'].includes(h.line_type)&&key(h.description)===key(desc)).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0];
        item={id:Utilities.getUuid(),workshop_id:wid,sku:'AUTO-'+Utilities.getUuid().slice(0,8).toUpperCase(),name:desc,category:type,unit:unit||(latest&&latest.unit)||'pc',on_hand:0,reorder_level:0,cost:0,selling_price:rate,universal:false,compatibility_tags:'',active:true};
        inventory.push(item); planned.set(String(item.id),{before:null,after:Object.assign({},item)});
      }
      if(!planned.has(String(item.id)))planned.set(String(item.id),{before:Object.assign({},item),after:Object.assign({},item)});
      const target=planned.get(String(item.id)).after;
      if(unit&&target.unit&&key(unit)!==key(target.unit))throw new Error('Use '+target.unit+' for '+target.name+'.');
      target.unit=target.unit||unit||'pc'; unit=target.unit;
      if(l.unit_cost!==undefined&&l.unit_cost!=='')target.cost=amount(l.unit_cost,'Purchase cost');
      target.selling_price=rate;
      // Preserve existing non-negative stock behavior; issue history records the full quantity.
      target.on_hand=Math.max(0,Number(target.on_hand||0)-qty);
    }
    return {id:Utilities.getUuid(),workshop_id:wid,job_id:jobId,line_type:type,inventory_item_id:item?item.id:'',description:item?item.name:desc,quantity:qty,unit:unit,rate:rate,approved:true};
  });
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  const subtotal=round(lines.reduce((s,l)=>s+l.quantity*l.rate,0));
  if(!Number.isFinite(subtotal)||discount>subtotal)throw new Error('Discount cannot exceed subtotal.');
  const total=round(subtotal-discount+tax),undo=[];
  const add=(table,rec)=>{rec=Object.assign({id:Utilities.getUuid()},rec);undo.push(()=>deleteByKey_(table,'id',rec.id));return append_(table,rec);};
  const change=(table,before,patch)=>{undo.push(()=>updateByKey_(table,'id',before.id,before));return updateByKey_(table,'id',before.id,patch);};
  try {
    const stockChanges=[];
    planned.forEach(plan=>stockChanges.push(plan.before?change('Inventory_Items',plan.before,plan.after):add('Inventory_Items',plan.after)));
    const oldLines=rows_('Job_Lines').filter(l=>String(l.job_id)===jobId);
    undo.push(()=>{deleteWhere_('Job_Lines','job_id',jobId);appendMany_('Job_Lines',oldLines);});
    deleteWhere_('Job_Lines','job_id',jobId);
    const savedLines=appendMany_('Job_Lines',lines);
    const movements=lines.filter(l=>l.inventory_item_id).map(l=>{
      const item=planned.get(String(l.inventory_item_id)).after;
      return add('Stock_Movements',{workshop_id:wid,inventory_item_id:item.id,job_id:jobId,movement_type:'Issue',quantity:-l.quantity,unit:l.unit,unit_cost:Number(item.cost||0),note:'Used on invoice for Job '+(job.job_no||job.id)});
    });
    const historyRow=add('Service_History',{workshop_id:wid,vehicle_id:job.vehicle_id,job_id:jobId,service_date:serviceDate,odometer_km:job.odometer_km,summary:lines.map(l=>l.description).join(', '),amount:total,next_service_date:''});
    const completedJob=change('Service_Jobs',job,{status:'Closed',completed_at:new Date().toISOString()});
    const appointment=job.appointment_id?findOne_('Appointments',a=>String(a.id)===String(job.appointment_id)&&String(a.workshop_id)===String(wid)):null;
    const completedAppointment=appointment?change('Appointments',appointment,{status:'Completed'}):null;
    const invoice=add('Invoices',{workshop_id:wid,invoice_no:nextNumber_('Invoices','invoice_no',2001),job_id:jobId,customer_id:job.customer_id,vehicle_id:job.vehicle_id,subtotal:subtotal,discount:discount,tax:tax,total:total,payment_method:payment,payment_status:payment==='Pending'?'Pending':'Paid'});
    add('Audit_Log',{workshop_id:wid,user_id:user.id,action:'save_bill',entity:'service_jobs',entity_id:jobId,details:JSON.stringify({invoice_id:invoice.id,total:total,line_count:lines.length})});
    SpreadsheetApp.flush(); changed_();
    return {invoice:invoice,job:completedJob,appointment:completedAppointment,lines:savedLines,inventory_items:stockChanges,stock_movements:movements,service_history:historyRow};
  } catch(err) {
    const failures=[];undo.reverse().forEach(fn=>{try{fn()}catch(e){failures.push(String(e.message||e))}});
    changed_();
    if(failures.length)throw new Error('Invoice save was interrupted and rollback needs review. Do not retry until ACS checks Job '+job.job_no+'. '+failures.join('; '));
    throw err;
  }
}
function billResult_(invoice,job) {
  return {invoice:invoice,job:job,appointment:job.appointment_id?findOne_('Appointments',a=>String(a.id)===String(job.appointment_id)):null,lines:rows_('Job_Lines').filter(l=>String(l.job_id)===String(job.id)),inventory_items:rows_('Inventory_Items').filter(i=>String(i.workshop_id)===String(job.workshop_id)),stock_movements:rows_('Stock_Movements').filter(m=>String(m.job_id)===String(job.id)),service_history:findOne_('Service_History',h=>String(h.job_id)===String(job.id))};
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

function publicBooking_(b) {
  const cfg=readConfig_(), wid=cfg.workshop_id||ACS_WORKSHOP_ID;
  if(String(b.workshopSlug||'acs-electronic-city')!==String(cfg.workshop_slug||'acs-electronic-city'))throw new Error('Workshop not found.');
  const name=String(b.name||'').trim(), phone=String(b.phone||'').trim(), text=String(b.vehicle||'').trim(), email=String(b.email||'').trim();
  if(!name||!phone||!text)throw new Error('Name, mobile and vehicle are required.');
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email or leave it blank.');
  const requestId=String(b.requestId||'');
  if(!/^[a-zA-Z0-9-]{16,100}$/.test(requestId))throw new Error('Refresh this page before booking.');
  const old=findOne_('Appointments',a=>String(a.web_id)===requestId&&String(a.workshop_id)===String(wid));
  if(old)return {appointmentId:old.id,message:old.status==='Cancelled'?'This booking was cancelled. Please start a new booking.':'Booking already saved. See you at ACS.'};
  const rec={workshop_id:wid,preferred_date:String(b.date||''),preferred_time:String(b.time||''),issue:String(b.issue||'').trim(),status:'Booked',source:'Website',web_id:requestId};
  validateAppointment_(rec);
  let c=findOne_('Customers',x=>String(x.workshop_id)===String(wid)&&String(x.phone)===phone);
  if(!c)c=append_('Customers',{workshop_id:wid,name:name,phone:phone,email:email});
  else if(email)c=updateByKey_('Customers','id',c.id,{email:email});
  const parts=text.split(/\s+/),make=parts.shift(),model=parts.join(' ')||'Not specified',reg=String(b.registration||'').trim().toUpperCase();
  let v=reg?findOne_('Vehicles',x=>String(x.workshop_id)===String(wid)&&String(x.customer_id)===String(c.id)&&String(x.registration).replace(/\s/g,'').toUpperCase()===reg.replace(/\s/g,'')):null;
  if(!v)v=append_('Vehicles',{workshop_id:wid,customer_id:c.id,registration:reg||('PENDING-'+Utilities.getUuid().slice(0,8).toUpperCase()),make:make,model:model,odometer_km:0});
  const a=append_('Appointments',Object.assign(rec,{customer_id:c.id,vehicle_id:v.id})); changed_();
  return {appointmentId:a.id,message:'Booking saved. See you at ACS.'};
}

function audit_(user, action, entity, entityId, details) {
  try{append_('Audit_Log',{workshop_id:user.workshop_id||ACS_WORKSHOP_ID,user_id:user.id,action:action,entity:entity,entity_id:entityId||'',details:JSON.stringify(details||{})})}catch(e){}
}
