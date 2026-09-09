const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){
  const callbacks={},timers=[];
  const select={value:'',disabled:false,options:[],set innerHTML(v){this.options=[];this.value=''},replaceChildren(o){this.options=[o];this.value=''},add(o){this.options.push(o)}};
  const date={value:'',addEventListener:(e,f)=>callbacks[e]=f,removeEventListener(){}};
  const message={textContent:''};const requests=[];
  const c=vm.createContext({window:{},document:{hidden:false},Intl,Date,Option:function(text,value){this.text=text;this.value=value},setInterval:fn=>(timers.push(fn),timers.length),clearInterval(){}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','lib','slots.js'),'utf8'),c);
  const bound=c.window.ACSSlots.bind(date,select,message,d=>new Promise((resolve,reject)=>requests.push({d,resolve,reject})));
  return {date,select,message,requests,bound,timers};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('slow response from old selected date never replaces current slots',async()=>{const f=fixture();f.date.value='2030-01-01';f.bound.refresh();f.date.value='2030-01-02';f.bound.refresh();f.requests[1].resolve({slots:['11:20']});await tick();f.requests[0].resolve({slots:['10:00']});await tick();assert.deepEqual(f.select.options.map(o=>o.value),['','11:20'])});
test('slow availability does not overlap polling and failures disable stale selection',async()=>{const f=fixture();f.date.value='2030-01-01';f.bound.refresh();f.timers[0]();f.timers[0]();assert.equal(f.requests.length,1);f.requests[0].reject(new Error('Offline'));await tick();assert.equal(f.select.disabled,true);assert.match(f.message.textContent,/Offline/);f.bound.refresh();assert.equal(f.requests.length,2)});
test('clearing date during load permits selecting it again',async()=>{const f=fixture();f.date.value='2030-01-01';f.bound.refresh();f.date.value='';f.bound.refresh();f.date.value='2030-01-01';f.bound.refresh();assert.equal(f.requests.length,2);f.requests[1].resolve({slots:['10:00']});await tick();assert.equal(f.select.disabled,false)});
test('stopped modal cannot receive stale availability updates',async()=>{const f=fixture();f.date.value='2030-01-01';f.bound.refresh();f.bound.stop();f.requests[0].resolve({slots:['10:00']});await tick();assert.equal(f.select.options.length,0)});
