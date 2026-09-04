const form=document.getElementById('authForm'),msg=document.getElementById('authMsg'),cfg=ACSRuntime.read();
if(!ACSRuntime.configured(cfg))document.getElementById('authIntro').innerHTML='Google Apps Script is not configured yet. <a href="setup.html">Open Setup</a>, or use demo mode.';
if(ACSRuntime.configured(cfg)&&ACSApi.session())location.href='app.html';
form.onsubmit=async e=>{e.preventDefault();msg.textContent='';if(!ACSRuntime.configured()){msg.textContent='Configure the Apps Script Web App first, or open demo mode.';return}const f=Object.fromEntries(new FormData(form));try{await ACSApi.login(f.email,f.password);location.href='app.html'}catch(err){msg.textContent=err.message}};
