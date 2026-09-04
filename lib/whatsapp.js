(function(){
  const digits=v=>String(v||'').replace(/\D/g,'');
  function normalizePhone(phone){let p=digits(phone);if(!p)return'';if(p.length===10)p='91'+p;return p}
  function clickUrl(phone,text){return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text||'')}`}
  function open(phone,text){window.open(clickUrl(phone,text),'_blank','noopener')}
  async function sendAutomated(phone,text,context={}){return ACSApi.request('sendWhatsApp',{payload:{to:normalizePhone(phone),text,context}})}
  async function send(phone,text,context={}){const cfg=ACSRuntime.read();if(cfg.whatsapp?.mode==='meta_cloud_api')return sendAutomated(phone,text,context);open(phone,text);return{mode:'click_to_chat'}}
  window.ACSWhatsApp={normalizePhone,clickUrl,open,send};
})();
