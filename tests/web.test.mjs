import test from 'node:test';
import assert from 'node:assert/strict';
import {searchWeb} from '../web.js';
const settings={apiBase:'https://provider.example/v1/',apiKey:'test',model:'model'};
test('native web search gathers distinct source URLs and preserves provider citations',async()=>{
  const previous=globalThis.fetch;
  try{
    globalThis.fetch=async(url,opts)=>{
      assert.equal(url,'https://provider.example/v1/responses');
      const request=JSON.parse(opts.body);assert.equal(request.tools[0].type,'web_search');
      return Response.json({output:[{type:'web_search_call',action:{sources:[{url:'https://example.com',title:'Example'}]}},{type:'message',content:[{type:'output_text',text:'Verified result',annotations:[{type:'url_citation',url:'https://example.com',title:'Example'},{type:'url_citation',url:'javascript:alert(1)'}]}]}]});
    };
    const result=await searchWeb(settings,'question');
    assert.equal(result.searched,true);assert.equal(result.text,'Verified result');assert.equal(result.sources.length,1);
  }finally{globalThis.fetch=previous;}
});
test('unsupported provider search returns a visible error instead of claiming a search',async()=>{
  const previous=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({error:{message:'Unsupported tool'}},{status:400});await assert.rejects(searchWeb(settings,'question'),/Unsupported tool/);}finally{globalThis.fetch=previous;}
});
