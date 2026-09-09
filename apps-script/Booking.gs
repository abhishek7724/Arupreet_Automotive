// Six contiguous 80-minute appointment windows, in workshop local time.
const ACS_SLOTS = ['10:00','11:20','12:40','14:00','15:20','16:40'];
function bookingError_(message, code) { const e=new Error(message); e.code=code; throw e; }
function workshopToday_() { return Utilities.formatDate(new Date(),readConfig_().timezone||'Asia/Kolkata','yyyy-MM-dd'); }
function bookingDate_(value) {
  const s=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new Error('Choose a valid date.');
  return s;
}
function storedDate_(value) { return String(value||'').slice(0,10); }
function slotMinutes_(value) {
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  return match?Number(match[1])*60+Number(match[2]):NaN;
}
function slotOccupied_(a,start) {
  // Legacy non-grid bookings reserve their containing window; unknown times
  // conservatively reserve the day until staff review/cancel that booking.
  const t=slotMinutes_(a.preferred_time), s=slotMinutes_(start);
  return !Number.isFinite(t)||(t>=s&&t<s+80);
}
function slotAvailability_(p) {
  const cfg=readConfig_(), wid=cfg.workshop_id||ACS_WORKSHOP_ID;
  if(String(p.workshopSlug||'acs-electronic-city')!==String(cfg.workshop_slug||'acs-electronic-city'))throw new Error('Workshop not found.');
  const date=bookingDate_(p.date), past=date<workshopToday_();
  const rows=rows_('Appointments').filter(a=>String(a.workshop_id)===String(wid)&&storedDate_(a.preferred_date)===date&&String(a.status).toLowerCase()!=='cancelled');
  const slots=past?[]:ACS_SLOTS.filter(s=>!rows.some(a=>slotOccupied_(a,s)));
  return {date:date,slots:slots,dailyCapacity:6,timezone:cfg.timezone||'Asia/Kolkata'};
}
function validateAppointment_(record,excludeId) {
  const date=bookingDate_(record.preferred_date), time=String(record.preferred_time||'');
  if(date<workshopToday_())throw new Error('Choose today or a future date.');
  if(!ACS_SLOTS.includes(time))throw new Error('Choose one of the six available booking slots.');
  if(!String(record.issue||'').trim())throw new Error('What do you want checked is required.');
  const busy=rows_('Appointments').some(a=>String(a.id)!==String(excludeId||'')&&String(a.workshop_id)===String(record.workshop_id)&&storedDate_(a.preferred_date)===date&&String(a.status).toLowerCase()!=='cancelled'&&slotOccupied_(a,time));
  if(busy)bookingError_('That slot was just booked. Please choose another time.','SLOT_UNAVAILABLE');
}
function cancelAppointment_(user,id,reason) {
  const wid=user.workshop_id||ACS_WORKSHOP_ID;
  const a=findOne_('Appointments',r=>String(r.id)===String(id)&&String(r.workshop_id)===String(wid));
  if(!a)throw new Error('Appointment not found.');
  if(a.status==='Cancelled')return a;
  if(a.status!=='Booked'||findOne_('Service_Jobs',j=>String(j.appointment_id)===String(id)))throw new Error('This appointment has already been checked in; manage its service job instead.');
  const patch={status:'Cancelled',cancelled_at:new Date().toISOString(),cancelled_by:user.id,cancellation_reason:String(reason||'').trim()};
  // Audit must succeed before changing appointment state.
  append_('Audit_Log',{workshop_id:wid,user_id:user.id,action:'cancel_appointment',entity:'appointments',entity_id:id,details:JSON.stringify(patch)});
  const out=updateByKey_('Appointments','id',id,patch); changed_(); return out;
}
