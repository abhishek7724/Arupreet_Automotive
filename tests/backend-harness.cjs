// Apps Script service substitutes for local regression tests. No Google data is used.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function createBackend(){
  const tables={},props=new Map(),cache=new Map();let locked=false,flushes=0,fail=null;
  const formatDate=(d,tz,fmt)=>{
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz==='GMT'?'UTC':tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));
    if(fmt==='yyyy-MM-dd')return `${parts.year}-${parts.month}-${parts.day}`;
    if(fmt==='HH:mm')return `${parts.hour}:${parts.minute}`;
    return d.toISOString();
  };
  const c=vm.createContext({console,Date,Map,Set,JSON,Math,Number,String,Object,Array,Error,RegExp,
    Utilities:{getUuid:()=>crypto.randomUUID(),formatDate},
    SpreadsheetApp:{flush(){flushes++}},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
    LockService:{getScriptLock:()=>({waitLock(){if(locked)throw Error('Concurrent lock');locked=true},releaseLock(){locked=false}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})}
  });
  const dir=path.join(__dirname,'..','apps-script');
  for(const file of ['Schema.gs','SheetDb.gs','Auth.gs','Booking.gs','Api.gs'])vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),c,{filename:file});
  const schema=vm.runInContext('ACS_SCHEMA',c);Object.keys(schema).forEach(t=>tables[t]=[]);
  const copy=x=>structuredClone(x);
  const checkpoint=(action,table)=>{if(fail?.action===action&&fail?.table===table){fail=null;throw Error('Injected storage failure')}if(!locked&&table!=='Sessions')throw Error('Unprotected write to '+table)};
  c.rows_=t=>{if(!tables[t])throw Error('Missing table '+t);return copy(tables[t])};
  c.append_=(t,r)=>{checkpoint('append',t);const rec={...r};if(!rec.id)rec.id=crypto.randomUUID();if(!rec.created_at)rec.created_at=new Date().toISOString();tables[t].push(copy(rec));return rec};
  c.appendMany_=(t,rs)=>rs.map(r=>c.append_(t,r));
  c.updateByKey_=(t,k,id,p)=>{checkpoint('update',t);const r=tables[t].find(r=>String(r[k])===String(id));if(!r)throw Error('Not found '+t);Object.assign(r,copy(p));return copy(r)};
  c.deleteByKey_=(t,k,id)=>{checkpoint('delete',t);tables[t]=tables[t].filter(r=>String(r[k])!==String(id));return true};
  c.deleteWhere_=c.deleteByKey_;
  tables.Config=[{key:'workshop_id',value:'w'},{key:'workshop_slug',value:'acs-electronic-city'},{key:'workshop_name',value:'Arupreet Car Service'},{key:'address',value:'Electronic City, Bengaluru'},{key:'phone',value:'919999827339'},{key:'timezone',value:'Asia/Kolkata'}];
  tables.Users=[{id:'staff',workshop_id:'w',email:'staff@example.test',full_name:'ACS Staff',role:'staff',active:true},{id:'foreign',workshop_id:'foreign-w',role:'staff',active:true}];
  tables.Sessions=[{token:'test-session',user_id:'staff',expires_at:'2099-01-01T00:00:00Z'},{token:'foreign-session',user_id:'foreign',expires_at:'2099-01-01T00:00:00Z'}];
  function post(action,p={},token='test-session'){return JSON.parse(c.doPost({postData:{contents:JSON.stringify({action,...p,token})}}))}
  return {context:c,tables,post,failNext:(action,table)=>fail={action,table},get locked(){return locked},get flushes(){return flushes}};
}
module.exports={createBackend};
