(function(){
  const starts=['10:00','11:20','12:40','14:00','15:20','16:40'];
  const display=t=>{const [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
  const label=t=>`${display(t)} – ${display(starts[starts.indexOf(t)+1]||'18:00')}`;
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  async function available(date){
    if(!ACSRuntime.configured())throw new Error('Online booking is not configured. Please contact ACS.');
    return ACSApi.request('slotAvailability',{payload:{date,workshopSlug:ACSRuntime.read().workshopSlug}},false);
  }
  // Ignore slow responses for a previously selected date.
  function bind(dateInput,select,message,load=available){
    let sequence=0,stopped=false,inFlightDate=null;
    async function refresh(){
      const date=dateInput.value;
      if(inFlightDate===date)return;
      const seq=++sequence,chosen=select.value;
      select.disabled=true;
      if(!date){inFlightDate=null;select.innerHTML='<option value="">Choose a date first</option>';return;}
      inFlightDate=date;
      try{
        const out=await load(date);if(stopped||seq!==sequence)return;
        select.replaceChildren(new Option(out.slots.length?'Choose a time':'No available slots',''));
        out.slots.forEach(t=>{if(starts.includes(t))select.add(new Option(label(t),t));});
        if(out.slots.includes(chosen))select.value=chosen;
        select.disabled=!out.slots.length;
        message.textContent=out.slots.length?'Times are confirmed when your booking is saved.':'No slots available for this date. Please choose another day.';
      }catch(e){if(stopped||seq!==sequence)return;select.innerHTML='<option value="">Availability unavailable</option>';message.textContent='Could not load times. '+e.message;}
      finally{if(seq===sequence)inFlightDate=null;}
    }
    dateInput.min=today(); dateInput.addEventListener('change',refresh);
    const timer=setInterval(()=>{if(!document.hidden)refresh();},10000);
    refresh();
    return {refresh,stop(){stopped=true;sequence++;clearInterval(timer);dateInput.removeEventListener('change',refresh);}};
  }
  window.ACSSlots={starts,label,today,available,bind};
})();
