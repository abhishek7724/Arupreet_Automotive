function normalizePhone_(phone) {
  let p=String(phone||'').replace(/\D/g,''); if(p.length===10)p='91'+p; return p;
}

function sendWhatsApp_(user, payload) {
  const to=normalizePhone_(payload.to); if(!to)throw new Error('Recipient is required.');
  const props=PropertiesService.getScriptProperties();
  const version=props.getProperty('WHATSAPP_GRAPH_VERSION') || 'v23.0';
  const phoneId=props.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken=props.getProperty('WHATSAPP_ACCESS_TOKEN');
  if(!phoneId||!accessToken)throw new Error('WhatsApp Cloud API is not configured in Apps Script Script Properties.');
  let body={messaging_product:'whatsapp',recipient_type:'individual',to:to};
  if(payload.template && payload.template.name){
    body.type='template'; body.template={name:payload.template.name,language:{code:payload.template.language||'en_US'},components:payload.template.components||[]};
  }else{
    const text=String(payload.text||'').trim(); if(!text)throw new Error('Text or template is required.');
    body.type='text'; body.text={preview_url:true,body:text};
  }
  const response=UrlFetchApp.fetch('https://graph.facebook.com/'+version+'/'+phoneId+'/messages',{
    method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+accessToken},payload:JSON.stringify(body),muteHttpExceptions:true
  });
  const status=response.getResponseCode(); let result={}; try{result=JSON.parse(response.getContentText()||'{}')}catch(e){result={raw:response.getContentText()}}
  const ctx=payload.context||{};
  append_('WhatsApp_Messages',{workshop_id:user.workshop_id||ACS_WORKSHOP_ID,customer_id:ctx.customerId||'',vehicle_id:ctx.vehicleId||'',job_id:ctx.jobId||'',message_type:ctx.type||'Message',recipient:to,body:payload.text||(payload.template&&payload.template.name)||'',provider:'Meta',provider_message_id:result.messages&&result.messages[0]&&result.messages[0].id||'',status:status>=200&&status<300?'Sent':'Failed',error:status>=200&&status<300?'':JSON.stringify(result)});
  if(status<200||status>=300)throw new Error('Meta WhatsApp API rejected the message: '+response.getContentText());
  return {ok:true,messageId:result.messages&&result.messages[0]&&result.messages[0].id||''};
}

function setWhatsAppSecrets(graphVersion, phoneNumberId, accessToken) {
  const p=PropertiesService.getScriptProperties();
  if(graphVersion)p.setProperty('WHATSAPP_GRAPH_VERSION',graphVersion);
  if(phoneNumberId)p.setProperty('WHATSAPP_PHONE_NUMBER_ID',phoneNumberId);
  if(accessToken)p.setProperty('WHATSAPP_ACCESS_TOKEN',accessToken);
  return {ok:true};
}
