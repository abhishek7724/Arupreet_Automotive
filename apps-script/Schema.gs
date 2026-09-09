const ACS_SCHEMA = {
  Config: ['key','value','notes'],
  Users: ['id','workshop_id','email','full_name','role','password_salt','password_hash','active','created_at'],
  Sessions: ['token','user_id','expires_at','created_at','last_seen_at'],
  Customers: ['id','workshop_id','name','phone','email','notes','created_at'],
  Vehicles: ['id','workshop_id','customer_id','registration','make','model','variant','model_year','odometer_km','vin','notes','created_at'],
  Appointments: ['id','workshop_id','customer_id','vehicle_id','preferred_date','preferred_time','issue','status','source','web_id','cancelled_at','cancelled_by','cancellation_reason','created_at'],
  // approval_* columns are retained for backward compatibility with existing v0.3 sheets,
  // but v0.3.2 no longer uses an approval workflow.
  Service_Jobs: ['id','workshop_id','job_no','appointment_id','customer_id','vehicle_id','bay','odometer_km','complaint','inspection_notes','work_to_be_done','approval_status','approval_token','status','check_in_at','completed_at','job_card_generated','job_card_created_at','created_at'],
  Job_Lines: ['id','workshop_id','job_id','line_type','inventory_item_id','description','quantity','unit','rate','approved','created_at'],
  Inventory_Items: ['id','workshop_id','sku','name','category','unit','on_hand','reorder_level','cost','selling_price','universal','compatibility_tags','active','created_at'],
  Stock_Movements: ['id','workshop_id','inventory_item_id','job_id','movement_type','quantity','unit','unit_cost','note','created_at'],
  Invoices: ['id','workshop_id','invoice_no','job_id','customer_id','vehicle_id','subtotal','discount','tax','total','payment_method','payment_status','created_at'],
  Service_History: ['id','workshop_id','vehicle_id','job_id','service_date','odometer_km','summary','amount','next_service_date','created_at'],
  Reminders: ['id','workshop_id','vehicle_id','due_date','reminder_type','status','sent_at','created_at'],
  WhatsApp_Messages: ['id','workshop_id','customer_id','vehicle_id','job_id','message_type','recipient','body','provider','provider_message_id','status','error','created_at'],
  Audit_Log: ['id','workshop_id','user_id','action','entity','entity_id','details','created_at']
};

const ACS_TABLE_MAP = {
  customers: 'Customers', vehicles: 'Vehicles', appointments: 'Appointments',
  service_jobs: 'Service_Jobs', job_lines: 'Job_Lines', inventory_items: 'Inventory_Items',
  stock_movements: 'Stock_Movements', invoices: 'Invoices', service_history: 'Service_History',
  whatsapp_messages: 'WhatsApp_Messages'
};

const ACS_WORKSHOP_ID = '00000000-0000-0000-0000-000000000001';

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  Object.keys(ACS_SCHEMA).forEach(name => ensureSheet_(ss, name, ACS_SCHEMA[name]));
  seedConfig_();
  invalidateDataCache_();
  touchDataVersion_();
  installAutoSyncTrigger_();
  return { ok: true, spreadsheetId: ss.getId(), sheets: Object.keys(ACS_SCHEMA), version: '0.4.0', autoSync: true };
}

// Additive upgrade: never reorder/delete existing columns. Missing v0.3.2 columns are appended.
function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    const lastCol = Math.max(1, sh.getLastColumn());
    const current = sh.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v||'').trim());
    const missing = headers.filter(h => !current.includes(h));
    if (missing.length) sh.getRange(1,lastCol+1,1,missing.length).setValues([missing]);
  }
  const finalLastCol = Math.max(1, sh.getLastColumn());
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,finalLastCol).setFontWeight('bold').setBackground('#111827').setFontColor('#ffffff');
  return sh;
}

function seedConfig_() {
  const existing = readConfig_();
  const defaults = {
    workshop_id: ACS_WORKSHOP_ID,
    workshop_name: 'Arupreet Car Service',
    workshop_slug: 'acs-electronic-city',
    phone: '919999827339',
    address: 'Electronic City, Bengaluru',
    timezone: 'Asia/Kolkata',
    daily_capacity: '6',
    whatsapp_mode: 'click_to_chat'
  };
  Object.keys(defaults).forEach(k => { if (existing[k] === undefined || existing[k] === '') upsertConfig_(k, defaults[k], 'ACS Digital'); });
}


function installAutoSyncTrigger_() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const exists=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='onAcsSheetEdit_');
  if(!exists) ScriptApp.newTrigger('onAcsSheetEdit_').forSpreadsheet(ss).onEdit().create();
}
