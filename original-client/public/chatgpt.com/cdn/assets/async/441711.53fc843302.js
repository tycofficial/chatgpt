export const __rspack_esm_ids=[441711];export const __webpack_modules__={N8b3(a,b,c){c.d(b,{a:()=>A,b:()=>B,c:()=>C});var d=c("Q840"),e=c("PFjh"),f=c("E8Sp"),g=c("Cslg"),h=c("SGsN"),i=c("svjy"),j=c("mNPx"),k=c("e1xH"),l=c("Ih0z"),m=c("BkKO"),n=c("hlkZ"),o=c("yGJW"),p=c("OWtl"),q=c("HFSu"),r=c("eShZ"),s=c("NRR1"),t=c("jGsJ"),u=c("OoIX"),v=c("yZpl"),w=c("HNZf"),x=c("D550"),y=c("PzpM");let z=(0,d.v)(p.a,a=>void 0),A=(0,d.d)(p.a,(a,b)=>{let{get:c}=b,d=c(z,a);return d?.accountId===c(n.spaceAccountId$)&&d?.userId===c(g.k)?d:void 0}),B=(0,d.c)(p.a,a=>{let{get:b}=a;return b(y.e).flatMap(a=>{let c=b(A,a.localPageId);return c?.response!=null&&"error"!==c.status?[]:[{id:a.localPageId,name:a.name,title:a.name,backingType:a.backingType,serverSpaceId:a.space?.spaceId,status:c?.status??"error"}]})});function C(a,b){let d,p,{name:B,createSpace:C,invitations:D=[],appearance:E,resume:F}=b,G=a.get(n.spaceAccountId$),H=a.get(g.k),I=a.get(g.j);if(null==G)throw Error("space_account_unavailable");if(null!=F&&(F.accountId!==G||F.userId!==H||null==F.space))throw Error("space_setup_unavailable");let J=a.get(g.n).accountUserId,K=F?.localPageId??`local-page-${crypto.randomUUID()}`;null==F&&(0,y.d)(a,{accountId:G,userId:H,localPageId:K,name:B,backingType:"drive",rootInitialization:"server",appearance:E,invitations:D.map(a=>({...a,status:"pending"}))});let L=(0,x.a)((0,e.c)(a),performance.now(),"space",{surface:"browser",emit:b=>(0,t.a)(a,b)}),M=F?.space,N=!1,O=new AbortController,P=()=>a.get(y.e).find(a=>a.localPageId===K),Q=b=>{let c={localPageId:K,accountId:G,userId:H,name:B,status:b,response:d,metrics:L,retry:R};a.set(z,K,c),null!=d&&a.set(z,d.id,c)},R=()=>{if(null!=p)return p;if(N||O.signal.aborted||null==P())return Promise.reject(new DOMException("Space creation cancelled","AbortError"));let b=(0,n.watchSpaceAccount)(a,G,H,J,I),e=AbortSignal.any([O.signal,b.signal]),t=a.watch(a=>{let{get:b}=a;b(y.e).some(a=>a.localPageId===K)||O.abort()}),x=async()=>{let b;e.throwIfAborted();try{let b;null==M?(b=await C(e),L.creationRequestSucceeded()):b=await a.get(n.createSpaceMutation$).mutateAsync({requestBody:{name:B},existingSpace:M,signal:e}),e.throwIfAborted(),d=b,M={spaceId:b.id,rootPageId:b.root_page_id},L.savedIdentity()}catch(c){if(e.throwIfAborted(),null!=M&&c instanceof r.FetchError&&(404===c.status&&"space_not_found"===c.errorCode||410===c.status)&&await async function(a,b){let c,d=new Set;for(;;){b.throwIfAborted();let e=await q.CodexRequest.safeGet("/spaces/v2",{parameters:{query:{status:"archived",limit:50,cursor:c}},signal:b});if(b.throwIfAborted(),e.items.some(b=>b.id===a.spaceId&&b.root_page_id===a.rootPageId&&null!=b.deleted_at))return!0;if(null==(c=e.next_cursor??void 0)||d.has(c))return!1;d.add(c)}}(M,e)){e.throwIfAborted(),t(),L.cancel("creation_unavailable"),(0,n.evictCachedDriveSpacePages)(a,M.spaceId,G),(0,y.c)(a,K),a.set(z,K,void 0),a.get(A,M.spaceId)?.localPageId===K&&a.set(z,M.spaceId,void 0),a.get(h.f).info(a.get(i.a).formatMessage({id:"space.teamHome.setupUnavailable",defaultMessage:"This space is no longer available"}));return}M=(0,n.pendingSpaceInitialization)(c)??M;let b=P();throw null!=M?(L.savedIdentity(),null!=b&&(0,y.f)(a,{...b,space:M})):c instanceof r.FetchError&&c.status>=400&&c.status<500&&![408,499].includes(c.status)||(N=!0),L.fail((0,u.d)(c)),c}let f=P(),j=null!=f&&!0!==f.rootInitialized&&"server"!==f.rootInitialization;null!=f&&(0,y.f)(a,{...f,space:M,rootInitialized:!j}),(0,n.cacheCreatedSpace)(a,G,d),a.query.setData(n.spaceQuery$,d.id,d),j||L.rootInitialized(d.root_page_id),await a.when(a=>{let{get:b}=a;return e.aborted||!b(y.e).some(a=>a.localPageId===K)||b(n.spaceAccountId$)!==G||b(g.k)!==H||void 0!==J&&b(s.a)!==J||b(s.d)!==I||!b(k.pagesEnabled$)||b(m.b)?.some(a=>a.id===d?.id)===!0}),e.throwIfAborted(),Q("creating");let o=P()?.appearance,p=(0,l.a)(o);if(j||null!=p){let{completeSpaceRootSetup:b}=await Promise.all([c.e(753405),c.e(970791),c.e(708398)]).then(c.bind(c,"PluF"));e.throwIfAborted();let f=await b(a,d,p??null,j,e);e.throwIfAborted(),d={...a.query.getData(n.spaceQuery$,d.id)??d,symbol:f,can_edit_appearance:null==f&&d.can_edit_appearance},a.query.setData(n.spaceQuery$,d.id,d),(0,n.cacheCreatedSpace)(a,G,d);let g=P();null!=g&&(0,y.f)(a,{...g,rootInitialized:!0}),j&&L.rootInitialized(d.root_page_id)}try{if(void 0===p&&null!=o){if(null!=d.symbol||!0!==d.can_edit_appearance)throw Error("space_legacy_appearance_unavailable");let b=await q.CodexRequest.safePatch("/spaces/v2/{space_id}/appearance",{parameters:{path:{space_id:d.id}},requestBody:o,signal:e});e.throwIfAborted(),d={...a.query.getData(n.spaceQuery$,d.id)??d,appearance:b},a.query.setData(n.spaceQuery$,d.id,d),(0,n.cacheCreatedSpace)(a,G,d)}let b=P();null!=b&&(0,y.f)(a,{...b,appearance:void 0})}catch(a){e.throwIfAborted(),b={error:a}}let x=P()?.invitations??[],D=x.filter(a=>"shared"!==a.status);if(D.length>0){let b=await async function(a,b,c,d,e){if(d.throwIfAborted(),0===c.length)return[];let f={type:"space",id:b},h=c.map(a=>{let{recipient:b,label:c,secondaryLabel:d,roleId:e}=a;return{action:"invite",target:f,recipient:b,roleId:e,invitee:{id:(0,w.d)(b),label:c,secondaryLabel:d}}}),i=new Map,j=new Set,k=a=>{if(d.aborted||j.has(a))return;j.add(a);let b=h.indexOf(a);e?.(b,i.get(a)??c[b].recipient)},l=[];if(await a.queryClient.getMutationCache().build(a.queryClient,{mutationKey:["space","save-library-sharing",a.get(g.k),a.get(n.spaceAccountId$)],networkMode:"always",mutationFn:async b=>{let{changes:c}=b;d.throwIfAborted(),await (0,w.j)(a,c,void 0,void 0,d,(a,b)=>i.set(a,b.recipient),(a,b)=>{l.push(b.then(()=>k(a),()=>void 0))},(a,b)=>{i.set(a,b.recipient),k(a)})}}).execute({changes:h}),await (0,v.pf)(Promise.all(l),d),d.throwIfAborted(),j.size<h.length)try{let b=await (0,w.c)(a,f,d,!0);d.throwIfAborted(),(0,w.b)(b)&&h.forEach((a,d)=>{let e=i.get(a)??c[d].recipient;b.shares.some(a=>(0,w.g)(a,e)&&a.role_id===c[d].roleId)&&k(a)})}catch{d.throwIfAborted()}return c.map((a,b)=>{let c=i.get(h[b])??a.recipient;return{...a,recipient:c,status:j.has(h[b])?"shared":"failed"}})}(a,d.id,D,e,(b,c)=>{if(e.aborted)return;let d=P();if(null!=d){let e=x.indexOf(D[b]);(0,y.f)(a,{...d,invitations:d.invitations.map((a,b)=>b===e?{...a,recipient:c,status:"shared"}:a)})}});e.throwIfAborted();let c=P();if(null!=c&&(0,y.f)(a,{...c,invitations:[...x.filter(a=>"shared"===a.status),...b]}),b.some(a=>"failed"===a.status))throw Error("space_creation_invitations_incomplete")}if(null!=b)throw b.error;t(),(0,y.b)(a,K),Q("created")};return Q("creating"),p=Promise.resolve().then(()=>null==navigator.locks?x():navigator.locks.request(`space-setup:${JSON.stringify([G,H,K])}`,{signal:e},x)).catch(c=>{if(e.aborted)throw O.abort(),a.set(z,K,void 0),null!=d&&a.set(z,d.id,void 0),L.cancel(b.signal.aborted?"account_changed":"explicit_cancel"),c;throw N?a.set(z,K,void 0):Q("error"),(0,u.d)(c)||(0,j.d)(a.get(o.c),"pages.space.create",c),L.fail(),(()=>{let{pathname:b,search:c}=a.get(f.b);a.get(n.spaceAccountId$)===G&&a.get(g.k)===H&&("/spaces/new"!==b||new URLSearchParams(c).get("creation")!==K)&&a.get(h.f).warning(a.get(i.a).formatMessage({id:"codex.space.sidebar.spaceSetupNeedsAttention",defaultMessage:"Space setup needs attention"}))})(),c}).finally(()=>{t(),b.stop(),p=void 0})};return R().catch(()=>{}),K}},Kw4a(a,b,c){var d=c("Q840"),e=c("OFP1"),f=c("QufO"),g=c("OWtl"),h=c("OMIV"),i=c("e1xH");let j=(0,d.c)(g.a,a=>{let{get:b}=a;return b(f.b)&&b(h.e,"2612111346")}),k=(0,d.d)(g.a,(a,b)=>{let{get:c}=b;return"grid"===a||"create"===a||"onboarding"===a&&c(f.b)?"template":"default"}),l=(0,d.c)(g.a,a=>{let{get:b}=a,c=b(e.w).status;return b(i.pagesEnabled$)&&("allowed"===c||"denied"===c)}),m=(0,d.c)(g.a,a=>{let{get:b}=a;return b(l)&&b(h.e,"183803860")}),n=(0,d.c)(g.a,a=>{let{get:b}=a;return b(l)&&b(h.e,"3531012613")}),o=(0,d.c)(g.a,a=>{let{get:b}=a;return b(m)||b(n)});c.d(b,{},{a:n,b:j,c:o,d:k,e:m})},jG6n(a,b,c){var d=c("Q840"),e=c("lAQI"),f=c("rHrT"),g=c("fXhT"),h=c("OWtl"),i=c("J9bg"),j=c("Kw4a");let k=["to-do-list","project-tracker"],l=(0,d.c)(h.a,a=>{let{get:b}=a;return b(j.e)?b(i.a,"4051280260"):void 0}),m=(0,d.c)(h.a,a=>{let{get:b}=a;return b(j.a)?b(i.a,"4051280260"):void 0}),n=(0,d.c)(h.a,a=>{let{get:b}=a;return b(j.c)?b(i.b,"4051280260"):void 0}),o=e.F({submitLabel:e.L().trim().min(1).optional(),preparingLabel:e.L().trim().min(1).optional(),freeformPlaceholder:e.L().trim().min(1).optional(),questions:e.g(e.F({question:e.L().trim().min(1),answerLabel:e.L().trim().min(1),isOther:e.j().optional(),options:e.g(e.F({id:e.L().trim().min(1),value:e.L().trim().min(1)})).refine(a=>new Set(a.map(a=>{let{id:b}=a;return b})).size===a.length,"Each option ID in a question must be unique")})).min(1)}),p=e.F({id:e.L().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:e.L().trim().min(1),prompt:e.L().trim().min(1),prefillPrompt:e.L().trim().min(1),gridPreviewMarkdown:e.L().trim().min(1).optional(),previewMarkdown:e.L().trim().min(1).optional(),previewDocument:e.g(e.F({kind:e.z("markdown"),markdown:e.L().trim().min(1),layout:g.c.optional()})).min(1).optional(),setupQuestion:e.L().trim().min(1).nullish(),followUp:o.nullish()}),q=e.g(p.partial({title:!0,prompt:!0,prefillPrompt:!0,previewMarkdown:!0})),r=e.g(e.L()).min(4).max(10).refine(a=>new Set(a).size===a.length&&k.every(b=>a.includes(b))),s=e.F({templates:q.optional(),templatesByLocale:e.J(e.L().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/),q).optional()});c.d(b,{},{a:m,b:function(a,b){let c=s.safeParse(b);if(!c.success)return;if(c.data.templates?.length===0)return[];let d=(0,f.h)(a)??"en",e=d.split("-")[0],g=c.data.templatesByLocale?.[d]??c.data.templatesByLocale?.[e]??("en"===e?c.data.templates:void 0);if(null!=g&&new Set(g.map(a=>{let{id:b}=a;return b})).size===g.length)return g},c:n,d:l,e:r,f:p,g:q})},U6Ok(a,b,c){c.d(b,{a:()=>h});var d=c("xWaH"),e=c("Qgfj"),f=c("jG6n");let g=f.f.required({previewDocument:!0}).array();function h(a,b){let c=(0,f.b)(a.locale,b);if(c?.length===0)return[];let d={kind:"icon",value:"book",color:"black"},e=[{id:"to-do-list",symbol:{kind:"icon",value:"logs",color:"green"},title:a.formatMessage(j.todo),prompt:a.formatMessage(j.todoPrompt),prefillPrompt:a.formatMessage(j.todoPrefillPrompt),gridPreviewMarkdown:`### ${a.formatMessage({id:"space.gettingStarted.todoPreviewToday",defaultMessage:"Today"})}

- [ ]
- [ ]
- [ ]`,previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.todo.preview",defaultMessage:`## Today

### Top priorities

- [ ] Run propulsion test

- [ ] Verify course calculations

- [ ] Inspect fuel tanks

### If time allows

- [ ] Inspect radiation shields

- [ ] Test communication systems

- [ ] Write status report`})}]},{id:"project-tracker",symbol:{kind:"icon",value:"bar-chart",color:"blue"},title:a.formatMessage(j.projectTracker),prompt:a.formatMessage(j.projectTrackerPrompt),prefillPrompt:a.formatMessage(j.projectTrackerPrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.attentionHeading",defaultMessage:"## \u{1F534} Needs immediate attention"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.attention",defaultMessage:"- Communication systems test for launch"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.milestonesHeading",defaultMessage:"## \u26F0\uFE0F Milestones"})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.milestonesCheckboxes",defaultMessage:`| Milestone | Status |
| - | - |
| '<ul><li data-checked="false"><p>'Project brief'</p></li></ul>' | Complete |
| '<ul><li data-checked="false"><p>'Prototype review'</p></li></ul>' | In progress |
| '<ul><li data-checked="false"><p>'Launch readiness'</p></li></ul>' | Upcoming |`},{})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.tasksHeading",defaultMessage:"## \u2705 Tasks"})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.tasksCheckboxes",defaultMessage:`| Task | Owner | Status |
| - | - | - |
| '<ul><li data-checked="false"><p>'Confirm scope'</p></li></ul>' | Product | Done |
| '<ul><li data-checked="false"><p>'Review designs'</p></li></ul>' | Design | In progress |
| '<ul><li data-checked="false"><p>'Test the core flow'</p></li></ul>' | Engineering | Next |
| '<ul><li data-checked="false"><p>'Prepare launch notes'</p></li></ul>' | Marketing | Next |`},{})}]},{id:"weekly-update",symbol:{kind:"icon",value:"writing",color:"pink"},title:a.formatMessage(j.weeklyUpdate),prompt:a.formatMessage(j.weeklyUpdatePrompt),prefillPrompt:a.formatMessage(j.weeklyUpdatePrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weeklyUpdate.preview",defaultMessage:`## \u{2728} Highlights

- Progress made

## \u{261D}\u{FE0F} Needs attention

- Blockers and decisions needing input

## \u{25B6}\u{FE0F} Next week

- Upcoming milestones and confirmed commitments

## \u{1F517} Sources

- Links to sources`})}]},{id:"feedback-tracker",symbol:{kind:"icon",value:"edit",color:"red"},title:a.formatMessage(j.feedback),prompt:a.formatMessage(j.feedbackPrompt),prefillPrompt:a.formatMessage(j.feedbackPrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.themesHeading",defaultMessage:"## \u{1F50E} Top themes"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.onboardingTheme",defaultMessage:"1. Make onboarding easier to follow"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.navigationTheme",defaultMessage:"2. Help people find the right resource"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.sharingTheme",defaultMessage:"3. Clarify what happens after sharing"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.registerHeading",defaultMessage:"## \u{1F5C2}\uFE0F Feedback register"})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.register",defaultMessage:`| Theme | Source | Next step |
| - | - | - |
| Onboarding | Research notes | Review the first-run flow |
| Navigation | Team channel | Group related resources |
| Sharing | Support email | Clarify confirmation copy |`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.summaryHeading",defaultMessage:"## \u{1F4DD} Summary"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.summary",defaultMessage:"People need clearer guidance at key moments. Start with onboarding, then review navigation and sharing."})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.followupsHeading",defaultMessage:"## \u25B6\uFE0F Follow-ups"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.followups",defaultMessage:"- Schedule user interviews for next week"})}]},{id:"release-notes",symbol:d,title:a.formatMessage(j.releaseNotes),prompt:a.formatMessage(j.releaseNotesPrompt),prefillPrompt:a.formatMessage(j.releaseNotesPrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.releaseNotes.preview",defaultMessage:`## \u{1F195} New

- New capabilities and who can use them

## \u{1F3C6} Improvements

- Changes to existing workflows

## \u{1F6E0}\u{FE0F} Fixes

- Resolved issues and their impact

## \u{1F310} Availability

- Supported platforms, rollout status, and known limitations.

## \u{1F517} Sources

- Links to sources`})}]},{id:"project-home",symbol:d,title:a.formatMessage(j.projectHome),prompt:a.formatMessage(j.projectHomePrompt),prefillPrompt:a.formatMessage(j.projectHomePrefillPrompt),setupQuestion:a.formatMessage({id:"space.pageTemplates.projectHome.question",defaultMessage:"Which project is this for, and which sources should I use?"}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectHome.preview.intro",defaultMessage:`One place for the team, the plan, and what comes next.

## Overview
Make the next product launch simple, coordinated, and easy to follow.

## Team`})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.projectHome.preview.team",defaultMessage:`| Responsibility | Team |
| --- | --- |
| Project lead | Product |
| Experience | Design |
| Delivery | Engineering |`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectHome.preview.ending",defaultMessage:`## Milestones
- Align on the plan
- Review the first prototype
- Prepare the launch

## Key resources
- Project brief and goals
- Decisions from the team channel
- Research notes and launch checklist

## Latest update
The brief is ready for review. Next up: confirm owners and milestones.`})}]},{id:"faq",symbol:d,title:a.formatMessage(j.faq),prompt:a.formatMessage(j.faqPrompt),prefillPrompt:a.formatMessage(j.faqPrefillPrompt),setupQuestion:a.formatMessage({id:"space.pageTemplates.faq.question",defaultMessage:"What topic and audience is this FAQ for, and which sources should I use?"}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.faq.preview",defaultMessage:`Shared answers, grounded in the team's knowledge.

## Getting started
### Where should I start?
Read the project brief for goals, scope, and the people involved.

### Where can I find the latest plan?
The Project Home brings together milestones, resources, and recent decisions.

## Working together
### How do I share feedback?
Add the source discussion and a clear next step to the feedback tracker.

### How are decisions recorded?
Keep the decision, its owner, and supporting context together.

## Open questions
- Who owns the next review?
- Which resources need an update?

## Sources
Project notes, team discussions, and approved guidance.`})}]}],h=()=>e.filter(a=>{let{id:b}=a;return"project-home"!==b&&"faq"!==b}).map(a=>({...a,...i(a.previewDocument)}));if(null==c)return h();let k=g.safeParse(c.map(b=>{let c=e.find(a=>{let{id:c}=a;return c===b.id})??function(a,b){switch(b){case"feature-backlog":return{id:b,title:a.formatMessage({id:"space.pageTemplates.feature-backlog.title",defaultMessage:"Feature backlog"}),prompt:a.formatMessage({id:"space.pageTemplates.feature-backlog.prompt",defaultMessage:"Turn ideas and requests for my product into a feature backlog. Group similar requests, describe the user need, link supporting feedback, and suggest priorities and next decisions. Ask which product if it\u2019s unclear; a few ideas are enough to start. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Update this Page and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.feature-backlog.prefillPrompt",defaultMessage:"Organize a feature backlog for my product, grouping requests by user need and suggesting priorities and next decisions. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feature-backlog.preview.1",defaultMessage:`## Ideas and requests
| Idea | User problem | Evidence | Next decision |
| --- | --- | --- | --- |

## Priorities to discuss
Compare impact, effort, and dependencies where known.

## Open questions
Track what needs research or a product decision.`})}]};case"learning-plan":return{id:b,title:a.formatMessage({id:"space.pageTemplates.learning-plan.title",defaultMessage:"Learning plan"}),prompt:a.formatMessage({id:"space.pageTemplates.learning-plan.prompt",defaultMessage:"Help me make a plan for something I want to learn. Start with what I already know and what I want to be able to do. Break it into manageable steps with useful resources, practice, and a weekly routine. Include space for notes and progress checks. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.learning-plan.prefillPrompt",defaultMessage:"Make a learning plan with a clear goal, useful resources, practice, and a weekly routine. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.learning-plan.preview.overview",defaultMessage:`**Time:** Two 30-minute sessions a week

## \u{1F3AF} Outcome

Locate five major lunar features on a map and explain the difference between a crater and a dark plain in ordinary language.

## \u{1F9E9} Starting point

I can recognize the Moon\u{2019}s broad light and dark areas. I want to connect those patterns with named places.

## \u{1F5FA}\u{FE0F} Learning path`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.learning-plan.preview.7",defaultMessage:`| Step | Resource | Practice |
| --- | --- | --- |
| Get oriented | NASA Moon overview | Label five features on a sketch |
| Look closely | A library lunar atlas | Compare two images of one region |
| Explain it | My own notes | Write a 100-word visitor caption |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.learning-plan.preview.practiceAndReview",defaultMessage:`## \u{1F4C5} Weekly rhythm

- [ ] Tuesday: read one short section and draw a sketch.

- [ ] Sunday: revisit the sketch without looking at the labels.

- [ ] Explain one feature to a friend.

## \u{1F4DD} Notebook

**Observation:** The same region can look quite different as shadows change.

**Question:** Which lighting makes a crater\u{2019}s shape easiest to see?

## \u{1F501} Progress check

I can locate three of the five features without the atlas. Compare those three under different lighting, then add two more and repeat the unlabeled sketch.

## \u{1F517} Start here

[NASA Moon overview](https://science.nasa.gov/moon/)`})}]};case"weekly-planner":return{id:b,title:a.formatMessage({id:"space.pageTemplates.weekly-planner.title",defaultMessage:"Weekly planner"}),prompt:a.formatMessage({id:"space.pageTemplates.weekly-planner.prompt",defaultMessage:"Plan my week around the priorities and commitments I\u2019ve shared. Create a short priority list and a realistic day-by-day plan with suggested focus time and room for rest. Ask what matters most this week if you need a starting point. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.weekly-planner.prefillPrompt",defaultMessage:"Make a realistic weekly plan around my priorities and commitments, with suggested focus time and room for rest. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weekly-planner.preview.priorities",defaultMessage:`## \u{1F3AF} Priorities

- [ ] Finish the lunar exhibit captions.

- [ ] Confirm volunteer roles for Friday.

- [ ] Leave one evening free of commitments.

## \u{1F5D3}\u{FE0F} Week at a glance`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weekly-planner.preview.6",defaultMessage:`| Day | Main focus | Commitment |
| --- | --- | --- |
| Monday | Caption edits | Review with Leo, 14:00 |
| Tuesday | Final captions and handout draft | Approve the full print set |
| Wednesday | Send approved files to the print shop | Volunteer call, 18:00 |
| Thursday | Collect prints and check the room | Free evening |
| Friday | Open house | Arrive at 17:15 |
| Weekend | Rest and a short walk | Sunday journal time |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weekly-planner.preview.lifeAndReview",defaultMessage:`## \u{1F3E1} Everyday life

- [ ] Pick up groceries on the way home.

- [ ] Return the library book.

- [ ] Call a friend over the weekend.

## \u{1F4CC} Can wait

The archive\u{2019}s video section and the future talk schedule.

## \u{2728} Weekend review

**What helped:** Did the shared caption review resolve questions before printing?

**What to change:** Note any last-minute printing or role changes to allow for in the next event plan.`})}]};case"trip-planner":return{id:b,title:a.formatMessage({id:"space.pageTemplates.trip-planner.title",defaultMessage:"Trip planner"}),prompt:a.formatMessage({id:"space.pageTemplates.trip-planner.prompt",defaultMessage:"Make a flexible itinerary and planning checklist using the trip details I\u2019ve shared. Include ideas for activities, transport, and accommodation, keeping confirmed bookings easy to identify. Ask where I\u2019d like to go if needed, or help me choose a destination. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.trip-planner.prefillPrompt",defaultMessage:"Make a flexible trip itinerary and planning checklist, including activities, transport, and accommodation. Help me choose a destination if needed. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.overview",defaultMessage:"**Travelers:** Maya and Sam  \n**Pace:** One main activity a day\n\n## \u{1F9ED} The plan\n\nPlan two nights near a mountain observatory. The visitor tour is the main activity; confirm its availability before choosing transport and accommodation.\n\n## \u{1F686} Travel and stay"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.5",defaultMessage:`| Item | Plan | Status |
| --- | --- | --- |
| Outbound | Friday afternoon train, then local shuttle | Compare departure times |
| Accommodation | Two nights in the village | Choose a flexible booking |
| Return | Sunday afternoon train | Leave time for lunch |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.6",defaultMessage:"## \u{1F5D3}\uFE0F Daily outline"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.7",defaultMessage:`| Day | Main plan | Flexible alternative |
| --- | --- | --- |
| Friday | Arrive and settle in | Short village walk |
| Saturday | Observatory visitor tour | Science museum if tours change |
| Sunday | Easy morning walk | Caf\xe9 and photo journal |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.packingAndNextSteps",defaultMessage:`## \u{1F392} Before leaving

- [ ] Check the visitor schedule, reserve the tour if required, and review the weather before departure.

- [ ] Confirm transport and accommodation.

- [ ] Save tickets and maps offline.

- [ ] Pack warm layers, walking shoes, and a notebook.

## \u{1F4A1} Useful notes

Use a $450 planning allowance for two people: $300 for two nights, $120 for meals, and $30 for local transport. Intercity tickets and any tour fees are additional; confirm actual prices before booking. Keep skywatching optional.`})}]};case"budget-tracker":return{id:b,title:a.formatMessage({id:"space.pageTemplates.budget-tracker.title",defaultMessage:"Budget tracker"}),prompt:a.formatMessage({id:"space.pageTemplates.budget-tracker.prompt",defaultMessage:"Use relevant financial information from connected apps you can access to build my budget tracker. Organize income and spending, show how they compare, and help me track progress toward my goals. Use the currency shown in my accounts and start with this month unless I specify otherwise. Keep totals for different currencies separate. Use the details I\u2019ve already shared, and ask for missing essentials only after checking the available information. If no financial information is available, start with an editable budget and ask what I\u2019d like to add. Update this Page and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.budget-tracker.prefillPrompt",defaultMessage:"Use financial information from connected apps you can access and details I\u2019ve shared to make a budget tracker for this month. Organize income and spending and track my savings goals, using my accounts\u2019 currencies and keeping their totals separate. If no figures are available, help me start an editable budget. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.budget-tracker.preview.1",defaultMessage:`## Budget period
Add the time period and currency.

## Planned and actual spending
| Category | Planned | Actual | Remaining |
| --- | --- | --- | --- |
| Housing | | | |
| Food | | | |
| Transport | | | |

## Transactions
Add income and expenses with dates and sources.

## Review
Note missing figures and changes for next period.`})}]};case"apartment-hunter":return{id:b,title:a.formatMessage({id:"space.pageTemplates.apartment-hunter.title",defaultMessage:"Apartment hunter"}),prompt:a.formatMessage({id:"space.pageTemplates.apartment-hunter.prompt",defaultMessage:"Organize my apartment search around my location and rent budget. Compare available listings by rent, fees, availability, and my preferences, with links and next steps. If I haven\u2019t added listings yet, start with search criteria and a comparison table. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Update this Page and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.apartment-hunter.prefillPrompt",defaultMessage:"Help me compare apartments by rent, fees, availability, and my preferences, with listing links and next steps. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.apartment-hunter.preview.1",defaultMessage:`## Search criteria
Add location, budget, move-in timing, and must-haves.

## Shortlist
| Listing | Rent and fees | Availability | Notes |
| --- | --- | --- | --- |

## Next steps
- [ ] Save listings to compare
- [ ] Prepare questions for a viewing

## Viewing notes
Record observations and questions for each apartment.`})}]};case"event-plan":return{id:b,title:a.formatMessage({id:"space.pageTemplates.event-plan.title",defaultMessage:"Event Plan"}),prompt:a.formatMessage({id:"space.pageTemplates.event-plan.prompt",defaultMessage:"Make a plan for my event with its purpose, key details, schedule, people involved, and preparation checklist. Include a backup plan and follow-up tasks where useful. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.event-plan.prefillPrompt",defaultMessage:"Help me plan my event, including the schedule, people involved, preparation, and follow-up. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.overview",defaultMessage:"**Time:** 18:00\u201320:00 local time  \n**Place:** Northfield Observatory visitor hall  \n**Lead:** Sam Rivera\n\n## \u{1F319} Purpose\n\nAn informal evening of lunar images, short talks, and questions for first-time visitors.\n\n## \u{1F4CB} Essentials"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.5",defaultMessage:`| Item | Plan |
| --- | --- |
| Capacity | 40 visitors |
| Planning budget | $300 total: $100 printing and $200 refreshments |
| Access | Step-free entrance, seating, large-print handouts |
| Main contact | Sam at the welcome desk |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.6",defaultMessage:"## \u{1F570}\uFE0F Run of show"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.7",defaultMessage:`| Time | Activity | Lead |
| --- | --- | --- |
| 17:15 | Set up and volunteer briefing | Sam |
| 18:00 | Welcome and image gallery | Maya |
| 18:30 | A short tour of the lunar landscape | Priya |
| 19:00 | Indoor questions; outdoor viewing if conditions allow | Priya |
| 20:00 | Close and reset the room | Team |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.preparation",defaultMessage:`## \u{2705} Preparation

- [ ] Sam: confirm the room layout and step-free visitor route.

- [ ] Maya: print 50 handouts and the caption cards before the room check.

- [ ] Priya: confirm the observing setup and brief volunteers on the indoor alternative.

## \u{2601}\u{FE0F} If plans change

At 16:00, Sam confirms whether outdoor viewing will run. The indoor event goes ahead either way. Sam updates the welcome desk and guest message; if viewing is cancelled, Priya extends the indoor questions and image discussion.

## \u{1F4DD} Afterwards

- [ ] Gather short visitor comments.

- [ ] Record useful changes for the next event.`})}]};case"personal-goals":return{id:b,title:a.formatMessage({id:"space.pageTemplates.personal-goals.title",defaultMessage:"Personal goals"}),prompt:a.formatMessage({id:"space.pageTemplates.personal-goals.prompt",defaultMessage:"Help me turn the goals I care about into a practical plan. Capture why each goal matters, what progress would look like, and a few steps I can take this week. Suggest ways to make time for them and include a short review section. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.personal-goals.prefillPrompt",defaultMessage:"Help me make a plan for my personal goals, with signs of progress, a few steps for this week, and time to review how it\u2019s going. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.personal-goals.preview.overview",defaultMessage:`**Review:** Last Sunday of each month

## \u{1F9ED} What matters

Over the next twelve weeks, learn a few lunar features, finish a photo journal, and keep one evening a week free.

## \u{1F3AF} Goals`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.personal-goals.preview.5",defaultMessage:`| Goal | Why | A useful sign of progress |
| --- | --- | --- |
| Learn the lunar landscape | Make skywatching more rewarding | Recognize five named features |
| Make a small photo journal | Finish something tangible | Twelve images with captions |
| Protect unplanned time | Leave room to rest | One free evening each week |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.personal-goals.preview.rhythmAndReview",defaultMessage:`## \u{1F463} This week

- [ ] Borrow a Moon guide from the library.

- [ ] Choose the first three journal images.

- [ ] Keep Thursday evening free.

## \u{1F5D3}\u{FE0F} Make room

Reserve half an hour on Sunday for the journal. Join one astronomy-club evening each month. Pause the second online course until the next review.

## \u{1F501} Monthly review

**Progress:** The journal theme is chosen and twelve images are shortlisted.

**Lesson:** Short sessions are easier to keep than a whole afternoon.

**Adjustment:** Finish one caption each week so all twelve images are ready by the end of this plan.`})}]};default:return}}(a,b.id),d=null==b.prompt?c?.setupQuestion:void 0,f=b.prefillPrompt??(null==b.prompt?c?.prefillPrompt:void 0)??a.formatMessage(j.customPrefillPrompt);return{...c,...b,prefillPrompt:f,previewDocument:b.previewDocument??(null==b.previewMarkdown?c?.previewDocument:[{kind:"markdown",markdown:b.previewMarkdown}]),setupQuestion:void 0!==b.setupQuestion?b.setupQuestion:d}}));return k.success?k.data.map(a=>({...a,symbol:e.find(b=>{let{id:c}=b;return c===a.id})?.symbol??d,...i(a.previewDocument)})):h()}function i(a){let b=a.flatMap(a=>(0,d.oc)(a.markdown).map(b=>({...a,markdown:b})));return{previewMarkdown:b.map(a=>{let{markdown:b}=a;return b}).join("\n\n"),previewDocument:b}}let j=(0,e.f)({todoPrefillPrompt:{id:"space.pageTemplates.todo.prefill.sourceAware",defaultMessage:"Help me turn this Page into my to-do list. Check relevant conversations and connected apps you can access for things I need to do. If you can\u2019t find enough, ask me what to add. Replace the sample tasks, keep the checkboxes and any edits I\u2019ve made, and don\u2019t invent tasks or deadlines."},projectTrackerPrefillPrompt:{id:"space.pageTemplates.projectTracker.prefill.sourceAware",defaultMessage:"Help me make this Page a tracker for my project. Use relevant conversations and connected apps you can access to find milestones and tasks, and ask me for anything missing. Replace the examples, keep my edits, and don\u2019t guess at owners, dates, or statuses."},weeklyUpdatePrefillPrompt:{id:"space.pageTemplates.weeklyUpdate.prefill.sourceAware",defaultMessage:"Help me write this week\u2019s update on this Page. Look for progress, blockers, and next steps in relevant conversations and connected apps you can access. Ask which project or week I mean if it\u2019s unclear, and don\u2019t make up accomplishments."},feedbackPrefillPrompt:{id:"space.pageTemplates.feedback.prefill.sourceAware",defaultMessage:"Help me organize feedback on this Page. Use relevant conversations and connected apps you can access to find feedback. Ask what product or topic to focus on if it\u2019s unclear, replace the examples with what you find, and don\u2019t invent feedback."},releaseNotesPrefillPrompt:{id:"space.pageTemplates.releaseNotes.prefill.sourceAware",defaultMessage:"Help me write release notes on this Page. Check relevant conversations and connected apps you can access for confirmed changes and limitations. Ask which release I mean if it\u2019s unclear, and don\u2019t add unconfirmed details or publish anything."},projectHomePrefillPrompt:{id:"space.pageTemplates.projectHome.prefill.sourceAware",defaultMessage:"Help me set up this Project Home Page. Use relevant conversations and connected apps you can access for the project\u2019s goals, team, milestones, and links. Ask me for anything missing, keep my edits, and don\u2019t make up owners or dates."},faqPrefillPrompt:{id:"space.pageTemplates.faq.prefill.sourceAware",defaultMessage:"Help me make an FAQ on this Page. Look for trusted answers in relevant conversations and connected apps you can access. Ask who it\u2019s for and what it\u2019s about if unclear, and leave anything unverified as an open question."},customPrefillPrompt:{id:"space.pageTemplates.custom.prefill.sourceAware",defaultMessage:"Help me make this Page my own. Use relevant conversations and connected apps you can access, and ask me what I want to add if it\u2019s unclear. Keep my edits and don\u2019t fill in details you can\u2019t verify."},weeklyUpdate:{id:"space.pageTemplates.weeklyUpdate.title",defaultMessage:"Weekly update"},weeklyUpdatePrompt:{id:"space.pageTemplates.weeklyUpdate.setup",defaultMessage:`Check my relevant connected apps and create a weekly update suitable for sharing with cross-functional partners, stakeholders, and executives.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},releaseNotes:{id:"space.pageTemplates.releaseNotes.title",defaultMessage:"Release notes"},releaseNotesPrompt:{id:"space.pageTemplates.releaseNotes.setup",defaultMessage:`Check my relevant connected apps and create release notes. Ask which project I would like to create release notes for.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},projectHome:{id:"space.pageTemplates.projectHome.title",defaultMessage:"Project Home"},projectHomePrompt:{id:"space.pageTemplates.projectHome.setup",defaultMessage:`Help me make this Project Home my own. Start working directly in the Page without a setup interview or waiting for confirmation. Choose a project from available context and begin filling it in; the user can redirect you afterward.

If the Page has an Instructions section, collapse it before adding content so it does not push the useful content below the chat, and keep it collapsed when you finish. If that section exists but the available controls cannot change its collapsed state, say so briefly; do not claim it is collapsed. If there is no Instructions section, continue without creating one or mentioning its absence.

Make sure the Page has a title. If it is untitled, use \u{201C}Project Home\u{201D} initially. Preserve an existing title and any user edits.

Before searching connected sources, add an editable starting structure with two sections: Project overview and Essential resources. Include supported details already available in context. Keep this first version compact and useful, without a wall of empty headings or repeated placeholders. Send this brief chat message: \u{201C}I\u{2019}m filling in your Project Home. You can edit any section while I work.\u{201D}

Choose the most relevant project using your best judgment. Prioritize context attached to this Page or its current Space, then recent conversations and project activity. If several projects are plausible, pick the strongest candidate and treat it as a working assumption. Do not stop to ask which project to use or wait for approval before filling in supported details. Choose a real project supported by context; do not invent one. If the initial context provides no candidate, search recent connected sources for one.

Leave one comment explaining the choice: \u{201C}I picked [project] based on [context] and started filling in this Page. If you\u{2019}d like a different project, reply here with its name or a source and I\u{2019}ll switch.\u{201D}

Prefer anchoring this comment to the Page title. If title comments are unsupported, use the first existing content section outside Instructions. If supported, open and focus the comment so it is visible above the chat. Do not claim it is open or focused unless verified. Do not create body content solely to anchor the comment, and do not repeat the project-selection question in the body.

Continue working immediately after leaving the comment. Use the project\u{2019}s Slack channel, relevant emails, project notes, and links to fill in the Page incrementally. Write useful findings as you find them instead of waiting until all research is complete. Add short, scannable sections as evidence becomes available:

- Project overview: what we\u{2019}re building, who it\u{2019}s for, and why it matters
- Team and responsibilities
- Essential resources
- Recent updates
- Upcoming milestones
- Decisions and open questions
- A short guide for someone joining

Cite sources near the claims they support. Prioritize recent sources for status and milestones, and include relevant dates. Distinguish confirmed decisions from proposals, and commitments from completed work. Flag conflicting information rather than silently choosing one version. Do not invent facts or sample records. Keep detailed tasks in a linked tracker if one exists.

Use Open questions only for substantive project unknowns. Label these \u{201C}Needs input\u{201D} or \u{201C}Not yet found\u{201D} where useful. Do not create an Open questions section to ask which project to use. If no real project can be found after a reasonable search, preserve the starting structure and explain the missing context in the single comment rather than fabricating a project.

Use Page comments for focused questions and assumptions. Prefer the title, or the first existing content section outside Instructions if title comments are unsupported. Refer to the relevant section in the comment instead of anchoring questions farther down the Page. Ask only what is needed to move forward, and continue supported work while awaiting answers. If a relevant app isn\u{2019}t connected, offer to connect it and continue with available sources.

When input would help, add one brief, contextual invitation in comments or chat: \u{201C}Add a project brief here with @, or type @ChatGPT, select it from the Page\u{2019}s mention menu, and ask me to use a different project. Use / to add content to the Page.\u{201D} Adapt the example to the actual gap. Do not repeat this guidance in the Page body.

Write using native Page blocks. Check current content before replacing anything, and preserve edits the user makes while you work. When the user names a different project or provides new context, update the relevant sections, revise the choice comment, and remove obsolete content, resolved questions, and unnecessary hints.

Keep chat replies brief and focused on the next step. Do not repeat Page content in chat. Do not imply that the Page is being monitored or updated continuously. Do not send messages or configure recurring updates without asking first.`},projectTracker:{id:"space.pageTemplates.projectTracker.title",defaultMessage:"Project tracker"},projectTrackerPrompt:{id:"space.pageTemplates.projectTracker.setup",defaultMessage:`Check my relevant connected apps and create a project tracker. Automatically update every morning at 6am in my browser time zone.

Include checkboxes to the left of the milestones and tasks in the table. This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},todo:{id:"space.pageTemplates.todo.title",defaultMessage:"To-do list"},todoPrompt:{id:"space.pageTemplates.todo.setup",defaultMessage:`Check my relevant connected apps and create a to-do checklist. Automatically update every morning at 6am in my browser time zone: check off completed tasks for me, and carry forward incomplete tasks to the next day.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. Do not add introductory paragraphs, conclusions, coverage summaries, methodology, scheduling details, or explanations of how you maintain the checklist. Avoid boilerplate. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},feedback:{id:"space.pageTemplates.feedback.title",defaultMessage:"Feedback tracker"},feedbackPrompt:{id:"space.pageTemplates.feedback.setup",defaultMessage:`Check my relevant connected apps and create a feedback tracker. Ask which project I would like to track feedback for. Automatically update every morning at 6am in my browser time zone.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},faq:{id:"space.pageTemplates.faq.title",defaultMessage:"FAQ"},faqPrompt:{id:"space.pageTemplates.faq.setup",defaultMessage:"Help me make this FAQ my own. Ask for the topic, audience and trusted source notes or links, including relevant Slack discussions and approved guidance. Offer to connect relevant apps when needed. Build the most useful questions with concise supported answers and source links. Combine equivalent questions, keep unanswered or disputed questions visible with an owner or next decision, and keep material freshness qualifiers beside the answers they affect. Link a separate feedback tracker if I have one. Write directly into this Page using native Page blocks, preserving its title and my edits. Do not invent answers or treat unconfirmed replies as authoritative guidance. Keep source-channel replies unsent and automatic updates unconfigured unless I ask to set them up. Ask only the setup questions needed to proceed. Keep chat replies brief and focused on the next step. Organize the Page into short, scannable sections with actionable details. Don't repeat Page content in chat."}})},o72y(a,b,c){var d=c("Q840"),e=c("yZpl"),f=c("Cslg"),g=c("OFP1"),h=c("Kwur"),i=c("e1xH"),j=c("hlkZ"),k=c("OWtl"),l=c("JYRT");let m=(0,d.c)(k.a,a=>{let{get:b}=a;return b(i.pagesEnabled$)&&"allowed"===b(g.w).status}),n=(0,d.r)(k.a,a=>{let{get:b,scope:c}=a,d=b(j.spaceAccountId$),g=b(f.k);return{queryKey:["space","personalized-pages",d,g],enabled:b(m)&&null!=d&&null!=g,staleTime:6e4,gcTime:0,retry:!1,queryFn:async a=>{let{signal:b}=a;if(null==d||null==g)throw Error("space_account_unavailable");let f=(0,j.watchSpaceAccount)(c,d,g),i=AbortSignal.any([b,f.signal]);try{let a=await h.Request.safeGet("/pages/suggestions",{additionalHeaders:{"ChatGPT-Account-ID":d,[e.dc]:d},signal:i});return i.throwIfAborted(),a}finally{f.stop()}}}}),o=(0,d.i)(k.a,a=>Date.parse(a)>Date.now(),(a,b)=>{let c,{set:d}=b,e=()=>{let b=Date.parse(a)-Date.now();d(b>0),b>0&&(c=setTimeout(e,Math.min(b,0x7fffffff)))};return e(),()=>clearTimeout(c)},{autoDispose:!0}),p=(0,d.d)(k.a,(a,b)=>{let{get:c}=b;if(!c(m))return;let d=c(l.a,"3798925676");if(d?.value["getting-started"===a?"show_in_getting_started":"show_in_template_modal"]!==!0)return;let e=c(n);return e.isSuccess?e.data.suggestions.filter(a=>c(o,a.expires_at)).slice(0,3):void 0}),q=(0,d.c)(k.a,a=>{let{get:b}=a;return b(m)&&b(l.a,"3798925676")?.value.show_in_template_modal===!0&&b(n).isLoading});c.d(b,{},{a:p,b:q,c:n,d:m})},mXik(a,b,c){var d=c("zd8w"),e=c("E8Sp"),f=c("Cslg"),g=c("ufj7"),h=c("SEOK");c.d(b,{},{a:function(a,b,c,i,j){let{rootPageId:k,personal:l=!1,rememberCollectionOrigin:m=!0,pagePreview:n,onOpenPage:o}=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{};if(null!=o)return void(null==n?o(j):o(j,{pagePreview:n}));let p=a.get(f.k),q=null!=n&&null!=i&&null!=p?{...n,accountId:i,userId:p,pageId:j}:void 0,r=(d,f)=>(0,e.f)(a,b,d,"string"==typeof d&&(m||null!=q)?{...f,...q?.textPageCard!=null&&{flushSync:!0},state:{...f?.state,...m&&{pageListOrigin:{accountId:i,pageId:j,pathname:d,location:c}},...null!=q&&{pagePreview:q}}}:f);if(null!=k)(0,g.f)(a,r,c,i,k,j);else if(l)(0,g.g)(a,r,i,j);else{let b=(0,g.h)(a,j),e={state:{...(0,h.a)(c,i,j,b),sidebarArea:"space",spaceSidebarAccountId:i,sidebarPrimaryContent:!0}};(0,d.startTransition)(()=>{r(b,e)})}}})},AOG7(a,b,c){var d=c("QosV"),e=c("T0Rc"),f=c("h6fL"),g=c("rvFo"),h=c("HFSu"),i=c("GEsy"),j=c("eShZ");async function k(a,b,c){let{includeProfilePhotos:d=!1,includeTotal:e,limit:f=10}=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};return(await h.CodexRequest.safeGet("/accounts/{account_id}/users",{parameters:{path:{account_id:a},query:{limit:f,offset:0,query:b,include_profile_photos:d,include_total:e}},signal:c})).items}c.d(b,{},{a:async function(a,b,c){try{return(await h.CodexRequest.safeGet("/spaces/people",{parameters:{query:{account_id:a,query:b,limit:10,offset:0}},signal:c})).items}catch(a){if(!(a instanceof j.FetchError&&404===a.status))throw a}return k(a,b,c)},b:async function(a,b,c){let d=b.trim().toLowerCase(),e=await k(a,d,c);return e.find(a=>a.email?.trim().toLowerCase()===d)?.account_user_id},c:k,d:function(a,b){let c,j,k,l,m,n,o=(0,d.c)(18);o[0]!==b?(c=void 0===b?{}:b,o[0]=b,o[1]=c):c=o[1];let{includeMemberCounts:p}=c,q=void 0!==p&&p,{accountId:r,authMethod:s}=(0,f.a)();o[2]!==a?(j=a.trim(),o[2]=a,o[3]=j):j=o[3];let t=j,u=(0,i.a)(t,150);o[4]!==q?(k=q?["member-counts"]:[],o[4]=q,o[5]=k):k=o[5],o[6]!==r||o[7]!==t||o[8]!==k?(l=["workspace-groups",r,t,...k],o[6]=r,o[7]=t,o[8]=k,o[9]=l):l=o[9];let v=("chatgpt"===s||"chatgptAuthTokens"===s)&&null!=r&&t.length>0&&t===u;return o[10]!==r||o[11]!==q||o[12]!==t?(m=async a=>{let{signal:b}=a;if(null==r)throw Error("account id is required");return(await h.CodexRequest.safeGet("/accounts/{account_id}/groups",{parameters:{path:{account_id:r},query:{limit:10,offset:0,query:t,include_member_counts:q,include_total:!1}},signal:AbortSignal.any([b,AbortSignal.timeout(15e3)])})).items},o[10]=r,o[11]=q,o[12]=t,o[13]=m):m=o[13],o[14]!==l||o[15]!==v||o[16]!==m?(n={queryKey:l,enabled:v,networkMode:"always",refetchOnReconnect:!0,retry:!1,queryFn:m,staleTime:g.b.ONE_MINUTE},o[14]=l,o[15]=v,o[16]=m,o[17]=n):n=o[17],(0,e.a)(n)},e:function(a,b){let c,h,j,l,m,n,o=(0,d.c)(18);o[0]!==b?(c=void 0===b?{}:b,o[0]=b,o[1]=c):c=o[1];let{includeProfilePhotos:p}=c,q=void 0!==p&&p,{accountId:r,authMethod:s}=(0,f.a)();o[2]!==a?(h=a.trim(),o[2]=a,o[3]=h):h=o[3];let t=h,u=(0,i.a)(t,150);o[4]!==q?(j=q?["profile-photos"]:[],o[4]=q,o[5]=j):j=o[5],o[6]!==r||o[7]!==t||o[8]!==j?(l=["workspace-users",r,t,...j],o[6]=r,o[7]=t,o[8]=j,o[9]=l):l=o[9];let v=("chatgpt"===s||"chatgptAuthTokens"===s)&&null!=r&&t.length>0&&t===u;return o[10]!==r||o[11]!==q||o[12]!==t?(m=a=>{let{signal:b}=a;if(null==r)throw Error("account id is required");return k(r,t,AbortSignal.any([b,AbortSignal.timeout(15e3)]),{includeProfilePhotos:q})},o[10]=r,o[11]=q,o[12]=t,o[13]=m):m=o[13],o[14]!==l||o[15]!==v||o[16]!==m?(n={queryKey:l,enabled:v,networkMode:"always",refetchOnReconnect:!0,retry:!1,queryFn:m,staleTime:g.b.ONE_MINUTE},o[14]=l,o[15]=v,o[16]=m,o[17]=n):n=o[17],(0,e.a)(n)}})},aAsK(a,b,c){var d=c("ABep"),e=c("QosV"),f=c("NDKF"),g=c("IUMq"),h=c("slpy"),i=c("on57"),j=c("oyxz"),k=c("bf6R"),l=c("GpIR");function m(a){return a.stopPropagation()}c.d(b,{},{a:function(a){let b,c,n,o,p,q,r,s,t,u,v,w=(0,e.c)(49),{alignOffset:x,options:y,disabled:z,footer:A,indicatorVariant:B,renderLabel:C,mixed:D,opticallyAlign:E,removeLabel:F,sideOffset:G,size:H,variant:I,value:J,onChange:K,onOpen:L,onRemoveAccess:M}=a,N=void 0!==z&&z,O=void 0===B?"checkmark":B,P=void 0!==D&&D,Q=void 0===I?"default":I,R=void 0===H?"sm":H;"field"===Q?R="xl":"audienceReview"===Q&&(R="lg");let S="audienceReview"===Q&&l.a.permission;w[0]!==S?(b=(0,i.b)(S,"enabled:text-default"),w[0]=S,w[1]=b):b=w[1];let T="field"===Q?"outline":"ghost",U="field"!==Q,V="inline"===Q?"2xs":void 0;w[2]!==P||w[3]!==C||w[4]!==J?(c=P?(0,d.jsx)(j.a,{id:"shareDialog.mixedRoles",defaultMessage:"Mixed"}):C(J),w[2]=P,w[3]=C,w[4]=J,w[5]=c):c=w[5],w[6]===Symbol.for("react.memo_cache_sentinel")?(n=(0,d.jsx)(k.ac,{}),w[6]=n):n=w[6],w[7]!==N||w[8]!==E||w[9]!==V||w[10]!==c||w[11]!==b||w[12]!==T||w[13]!==U||w[14]!==R?(o=(0,d.jsxs)(f.a,{className:b,color:"secondary",variant:T,size:R,iconSize:"sm",pill:U,gutterSize:V,opticallyAlign:E,disabled:N,children:[c,n]}),w[7]=N,w[8]=E,w[9]=V,w[10]=c,w[11]=b,w[12]=T,w[13]=U,w[14]=R,w[15]=o):o=w[15],w[16]!==N||w[17]!==o?(p=(0,d.jsx)(g.a.Trigger,{disabled:N,children:o}),w[16]=N,w[17]=o,w[18]=p):p=w[18];let W=P?"":J;if(w[19]!==K||w[20]!==y?(q=a=>{let b=y.find(b=>b.value===a);null!=b&&K?.(b.value)},w[19]=K,w[20]=y,w[21]=q):q=w[21],w[22]!==N||w[23]!==O||w[24]!==y||w[25]!==C){let a;w[27]!==N||w[28]!==O||w[29]!==C?(a=a=>(0,d.jsx)(h.a,{content:a.tooltipText,children:(0,d.jsx)(g.a.RadioItem,{className:"hover:before:opacity-100",indicatorVariant:O,value:a.value,disabled:N||a.disabled,"aria-label":a.ariaLabel,"aria-description":a.description,children:(0,d.jsxs)("span",{className:"flex max-w-64 min-w-0 flex-1 flex-col",children:[(0,d.jsx)("span",{children:C(a.value)}),null==a.description?null:(0,d.jsx)("span",{className:"text-sm text-pretty whitespace-normal text-secondary",children:a.description})]})})},a.value),w[27]=N,w[28]=O,w[29]=C,w[30]=a):a=w[30],r=y.map(a),w[22]=N,w[23]=O,w[24]=y,w[25]=C,w[26]=r}else r=w[26];return w[31]!==W||w[32]!==q||w[33]!==r?(s=(0,d.jsx)(g.a.RadioGroup,{value:W,onChange:q,children:r}),w[31]=W,w[32]=q,w[33]=r,w[34]=s):s=w[34],w[35]!==N||w[36]!==M||w[37]!==F?(t=null==M?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(g.a.Separator,{}),(0,d.jsx)(g.a.Item,{color:"danger",disabled:N,onSelect:M,children:F})]}),w[35]=N,w[36]=M,w[37]=F,w[38]=t):t=w[38],w[39]!==x||w[40]!==A||w[41]!==G||w[42]!==s||w[43]!==t?(u=(0,d.jsxs)(g.a.Content,{align:"end",alignOffset:x,minWidth:"auto",sideOffset:G,children:[s,t,A]}),w[39]=x,w[40]=A,w[41]=G,w[42]=s,w[43]=t,w[44]=u):u=w[44],w[45]!==L||w[46]!==p||w[47]!==u?(v=(0,d.jsx)("span",{className:"inline-flex",role:"presentation",onMouseDown:m,children:(0,d.jsxs)(g.a,{onOpen:L,children:[p,u]})}),w[45]=L,w[46]=p,w[47]=u,w[48]=v):v=w[48],v}})},glqn(a,b,c){var d=c("aAsK");c.d(b,{a:()=>d.a})},LKbA(a,b,c){var d=c("ABep"),e=c("QosV"),f=c("oyxz");c.d(b,{},{a:function(a){let b=(0,e.c)(5),{permission:c}=a;switch(c){case"viewer":{let a;return b[0]===Symbol.for("react.memo_cache_sentinel")?(a=(0,d.jsx)(f.a,{id:"shareDialog.role.viewer",defaultMessage:"Viewer"}),b[0]=a):a=b[0],a}case"commenter":{let a;return b[1]===Symbol.for("react.memo_cache_sentinel")?(a=(0,d.jsx)(f.a,{id:"shareDialog.role.commenter",defaultMessage:"Commenter"}),b[1]=a):a=b[1],a}case"editor":{let a;return b[2]===Symbol.for("react.memo_cache_sentinel")?(a=(0,d.jsx)(f.a,{id:"shareDialog.role.editor",defaultMessage:"Editor"}),b[2]=a):a=b[2],a}case"owner":{let a;return b[3]===Symbol.for("react.memo_cache_sentinel")?(a=(0,d.jsx)(f.a,{id:"shareDialog.role.owner",defaultMessage:"Owner"}),b[3]=a):a=b[3],a}case void 0:{let a;return b[4]===Symbol.for("react.memo_cache_sentinel")?(a=(0,d.jsx)(f.a,{id:"shareDialog.role.unknown",defaultMessage:"Unknown access"}),b[4]=a):a=b[4],a}}}})},mBEO(a,b,c){let d=(0,(c("ESTr")).a)({name:"gauge-light-20",canvas:{width:20,height:20,viewBox:"0 0 20 20",frame:{x:0,y:0,width:20,height:20},inkBounds:{x:1.001709,y:1.834961,width:17.999023,height:15.352051},visualBounds:{x:1.001709,y:1.834961,width:17.999023,height:15.352051}},paint:{kind:"monochrome"},optical:{shape:"non-circular",bounds:{x:1.001709,y:1.834961,width:17.999023,height:15.352051},center:{x:10.001221,y:9.510987},insets:{top:1.834961,right:.999268,bottom:2.812988,left:1.001709},anchors:{frame:{x:10,y:10},ink:{x:10.001221,y:9.510987},foreground:{x:10.001221,y:9.510987}}},capabilities:["icon"],body:'<path d="M10.0017 1.83496C10.9451 1.83499 11.8556 1.9809 12.7117 2.25098C13.0619 2.36148 13.2567 2.73471 13.1462 3.08496C13.0357 3.43506 12.6624 3.62884 12.3123 3.51855C11.5841 3.28882 10.8078 3.16507 10.0017 3.16504C5.76585 3.16504 2.33179 6.5991 2.33179 10.835C2.33186 12.8582 3.11408 14.6974 4.39429 16.0684C4.64484 16.3367 4.63109 16.7571 4.36304 17.0078C4.09461 17.2585 3.67328 17.244 3.42261 16.9756C1.92156 15.3681 1.00178 13.2083 1.00171 10.835C1.00171 5.86457 5.03131 1.83496 10.0017 1.83496Z" fill="currentColor"/> <path d="M17.7751 7.74902C18.1261 7.64142 18.4984 7.83849 18.6062 8.18945C18.8633 9.02663 19.0007 9.91545 19.0007 10.835C19.0007 13.2083 18.0819 15.369 16.5808 16.9766C16.3302 17.2449 15.9088 17.2583 15.6404 17.0078C15.3723 16.7572 15.3577 16.3367 15.6082 16.0684C16.8883 14.6974 17.6716 12.8582 17.6716 10.835C17.6716 10.0493 17.5534 9.29214 17.3347 8.58008C17.2269 8.22899 17.4241 7.85683 17.7751 7.74902Z" fill="currentColor"/> <path d="M14.8269 5.0957C15.0864 4.83644 15.5076 4.8368 15.7673 5.0957C16.027 5.35536 16.0269 5.7774 15.7673 6.03711L12.2273 9.57617C12.438 9.94814 12.5603 10.377 12.5603 10.835C12.5602 12.2482 11.4149 13.3934 10.0017 13.3936C8.58836 13.3936 7.44228 12.2483 7.44214 10.835C7.4422 9.42157 8.58831 8.27539 10.0017 8.27539C10.4735 8.27544 10.9143 8.40519 11.2937 8.62793L14.8269 5.0957ZM10.0017 9.60547C9.32285 9.60547 8.77228 10.1561 8.77222 10.835C8.77236 11.5137 9.3229 12.0635 10.0017 12.0635C10.6804 12.0633 11.2301 11.5137 11.2302 10.835C11.2302 10.1562 10.6804 9.60561 10.0017 9.60547Z" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/>'});c.d(b,{},{a:d})}};