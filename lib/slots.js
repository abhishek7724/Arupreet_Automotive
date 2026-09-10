(function(){
  const starts=['10:00','11:20','12:40','14:00','15:20','16:40'];
  const display=t=>{const [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
  const label=t=>`${display(t)} – ${display(starts[starts.indexOf(t)+1]||'18:00')}`;
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  async function available(date,options={}){
    if(!ACSRuntime.configured())throw new Error('Online booking is not configured. Please contact ACS.');
    return ACSApi.request('slotAvailability',{payload:{date,workshopSlug:ACSRuntime.read().workshopSlug}},false,options);
  }
  function bind(dateInput,select,message,load=available){
    let sequence=0,stopped=false,pending=null,loadedDate='',activeDate='',timer=null,failures=0;
    const retry=document.createElement('button');
    retry.type='button';retry.className='btn ghost button secondary wide';retry.textContent='Retry times';retry.hidden=true;retry.style.display='none';
    const showRetry=show=>{retry.hidden=!show;retry.style.display=show?'inline-flex':'none';};
    retry.style.minHeight='44px';
    message.insertAdjacentElement('afterend',retry);
    const busy=value=>select.setAttribute('aria-busy',String(value));
    function schedule(){
      clearTimeout(timer);
      if(stopped||!dateInput.value)return;
      const delay=failures?Math.min(120000,30000*Math.pow(2,failures-1)):60000;
      timer=setTimeout(()=>{if(document.hidden)schedule();else refresh();},delay);
    }
    function refresh(){
      if(stopped)return Promise.resolve();
      const date=dateInput.value;
      if(pending?.date===date)return pending.promise;
      clearTimeout(timer);pending?.controller.abort();
      const seq=++sequence;
      if(!date){pending=null;loadedDate='';failures=0;select.disabled=true;select.innerHTML='<option value="">Choose a date first</option>';message.textContent='';showRetry(false);busy(false);return Promise.resolve();}
      if(activeDate!==date){activeDate=date;failures=0;}
      const retained=loadedDate===date;
      if(!retained){loadedDate='';select.disabled=true;select.innerHTML='<option value="">Checking available times…</option>';}
      message.textContent=retained?'Checking for changes. Your time selection remains available.':'Checking available times…';
      showRetry(false);busy(true);
      const request={date,controller:new AbortController(),promise:null};pending=request;
      request.promise=(async()=>{
        try{
          const out=await load(date,{signal:request.controller.signal});
          if(stopped||seq!==sequence)return;
          if(!out||!Array.isArray(out.slots)||out.slots.some(t=>!starts.includes(t))||(out.date&&out.date!==date))throw new Error('The time response was invalid. Please retry.');
          const slots=starts.filter(t=>out.slots.includes(t)),chosen=select.value;
          select.replaceChildren(new Option(slots.length?'Choose a time':'No available slots',''));
          slots.forEach(t=>select.add(new Option(label(t),t)));
          if(slots.includes(chosen))select.value=chosen;
          select.disabled=!slots.length;loadedDate=date;failures=0;
          message.textContent=slots.length?(chosen&&!slots.includes(chosen)?'That time is no longer available. Please choose another.':'Times are confirmed when your booking is saved.'):'No slots available for this date. Please choose another day.';
        }catch(e){
          if(stopped||seq!==sequence)return;
          failures++;
          if(loadedDate===date){
            message.textContent='Could not refresh times. Showing the last checked availability; your time is checked again when you book. You can retry now.';
          }else{
            select.disabled=true;select.innerHTML='<option value="">Could not check times</option>';
            message.textContent='Could not load times. '+(e.code==='REQUEST_TIMEOUT'?'Checking times took too long. Please retry.':e.message||'Please check your connection and retry.');
          }
          showRetry(true);
        }finally{
          if(seq===sequence){pending=null;busy(false);schedule();}
        }
      })();
      return request.promise;
    }
    retry.addEventListener('click',refresh);
    dateInput.min=today();dateInput.addEventListener('change',refresh);refresh();
    return {refresh,stop(){stopped=true;sequence++;clearTimeout(timer);pending?.controller.abort();dateInput.removeEventListener('change',refresh);retry.remove();}};
  }
  window.ACSSlots={starts,label,today,available,bind};
})();
