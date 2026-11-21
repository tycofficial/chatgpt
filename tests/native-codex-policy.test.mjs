import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as catalog from '../model-catalog.js';
import {createModelCatalogAdapter} from '../src/native-client/model-catalog-adapter.mjs';
const source=fs.readFileSync(new URL('../src/native-client/local-codex-adapter.mjs',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export\s+/gm,'');
const context=vm.createContext({WORK_MODEL_IDS:catalog.WORK_MODEL_IDS,Object,Set,Map,TypeError,RangeError,structuredClone,DOMException});
new vm.Script(source+'\nglobalThis.createAdapter=createLocalCodexAdapter;').runInContext(context);
const identity={accountId:'fixture-local-account',userId:'fixture-local-user'},inputs={...identity,authenticatedAccountId:identity.accountId,authLoading:false,accountLoading:false};
const ready={isLoading:false,isError:false,isCapable:true};
function fixture(patch={}){
 const state={identity,local:true,modelSelection:true,...patch};
 const adapter=context.createAdapter({appServer:{dispatch(){},subscribe(){return()=>{};},streamCompletion(){}},models:createModelCatalogAdapter(catalog),readSettings:()=>({apiBase:'https://fixture.invalid',apiKey:'fixture-only'}),getIdentity:()=>state.identity,isLocalSession:()=>state.local,getCapabilities:()=>({executionSource:'local-app-server',textConversations:true,modelSelection:state.modelSelection})});
 return{state,adapter};
}
test('verified ready local Codex uses the native settled discovery branch without a cloud claim',()=>{
 const{adapter}=fixture();for(const original of [undefined,true,false])assert.equal(adapter.resolveBrowserDiscovery(original,{inputs,browserCapability:ready}),false);
 assert.equal(adapter.discoverySource.source,'site-local-codex-provider');assert.equal(adapter.discoverySource.officialCloudEntitlement,false);assert.equal(adapter.discoverySource.officialDesktopUsageClaimed,false);
});
test('Free, signed-out, expired and unverified provider states preserve original discovery',()=>{
 for(const patch of [{modelSelection:false},{local:false},{identity:null}]){const{adapter}=fixture(patch);assert.equal(adapter.resolveBrowserDiscovery(undefined,{inputs,browserCapability:ready}),undefined);assert.equal(adapter.resolveBrowserDiscovery(true,{inputs,browserCapability:ready}),true);}
 const{state,adapter}=fixture();state.modelSelection=false;assert.equal(adapter.resolveBrowserDiscovery(true,{inputs,browserCapability:ready}),true);
});
test('native loading/errors/capability denial do not become a visible local Codex destination',()=>{
 const{adapter}=fixture();for(const cap of [{...ready,isLoading:true},{...ready,isError:true},{...ready,isCapable:false},null,{}])assert.equal(adapter.resolveBrowserDiscovery(undefined,{inputs,browserCapability:cap}),undefined);
 for(const pending of [{...inputs,authLoading:true},{...inputs,accountLoading:true}])assert.equal(adapter.resolveBrowserDiscovery(undefined,{inputs:pending,browserCapability:ready}),undefined);
});
test('local discovery requires every native account/user identity field to match',()=>{
 const{adapter}=fixture();for(const key of ['accountId','authenticatedAccountId','userId'])assert.equal(adapter.resolveBrowserDiscovery(true,{inputs:{...inputs,[key]:'different'},browserCapability:ready}),true);
 assert.equal(adapter.resolveBrowserDiscovery(true,{inputs:null,browserCapability:ready}),true);
});
test('a configured key without explicit verified model selection never enables discovery',()=>{
 const adapter=context.createAdapter({appServer:{dispatch(){},subscribe(){return()=>{};},streamCompletion(){}},models:createModelCatalogAdapter(catalog),readSettings:()=>({apiBase:'https://fixture.invalid',apiKey:'fixture-only'}),getIdentity:()=>identity,isLocalSession:()=>true});
 assert.equal(adapter.resolveBrowserDiscovery(true,{inputs,browserCapability:ready}),true);
});
test('the native Q840.c callback ABI is one {get} object and reads the exact browser capability request',()=>{
 const{adapter}=fixture(),original={},scope={},inputsAtom={},browserCapabilityAtom={},reads=[];let callback;
 const atom=adapter.createBrowserDiscoveryAtom(original,{createDerivedAtom:(s,fn)=>{assert.equal(s,scope);callback=fn;return fn;},scope,inputsAtom,browserCapabilityAtom});
 assert.equal(atom,callback);const get=(input,request)=>{reads.push([input,request]);if(input===original)return undefined;if(input===inputsAtom)return inputs;if(input===browserCapabilityAtom){assert.equal(request.name,'codex.browser');return ready;}throw Error('Unexpected atom');};
 assert.equal(callback({get}),false);assert.equal(reads.length,3);
 assert.throws(()=>adapter.createBrowserDiscoveryAtom(original,{}),/Original discovery/);
});

test('browser-origin execution requires a live dispatcher, text provider and actual tool storage',()=>{
 const state={modelSelection:true,local:true},appServer={dispatch(){},subscribe(){return()=>{};},streamCompletion(){},toolExecutor:{execute(){},storage:{},tools:[]}};
 const adapter=context.createAdapter({appServer,models:createModelCatalogAdapter(catalog),readSettings:()=>({apiBase:'https://fixture.invalid',apiKey:'fixture-only'}),getIdentity:()=>identity,isLocalSession:()=>state.local,getCapabilities:()=>({executionSource:'local-app-server',textConversations:true,modelSelection:state.modelSelection,filesystem:true})});
 assert.equal(adapter.supportsBrowserOriginExecution(),true);
 const capability=adapter.createBrowserExecutionCapability(()=>false);assert.equal(capability(),true);
 const host=adapter.getBrowserOriginHost({id:'local',kind:'local',display_name:'Local'});
 assert.equal(host.display_name,'浏览器工作区');assert.equal(host.filesystem_scope,'browser-origin-workspace');assert.equal(host.os_shell_available,false);assert.equal(host.repository_worktree_available,false);
 appServer.toolExecutor.storage=null;assert.equal(capability(),false);appServer.toolExecutor.storage={};
 appServer.dispatch=null;assert.equal(capability(),false);appServer.dispatch=()=>{};
 state.modelSelection=false;assert.equal(capability(),false);
 const original={id:'local',kind:'local',display_name:'Local'};assert.equal(adapter.getBrowserOriginHost(original),original);
 state.modelSelection=true;state.local=false;assert.equal(capability(),false);
});
test('browser-origin host metadata never relabels a remote or unknown host',()=>{
 const {adapter}=fixture();const remote={id:'remote-fixture',kind:'remote',display_name:'Remote'};assert.equal(adapter.getBrowserOriginHost(remote),remote);assert.equal(adapter.getBrowserOriginHost(null),null);
 assert.throws(()=>adapter.createBrowserExecutionCapability(null),/original local execution capability/);
});

function workspaceFixture(patch={}) {
 const state={local:true,modelSelection:true,identity,...patch},reads=[];
 const appServer={dispatch(){},subscribe(){return()=>{};},streamCompletion(){},toolExecutor:{execute(){},tools:[],getWorkspacePrefix:id=>'fixture-account--'+id,storage:{async list(prefix){reads.push(prefix);return[];}}}};
 const adapter=context.createAdapter({appServer,models:createModelCatalogAdapter(catalog),readSettings:()=>({apiBase:'https://fixture.invalid',apiKey:'fixture-only'}),getIdentity:()=>state.identity,isLocalSession:()=>state.local,getCapabilities:()=>({executionSource:'local-app-server',textConversations:true,modelSelection:state.modelSelection})});
 return {adapter,appServer,state,reads};
}
test('the native browser host receives the six-preset config for its own paid site session', () => {
 const { adapter, state } = workspaceFixture();
 const original = {}, scope = {}, inputsAtom = {}, fallback = {};
 const requireOriginal = id => ({
  Q840: { d: (domain, evaluate) => { assert.equal(domain, scope); return evaluate; } },
  OWtl: { a: scope }, Cslg: { n: inputsAtom }, eA5w: { a: () => 'local' },
 }[id]);
 const readConfig = adapter.adaptBrowserSliderConfigAtom(original, requireOriginal);
 const get = atom => atom === inputsAtom ? inputs : fallback;
 const knownPresets = createModelCatalogAdapter(catalog).getSliderModelsConfig();
 assert.deepEqual(readConfig({ hostId: 'local' }, { get }), knownPresets);
 assert.equal(readConfig({ hostId: 'remote' }, { get }), fallback);
 assert.equal(readConfig({ hostId: 'local' }, { get: atom => atom === inputsAtom ? { ...inputs, userId: 'other' } : fallback }), fallback);
 state.modelSelection = false;
 assert.equal(readConfig({ hostId: 'local' }, { get }), fallback);
});
test('the native project catalog exposes only the actual scoped browser mount after storage opens',async()=>{
 const {adapter,reads}=workspaceFixture();
 class OriginalCatalog {async readLocalProjects(){return{};}async readSelection(){return undefined;}}
 const Catalog=adapter.createBrowserProjectCatalog(OriginalCatalog),service=new Catalog();
 assert.ok(service instanceof OriginalCatalog);
 const projects=await service.readLocalProjects(),values=Object.values(projects);assert.equal(values.length,1);
 const project=values[0];assert.equal(project.id,'site-browser-workspace:'+identity.accountId);assert.equal(project.name,'浏览器工作区');assert.deepEqual([...project.rootPaths],['/mnt/data']);assert.equal(project.filesystem_scope,'browser-origin-workspace');assert.ok(Number.isFinite(project.createdAt));assert.equal(project.git,undefined);
 assert.equal(reads[0],'fixture-account--codex-browser-workspace');
 assert.equal(await service.readSelection(),undefined);assert.equal(project.adapter_provider_default,true);
});
test('native existing projects and an explicit selection or clearing are preserved',async()=>{
 const {adapter}=workspaceFixture(),existing={fixture:{id:'fixture',name:'Existing',rootPaths:['/existing'],createdAt:1,updatedAt:1}};
 class OriginalCatalog {constructor(selection){this.selection=selection;}async readLocalProjects(){return existing;}async readSelection(){return this.selection;}}
 const Catalog=adapter.createBrowserProjectCatalog(OriginalCatalog);
 for(const selected of [undefined,null,{type:'local',projectId:'fixture'}]){const service=new Catalog(selected);assert.equal(await service.readLocalProjects(),existing);assert.equal(await service.readSelection(),selected);}
});
test('Free, guests and missing actual storage do not acquire a virtual project',async()=>{
 for(const patch of [{local:false},{modelSelection:false},{identity:null}]){const {adapter,reads}=workspaceFixture(patch);assert.equal(await adapter.getBrowserOriginWorkspaceProject(),null);assert.equal(reads.length,0);}
 const {adapter,appServer}=workspaceFixture();appServer.toolExecutor.storage={};assert.equal(await adapter.getBrowserOriginWorkspaceProject(),null);
});
test('workspace storage errors and account changes remain explicit failures',async()=>{
 const {adapter,appServer,state}=workspaceFixture();appServer.toolExecutor.storage.list=async()=>{throw Error('fixture storage unavailable');};await assert.rejects(adapter.getBrowserOriginWorkspaceProject(),/fixture storage unavailable/);
 appServer.toolExecutor.storage.list=async()=>{state.local=false;return[];};await assert.rejects(adapter.getBrowserOriginWorkspaceProject(),error=>error.name==='AbortError');
});
test('the original execution-host service keeps its class contract and truthfully names the local mount',async()=>{
 const {adapter}=workspaceFixture();class OriginalHosts{constructor(host){this.defaultHost=host;}async getDefaultHost(){return this.defaultHost;}}
 const Hosts=adapter.createBrowserExecutionHosts(OriginalHosts),service=new Hosts({id:'local',kind:'local',display_name:'Codex Cloud'});assert.ok(service instanceof OriginalHosts);assert.equal((await service.getDefaultHost()).display_name,'浏览器工作区');assert.equal(service.defaultHost.os_shell_available,false);
 const remote={id:'fixture-remote',kind:'ssh',display_name:'Remote'};assert.equal(new Hosts(remote).defaultHost,remote);
});

function selectedWorkspace() {
 const id='site-browser-workspace:'+identity.accountId;
 return {inputs,routeKind:'home',productMode:'codex',selection:{type:'local',projectId:id},projects:{[id]:{id,name:'浏览器工作区',rootPaths:['/mnt/data'],createdAt:1,updatedAt:1}}};
}
test('only an explicitly selected exact local mount fills the settled native null route context',()=>{
 const {adapter}=workspaceFixture(),value=selectedWorkspace();assert.equal(adapter.resolveBrowserWorkspaceSelection(null,value),value.selection);
 const existing={type:'remote',projectId:'another'};assert.equal(adapter.resolveBrowserWorkspaceSelection(existing,value),existing);assert.equal(adapter.resolveBrowserWorkspaceSelection(undefined,value),undefined);
});
test('native loading, unselected projects and unrelated routes or directories remain unchanged',()=>{
 const {adapter}=workspaceFixture();
 for(const patch of [{selectionPending:true},{projectsPending:true},{routeKind:'local-thread'},{selection:{type:'remote',projectId:'other'}},{selection:{type:'local',projectId:'other'}},{inputs:{...inputs,authLoading:true}},{inputs:{...inputs,userId:'another'}}])assert.equal(adapter.resolveBrowserWorkspaceSelection(null,{...selectedWorkspace(),...patch}),null);
 const value=selectedWorkspace();value.projects[value.selection.projectId].rootPaths=['/other'];assert.equal(adapter.resolveBrowserWorkspaceSelection(null,value),null);
 value.projects[value.selection.projectId].rootPaths=['/mnt/data','/other'];assert.equal(adapter.resolveBrowserWorkspaceSelection(null,value),null);
});
test('Free, logout and absent real filesystem never fill a native project context',()=>{
 for(const patch of [{modelSelection:false},{local:false},{identity:null}]){const {adapter}=workspaceFixture(patch);assert.equal(adapter.resolveBrowserWorkspaceSelection(null,selectedWorkspace()),null);}
 const {adapter,appServer}=workspaceFixture();appServer.toolExecutor.storage=null;assert.equal(adapter.resolveBrowserWorkspaceSelection(null,selectedWorkspace()),null);
});
test('the native project-context atom retains the original RouteScope and one-object Q840 ABI',()=>{
 const {adapter}=workspaceFixture(),originalAtom={},routeScope={},inputsAtom={},productModeAtom={},query={},keys={SELECTED_PROJECT:'selected',LOCAL_PROJECTS:'projects'},value=selectedWorkspace();let callback;
 const requireOriginal=id=>({'Q840':{c:(scope,fn)=>{assert.equal(scope,routeScope);callback=fn;return fn;}},'tSEg':{a:routeScope},'PFP1':{c:(_get,key)=>key==='selected'?value.selection:value.projects,d:query},'HI9o':{a:keys},'Cslg':{n:inputsAtom},'pasN':{a:productModeAtom}}[id]);
 const atom=adapter.adaptBrowserWorkspaceSelectionAtom(originalAtom,requireOriginal);assert.equal(atom,callback);
 assert.equal(callback({scope:{value:{routeKind:'home'}},get:(input,key)=>input===originalAtom?null:input===inputsAtom?inputs:input===productModeAtom?'codex':input===query?{isPending:false,isError:false,data:{value:key==='selected'?value.selection:value.projects}}:assert.fail('Unknown atom')}),value.selection);
});

test('the source HSUP parameterized resolver receives a real selected mount without changing explicit caller inputs',()=>{
 const {adapter,state}=workspaceFixture(),originalAtom={},composerScope={},routeScope={},inputsAtom={},productModeAtom={},query={},keys={SELECTED_PROJECT:'selected',LOCAL_PROJECTS:'projects'},value=selectedWorkspace();let resolveRoute,resolveWorkspace;
 const routeKind={};const requireOriginal=id=>({'Q840':{c:(scope,fn)=>{assert.equal(scope,routeScope);resolveRoute=fn;return routeKind;},d:(scope,fn)=>{assert.equal(scope,composerScope);resolveWorkspace=fn;return fn;}},'tSEg':{a:routeScope},'Sd8U':{a:composerScope},'PFP1':{c:(_get,key)=>key==='selected'?value.selection:value.projects,d:query},'HI9o':{a:keys},'Cslg':{n:inputsAtom},'pasN':{a:productModeAtom}}[id]);
 adapter.adaptBrowserWorkspaceResolverAtom(originalAtom,requireOriginal);assert.equal(resolveRoute({scope:{value:{routeKind:'home'}}}),'home');
 const forwarded=[],get=(atom,param)=>{if(atom===inputsAtom)return inputs;if(atom===productModeAtom)return'codex';if(atom===query)return{isPending:false,isError:false,data:{value:param==='selected'?value.selection:value.projects}};if(atom===routeKind)return'home';if(atom===originalAtom){forwarded.push(param);return param;}throw Error('Unknown atom');};
 const request={selectedProject:undefined,useScopedProject:false,defaultCwd:undefined,existingWorkspaceRoot:null},scope={value:{kind:'new'}};
 const result=resolveWorkspace(request,{get,scope});assert.notEqual(result,request);assert.equal(result.selectedProject,value.selection);assert.equal(result.useScopedProject,true);assert.equal(request.useScopedProject,false);assert.equal(resolveWorkspace(request,{get,scope}),result);
 for(const request of [{selectedProject:{type:'local',projectId:'other'}},{defaultCwd:'/other'},{existingWorkspaceRoot:'/other'},{homeRemoteProject:{id:'remote'}},{useScopedProject:true,selectedProject:{type:'local',projectId:'other'}}])assert.equal(resolveWorkspace(request,{get,scope}),request);
 for(const optional of [{selectedProject:null,defaultCwd:null},{selectedProject:value.selection,useScopedProject:false},{useScopedProject:true}]){const resolved=resolveWorkspace(optional,{get,scope});assert.equal(resolved.useScopedProject,true);assert.equal(resolved.selectedProject,value.selection);}
 const selectedId=value.selection.projectId;value.selection=null;const cleared={selectedProject:null};assert.equal(resolveWorkspace(cleared,{get,scope}).selectedProject.projectId,selectedId);value.selection=selectedWorkspace().selection;
 assert.equal(resolveWorkspace(request,{get,scope:{value:{kind:'local'}}}),request);
 state.modelSelection=false;assert.equal(resolveWorkspace(request,{get,scope}),request);
});

test('native request context identifies only verified non-ephemeral new Codex workspace tasks',()=>{
 const {adapter,state}=workspaceFixture(),params={cwd:'/mnt/data',model:'gpt-6.1-sol'};
 assert.equal(adapter.getBrowserRequestContext('thread/start',params,{sidebarProductMode:'codex'}).productMode,'codex');
 assert.equal(adapter.getBrowserRequestContext('thread/start',{model:params.model},{sidebarProductMode:'codex'}).productMode,'codex');
 assert.equal(adapter.getBrowserRequestContext('thread/list',{}, {sidebarProductMode:'codex'}).productMode,'codex');
 for(const method of ['turn/start','thread/resume','thread/read','model/list'])assert.equal(Object.keys(adapter.getBrowserRequestContext(method,params,{sidebarProductMode:'codex'})).length,0);
 for(const patch of [{ephemeral:true},{conversationOrigin:'tpp'},{cwd:'/other'}])assert.equal(Object.keys(adapter.getBrowserRequestContext('thread/start',{...params,...patch},{sidebarProductMode:'codex'})).length,0);
 assert.equal(Object.keys(adapter.getBrowserRequestContext('thread/start',params,{sidebarProductMode:'work'})).length,0);
 state.modelSelection=false;assert.equal(Object.keys(adapter.getBrowserRequestContext('thread/start',params,{sidebarProductMode:'codex'})).length,0);
});
test('the scoped socket facade keeps one real server, preserves Work/resume/ephemeral calls and tags new Codex only',()=>{
 const calls=[],server={dispatch(method,params){calls.push({method,params});return{result:{fixture:true}};},subscribe(listener){calls.push({subscribe:listener});return listener;},streamCompletion(){},toolExecutor:{execute(){},tools:[],storage:{}}};
 const adapter=context.createAdapter({appServer:server,models:createModelCatalogAdapter(catalog),readSettings:()=>({apiBase:'https://fixture.invalid',apiKey:'fixture-only'}),getIdentity:()=>identity,isLocalSession:()=>true,getCapabilities:()=>({executionSource:'local-app-server',textConversations:true,modelSelection:true})});
 const facade=adapter.createRpcFacade({getRequestContext:(method,params)=>adapter.getBrowserRequestContext(method,params,{sidebarProductMode:'codex'})});
 const request={model:'gpt-6.1-sol',ephemeral:false};facade.dispatch('thread/start',request);
 const tagged=calls.at(-1).params;assert.equal(tagged.conversationOrigin,'codex');assert.equal(tagged.responsesapiClientMetadata.localProductSurface,'codex');assert.match(tagged.developerInstructions,/browser storage/);assert.equal(request.conversationOrigin,undefined);
 assert.equal(tagged.cwd,'/mnt/data');assert.equal(tagged.executionSurface,'codex');
 facade.dispatch('thread/list',{});assert.equal(calls.at(-1).params.conversationSurface,'codex');
 for(const [method,params] of [['turn/start',{threadId:'old-work',model:'gpt-6-luna'}],['thread/resume',{threadId:'old-work',cwd:'/mnt/data'}],['thread/start',{...request,conversationOrigin:'tpp'}],['thread/start',{...request,ephemeral:true}]]){facade.dispatch(method,params);assert.equal(calls.at(-1).params,params);}
 const listener=()=>{};assert.equal(facade.subscribe(listener),listener);assert.equal(calls.at(-1).subscribe,listener);
});

test('the provider default preserves explicit clearing without opening storage, and refuses different or multiple roots',async()=>{
 const {adapter,appServer,reads}=workspaceFixture(),id='site-browser-workspace:'+identity.accountId;
 class Cleared {async readLocalProjects(){throw Error('Must not query cleared selection');}async readSelection(){return null;}}
 assert.equal(await new (adapter.createBrowserProjectCatalog(Cleared))().readSelection(),null);assert.equal(reads.length,0);
 for(const projects of [{[id]:{id,rootPaths:['/different']}},{[id]:{id,rootPaths:['/mnt/data']},other:{id:'other',rootPaths:['/other']}}]){
  class Existing {async readLocalProjects(){return projects;}async readSelection(){return undefined;}}
  assert.equal(await new (adapter.createBrowserProjectCatalog(Existing))().readSelection(),undefined);
 }
 appServer.toolExecutor.storage.list=async()=>{throw Error('fixture real storage failure');};
 class Empty {async readLocalProjects(){return{};}async readSelection(){return undefined;}}
 assert.equal(await new (adapter.createBrowserProjectCatalog(Empty))().readSelection(),undefined);
 await assert.rejects(adapter.getBrowserOriginWorkspaceProject(),/fixture real storage failure/);
});
test('Free, guests and expired local identities never receive an initial provider default selection',async()=>{
 class Empty {async readLocalProjects(){return{};}async readSelection(){return undefined;}}
 for(const patch of [{modelSelection:false},{local:false},{identity:null}]){const {adapter,reads}=workspaceFixture(patch);assert.equal(await new (adapter.createBrowserProjectCatalog(Empty))().readSelection(),undefined);assert.equal(reads.length,0);}
});


test('the implicit provider default is scoped to Codex and never selects a global Work project',()=>{
 const {adapter}=workspaceFixture(),value={...selectedWorkspace(),selection:undefined};
 const selected=adapter.resolveBrowserWorkspaceSelection(null,value);
 assert.equal(selected.type,'local');assert.equal(selected.projectId,Object.keys(value.projects)[0]);
 for(const productMode of ['chatgpt','work','chat',undefined,null])assert.equal(adapter.resolveBrowserWorkspaceSelection(null,{...value,productMode}),null);
 for(const patch of [{selectionPending:true},{projectsPending:true},{selectionError:true},{projectsError:true}])assert.equal(adapter.resolveBrowserWorkspaceSelection(null,{...value,...patch}),null);
 const id=Object.keys(value.projects)[0];
 assert.equal(adapter.resolveBrowserWorkspaceSelection(null,{...value,projects:{...value.projects,other:{id:'other',rootPaths:['/elsewhere']}}}),null);
 assert.equal(adapter.resolveBrowserWorkspaceSelection(null,{...value,projects:{[id]:{...value.projects[id],rootPaths:['/elsewhere']}}}),null);
});
test('an empty Codex project selection can use the ready sole browser mount',()=>{
 const {adapter}=workspaceFixture(),original={},routeScope={},inputsAtom={},modeAtom={},query={},keys={SELECTED_PROJECT:'selected',LOCAL_PROJECTS:'projects'},value=selectedWorkspace();
 let callback,productMode='codex',rawSelection=null;
 const requireOriginal=id=>({'Q840':{c:(scope,fn)=>{assert.equal(scope,routeScope);callback=fn;return fn;}},'tSEg':{a:routeScope},'PFP1':{c:(_get,key)=>key==='selected'?(rawSelection??undefined):value.projects,d:query},'HI9o':{a:keys},'Cslg':{n:inputsAtom},'pasN':{a:modeAtom}}[id]);
 adapter.adaptBrowserWorkspaceSelectionAtom(original,requireOriginal);
 const get=(atom,key)=>atom===original?null:atom===inputsAtom?inputs:atom===modeAtom?productMode:atom===query?{isPending:false,isError:false,data:{value:key==='selected'?rawSelection:value.projects}}:assert.fail('Unexpected atom');
 const scope={value:{routeKind:'home'}};
 assert.equal(callback({get,scope}).projectId,Object.keys(value.projects)[0]);
 rawSelection=undefined;assert.equal(callback({get,scope}).projectId,Object.keys(value.projects)[0]);
 productMode='chatgpt';assert.equal(callback({get,scope}),null);
 productMode='codex';rawSelection={type:'local',projectId:'user-chosen'};assert.equal(callback({get,scope}),null);
});
