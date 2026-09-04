const form=document.getElementById('bookingForm');
const dateInput=form?.querySelector('[name=date]');if(dateInput)dateInput.min=new Date().toISOString().slice(0,10);
const cfg=ACSRuntime.read(),bookingText='Hi ACS, I would like to book a car service. Please let me know an available slot.';
document.querySelectorAll('[data-wa-link]').forEach(a=>a.href=ACSWhatsApp.clickUrl(cfg.whatsapp.businessPhone,bookingText));
form?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=form.querySelector('button[type=submit]'),msg=document.getElementById('bookingMsg'),data=Object.fromEntries(new FormData(form));
  btn.disabled=true;btn.textContent='Saving…';msg.textContent='';
  try{
    if(ACSRuntime.configured(cfg)){
      const out=await ACSApi.request('publicBooking',{payload:{...data,workshopSlug:cfg.workshopSlug}},false);
      msg.textContent=out.message||'Booking saved. It is now visible to ACS.';
    }else{
      const requests=JSON.parse(localStorage.getItem('acsBookingsV3')||'[]');
      requests.unshift({...data,id:'APT-'+Date.now(),status:'Booked',createdAt:new Date().toISOString()});
      localStorage.setItem('acsBookingsV3',JSON.stringify(requests));
      msg.textContent='Demo booking saved locally. Configure Google Apps Script to make bookings live.';
    }
    form.reset();
  }catch(err){msg.textContent=err.message||'Could not save booking.'}
  finally{btn.disabled=false;btn.textContent='Book service'}
});
