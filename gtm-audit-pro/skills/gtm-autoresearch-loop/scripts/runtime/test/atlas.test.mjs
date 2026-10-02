import test from 'node:test';
import assert from 'node:assert/strict';
import { audit } from '../audit.mjs';
import { atlas, graph } from '../atlas.mjs';

const snap=()=>({container:{name:'Shop',publicId:'GTM-TEST',usageContext:['WEB']},
 tag:[{tagId:'1',name:'Meta CAPI',type:'html',firingTriggerId:['7','2147479553'],blockingTriggerId:['8'],parameter:[{key:'html',value:'<script>fbq("{{Pixel ID}}","{{_event}}")</script>'}]},
      {tagId:'2',name:'Setup',type:'html',firingTriggerId:['7'],setupTag:[]},{tagId:'3',name:'Main',type:'html',firingTriggerId:['7'],setupTag:[{tagName:'Setup'}]}],
 trigger:[{triggerId:'7',name:'Lead',type:'customEvent'},{triggerId:'8',name:'Lead copy',type:'customEvent'}],
 variable:[{variableId:'20',name:'Pixel ID',type:'c',parameter:[{key:'value',value:'EAAG-SECRET-TOKEN-123'}]}],folder:[],builtInVariable:[{name:'Event',type:'EVENT'}]});

test('graph links fires, blocks, reads, sequence, built-ins and duplicates',()=>{
 const s=snap(),g=graph(audit(s),s),has=(f,t,k)=>g.edges.some(e=>e.from===f&&e.to===t&&e.kind===k);
 assert.ok(has('tag:1','trigger:7','fires'));assert.ok(has('tag:1','trigger:2147479553','fires'));assert.ok(has('tag:1','trigger:8','blocks'));
 assert.ok(has('tag:1','variable:20','reads'));assert.ok(has('tag:1','builtin:Event','reads'));assert.ok(has('tag:2','tag:3','sequence'));
 assert.ok(has('trigger:8','trigger:7','duplicate'));
 assert.equal(g.nodes.find(n=>n.id==='trigger:2147479553').name,'All Pages');
});
test('constant values and custom HTML never reach the page',()=>{
 const s=snap(),html=atlas([{report:audit(s),snapshot:s}]);
 assert.equal(html.includes('EAAG-SECRET-TOKEN-123'),false);assert.equal(html.includes('fbq('),false);
});
test('names cannot break out of the embedded data or title',()=>{
 const s=snap();s.container.publicId='</title><script>alert(1)</script>';s.tag[0].name='</script><script>alert(2)</script>';
 const html=atlas([{report:audit(s),snapshot:s}]);
 assert.equal(html.includes('<script>alert('),false);assert.ok(html.includes('&lt;/title&gt;'));
});
test('fragment output omits the document wrapper',()=>{
 const s=snap(),html=atlas([{report:audit(s),snapshot:s}],{fragment:true});
 assert.equal(/<(html|head|body)[\s>]/.test(html),false);assert.match(html,/^<title>/);
});
