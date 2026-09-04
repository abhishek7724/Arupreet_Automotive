const ACS_SESSION_HOURS = 24 * 7;

function pepper_() {
  const p = PropertiesService.getScriptProperties();
  let value = p.getProperty('AUTH_PEPPER');
  if (!value) { value = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('AUTH_PEPPER', value); }
  return value;
}

function hashPassword_(password, salt) {
  const bytes = Utilities.newBlob(String(salt)+'|'+String(password)+'|'+pepper_()).getBytes();
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));
}

function createOwner(email, password, fullName) {
  setupSheets();
  if (!email || !password || String(password).length < 8) throw new Error('Use a valid email and password of at least 8 characters.');
  const normalized = String(email).trim().toLowerCase();
  const salt = Utilities.getUuid(), hash = hashPassword_(password, salt), now = new Date().toISOString();
  const existing = findOne_('Users', r=>String(r.email).toLowerCase()===normalized);
  if (existing) {
    updateByKey_('Users','id',existing.id,{full_name:fullName||existing.full_name||'ACS Owner',role:'owner',password_salt:salt,password_hash:hash,active:true});
    return {ok:true,userId:existing.id,email:normalized,updated:true};
  }
  const rec=append_('Users',{workshop_id:ACS_WORKSHOP_ID,email:normalized,full_name:fullName||'ACS Owner',role:'owner',password_salt:salt,password_hash:hash,active:true,created_at:now});
  return {ok:true,userId:rec.id,email:normalized};
}

function createStaff(email, password, fullName, role) {
  const r = role || 'staff'; if (!['staff','mechanic'].includes(r)) throw new Error('Role must be staff or mechanic.');
  const normalized=String(email||'').trim().toLowerCase(); if(!normalized||String(password||'').length<8)throw new Error('Email and password (8+ chars) required.');
  if(findOne_('Users',x=>String(x.email).toLowerCase()===normalized))throw new Error('User already exists.');
  const salt=Utilities.getUuid(); return append_('Users',{workshop_id:ACS_WORKSHOP_ID,email:normalized,full_name:fullName||normalized,role:r,password_salt:salt,password_hash:hashPassword_(password,salt),active:true});
}

function login_(email, password) {
  const normalized=String(email||'').trim().toLowerCase();
  const user=findOne_('Users',r=>String(r.email).toLowerCase()===normalized && String(r.active).toLowerCase()!=='false');
  if(!user || hashPassword_(password,user.password_salt)!==user.password_hash) throw new Error('Invalid email or password.');
  const token=Utilities.getUuid()+Utilities.getUuid().replace(/-/g,''), now=new Date(), exp=new Date(now.getTime()+ACS_SESSION_HOURS*3600000);
  append_('Sessions',{token,user_id:user.id,expires_at:exp.toISOString(),created_at:now.toISOString(),last_seen_at:now.toISOString()});
  return {token,user:{id:user.id,email:user.email,full_name:user.full_name,role:user.role,workshop_id:user.workshop_id},expires_at:exp.toISOString()};
}

function requireSession_(token) {
  if(!token)throw new Error('AUTH_REQUIRED');
  const s=findOne_('Sessions',r=>String(r.token)===String(token)); if(!s)throw new Error('AUTH_REQUIRED');
  if(new Date(s.expires_at).getTime()<Date.now()){ deleteByKey_('Sessions','token',token); throw new Error('AUTH_REQUIRED'); }
  const u=findOne_('Users',r=>String(r.id)===String(s.user_id) && String(r.active).toLowerCase()!=='false'); if(!u)throw new Error('AUTH_REQUIRED');
  try{updateByKey_('Sessions','token',token,{last_seen_at:new Date().toISOString()})}catch(e){}
  return u;
}

function logout_(token) { if(token) deleteByKey_('Sessions','token',token); return {ok:true}; }
