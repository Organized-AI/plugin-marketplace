import test from 'node:test';
import assert from 'node:assert/strict';
import { audit } from '../audit.mjs';
import { htmlReport, hyperframes, shape } from '../report-html.mjs';

const snap=()=>({container:{name:'Shop <img src=x onerror=alert(1)>',publicId:'GTM-TEST',usageContext:['WEB']},
 tag:[{tagId:'1',name:'</script><script>alert(1)</script>',type:'html',firingTriggerId:['2147479553']}],
 trigger:[{triggerId:'7',name:'Lead',type:'pageview'},{triggerId:'8',name:'Purchase',type:'pageview'}],variable:[],folder:[],builtInVariable:[]});

test('container text is escaped in both outputs',()=>{
 const s=snap(),r=audit(s);
 for(const out of [htmlReport(r,s),hyperframes(r,s)]){
  assert.equal(out.includes('<img src=x'),false);
  assert.equal(out.includes('</script><script>alert(1)'),false);
  assert.ok(out.includes('&lt;img src=x')||out.includes('\\u003cimg src=x'));
 }
});
test('duplicate findings resolve both names and info findings collapse',()=>{
 const s=snap(),v=shape(audit(s),s);
 const dup=v.review.find(x=>x.pair);assert.equal(dup.pair.name,'Lead');assert.equal(dup.name,'Purchase');
 assert.equal(v.housekeeping.length,1);assert.equal(v.housekeeping[0].rows.length,3);
});
test('HyperFrames composition follows the paused-timeline contract',()=>{
 const s=snap(),out=hyperframes(audit(s),s,{id:'demo',duration:14});
 assert.match(out,/id="stage" data-composition-id="demo" data-start="0" data-duration="14" data-width="1920" data-height="1080"/);
 assert.match(out,/gsap\.timeline\(\{paused:true\}\)/);assert.match(out,/window\.__timelines\["demo"\]=tl/);
});
