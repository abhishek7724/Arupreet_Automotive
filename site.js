const form=document.getElementById('bookingForm');
const cfg=ACSRuntime.read(),bookingText='Hi ACS, I would like to book a car service. Please let me know an available slot.';
document.querySelectorAll('[data-wa-link]').forEach(a=>a.href=ACSWhatsApp.clickUrl(cfg.whatsapp.businessPhone,bookingText));
if(form){
  const dateInput=form.querySelector('[name=date]'),timeInput=form.querySelector('[name=time]'),msg=document.getElementById('bookingMsg'),slotMsg=document.getElementById('slotMsg');
  const slots=ACSSlots.bind(dateInput,timeInput,slotMsg);
  let requestId='',fingerprint='',saving=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(saving)return;
    if(!form.reportValidity()||!timeInput.value||timeInput.disabled){msg.textContent='Choose an available time before booking.';return;}
    const data=Object.fromEntries(new FormData(form));
    for(const k of ['name','phone','vehicle','date','time','issue'])if(!String(data[k]||'').trim()){msg.textContent='Please complete all required fields.';return;}
    const next=JSON.stringify(data);if(next!==fingerprint){fingerprint=next;requestId=crypto.randomUUID();}
    const btn=form.querySelector('button[type=submit]');saving=true;btn.disabled=true;btn.textContent='Saving…';msg.textContent='';
    try{
      if(!ACSRuntime.configured())throw new Error('Online booking is not configured. Please contact ACS.');
      const out=await ACSApi.request('publicBooking',{payload:{...data,requestId,workshopSlug:cfg.workshopSlug}},false);
      msg.textContent=out.message||'Booking saved. See you at ACS.';
      form.reset();fingerprint='';requestId='';
    }catch(err){msg.textContent=err.message||'Could not save booking.';}
    finally{saving=false;btn.disabled=false;btn.textContent='Book service';await slots.refresh();}
  });
}
