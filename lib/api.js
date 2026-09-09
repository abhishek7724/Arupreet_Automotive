(function(){
  const SESSION_KEY='acsDigitalV3SheetsSession';
  let lastMeta=null;
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  function setSession(s){if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY)}
  async function request(action,payload={},auth=true){
    const cfg=window.ACSRuntime.read();if(!cfg.appsScriptUrl)throw new Error('Google Apps Script backend is not configured.');
    const s=session();const body={action,...payload};if(auth&&s?.token)body.token=s.token;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    let r;
    try{
      r=await fetch(cfg.appsScriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow',signal:controller.signal});
    }catch(e){
      if(e&&e.name==='AbortError')throw new Error('ACS backend timed out. Please retry.');
      throw e;
    }finally{clearTimeout(timer)}
    const text=await r.text();let o;try{o=JSON.parse(text)}catch(e){throw new Error('Apps Script returned an unreadable response. Check deployment access and URL.');}
    if(!o.ok){const err=new Error(o.error||'Apps Script request failed');if(o.code)err.code=o.code;throw err}lastMeta=o.meta||null;return o.data;
  }
  async function login(email,password){const d=await request('login',{email,password},false);setSession(d);return d}
  async function logout(){try{await request('logout',{},true)}catch(e){}setSession(null)}
  window.ACSApi={request,login,logout,session,setSession,meta:()=>lastMeta,SESSION_KEY};
})();
