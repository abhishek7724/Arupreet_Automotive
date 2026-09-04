(function(){
  const KEY='acsDigitalV3SheetsRuntime', defaults=window.ACS_DEFAULT_CONFIG||{};
  function read(){let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){};return {...defaults,...saved,whatsapp:{...(defaults.whatsapp||{}),...(saved.whatsapp||{})}}}
  function write(next){localStorage.setItem(KEY,JSON.stringify(next));return next}
  function configured(c=read()){return Boolean(c.appsScriptUrl)}
  window.ACSRuntime={KEY,read,write,configured,clear:()=>localStorage.removeItem(KEY)};
})();
