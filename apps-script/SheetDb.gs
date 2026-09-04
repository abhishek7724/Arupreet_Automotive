function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Spreadsheet is not configured. Run setupSheets() from a script bound to the ACS backend sheet.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
  return active;
}

function sheet_(name) {
  const sh = spreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name + '. Run setupSheets().');
  return sh;
}

function iso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'GMT', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  return v;
}

function headers_(name) {
  const sh=sheet_(name), lastCol=sh.getLastColumn();
  if(lastCol<1)return [];
  return sh.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v||'').trim()).filter(Boolean);
}

function rows_(name) {
  const sh = sheet_(name), lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const values = sh.getRange(1,1,lastRow,lastCol).getValues();
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '' && v !== null)).map(r => {
    const o = {}; headers.forEach((h,i)=>{if(h)o[h]=iso_(r[i])}); return o;
  });
}

function append_(name, row) {
  const sh = sheet_(name), headers = headers_(name);
  const rec = Object.assign({}, row);
  if (!rec.id && headers.includes('id')) rec.id = Utilities.getUuid();
  if (!rec.created_at && headers.includes('created_at')) rec.created_at = new Date().toISOString();
  const vals = headers.map(h => rec[h] === undefined || rec[h] === null ? '' : rec[h]);
  sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([vals]);
  return rec;
}

function appendMany_(name, rows) {
  if(!rows || !rows.length)return [];
  const sh=sheet_(name), headers=headers_(name), now=new Date().toISOString();
  const out=rows.map(row=>{
    const rec=Object.assign({},row);
    if(!rec.id && headers.includes('id'))rec.id=Utilities.getUuid();
    if(!rec.created_at && headers.includes('created_at'))rec.created_at=now;
    return rec;
  });
  sh.getRange(sh.getLastRow()+1,1,out.length,headers.length).setValues(out.map(rec=>headers.map(h=>rec[h]===undefined||rec[h]===null?'':rec[h])));
  return out;
}

function updateByKey_(name, key, value, patch) {
  const sh = sheet_(name), headers = headers_(name), col = headers.indexOf(key) + 1;
  if (!col) throw new Error('Unknown key ' + key + ' for ' + name);
  const last = sh.getLastRow(); if (last < 2) throw new Error(name + ' record not found');
  const ids = sh.getRange(2,col,last-1,1).getValues().flat().map(String);
  const idx = ids.findIndex(v => v === String(value)); if (idx < 0) throw new Error(name + ' record not found');
  const rowNum = idx + 2, current = sh.getRange(rowNum,1,1,headers.length).getValues()[0];
  headers.forEach((h,i)=>{ if (Object.prototype.hasOwnProperty.call(patch,h)) current[i] = patch[h] === null ? '' : patch[h]; });
  sh.getRange(rowNum,1,1,headers.length).setValues([current]);
  const out = {}; headers.forEach((h,i)=>out[h]=iso_(current[i])); return out;
}

function deleteByKey_(name, key, value) {
  const sh = sheet_(name), headers = headers_(name), col = headers.indexOf(key) + 1, last = sh.getLastRow();
  if (!col || last < 2) return false;
  const vals = sh.getRange(2,col,last-1,1).getValues().flat().map(String);
  const idx = vals.findIndex(v=>v===String(value)); if (idx < 0) return false;
  sh.deleteRow(idx+2); return true;
}

function deleteWhere_(name, key, value) {
  const sh = sheet_(name), headers = headers_(name), col = headers.indexOf(key) + 1, last = sh.getLastRow();
  if (!col || last < 2) return 0;
  const vals = sh.getRange(2,col,last-1,1).getValues().flat().map(String), rows=[];
  vals.forEach((v,i)=>{if(v===String(value))rows.push(i+2)});
  rows.reverse().forEach(r=>sh.deleteRow(r)); return rows.length;
}

function findOne_(name, predicate) { return rows_(name).find(predicate) || null; }
function findMany_(name, predicate) { return rows_(name).filter(predicate); }

function nextNumber_(name, field, start) {
  const values = rows_(name).map(r=>Number(r[field]||0)).filter(Number.isFinite);
  return Math.max(start-1, ...values) + 1;
}

function readConfig_() {
  const out = {}; rows_('Config').forEach(r=>out[String(r.key)] = r.value); return out;
}

function upsertConfig_(key, value, notes) {
  const found = findOne_('Config', r=>String(r.key)===String(key));
  if (found) return updateByKey_('Config','key',key,{value:value,notes:notes||found.notes||''});
  const sh=sheet_('Config'); sh.appendRow([key,value,notes||'']); return {key,value,notes:notes||''};
}

function withWriteLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function dataCacheKey_(workshopId){return 'ACS_ALL_'+String(workshopId||ACS_WORKSHOP_ID)}
function dataVersion_(){
  const props=PropertiesService.getScriptProperties();
  let v=props.getProperty('ACS_DATA_VERSION');
  if(!v){v=String(Date.now());props.setProperty('ACS_DATA_VERSION',v)}
  return v;
}
function touchDataVersion_(){const v=String(Date.now())+'-'+Utilities.getUuid().slice(0,8);PropertiesService.getScriptProperties().setProperty('ACS_DATA_VERSION',v);return v}
function onAcsSheetEdit_(e){try{invalidateDataCache_();touchDataVersion_()}catch(err){}}

function invalidateDataCache_(){
  try{
    const cache=CacheService.getScriptCache();
    cache.remove(dataCacheKey_(ACS_WORKSHOP_ID));
  }catch(e){}
}
