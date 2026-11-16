import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import worker,{passwordHash} from '../worker/service.mjs';
export function sqliteD1({migrations=true}={}){
 const raw=new DatabaseSync(':memory:');
 if(migrations)for(const name of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())raw.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const DB={raw,prepare(text){let args=[];return{bind(...values){args=values;return this;},runSync(){return raw.prepare(text).run(...args);},async run(){return this.runSync();},async first(){return raw.prepare(text).get(...args)||null;},async all(){return{results:raw.prepare(text).all(...args)};}};},async batch(statements){raw.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(statement.runSync());raw.exec('COMMIT');return results;}catch(error){raw.exec('ROLLBACK');throw error;}}};
 return DB;
}
export async function relayFixture(){
 const salt='1234567890abcdef1234567890abcdef',DB=sqliteD1(),env={DB,ADMIN_USERNAME:'TYC',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:await passwordHash('Neutral-Fixture',salt)};
 const call=(path,{method='GET',token,body}={})=>worker.fetch(new Request('https://fixture.test'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)}),env);
 const token=(await(await call('/auth/login',{method:'POST',body:{username:'tyc',password:'neutral-fixture'}})).json()).token;
 const pairing=await(await call('/bridge/pair',{method:'POST',token,body:{}})).json();
 const profile={authenticated:true,planType:null,models:[{slug:'fixture-model',display_name:'Fixture'}],capabilities:{protocolVersion:4,maxConcurrentJobs:3,cancelInference:true}},instanceId=crypto.randomUUID();
 const poll=(extra={})=>call('/bridge/poll',{method:'POST',token:pairing.bridgeToken,body:{profile,instanceId,activeJobIds:[],...extra}});
 await poll();
 const payload={model:'fixture-model',input:[{role:'user',content:'Neutral fixture request'}],stream:true,store:false};
 const create=async(id=crypto.randomUUID())=>{const response=await call('/jobs',{method:'POST',token,body:{id,payload}});if(response.status!==202)throw Error('Fixture admission failed');return id;};
 return{DB,env,call,token,pairing,profile,instanceId,poll,payload,create};
}
